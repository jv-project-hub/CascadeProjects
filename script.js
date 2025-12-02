const BOARD_SIZE = 10;
const SHIP_SIZES = [5, 4, 3, 3, 2];
const SHIP_NAMES = ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"];
// Base paths; `_h` / `_v` suffix and `.png` extension are added based on orientation
const SHIP_IMAGES = {
  Carrier: "images/carrier_top",
  Battleship: "images/battleship_top",
  Cruiser: "images/cruiser_top",
  Submarine: "images/submarine_top",
  Destroyer: "images/destroyer_top",
};

// Sound effects state
let soundEnabled = true;

// Preload audio files for better performance
const hitSound = new Audio("sounds/explosion.mp3");
const missSound = new Audio("sounds/splash.mp3");

function playHitSound() {
  if (!soundEnabled) return;
  hitSound.currentTime = 0;
  hitSound.play().catch(() => {});
}

function playMissSound() {
  if (!soundEnabled) return;
  missSound.currentTime = 0;
  missSound.play().catch(() => {});
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  const soundBtn = document.getElementById("sound-btn");
  if (soundBtn) {
    soundBtn.textContent = soundEnabled ? "Sound: ON" : "Sound: OFF";
  }
}

const playerBoardEl = document.getElementById("player-board");
const aiBoardEl = document.getElementById("ai-board");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start-btn");
const orientationBtn = document.getElementById("orientation-btn");
const toggleFleetBtn = document.getElementById("toggle-fleet-btn");

const playerShipsLeftEl = document.getElementById("player-ships-left");
const aiShipsLeftEl = document.getElementById("ai-ships-left");
const playerShotsEl = document.getElementById("player-shots");
const aiShotsEl = document.getElementById("ai-shots");
const playerFleetEl = document.getElementById("player-fleet");
const aiFleetEl = document.getElementById("ai-fleet");
const fleetsEl = document.querySelector(".fleets");
const playerBoardWrapper = document.querySelector(".player-board-wrapper");

let playerBoard, aiBoard;
let playerShips = [];
let aiShips = [];
let gameOver = false;
let playerTurn = true;
let aiAvailableShots = [];

let playerShots = 0;
let aiShots = 0;

let fleetsVisible = true;

// manual placement state
let placingIndex = 0;
let horizontal = true;
let placementDone = false;

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ hasShip: false, hit: false, shipId: null }))
  );
}

// random AI placement only
function placeShipsRandomly(board, shipsArray) {
  for (let i = 0; i < SHIP_SIZES.length; i++) {
    const size = SHIP_SIZES[i];
    const name = SHIP_NAMES[i] || `Ship (${size})`;
    let placed = false;
    while (!placed) {
      const horizontal = Math.random() < 0.5;
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);

      if (horizontal) {
        if (col + size > BOARD_SIZE) continue;
        let collision = false;
        for (let c = col; c < col + size; c++) {
          if (board[row][c].hasShip) {
            collision = true;
            break;
          }
        }
        if (collision) continue;
        const shipId = shipsArray.length;
        const cells = [];
        for (let c = col; c < col + size; c++) {
          board[row][c].hasShip = true;
          board[row][c].shipId = shipId;
          cells.push({ r: row, c });
        }
        shipsArray.push({ id: shipId, size, name, hits: 0, sunk: false, cells });
        placed = true;
      } else {
        if (row + size > BOARD_SIZE) continue;
        let collision = false;
        for (let r = row; r < row + size; r++) {
          if (board[r][col].hasShip) {
            collision = true;
            break;
          }
        }
        if (collision) continue;
        const shipId = shipsArray.length;
        const cells = [];
        for (let r = row; r < row + size; r++) {
          board[r][col].hasShip = true;
          board[r][col].shipId = shipId;
          cells.push({ r, c: col });
        }
        shipsArray.push({ id: shipId, size, name, hits: 0, sunk: false, cells });
        placed = true;
      }
    }
  }
}

function clearPlacementPreview() {
  const previewCells = playerBoardEl.querySelectorAll(".cell.preview, .cell.preview-invalid");
  previewCells.forEach((cell) => {
    cell.classList.remove("preview");
    cell.classList.remove("preview-invalid");
  });
}

function updateFleetVisibility() {
  if (!fleetsEl || !toggleFleetBtn) return;
  if (fleetsVisible) {
    fleetsEl.classList.remove("hidden");
    toggleFleetBtn.textContent = "Hide Fleets";
  } else {
    fleetsEl.classList.add("hidden");
    toggleFleetBtn.textContent = "Show Fleets";
  }
}

