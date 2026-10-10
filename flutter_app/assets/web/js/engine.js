/**
 * Retro Classic Tetris - Core Game Engine
 * Features:
 * - 10x20 Matrix + 2 Hidden Rows
 * - 7 Tetrominoes (I, J, L, O, S, T, Z) with SRS (Super Rotation System) Wall Kicks
 * - 7-Bag Randomizer RNG
 * - Accurate Gravity Curve, Lock Delay & Ghost Piece
 * - Line Clear Detection, Combos, Back-to-Back Tetris, Scoring
 * - Save/Resume Game State serialization
 */

const COLS = 10;
const ROWS = 20;
const BUFFER_ROWS = 2;
const TOTAL_ROWS = ROWS + BUFFER_ROWS;

// Standard Tetromino & Extended Polyomino / Pentomino shapes
// 4 rotation states (0 = 0 deg, 1 = 90 deg CW, 2 = 180 deg, 3 = 270 deg CW)
const SHAPES = {
  // Classic 7
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]]
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]]
  ],
  O: [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]]
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]]
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]]
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]]
  ],

  // Extended Shapes:
  // 1. U-Shape (Pentomino U)
  U: [
    [[1,0,1],[1,1,1],[0,0,0]],
    [[1,1,0],[1,0,0],[1,1,0]],
    [[0,0,0],[1,1,1],[1,0,1]],
    [[0,1,1],[0,0,1],[0,1,1]]
  ],
  // 2. Plus / Cross (+) (Pentomino X)
  X: [
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1],[0,1,0]]
  ],
  // 3. Small Corner / V-Shape (Tromino V)
  C: [
    [[1,0],[1,1]],
    [[1,1],[1,0]],
    [[1,1],[0,1]],
    [[0,1],[1,1]]
  ],
  // 4. Big-T (Pentomino T)
  T5: [
    [[1,1,1],[0,1,0],[0,1,0]],
    [[0,0,1],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,1]],
    [[1,0,0],[1,1,1],[1,0,0]]
  ],
  // 5. W-Shape (Pentomino W)
  W: [
    [[1,0,0],[1,1,0],[0,1,1]],
    [[0,1,1],[1,1,0],[1,0,0]],
    [[1,1,0],[0,1,1],[0,0,1]],
    [[0,0,1],[0,1,1],[1,1,0]]
  ],
  // 6. Long-5 (Pentomino I5)
  I5: [
    [[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],
    [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
    [[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],
    [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]]
  ],
  // 7. Dot (Single 1x1 block)
  D1: [
    [[1]],
    [[1]],
    [[1]],
    [[1]]
  ]
};

// Standard SRS Wall Kick Offsets
const WALL_KICKS_JLSTZ = {
  '0->1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
  '1->0': [[0,0], [1,0],  [1,-1], [0,2],  [1,2]],
  '1->2': [[0,0], [1,0],  [1,-1], [0,2],  [1,2]],
  '2->1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
  '2->3': [[0,0], [1,0],  [1,1],  [0,-2], [1,-2]],
  '3->2': [[0,0], [-1,0], [-1,-1],[0,2],  [-1,2]],
  '3->0': [[0,0], [-1,0], [-1,-1],[0,2],  [-1,2]],
  '0->3': [[0,0], [1,0],  [1,1],  [0,-2], [1,-2]]
};

const WALL_KICKS_I = {
  '0->1': [[0,0], [-2,0], [1,0],  [-2,-1], [1,2]],
  '1->0': [[0,0], [2,0],  [-1,0], [2,1],   [-1,-2]],
  '1->2': [[0,0], [-1,0], [2,0],  [-1,2],  [2,-1]],
  '2->1': [[0,0], [1,0],  [-2,0], [1,-2],  [-2,1]],
  '2->3': [[0,0], [2,0],  [-1,0], [2,1],   [-1,-2]],
  '3->2': [[0,0], [-2,0], [1,0],  [-2,-1], [1,2]],
  '3->0': [[0,0], [1,0],  [-2,0], [1,-2],  [-2,1]],
  '0->3': [[0,0], [-1,0], [2,0],  [-1,2],  [2,-1]]
};

class TetrisEngine {
  constructor(storage, audio) {
    this.storage = storage || new RetroStorage();
    this.audio = audio || new RetroAudio();

    this.board = this.createEmptyBoard();
    this.currentPiece = null;
    this.holdPiece = null;
    this.canHold = true;
    this.nextQueue = [];
    this.bag = [];

    this.score = 0;
    this.level = 1;
    this.startingLevel = 1;
    this.gameMode = 'marathon'; // 'marathon' | 'sprint40' | 'blitz2min' | 'zen' | 'daily'
    this.rngState = null;       // seeded RNG state for the daily challenge (null = Math.random)
    this.dailyKey = null;
    this.isGameWon = false;
    this.lines = 0;
    this.combos = -1;
    this.b2b = false; // Back to Back Tetris
    this.elapsedSeconds = 0;

    // Session stats for persistence & achievements
    this.sessionStats = {
      singleClears: 0,
      doubleClears: 0,
      tripleClears: 0,
      tetrisClears: 0,
      maxCombo: 0,
      timeSpent: 0
    };

    // State flags
    this.isPaused = false;
    this.isGameOver = false;
    this.isClearingLines = false;
    this.clearingRowIndices = [];

    // Gravity / Timing Loop
    this.lastDropTime = 0;
    this.lockDelayMs = 500;
    this.lockTimer = null;
    this.lockResets = 0;
    this.maxLockResets = 15;

    // Callbacks
    this.onStateChange = () => {};
    this.onLineClearAnimation = () => {};
    this.onGameOverCallback = () => {};
    this.onGameWinCallback = () => {};
    this.onScoreCallback = () => {};
    this.onHardDropImpact = () => {};
  }

  createEmptyBoard() {
    const grid = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      grid.push(new Array(COLS).fill(0));
    }
    return grid;
  }

  // --- 7-Bag Randomizer ---

  getAvailablePieceTypes() {
    // Daily challenge always uses the classic 7 so everyone gets the same sequence
    if (this.gameMode === 'daily') return ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    const settings = this.storage.getSettings();
    const mode = this.pieceOverride || settings.pieceMode || 'classic';
    if (mode === 'classic') {
      return ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    } else if (mode === 'pentomino') {
      return ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'U', 'X', 'C', 'T5', 'W', 'I5', 'D1'];
    } else {
      // 'extended' (Standard 7 + U-shape, Plus +, Corner V, Big-T, W-shape)
      return ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'U', 'X', 'C', 'T5', 'W'];
    }
  }

  fillBag() {
    const pieces = this.getAvailablePieceTypes().slice();
    // Fisher-Yates Shuffle
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    return pieces;
  }

  // Seeded mulberry32 for the daily challenge; state is saved so resuming keeps the sequence
  random() {
    if (this.rngState === null) return Math.random();
    this.rngState = (this.rngState + 0x6D2B79F5) | 0;
    let t = this.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  static todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  static seedFromString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h | 0;
  }

  // Zen mode: instead of topping out, wipe the board and keep going
  handleTopOut() {
    if (this.gameMode === 'zen') {
      this.board = this.createEmptyBoard();
      this.audio.playLevelUp();
      return;
    }
    this.gameOver();
  }

  getNextPieceType() {
    if (this.bag.length === 0) {
      this.bag = this.fillBag();
    }
    return this.bag.pop();
  }

  refillQueue() {
    while (this.nextQueue.length < 5) {
      const piece = this.getNextPieceType();
      this.nextQueue.push(piece);
    }
  }

  // --- Game Lifecycle ---

  startNewGame(startingLevel = null, gameMode = null, pieceOverride = null) {
    // Per-game shape set (e.g. the Pentomino Wild card) without touching saved settings
    this.pieceOverride = pieceOverride;
    const settings = this.storage.getSettings();
    this.startingLevel = startingLevel || settings.startingLevel || 1;
    this.gameMode = gameMode || settings.gameMode || 'marathon';
    if (this.gameMode === 'daily') {
      this.startingLevel = 1;
      this.dailyKey = TetrisEngine.todayKey();
      this.rngState = TetrisEngine.seedFromString('lukey-daily-' + this.dailyKey);
    } else {
      this.dailyKey = null;
      this.rngState = null;
    }

    this.board = this.createEmptyBoard();
    this.score = 0;
    this.level = this.startingLevel;
    this.lines = 0;
    this.combos = -1;
    this.b2b = false;
    this.elapsedSeconds = 0;
    this.holdPiece = null;
    this.canHold = true;
    this.isGameOver = false;
    this.isGameWon = false;
    this.isPaused = false;
    this.isClearingLines = false;
    this.clearingRowIndices = [];
    this.cancelPendingTimers();

    this.sessionStats = {
      singleClears: 0,
      doubleClears: 0,
      tripleClears: 0,
      tetrisClears: 0,
      maxCombo: 0,
      timeSpent: 0
    };

    this.bag = this.fillBag();
    this.nextQueue = [];
    this.refillQueue();

    this.spawnPiece();
    this.audio.setTempoByLevel(this.level);
    this.audio.startBGM();

    this.save();
    this.onStateChange();
  }

  resumeSavedGame() {
    const saved = this.storage.loadGameState();
    if (!saved) {
      this.startNewGame();
      return false;
    }

    this.board = saved.board;
    this.currentPiece = saved.currentPiece;
    this.holdPiece = saved.holdPiece;
    this.canHold = saved.canHold !== undefined ? saved.canHold : true;
    this.nextQueue = saved.nextQueue || [];
    this.bag = saved.bag || [];
    this.score = saved.score || 0;
    this.level = saved.level || 1;
    this.lines = saved.lines || 0;
    this.combos = saved.combos ?? -1;
    this.gameMode = saved.gameMode || 'marathon';
    this.startingLevel = saved.startingLevel || 1;
    this.rngState = saved.rngState ?? null;
    this.dailyKey = saved.dailyKey || null;
    this.pieceOverride = saved.pieceOverride || null;
    this.b2b = saved.b2b || false;
    this.elapsedSeconds = saved.elapsedSeconds || 0;

    this.isGameOver = false;
    this.isGameWon = false;
    this.isPaused = false;
    this.isClearingLines = false;
    this.clearingRowIndices = [];
    this.cancelPendingTimers();

    this.refillQueue();
    if (!this.currentPiece) {
      this.spawnPiece();
    }

    this.audio.setTempoByLevel(this.level);
    this.audio.startBGM();

    this.onStateChange();
    return true;
  }

  save() {
    if (this.isGameOver) {
      this.storage.clearActiveGame();
    } else {
      this.storage.saveGameState({
        board: this.board,
        currentPiece: this.currentPiece,
        holdPiece: this.holdPiece,
        canHold: this.canHold,
        nextQueue: this.nextQueue,
        bag: this.bag,
        score: this.score,
        level: this.level,
        lines: this.lines,
        combos: this.combos,
        b2b: this.b2b,
        elapsedSeconds: this.elapsedSeconds,
        gameMode: this.gameMode,
        startingLevel: this.startingLevel,
        rngState: this.rngState,
        dailyKey: this.dailyKey,
        pieceOverride: this.pieceOverride
      });
    }
  }

  pause() {
    if (this.isGameOver) return;
    this.isPaused = true;
    this.clearLockTimer();
    this.audio.stopBGM();
    this.save();
    this.onStateChange();
  }

  resume() {
    if (this.isGameOver) return;
    this.isPaused = false;
    this.lastDropTime = performance.now();
    if (this.isOnGround()) this.startLockTimer();
    this.audio.startBGM();
    this.onStateChange();
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  // --- Spawning & Pieces ---

  spawnPiece() {
    this.refillQueue();
    const type = this.nextQueue.shift();
    this.refillQueue();

    // Spawn coordinate calculation (centered horizontally)
    const shape = SHAPES[type][0];
    const pieceWidth = shape[0].length;
    const spawnX = Math.floor((COLS - pieceWidth) / 2);
    const spawnY = BUFFER_ROWS - (type === 'I' ? 1 : 0); // Spawn around buffer rows

    this.currentPiece = {
      type,
      x: spawnX,
      y: spawnY,
      rotation: 0
    };

    this.canHold = true;
    this.lockResets = 0;
    this.clearLockTimer();

    // Record piece generation for memory & history stats
    this.storage.recordPieceGenerated(type);

    // Check immediate spawn collision -> Game Over (Zen clears the board instead)
    if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.rotation, this.currentPiece.type)) {
      this.handleTopOut();
    }
  }

  // --- Collision Detection ---

  checkCollision(posX, posY, rotation, type) {
    const shape = SHAPES[type][rotation];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const targetX = posX + c;
          const targetY = posY + r;

          // Wall boundary checks
          if (targetX < 0 || targetX >= COLS || targetY >= TOTAL_ROWS) {
            return true;
          }

          // Top boundary is fine (buffer rows)
          if (targetY >= 0 && this.board[targetY][targetX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // --- Movement & Rotation ---

  moveLeft() {
    if (this.isPaused || this.isGameOver || this.isClearingLines || !this.currentPiece) return false;
    if (!this.checkCollision(this.currentPiece.x - 1, this.currentPiece.y, this.currentPiece.rotation, this.currentPiece.type)) {
      this.currentPiece.x--;
      this.handlePieceMoved();
      this.audio.playMove();
      this.onStateChange();
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.isPaused || this.isGameOver || this.isClearingLines || !this.currentPiece) return false;
    if (!this.checkCollision(this.currentPiece.x + 1, this.currentPiece.y, this.currentPiece.rotation, this.currentPiece.type)) {
      this.currentPiece.x++;
      this.handlePieceMoved();
      this.audio.playMove();
      this.onStateChange();
      return true;
    }
    return false;
  }

  rotateCW() {
    return this.rotate(1);
  }

  rotateCCW() {
    return this.rotate(-1);
  }

  rotate(dir) {
    if (this.isPaused || this.isGameOver || this.isClearingLines || !this.currentPiece) return false;

    const fromRot = this.currentPiece.rotation;
    const toRot = (fromRot + dir + 4) % 4;
    const type = this.currentPiece.type;
    if (type === 'O' || type === 'D1') return true; // Dot and 2x2 don't need rotation

    const kickKey = `${fromRot}->${toRot}`;
    let kicks = (type === 'I' || type === 'I5') ? WALL_KICKS_I[kickKey] : WALL_KICKS_JLSTZ[kickKey];
    if (!kicks) {
      kicks = [[0,0], [-1,0], [1,0], [0,-1], [0,1]];
    }

    for (const [kx, ky] of kicks) {
      // Note: SRS y-kick is positive UP, our matrix y is positive DOWN
      const testX = this.currentPiece.x + kx;
      const testY = this.currentPiece.y - ky;

      if (!this.checkCollision(testX, testY, toRot, type)) {
        this.currentPiece.x = testX;
        this.currentPiece.y = testY;
        this.currentPiece.rotation = toRot;
        this.handlePieceMoved();
        this.audio.playRotate();
        this.onStateChange();
        return true;
      }
    }
    return false;
  }

  softDrop() {
    if (this.isPaused || this.isGameOver || this.isClearingLines || !this.currentPiece) return false;
    if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.rotation, this.currentPiece.type)) {
      this.currentPiece.y++;
      this.score += 1; // 1 point per soft drop cell
      this.audio.playSoftDrop();
      this.lastDropTime = performance.now();
      this.onStateChange();
      return true;
    } else {
      this.lockPiece();
      return false;
    }
  }

  hardDrop() {
    if (this.isPaused || this.isGameOver || this.isClearingLines || !this.currentPiece) return 0;
    let dropDistance = 0;
    while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.rotation, this.currentPiece.type)) {
      this.currentPiece.y++;
      dropDistance++;
    }
    this.score += dropDistance * 2; // 2 points per hard drop cell
    this.audio.playHardDrop();
    this.onHardDropImpact(dropDistance);
    this.lockPiece(true);
    this.onStateChange();
    return dropDistance;
  }

  hold() {
    if (this.isPaused || this.isGameOver || this.isClearingLines || !this.canHold || !this.currentPiece) return false;

    const currentType = this.currentPiece.type;
    this.audio.playHold();

    if (this.holdPiece === null) {
      this.holdPiece = currentType;
      this.spawnPiece();
    } else {
      const temp = this.holdPiece;
      this.holdPiece = currentType;
      
      const shape = SHAPES[temp][0];
      const spawnX = Math.floor((COLS - shape[0].length) / 2);
      const spawnY = BUFFER_ROWS - (temp === 'I' ? 1 : 0);

      this.currentPiece = {
        type: temp,
        x: spawnX,
        y: spawnY,
        rotation: 0
      };
      this.lockResets = 0;
      this.clearLockTimer();
      if (this.checkCollision(spawnX, spawnY, 0, temp)) {
        this.handleTopOut();
        if (this.isGameOver) return true;
      }
    }

    this.canHold = false;
    this.save();
    this.onStateChange();
    return true;
  }

  // --- Ghost Piece ---

  getGhostY() {
    if (!this.currentPiece) return 0;
    let ghostY = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, ghostY + 1, this.currentPiece.rotation, this.currentPiece.type)) {
      ghostY++;
    }
    return ghostY;
  }

  // --- Lock & Gravity Logic ---

  handlePieceMoved() {
    if (this.isOnGround()) {
      if (this.lockResets < this.maxLockResets) {
        this.lockResets++;
        this.clearLockTimer();
        this.startLockTimer();
      }
    } else {
      this.clearLockTimer();
    }
  }

  isOnGround() {
    if (!this.currentPiece) return false;
    return this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.rotation, this.currentPiece.type);
  }

  startLockTimer() {
    if (this.lockTimer) return;
    this.lockTimer = setTimeout(() => {
      this.lockTimer = null;
      if (this.isOnGround() && !this.isPaused && !this.isGameOver) {
        this.lockPiece();
      }
    }, this.lockDelayMs);
  }

  cancelPendingTimers() {
    this.clearLockTimer();
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }

  clearLockTimer() {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  }

  lockPiece(isImmediate = false) {
    if (!this.currentPiece || this.isClearingLines) return;
    this.clearLockTimer();

    const shape = SHAPES[this.currentPiece.type][this.currentPiece.rotation];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const targetX = this.currentPiece.x + c;
          const targetY = this.currentPiece.y + r;
          if (targetY >= 0 && targetY < TOTAL_ROWS && targetX >= 0 && targetX < COLS) {
            this.board[targetY][targetX] = this.currentPiece.type;
          }
        }
      }
    }

    this.currentPiece = null;
    this.checkLines();
  }

  // --- Line Clearing & Scoring ---

  checkLines() {
    const fullRows = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (this.board[r].every(cell => cell !== 0)) {
        fullRows.push(r);
      }
    }

    if (fullRows.length > 0) {
      this.isClearingLines = true;
      this.clearingRowIndices = fullRows;
      this.audio.playLineClear(fullRows.length);
      this.onLineClearAnimation(fullRows);

      this.clearTimer = setTimeout(() => {
        this.clearTimer = null;
        this.executeLineClear(fullRows);
        this.isClearingLines = false;
        this.clearingRowIndices = [];
        if (!this.isGameOver && !this.isGameWon) {
          this.spawnPiece();
          this.save();
          this.onStateChange();
        }
      }, 180);
    } else {
      this.combos = -1; // Reset combo if no line cleared
      this.spawnPiece();
      this.save();
      this.onStateChange();
    }
  }

  executeLineClear(fullRows) {
    const count = fullRows.length;
    this.lines += count;
    this.combos++;

    // Track session stats
    if (count === 1) this.sessionStats.singleClears++;
    else if (count === 2) this.sessionStats.doubleClears++;
    else if (count === 3) this.sessionStats.tripleClears++;
    else if (count === 4) this.sessionStats.tetrisClears++;
    this.sessionStats.maxCombo = Math.max(this.sessionStats.maxCombo, this.combos);

    // Calculate score
    const baseScores = { 1: 100, 2: 300, 3: 500, 4: 800 };
    let lineScore = (baseScores[count] || 0) * this.level;

    if (count === 4) {
      if (this.b2b) {
        lineScore = Math.floor(lineScore * 1.5); // 1200 * level for B2B Tetris
      }
      this.b2b = true;
    } else {
      this.b2b = false;
    }

    if (this.combos > 0) {
      lineScore += 50 * this.combos * this.level;
    }

    this.score += lineScore;
    this.onScoreCallback(lineScore, count, this.combos);

    // Remove rows & insert new blank rows at top
    for (const rowIndex of fullRows) {
      this.board.splice(rowIndex, 1);
      this.board.unshift(new Array(COLS).fill(0));
    }

    // Check Sprint 40 Win Condition
    if (this.gameMode === 'sprint40' && this.lines >= 40) {
      this.isGameWon = true;
      this.isGameOver = true;
      this.clearLockTimer();
      this.audio.stopBGM();
      this.audio.playTetrisFanfare();
      const isNewPB = this.storage.saveSprintRecord(this.elapsedSeconds);
      this.recordSessionStats();
      this.storage.clearActiveGame();
      this.onGameWinCallback({ mode: 'sprint40', timeSpent: this.elapsedSeconds, isNewPB });
      this.onStateChange();
      return;
    }

    // Level progression (every 10 lines in marathon)
    if (this.gameMode === 'marathon') {
      const newLevel = this.startingLevel + Math.floor(this.lines / 10);
      if (newLevel > this.level) {
        this.level = newLevel;
        this.audio.setTempoByLevel(this.level);
        this.audio.playLevelUp();
      }
    }
  }

  // --- Gravity Drop Rate Curve (ms) ---

  getGravityMs() {
    const speeds = [
      800, 715, 630, 550, 470, 390, 315, 240, 175, 120,
      95, 80, 68, 58, 50, 43, 37, 32, 28, 24
    ];
    const index = Math.min(this.level - 1, speeds.length - 1);
    return speeds[index];
  }

  // --- Game Loop Update ---

  update(currentTime) {
    if (this.isPaused || this.isGameOver || this.isClearingLines || this.isGameWon) return;

    // Check Blitz 2-Min Time-Up
    if (this.gameMode === 'blitz2min' && this.elapsedSeconds >= 120) {
      this.isGameWon = true;
      this.isGameOver = true;
      this.clearLockTimer();
      this.audio.stopBGM();
      this.audio.playTetrisFanfare();
      const isNewPB = this.storage.saveBlitzRecord(this.score);
      this.recordSessionStats();
      this.storage.clearActiveGame();
      this.onGameWinCallback({ mode: 'blitz2min', score: this.score, isNewPB });
      this.onStateChange();
      return;
    }

    if (!this.lastDropTime) {
      this.lastDropTime = currentTime;
    }

    const gravityMs = this.getGravityMs();
    if (currentTime - this.lastDropTime >= gravityMs) {
      this.lastDropTime = currentTime;
      if (this.currentPiece) {
        if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.rotation, this.currentPiece.type)) {
          this.currentPiece.y++;
          this.clearLockTimer();
          this.onStateChange();
        } else {
          this.startLockTimer();
        }
      }
    }
  }

  recordSessionStats() {
    this.sessionStats.lines = this.lines;
    this.sessionStats.timeSpent = this.elapsedSeconds;
    this.storage.updateAllTimeStats(this.sessionStats);
  }

  gameOver() {
    this.isGameOver = true;
    this.clearLockTimer();
    this.audio.stopBGM();
    this.audio.playGameOver();

    // Save final stats; only Marathon runs go on the high-score leaderboard
    let result = { isNewHighScore: false, rank: -1 };
    if (this.gameMode === 'marathon') {
      result = this.storage.saveScore(this.score, this.level, this.lines, this.elapsedSeconds);
    } else if (this.gameMode === 'daily' && this.dailyKey) {
      result = { isNewHighScore: this.storage.saveDailyRecord(this.dailyKey, this.score), rank: -1, mode: 'daily' };
    }
    this.recordSessionStats();
    this.storage.clearActiveGame();

    this.onGameOverCallback(result);
    this.onStateChange();
  }
}

window.TetrisEngine = TetrisEngine;
window.SHAPES = SHAPES;
