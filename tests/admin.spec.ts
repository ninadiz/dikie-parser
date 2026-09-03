import { test, expect } from '@playwright/test';
import { mockBackend, makeManyPosts, samplePosts } from './mocks';

test('theme toggle switches to light and persists across reloads', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();

  const html = page.locator('html');
  await expect(html).not.toHaveClass(/light/);

  await page.getByRole('button', { name: /светлую/i }).click();
  await expect(html).toHaveClass(/light/);
  await expect(page.getByRole('button', { name: /тёмную/i })).toBeVisible();

  await mockBackend(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();
  await expect(html).toHaveClass(/light/);

  await page.getByRole('button', { name: /тёмную/i }).click();
  await expect(html).not.toHaveClass(/light/);
});

test('opens straight to the posts table, no login required', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();
  await expect(page.getByRole('cell', { name: samplePosts[0].text })).toBeVisible();
  await expect(page.getByText(`Постов за весь период: `)).toBeVisible();
  await expect(page.getByText(String(samplePosts.length), { exact: true })).toBeVisible();
});

test('renders author and text links as clickable anchors', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');

  const row = page.getByRole('row').filter({ hasText: samplePosts[0].text });
  await expect(row.getByRole('link', { name: samplePosts[0].author_link })).toHaveAttribute(
    'href',
    samplePosts[0].author_link
  );
  await expect(row.getByRole('link', { name: samplePosts[0].links[0] })).toHaveAttribute(
    'href',
    samplePosts[0].links[0]
  );
});

test('applying a date range filter requests posts and stats for that range', async ({ page }) => {
  const { lastRequestUrl } = await mockBackend(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();

  await page.getByLabel('С', { exact: true }).fill('2026-08-29');
  await page.getByLabel('По', { exact: true }).fill('2026-08-30');
  await page.getByRole('button', { name: 'Применить фильтр' }).click();

  await expect(page.getByText('Постов в выбранном диапазоне: ')).toBeVisible();
  expect(lastRequestUrl.posts).toContain('date_from=2026-08-29+00%3A00%3A00');
  expect(lastRequestUrl.posts).toContain('date_to=2026-08-30+23%3A59%3A59');
  expect(lastRequestUrl.stats).toContain('date_from=2026-08-29+00%3A00%3A00');
});

test('resetting the filter goes back to the full-period stats label', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');

  await page.getByLabel('С', { exact: true }).fill('2026-08-29');
  await page.getByRole('button', { name: 'Применить фильтр' }).click();
  await expect(page.getByText('Постов в выбранном диапазоне: ')).toBeVisible();

  await page.getByRole('button', { name: 'Сбросить' }).click();
  await expect(page.getByText('Постов за весь период: ')).toBeVisible();
});

test('baseline date is shown read-only, not editable', async ({ page }) => {
  await mockBackend(page, { baselineDate: '2021-05-06' });
  await page.goto('/');

  await expect(page.getByText('2021-05-06')).toBeVisible();
  await expect(page.locator('input[type="date"]')).toHaveCount(2); // only the С/По filter inputs
});

