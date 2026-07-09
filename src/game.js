const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const SHAPES = [
  { color: '#06b6d4', matrix: [[1, 1, 1, 1]] },
  {
    color: '#f97316',
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  {
    color: '#2563eb',
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  {
    color: '#facc15',
    matrix: [
      [1, 1],
      [1, 1]
    ]
  },
  {
    color: '#22c55e',
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ]
  },
  {
    color: '#a855f7',
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  {
    color: '#ef4444',
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ]
  }
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreLabel = document.getElementById('score');
const linesLabel = document.getElementById('lines');
const statusLabel = document.getElementById('status');
const restartButton = document.getElementById('restart');

const game = {
  board: [],
  current: null,
  position: { x: 0, y: 0 },
  score: 0,
  lines: 0,
  gameOver: false,
  lastDropTime: 0,
  dropInterval: 700,
  isRunning: false
};

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function randomPiece() {
  const template = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return {
    color: template.color,
    matrix: cloneMatrix(template.matrix)
  };
}

function spawnPiece() {
  game.current = randomPiece();
  game.position.y = 0;
  game.position.x = Math.floor((COLS - game.current.matrix[0].length) / 2);

  if (collides(game.current.matrix, game.position.x, game.position.y)) {
    game.gameOver = true;
    game.isRunning = false;
    statusLabel.textContent = 'Game Over';
  }
}

function collides(matrix, offsetX, offsetY) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) {
        continue;
      }

      const boardY = y + offsetY;
      const boardX = x + offsetX;

      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
        return true;
      }

      if (boardY >= 0 && game.board[boardY][boardX]) {
        return true;
      }
    }
  }
  return false;
}

function mergeCurrentPiece() {
  const { matrix, color } = game.current;
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (matrix[y][x]) {
        const boardY = y + game.position.y;
        const boardX = x + game.position.x;
        if (boardY >= 0) {
          game.board[boardY][boardX] = color;
        }
      }
    }
  }
}

function clearLines() {
  let linesCleared = 0;

  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (game.board[y].every(Boolean)) {
      game.board.splice(y, 1);
      game.board.unshift(Array(COLS).fill(null));
      linesCleared += 1;
      y += 1;
    }
  }

  if (linesCleared > 0) {
    game.lines += linesCleared;
    game.score += linesCleared * 100;
  }
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  ctx.strokeStyle = '#0f172a';
  ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  game.board.forEach((row, y) => {
    row.forEach((color, x) => {
      if (color) {
        drawCell(x, y, color);
      }
    });
  });

  if (game.current) {
    game.current.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawCell(x + game.position.x, y + game.position.y, game.current.color);
        }
      });
    });
  }

  scoreLabel.textContent = String(game.score);
  linesLabel.textContent = String(game.lines);
}

function move(dx) {
  if (!game.isRunning) {
    return;
  }

  const nextX = game.position.x + dx;
  if (!collides(game.current.matrix, nextX, game.position.y)) {
    game.position.x = nextX;
    draw();
  }
}

function softDrop() {
  if (!game.isRunning) {
    return;
  }

  const nextY = game.position.y + 1;
  if (!collides(game.current.matrix, game.position.x, nextY)) {
    game.position.y = nextY;
  } else {
    mergeCurrentPiece();
    clearLines();
    spawnPiece();
  }

  draw();
}

function hardDrop() {
  if (!game.isRunning) {
    return;
  }

  while (!collides(game.current.matrix, game.position.x, game.position.y + 1)) {
    game.position.y += 1;
  }
  softDrop();
}

function rotate() {
  if (!game.isRunning) {
    return;
  }

  const rotated = rotateMatrix(game.current.matrix);
  if (!collides(rotated, game.position.x, game.position.y)) {
    game.current.matrix = rotated;
    draw();
  }
}

function tick(timestamp) {
  if (!game.isRunning) {
    draw();
    return;
  }

  if (timestamp - game.lastDropTime >= game.dropInterval) {
    softDrop();
    game.lastDropTime = timestamp;
  }

  requestAnimationFrame(tick);
}

function startGame() {
  game.board = createBoard();
  game.score = 0;
  game.lines = 0;
  game.gameOver = false;
  game.isRunning = true;
  game.lastDropTime = 0;
  statusLabel.textContent = 'Running';
  spawnPiece();
  draw();
  requestAnimationFrame(tick);
}

restartButton.addEventListener('click', startGame);

window.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      move(-1);
      break;
    case 'ArrowRight':
      event.preventDefault();
      move(1);
      break;
    case 'ArrowDown':
      event.preventDefault();
      softDrop();
      break;
    case 'ArrowUp':
      event.preventDefault();
      rotate();
      break;
    case ' ':
      event.preventDefault();
      hardDrop();
      break;
    default:
  }
});

window.__tetris = {
  startGame,
  hardDrop,
  softDrop,
  getState: () => {
    let settledBlocks = 0;
    game.board.forEach((row) => {
      row.forEach((cell) => {
        if (cell) {
          settledBlocks += 1;
        }
      });
    });

    return {
      x: game.position.x,
      y: game.position.y,
      score: game.score,
      lines: game.lines,
      status: statusLabel.textContent,
      settledBlocks,
      gameOver: game.gameOver
    };
  }
};

game.board = createBoard();
draw();
