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

// Track if the game is over
let gameOver = false;

// Mode selection
let isModeSelected = false;
let isAIEnabled = false;
let isMultiplayer = false; // Track multiplayer mode
let aiDifficulty = null;

// Draw the Go board grid
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, canvas.height);
        ctx.stroke();
        
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
    if (gameOver || !isModeSelected || (isMultiplayer && currentTurn !== "black" && currentTurn !== "white")) return; // Prevent moves before mode selection or during invalid turns

    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && !board[y][x]) {
        board[y][x] = currentTurn;

        if (JSON.stringify(board) === previousBoardState) {
            alert("Ko rule: This move would return the board to the previous state.");
            board[y][x] = null;
            return;
        }

        previousBoardState = JSON.stringify(board);
        checkCaptures(x, y);

        if (isSuicide(x, y)) {
            board[y][x] = null;
            return;
        }

        drawBoard();
        drawAllStones();
        
        currentTurn = currentTurn === "black" ? "white" : "black";
        updateTurnDisplay();
        updateCapturedStones();
        checkWinner();

        if (isAIEnabled && currentTurn === "white" && !gameOver) {
            setTimeout(aiMove, 500);
        }
    }
}

// Check for captures
function checkCaptures(x, y) {
    const opponent = currentTurn === "black" ? "white" : "black";
    let captured = [];

    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    directions.forEach(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
            if (board[ny][nx] === opponent) {
                const group = getGroup(nx, ny, opponent);
                if (group.every(stone => hasLiberties(stone.x, stone.y) === 0)) {
                    captured = captured.concat(group);
                }
            }
        }
    });

    captured.forEach(stone => {
        board[stone.y][stone.x] = null;
        if (currentTurn === "black") capturedWhite++;
        else capturedBlack++;
    });

    updateCapturedStones();
    return captured;
}

// Get all stones in a group
function getGroup(x, y, color) {
    let group = [];
    let visited = new Set();
    
    function dfs(nx, ny) {
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE || board[ny][nx] !== color || visited.has(`${nx},${ny}`)) {
            return;
        }

        visited.add(`${nx},${ny}`);
        group.push({x: nx, y: ny});
        
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => dfs(nx + dx, ny + dy));
    }
    
    dfs(x, y);
    return group;
}

// Check for winner
function checkWinner() {
    if (capturedBlack >= 10) {
        document.getElementById('winner-message').textContent = "White wins!";
        disableBoard();  // Disable the board once we have a winner
    } else if (capturedWhite >= 10) {
        document.getElementById('winner-message').textContent = "Black wins!";
        disableBoard();  // Disable the board once we have a winner
    }
}

// Completely disable board interaction for both player and AI
function disableBoard() {
    document.getElementById('winner-display').classList.add('show'); // Show the winner message
    canvas.style.pointerEvents = "none"; // Block all mouse input
    gameOver = true; // Prevent AI from making moves
}

// Enable board input when resetting
function enableBoard() {
    document.getElementById('winner-display').classList.remove('show'); // Hide winner display
    canvas.style.pointerEvents = "auto"; // Allow interactions again
    gameOver = false; // Reset game state
}

// AI Move Logic
function aiMove() {
    if (!isAIEnabled || currentTurn !== "white" || gameOver) return; // Stop AI if game over
    let move = getDefensiveMove();
    if (move) placeStone(move.x, move.y);
}

// Reset Game
document.getElementById('reset-button').addEventListener('click', function() {
    enableBoard(); // Ensure board input is enabled on reset

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            board[y][x] = null;
        }
    }

    capturedBlack = 0;
    capturedWhite = 0;
    currentTurn = "black";
    previousBoardState = JSON.stringify(board);

    document.getElementById('winner-message').textContent = '';
    updateCapturedStones();
    drawBoard();
    drawAllStones();
    updateTurnDisplay();
});

// Mode Selection
document.getElementById('ai-button').addEventListener('click', function() {
    isAIEnabled = true;
    isModeSelected = true;
    isMultiplayer = false; // Disable multiplayer mode
    enableBoard(); // Enable board input after mode selection
});

document.getElementById('multiplayer-button').addEventListener('click', function() {
    isAIEnabled = false;
    isModeSelected = true;
    isMultiplayer = true; // Enable multiplayer mode
    enableBoard(); // Enable board input after mode selection
});

// Difficulty Selection
document.querySelectorAll('.difficulty').forEach(button => {
    button.addEventListener('click', function() {
        aiDifficulty = button.getAttribute('data-level');
        console.log("AI Difficulty selected:", aiDifficulty);
    });
});

// Adding event listeners to the difficulty buttons, so the selected one is highlighted
document.querySelectorAll('#difficulty-selection .difficulty').forEach(button => {
    button.addEventListener('click', () => {
        // Remove 'selected' class from all difficulty buttons
        document.querySelectorAll('#difficulty-selection .difficulty').forEach(btn => btn.classList.remove('selected'));
        // Add 'selected' class to clicked difficulty button
        button.classList.add('selected');
    });
});

// JavaScript to toggle 'selected' class when a button is clicked within the #mode-selection div
document.querySelectorAll('#mode-selection .opponent').forEach(button => {
    button.addEventListener('click', () => {
        // Remove 'selected' class from all opponent buttons
        document.querySelectorAll('#mode-selection .opponent').forEach(btn => btn.classList.remove('selected'));
        // Add 'selected' class to clicked button
        button.classList.add('selected');
    });
});

// Initialize game
function setup() {
  drawBoard();
  updateTurnDisplay();
}

// Calling setup() to initialize the board
setup();