test('clicking "Догрузить новые посты" fetches new posts and reports the count', async ({ page }) => {
  await mockBackend(page, { fetchCount: 1 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();

  await page.getByRole('button', { name: 'Догрузить новые посты' }).click();

  await expect(page.getByText('Загружено 1 новых постов')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Догруженный пост' })).toBeVisible();
});

test('clicking "Догрузить новые посты" reports zero when there is nothing new', async ({ page }) => {
  await mockBackend(page, { fetchCount: 0 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();

  await page.getByRole('button', { name: 'Догрузить новые посты' }).click();

  await expect(page.getByText('Загружено 0 новых постов')).toBeVisible();
});

test('pagination shows twice (top and bottom), navigates forward and back, shows correct posts', async ({ page }) => {
  const manyPosts = makeManyPosts(60); // > PAGE_SIZE (50), so page 1 has more, page 2 doesn't
  const { lastRequestUrl } = await mockBackend(page, { posts: manyPosts });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();

  const topNav = page.getByRole('navigation', { name: 'Пагинация — сверху' });
  const bottomNav = page.getByRole('navigation', { name: 'Пагинация — снизу' });

  await expect(topNav.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(topNav.getByRole('button', { name: 'Назад' })).toBeDisabled();
  await expect(topNav.getByRole('button', { name: 'Вперёд' })).toBeEnabled();
  // Both instances stay in sync with each other.
  await expect(bottomNav.getByRole('button', { name: '2', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: manyPosts[0].text })).toBeVisible();
  await expect(page.getByRole('cell', { name: manyPosts[49].text })).toBeVisible();

  await topNav.getByRole('button', { name: 'Вперёд' }).click();

  await expect(topNav.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(bottomNav.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(topNav.getByRole('button', { name: 'Вперёд' })).toBeDisabled();
  await expect(page.getByRole('cell', { name: manyPosts[50].text })).toBeVisible();
  expect(lastRequestUrl.posts).toContain('offset=50');

  // Bottom nav's Back button works too — not just the top one.
  await bottomNav.getByRole('button', { name: 'Назад' }).click();

  await expect(topNav.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('cell', { name: manyPosts[0].text })).toBeVisible();
});

test('pagination: jumping to a page number and using "Перейти на ... стр."', async ({ page }) => {
  await mockBackend(page, { posts: makeManyPosts(250) }); // 5 pages of 50
  await page.goto('/');
  const topNav = page.getByRole('navigation', { name: 'Пагинация — сверху' });

  await topNav.getByRole('button', { name: '2', exact: true }).click();
  await expect(topNav.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page');

  await topNav.getByRole('textbox').fill('5');
  await topNav.getByRole('textbox').press('Enter');
  await expect(topNav.getByRole('button', { name: '5', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(topNav.getByRole('button', { name: 'Вперёд' })).toBeDisabled();
});

test('pagination window always shows exactly 5 numbers, no ellipsis, no pinned first/last', async ({ page }) => {
  await mockBackend(page, { posts: makeManyPosts(1000) }); // 20 pages of 50
  await page.goto('/');
  const topNav = page.getByRole('navigation', { name: 'Пагинация — сверху' });

  await expect(topNav.getByText('…')).toHaveCount(0);
  await expect(topNav.getByRole('button', { name: /^\d+$/ })).toHaveCount(5);
  await expect(topNav.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page');

  await topNav.getByRole('textbox').fill('10');
  await topNav.getByRole('textbox').press('Enter');

  await expect(topNav.getByRole('button', { name: /^\d+$/ })).toHaveCount(5);
  await expect(topNav.getByRole('button', { name: '10', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(topNav.getByRole('button', { name: '8', exact: true })).toBeVisible();
  await expect(topNav.getByRole('button', { name: '12', exact: true })).toBeVisible();
  await expect(topNav.getByRole('button', { name: '1', exact: true })).toHaveCount(0); // page 1 no longer pinned
});

test('pagination is reflected in the URL and a direct link opens on that page', async ({ page }) => {
  const manyPosts = makeManyPosts(60);
  await mockBackend(page, { posts: manyPosts });
  const topNav = page.getByRole('navigation', { name: 'Пагинация — сверху' });

  await page.goto('/');
  await expect(topNav.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(new URL(page.url()).searchParams.get('page')).toBeNull(); // page 1 has no ?page

  await topNav.getByRole('button', { name: 'Вперёд' }).click();
  await expect(topNav.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(new URL(page.url()).searchParams.get('page')).toBe('2');

  // Browser back button should return to page 1 without a reload.
  await page.goBack();
  await expect(topNav.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page');

  // A direct link straight to page 2 should open there.
  await mockBackend(page, { posts: manyPosts });
  await page.goto('/?page=2');
  await expect(topNav.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('cell', { name: manyPosts[50].text })).toBeVisible();
});

test('applying a filter resets pagination back to page 1', async ({ page }) => {
  await mockBackend(page, { posts: makeManyPosts(60) });
  await page.goto('/');
  const topNav = page.getByRole('navigation', { name: 'Пагинация — сверху' });

  await topNav.getByRole('button', { name: 'Вперёд' }).click();
  await expect(topNav.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page');

  await page.getByLabel('С', { exact: true }).fill('2026-08-01');
  await page.getByRole('button', { name: 'Применить фильтр' }).click();

  await expect(topNav.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('shows a retry screen when the backend is unreachable', async ({ page }) => {
  await page.route('**/api/settings.php', (route) => route.abort('failed'));
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible();
});

test('shows a retry screen instead of crashing when the backend returns a non-JSON body', async ({ page }) => {
  // Regression: PHP's built-in dev server returns HTTP 200 with an HTML fatal-error
  // page (not JSON) when the DB is unreachable. apiFetch used to swallow the JSON
  // parse failure into `{}`, so postsData.items ended up undefined and PostsTable's
  // posts.map() crashed the whole app to a blank white screen instead of showing an
  // error.
  await page.route('**/api/settings.php', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<b>Fatal error</b>: ...' })
  );
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible();
  await expect(page.locator('body')).not.toBeEmpty();
});

test('"Догрузить новые посты" shows an error instead of crashing on a non-JSON response', async ({ page }) => {
  await mockBackend(page);
  await page.route('**/fetch.php', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<b>Fatal error</b>: ...' })
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();

  await page.getByRole('button', { name: 'Догрузить новые посты' }).click();

  await expect(page.getByText('Сервер вернул некорректный ответ (200)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();
});
