import type { Page } from '@playwright/test';

export type Post = {
  id: number;
  published_at: string;
  text: string;
  author_link: string;
  links: string[];
};

export const samplePosts: Post[] = [
  {
    id: 3,
    published_at: '2026-08-30 04:00:00',
    text: 'Третий пост со ссылкой https://example.com/abc',
    author_link: 'https://vk.com/id111',
    links: ['https://example.com/abc'],
  },
  {
    id: 2,
    published_at: '2026-08-29 10:00:00',
    text: 'Второй пост',
    author_link: 'https://vk.com/club940',
    links: [],
  },
  {
    id: 1,
    published_at: '2026-08-28 13:00:01',
    text: 'Первый пост',
    author_link: 'https://vk.com/id222',
    links: [],
  },
];

/** Generates `n` distinct posts (newest first, id descending) for pagination tests. */
export function makeManyPosts(n: number): Post[] {
  return Array.from({ length: n }, (_, i) => ({
    id: n - i,
    published_at: `2026-08-${String(30 - (i % 28)).padStart(2, '0')} 12:00:00`,
    text: `Пост номер ${n - i}`,
    author_link: 'https://vk.com/id1',
    links: [],
  }));
}

type BackendState = {
  baselineDate: string;
  posts: Post[];
  statsCount: number;
  fetchCount: number;
};

type MockOptions = {
  baselineDate?: string;
  posts?: Post[];
  statsCount?: number;
  /** Posts returned by GET /fetch.php's implied re-fetch after a successful "Догрузить" click. */
  fetchCount?: number;
};

/**
 * Stubs every PHP endpoint the SPA talks to (api/fetch) with an in-memory fake backend,
 * so tests exercise real frontend behavior without a running PHP+MySQL stack or real VK
 * credentials. Returns the last URL requested for each endpoint, so tests can assert on
 * query params (e.g. the date filter) a click actually sent.
 */
export async function mockBackend(page: Page, options: MockOptions = {}) {
  const state: BackendState = {
    baselineDate: options.baselineDate ?? '2021-05-06',
    posts: options.posts ?? samplePosts,
    statsCount: options.statsCount ?? (options.posts ?? samplePosts).length,
    fetchCount: options.fetchCount ?? 0,
  };

  const lastRequestUrl: Record<string, string> = {};

  await page.route('**/api/settings.php', async (route) => {
    const request = route.request();

    if (request.method() === 'POST') {
      const body = request.postDataJSON() as { baseline_date?: string };
      state.baselineDate = body.baseline_date ?? state.baselineDate;
      await route.fulfill({ status: 200, json: { baseline_date: state.baselineDate } });
      return;
    }

    lastRequestUrl.settings = request.url();
    await route.fulfill({ status: 200, json: { baseline_date: state.baselineDate } });
  });

  await page.route('**/api/posts.php*', async (route) => {
    const request = route.request();
    lastRequestUrl.posts = request.url();

    const params = new URL(request.url()).searchParams;
    const limit = Number(params.get('limit') ?? state.posts.length);
    const offset = Number(params.get('offset') ?? 0);
    const items = state.posts.slice(offset, offset + limit);
    const hasMore = offset + limit < state.posts.length;

    await route.fulfill({ status: 200, json: { items, hasMore } });
  });

  await page.route('**/api/stats.php*', async (route) => {
    lastRequestUrl.stats = route.request().url();
    await route.fulfill({ status: 200, json: { count: state.statsCount } });
  });

  await page.route('**/fetch.php', async (route) => {
    if (state.fetchCount > 0) {
      state.posts = [
        {
          id: state.posts[0].id + 1,
          published_at: '2026-08-30 12:00:00',
          text: 'Догруженный пост',
          author_link: 'https://vk.com/id333',
          links: [],
        },
        ...state.posts,
      ];
      state.statsCount += state.fetchCount;
    }
    await route.fulfill({ status: 200, json: { success: true, count: state.fetchCount } });
  });

  return { state, lastRequestUrl };
}
