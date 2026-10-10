/**
 * Retro Classic Tetris - UI & Renderer Manager
 * Handles Canvas rendering, DAS/ARR Keyboard controls, Dragging, Minimize-to-Pill,
 * Themes, Audio sync, Modals, and Pop-out launcher.
 */

class TetrisUI {
  constructor(isStandalonePopup = false) {
    this.isStandalonePopup = isStandalonePopup;
    this.storage = new RetroStorage();
    this.audio = new RetroAudio();
    this.engine = new TetrisEngine(this.storage, this.audio);

    this.settings = this.storage.getSettings();
    this.initElements();
    this.applySettings(this.settings);

    // Canvas setup
    this.blockSize = 18; // 18x18px per cell (10 cols = 180px, 20 rows = 360px)
    this.setupCanvases();

    // Particle FX & Screen Shake
    this.particles = [];

    // Keybind remapping state
    this.recordingKeyAction = null;

    // Input state & DAS / ARR
    this.keyState = {};
    this.dasTimers = {};
    this.arrIntervals = {};
    this.DAS_DELAY = 140; // ms before repeat
    this.ARR_RATE = 32;   // ms per repeat

    this.initEngineCallbacks();
    this.initKeyboard();
    this.initTouchControls();
    this.initSwipeControls();
    this.initWindowControls();
    this.initModals();
    this.initPomodoro();
    this.initPortalHub();

    // Check for saved game state on startup
    this.checkInitialState();

    // Start render loop
    this.lastFrameTime = performance.now();
    this.renderLoop = this.renderLoop.bind(this);
    requestAnimationFrame(this.renderLoop);
  }

