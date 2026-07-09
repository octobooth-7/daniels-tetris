# danielsrepo1

A browser-based **Tetris** game — no build step, no frameworks, just open
`index.html`.

## Quick Start

```bash
open index.html   # or double-click it in your file manager
```

Or serve it locally:

```bash
npm install
npm run serve     # http://localhost:3000
```

## Controls

| Key | Action |
|-----|--------|
| ← → | Move |
| ↑ | Rotate |
| ↓ | Soft drop |
| Space | Hard drop |
| P | Pause / Resume |

## Documentation

Full documentation including screenshots lives in [`docs/README.md`](docs/README.md).

## Tests

End-to-end tests are written with [Playwright](https://playwright.dev):

```bash
npm install
npx playwright install chromium
npm test
```

28 tests covering page load, game start, keyboard controls, pause/resume,
score reset, and screenshot generation.
