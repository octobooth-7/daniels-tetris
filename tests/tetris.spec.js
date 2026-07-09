// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const GAME_URL = `file://${path.resolve(__dirname, '..', 'index.html')}`;

test.describe('Tetris – Page Load', () => {
  test('loads the page and shows the title', async ({ page }) => {
    await page.goto(GAME_URL);
    await expect(page).toHaveTitle('Tetris');
    await expect(page.locator('h1')).toHaveText('Tetris');
  });

  test('shows the game board with 200 cells (10×20)', async ({ page }) => {
    await page.goto(GAME_URL);
    const cells = page.locator('#board .cell');
    await expect(cells).toHaveCount(200);
  });

  test('displays the welcome overlay on load', async ({ page }) => {
    await page.goto(GAME_URL);
    const overlay = page.locator('#message-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.locator('#message-title')).toHaveText('TETRIS');
  });

  test('shows Score, Lines, and Level panels', async ({ page }) => {
    await page.goto(GAME_URL);
    await expect(page.locator('#score')).toBeVisible();
    await expect(page.locator('#lines')).toBeVisible();
    await expect(page.locator('#level')).toBeVisible();
  });

  test('shows the Next piece canvas', async ({ page }) => {
    await page.goto(GAME_URL);
    await expect(page.locator('#next-canvas')).toBeVisible();
  });

  test('shows control buttons', async ({ page }) => {
    await page.goto(GAME_URL);
    await expect(page.locator('#start-btn')).toBeVisible();
    await expect(page.locator('#pause-btn')).toBeVisible();
  });
});

test.describe('Tetris – Starting a Game', () => {
  test('clicking Start Game dismisses the overlay', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    await expect(page.locator('#message-overlay')).not.toBeVisible();
  });

  test('clicking New Game button also starts the game', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#start-btn').click();
    await expect(page.locator('#message-overlay')).not.toBeVisible();
  });

  test('score starts at 0', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    await expect(page.locator('#score')).toHaveText('0');
  });

  test('level starts at 1', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    await expect(page.locator('#level')).toHaveText('1');
  });

  test('lines starts at 0', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    await expect(page.locator('#lines')).toHaveText('0');
  });

  test('at least one board cell is filled after game starts', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    // Wait a tick for the first piece to render
    await page.waitForTimeout(100);
    const filledCells = page.locator('#board .cell.filled');
    await expect(filledCells).not.toHaveCount(0);
  });
});

test.describe('Tetris – Keyboard Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    await page.waitForTimeout(100);
  });

  test('ArrowLeft moves piece left (board state changes)', async ({ page }) => {
    const before = await page.locator('#board').innerHTML();
    await page.keyboard.press('ArrowLeft');
    const after = await page.locator('#board').innerHTML();
    expect(after).not.toBe(before);
  });

  test('ArrowRight moves piece right (board state changes)', async ({ page }) => {
    const before = await page.locator('#board').innerHTML();
    await page.keyboard.press('ArrowRight');
    const after = await page.locator('#board').innerHTML();
    expect(after).not.toBe(before);
  });

  test('ArrowDown soft-drops the piece (board state changes)', async ({ page }) => {
    const before = await page.locator('#board').innerHTML();
    await page.keyboard.press('ArrowDown');
    const after = await page.locator('#board').innerHTML();
    expect(after).not.toBe(before);
  });

  test('ArrowUp rotate key executes without crashing the game', async ({ page }) => {
    // Press ArrowUp (rotate) several times; game must remain running and cells visible.
    // Note: the O-piece has symmetric rotations so the board may look identical, but
    // all other pieces will produce a visible change.
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowUp');
    }
    // Game should still be running (no game-over overlay)
    await expect(page.locator('#message-overlay')).not.toBeVisible();
    // Board should still have filled cells
    await expect(page.locator('#board .cell.filled')).not.toHaveCount(0);
  });

  test('Space hard-drops the piece', async ({ page }) => {
    const before = await page.locator('#board').innerHTML();
    await page.keyboard.press('Space');
    const after = await page.locator('#board').innerHTML();
    expect(after).not.toBe(before);
  });
});

test.describe('Tetris – Pause / Resume', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    await page.waitForTimeout(100);
  });

  test('clicking Pause shows PAUSED indicator', async ({ page }) => {
    await page.locator('#pause-btn').click();
    await expect(page.locator('#pause-indicator')).toHaveText('PAUSED');
  });

  test('Pause button label changes to Resume', async ({ page }) => {
    await page.locator('#pause-btn').click();
    await expect(page.locator('#pause-btn')).toHaveText('Resume');
  });

  test('clicking Resume clears PAUSED indicator', async ({ page }) => {
    await page.locator('#pause-btn').click(); // pause
    await page.locator('#pause-btn').click(); // resume
    await expect(page.locator('#pause-indicator')).toHaveText('');
  });

  test('pressing P key toggles pause', async ({ page }) => {
    await page.keyboard.press('p');
    await expect(page.locator('#pause-indicator')).toHaveText('PAUSED');
    await page.keyboard.press('p');
    await expect(page.locator('#pause-indicator')).toHaveText('');
  });

  test('board does not change while paused', async ({ page }) => {
    await page.locator('#pause-btn').click(); // pause
    const before = await page.locator('#board').innerHTML();
    await page.waitForTimeout(1000);
    const after = await page.locator('#board').innerHTML();
    expect(after).toBe(before);
  });
});

test.describe('Tetris – New Game Reset', () => {
  test('New Game resets score to 0', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    // Hard-drop several pieces to accumulate score
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
    }
    await page.locator('#start-btn').click();
    await expect(page.locator('#score')).toHaveText('0');
  });

  test('New Game resets lines to 0', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('#lines')).toHaveText('0');
  });

  test('New Game resets level to 1', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    await page.locator('#start-btn').click();
    await expect(page.locator('#level')).toHaveText('1');
  });
});

test.describe('Tetris – Screenshots', () => {
  test('welcome screen screenshot', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.screenshot({
      path: 'docs/screenshots/01-welcome.png',
      fullPage: false,
    });
  });

  test('active game screenshot', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: 'docs/screenshots/02-active-game.png',
      fullPage: false,
    });
  });

  test('paused game screenshot', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.locator('#message-btn').click();
    await page.waitForTimeout(200);
    // Place a few pieces before pausing for a more interesting screenshot
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
    }
    await page.locator('#pause-btn').click();
    await page.screenshot({
      path: 'docs/screenshots/03-paused.png',
      fullPage: false,
    });
  });
});
