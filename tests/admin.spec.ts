import { test, expect } from '@playwright/test';
import { mockBackend, samplePosts } from './mocks';

test('opens straight to the posts table, no login required', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();
  await expect(page.getByText(samplePosts[0].text)).toBeVisible();
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

test('changing the baseline date saves it via the settings endpoint', async ({ page }) => {
  await mockBackend(page, { baselineDate: '2021-05-06' });
  await page.goto('/');

  const input = page.getByLabel('Нулевая дата отсчёта:');
  await expect(input).toHaveValue('2021-05-06');

  await input.fill('2023-01-15');
  // Firefox/WebKit only fire `change` on blur for <input type="date">.
  await input.blur();

  await expect(page.getByText('сохранение…')).toHaveCount(0);
  await expect(input).toHaveValue('2023-01-15');
});

test('clicking "Догрузить новые посты" fetches new posts and reports the count', async ({ page }) => {
  await mockBackend(page, { fetchCount: 1 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();

  await page.getByRole('button', { name: 'Догрузить новые посты' }).click();

  await expect(page.getByText('Загружено 1 новых постов')).toBeVisible();
  await expect(page.getByText('Догруженный пост')).toBeVisible();
});

test('clicking "Догрузить новые посты" reports zero when there is nothing new', async ({ page }) => {
  await mockBackend(page, { fetchCount: 0 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Посты со стены VK-группы' })).toBeVisible();

  await page.getByRole('button', { name: 'Догрузить новые посты' }).click();

  await expect(page.getByText('Загружено 0 новых постов')).toBeVisible();
});

test('shows a retry screen when the backend is unreachable', async ({ page }) => {
  await page.route('**/api/settings.php', (route) => route.abort('failed'));
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible();
});
