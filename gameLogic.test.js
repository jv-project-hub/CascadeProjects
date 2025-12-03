const {
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
} = require('./gameLogic');

describe('createEmptyBoard', () => {
  test('creates a 10x10 board', () => {
    const board = createEmptyBoard();
    expect(board.length).toBe(BOARD_SIZE);
    expect(board[0].length).toBe(BOARD_SIZE);
  });

  test('all cells are initialized with correct default values', () => {
    const board = createEmptyBoard();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        expect(board[r][c]).toEqual({ hasShip: false, hit: false, shipId: null });
      }
    }
  });

  test('each cell is an independent object', () => {
    const board = createEmptyBoard();
    board[0][0].hasShip = true;
    expect(board[0][1].hasShip).toBe(false);
    expect(board[1][0].hasShip).toBe(false);
  });
});

describe('canPlaceShip', () => {
  let board;

  beforeEach(() => {
    board = createEmptyBoard();
  });

  describe('horizontal placement', () => {
    test('allows valid horizontal placement', () => {
      expect(canPlaceShip(board, 0, 0, 5, true)).toBe(true);
      expect(canPlaceShip(board, 5, 3, 3, true)).toBe(true);
    });

    test('rejects placement that exceeds board boundary', () => {
      expect(canPlaceShip(board, 0, 6, 5, true)).toBe(false);
      expect(canPlaceShip(board, 0, 8, 3, true)).toBe(false);
      expect(canPlaceShip(board, 0, 9, 2, true)).toBe(false);
    });

    test('allows placement at the edge of the board', () => {
      expect(canPlaceShip(board, 0, 5, 5, true)).toBe(true);
      expect(canPlaceShip(board, 9, 8, 2, true)).toBe(true);
    });

    test('rejects placement that collides with existing ship', () => {
      const ships = [];
      placeShip(board, 0, 0, 3, true, ships, 'TestShip');
      expect(canPlaceShip(board, 0, 0, 2, true)).toBe(false);
      expect(canPlaceShip(board, 0, 2, 2, true)).toBe(false);
    });
  });

  describe('vertical placement', () => {
    test('allows valid vertical placement', () => {
      expect(canPlaceShip(board, 0, 0, 5, false)).toBe(true);
      expect(canPlaceShip(board, 3, 5, 3, false)).toBe(true);
    });

    test('rejects placement that exceeds board boundary', () => {
      expect(canPlaceShip(board, 6, 0, 5, false)).toBe(false);
      expect(canPlaceShip(board, 8, 0, 3, false)).toBe(false);
      expect(canPlaceShip(board, 9, 0, 2, false)).toBe(false);
    });

    test('allows placement at the edge of the board', () => {
      expect(canPlaceShip(board, 5, 0, 5, false)).toBe(true);
      expect(canPlaceShip(board, 8, 9, 2, false)).toBe(true);
    });

    test('rejects placement that collides with existing ship', () => {
      const ships = [];
      placeShip(board, 0, 0, 3, false, ships, 'TestShip');
      expect(canPlaceShip(board, 0, 0, 2, false)).toBe(false);
      expect(canPlaceShip(board, 2, 0, 2, false)).toBe(false);
    });
  });

  describe('cross-orientation collision', () => {
    test('rejects horizontal placement that crosses vertical ship', () => {
      const ships = [];
      placeShip(board, 0, 5, 5, false, ships, 'VerticalShip');
      expect(canPlaceShip(board, 2, 3, 5, true)).toBe(false);
    });

    test('rejects vertical placement that crosses horizontal ship', () => {
      const ships = [];
      placeShip(board, 5, 0, 5, true, ships, 'HorizontalShip');
      expect(canPlaceShip(board, 3, 2, 5, false)).toBe(false);
    });
  });
});

