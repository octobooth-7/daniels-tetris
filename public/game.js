const COLS = 14;
const ROWS = 20;
const BLOCK = 28;
const DROP_MS = 450;

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
const COLORS = {
  I: "#22d3ee",
  O: "#facc15",
  T: "#a855f7",
  S: "#22c55e",
  Z: "#ef4444",
  J: "#3b82f6",
  L: "#f97316"
};

const MUSIC_NOTES = [523, 0, 659, 0, 784, 0, 659, 0, 523, 0, 659, 0, 440, 0, 523, 0];
const MUSIC_MS = 170;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const gameOverEl = document.getElementById("game-over");
const musicStatusEl = document.getElementById("music-status");

let board = [];
let activePiece = null;
let score = 0;
let gameOver = false;
let lastDropAt = 0;

let audioCtx = null;
let musicMuted = false;
let musicTimer = null;
let musicIndex = 0;

function makeEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomType() {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

function createPiece(type = randomType()) {
  return {
    type,
    rotation: 0,
    x: Math.floor(COLS / 2) - 2,
    y: -1
  };
}

function getCells(piece, x = piece.x, y = piece.y, rotation = piece.rotation) {
  const rotations = PIECES[piece.type];
  const shape = rotations[rotation % rotations.length];
  return shape.map(([dx, dy]) => [x + dx, y + dy]);
}

function collides(piece, x = piece.x, y = piece.y, rotation = piece.rotation) {
  return getCells(piece, x, y, rotation).some(([cx, cy]) => {
    if (cx < 0 || cx >= COLS || cy >= ROWS) {
      return true;
    }
    return cy >= 0 && board[cy][cx] !== null;
  });
}

function spawnPiece() {
  activePiece = createPiece();
  if (collides(activePiece)) {
    gameOver = true;
  }
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
  const rotationCount = PIECES[activePiece.type].length;
  const nextRotation = (activePiece.rotation + 1) % rotationCount;
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    const nextX = activePiece.x + kick;
    if (!collides(activePiece, nextX, activePiece.y, nextRotation)) {
      activePiece.rotation = nextRotation;
      activePiece.x = nextX;
      return true;
    }
  }
  return false;
}

function clearLines() {
  let cleared = 0;
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row].every((cell) => cell !== null)) {
      board.splice(row, 1);
      board.unshift(Array(COLS).fill(null));
      cleared += 1;
      row += 1;
    }
  }
  const lineScores = [0, 100, 300, 500, 800];
  score += lineScores[cleared] || cleared * 250;
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

function softDrop() {
  if (tryMove(0, 1)) {
    score += 1;
  } else {
    lockPiece();
  }
}

function hardDrop() {
  let distance = 0;
  while (tryMove(0, 1)) {
    distance += 1;
  }
  score += distance * 2;
  lockPiece();
}

function mergedBoard() {
  const merged = board.map((row) => row.slice());
  for (const [x, y] of getCells(activePiece)) {
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
      merged[y][x] = activePiece.type;
    }
  }
  return merged;
}

function drawCell(x, y, type) {
  ctx.fillStyle = COLORS[type];
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = "#0b1021";
  ctx.lineWidth = 2;
  ctx.strokeRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
}

function drawGrid() {
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK + 0.5, 0);
    ctx.lineTo(x * BLOCK + 0.5, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK + 0.5);
    ctx.lineTo(COLS * BLOCK, y * BLOCK + 0.5);
    ctx.stroke();
  }
}

function render() {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  for (const [y, row] of mergedBoard().entries()) {
    for (const [x, cell] of row.entries()) {
      if (cell) {
        drawCell(x, y, cell);
      }
    }
  }

  scoreEl.textContent = String(score);
  gameOverEl.classList.toggle("hidden", !gameOver);
  musicStatusEl.textContent = `Music: ${musicMuted ? "Off" : "On"}`;
}

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new window.AudioContext();
  }
}

function playTone(frequency, durationSeconds = 0.11) {
  if (!audioCtx || musicMuted || gameOver || frequency <= 0) {
    return;
  }

  const now = audioCtx.currentTime;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = "square";
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + durationSeconds);
}

function stepMusic() {
  const note = MUSIC_NOTES[musicIndex % MUSIC_NOTES.length];
  musicIndex += 1;
  playTone(note);
}

function startMusicLoop() {
  if (musicTimer !== null) {
    return;
  }
  musicTimer = setInterval(stepMusic, MUSIC_MS);
}

function toggleMusic() {
  musicMuted = !musicMuted;
  if (!musicMuted) {
    ensureAudioContext();
    startMusicLoop();
  }
  render();
}

function restartGame() {
  board = makeEmptyBoard();
  score = 0;
  gameOver = false;
  lastDropAt = 0;
  spawnPiece();
  render();
}

function tick(timestamp) {
  if (!gameOver && timestamp - lastDropAt >= DROP_MS) {
    lastDropAt = timestamp;
    if (!tryMove(0, 1)) {
      lockPiece();
    }
    render();
  }
  requestAnimationFrame(tick);
}

function handleKeydown(event) {
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(event.key)) {
    event.preventDefault();
  }

  ensureAudioContext();
  startMusicLoop();

  if (event.key === "m" || event.key === "M") {
    toggleMusic();
    return;
  }

  if (event.key === "r" || event.key === "R") {
    restartGame();
    return;
  }

  if (gameOver) {
    return;
  }

  if (event.key === "a" || event.key === "A" || event.key === "ArrowLeft") {
    tryMove(-1, 0);
  } else if (event.key === "d" || event.key === "D" || event.key === "ArrowRight") {
    tryMove(1, 0);
  } else if (event.key === "s" || event.key === "S" || event.key === "ArrowDown") {
    softDrop();
  } else if (event.key === "w" || event.key === "W" || event.key === "ArrowUp") {
    tryRotate();
  } else if (event.key === " ") {
    hardDrop();
  }

  render();
}

window.addEventListener("keydown", handleKeydown);

restartGame();
requestAnimationFrame(tick);
