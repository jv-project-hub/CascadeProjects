const BOARD_SIZE = 10;
const SHIP_SIZES = [5, 4, 3, 3, 2];
const SHIP_NAMES = ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"];

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ hasShip: false, hit: false, shipId: null }))
  );
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
  return shipsArray[shipId];
}

function checkAllShipsSunk(shipsArray) {
  return shipsArray.every((ship) => ship.sunk);
}

function processHit(board, row, col, shipsArray) {
  const tile = board[row][col];
  
  if (tile.hit) {
    return { alreadyHit: true, hit: false, sunk: false, ship: null };
  }
  
  tile.hit = true;
  
  if (tile.hasShip) {
    const ship = shipsArray[tile.shipId];
    if (ship && !ship.sunk) {
      ship.hits++;
      if (ship.hits >= ship.size) {
        ship.sunk = true;
        return { alreadyHit: false, hit: true, sunk: true, ship };
      }
      return { alreadyHit: false, hit: true, sunk: false, ship };
    }
    return { alreadyHit: false, hit: true, sunk: false, ship };
  }
  
  return { alreadyHit: false, hit: false, sunk: false, ship: null };
}

function getAdjacentCells(r, c, boardSize = BOARD_SIZE) {
  const adjacent = [];
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];
  for (const { dr, dc } of directions) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
      adjacent.push({ r: nr, c: nc });
    }
  }
  return adjacent;
}

function placeShipsRandomly(board, shipsArray) {
  for (let i = 0; i < SHIP_SIZES.length; i++) {
    const size = SHIP_SIZES[i];
    const name = SHIP_NAMES[i] || `Ship (${size})`;
    let placed = false;
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (!placed && attempts < maxAttempts) {
      attempts++;
      const horizontal = Math.random() < 0.5;
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);

      if (canPlaceShip(board, row, col, size, horizontal)) {
        placeShip(board, row, col, size, horizontal, shipsArray, name);
        placed = true;
      }
    }
    
    if (!placed) {
      throw new Error(`Could not place ship ${name} after ${maxAttempts} attempts`);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BOARD_SIZE,
    SHIP_SIZES,
    SHIP_NAMES,
    createEmptyBoard,
    canPlaceShip,
    placeShip,
    checkAllShipsSunk,
    processHit,
    getAdjacentCells,
    placeShipsRandomly
  };
}
