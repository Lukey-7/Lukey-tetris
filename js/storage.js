/**
 * Retro Classic Tetris - Storage & Memory Management
 * Saves active game state, piece generation stats, high scores, and preferences in localStorage.
 */

const STORAGE_KEYS = {
  ACTIVE_GAME: 'retro_tetris_active_game_v1',
  HIGH_SCORES: 'retro_tetris_high_scores_v1',
  PIECE_HISTORY: 'retro_tetris_piece_history_v1',
  ALL_TIME_STATS: 'retro_tetris_stats_v1',
  SETTINGS: 'retro_tetris_settings_v1'
};

class RetroStorage {
  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  checkAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available, state will be kept in memory only.', e);
      return false;
    }
  }

  // --- Active Game Save & Resume ---

  saveGameState(state) {
    if (!this.isAvailable) return;
    try {
      const payload = {
        board: state.board,
        currentPiece: state.currentPiece ? {
          type: state.currentPiece.type,
          x: state.currentPiece.x,
          y: state.currentPiece.y,
          rotation: state.currentPiece.rotation
        } : null,
        holdPiece: state.holdPiece,
        canHold: state.canHold,
        nextQueue: state.nextQueue,
        bag: state.bag,
        score: state.score,
        level: state.level,
        lines: state.lines,
        combos: state.combos,
        b2b: state.b2b,
        elapsedSeconds: state.elapsedSeconds || 0,
        gameMode: state.gameMode,
        startingLevel: state.startingLevel,
        rngState: state.rngState,
        dailyKey: state.dailyKey,
        pieceOverride: state.pieceOverride,
        savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save game state:', e);
    }
  }

  loadGameState() {
    if (!this.isAvailable) return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (!parsed.board || !Array.isArray(parsed.board)) return null;
      return parsed;
    } catch (e) {
      console.error('Failed to load game state:', e);
      return null;
    }
  }

  clearActiveGame() {
    if (!this.isAvailable) return;
    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME);
    } catch (e) {
      console.error('Failed to clear active game:', e);
    }
  }

  hasActiveGame() {
    return !!this.loadGameState();
  }

  // --- High Scores & Leaderboard ---

  getHighScores() {
    if (!this.isAvailable) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  getBestScore() {
    const scores = this.getHighScores();
    return scores.length > 0 ? scores[0].score : 0;
  }

  saveScore(score, level, lines, timeSpent = 0) {
    if (!this.isAvailable || score <= 0) return { isNewHighScore: false, rank: -1 };

    let scores = this.getHighScores();
    const isNewHighScore = scores.length === 0 || score > scores[0].score;

    const newEntry = {
      score,
      level,
      lines,
      timeSpent,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    scores.push(newEntry);
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10); // Keep top 10

    const rank = scores.findIndex(s => s === newEntry) + 1;

    try {
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(scores));
    } catch (e) {
      console.error('Failed to save high score:', e);
    }

    return { isNewHighScore, rank };
  }

  // --- Piece Generation History & Distribution ---

  getPieceHistory() {
    const defaultStats = {
      totalGenerated: 0,
      counts: { I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0, U: 0, X: 0, C: 0, T5: 0, W: 0, I5: 0, D1: 0 },
      recentSequence: [] // Last 50 pieces
    };

    if (!this.isAvailable) return defaultStats;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PIECE_HISTORY);
      if (!raw) return defaultStats;
      const parsed = JSON.parse(raw);
      return {
        totalGenerated: parsed.totalGenerated || 0,
        counts: Object.assign({}, defaultStats.counts, parsed.counts),
        recentSequence: Array.isArray(parsed.recentSequence) ? parsed.recentSequence : []
      };
    } catch (e) {
      return defaultStats;
    }
  }

  recordPieceGenerated(type) {
    if (!this.isAvailable || !type) return;
    const history = this.getPieceHistory();
    history.totalGenerated++;
    if (history.counts[type] !== undefined) {
      history.counts[type]++;
    } else {
      history.counts[type] = 1;
    }

    history.recentSequence.unshift({ type, time: Date.now() });
    if (history.recentSequence.length > 50) {
      history.recentSequence.pop();
    }

    try {
      localStorage.setItem(STORAGE_KEYS.PIECE_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to update piece history:', e);
    }
  }

  // --- All Time Statistics ---

  getAllTimeStats() {
    const defaultStats = {
      gamesPlayed: 0,
      totalLines: 0,
      singleClears: 0,
      doubleClears: 0,
      tripleClears: 0,
      tetrisClears: 0,
      maxCombo: 0,
      totalTimeSeconds: 0
    };

    if (!this.isAvailable) return defaultStats;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ALL_TIME_STATS);
      if (!raw) return defaultStats;
      return Object.assign({}, defaultStats, JSON.parse(raw));
    } catch (e) {
      return defaultStats;
    }
  }

  updateAllTimeStats(sessionStats) {
    if (!this.isAvailable) return;
    const current = this.getAllTimeStats();
    current.gamesPlayed += sessionStats.gamesPlayed || 1;
    current.totalLines += sessionStats.lines || 0;
    current.singleClears += sessionStats.singleClears || 0;
    current.doubleClears += sessionStats.doubleClears || 0;
    current.tripleClears += sessionStats.tripleClears || 0;
    current.tetrisClears += sessionStats.tetrisClears || 0;
    current.maxCombo = Math.max(current.maxCombo, sessionStats.maxCombo || 0);
    current.totalTimeSeconds += sessionStats.timeSpent || 0;

    try {
      localStorage.setItem(STORAGE_KEYS.ALL_TIME_STATS, JSON.stringify(current));
    } catch (e) {
      console.error('Failed to update all time stats:', e);
    }
  }

  // --- User Preferences / Settings ---

  getSettings() {
    const defaultSettings = {
      theme: 'gameboy',        // 'gameboy' | 'nes' | 'cyberpunk' | 'matrix'
      settingsVersion: 2,
      pieceMode: 'classic',    // 'classic' | 'extended' | 'pentomino'
      gameMode: 'marathon',    // 'marathon' | 'sprint40' | 'blitz2min'
      startingLevel: 1,        // 1 to 15
      bgmTrack: 'themeA',      // 'themeA' | 'themeB' | 'themeC'
      crtEffect: true,
      ghostPiece: true,
      screenShake: true,
      particleFX: true,
      windowOpacity: 100,      // 50 to 100
      windowScale: 'normal',   // 'compact' | 'normal' | 'large'
      bgmEnabled: true,
      sfxEnabled: true,
      bgmVolume: 0.3,
      sfxVolume: 0.55,
      autoPauseOnBlur: true,
      autoPauseOnMinimize: true,
      pomodoro: {
        enabled: false,
        workMinutes: 25,
        breakMinutes: 5,
        state: 'idle',         // 'work' | 'break' | 'idle'
        remainingSeconds: 1500
      },
      keybinds: {
        moveLeft: ['ArrowLeft', 'KeyA'],
        moveRight: ['ArrowRight', 'KeyD'],
        softDrop: ['ArrowDown', 'KeyS'],
        hardDrop: ['Space'],
        rotateCW: ['ArrowUp', 'KeyW', 'KeyX'],
        rotateCCW: ['KeyZ', 'ControlLeft'],
        hold: ['KeyC', 'ShiftLeft', 'ShiftRight'],
        pause: ['KeyP', 'Escape'],
        restart: ['KeyR'],
        mute: ['KeyM']
      }
    };

    if (!this.isAvailable) return defaultSettings;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) return defaultSettings;
      const parsed = JSON.parse(raw);
      // v2: classic 7 pieces became the default; move older saves over once
      if (!parsed.settingsVersion || parsed.settingsVersion < 2) {
        parsed.pieceMode = 'classic';
        parsed.settingsVersion = 2;
      }
      return Object.assign({}, defaultSettings, parsed, {
        pomodoro: Object.assign({}, defaultSettings.pomodoro, parsed.pomodoro),
        keybinds: Object.assign({}, defaultSettings.keybinds, parsed.keybinds)
      });
    } catch (e) {
      return defaultSettings;
    }
  }

  saveSettings(settings) {
    if (!this.isAvailable) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  // --- Sprint & Blitz Records ---

  getSprintRecord() {
    if (!this.isAvailable) return null;
    try {
      const val = localStorage.getItem('retro_tetris_sprint_record_v1');
      return val ? parseFloat(val) : null;
    } catch(e) { return null; }
  }

  saveSprintRecord(timeSeconds) {
    if (!this.isAvailable) return false;
    const prev = this.getSprintRecord();
    if (prev === null || timeSeconds < prev) {
      localStorage.setItem('retro_tetris_sprint_record_v1', timeSeconds.toString());
      return true; // New record
    }
    return false;
  }

  getBlitzRecord() {
    if (!this.isAvailable) return 0;
    try {
      const val = localStorage.getItem('retro_tetris_blitz_record_v1');
      return val ? parseInt(val, 10) : 0;
    } catch(e) { return 0; }
  }

  saveBlitzRecord(score) {
    if (!this.isAvailable) return false;
    const prev = this.getBlitzRecord();
    if (score > prev) {
      localStorage.setItem('retro_tetris_blitz_record_v1', score.toString());
      return true; // New record
    }
    return false;
  }

  // --- Daily Challenge Record (best score for one calendar day) ---

  getDailyRecord(dayKey) {
    if (!this.isAvailable) return 0;
    try {
      const rec = JSON.parse(localStorage.getItem('retro_tetris_daily_record_v1'));
      return rec && rec.day === dayKey ? rec.score : 0;
    } catch (e) { return 0; }
  }

  saveDailyRecord(dayKey, score) {
    if (!this.isAvailable || score <= this.getDailyRecord(dayKey)) return false;
    try {
      localStorage.setItem('retro_tetris_daily_record_v1', JSON.stringify({ day: dayKey, score }));
      return true;
    } catch (e) { return false; }
  }
}

window.RetroStorage = RetroStorage;