describe('placeShip', () => {
  let board;
  let ships;

  beforeEach(() => {
    board = createEmptyBoard();
    ships = [];
  });

  describe('horizontal placement', () => {
    test('places ship correctly on the board', () => {
      placeShip(board, 0, 0, 3, true, ships, 'Cruiser');
      
      expect(board[0][0].hasShip).toBe(true);
      expect(board[0][1].hasShip).toBe(true);
      expect(board[0][2].hasShip).toBe(true);
      expect(board[0][3].hasShip).toBe(false);
    });

    test('sets correct shipId on board cells', () => {
      placeShip(board, 0, 0, 3, true, ships, 'Cruiser');
      
      expect(board[0][0].shipId).toBe(0);
      expect(board[0][1].shipId).toBe(0);
      expect(board[0][2].shipId).toBe(0);
    });

    test('creates ship object with correct properties', () => {
      const ship = placeShip(board, 2, 3, 4, true, ships, 'Battleship');
      
      expect(ship.id).toBe(0);
      expect(ship.size).toBe(4);
      expect(ship.name).toBe('Battleship');
      expect(ship.hits).toBe(0);
      expect(ship.sunk).toBe(false);
      expect(ship.cells).toEqual([
        { r: 2, c: 3 },
        { r: 2, c: 4 },
        { r: 2, c: 5 },
        { r: 2, c: 6 }
      ]);
    });
  });

  describe('vertical placement', () => {
    test('places ship correctly on the board', () => {
      placeShip(board, 0, 0, 3, false, ships, 'Cruiser');
      
      expect(board[0][0].hasShip).toBe(true);
      expect(board[1][0].hasShip).toBe(true);
      expect(board[2][0].hasShip).toBe(true);
      expect(board[3][0].hasShip).toBe(false);
    });

    test('creates ship object with correct cells for vertical placement', () => {
      const ship = placeShip(board, 1, 5, 4, false, ships, 'Battleship');
      
      expect(ship.cells).toEqual([
        { r: 1, c: 5 },
        { r: 2, c: 5 },
        { r: 3, c: 5 },
        { r: 4, c: 5 }
      ]);
    });
  });

  describe('multiple ships', () => {
    test('assigns incrementing ship IDs', () => {
      placeShip(board, 0, 0, 2, true, ships, 'Destroyer');
      placeShip(board, 2, 0, 3, true, ships, 'Cruiser');
      placeShip(board, 4, 0, 4, true, ships, 'Battleship');
      
      expect(ships[0].id).toBe(0);
      expect(ships[1].id).toBe(1);
      expect(ships[2].id).toBe(2);
    });

    test('correctly tracks multiple ships in array', () => {
      placeShip(board, 0, 0, 2, true, ships, 'Destroyer');
      placeShip(board, 2, 0, 3, true, ships, 'Cruiser');
      
      expect(ships.length).toBe(2);
      expect(ships[0].name).toBe('Destroyer');
      expect(ships[1].name).toBe('Cruiser');
    });
  });

  test('uses default name when name is not provided', () => {
    const ship = placeShip(board, 0, 0, 3, true, ships, null);
    expect(ship.name).toBe('Ship (3)');
  });
});

describe('processHit', () => {
  let board;
  let ships;

  beforeEach(() => {
    board = createEmptyBoard();
    ships = [];
  });

  describe('hitting water', () => {
    test('marks cell as hit when firing at water', () => {
      const result = processHit(board, 0, 0, ships);
      
      expect(board[0][0].hit).toBe(true);
      expect(result.hit).toBe(false);
      expect(result.sunk).toBe(false);
      expect(result.ship).toBeNull();
      expect(result.alreadyHit).toBe(false);
    });
  });

  describe('hitting a ship', () => {
    beforeEach(() => {
      placeShip(board, 0, 0, 3, true, ships, 'Cruiser');
    });

    test('registers hit on ship', () => {
      const result = processHit(board, 0, 0, ships);
      
      expect(board[0][0].hit).toBe(true);
      expect(result.hit).toBe(true);
      expect(result.sunk).toBe(false);
      expect(result.ship.name).toBe('Cruiser');
      expect(ships[0].hits).toBe(1);
    });

    test('increments hit count on subsequent hits', () => {
      processHit(board, 0, 0, ships);
      processHit(board, 0, 1, ships);
      
      expect(ships[0].hits).toBe(2);
    });

    test('sinks ship when all cells are hit', () => {
      processHit(board, 0, 0, ships);
      processHit(board, 0, 1, ships);
      const result = processHit(board, 0, 2, ships);
      
      expect(result.sunk).toBe(true);
      expect(ships[0].sunk).toBe(true);
      expect(ships[0].hits).toBe(3);
    });
  });

  describe('firing at already hit cell', () => {
    test('returns alreadyHit flag for previously hit water', () => {
      processHit(board, 0, 0, ships);
      const result = processHit(board, 0, 0, ships);
      
      expect(result.alreadyHit).toBe(true);
      expect(result.hit).toBe(false);
    });

    test('returns alreadyHit flag for previously hit ship', () => {
      placeShip(board, 0, 0, 3, true, ships, 'Cruiser');
      processHit(board, 0, 0, ships);
      const result = processHit(board, 0, 0, ships);
      
      expect(result.alreadyHit).toBe(true);
      expect(ships[0].hits).toBe(1);
    });
  });

  describe('multiple ships', () => {
    beforeEach(() => {
      placeShip(board, 0, 0, 2, true, ships, 'Destroyer');
      placeShip(board, 2, 0, 3, true, ships, 'Cruiser');
    });

    test('correctly identifies which ship was hit', () => {
      const result1 = processHit(board, 0, 0, ships);
      const result2 = processHit(board, 2, 1, ships);
      
      expect(result1.ship.name).toBe('Destroyer');
      expect(result2.ship.name).toBe('Cruiser');
    });

    test('sinking one ship does not affect others', () => {
      processHit(board, 0, 0, ships);
      processHit(board, 0, 1, ships);
      
      expect(ships[0].sunk).toBe(true);
      expect(ships[1].sunk).toBe(false);
    });
  });
});

