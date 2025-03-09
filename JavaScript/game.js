// Get the canvas and context
const canvas = document.getElementById('go-board');
const ctx = canvas.getContext('2d');

// Board size
const BOARD_SIZE = 19;
const TILE_SIZE = canvas.width / BOARD_SIZE;
const STONE_RADIUS = TILE_SIZE / 2 - 3;

// Board state to track stone placements (null means empty)
const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

// Player captured stones count
let capturedBlack = 0;
let capturedWhite = 0;

// Current turn, start with "black"
let currentTurn = "black";

// Previous board state (for Ko rule)
let previousBoardState = JSON.stringify(board);

// Draw the Go board grid
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;

  // Draw horizontal lines
  for (let i = 0; i < BOARD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * TILE_SIZE, 0);
    ctx.lineTo(i * TILE_SIZE, canvas.height);
    ctx.stroke();
  }

  // Draw vertical lines
  for (let i = 0; i < BOARD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * TILE_SIZE);
    ctx.lineTo(canvas.width, i * TILE_SIZE);
    ctx.stroke();
  }
}

// Draw a stone on the board
function drawStone(x, y, color) {
  ctx.beginPath();
  ctx.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, STONE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// Handle placing a stone
function placeStone(x, y) {
  // Ensure the spot is empty and within bounds
  if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && !board[y][x]) {
    
    // Temporarily place the stone
    board[y][x] = currentTurn;

    // Check Ko rule AFTER the stone is placed
    if (JSON.stringify(board) === previousBoardState) {
      alert("Ko rule: This move would return the board to the previous state.");
      board[y][x] = null;  // Undo the move
      return;
    }

    // Save the current board state for Ko rule
    previousBoardState = JSON.stringify(board);

    // Check for captures before placing the stone
    let capturedStones = checkCaptures(x, y);

    // Check for suicide (illegal move)
    if (isSuicide(x, y)) {
      board[y][x] = null; // Undo the move
      return;
    }

    // Redraw the board after placing the stone
    drawBoard();
    drawAllStones(); // Redraw all stones (including new move and captured stones)
    
    // Switch turns after placing a stone
    currentTurn = currentTurn === "black" ? "white" : "black";
    updateTurnDisplay(); // Update the turn display after placing the stone
    
    // Update captured stones display after the move
    updateCapturedStones(); // Call this function after each valid move
    
    // Declare the winner if a player has 10 or more captured stones
    checkWinner();
  }
}

// Check if placing a stone would result in capture
function checkCaptures(x, y) {
  const opponent = currentTurn === "black" ? "white" : "black";
  let captured = [];

  // Check all four directions for surrounding stones
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];

  directions.forEach(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    
    // Ensure we're within bounds
    if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      if (board[ny][nx] === opponent) {
        const group = getGroup(nx, ny, opponent);
        if (group.every(stone => hasLiberties(stone.x, stone.y) === 0)) {
          captured = captured.concat(group);
        }
      }
    }
  });

  // Remove captured stones from the board and update the captured count
  captured.forEach(stone => {
    board[stone.y][stone.x] = null; // Remove the captured stone from the board
    if (currentTurn === "black") {
      capturedWhite++; // Increment white's captured stones
    } else {
      capturedBlack++; // Increment black's captured stones
    }
  });

  // After updating the captured stones count, update the display
  updateCapturedStones();

  return captured;
}

// Get all stones in a group (connected stones of the same color)
function getGroup(x, y, color) {
  let group = [];
  let visited = new Set();
  
  function dfs(nx, ny) {
    if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE || board[ny][nx] !== color || visited.has(`${nx},${ny}`)) {
      return;
    }

    visited.add(`${nx},${ny}`);
    group.push({x: nx, y: ny});
    
    // Explore all 4 directions
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    directions.forEach(([dx, dy]) => dfs(nx + dx, ny + dy));
  }
  
  dfs(x, y);
  return group;
}

// Check if a stone has liberties (empty adjacent spaces)
function hasLiberties(x, y) {
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];

  for (let [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;
    
    if (nx >= 0 && ny >= 0 && nx < BOARD_SIZE && ny < BOARD_SIZE) {
      if (!board[ny][nx]) {
        return 1; // Found an empty space, so the stone has liberties
      }
    }
  }
  return 0; // No liberties found
}

// Check if a move is a suicide (a move that would result in no liberties)
function isSuicide(x, y) {
  const group = getGroup(x, y, currentTurn);
  return group.every(stone => hasLiberties(stone.x, stone.y) === 0);
}

