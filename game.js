/**
 * Tetris Game Logic
 * A fully-featured browser Tetris implementation.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const CELL_SIZE = 30;

/** Drop interval in ms for each level (level index 0–9+) */
const LEVEL_SPEEDS = [800, 717, 633, 550, 467, 383, 300, 217, 133, 100];

/** Points awarded for clearing 1/2/3/4 lines at once */
const LINE_POINTS = [0, 100, 300, 500, 800];

// ─── Tetromino Definitions ────────────────────────────────────────────────────

/** Each tetromino is defined as a list of rotation states.
 *  Each state is a 2-D array of [row, col] offsets from the pivot. */
const TETROMINOES = {
  I: {
    color: 'I',
    shapes: [
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]],
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]],
    ],
  },
  O: {
    color: 'O',
    shapes: [
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
      [[0,0],[0,1],[1,0],[1,1]],
    ],
  },
  T: {
    color: 'T',
    shapes: [
      [[0,1],[1,0],[1,1],[1,2]],
      [[0,0],[1,0],[2,0],[1,1]],
      [[1,0],[1,1],[1,2],[2,1]],
      [[0,1],[1,1],[2,1],[1,0]],
    ],
  },
  S: {
    color: 'S',
    shapes: [
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]],
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]],
    ],
  },
  Z: {
    color: 'Z',
    shapes: [
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,0],[1,1],[2,0]],
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,0],[1,1],[2,0]],
    ],
  },
  J: {
    color: 'J',
    shapes: [
      [[0,0],[1,0],[1,1],[1,2]],
      [[0,0],[0,1],[1,0],[2,0]],
      [[1,0],[1,1],[1,2],[2,2]],
      [[0,1],[1,1],[2,0],[2,1]],
    ],
  },
  L: {
    color: 'L',
    shapes: [
      [[0,2],[1,0],[1,1],[1,2]],
      [[0,0],[1,0],[2,0],[2,1]],
      [[1,0],[1,1],[1,2],[2,0]],
      [[0,0],[0,1],[1,1],[2,1]],
    ],
  },
};

const TETROMINO_KEYS = Object.keys(TETROMINOES);

// ─── Game State ───────────────────────────────────────────────────────────────

let board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null)); // 2-D grid
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 0;
let gameRunning = false;
let gamePaused = false;
let dropTimer = null;
let animationFrameId = null;
let lastDropTime = 0;

// ─── DOM References ───────────────────────────────────────────────────────────

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const pauseIndicator = document.getElementById('pause-indicator');
const messageOverlay = document.getElementById('message-overlay');
const messageTitle = document.getElementById('message-title');
const messageText = document.getElementById('message-text');
const messageBtn = document.getElementById('message-btn');

// ─── Board Helpers ────────────────────────────────────────────────────────────

function createBoard() {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

function isValidPosition(piece, offsetRow, offsetCol, rotation) {
  const shape = TETROMINOES[piece.type].shapes[rotation];
  return shape.every(([r, c]) => {
    const nr = piece.row + offsetRow + r;
    const nc = piece.col + offsetCol + c;
    return (
      nr >= 0 && nr < BOARD_ROWS &&
      nc >= 0 && nc < BOARD_COLS &&
      board[nr][nc] === null
    );
  });
}

function placePiece(piece) {
  const shape = TETROMINOES[piece.type].shapes[piece.rotation];
  shape.forEach(([r, c]) => {
    board[piece.row + r][piece.col + c] = piece.color;
  });
}

function clearFullLines() {
  let cleared = 0;
  for (let r = BOARD_ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1);
      board.unshift(Array(BOARD_COLS).fill(null));
      cleared++;
      r++; // re-check same row index after splice
    }
  }
  return cleared;
}

// ─── Piece Factories ──────────────────────────────────────────────────────────

function randomType() {
  return TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
}