describe('checkAllShipsSunk', () => {
  test('returns false when no ships are sunk', () => {
    const ships = [
      { id: 0, size: 2, name: 'Destroyer', hits: 0, sunk: false, cells: [] },
      { id: 1, size: 3, name: 'Cruiser', hits: 0, sunk: false, cells: [] }
    ];
    
    expect(checkAllShipsSunk(ships)).toBe(false);
  });

  test('returns false when some ships are sunk', () => {
    const ships = [
      { id: 0, size: 2, name: 'Destroyer', hits: 2, sunk: true, cells: [] },
      { id: 1, size: 3, name: 'Cruiser', hits: 1, sunk: false, cells: [] }
    ];
    
    expect(checkAllShipsSunk(ships)).toBe(false);
  });

  test('returns true when all ships are sunk', () => {
    const ships = [
      { id: 0, size: 2, name: 'Destroyer', hits: 2, sunk: true, cells: [] },
      { id: 1, size: 3, name: 'Cruiser', hits: 3, sunk: true, cells: [] }
    ];
    
    expect(checkAllShipsSunk(ships)).toBe(true);
  });

  test('returns true for empty ships array', () => {
    expect(checkAllShipsSunk([])).toBe(true);
  });

  test('returns true for single sunk ship', () => {
    const ships = [
      { id: 0, size: 5, name: 'Carrier', hits: 5, sunk: true, cells: [] }
    ];
    
    expect(checkAllShipsSunk(ships)).toBe(true);
  });

  test('returns false for single unsunk ship', () => {
    const ships = [
      { id: 0, size: 5, name: 'Carrier', hits: 4, sunk: false, cells: [] }
    ];
    
    expect(checkAllShipsSunk(ships)).toBe(false);
  });
});

describe('getAdjacentCells', () => {
  test('returns 4 adjacent cells for center position', () => {
    const adjacent = getAdjacentCells(5, 5);
    
    expect(adjacent).toHaveLength(4);
    expect(adjacent).toContainEqual({ r: 4, c: 5 });
    expect(adjacent).toContainEqual({ r: 6, c: 5 });
    expect(adjacent).toContainEqual({ r: 5, c: 4 });
    expect(adjacent).toContainEqual({ r: 5, c: 6 });
  });

  test('returns 2 adjacent cells for corner position (0,0)', () => {
    const adjacent = getAdjacentCells(0, 0);
    
    expect(adjacent).toHaveLength(2);
    expect(adjacent).toContainEqual({ r: 1, c: 0 });
    expect(adjacent).toContainEqual({ r: 0, c: 1 });
  });

  test('returns 2 adjacent cells for corner position (9,9)', () => {
    const adjacent = getAdjacentCells(9, 9);
    
    expect(adjacent).toHaveLength(2);
    expect(adjacent).toContainEqual({ r: 8, c: 9 });
    expect(adjacent).toContainEqual({ r: 9, c: 8 });
  });

  test('returns 3 adjacent cells for edge position', () => {
    const adjacent = getAdjacentCells(0, 5);
    
    expect(adjacent).toHaveLength(3);
    expect(adjacent).toContainEqual({ r: 1, c: 5 });
    expect(adjacent).toContainEqual({ r: 0, c: 4 });
    expect(adjacent).toContainEqual({ r: 0, c: 6 });
  });

  test('does not include diagonal cells', () => {
    const adjacent = getAdjacentCells(5, 5);
    
    expect(adjacent).not.toContainEqual({ r: 4, c: 4 });
    expect(adjacent).not.toContainEqual({ r: 4, c: 6 });
    expect(adjacent).not.toContainEqual({ r: 6, c: 4 });
    expect(adjacent).not.toContainEqual({ r: 6, c: 6 });
  });
});

