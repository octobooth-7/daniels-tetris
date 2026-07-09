const WIDTH = 10;
const HEIGHT = 20;
const TICK_MS = 450;

const PIECES = {
  I: [
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1]
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3]
    ]
  ],
  O: [
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ]
  ],
  T: [
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2]
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2]
    ]
  ],
  S: [
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2]
    ]
  ],
  Z: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1]
    ],
    [
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2]
    ]
  ],
  J: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2]
    ],
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2]
    ]
  ],
  L: [
    [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2]
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2]
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2]
    ]
  ]
};

const PIECE_TYPES = Object.keys(PIECES);

const board = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(" "));

let score = 0;
let gameOver = false;
let loopHandle = null;
let activePiece = null;
const rawModeSupported =
  process.stdin.isTTY && typeof process.stdin.setRawMode === "function";

function randomPieceType() {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

function makePiece(type = randomPieceType()) {
  return {
    type,
    rotation: 0,
    x: 3,
    y: -1
  };
}

function getCells(piece, x = piece.x, y = piece.y, rotation = piece.rotation) {
  const rotations = PIECES[piece.type];
  const shape = rotations[rotation % rotations.length];
  return shape.map(([dx, dy]) => [x + dx, y + dy]);
}

function collides(piece, x = piece.x, y = piece.y, rotation = piece.rotation) {
  const cells = getCells(piece, x, y, rotation);
  return cells.some(([cx, cy]) => {
    if (cx < 0 || cx >= WIDTH || cy >= HEIGHT) {
      return true;
    }
    return cy >= 0 && board[cy][cx] !== " ";
  });
}

function tryMove(dx, dy) {
  const nx = activePiece.x + dx;
  const ny = activePiece.y + dy;
  if (!collides(activePiece, nx, ny, activePiece.rotation)) {
    activePiece.x = nx;
    activePiece.y = ny;
    return true;
  }
  return false;
}

function tryRotate() {
  const rotations = PIECES[activePiece.type].length;
  const nextRotation = (activePiece.rotation + 1) % rotations;
  const kicks = [0, -1, 1, -2, 2];
  for (const offset of kicks) {
    const nx = activePiece.x + offset;
    if (!collides(activePiece, nx, activePiece.y, nextRotation)) {
      activePiece.x = nx;
      activePiece.rotation = nextRotation;
      return true;
    }
  }
  return false;
}

function lockPiece() {
  for (const [x, y] of getCells(activePiece)) {
    if (y < 0) {
      gameOver = true;
      return;
    }
    board[y][x] = activePiece.type;
  }
  clearLines();
  spawnPiece();
}

function clearLines() {
  let cleared = 0;
  for (let row = HEIGHT - 1; row >= 0; row -= 1) {
    if (board[row].every((cell) => cell !== " ")) {
      board.splice(row, 1);
      board.unshift(Array(WIDTH).fill(" "));
      cleared += 1;
      row += 1;
    }
  }
  const lineScores = [0, 100, 300, 500, 800];
  score += lineScores[cleared] || cleared * 250;
}

function hardDrop() {
  let distance = 0;
  while (tryMove(0, 1)) {
    distance += 1;
  }
  score += distance * 2;
  lockPiece();
}

function softDrop() {
  if (tryMove(0, 1)) {
    score += 1;
  } else {
    lockPiece();
  }
}

function spawnPiece() {
  activePiece = makePiece();
  if (collides(activePiece)) {
    gameOver = true;
  }
}

function boardWithPiece() {
  const merged = board.map((row) => row.slice());
  for (const [x, y] of getCells(activePiece)) {
    if (y >= 0 && y < HEIGHT && x >= 0 && x < WIDTH) {
      merged[y][x] = activePiece.type;
    }
  }
  return merged;
}

function render() {
  const merged = boardWithPiece();
  let output = "\x1b[2J\x1b[H";
  output += "CLI Tetris\n";
  output += `Score: ${score}\n`;
  output += `Board: ${WIDTH}x${HEIGHT}\n`;
  output += "+----------+\n";
  for (const row of merged) {
    output += `|${row.map((cell) => (cell === " " ? " " : "#")).join("")}|\n`;
  }
  output += "+----------+\n";
  output += "Controls: a/Left=left  d/Right=right  s/Down=soft drop  w/Up=rotate\n";
  output += "          Space=hard drop  q=quit  Ctrl+C=quit\n";
  if (gameOver) {
    output += "\nGAME OVER - press q or Ctrl+C to exit.\n";
  }
  process.stdout.write(output);
}

function tick() {
  if (gameOver) {
    render();
    return;
  }
  if (!tryMove(0, 1)) {
    lockPiece();
  }
  render();
}

function cleanupAndExit() {
  if (loopHandle) {
    clearInterval(loopHandle);
  }
  if (rawModeSupported) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
  process.stdout.write("\x1b[?25h\n");
  process.exit(0);
}

function handleInput(buffer) {
  const key = buffer.toString("utf8");

  if (key === "\u0003" || key === "q") {
    cleanupAndExit();
    return;
  }
  if (gameOver) {
    return;
  }

  if (key === "a" || key === "\u001b[D") {
    tryMove(-1, 0);
  } else if (key === "d" || key === "\u001b[C") {
    tryMove(1, 0);
  } else if (key === "s" || key === "\u001b[B") {
    softDrop();
  } else if (key === "w" || key === "\u001b[A") {
    tryRotate();
  } else if (key === " ") {
    hardDrop();
  }

  render();
}

function start() {
  process.stdout.write("\x1b[?25l");
  process.on("exit", () => {
    process.stdout.write("\x1b[?25h");
  });

  spawnPiece();
  render();

  if (rawModeSupported) {
    process.stdin.setRawMode(true);
  } else {
    process.stdout.write(
      "\n(Standard input is not a TTY; controls are disabled in this context.)\n"
    );
  }
  process.stdin.resume();
  process.stdin.on("data", handleInput);

  loopHandle = setInterval(tick, TICK_MS);
}

start();