// Update the captured stones display on the HTML page
function updateCapturedStones() {
  // Update the text content for black and white captured stones
  document.getElementById('captured-black').textContent = capturedBlack;
  document.getElementById('captured-white').textContent = capturedWhite;
}

// Update the displayed turn on the page
function updateTurnDisplay() {
  const turnElement = document.getElementById('current-turn');
  turnElement.textContent = currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1); // Capitalize the first letter
}

// Redraw all stones on the board (including captured ones)
function drawAllStones() {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === "black") {
        drawStone(x, y, "black");
      } else if (board[y][x] === "white") {
        drawStone(x, y, "white");
      }
    }
  }
}

// Handle mouse click event
canvas.addEventListener('click', function(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
  const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);
  
  // Place a stone and handle turn switch
  placeStone(x, y);
});

// Inside your checkWinner function:
function checkWinner() {
  if (capturedBlack >= 10) {
    document.getElementById('winner-message').textContent = "White wins with " + capturedBlack + " captured black stones!";
    document.getElementById('winner-display').classList.add('show');
    disableBoard(); // Disable further moves
  } else if (capturedWhite >= 10) {
    document.getElementById('winner-message').textContent = "Black wins with " + capturedWhite + " captured white stones!";
    document.getElementById('winner-display').classList.add('show');
    disableBoard(); // Disable further moves
  }
}  

// Disable further moves after a winner is declared
function disableBoard() {
  canvas.removeEventListener('click', placeStone);
}

// Reset the game
document.getElementById('reset-button').addEventListener('click', function() {
    // Reset the board and captured stones
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        board[y][x] = null;
      }
    }
  
    capturedBlack = 0;
    capturedWhite = 0;
    currentTurn = "black";
    previousBoardState = JSON.stringify(board);
    
    // Clear winner message and hide the winner box
    document.getElementById('winner-message').textContent = '';
    document.getElementById('winner-display').classList.remove('show'); // Hide the winner box
    
    updateCapturedStones();
    drawBoard();
    drawAllStones();
    updateTurnDisplay();
    canvas.addEventListener('click', placeStone); // Re-enable clicking
    
    // Check if there’s a winner right after reset (even though both counts are 0)
    checkWinner();
  });

// Initial setup
function setup() {
  drawBoard(); // Draw the board
  updateTurnDisplay(); // Show the initial turn
}

// AI Difficulty Selection
let aiDifficulty = null;
let isAIEnabled = false;

// Handle AI & Multiplayer Selection
document.getElementById('ai-button').addEventListener('click', function () {
    isAIEnabled = true;
    document.getElementById('difficulty-selection').classList.remove('hidden');
});

document.getElementById('multiplayer-button').addEventListener('click', function () {
    isAIEnabled = false;
    document.getElementById('difficulty-selection').classList.add('hidden');
});

// Set AI difficulty
document.querySelectorAll('.difficulty').forEach(button => {
    button.addEventListener('click', function () {
        aiDifficulty = this.getAttribute('data-level');
        alert("AI set to " + aiDifficulty + " difficulty.");
    });
});

// AI makes a move
function aiMove() {
    if (!isAIEnabled || currentTurn !== "white") return;

    let move = null;

    if (aiDifficulty === "easy") {
        move = getRandomMove();
    } else if (aiDifficulty === "medium") {
        move = getDefensiveMove();
    } else if (aiDifficulty === "hard") {
        move = getStrategicMove();
    }

    if (move) {
        placeStone(move.x, move.y);
    }
}

// Get a random valid move
function getRandomMove() {
    let emptySpaces = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (!board[y][x]) emptySpaces.push({ x, y });
        }
    }
    return emptySpaces.length > 0 ? emptySpaces[Math.floor(Math.random() * emptySpaces.length)] : null;
}

// Get a move that avoids immediate capture (Medium AI)
function getDefensiveMove() {
    let move = getRandomMove();
    return move; // Placeholder, can be improved to analyze nearby stones
}

// Get a smarter move (Hard AI - Placeholder for now)
function getStrategicMove() {
    return getDefensiveMove(); // Will be improved to analyze groups and captures
}

// Modify the placeStone function to let AI play after the player
const originalPlaceStone = placeStone;
placeStone = function (x, y) {
    originalPlaceStone(x, y);
    if (isAIEnabled && currentTurn === "white") {
        setTimeout(aiMove, 500); // AI moves after a short delay
    }
};

setup();