function showPlacementPreview(row, col) {
  if (placementDone) return;
  const size = SHIP_SIZES[placingIndex];
  if (size == null) return;

  clearPlacementPreview();

  const isValid = canPlaceShip(playerBoard, row, col, size, horizontal);

  if (horizontal) {
    for (let c = col; c < col + size; c++) {
      if (c < 0 || c >= BOARD_SIZE) continue;
      const index = row * BOARD_SIZE + c;
      const cell = playerBoardEl.children[index];
      cell.classList.add(isValid ? "preview" : "preview-invalid");
    }
  } else {
    for (let r = row; r < row + size; r++) {
      if (r < 0 || r >= BOARD_SIZE) continue;
      const index = r * BOARD_SIZE + col;
      const cell = playerBoardEl.children[index];
      cell.classList.add(isValid ? "preview" : "preview-invalid");
    }
  }
}

function onPlayerCellEnter(e) {
  if (placementDone) return;
  const r = Number(e.currentTarget.dataset.row);
  const c = Number(e.currentTarget.dataset.col);
  showPlacementPreview(r, c);
}

function onPlayerCellLeave() {
  if (placementDone) return;
  clearPlacementPreview();
}

function buildBoards() {
  playerBoardEl.innerHTML = "";
  aiBoardEl.innerHTML = "";

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const playerCell = document.createElement("div");
      playerCell.className = "cell player water";
      playerCell.dataset.row = r;
      playerCell.dataset.col = c;
      playerCell.addEventListener("click", onPlayerPlaceShip);
      playerCell.addEventListener("mouseenter", onPlayerCellEnter);
      playerCell.addEventListener("mouseleave", onPlayerCellLeave);
      playerBoardEl.appendChild(playerCell);

      const aiCell = document.createElement("div");
      aiCell.className = "cell water disabled"; // disabled until game starts
      aiCell.dataset.row = r;
      aiCell.dataset.col = c;
      aiCell.addEventListener("click", onPlayerFire);
      aiBoardEl.appendChild(aiCell);
    }
  }
}

function resetAIShots() {
  aiAvailableShots = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      aiAvailableShots.push({ r, c });
    }
  }
  shuffle(aiAvailableShots);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function resetStats() {
  playerShots = 0;
  aiShots = 0;
  playerShotsEl.textContent = "0";
  aiShotsEl.textContent = "0";
  playerShipsLeftEl.textContent = playerShips.length.toString();
  aiShipsLeftEl.textContent = aiShips.length.toString();
}

function updateShipsLeft(shipsArray, targetEl) {
  const shipsLeft = shipsArray.filter((ship) => !ship.sunk).length;
  targetEl.textContent = shipsLeft.toString();
}

function renderFleetPanel(container, ships, showAliveSegments) {
  if (!container) return;
  container.innerHTML = "";
  ships.forEach((ship) => {
    const row = document.createElement("div");
    row.className = "fleet-ship";

    const nameEl = document.createElement("span");
    nameEl.className = "fleet-ship-name";
    nameEl.textContent = ship.name || `Ship (${ship.size})`;

    const cellsEl = document.createElement("div");
    cellsEl.className = "fleet-ship-cells";
    for (let i = 0; i < ship.size; i++) {
      const cellEl = document.createElement("div");
      cellEl.className = "fleet-cell";
      if (i < ship.hits) {
        cellEl.classList.add("hit");
      } else if (showAliveSegments) {
        cellEl.classList.add("alive");
      }
      cellsEl.appendChild(cellEl);
    }

    row.appendChild(nameEl);
    row.appendChild(cellsEl);
    container.appendChild(row);
  });
}

function startGame() {
  if (!placementDone) {
    alert("Finish placing all your ships before starting.");
    return;
  }
  if (gameOver) {
    initGame();
    return;
  }

  const aiCells = aiBoardEl.querySelectorAll(".cell");
  aiCells.forEach((cell) => cell.classList.remove("disabled"));

  gameOver = false;
  playerTurn = true;
  statusEl.textContent = "Your turn: fire on Enemy Waters.";
}

