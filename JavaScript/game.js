// Get the canvas and context
const canvas = document.getElementById('go-board');
const ctx = canvas.getContext('2d');

// Board size
const BOARD_SIZE = 19;
const TILE_SIZE = canvas.width / BOARD_SIZE;  // Each tile size in pixels
const STONE_RADIUS = TILE_SIZE / 2 - 3;  // Radius of the stone

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
let currentOpponent = null; // Variable to track the current opponent (AI or player)

// Set canvas size according to grid size
canvas.width = BOARD_SIZE * TILE_SIZE;
canvas.height = BOARD_SIZE * TILE_SIZE;

// Draw the Go board grid
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear canvas
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, canvas.height);
        ctx.stroke();
        
        // draw horizontal lines
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

function drawAllStones() {
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x]) {
                // if there's a stone at the position
                drawStone(x, y, board[y][x] === 'black' ? 'black' : 'white');
            }
        }
    }
}

// Function to update the displayed count of captured stones
function updateCapturedStones() {
    // update the captured stone counts for both black and white players
    document.getElementById('captured-black').textContent = capturedBlack;
    document.getElementById('captured-white').textContent = capturedWhite;
}

// Handle placing a stone
function placeStone(x, y) {
    if (gameOver || !isModeSelected || (isMultiplayer && currentTurn !== "black" && currentTurn !== "white")) return;  // Prevent moves before mode selection or during invalid turns

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
    if (!isModeSelected || gameOver) return;  // Don't allow interaction if game is over or mode is not selected

    const rect = canvas.getBoundingClientRect();  // Get the position of the canvas relative to the page
    const mouseX = event.clientX - rect.left;  // Mouse X position within the canvas
    const mouseY = event.clientY - rect.top;   // Mouse Y position within the canvas
    
    // Fix for off-by-one issue with alignment
    const x = Math.floor(mouseX / TILE_SIZE);  // Convert mouseX to grid X position
    const y = Math.floor(mouseY / TILE_SIZE);  // Convert mouseY to grid Y position

    // Prevent placing outside the grid (in case of misclicking)
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;

    placeStone(x, y);  // Call placeStone to place a stone at the calculated (x, y) position
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

// Check if placing a stone would result in suicide (no liberties left)
function isSuicide(x, y) {
    const color = board[y][x];
    const opponent = color === 'black' ? 'white' : 'black';
    
    // Check all directions for liberties
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < BOARD_SIZE && ny < BOARD_SIZE) {
            if (board[ny][nx] === null) {
                return false;  // There's an empty space (liberty), so it's not suicide
            }
            if (board[ny][nx] === opponent) {
                // If it's an opponent stone, check if it has liberties
                if (hasLiberties(nx, ny) > 0) {
                    return false;  // Opponent's group has liberties, so it's not suicide
                }
            }
        }
    }
    return true;  // If no liberties, it's suicide
}

// Check if a group of stones has liberties
function hasLiberties(x, y) {
    let liberties = 0;
    const color = board[y][x];
    const visited = new Set();
    
    function dfs(nx, ny) {
        if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE || visited.has(`${nx},${ny}`)) {
            return;
        }
        
        visited.add(`${nx},${ny}`);
        
        if (board[ny][nx] === null) {
            liberties++;  // Found an empty space (liberty)
        } else if (board[ny][nx] === color) {
            dfs(nx - 1, ny);  // Check left
            dfs(nx + 1, ny);  // Check right
            dfs(nx, ny - 1);  // Check up
            dfs(nx, ny + 1);  // Check down
        }
    }
    
    dfs(x, y);
    return liberties;
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
    currentOpponent = 'AI'; // Set opponent to AI
    resetBoard(); // Reset the board when switching to AI mode
    updateOpponentSelection();  // Update UI if needed (e.g., difficulty selection or turn indicator)
    updateButtonSelection(this);
});

document.getElementById('multiplayer-button').addEventListener('click', function() {
    if (isModeSelected && isMultiplayer) return;  // Prevent multiple clicks
    isModeSelected = true;
    isMultiplayer = true; // Enable multiplayer mode
    currentOpponent = 'Player'; // Set opponent to Player (Multiplayer)
    resetBoard(); // Reset the board when switching to multiplayer mode
    updateOpponentSelection();  // Update UI if needed (e.g., difficulty selection or turn indicator)
    updateButtonSelection(this);
});

// Update the button highlight on mode selection
function updateButtonSelection(button) {
    document.querySelectorAll('.opponent').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
}

// Adding event listeners to the difficulty buttons, so the selected one is highlighted
document.querySelectorAll('#difficulty-selection .difficulty').forEach(button => {
    button.addEventListener('click', () => {
        // Remove 'selected' class from all difficulty buttons
        document.querySelectorAll('#difficulty-selection .difficulty').forEach(btn => btn.classList.remove('selected'));
        // Add 'selected' class to clicked difficulty button
        button.classList.add('selected');
    });
});

// Function to update opponent selection based on the mode
function updateOpponentSelection() {
    console.log(`Current opponent: ${currentOpponent}`);

    // Show the difficulty selection if the opponent is AI
    if (currentOpponent === 'AI') {
        document.getElementById('difficulty-selection').classList.remove('hidden');
    } else if (currentOpponent === 'Player') {
        // Hide difficulty selection when the opponent is a player
        document.getElementById('difficulty-selection').classList.add('hidden');
    }

    // Reset the board if the mode has changed
    resetBoard();  // Ensure the board is reset when switching between modes

    // Update UI elements based on selected mode
    if (currentOpponent === 'Player') {
        console.log('Multiplayer mode selected');
    }
}

// Function to update the turn display
function updateTurnDisplay() {
    document.getElementById('current-turn').textContent = currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1);  // Capitalize "black" or "white"
}

// Initialize game
function setup() {
    drawBoard();
    updateTurnDisplay();
}

// Calling setup() to initialize the board
setup();