function spawnPiece(type) {
  return {
    type,
    color: TETROMINOES[type].color,
    row: 0,
    col: Math.floor((BOARD_COLS - 4) / 2),
    rotation: 0,
  };
}

// ─── Ghost Piece ──────────────────────────────────────────────────────────────

function getGhostRow(piece) {
  let ghostRow = piece.row;
  while (isValidPosition(piece, ghostRow - piece.row + 1, 0, piece.rotation)) {
    ghostRow++;
  }
  return ghostRow;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

/** Render the board cells into the DOM grid. */
function renderBoard() {
  // Build a display grid (copy of board + current piece + ghost)
  const display = board.map(row => row.slice());

  if (currentPiece) {
    // Ghost
    const ghostRow = getGhostRow(currentPiece);
    const shape = TETROMINOES[currentPiece.type].shapes[currentPiece.rotation];
    if (ghostRow !== currentPiece.row) {
      shape.forEach(([r, c]) => {
        const nr = ghostRow + r;
        const nc = currentPiece.col + c;
        if (nr >= 0 && nr < BOARD_ROWS && display[nr][nc] === null) {
          display[nr][nc] = `ghost ${currentPiece.color}`;
        }
      });
    }

    // Active piece
    shape.forEach(([r, c]) => {
      const nr = currentPiece.row + r;
      const nc = currentPiece.col + c;
      if (nr >= 0 && nr < BOARD_ROWS) {
        display[nr][nc] = currentPiece.color;
      }
    });
  }

  // Update DOM cells
  const cells = boardEl.querySelectorAll('.cell');
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = cells[r * BOARD_COLS + c];
      const val = display[r][c];
      cell.className = 'cell';
      if (val) {
        if (val.startsWith('ghost')) {
          cell.classList.add('filled', 'ghost', val.split(' ')[1]);
        } else {
          cell.classList.add('filled', val);
        }
      }
    }
  }
}

/** Draw the next piece preview on the canvas. */
function renderNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) return;

  const shape = TETROMINOES[nextPiece.type].shapes[0];
  const colors = {
    I: '#00f0f0', O: '#f0f000', T: '#a000f0',
    S: '#00f000', Z: '#f00000', J: '#0000f0', L: '#f0a000',
  };

  // Centre the piece in the 4×4 preview area
  const minR = Math.min(...shape.map(([r]) => r));
  const minC = Math.min(...shape.map(([, c]) => c));
  const maxR = Math.max(...shape.map(([r]) => r));
  const maxC = Math.max(...shape.map(([, c]) => c));
  const pieceH = maxR - minR + 1;
  const pieceW = maxC - minC + 1;
  const offsetR = Math.floor((4 - pieceH) / 2);
  const offsetC = Math.floor((4 - pieceW) / 2);

  nextCtx.fillStyle = colors[nextPiece.type];
  shape.forEach(([r, c]) => {
    nextCtx.fillRect(
      (offsetC + c - minC) * CELL_SIZE + 2,
      (offsetR + r - minR) * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4,
    );
  });
}

function updateStats() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level + 1;
}

// ─── Game Loop ────────────────────────────────────────────────────────────────

function dropSpeed() {
  return LEVEL_SPEEDS[Math.min(level, LEVEL_SPEEDS.length - 1)];
}