function initGame() {
  gameOver = false;
  playerTurn = true;
  placingIndex = 0;
  horizontal = true;
  placementDone = false;

  playerShips = [];
  aiShips = [];

  orientationBtn.textContent = "Orientation: Horizontal";
  orientationBtn.disabled = false;
  startBtn.textContent = "Start Game";

  playerBoard = createEmptyBoard();
  aiBoard = createEmptyBoard();

  buildBoards();
  placeShipsRandomly(aiBoard, aiShips);

  resetAIShots();
  resetStats();
  renderFleetPanel(playerFleetEl, playerShips, true);
  renderFleetPanel(aiFleetEl, aiShips, true);
  statusEl.textContent =
    "Place your ships by clicking your board. Next size: " +
    SHIP_SIZES[placingIndex];
}

function onPlayerPlaceShip(e) {
  if (placementDone) return;

  const cell = e.currentTarget;
  const r = Number(cell.dataset.row);
  const c = Number(cell.dataset.col);
  const size = SHIP_SIZES[placingIndex];

  if (!canPlaceShip(playerBoard, r, c, size, horizontal)) {
    statusEl.textContent = "Cannot place ship there. Try another spot.";
    return;
  }

  const name = SHIP_NAMES[placingIndex] || `Ship (${size})`;
  placeShip(playerBoard, r, c, size, horizontal, playerShips, name);
  redrawPlayerShips();
  clearPlacementPreview();

  placingIndex++;
  if (placingIndex >= SHIP_SIZES.length) {
    placementDone = true;
    statusEl.textContent =
      "All ships placed. Click Start Game to begin.";
    orientationBtn.disabled = true;
    renderFleetPanel(playerFleetEl, playerShips, true);
  } else {
    statusEl.textContent =
      "Place next ship of size " + SHIP_SIZES[placingIndex];
  }
}

function canPlaceShip(board, row, col, size, horizontal) {
  if (horizontal) {
    if (col + size > BOARD_SIZE) return false;
    for (let c = col; c < col + size; c++) {
      if (board[row][c].hasShip) return false;
    }
  } else {
    if (row + size > BOARD_SIZE) return false;
    for (let r = row; r < row + size; r++) {
      if (board[r][col].hasShip) return false;
    }
  }
  return true;
}

function placeShip(board, row, col, size, horizontal, shipsArray, name) {
  const shipId = shipsArray.length;
  const cells = [];
  const shipName = name || `Ship (${size})`;
  if (horizontal) {
    for (let c = col; c < col + size; c++) {
      board[row][c].hasShip = true;
      board[row][c].shipId = shipId;
      cells.push({ r: row, c });
    }
  } else {
    for (let r = row; r < row + size; r++) {
      board[r][col].hasShip = true;
      board[r][col].shipId = shipId;
      cells.push({ r, c: col });
    }
  }
  shipsArray.push({ id: shipId, size, name: shipName, hits: 0, sunk: false, cells });

  if (board === playerBoard && playerBoardWrapper) {
    createPlayerShipImage(shipId, row, col, size, horizontal, shipName);
  }
}

const CELL_SIZE = 26; // must match .cell width/height in CSS
const BOARD_PADDING = 8; // must match .board padding in CSS

function createPlayerShipImage(shipId, row, col, size, horizontal, shipName) {
  const img = document.createElement("div");
  img.className = "ship-image";
  img.dataset.shipId = shipId.toString();

  const basePath = SHIP_IMAGES[shipName];
  if (basePath) {
    const suffix = horizontal ? "_h" : "_v";
    const imageUrl = `${basePath}${suffix}.png`;
    img.style.backgroundImage = `url(${imageUrl})`;
  }

  const length = size * CELL_SIZE;
  if (horizontal) {
    img.style.width = `${length}px`;
    img.style.height = `${CELL_SIZE}px`;
    img.style.left = `${BOARD_PADDING + col * CELL_SIZE}px`;
    img.style.top = `${BOARD_PADDING + row * CELL_SIZE}px`;
  } else {
    img.style.width = `${CELL_SIZE}px`;
    img.style.height = `${length}px`;
    img.style.left = `${BOARD_PADDING + col * CELL_SIZE}px`;
    img.style.top = `${BOARD_PADDING + row * CELL_SIZE}px`;
  }

  playerBoardWrapper.appendChild(img);
}

function redrawPlayerShips() {
  const cells = playerBoardEl.querySelectorAll(".cell");
  cells.forEach((cell) => {
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    const tile = playerBoard[r][c];
    cell.classList.remove("ship", "hit", "miss");
    cell.classList.add("water");
    if (tile.hasShip) {
      cell.classList.remove("water");
      cell.classList.add("ship");
    }
    if (tile.hit) {
      cell.classList.remove("ship", "water");
      cell.classList.add("hit");
    }
  });
}

