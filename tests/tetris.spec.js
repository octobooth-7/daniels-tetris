const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start / Restart' }).click();
});

test('loads and starts the game', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Browser Tetris' })).toBeVisible();
  await expect(page.getByLabel('Tetris board')).toBeVisible();
  await expect(page.locator('#status')).toHaveText('Running');
});

test('allows keyboard movement', async ({ page }) => {
  const initial = await page.evaluate(() => window.__tetris.getState().x);
  await page.keyboard.press('ArrowLeft');
  const moved = await page.evaluate(() => window.__tetris.getState().x);
  expect(moved).toBeLessThanOrEqual(initial);
});

test('hard drop settles blocks', async ({ page }) => {
  await page.keyboard.press('Space');
  const state = await page.evaluate(() => window.__tetris.getState());
  expect(state.settledBlocks).toBeGreaterThan(0);
});
