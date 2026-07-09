# danielsrepo1

## CLI Tetris

A lightweight terminal Tetris implementation with no external dependencies.
- Board size: **14x20** (wider playfield)
- Tetromino blocks are colorized by type in ANSI-capable terminals

### Run

```bash
npm start
```

### Controls

- `a` or `Left Arrow`: move left
- `d` or `Right Arrow`: move right
- `s` or `Down Arrow`: soft drop
- `w` or `Up Arrow`: rotate
- `Space`: hard drop
- `m`: toggle music on/off
- `q` or `Ctrl+C`: quit

The game includes a lightweight terminal bell melody (no extra dependencies). If your terminal supports bell sounds, you will hear a simple looping tune during gameplay.