  initElements() {
    this.widget = document.getElementById('tetris-widget');
    this.pill = document.getElementById('tetris-pill');
    this.canvas = document.getElementById('tetris-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.holdCanvas = document.getElementById('hold-canvas');
    this.holdCtx = this.holdCanvas ? this.holdCanvas.getContext('2d') : null;

    this.nextCanvas = document.getElementById('next-canvas');
    this.nextCtx = this.nextCanvas ? this.nextCanvas.getContext('2d') : null;

    // HUD labels
    this.scoreVal = document.getElementById('score-val');
    this.highScoreVal = document.getElementById('high-score-val');
    this.levelVal = document.getElementById('level-val');
    this.linesVal = document.getElementById('lines-val');
    this.pillScore = document.getElementById('pill-score');
    this.pillLevel = document.getElementById('pill-level');

    // Overlays
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.gameOverOverlay = document.getElementById('game-over-overlay');
    this.resumeOverlay = document.getElementById('resume-overlay');
    this.lineBadge = document.getElementById('line-badge');

    // Modals
    this.settingsModal = document.getElementById('settings-modal');
    this.statsModal = document.getElementById('stats-modal');
    this.modalBackdrop = document.getElementById('modal-backdrop');
  }

  setupCanvases() {
    this.canvas.width = 10 * this.blockSize;
    this.canvas.height = 20 * this.blockSize;

    if (this.holdCanvas) {
      this.holdCanvas.width = 4 * this.blockSize;
      this.holdCanvas.height = 4 * this.blockSize;
    }

    if (this.nextCanvas) {
      this.nextCanvas.width = 4 * this.blockSize;
      this.nextCanvas.height = 10 * this.blockSize; // Display top 3 next pieces
    }
  }

  applySettings(s) {
    document.body.setAttribute('data-theme', s.theme || 'gameboy');
    if (s.crtEffect) {
      document.body.classList.remove('no-crt');
    } else {
      document.body.classList.add('no-crt');
    }

    // Audio synth track & volume
    if (this.audio) {
      this.audio.setTrack(s.bgmTrack || 'themeA');
      this.audio.setMuted(!s.sfxEnabled && !s.bgmEnabled);
      this.audio.setBGMVolume(s.bgmEnabled ? s.bgmVolume : 0);
      this.audio.setSFXVolume(s.sfxEnabled ? s.sfxVolume : 0);
    }

    // Window Opacity & Scale
    if (this.widget) {
      this.widget.style.opacity = ((s.windowOpacity || 100) / 100).toString();
      this.widget.classList.remove('size-compact', 'size-normal', 'size-large');
      this.widget.classList.add('size-' + (s.windowScale || 'normal'));
    }

    // Update settings inputs if open
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = s.theme;

    const pieceModeSelect = document.getElementById('piece-mode-select');
    if (pieceModeSelect) pieceModeSelect.value = s.pieceMode || 'classic';

    const gameModeSelect = document.getElementById('game-mode-select');
    if (gameModeSelect) gameModeSelect.value = s.gameMode || 'marathon';

    const startingLevelSelect = document.getElementById('starting-level-select');
    if (startingLevelSelect) startingLevelSelect.value = (s.startingLevel || 1).toString();

    const trackSelect = document.getElementById('track-select');
    if (trackSelect) trackSelect.value = s.bgmTrack || 'themeA';

    const opacitySlider = document.getElementById('opacity-slider');
    if (opacitySlider) opacitySlider.value = s.windowOpacity || 100;

    const scaleSelect = document.getElementById('scale-select');
    if (scaleSelect) scaleSelect.value = s.windowScale || 'normal';

    const shakeToggle = document.getElementById('shake-toggle');
    if (shakeToggle) shakeToggle.checked = s.screenShake !== false;

    const particleToggle = document.getElementById('particle-toggle');
    if (particleToggle) particleToggle.checked = s.particleFX !== false;

    const crtToggle = document.getElementById('crt-toggle');
    if (crtToggle) crtToggle.checked = s.crtEffect;

    const ghostToggle = document.getElementById('ghost-toggle');
    if (ghostToggle) ghostToggle.checked = s.ghostPiece;

    const bgmToggle = document.getElementById('bgm-toggle');
    if (bgmToggle) bgmToggle.checked = s.bgmEnabled;

    const sfxToggle = document.getElementById('sfx-toggle');
    if (sfxToggle) sfxToggle.checked = s.sfxEnabled;

    const bgmVolSlider = document.getElementById('bgm-volume-slider');
    if (bgmVolSlider) bgmVolSlider.value = Math.round((s.bgmVolume ?? 0.3) * 100);
    const sfxVolSlider = document.getElementById('sfx-volume-slider');
    if (sfxVolSlider) sfxVolSlider.value = Math.round((s.sfxVolume ?? 0.55) * 100);

    const pomoToggle = document.getElementById('pomo-toggle');
    if (pomoToggle) pomoToggle.checked = s.pomodoro && s.pomodoro.enabled;
  }

  checkInitialState() {
    const saved = this.storage.loadGameState();
    const best = this.storage.getBestScore();
    if (this.highScoreVal) this.highScoreVal.textContent = best;

    if (saved && saved.board) {
      // Automatically load the saved game directly in PAUSED state
      this.engine.resumeSavedGame();
      this.engine.pause(); // Ensure it starts paused so user can inspect and be ready
      if (this.resumeOverlay) {
        document.getElementById('saved-score-info').textContent = `SCORE: ${saved.score} | LVL: ${saved.level} | LINES: ${saved.lines}`;
        this.resumeOverlay.classList.add('active');
      }
    } else {
      this.engine.startNewGame(this.settings.startingLevel, this.settings.gameMode);
    }
  }

  initEngineCallbacks() {
    this.engine.onStateChange = () => {
      this.updateHUD();
    };

    this.engine.onScoreCallback = (added, linesCleared, combo) => {
      this.showScorePopup(added, linesCleared, combo);
    };

    this.engine.onHardDropImpact = (distance) => {
      if (this.settings.screenShake && distance > 0) {
        const matrix = document.querySelector('.matrix-container');
        if (matrix) {
          matrix.classList.remove('shake');
          void matrix.offsetWidth; // trigger reflow
          matrix.classList.add('shake');
          setTimeout(() => matrix.classList.remove('shake'), 180);
        }
      }
    };

    this.engine.onLineClearAnimation = (fullRows) => {
      if (this.settings.particleFX !== false) {
        this.spawnLineParticles(fullRows);
      }
    };

    this.engine.onGameOverCallback = (res) => {
      if (this.gameOverOverlay) {
        const title = document.querySelector('#game-over-overlay .overlay-title');
        if (title) title.textContent = 'GAME OVER';
        document.getElementById('final-score-val').textContent = this.engine.score;
        document.getElementById('final-lines-val').textContent = this.engine.lines;
        const newRecordBanner = document.getElementById('new-record-banner');
        if (newRecordBanner) {
          newRecordBanner.textContent = res.mode === 'daily' ? '★ NEW DAILY BEST! ★' : '★ NEW HIGH SCORE! ★';
          newRecordBanner.style.display = res.isNewHighScore ? 'block' : 'none';
        }
        this.gameOverOverlay.classList.add('active');
      }
    };

    this.engine.onGameWinCallback = (res) => {
      if (this.gameOverOverlay) {
        const title = document.querySelector('#game-over-overlay .overlay-title');
        if (title) title.textContent = '🏆 VICTORY!';
        if (res.mode === 'sprint40') {
          document.getElementById('final-score-val').textContent = `${res.timeSpent.toFixed(2)}s`;
        } else {
          document.getElementById('final-score-val').textContent = res.score;
        }
        document.getElementById('final-lines-val').textContent = this.engine.lines;
        const newRecordBanner = document.getElementById('new-record-banner');
        if (newRecordBanner) {
          const doneText = res.mode === 'sprint40' ? '★ 40 LINES CLEARED! ★' : '★ TIME UP! ★';
          newRecordBanner.textContent = res.isNewPB ? '★ NEW PERSONAL BEST! ★' : doneText;
          newRecordBanner.style.display = 'block';
        }
        this.gameOverOverlay.classList.add('active');
      }
    };
  }

  updateHUD() {
    if (this.scoreVal) this.scoreVal.textContent = this.engine.score;
    if (this.levelVal) this.levelVal.textContent = this.engine.level;
    if (this.linesVal) this.linesVal.textContent = this.engine.lines;
    if (this.pillScore) this.pillScore.textContent = this.engine.score;
    if (this.pillLevel) this.pillLevel.textContent = this.engine.level;

    // Best score and hub stats are read from localStorage, so refresh them at most
    // once a second during play (updateHUD runs on every move/gravity tick)
    const now = performance.now();
    const refreshStored = this.cachedBest === undefined || this.engine.isGameOver || now - this.lastHubRefresh > 1000;
    if (refreshStored) {
      this.lastHubRefresh = now;
      this.cachedBest = this.storage.getBestScore();
    }
    if (this.highScoreVal) this.highScoreVal.textContent = Math.max(this.cachedBest, this.engine.score);

    // Pause overlay state and button text updates
    if (this.pauseOverlay) {
      if (this.engine.isPaused && !this.engine.isGameOver) {
        this.pauseOverlay.classList.add('active');
      } else {
        this.pauseOverlay.classList.remove('active');
      }
    }

    const footerPause = document.getElementById('btn-footer-pause');
    if (footerPause) footerPause.innerHTML = this.engine.isPaused ? '▶️ PLAY' : '⏸️ PAUSE';
    const headerPause = document.getElementById('btn-pause-header');
    if (headerPause) headerPause.textContent = this.engine.isPaused ? '▶' : '⏸';
    const demoPause = document.getElementById('btn-demo-pause');
    if (demoPause) demoPause.innerHTML = this.engine.isPaused ? '<span>▶️</span> RESUME' : '<span>⏸️</span> PAUSE / PLAY';

    // Synchronize Hub Dashboard Stats
    if (refreshStored) this.updateHubStats();
  }

  showScorePopup(added, lines, combo) {
    if (!this.lineBadge) return;
    let text = `+${added}`;
    if (lines === 4) text = 'TETRIS! ' + text;
    else if (lines === 3) text = 'TRIPLE! ' + text;
    else if (lines === 2) text = 'DOUBLE! ' + text;

    if (combo > 0) text += ` (x${combo + 1})`;

    this.lineBadge.textContent = text;
    this.lineBadge.classList.add('show');

    clearTimeout(this.badgeTimer);
    this.badgeTimer = setTimeout(() => {
      this.lineBadge.classList.remove('show');
    }, 1000);
  }

  // --- Keyboard & DAS Input Handling ---

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // If currently remapping a key in settings modal
      if (this.recordingKeyAction) {
        e.preventDefault();
        const action = this.recordingKeyAction;
        this.recordingKeyAction = null;
        this.settings.keybinds[action] = [e.code];
        this.storage.saveSettings(this.settings);
        this.renderKeybindsList();
        return;
      }

      // Don't intercept if typing in an input, textarea (e.g. pomodoro notes) or select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;

      const code = e.code;
      const binds = this.settings.keybinds;

      // Settings / stats modal open: keys shouldn't drive the game behind it
      if (this.modalBackdrop && this.modalBackdrop.classList.contains('active')) {
        if (code === 'Escape' && this.closeModal) this.closeModal();
        return;
      }

      // Instant Restart keybinding
      if (binds.restart && binds.restart.includes(code)) {
        e.preventDefault();
        if (this.pauseOverlay) this.pauseOverlay.classList.remove('active');
        if (this.gameOverOverlay) this.gameOverOverlay.classList.remove('active');
        if (this.resumeOverlay) this.resumeOverlay.classList.remove('active');
        // Restart keeps the current game's mode and shape set
        this.engine.startNewGame(this.settings.startingLevel, this.engine.gameMode, this.engine.pieceOverride);
        return;
      }

      // Handle resume from saved game or pause overlay
      if (this.resumeOverlay && this.resumeOverlay.classList.contains('active')) {
        if (['Space', 'Enter', 'KeyP', 'Escape'].includes(code)) {
          e.preventDefault();
          this.resumeOverlay.classList.remove('active');
          this.engine.resume();
          return;
        }
      }

      // Handle pause & mute
      if (binds.pause.includes(code)) {
        e.preventDefault();
        if (this.resumeOverlay && this.resumeOverlay.classList.contains('active')) {
          this.resumeOverlay.classList.remove('active');
        }
        this.engine.togglePause();
        return;
      }

      if (binds.mute.includes(code)) {
        e.preventDefault();
        this.toggleMute();
        return;
      }

      if (this.engine.isPaused) {
        if (['Space', 'Enter'].includes(code)) {
          e.preventDefault();
          this.engine.resume();
          return;
        }
        return;
      }

      if (this.engine.isGameOver) return;

      // Move Left with DAS
      if (binds.moveLeft.includes(code)) {
        e.preventDefault();
        if (!this.keyState[code]) {
          this.keyState[code] = true;
          this.engine.moveLeft();
          this.clearDas('left');
          this.dasTimers['left'] = setTimeout(() => {
            this.arrIntervals['left'] = setInterval(() => {
              this.engine.moveLeft();
            }, this.ARR_RATE);
          }, this.DAS_DELAY);
        }
      }

      // Move Right with DAS
      else if (binds.moveRight.includes(code)) {
        e.preventDefault();
        if (!this.keyState[code]) {
          this.keyState[code] = true;
          this.engine.moveRight();
          this.clearDas('right');
          this.dasTimers['right'] = setTimeout(() => {
            this.arrIntervals['right'] = setInterval(() => {
              this.engine.moveRight();
            }, this.ARR_RATE);
          }, this.DAS_DELAY);
        }
      }

      // Soft Drop
      else if (binds.softDrop.includes(code)) {
        e.preventDefault();
        if (!this.keyState[code]) {
          this.keyState[code] = true;
          this.engine.softDrop();
          this.clearDas('down');
          this.arrIntervals['down'] = setInterval(() => {
            this.engine.softDrop();
          }, 45);
        }
      }

      // Hard Drop
      else if (binds.hardDrop.includes(code)) {
        e.preventDefault();
        if (!this.keyState[code]) {
          this.keyState[code] = true;
          this.engine.hardDrop();
        }
      }

      // Rotate CW
      else if (binds.rotateCW.includes(code)) {
        e.preventDefault();
        if (!this.keyState[code]) {
          this.keyState[code] = true;
          this.engine.rotateCW();
        }
      }

      // Rotate CCW
      else if (binds.rotateCCW.includes(code)) {
        e.preventDefault();
        if (!this.keyState[code]) {
          this.keyState[code] = true;
          this.engine.rotateCCW();
        }
      }

      // Hold
      else if (binds.hold.includes(code)) {
        e.preventDefault();
        if (!this.keyState[code]) {
          this.keyState[code] = true;
          this.engine.hold();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      const binds = this.settings.keybinds;
      this.keyState[code] = false;

      if (binds.moveLeft.includes(code)) this.clearDas('left');
      if (binds.moveRight.includes(code)) this.clearDas('right');
      if (binds.softDrop.includes(code)) this.clearDas('down');
    });

    // Auto-pause and auto-save when user leaves, hides, or closes the webpage
    const handleExitOrHide = () => {
      this.clearAllInput();
      if (!this.engine.isGameOver) {
        this.engine.pause();
        this.engine.save();
      }
    };

    window.addEventListener('blur', () => {
      if (this.settings.autoPauseOnBlur) {
        handleExitOrHide();
      }
    });

    window.addEventListener('beforeunload', handleExitOrHide);
    window.addEventListener('pagehide', handleExitOrHide);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleExitOrHide();
      }
    });
    document.addEventListener('freeze', handleExitOrHide);

    // Periodic auto-save every 1.5 seconds during active play
    setInterval(() => {
      if (!this.engine.isGameOver && !this.engine.isPaused) {
        this.engine.save();
      }
    }, 1500);
  }

  clearAllInput() {
    ['left', 'right', 'down'].forEach((dir) => this.clearDas(dir));
    this.keyState = {};
  }

  clearDas(dir) {
    if (this.dasTimers[dir]) {
      clearTimeout(this.dasTimers[dir]);
      delete this.dasTimers[dir];
    }
    if (this.arrIntervals[dir]) {
      clearInterval(this.arrIntervals[dir]);
      delete this.arrIntervals[dir];
    }
  }

  // --- Swipe Gestures on the Board (phones / tablets) ---
  // Drag sideways to move one column per cell width, drag down to soft drop,
  // flick down to hard drop, flick up to hold, tap to rotate.

  initSwipeControls() {
    const canvas = this.canvas;
    if (!canvas) return;
    canvas.style.touchAction = 'none';

    let start = null;

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault();
      this.audio.resume();
      const cell = canvas.getBoundingClientRect().width / 10;
      start = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, t: performance.now(), cell, moved: false };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!start || this.engine.isPaused || this.engine.isGameOver) return;
      e.preventDefault();
      const { cell } = start;

      // Sideways: one move per cell width dragged
      while (e.clientX - start.lastX >= cell) {
        this.engine.moveRight();
        start.lastX += cell;
        start.moved = true;
      }
      while (start.lastX - e.clientX >= cell) {
        this.engine.moveLeft();
        start.lastX -= cell;
        start.moved = true;
      }
      // Downward drag: soft drop one row per cell height
      while (e.clientY - start.lastY >= cell) {
        this.engine.softDrop();
        start.lastY += cell;
        start.moved = true;
      }
    });

    const finish = (e) => {
      if (!start) return;
      const s = start;
      start = null;
      if (e.type === 'pointercancel' || this.engine.isPaused || this.engine.isGameOver) return;

      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      const dt = Math.max(1, performance.now() - s.t);
      const vy = dy / dt; // px per ms

      if (vy > 0.9 && dy > s.cell * 2 && Math.abs(dy) > Math.abs(dx)) {
        this.engine.hardDrop();
      } else if (vy < -0.6 && -dy > s.cell * 2 && Math.abs(dy) > Math.abs(dx)) {
        this.engine.hold();
      } else if (!s.moved && Math.abs(dx) < s.cell * 0.6 && Math.abs(dy) < s.cell * 0.6 && dt < 300) {
        this.engine.rotateCW();
      }
    };

    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
  }

  // --- Touch & Click Controls ---

  initTouchControls() {
    const bindBtn = (id, action) => {
      const el = document.getElementById(id);
      if (!el) return;
      let repeatTimer = null;
      let dasTimer = null;

      const trigger = () => {
        if (this.engine.isPaused || this.engine.isGameOver) return;
        action();
      };

      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        trigger();
        if (['btn-left', 'btn-right', 'btn-down'].includes(id)) {
          dasTimer = setTimeout(() => {
            repeatTimer = setInterval(trigger, 45);
          }, 150);
        }
      });

      const clear = () => {
        if (dasTimer) clearTimeout(dasTimer);
        if (repeatTimer) clearInterval(repeatTimer);
      };

      el.addEventListener('pointerup', clear);
      el.addEventListener('pointerleave', clear);
      el.addEventListener('pointercancel', clear);
    };

    bindBtn('btn-left', () => this.engine.moveLeft());
    bindBtn('btn-right', () => this.engine.moveRight());
    bindBtn('btn-rotate', () => this.engine.rotateCW());
    bindBtn('btn-drop', () => this.engine.hardDrop());
    bindBtn('btn-down', () => this.engine.softDrop());
    bindBtn('btn-hold', () => this.engine.hold());

    const handlePauseToggle = () => this.engine.togglePause();
    const handleRestart = () => {
      if (this.pauseOverlay) this.pauseOverlay.classList.remove('active');
      if (this.gameOverOverlay) this.gameOverOverlay.classList.remove('active');
      if (this.resumeOverlay) this.resumeOverlay.classList.remove('active');
      this.engine.startNewGame(this.settings.startingLevel, this.engine.gameMode, this.engine.pieceOverride);
    };

    const pauseBtn = document.getElementById('btn-pause-header');
    if (pauseBtn) pauseBtn.addEventListener('click', handlePauseToggle);

    const footerPauseBtn = document.getElementById('btn-footer-pause');
    if (footerPauseBtn) footerPauseBtn.addEventListener('click', handlePauseToggle);

    const footerRestartBtn = document.getElementById('btn-footer-restart');
    if (footerRestartBtn) footerRestartBtn.addEventListener('click', handleRestart);

    const restartPauseBtn = document.getElementById('btn-restart-pause');
    if (restartPauseBtn) restartPauseBtn.addEventListener('click', handleRestart);

    const unpauseBtn = document.getElementById('btn-unpause');
    if (unpauseBtn) {
      unpauseBtn.addEventListener('click', () => this.engine.resume());
    }

    const restartBtn = document.getElementById('btn-restart-game');
    if (restartBtn) restartBtn.addEventListener('click', handleRestart);

    const resumeSavedBtn = document.getElementById('btn-resume-saved');
    if (resumeSavedBtn) {
      resumeSavedBtn.addEventListener('click', () => {
        if (this.resumeOverlay) this.resumeOverlay.classList.remove('active');
        this.engine.resumeSavedGame();
      });
    }

    const newSavedBtn = document.getElementById('btn-new-instead');
    if (newSavedBtn) {
      newSavedBtn.addEventListener('click', () => {
        if (this.resumeOverlay) this.resumeOverlay.classList.remove('active');
        this.engine.startNewGame();
      });
    }
  }

  // --- Window Dragging, Minimize & Pop-out ---

  initWindowControls() {
    if (this.isStandalonePopup) return; // Dedicated popup window doesn't need in-page dragging

    const header = document.getElementById('widget-header');
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    if (header) {
      header.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.hdr-btn')) return; // Don't drag when clicking minimize/popout buttons
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = this.widget.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        this.widget.style.right = 'auto';
        this.widget.style.bottom = 'auto';
        this.widget.style.left = `${initialLeft}px`;
        this.widget.style.top = `${initialTop}px`;

        header.setPointerCapture(e.pointerId);
      });

      header.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const newLeft = Math.max(10, Math.min(window.innerWidth - this.widget.offsetWidth - 10, initialLeft + dx));
        const newTop = Math.max(10, Math.min(window.innerHeight - this.widget.offsetHeight - 10, initialTop + dy));

        this.widget.style.left = `${newLeft}px`;
        this.widget.style.top = `${newTop}px`;
      });

      const stopDrag = (e) => {
        if (isDragging) {
          isDragging = false;
          try { header.releasePointerCapture(e.pointerId); } catch(err){}
        }
      };

      header.addEventListener('pointerup', stopDrag);
      header.addEventListener('pointercancel', stopDrag);
    }

    // Minimize & Restore
    const minBtn = document.getElementById('btn-minimize');
    if (minBtn) {
      minBtn.addEventListener('click', () => this.minimize());
    }

    if (this.pill) {
      this.pill.addEventListener('click', () => this.restore());
    }

    // Pop-out button
    const popoutBtn = document.getElementById('btn-popout');
    if (popoutBtn) {
      popoutBtn.addEventListener('click', () => {
        this.engine.save();
        const popupWidth = 380;
        const popupHeight = 640;
        const left = window.screenX + window.outerWidth - popupWidth - 20;
        const top = window.screenY + 50;

        window.open(
          'popup.html',
          'TetrisPopup',
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=no`
        );
        this.minimize();
      });
    }
  }

  minimize() {
    if (this.widget) this.widget.classList.add('minimized');
    if (this.pill) this.pill.classList.add('active');
    if (this.settings.autoPauseOnMinimize && !this.engine.isPaused) {
      this.engine.pause();
    }
  }

  restore() {
    if (this.pill) this.pill.classList.remove('active');
    if (this.widget) this.widget.classList.remove('minimized');
  }

  toggleMute() {
    this.settings.bgmEnabled = !this.settings.bgmEnabled;
    this.settings.sfxEnabled = this.settings.bgmEnabled;
    this.storage.saveSettings(this.settings);
    this.applySettings(this.settings);
  }

  // --- Modals (Settings, Stats) ---

  initModals() {
    const openSettings = document.getElementById('btn-settings');
    const openStats = document.getElementById('btn-stats');
    const closeSettings = document.getElementById('btn-close-settings');
    const closeStats = document.getElementById('btn-close-stats');

    if (openSettings) {
      openSettings.addEventListener('click', () => {
        if (!this.engine.isPaused) this.engine.pause();
        this.clearAllInput();
        this.renderKeybindsList();
        this.settingsModal.classList.add('active');
        this.modalBackdrop.classList.add('active');
      });
    }

    if (openStats) {
      openStats.addEventListener('click', () => {
        if (!this.engine.isPaused) this.engine.pause();
        this.clearAllInput();
        this.renderStatsModal();
        this.statsModal.classList.add('active');
        this.modalBackdrop.classList.add('active');
      });
    }

    const closeModal = this.closeModal = () => {
      if (this.settingsModal) this.settingsModal.classList.remove('active');
      if (this.statsModal) this.statsModal.classList.remove('active');
      if (this.modalBackdrop) this.modalBackdrop.classList.remove('active');
    };

    if (closeSettings) closeSettings.addEventListener('click', closeModal);
    if (closeStats) closeStats.addEventListener('click', closeModal);
    if (this.modalBackdrop) this.modalBackdrop.addEventListener('click', closeModal);

    // Settings input change events
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.settings.theme = e.target.value;
        this.storage.saveSettings(this.settings);
        this.applySettings(this.settings);
      });
    }

    const pieceModeSelect = document.getElementById('piece-mode-select');
    if (pieceModeSelect) {
      pieceModeSelect.addEventListener('change', (e) => {
        this.settings.pieceMode = e.target.value;
        this.storage.saveSettings(this.settings);
        this.engine.bag = [];
        this.engine.nextQueue = [];
        this.engine.refillQueue();
      });
    }

    const gameModeSelect = document.getElementById('game-mode-select');
    if (gameModeSelect) {
      gameModeSelect.addEventListener('change', (e) => {
        this.settings.gameMode = e.target.value;
        this.storage.saveSettings(this.settings);
      });
    }

    const startingLevelSelect = document.getElementById('starting-level-select');
    if (startingLevelSelect) {
      startingLevelSelect.addEventListener('change', (e) => {
        this.settings.startingLevel = parseInt(e.target.value, 10);
        this.storage.saveSettings(this.settings);
      });
    }

    const trackSelect = document.getElementById('track-select');
    if (trackSelect) {
      trackSelect.addEventListener('change', (e) => {
        this.settings.bgmTrack = e.target.value;
        this.storage.saveSettings(this.settings);
        this.applySettings(this.settings);
      });
    }

    const opacitySlider = document.getElementById('opacity-slider');
    if (opacitySlider) {
      opacitySlider.addEventListener('input', (e) => {
        this.settings.windowOpacity = parseInt(e.target.value, 10);
        this.storage.saveSettings(this.settings);
        this.applySettings(this.settings);
      });
    }

    const scaleSelect = document.getElementById('scale-select');
    if (scaleSelect) {
      scaleSelect.addEventListener('change', (e) => {
        this.settings.windowScale = e.target.value;
        this.storage.saveSettings(this.settings);
        this.applySettings(this.settings);
      });
    }

    const shakeToggle = document.getElementById('shake-toggle');
    if (shakeToggle) {
      shakeToggle.addEventListener('change', (e) => {
        this.settings.screenShake = e.target.checked;
        this.storage.saveSettings(this.settings);
      });
    }

    const particleToggle = document.getElementById('particle-toggle');
    if (particleToggle) {
      particleToggle.addEventListener('change', (e) => {
        this.settings.particleFX = e.target.checked;
        this.storage.saveSettings(this.settings);
      });
    }

    const pomoToggle = document.getElementById('pomo-toggle');
    if (pomoToggle) {
      pomoToggle.addEventListener('change', (e) => {
        this.settings.pomodoro.enabled = e.target.checked;
        if (e.target.checked && this.settings.pomodoro.state === 'idle') {
          this.settings.pomodoro.state = 'work';
          this.settings.pomodoro.remainingSeconds = (this.settings.pomodoro.workMinutes || 25) * 60;
        }
        this.storage.saveSettings(this.settings);
        this.updatePomodoroUI();
      });
    }

    const crtToggle = document.getElementById('crt-toggle');
    if (crtToggle) {
      crtToggle.addEventListener('change', (e) => {
        this.settings.crtEffect = e.target.checked;
        this.storage.saveSettings(this.settings);
        this.applySettings(this.settings);
      });
    }

    const ghostToggle = document.getElementById('ghost-toggle');
    if (ghostToggle) {
      ghostToggle.addEventListener('change', (e) => {
        this.settings.ghostPiece = e.target.checked;
        this.storage.saveSettings(this.settings);
      });
    }

    const bgmToggle = document.getElementById('bgm-toggle');
    if (bgmToggle) {
      bgmToggle.addEventListener('change', (e) => {
        this.settings.bgmEnabled = e.target.checked;
        this.storage.saveSettings(this.settings);
        this.applySettings(this.settings);
      });
    }

    const sfxToggle = document.getElementById('sfx-toggle');
    if (sfxToggle) {
      sfxToggle.addEventListener('change', (e) => {
        this.settings.sfxEnabled = e.target.checked;
        this.storage.saveSettings(this.settings);
        this.applySettings(this.settings);
      });
    }

    const bindVolume = (id, key, preview) => {
      const slider = document.getElementById(id);
      if (!slider) return;
      slider.addEventListener('input', (e) => {
        this.settings[key] = parseInt(e.target.value, 10) / 100;
        this.applySettings(this.settings);
      });
      // Save once the drag ends and play a sample so the new level can be heard
      slider.addEventListener('change', () => {
        this.storage.saveSettings(this.settings);
        if (preview) preview();
      });
    };
    bindVolume('bgm-volume-slider', 'bgmVolume');
    bindVolume('sfx-volume-slider', 'sfxVolume', () => this.audio.playRotate());
  }

  renderKeybindsList() {
    const container = document.getElementById('keybinds-container');
    if (!container) return;
    container.innerHTML = '';

    const actionLabels = {
      moveLeft: 'Move Left',
      moveRight: 'Move Right',
      softDrop: 'Soft Drop',
      hardDrop: 'Hard Drop',
      rotateCW: 'Rotate CW',
      rotateCCW: 'Rotate CCW',
      hold: 'Hold Piece',
      pause: 'Pause / Play',
      restart: 'Instant Reset',
      mute: 'Mute / Unmute'
    };

    Object.entries(actionLabels).forEach(([action, label]) => {
      const row = document.createElement('div');
      row.className = 'keybind-row';
      const keys = (this.settings.keybinds[action] || []).map(k => k.replace('Key', '').replace('Arrow', '↑↓←→ ')).join(', ') || 'None';
      const isRecording = this.recordingKeyAction === action;

      row.innerHTML = `
        <span>${label}</span>
        <button class="keybind-btn ${isRecording ? 'recording' : ''}">
          ${isRecording ? 'PRESS KEY...' : keys}
        </button>
      `;

      row.querySelector('.keybind-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.recordingKeyAction = action;
        this.renderKeybindsList();
      });

      container.appendChild(row);
    });
  }

  // --- Pomodoro Work/Break Companion Loop ---

  initPomodoro() {
    const pomoBadge = document.getElementById('pomo-badge');

    pomoBadge?.addEventListener('click', () => {
      const p = this.settings.pomodoro;
      if (p.state === 'idle') {
        p.state = 'work';
        p.remainingSeconds = (p.workMinutes || 25) * 60;
      } else if (p.state === 'work') {
        p.state = 'break';
        p.remainingSeconds = (p.breakMinutes || 5) * 60;
      } else {
        p.state = 'idle';
        p.remainingSeconds = (p.workMinutes || 25) * 60;
      }
      this.storage.saveSettings(this.settings);
      this.updatePomodoroUI();
    });

    setInterval(() => {
      const p = this.settings.pomodoro;
      if (!p || !p.enabled) {
        this.updatePomodoroUI();
        return;
      }

      if (p.state !== 'idle') {
        p.remainingSeconds = Math.max(0, p.remainingSeconds - 1);

        if (p.remainingSeconds <= 0) {
          if (p.state === 'work') {
            p.state = 'break';
            p.remainingSeconds = (p.breakMinutes || 5) * 60;
            this.audio.playBreakChime();
            this.restore(); // Restore floating widget to invite player to quick break round
          } else {
            p.state = 'work';
            p.remainingSeconds = (p.workMinutes || 25) * 60;
            this.audio.playBreakChime();
          }
          this.storage.saveSettings(this.settings);
        }
      }

      this.updatePomodoroUI();
    }, 1000);
  }

  updatePomodoroUI() {
    const p = this.settings.pomodoro;
    if (!p) return;

    const mins = Math.floor(p.remainingSeconds / 60);
    const secs = p.remainingSeconds % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Keep the settings checkbox and on-page hub station in sync with the timer
    const pomoToggle = document.getElementById('pomo-toggle');
    if (pomoToggle) pomoToggle.checked = !!p.enabled;
    const hubClock = document.getElementById('hub-pomo-clock');
    if (hubClock) hubClock.textContent = timeStr;
    const hubStatus = document.getElementById('hub-pomo-status');
    if (hubStatus) {
      hubStatus.textContent = !p.enabled || p.state === 'idle' ? 'IDLE' : (p.state === 'break' ? 'BREAK TIME' : 'WORK SESSION');
    }

    const pomoBadge = document.getElementById('pomo-badge');
    if (!pomoBadge) return;
    if (!p.enabled) {
      pomoBadge.classList.remove('active');
      return;
    }
    pomoBadge.classList.add('active');
    if (p.state === 'break') {
      pomoBadge.classList.add('break');
    } else {
      pomoBadge.classList.remove('break');
    }

    const icon = p.state === 'break' ? '☕ BREAK' : (p.state === 'work' ? '🍅 WORK' : '🍅 POMO');
    pomoBadge.innerHTML = `${icon} ${timeStr}`;
  }

  // --- Particles Animation ---

  spawnLineParticles(fullRows) {
    for (const r of fullRows) {
      const py = (r - BUFFER_ROWS) * this.blockSize + this.blockSize / 2;
      for (let i = 0; i < 18; i++) {
        const px = Math.random() * this.canvas.width;
        this.particles.push({
          x: px,
          y: py + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 5,
          vy: -Math.random() * 3 - 1,
          life: 1.0,
          decay: Math.random() * 0.04 + 0.02,
          size: Math.random() * 3 + 2,
          color: ['#ffff55', '#ffaa00', '#ffffff', '#ff3366', '#33ffaa'][Math.floor(Math.random() * 5)]
        });
      }
    }
  }

  updateAndDrawParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }
  }

  renderStatsModal() {
    const pieceStats = this.storage.getPieceHistory();
    const allStats = this.storage.getAllTimeStats();
    const highScores = this.storage.getHighScores();
    const sprintRecord = this.storage.getSprintRecord();
    const blitzRecord = this.storage.getBlitzRecord();

    // Populate all-time summary
    document.getElementById('stat-games-played').textContent = allStats.gamesPlayed;
    document.getElementById('stat-total-lines').textContent = allStats.totalLines;
    document.getElementById('stat-tetris-count').textContent = allStats.tetrisClears;
    document.getElementById('stat-max-combo').textContent = allStats.maxCombo;

    const sprintLabel = document.getElementById('stat-sprint-record');
    if (sprintLabel) sprintLabel.textContent = sprintRecord ? `${sprintRecord.toFixed(2)}s` : '--';
    const blitzLabel = document.getElementById('stat-blitz-record');
    if (blitzLabel) blitzLabel.textContent = blitzRecord ? `${blitzRecord} PTS` : '--';

    // Piece frequencies bar chart
    const container = document.getElementById('piece-bars-container');
    if (container) {
      container.innerHTML = '';
      const pieces = Object.keys(SHAPES);
      const maxCount = Math.max(...pieces.map(p => pieceStats.counts[p] || 0), 1);

      pieces.forEach(type => {
        const count = pieceStats.counts[type] || 0;
        const pct = Math.round((count / maxCount) * 100);

        const row = document.createElement('div');
        row.className = 'piece-bar-row';
        row.innerHTML = `
          <span class="piece-label" style="color: var(--tet-${type}); font-size: 6px;">${type}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%; background-color: var(--tet-${type})"></div>
          </div>
          <span class="piece-count">${count}</span>
        `;
        container.appendChild(row);
      });
    }

    // High score list
    const scoreList = document.getElementById('high-scores-list');
    if (scoreList) {
      scoreList.innerHTML = '';
      if (highScores.length === 0) {
        scoreList.innerHTML = '<li style="font-size: 7px; color: var(--text-muted); list-style: none;">No games logged yet.</li>';
      } else {
        highScores.slice(0, 5).forEach((item, idx) => {
          const li = document.createElement('li');
          li.style.fontSize = '7px';
          li.style.marginBottom = '4px';
          li.style.listStyle = 'none';
          li.innerHTML = `#${idx + 1} <b>${item.score}</b> PTS (LVL ${item.level}, ${item.lines} LINES)`;
          scoreList.appendChild(li);
        });
      }
    }
  }

  // --- Main Canvas Rendering Engine ---

  renderLoop(time) {
    const delta = (time - this.lastFrameTime) / 1000;
    this.lastFrameTime = time;

    // Update game timer if active
    if (!this.engine.isPaused && !this.engine.isGameOver) {
      this.engine.elapsedSeconds += delta;
      this.engine.update(time);
    }

    this.renderMainBoard();
    this.renderHoldQueue();
    this.renderNextQueue();

    requestAnimationFrame(this.renderLoop);
  }

  getPieceColor(type) {
    const style = getComputedStyle(document.body);
    return style.getPropertyValue(`--tet-${type}`).trim() || '#306230';
  }

  drawBlock(ctx, x, y, type, isGhost = false, isFlash = false) {
    const size = this.blockSize;
    const px = x * size;
    const py = y * size;

    if (isFlash) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px, py, size, size);
      return;
    }

    if (isGhost) {
      const ghostColor = getComputedStyle(document.body).getPropertyValue('--tet-ghost').trim() || 'rgba(48,98,48,0.3)';
      ctx.strokeStyle = ghostColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
      return;
    }

    const baseColor = this.getPieceColor(type);
    ctx.fillStyle = baseColor;
    ctx.fillRect(px, py, size, size);

    // Beveled retro 8-bit highlight/shadow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(px, py, size, 2);
    ctx.fillRect(px, py, 2, size);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(px, py + size - 2, size, 2);
    ctx.fillRect(px + size - 2, py, 2, size);
  }

  renderMainBoard() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw subtle grid lines
    const gridColor = getComputedStyle(document.body).getPropertyValue('--grid-line').trim() || 'rgba(0,0,0,0.05)';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    for (let c = 0; c <= 10; c++) {
      ctx.beginPath();
      ctx.moveTo(c * this.blockSize, 0);
      ctx.lineTo(c * this.blockSize, height);
      ctx.stroke();
    }
    for (let r = 0; r <= 20; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * this.blockSize);
      ctx.lineTo(width, r * this.blockSize);
      ctx.stroke();
    }

    // Render locked board blocks (skip buffer rows 0 and 1)
    for (let r = BUFFER_ROWS; r < TOTAL_ROWS; r++) {
      const isClearingRow = this.engine.clearingRowIndices.includes(r);
      for (let c = 0; c < COLS; c++) {
        const cell = this.engine.board[r][c];
        if (cell !== 0) {
          this.drawBlock(ctx, c, r - BUFFER_ROWS, cell, false, isClearingRow);
        }
      }
    }

    // Render ghost piece
    if (this.settings.ghostPiece && this.engine.currentPiece && !this.engine.isPaused && !this.engine.isGameOver) {
      const ghostY = this.engine.getGhostY();
      const shape = SHAPES[this.engine.currentPiece.type][this.engine.currentPiece.rotation];
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            const gy = ghostY + r - BUFFER_ROWS;
            if (gy >= 0) {
              this.drawBlock(ctx, this.engine.currentPiece.x + c, gy, this.engine.currentPiece.type, true);
            }
          }
        }
      }
    }

    // Render active piece
    if (this.engine.currentPiece && !this.engine.isPaused && !this.engine.isGameOver) {
      const shape = SHAPES[this.engine.currentPiece.type][this.engine.currentPiece.rotation];
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            const py = this.engine.currentPiece.y + r - BUFFER_ROWS;
            if (py >= 0) {
              this.drawBlock(ctx, this.engine.currentPiece.x + c, py, this.engine.currentPiece.type);
            }
          }
        }
      }
    }

    // Render active particle effects
    this.updateAndDrawParticles(ctx);
  }

  renderPieceInBox(ctx, type, offsetX, offsetY, scale = 1, isLocked = false) {
    if (!type || !SHAPES[type]) return;
    const shape = SHAPES[type][0];

    // Find bounding box of non-zero cells for optical centering
    let minR = shape.length, maxR = -1, minC = shape[0].length, maxC = -1;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }

    if (maxR === -1) return;

    const occupiedW = (maxC - minC + 1);
    const occupiedH = (maxR - minR + 1);
    const maxDim = Math.max(occupiedW, occupiedH);
    let effectiveScale = scale;
    if (maxDim >= 5) effectiveScale = scale * 0.65;

    const size = this.blockSize * effectiveScale;
    const pWidth = occupiedW * size;
    const pHeight = occupiedH * size;

    const boxW = ctx.canvas.width;
    const boxH = (ctx === this.holdCtx) ? ctx.canvas.height : (3.3 * this.blockSize * scale);

    const startX = offsetX + (boxW - pWidth) / 2 - minC * size;
    const startY = offsetY + (boxH - pHeight) / 2 - minR * size;

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (shape[r][c]) {
          const px = startX + c * size;
          const py = startY + r * size;

          ctx.fillStyle = isLocked ? 'rgba(100,100,100,0.5)' : this.getPieceColor(type);
          ctx.fillRect(px, py, size, size);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(px, py, size, 2);
          ctx.fillRect(px, py, 2, size);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(px, py + size - 2, size, 2);
          ctx.fillRect(px + size - 2, py, 2, size);
        }
      }
    }
  }

  renderHoldQueue() {
    if (!this.holdCtx) return;
    this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
    if (this.engine.holdPiece) {
      this.renderPieceInBox(this.holdCtx, this.engine.holdPiece, 0, 0, 0.85, !this.engine.canHold);
    }
  }

  renderNextQueue() {
    if (!this.nextCtx) return;
    this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    const previews = this.engine.nextQueue.slice(0, 3);
    previews.forEach((pieceType, idx) => {
      this.renderPieceInBox(this.nextCtx, pieceType, 0, idx * 3.2 * this.blockSize * 0.8, 0.75);
    });
  }

  // --- Retro Arcade Portal & Menu Screen Hub Controller ---

  initPortalHub() {
    if (this.isStandalonePopup) return; // Dedicated popup doesn't have the full web portal

    // 1. Quick Top Navigation Bar
    const quickTheme = document.getElementById('quick-theme-select');
    if (quickTheme) {
      quickTheme.value = this.settings.theme || 'gameboy';
      quickTheme.addEventListener('change', (e) => {
        this.settings.theme = e.target.value;
        this.storage.saveSettings(this.settings);
        this.applySettings(this.settings);
      });
    }

    const quickMute = document.getElementById('quick-mute-btn');
    if (quickMute) {
      quickMute.textContent = (this.settings.sfxEnabled || this.settings.bgmEnabled) ? '🔊 MUTE' : '🔇 UNMUTE';
      quickMute.addEventListener('click', () => {
        this.toggleMute();
        quickMute.textContent = (this.settings.sfxEnabled || this.settings.bgmEnabled) ? '🔊 MUTE' : '🔇 UNMUTE';
      });
    }

    // 2. Mode Card Launch Buttons
    document.querySelectorAll('.btn-launch-mode').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = btn.getAttribute('data-mode') || 'marathon';
        // data-shapes (Pentomino Wild) applies to this game only
        const shapes = btn.getAttribute('data-shapes');
        this.settings.gameMode = mode;
        this.storage.saveSettings(this.settings);

        // Restore floating widget if minimized
        this.restore();

        // Start fresh game with chosen mode
        if (this.pauseOverlay) this.pauseOverlay.classList.remove('active');
        if (this.gameOverOverlay) this.gameOverOverlay.classList.remove('active');
        if (this.resumeOverlay) this.resumeOverlay.classList.remove('active');
        this.engine.startNewGame(this.settings.startingLevel, mode, shapes || null);

        // Highlight widget briefly
        this.widget.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        this.widget.style.transform = 'scale(1.04)';
        setTimeout(() => {
          this.widget.style.transform = 'scale(1)';
        }, 220);
      });
    });

    // 3. Jukebox Player Controls
    const tracks = ['themeA', 'themeB', 'themeC'];
    const trackNames = {
      themeA: 'TRACK 1: THEME A (KOROBEINIKI)',
      themeB: 'TRACK 2: THEME B (TROIKA)',
      themeC: 'TRACK 3: THEME C (BRADINSKY)'
    };

    const updateJukeboxUI = () => {
      const trackNameEl = document.getElementById('jukebox-track-name');
      const trackStatusEl = document.getElementById('jukebox-status');
      if (trackNameEl) trackNameEl.textContent = trackNames[this.audio.currentTrackName || 'themeA'];
      if (trackStatusEl) {
        trackStatusEl.textContent = this.audio.isPlayingBGM ? 'PLAYING ♫' : 'PAUSED';
        trackStatusEl.style.color = this.audio.isPlayingBGM ? 'var(--highlight-color)' : 'var(--text-muted)';
      }
      document.querySelectorAll('.eq-bar').forEach(bar => {
        if (this.audio.isPlayingBGM && !this.audio.isMuted) {
          bar.classList.add('playing');
        } else {
          bar.classList.remove('playing');
        }
      });
    };

    document.getElementById('jb-play')?.addEventListener('click', () => {
      if (this.audio.isPlayingBGM) {
        this.audio.stopBGM();
      } else {
        this.audio.startBGM();
      }
      updateJukeboxUI();
    });

    document.getElementById('jb-next')?.addEventListener('click', () => {
      const currIdx = tracks.indexOf(this.audio.currentTrackName || 'themeA');
      const nextTrack = tracks[(currIdx + 1) % tracks.length];
      this.audio.stopBGM();
      this.audio.setTrack(nextTrack);
      this.settings.bgmTrack = nextTrack;
      this.storage.saveSettings(this.settings);
      this.audio.startBGM();
      updateJukeboxUI();
    });

    document.getElementById('jb-prev')?.addEventListener('click', () => {
      const currIdx = tracks.indexOf(this.audio.currentTrackName || 'themeA');
      const prevTrack = tracks[(currIdx - 1 + tracks.length) % tracks.length];
      this.audio.stopBGM();
      this.audio.setTrack(prevTrack);
      this.settings.bgmTrack = prevTrack;
      this.storage.saveSettings(this.settings);
      this.audio.startBGM();
      updateJukeboxUI();
    });

    // SFX Soundboard Buttons
    document.querySelectorAll('.btn-sfx').forEach(btn => {
      btn.addEventListener('click', () => {
        const sfx = btn.getAttribute('data-sfx');
        if (sfx === 'move') this.audio.playMove();
        else if (sfx === 'rotate') this.audio.playRotate();
        else if (sfx === 'drop') this.audio.playHardDrop();
        else if (sfx === 'clear') this.audio.playLineClear(1);
        else if (sfx === 'tetris') this.audio.playTetrisFanfare();
        else if (sfx === 'gameover') this.audio.playGameOver();
      });
    });

    // 4. On-Page Pomodoro Station
    document.getElementById('hub-pomo-start')?.addEventListener('click', () => {
      this.settings.pomodoro.enabled = true;
      this.settings.pomodoro.state = 'work';
      this.settings.pomodoro.remainingSeconds = (this.settings.pomodoro.workMinutes || 25) * 60;
      this.storage.saveSettings(this.settings);
      this.updatePomodoroUI();
    });

    document.getElementById('hub-pomo-break')?.addEventListener('click', () => {
      this.settings.pomodoro.enabled = true;
      this.settings.pomodoro.state = 'break';
      this.settings.pomodoro.remainingSeconds = (this.settings.pomodoro.breakMinutes || 5) * 60;
      this.storage.saveSettings(this.settings);
      this.updatePomodoroUI();
    });

    document.getElementById('hub-pomo-reset')?.addEventListener('click', () => {
      this.settings.pomodoro.state = 'idle';
      this.settings.pomodoro.remainingSeconds = (this.settings.pomodoro.workMinutes || 25) * 60;
      this.storage.saveSettings(this.settings);
      this.updatePomodoroUI();
    });

    const pomoNotes = document.getElementById('hub-pomo-notes');
    if (pomoNotes) {
      try {
        pomoNotes.value = localStorage.getItem('retro_tetris_pomo_notes') || '';
      } catch(e) {}
      pomoNotes.addEventListener('input', (e) => {
        try {
          localStorage.setItem('retro_tetris_pomo_notes', e.target.value);
        } catch(e) {}
      });
    }

    document.getElementById('btn-open-full-stats')?.addEventListener('click', () => {
      document.getElementById('btn-stats')?.click();
    });

    // Render Shape Lab & Hub Records
    this.renderShapeLaboratory();
    this.updateHubStats();
  }

  updateHubStats() {
    if (this.isStandalonePopup) return;

    const allStats = this.storage.getAllTimeStats();
    const sprintRecord = this.storage.getSprintRecord();
    const blitzRecord = this.storage.getBlitzRecord();
    const highScores = this.storage.getHighScores();
    const pieceStats = this.storage.getPieceHistory();

    // Mode Card Best Stats
    const sprintEl = document.getElementById('hub-sprint-pb');
    if (sprintEl) sprintEl.textContent = sprintRecord ? `${sprintRecord.toFixed(2)}s` : '--';

    const blitzEl = document.getElementById('hub-blitz-pb');
    if (blitzEl) blitzEl.textContent = blitzRecord ? `${blitzRecord} PTS` : '--';

    const dailyEl = document.getElementById('hub-daily-pb');
    if (dailyEl) {
      const dailyBest = this.storage.getDailyRecord(TetrisEngine.todayKey());
      dailyEl.textContent = dailyBest ? `${dailyBest} PTS` : '--';
    }

    const marathonEl = document.getElementById('hub-marathon-pb');
    if (marathonEl) marathonEl.textContent = (highScores.length > 0) ? `${highScores[0].score} PTS` : '--';

    // Summary Card
    const gamesEl = document.getElementById('hub-games-count');
    if (gamesEl) gamesEl.textContent = allStats.gamesPlayed;
    const linesEl = document.getElementById('hub-lines-count');
    if (linesEl) linesEl.textContent = allStats.totalLines;
    const tetrisEl = document.getElementById('hub-tetris-count');
    if (tetrisEl) tetrisEl.textContent = allStats.tetrisClears;
    const comboEl = document.getElementById('hub-combo-count');
    if (comboEl) comboEl.textContent = allStats.maxCombo;

    // Piece Generator History Bars
    const hubBars = document.getElementById('hub-piece-bars');
    if (hubBars) {
      hubBars.innerHTML = '';
      const pieces = Object.keys(SHAPES);
      const maxCount = Math.max(...pieces.map(p => pieceStats.counts[p] || 0), 1);

      pieces.forEach(type => {
        const count = pieceStats.counts[type] || 0;
        const pct = Math.round((count / maxCount) * 100);
        const row = document.createElement('div');
        row.className = 'piece-bar-row';
        row.innerHTML = `
          <span class="piece-label" style="color: var(--tet-${type}); font-size: 6px;">${type}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%; background-color: var(--tet-${type})"></div>
          </div>
          <span class="piece-count">${count}</span>
        `;
        hubBars.appendChild(row);
      });
    }
  }

  renderShapeLaboratory() {
    const container = document.getElementById('shape-lab-container');
    if (!container) return;
    container.innerHTML = '';

    const descriptions = {
      I: 'Classic 4-block straight bar tetromino',
      J: 'Classic J-hook corner tetromino',
      L: 'Classic L-hook corner tetromino',
      O: 'Classic 2x2 square tetromino',
      S: 'Classic S-skew snake tetromino',
      T: 'Classic 3-way T-junction tetromino',
      Z: 'Classic Z-skew snake tetromino',
      U: 'Extended 5-block concave horseshoe polyomino',
      X: 'Extended 5-block cross / plus polyomino',
      C: 'Extended 3-block miniature corner block',
      T5: 'Extended 5-block large capital-T block',
      W: 'Extended 5-block stair-step polyomino',
      I5: 'Extended 5-block ultra-long straight line',
      D1: 'Extended 1-block single dot polyomino'
    };

    Object.keys(SHAPES).forEach(type => {
      const card = document.createElement('div');
      card.className = 'shape-lab-card';

      const canvas = document.createElement('canvas');
      canvas.className = 'shape-lab-canvas';
      canvas.width = 48;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');

      this.renderPieceInBox(ctx, type, 0, 0, 0.7);

      const name = document.createElement('div');
      name.className = 'shape-lab-name';
      name.style.color = this.getPieceColor(type);
      name.textContent = type;

      card.appendChild(canvas);
      card.appendChild(name);

      let curRot = 0;
      card.addEventListener('click', () => {
        curRot = (curRot + 1) % SHAPES[type].length;
        ctx.clearRect(0, 0, 48, 48);
        
        // Draw rotated shape state
        const shape = SHAPES[type][curRot];
        let minR = shape.length, maxR = -1, minC = shape[0].length, maxC = -1;
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
              if (r < minR) minR = r;
              if (r > maxR) maxR = r;
              if (c < minC) minC = c;
              if (c > maxC) maxC = c;
            }
          }
        }
        const occW = (maxC - minC + 1);
        const occH = (maxR - minR + 1);
        const maxD = Math.max(occW, occH);
        const scale = (maxD >= 5 ? 0.45 : 0.65) * this.blockSize;
        const startX = (48 - occW * scale) / 2 - minC * scale;
        const startY = (48 - occH * scale) / 2 - minR * scale;

        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            if (shape[r][c]) {
              ctx.fillStyle = this.getPieceColor(type);
              ctx.fillRect(startX + c * scale, startY + r * scale, scale, scale);
              ctx.fillStyle = 'rgba(255,255,255,0.3)';
              ctx.fillRect(startX + c * scale, startY + r * scale, scale, 2);
            }
          }
        }

        const detail = document.getElementById('shape-lab-detail');
        const detailName = document.getElementById('shape-detail-name');
        const detailDesc = document.getElementById('shape-detail-desc');
        if (detail && detailName && detailDesc) {
          detail.style.display = 'block';
          detailName.textContent = `PIECE: ${type} (ROTATION STATE ${curRot + 1}/${SHAPES[type].length})`;
          detailDesc.textContent = descriptions[type] || 'Special polyomino shape.';
        }
      });

      container.appendChild(card);
    });
  }
}

window.TetrisUI = TetrisUI;
