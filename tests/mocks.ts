import type { Page } from '@playwright/test';

export type Post = {
  id: number;
  published_at: string;
  text: string;
  author_link: string;
  links: string[];
};

export const VALID_USERNAME = 'admin';
export const VALID_PASSWORD = 'correct-password';

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

type BackendState = {
  authenticated: boolean;
  baselineDate: string;
  posts: Post[];
  statsCount: number;
  fetchCount: number;
};

type MockOptions = {
  startAuthenticated?: boolean;
  baselineDate?: string;
  posts?: Post[];
  statsCount?: number;
  /** Posts returned by GET /fetch.php's implied re-fetch after a successful "Догрузить" click. */
  fetchCount?: number;
};

/**
 * Stubs every PHP endpoint the SPA talks to (login/logout/api/fetch) with an in-memory
 * fake backend, so tests exercise real frontend behavior without a running PHP+MySQL
 * stack or real VK credentials. Returns the last URL requested for each endpoint, so
 * tests can assert on query params (e.g. the date filter) a click actually sent.
 */
export async function mockBackend(page: Page, options: MockOptions = {}) {
  const state: BackendState = {
    authenticated: options.startAuthenticated ?? false,
    baselineDate: options.baselineDate ?? '2021-05-06',
    posts: options.posts ?? samplePosts,
    statsCount: options.statsCount ?? (options.posts ?? samplePosts).length,
    fetchCount: options.fetchCount ?? 0,
  };

  const lastRequestUrl: Record<string, string> = {};

  await page.route('**/api/settings.php', async (route) => {
    const request = route.request();

    if (request.method() === 'POST') {
      if (!state.authenticated) {
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        return;
      }
      const body = request.postDataJSON() as { baseline_date?: string };
      state.baselineDate = body.baseline_date ?? state.baselineDate;
      await route.fulfill({ status: 200, json: { baseline_date: state.baselineDate } });
      return;
    }

    lastRequestUrl.settings = request.url();
    if (!state.authenticated) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    await route.fulfill({ status: 200, json: { baseline_date: state.baselineDate } });
  });

  await page.route('**/api/posts.php*', async (route) => {
    lastRequestUrl.posts = route.request().url();
    if (!state.authenticated) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    await route.fulfill({ status: 200, json: { items: state.posts, hasMore: false } });
  });

  await page.route('**/api/stats.php*', async (route) => {
    lastRequestUrl.stats = route.request().url();
    if (!state.authenticated) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    await route.fulfill({ status: 200, json: { count: state.statsCount } });
  });

  await page.route('**/login.php', async (route) => {
    const body = route.request().postDataJSON() as { username?: string; password?: string };
    if (body.username === VALID_USERNAME && body.password === VALID_PASSWORD) {
      state.authenticated = true;
      await route.fulfill({ status: 200, json: { success: true } });
    } else {
      await route.fulfill({ status: 401, json: { error: 'Неверный логин или пароль' } });
    }
  });

  await page.route('**/logout.php', async (route) => {
    state.authenticated = false;
    await route.fulfill({ status: 200, json: { success: true } });
  });

  await page.route('**/fetch.php', async (route) => {
    if (!state.authenticated) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
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