function gameLoop(timestamp) {
  if (!gameRunning || gamePaused) return;

  if (timestamp - lastDropTime >= dropSpeed()) {
    lastDropTime = timestamp;
    moveDown();
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

// ─── Piece Movement ───────────────────────────────────────────────────────────

function moveLeft() {
  if (!currentPiece || !gameRunning || gamePaused) return;
  if (isValidPosition(currentPiece, 0, -1, currentPiece.rotation)) {
    currentPiece.col -= 1;
    renderBoard();
  }
}

function moveRight() {
  if (!currentPiece || !gameRunning || gamePaused) return;
  if (isValidPosition(currentPiece, 0, 1, currentPiece.rotation)) {
    currentPiece.col += 1;
    renderBoard();
  }
}

function moveDown() {
  if (!currentPiece || !gameRunning || gamePaused) return;
  if (isValidPosition(currentPiece, 1, 0, currentPiece.rotation)) {
    currentPiece.row += 1;
    renderBoard();
  } else {
    lockPiece();
  }
}

function hardDrop() {
  if (!currentPiece || !gameRunning || gamePaused) return;
  const ghostRow = getGhostRow(currentPiece);
  score += (ghostRow - currentPiece.row) * 2;
  currentPiece.row = ghostRow;
  renderBoard();
  lockPiece();
  updateStats();
}

function rotate() {
  if (!currentPiece || !gameRunning || gamePaused) return;
  const newRotation = (currentPiece.rotation + 1) % 4;
  // Try basic rotation, then wall-kick offsets
  const kicks = [0, 1, -1, 2, -2];
  for (const kick of kicks) {
    if (isValidPosition(currentPiece, 0, kick, newRotation)) {
      currentPiece.rotation = newRotation;
      currentPiece.col += kick;
      renderBoard();
      return;
    }
  }
}

function lockPiece() {
  placePiece(currentPiece);
  const cleared = clearFullLines();
  if (cleared > 0) {
    lines += cleared;
    score += LINE_POINTS[cleared] * (level + 1);
    level = Math.floor(lines / 10);
    updateStats();
  }

  currentPiece = nextPiece;
  nextPiece = spawnPiece(randomType());
  renderNext();

  // Check game over: new piece immediately collides
  if (!isValidPosition(currentPiece, 0, 0, currentPiece.rotation)) {
    endGame();
    return;
  }

  renderBoard();
}

// ─── Game State Management ────────────────────────────────────────────────────

function buildBoardDOM() {
  boardEl.innerHTML = '';
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      boardEl.appendChild(cell);
    }
  }
}

function startGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 0;
  gameRunning = true;
  gamePaused = false;
  lastDropTime = 0;

  currentPiece = spawnPiece(randomType());
  nextPiece = spawnPiece(randomType());

  hideMessage();
  updateStats();
  renderNext();
  renderBoard();
  pauseIndicator.textContent = '';
  pauseBtn.textContent = 'Pause';

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame((ts) => {
    lastDropTime = ts;
    animationFrameId = requestAnimationFrame(gameLoop);
  });
}

function togglePause() {
  if (!gameRunning) return;
  gamePaused = !gamePaused;
  if (gamePaused) {
    pauseIndicator.textContent = 'PAUSED';
    pauseBtn.textContent = 'Resume';
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  } else {
    pauseIndicator.textContent = '';
    pauseBtn.textContent = 'Pause';
    animationFrameId = requestAnimationFrame((ts) => {
      lastDropTime = ts;
      animationFrameId = requestAnimationFrame(gameLoop);
    });
  }
}

function endGame() {
  gameRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  showMessage('GAME OVER', `Score: ${score} | Lines: ${lines}`, 'Play Again');
}

function showMessage(title, text, btnText) {
  messageTitle.textContent = title;
  messageText.textContent = text;
  messageBtn.textContent = btnText;
  messageOverlay.classList.add('visible');
}

function hideMessage() {
  messageOverlay.classList.remove('visible');
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'ArrowLeft':
      e.preventDefault();
      moveLeft();
      break;
    case 'ArrowRight':
      e.preventDefault();
      moveRight();
      break;
    case 'ArrowDown':
      e.preventDefault();
      moveDown();
      break;
    case 'ArrowUp':
      e.preventDefault();
      rotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyP':
      togglePause();
      break;
  }
});

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
messageBtn.addEventListener('click', startGame);

// ─── Init ─────────────────────────────────────────────────────────────────────

buildBoardDOM();
renderBoard();
showMessage('TETRIS', 'Use arrow keys to play. Space = hard drop.', 'Start Game');
