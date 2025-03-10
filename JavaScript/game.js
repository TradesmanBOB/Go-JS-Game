// Get the canvas and context
const canvas = document.getElementById('go-board');
const ctx = canvas.getContext('2d');

// Board size
const BOARD_SIZE = 19;
const TILE_SIZE = canvas.width / BOARD_SIZE;
const STONE_RADIUS = TILE_SIZE / 2 - 3;

// Board state to track stone placements (null means empty)
let board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

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
let isMultiplayer = false; // Track multiplayer mode

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
    }
}

// Add event listener to make the board interactive
canvas.addEventListener('click', function(event) {
    if (!isModeSelected || gameOver) return; // Don't allow interaction if game is over or mode is not selected

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);

    placeStone(x, y);  // Call placeStone to place a stone at the (x, y) position
});

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
        gameOver = true;  // Prevent any more moves after a winner is declared
    } else if (capturedWhite >= 10) {
        document.getElementById('winner-message').textContent = "Black wins!";
        gameOver = true;  // Prevent any more moves after a winner is declared
    }
}

// Reset board to initial state
function resetBoard() {
    // Reset board state
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

    capturedBlack = 0;
    capturedWhite = 0;
    currentTurn = "black";
    previousBoardState = JSON.stringify(board);

    gameOver = false;  // Ensure the game isn't over when switching modes
    drawBoard();
    drawAllStones();
    updateTurnDisplay();
}

// Reset Game
document.getElementById('reset-button').addEventListener('click', function() {
    resetBoard();
});

// Mode Selection
document.getElementById('ai-button').addEventListener('click', function() {
    if (isModeSelected && !isMultiplayer) return;  // Prevent multiple clicks
    isModeSelected = true;
    isMultiplayer = false; // Disable multiplayer mode
    resetBoard(); // Reset the board when switching to AI mode
    updateModeDisplay();  // Update UI if needed (e.g., difficulty selection or turn indicator)

    // Handle the button highlight
    document.querySelectorAll('.mode-button').forEach(btn => {
        btn.classList.remove('selected'); // Remove 'selected' class from all buttons
    });
    this.classList.add('selected'); // Add 'selected' class to the clicked button
});

document.getElementById('multiplayer-button').addEventListener('click', function() {
    if (isModeSelected && isMultiplayer) return;  // Prevent multiple clicks
    isModeSelected = true;
    isMultiplayer = true; // Enable multiplayer mode
    resetBoard(); // Reset the board when switching to multiplayer mode
    updateModeDisplay();  // Update UI if needed (e.g., difficulty selection or turn indicator)

    // Handle the button highlight
    document.querySelectorAll('.mode-button').forEach(btn => {
        btn.classList.remove('selected'); // Remove 'selected' class from all buttons
    });
    this.classList.add('selected'); // Add 'selected' class to the clicked button
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

// Initialize game
function setup() {
    drawBoard();
    updateTurnDisplay();
}

// Calling setup() to initialize the board
setup();