describe('placeShipsRandomly', () => {
  test('places all 5 ships on the board', () => {
    const board = createEmptyBoard();
    const ships = [];
    
    placeShipsRandomly(board, ships);
    
    expect(ships).toHaveLength(5);
  });

  test('places ships with correct sizes', () => {
    const board = createEmptyBoard();
    const ships = [];
    
    placeShipsRandomly(board, ships);
    
    const sizes = ships.map(s => s.size).sort((a, b) => b - a);
    expect(sizes).toEqual([5, 4, 3, 3, 2]);
  });

  test('places ships with correct names', () => {
    const board = createEmptyBoard();
    const ships = [];
    
    placeShipsRandomly(board, ships);
    
    const names = ships.map(s => s.name);
    expect(names).toContain('Carrier');
    expect(names).toContain('Battleship');
    expect(names).toContain('Cruiser');
    expect(names).toContain('Submarine');
    expect(names).toContain('Destroyer');
  });

  test('ships do not overlap', () => {
    const board = createEmptyBoard();
    const ships = [];
    
    placeShipsRandomly(board, ships);
    
    let totalCells = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c].hasShip) {
          totalCells++;
        }
      }
    }
    
    const expectedCells = SHIP_SIZES.reduce((sum, size) => sum + size, 0);
    expect(totalCells).toBe(expectedCells);
  });

  test('all ships are initialized with 0 hits and not sunk', () => {
    const board = createEmptyBoard();
    const ships = [];
    
    placeShipsRandomly(board, ships);
    
    ships.forEach(ship => {
      expect(ship.hits).toBe(0);
      expect(ship.sunk).toBe(false);
    });
  });

  test('each ship has correct number of cells', () => {
    const board = createEmptyBoard();
    const ships = [];
    
    placeShipsRandomly(board, ships);
    
    ships.forEach(ship => {
      expect(ship.cells).toHaveLength(ship.size);
    });
  });
});

describe('Integration: Full game scenario', () => {
  test('simulates a complete game where all ships are sunk', () => {
    const board = createEmptyBoard();
    const ships = [];
    
    placeShip(board, 0, 0, 2, true, ships, 'Destroyer');
    placeShip(board, 2, 0, 3, true, ships, 'Cruiser');
    
    expect(checkAllShipsSunk(ships)).toBe(false);
    
    processHit(board, 0, 0, ships);
    processHit(board, 0, 1, ships);
    expect(ships[0].sunk).toBe(true);
    expect(checkAllShipsSunk(ships)).toBe(false);
    
    processHit(board, 2, 0, ships);
    processHit(board, 2, 1, ships);
    processHit(board, 2, 2, ships);
    expect(ships[1].sunk).toBe(true);
    expect(checkAllShipsSunk(ships)).toBe(true);
  });

  test('simulates mixed hits and misses', () => {
    const board = createEmptyBoard();
    const ships = [];
    
    placeShip(board, 5, 5, 3, true, ships, 'Cruiser');
    
    const miss1 = processHit(board, 0, 0, ships);
    expect(miss1.hit).toBe(false);
    
    const hit1 = processHit(board, 5, 5, ships);
    expect(hit1.hit).toBe(true);
    expect(hit1.sunk).toBe(false);
    
    const miss2 = processHit(board, 5, 4, ships);
    expect(miss2.hit).toBe(false);
    
    processHit(board, 5, 6, ships);
    const finalHit = processHit(board, 5, 7, ships);
    expect(finalHit.sunk).toBe(true);
  });
});

describe('Constants', () => {
  test('BOARD_SIZE is 10', () => {
    expect(BOARD_SIZE).toBe(10);
  });

  test('SHIP_SIZES contains correct values', () => {
    expect(SHIP_SIZES).toEqual([5, 4, 3, 3, 2]);
  });

  test('SHIP_NAMES contains correct values', () => {
    expect(SHIP_NAMES).toEqual(['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer']);
  });

  test('SHIP_SIZES and SHIP_NAMES have same length', () => {
    expect(SHIP_SIZES.length).toBe(SHIP_NAMES.length);
  });
});