function onPlayerFire(e) {
  if (gameOver || !playerTurn || !placementDone) return;
  const cell = e.currentTarget;
  if (cell.classList.contains("disabled")) return;

  const r = Number(cell.dataset.row);
  const c = Number(cell.dataset.col);
  const tile = aiBoard[r][c];

  if (tile.hit) return;

  tile.hit = true;
  cell.classList.add("disabled");

  playerShots++;
  playerShotsEl.textContent = playerShots.toString();

  let sunkThisShot = false;

  if (tile.hasShip) {
    const ship = aiShips[tile.shipId];
    if (ship && !ship.sunk) {
      ship.hits++;
      if (ship.hits >= ship.size) {
        ship.sunk = true;
        statusEl.textContent = `You sunk the enemy ${ship.name}!`;
        sunkThisShot = true;
      }
    }
    cell.classList.remove("water");
    cell.classList.add("hit");
    playHitSound();
  } else {
    cell.classList.add("miss");
    playMissSound();
  }

  updateShipsLeft(aiShips, aiShipsLeftEl);
  renderFleetPanel(aiFleetEl, aiShips, true);

  if (checkAllShipsSunk(aiShips)) {
    gameOver = true;
    statusEl.textContent = "You win! All enemy ships have been sunk.";
    startBtn.textContent = "Restart";
    return;
  }

  playerTurn = false;
  if (!sunkThisShot) {
    statusEl.textContent = "Enemy is firing...";
  }
  setTimeout(aiFire, 500);
}

function aiFire() {
  if (gameOver) return;

  // Use iterative approach instead of recursion to find a valid shot
  // This avoids potential stack overflow if data model changes in the future
  let r, c, tile;
  while (true) {
    if (aiAvailableShots.length === 0) {
      gameOver = true;
      statusEl.textContent = "Draw! No more positions to fire.";
      startBtn.textContent = "Restart";
      return;
    }

    const shot = aiAvailableShots.pop();
    r = shot.r;
    c = shot.c;
    tile = playerBoard[r][c];

    if (!tile.hit) {
      break; // Found a valid shot, exit the loop
    }
    // Otherwise, continue to the next shot
  }

  tile.hit = true;

  aiShots++;
  aiShotsEl.textContent = aiShots.toString();

  const cellIndex = r * BOARD_SIZE + c;
  const playerCell = playerBoardEl.children[cellIndex];

  let sunkThisShot = false;

  if (tile.hasShip) {
    const ship = playerShips[tile.shipId];
    if (ship && !ship.sunk) {
      ship.hits++;
      if (ship.hits >= ship.size) {
        ship.sunk = true;
        statusEl.textContent = `The enemy sunk your ${ship.name}!`;
        sunkThisShot = true;
      }
    }
    playerCell.classList.remove("water", "ship");
    playerCell.classList.add("hit");
    playHitSound();
  } else {
    playerCell.classList.remove("water");
    playerCell.classList.add("miss");
    playMissSound();
  }

  updateShipsLeft(playerShips, playerShipsLeftEl);
  renderFleetPanel(playerFleetEl, playerShips, true);

  if (checkAllShipsSunk(playerShips)) {
    gameOver = true;
    statusEl.textContent = "You lose! All your ships have been sunk.";
    startBtn.textContent = "Restart";
    return;
  }

  playerTurn = true;
  if (!sunkThisShot) {
    statusEl.textContent = "Your turn: fire on Enemy Waters.";
  }
}

function checkAllShipsSunk(shipsArray) {
  return shipsArray.every((ship) => ship.sunk);
}

orientationBtn.addEventListener("click", () => {
  horizontal = !horizontal;
  orientationBtn.textContent = horizontal
    ? "Orientation: Horizontal"
    : "Orientation: Vertical";
});

startBtn.addEventListener("click", startGame);

if (toggleFleetBtn) {
  toggleFleetBtn.addEventListener("click", () => {
    fleetsVisible = !fleetsVisible;
    updateFleetVisibility();
  });
}

const soundBtn = document.getElementById("sound-btn");
if (soundBtn) {
  soundBtn.addEventListener("click", toggleSound);
}

initGame();
updateFleetVisibility();
