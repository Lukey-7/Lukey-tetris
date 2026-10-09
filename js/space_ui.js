/**
 * Nova Strike: 1989 - 8-Bit & 16-Bit UI & Canvas Renderer
 * Retro BIOS Boot Sequence, Title Screen, Ship Hangar, Briefing & Pixel Graphics.
 */

class SpaceUI {
  constructor(containerId = 'space-game-container', isWidget = false) {
    this.container = document.getElementById(containerId);
    this.isWidget = isWidget;
    this.audio = new SpaceAudio();
    this.engine = new SpaceEngine(this.audio);

    this.canvas = document.getElementById('space-canvas');
    if (!this.canvas && this.container) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'space-canvas';
      this.container.appendChild(this.canvas);
    }
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Game space is 480x640; it is drawn onto a 240x320 pixel buffer
    // (arcade-board resolution) and scaled up by a whole number.
    this.vWidth = 480;
    this.vHeight = 640;
    this.LW = 240;
    this.LH = 320;
    this.scale = 1;
    this.pixelScale = 2;
    this.buffer = document.createElement('canvas');
    this.buffer.width = this.LW;
    this.buffer.height = this.LH;
    this.bctx = this.buffer.getContext('2d');
    this.bctx.imageSmoothingEnabled = false;
    this.frame = 0;
    this.showRecords = false;

    // Title menu layout (low-res pixels), shared by the renderer and click handling
    this.MENU_Y0 = 190;
    this.MENU_STEP = 14;

    this.logo = PixelKit.buildLogo(['NOVA', 'STRIKE'], 4,
      ['#fcfc00', '#fca044', '#f83800', '#d800cc', '#6844fc'], '#000000', '#000088');

    // Menu Navigation State
    this.menuIndex = 0;
    this.menuOptions = [
      { id: 'campaign', label: '1. MISSION CAMPAIGN' },
      { id: 'hangar', label: '2. SHIP HANGAR' },
      { id: 'mode', label: '3. MODE: CAMPAIGN' },
      { id: 'records', label: '4. HALL OF ACES' }
    ];
    this.hangarIndex = 0;
    this.shipsList = ['viper', 'titan', 'phantom'];
    this.modeList = ['campaign', 'endless', 'boss_rush'];
    this.modeIndex = 0;

    // Parallax Starfield Background
    this.stars = [];
    this.nebulaOffset = 0;
    this.initStars();

    // Timing & Animation
    this.lastTime = performance.now();
    this.animationFrameId = null;
    this.blinkTimer = 0;

    this.initInputs();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.startLoop();
  }

  initStars() {
    // Low-res starfield: layer 0 = blinking colour stars, 1 = slow white, 2 = fast streaks
    this.stars = [];
    const add = (count, layer, minSpeed, spread) => {
      for (let i = 0; i < count; i++) {
        this.stars.push({
          x: Math.floor(Math.random() * this.LW),
          y: Math.random() * this.LH,
          speed: minSpeed + Math.random() * spread,
          phase: Math.floor(Math.random() * 64),
          layer
        });
      }
    };
    add(56, 0, 14, 10);
    add(18, 1, 30, 14);
    add(6, 2, 70, 30);
  }

  resizeCanvas() {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const w = rect.width || this.vWidth;
    const h = rect.height || this.vHeight;

    const aspect = this.LW / this.LH;
    let targetW = w;
    let targetH = w / aspect;
    if (targetH > h) {
      targetH = h;
      targetW = h * aspect;
    }

    // Back the canvas with a whole-number multiple of the 240x320 buffer so
    // every arcade pixel maps to an identical block of screen pixels.
    const dpr = window.devicePixelRatio || 1;
    this.pixelScale = Math.max(1, Math.min(8, Math.ceil((targetW * dpr) / this.LW)));
    this.canvas.width = this.LW * this.pixelScale;
    this.canvas.height = this.LH * this.pixelScale;
    this.canvas.style.width = `${targetW}px`;
    this.canvas.style.height = `${targetH}px`;
    this.scale = targetW / this.vWidth;

    if (this.ctx) this.ctx.imageSmoothingEnabled = false;
  }

  initInputs() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const k = e.key.toLowerCase();
      const state = this.engine.gameState;

      // Any key skips the boot sequence
      if (state === 'BOOT') {
        this.engine.skipBoot();
        return;
      }

      // Hall of Aces screen: any key returns to the menu
      if (state === 'TITLE' && this.showRecords) {
        this.showRecords = false;
        if (this.audio) this.audio.playMenuMove();
        return;
      }

      // 1. Title Screen & Menu Controls
      if (state === 'TITLE') {
        if (k === 'arrowup' || k === 'w') {
          this.menuIndex = (this.menuIndex - 1 + this.menuOptions.length) % this.menuOptions.length;
          if (this.audio) this.audio.playMenuMove();
        } else if (k === 'arrowdown' || k === 's') {
          this.menuIndex = (this.menuIndex + 1) % this.menuOptions.length;
          if (this.audio) this.audio.playMenuMove();
        } else if (k === 'enter' || k === ' ' || k === 'z') {
          this.selectMenuItem(this.menuIndex);
        }
        return;
      }

      // 2. Ship Hangar Controls
      if (state === 'HANGAR') {
        if (k === 'arrowleft' || k === 'a') {
          this.hangarIndex = (this.hangarIndex - 1 + this.shipsList.length) % this.shipsList.length;
          this.engine.setShip(this.shipsList[this.hangarIndex]);
          if (this.audio) this.audio.playMenuMove();
        } else if (k === 'arrowright' || k === 'd') {
          this.hangarIndex = (this.hangarIndex + 1) % this.shipsList.length;
          this.engine.setShip(this.shipsList[this.hangarIndex]);
          if (this.audio) this.audio.playMenuMove();
        } else if (k === 'enter' || k === ' ' || k === 'z') {
          this.engine.startMission(this.engine.gameMode);
        } else if (k === 'escape' || k === 'x') {
          this.engine.goToTitle();
        }
        return;
      }

      // 3. Briefing Screen Controls
      if (state === 'BRIEFING') {
        if (k === 'enter' || k === ' ' || k === 'z') {
          // Skip briefing and launch instantly
          this.engine.gameState = 'PLAYING';
          if (this.audio) this.audio.startBGM();
        }
        return;
      }

      // 4. In-Game Combat Controls
      if (k === 'arrowleft' || k === 'a') this.engine.input.left = true;
      if (k === 'arrowright' || k === 'd') this.engine.input.right = true;
      if (k === 'arrowup' || k === 'w') this.engine.input.up = true;
      if (k === 'arrowdown' || k === 's') this.engine.input.down = true;
      if (k === ' ' || k === 'z') {
        this.engine.input.fire = true;
        if (e.key === ' ') e.preventDefault();
      }
      if (k === 'x' || k === 'b') {
        this.engine.input.bomb = true;
      }
      if (k === 'p' || k === 'escape') {
        this.togglePause();
      }
      if (k === 'r' && this.engine.isGameOver) {
        this.engine.startMission(this.engine.gameMode);
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') this.engine.input.left = false;
      if (k === 'arrowright' || k === 'd') this.engine.input.right = false;
      if (k === 'arrowup' || k === 'w') this.engine.input.up = false;
      if (k === 'arrowdown' || k === 's') this.engine.input.down = false;
      if (k === ' ' || k === 'z') this.engine.input.fire = false;
    });

    // Pointer / Mouse Tracking
    const getCanvasPos = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.vWidth / rect.width;
      const scaleY = this.vHeight / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    if (this.canvas) {
      this.canvas.addEventListener('mousedown', (e) => {
        const pos = getCanvasPos(e.clientX, e.clientY);
        const state = this.engine.gameState;

        if (state === 'BOOT') {
          this.engine.skipBoot();
          return;
        }

        if (state === 'TITLE') {
          if (this.showRecords) {
            this.showRecords = false;
            return;
          }
          // Check menu item clicks (menu layout is in low-res pixels; game space is 2x)
          for (let i = 0; i < this.menuOptions.length; i++) {
            const itemY = (this.MENU_Y0 + i * this.MENU_STEP) * 2;
            if (pos.y >= itemY - 6 && pos.y <= itemY + 20) {
              this.selectMenuItem(i);
              return;
            }
          }
          this.engine.startMission('campaign');
          return;
        }

        if (state === 'HANGAR') {
          if (pos.y > 480 && pos.y < 540) {
            this.engine.startMission(this.engine.gameMode);
          } else if (pos.x < 120) {
            this.hangarIndex = (this.hangarIndex - 1 + this.shipsList.length) % this.shipsList.length;
            this.engine.setShip(this.shipsList[this.hangarIndex]);
            if (this.audio) this.audio.playMenuMove();
          } else if (pos.x > 360) {
            this.hangarIndex = (this.hangarIndex + 1) % this.shipsList.length;
            this.engine.setShip(this.shipsList[this.hangarIndex]);
            if (this.audio) this.audio.playMenuMove();
          }
          return;
        }

        if (state === 'BRIEFING') {
          this.engine.gameState = 'PLAYING';
          if (this.audio) this.audio.startBGM();
          return;
        }

        if (state === 'GAMEOVER') {
          this.engine.startMission(this.engine.gameMode);
          return;
        }

        if (e.button === 0) {
          this.engine.input.pointerActive = true;
          this.engine.input.fire = true;
          this.engine.input.pointerX = pos.x;
          this.engine.input.pointerY = pos.y;
        } else if (e.button === 2) {
          e.preventDefault();
          this.engine.input.bomb = true;
        }
      });

      this.canvas.addEventListener('mousemove', (e) => {
        const pos = getCanvasPos(e.clientX, e.clientY);
        this.engine.input.pointerX = pos.x;
        this.engine.input.pointerY = pos.y;
      });

      window.addEventListener('mouseup', () => {
        this.engine.input.pointerActive = false;
        this.engine.input.fire = false;
      });

      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      // Mobile Touch Handling
      this.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = getCanvasPos(touch.clientX, touch.clientY);
        const state = this.engine.gameState;

        if (state === 'BOOT') {
          this.engine.skipBoot();
          return;
        }
        if (state === 'TITLE') {
          this.engine.startMission('campaign');
          return;
        }
        if (state === 'HANGAR') {
          this.engine.startMission(this.engine.gameMode);
          return;
        }
        if (state === 'BRIEFING') {
          this.engine.gameState = 'PLAYING';
          if (this.audio) this.audio.startBGM();
          return;
        }
        if (state === 'GAMEOVER') {
          this.engine.startMission(this.engine.gameMode);
          return;
        }

        this.engine.input.pointerActive = true;
        this.engine.input.fire = true;
        this.engine.input.pointerX = pos.x;
        this.engine.input.pointerY = pos.y - 35;
      }, { passive: false });

      this.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = getCanvasPos(touch.clientX, touch.clientY);
        this.engine.input.pointerX = pos.x;
        this.engine.input.pointerY = pos.y - 35;
      }, { passive: false });

      this.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.engine.input.pointerActive = false;
        this.engine.input.fire = false;
      }, { passive: false });
    }
  }

  selectMenuItem(index) {
    if (this.audio) this.audio.playMenuSelect();
    if (index === 0) {
      // 1. Mission Campaign
      this.engine.startMission('campaign');
    } else if (index === 1) {
      // 2. Ship Hangar
      this.engine.goToHangar();
    } else if (index === 2) {
      // 3. Toggle Mode
      this.modeIndex = (this.modeIndex + 1) % this.modeList.length;
      const mode = this.modeList[this.modeIndex];
      this.engine.gameMode = mode;
      this.menuOptions[2].label = `3. MODE: ${mode.replace('_', ' ').toUpperCase()}`;
    } else if (index === 3) {
      // 4. Hall of Aces
      this.showRecords = true;
    }
  }

  togglePause() {
    this.engine.isPaused = !this.engine.isPaused;
    if (this.engine.isPaused) {
      this.audio.stopBGM();
    } else {
      this.audio.startBGM();
    }
  }

  startLoop() {
    this.lastTime = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.06, (now - this.lastTime) / 1000);
      this.lastTime = now;

      this.update(dt);
      this.render();

      this.animationFrameId = requestAnimationFrame(frame);
    };
    this.animationFrameId = requestAnimationFrame(frame);
  }

  update(dt) {
    this.blinkTimer += dt;
    this.frame++;

    // Galaga-style starfield scrolls on the low-res grid
    const warp = this.engine.gameState === 'BRIEFING' ? 4 : 1;
    this.stars.forEach(star => {
      star.y += star.speed * warp * dt;
      if (star.y >= this.LH) {
        star.y -= this.LH;
        star.x = Math.floor(Math.random() * this.LW);
      }
    });

    this.engine.update(dt);
    this.updateMusic();
  }

  // Music director: picks the chiptune track that matches the current screen
  updateMusic() {
    const e = this.engine, a = this.audio;
    if (!a || !a.setTrack) return;

    // One-shot jingles on state changes
    if (e.waveCleared && !this.prevWaveCleared) a.playJingle('clear');
    if (e.isGameOver && !this.prevGameOver) a.playJingle('gameover');
    this.prevWaveCleared = e.waveCleared;
    this.prevGameOver = e.isGameOver;

    const state = e.gameState;
    // Leaving the game for the menus cuts any jingle that is still playing
    if (state !== this.prevState && (state === 'TITLE' || state === 'HANGAR') && a.jingleActive) a.stopBGM();
    this.prevState = state;

    let track = null;
    if (state === 'TITLE' || state === 'HANGAR') {
      track = 'title';
    } else if (state === 'PLAYING' && !e.isGameOver && !e.isPaused && !e.waveCleared) {
      track = e.boss ? 'boss' : 'stage';
    }
    a.setTrack(track);
  }

  // =====================================================================
  //  PIXEL RENDERER
  //  Everything is drawn on a 240x320 buffer (half the 480x640 game space)
  //  and scaled up by a whole number with no smoothing.
  // =====================================================================

  // Game-space (480x640) -> low-res pixel coordinate
  lx(v) { return Math.round(v / 2); }

  blink(rate = 2) {
    return Math.floor(this.blinkTimer * rate) % 2 === 0;
  }

  shipSprite(shipId) {
    return SpaceSprites[shipId === 'titan' ? 'Titan' : (shipId === 'phantom' ? 'Phantom' : 'Viper')];
  }

  render() {
    if (!this.ctx) return;
    const b = this.bctx;
    const K = PixelKit;

    b.save();
    b.fillStyle = K.C.black;
    b.fillRect(0, 0, this.LW, this.LH);

    this.renderStarfield(b);

    const state = this.engine.gameState;
    if (state === 'BOOT') {
      this.renderBootScreen(b);
    } else if (state === 'TITLE') {
      if (this.showRecords) this.renderRecordsScreen(b);
      else this.renderTitleScreen(b);
    } else if (state === 'HANGAR') {
      this.renderHangarScreen(b);
    } else if (state === 'BRIEFING') {
      this.renderBriefingScreen(b);
    } else {
      this.renderCombat(b);
    }
    b.restore();

    // Upscale the low-res frame with hard pixel edges
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.buffer, 0, 0, this.canvas.width, this.canvas.height);
    this.renderScanlines(ctx);
  }

  renderStarfield(b) {
    const twinkle = PixelKit.C;
    const colors = [twinkle.white, twinkle.cyan, twinkle.yellow, twinkle.pink, twinkle.green, twinkle.red];
    this.stars.forEach(s => {
      // Each star blinks on its own phase, like the Galaga star generator
      if (((this.frame + s.phase) >> 4) % 4 === 0 && s.layer === 0) return;
      b.fillStyle = s.layer === 0 ? colors[(s.phase + (this.frame >> 5)) % colors.length] : twinkle.white;
      b.fillRect(Math.floor(s.x), Math.floor(s.y), 1, s.layer === 2 ? 2 : 1);
    });
  }

  renderScanlines(ctx) {
    const s = this.pixelScale;
    if (s < 2) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    const h = Math.max(1, Math.floor(s / 3));
    for (let y = s - h; y < this.canvas.height; y += s) {
      ctx.fillRect(0, y, this.canvas.width, h);
    }
  }

  // --- 1. ARCADE POWER-ON SELF TEST ---
  renderBootScreen(b) {
    const K = PixelKit, C = K.C;
    K.text(b, 'NEO-ARCADE 1989', 12, 20, C.cyan);
    K.text(b, 'SYSTEM BIOS V2.4', 12, 30, C.cyan);
    K.text(b, '(C)1989 LUKEY CORP.', 12, 42, C.grey);

    const steps = [
      ['MAIN CPU 68000', 'OK'],
      ['WORK RAM 64K', 'OK'],
      ['VIDEO RAM 128K', 'OK'],
      ['SOUND YM2151', 'OK'],
      ['WARP DRIVE', 'ONLINE']
    ];
    const curStep = this.engine.bootStep;
    for (let i = 0; i < Math.min(curStep, steps.length); i++) {
      const y = 70 + i * 14;
      K.text(b, steps[i][0], 12, y, C.white);
      // dotted leader
      b.fillStyle = C.darkGrey;
      for (let x = 12 + K.textWidth(steps[i][0]) + 4; x < 180; x += 3) b.fillRect(x, y + 6, 1, 1);
      K.text(b, steps[i][1], 228, y, i === steps.length - 1 ? C.green : C.gold, { align: 'right' });
    }

    // Block progress bar
    const progress = Math.min(1, (curStep + this.engine.bootTimer / 0.4) / this.engine.bootMaxSteps);
    K.box(b, 12, 160, 216, 11, C.cyan);
    const blocks = Math.floor(progress * 26);
    b.fillStyle = C.cyan;
    for (let i = 0; i < blocks; i++) b.fillRect(14 + i * 8 + 1, 162, 6, 7);
    K.text(b, `LOADING ${String(Math.round(progress * 100)).padStart(3, ' ')}%`, 120, 178, C.grey, { align: 'center' });

    // Colour-bar test pattern, as arcade boards showed on boot
    const bars = [C.white, C.gold, C.aqua, C.green, C.magenta, C.red, C.blue, C.black];
    bars.forEach((col, i) => {
      b.fillStyle = col;
      b.fillRect(12 + i * 27, 210, 27, 24);
    });
    K.box(b, 11, 209, 218, 26, C.darkGrey);

    if (this.blink(3)) K.text(b, 'PRESS ANY KEY TO SKIP', 120, 280, C.gold, { align: 'center' });
  }

  // --- 2. TITLE SCREEN ---
  renderTitleScreen(b) {
    const K = PixelKit, C = K.C;
    const hi = String(Math.max(this.engine.highScore, 0)).padStart(6, '0');
    K.text(b, '1UP', 30, 4, C.red);
    K.text(b, 'HI-SCORE', 120, 4, C.red, { align: 'center' });
    K.text(b, '000000', 30, 13, C.white);
    K.text(b, hi, 120, 13, C.white, { align: 'center' });

    // Striped arcade logo, gently bobbing
    const bob = Math.round(Math.sin(this.blinkTimer * 2) * 2);
    b.drawImage(this.logo, Math.round(120 - this.logo.width / 2), 34 + bob);
    K.text(b, '- SECTOR VANGUARD -', 120, 112, C.pink, { align: 'center', shadow: C.navy });

    // Ship preview with flickering thruster
    const ship = this.engine.selectedShip;
    K.blit(b, K.sprite('ship-' + ship, this.shipSprite(ship), SpaceSprites.Palettes[ship]), 120, 140, 2);
    this.renderThruster(b, 120, 157, 2);

    if (this.blink(2)) K.text(b, 'PUSH START BUTTON', 120, 170, C.gold, { align: 'center' });

    this.menuOptions.forEach((opt, idx) => {
      const y = this.MENU_Y0 + idx * this.MENU_STEP;
      const selected = this.menuIndex === idx;
      K.text(b, opt.label, 48, y, selected ? C.white : C.cyan);
      if (selected && this.blink(4)) K.text(b, '>', 38, y, C.gold);
    });

    K.text(b, '(C) 1989 LUKEY CORP.', 120, 282, C.white, { align: 'center' });
    K.text(b, 'ARROWS/WASD + ENTER', 120, 294, C.grey, { align: 'center' });
    K.text(b, 'CREDIT 01', 234, 308, C.white, { align: 'right' });
  }

  renderRecordsScreen(b) {
    const K = PixelKit, C = K.C;
    K.text(b, 'HALL OF ACES', 120, 40, C.gold, { scale: 2, align: 'center', shadow: C.red });
    K.panel(b, 30, 80, 180, 110, C.cyan);
    K.text(b, 'RANK  SCORE   PILOT', 120, 94, C.cyan, { align: 'center' });
    K.text(b, '1ST   ' + String(this.engine.highScore).padStart(6, '0') + '  ACE', 120, 112, C.white, { align: 'center' });
    for (let i = 2; i <= 5; i++) {
      K.text(b, ['', '', '2ND', '3RD', '4TH', '5TH'][i] + '   ------  ---', 120, 112 + (i - 1) * 14, C.darkGrey, { align: 'center' });
    }
    K.text(b, 'SHIP: ' + this.engine.selectedShip.toUpperCase(), 120, 210, C.white, { align: 'center' });
    if (this.blink(2)) K.text(b, 'PRESS ANY KEY', 120, 250, C.gold, { align: 'center' });
  }

  // --- 3. SHIP SELECTION HANGAR ---
  renderHangarScreen(b) {
    const K = PixelKit, C = K.C;
    K.text(b, 'HANGAR', 120, 8, C.cyan, { scale: 2, align: 'center', shadow: C.navy });
    K.text(b, 'SELECT YOUR FIGHTER', 120, 28, C.white, { align: 'center' });

    const shipConfigs = {
      viper: { name: 'VIPER MK-I', role: 'BALANCED', hp: 100, shield: 100, spd: 360, wep: 'TWIN BLASTER' },
      titan: { name: 'TITAN', role: 'HEAVY TANK', hp: 150, shield: 150, spd: 280, wep: 'TRIPLE VULCAN' },
      phantom: { name: 'PHANTOM', role: 'INTERCEPTOR', hp: 75, shield: 80, spd: 420, wep: 'PIERCING BEAM' }
    };
    const id = this.shipsList[this.hangarIndex];
    const cfg = shipConfigs[id];

    // Rotating platform under the ship
    b.fillStyle = C.navy;
    b.fillRect(70, 114, 100, 4);
    b.fillStyle = C.blue;
    for (let i = 0; i < 6; i++) b.fillRect(70 + ((i * 18 + this.frame) % 94), 114, 6, 4);

    const bob = Math.round(Math.sin(this.blinkTimer * 3) * 2);
    K.blit(b, K.sprite('ship-' + id, this.shipSprite(id), SpaceSprites.Palettes[id]), 120, 76 + bob, 4);
    this.renderThruster(b, 120, 108 + bob, 2);

    // Selection arrows
    const nudge = this.blink(3) ? 0 : 2;
    K.text(b, '<', 22 - nudge, 70, C.gold, { scale: 2 });
    K.text(b, '>', 206 + nudge, 70, C.gold, { scale: 2 });
    K.text(b, `${this.hangarIndex + 1}/${this.shipsList.length}`, 120, 123, C.grey, { align: 'center' });

    // Spec card
    K.panel(b, 20, 136, 200, 94, C.cyan);
    K.text(b, cfg.name, 120, 143, C.white, { align: 'center' });
    K.text(b, cfg.role, 120, 153, C.orange, { align: 'center' });

    const rows = [
      ['HULL', cfg.hp / 150, C.green],
      ['SHIELD', cfg.shield / 150, C.cyan],
      ['SPEED', cfg.spd / 420, C.gold]
    ];
    rows.forEach(([label, ratio, col], i) => {
      const y = 168 + i * 12;
      K.text(b, label, 30, y, C.white);
      K.gauge(b, 92, y + 1, 30, ratio, col);
    });
    K.text(b, 'WEAPON', 30, 206, C.white);
    K.text(b, cfg.wep, 92, 206, C.pink);

    if (this.blink(2)) K.text(b, 'PUSH START TO LAUNCH', 120, 246, C.green, { align: 'center' });
    K.text(b, 'MODE: ' + this.engine.gameMode.replace('_', ' ').toUpperCase(), 120, 262, C.white, { align: 'center' });
    K.text(b, 'ESC = BACK', 120, 290, C.grey, { align: 'center' });
  }

  // --- 4. STAGE BRIEFING ---
  renderBriefingScreen(b) {
    const K = PixelKit, C = K.C;
    const cx = 120, cy = 82, r = 40;

    // Radar scope
    K.circle(b, cx, cy, r, C.darkGreen);
    K.circle(b, cx, cy, Math.round(r * 0.66), C.darkGreen, true);
    K.circle(b, cx, cy, Math.round(r * 0.33), C.darkGreen, true);
    K.line(b, cx - r, cy, cx + r, cy, C.darkGreen);
    K.line(b, cx, cy - r, cx, cy + r, C.darkGreen);
    const angle = this.blinkTimer * 3;
    K.line(b, cx, cy, cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, C.green);
    // Enemy blips
    for (let i = 0; i < 5; i++) {
      const a = i * 1.7 + 0.6, d = 12 + ((i * 7) % 24);
      if (Math.floor(this.blinkTimer * 4 + i) % 3 !== 0) {
        b.fillStyle = C.red;
        b.fillRect(Math.round(cx + Math.cos(a) * d) - 1, Math.round(cy + Math.sin(a) * d) - 1, 2, 2);
      }
    }

    const wave = String(this.engine.wave).padStart(2, '0');
    K.text(b, `STAGE ${wave}`, 120, 140, C.cyan, { scale: 3, align: 'center', shadow: C.navy });
    K.text(b, 'ASTEROID FRONTIER', 120, 172, C.white, { align: 'center' });
    K.text(b, 'FIGHTER: ' + this.engine.selectedShip.toUpperCase(), 120, 186, C.grey, { align: 'center' });
    if (this.blink(4)) K.text(b, 'WARNING! SQUADRONS INBOUND', 120, 202, C.red, { align: 'center' });

    const remaining = Math.max(1, Math.ceil(this.engine.briefingDuration - this.engine.briefingTimer));
    K.text(b, 'READY', 120, 228, C.gold, { scale: 2, align: 'center' });
    K.text(b, String(remaining), 120, 250, C.white, { scale: 2, align: 'center' });
    K.text(b, 'PUSH START TO LAUNCH', 120, 290, C.grey, { align: 'center' });
  }

  // --- 5. COMBAT ---
  renderCombat(b) {
    b.save();
    if (this.engine.shake > 0) {
      const sx = Math.round((Math.random() - 0.5) * this.engine.shake / 2);
      const sy = Math.round((Math.random() - 0.5) * this.engine.shake / 2);
      b.translate(sx, sy);
    }

    this.renderPowerups(b);
    this.renderAsteroids(b);
    this.renderEnemies(b);
    if (this.engine.boss) this.renderBoss(b, this.engine.boss);
    this.engine.playerBullets.forEach(bl => this.renderPlayerBullet(b, bl));
    this.engine.enemyBullets.forEach(bl => this.renderEnemyBullet(b, bl));
    if (!this.engine.isGameOver) this.renderPlayer(b, this.engine.player);
    this.renderParticles(b);
    b.restore();

    this.renderHUD(b);

    if (this.engine.isGameOver) this.renderGameOverOverlay(b);
    else if (this.engine.waveCleared) this.renderWaveClearedOverlay(b);
    else if (this.engine.isPaused) this.renderPauseOverlay(b);
  }

  renderThruster(b, x, y, scale = 1) {
    const C = PixelKit.C;
    const long = (this.frame >> 2) % 2 === 0;
    b.fillStyle = C.white;
    b.fillRect(x - scale, y, scale * 2, scale);
    b.fillStyle = C.gold;
    b.fillRect(x - scale, y + scale, scale * 2, scale);
    b.fillStyle = C.orange;
    b.fillRect(x - Math.max(1, scale >> 1), y + scale * 2, Math.max(1, scale), long ? scale * 2 : scale);
  }

  renderPlayer(b, p) {
    const K = PixelKit, C = K.C;
    // Classic invulnerability flicker: skip drawing on alternate frames
    if (p.invulnerableTimer > 0 && (this.frame >> 2) % 2 === 0) return;

    const x = this.lx(p.x), y = this.lx(p.y);
    const id = this.engine.selectedShip;
    K.blit(b, K.sprite('ship-' + id, this.shipSprite(id), SpaceSprites.Palettes[id]), x, y, 1);
    this.renderThruster(b, x, y + 8, 1);

    if (p.shield > 0) {
      const low = p.shield / p.maxShield < 0.3;
      if (!low || this.blink(6)) K.circle(b, x, y, this.lx(p.radius + 8), C.aqua, true);
    }
  }

  renderPlayerBullet(b, bl) {
    const C = PixelKit.C;
    const x = this.lx(bl.x), y = this.lx(bl.y);
    if (bl.isMissile) {
      b.fillStyle = C.gold;
      b.fillRect(x - 1, y - 2, 2, 4);
      b.fillStyle = (this.frame >> 1) % 2 ? C.orange : C.red;
      b.fillRect(x - 1, y + 2, 2, 2);
    } else {
      b.fillStyle = bl.color;
      b.fillRect(x - 1, y - 3, 3, 6);
      b.fillStyle = C.white;
      b.fillRect(x, y - 3, 1, 6);
    }
  }

  renderEnemyBullet(b, bl) {
    const x = this.lx(bl.x), y = this.lx(bl.y);
    b.fillStyle = bl.color;
    if ((this.frame >> 2) % 2 === 0) {
      b.fillRect(x - 1, y - 2, 3, 5);
      b.fillRect(x - 2, y - 1, 5, 3);
    } else {
      b.fillRect(x - 2, y - 2, 5, 5);
    }
    b.fillStyle = PixelKit.C.white;
    b.fillRect(x, y, 1, 1);
  }

  renderEnemies(b) {
    const K = PixelKit, S = SpaceSprites, P = S.Palettes;
    const flap = (this.frame >> 3) % 2 === 0;
    this.engine.enemies.forEach(e => {
      const x = this.lx(e.x), y = this.lx(e.y);
      const flash = e.hitFlash > 0;
      if (e.type === 'scout') {
        K.blit(b, K.sprite(flap ? 'scout1' : 'scout2', flap ? S.Scout_F1 : S.Scout_F2, P.scout, { flash }), x, y, 1);
      } else if (e.type === 'striker') {
        K.blit(b, K.sprite('striker', S.Striker, P.striker, { flash }), x, y, 1);
      } else if (e.type === 'gunship') {
        K.blit(b, K.sprite('gunship', S.Gunship, P.gunship, { flash }), x, y, 1);
      }
    });
  }

  renderBoss(b, boss) {
    const K = PixelKit, S = SpaceSprites, C = K.C;
    const x = this.lx(boss.x), y = this.lx(boss.y);
    const flash = boss.hitFlash > 0;
    if (boss.wingsAlive !== false) {
      K.blit(b, K.sprite('bosswing', S.BossWing, S.Palettes.boss, { flash }), x - 34, y + 2, 2);
      K.blit(b, K.sprite('bosswing', S.BossWing, S.Palettes.boss, { flash, flipH: true }), x + 34, y + 2, 2);
    }
    K.blit(b, K.sprite('bosscore', S.BossCore, S.Palettes.boss, { flash }), x, y, 2);

    // Pulsing reactor core
    if ((this.frame >> 3) % 2 === 0) {
      b.fillStyle = boss.enraged ? C.red : C.gold;
      b.fillRect(x - 3, y + 1, 6, 6);
      b.fillStyle = C.white;
      b.fillRect(x - 1, y + 3, 2, 2);
    }
  }

  renderAsteroids(b) {
    const K = PixelKit, S = SpaceSprites;
    this.engine.asteroids.forEach(a => {
      // Quantise rotation to quarter turns so pixels stay on the grid
      const rot = ((Math.round((a.rot || 0) / (Math.PI / 2)) % 4) + 4) % 4;
      const small = a.isFragment;
      const cv = K.sprite(small ? 'ast-s' : 'ast-l', small ? S.AsteroidSmall : S.AsteroidLarge, S.Palettes.asteroid, { rot });
      K.blit(b, cv, this.lx(a.x), this.lx(a.y), 1);
    });
  }

  renderPowerups(b) {
    const K = PixelKit, C = K.C;
    const letters = { weapon: 'P', shield: 'S', bomb: 'B', health: 'H', score: '$' };
    const colors = { weapon: C.cyan, shield: C.green, bomb: C.pink, health: C.red, score: C.gold };
    this.engine.powerups.forEach(pu => {
      const x = this.lx(pu.x) - 6, y = this.lx(pu.y) - 6;
      const col = colors[pu.type] || C.cyan;
      const on = (this.frame >> 3) % 2 === 0;
      b.fillStyle = C.black;
      b.fillRect(x, y, 13, 13);
      K.box(b, x, y, 13, 13, on ? col : C.white);
      K.box(b, x + 1, y + 1, 11, 11, C.darkGrey);
      K.text(b, letters[pu.type] || 'P', x + 4, y + 3, on ? C.white : col);
    });
  }

  renderParticles(b) {
    const K = PixelKit, S = SpaceSprites;
    this.engine.particles.forEach(pt => {
      const x = this.lx(pt.x), y = this.lx(pt.y);
      if (pt.type === 'debris') {
        let key = 'exp1', m = S.Explosion_F1;
        if (pt.life < 0.25) { key = 'exp2'; m = S.Explosion_F2; }
        if (pt.life < 0.12) { key = 'exp3'; m = S.Explosion_F3; }
        K.blit(b, K.sprite(key, m, S.Palettes.explosion), x, y, 1);
      } else if (pt.type === 'shockwave') {
        K.circle(b, x, y, this.lx(pt.radius), pt.color, (pt.alpha ?? 1) < 0.5);
      } else {
        const size = Math.max(1, Math.round((pt.radius || 1) / 2));
        b.fillStyle = pt.color;
        b.fillRect(x, y, size, size);
      }
    });
  }

  // --- ARCADE HUD ---
  renderHUD(b) {
    const K = PixelKit, C = K.C, S = SpaceSprites;
    const p = this.engine.player;
    const score = String(this.engine.score).padStart(6, '0');
    const hi = String(Math.max(this.engine.highScore, this.engine.score)).padStart(6, '0');

    b.fillStyle = C.black;
    b.fillRect(0, 0, this.LW, 22);
    if (this.blink(2)) K.text(b, '1UP', 8, 2, C.red);
    K.text(b, score, 8, 11, C.white);
    K.text(b, 'HI-SCORE', 120, 2, C.red, { align: 'center' });
    K.text(b, hi, 120, 11, C.white, { align: 'center' });
    K.text(b, 'STAGE', 232, 2, C.red, { align: 'right' });
    K.text(b, String(this.engine.wave).padStart(2, '0'), 232, 11, C.white, { align: 'right' });

    if (this.engine.combo > 1) {
      const mult = Math.min(5, 1 + Math.floor(this.engine.combo / 4));
      K.text(b, `COMBO X${mult}`, 120, 26, C.orange, { align: 'center', shadow: C.black });
    }

    if (this.engine.boss) {
      const boss = this.engine.boss;
      const ratio = Math.max(0, boss.hp / boss.maxHp);
      K.text(b, 'BOSS', 8, 36, boss.enraged && this.blink(6) ? C.white : C.red);
      K.gauge(b, 36, 37, 49, ratio, boss.enraged ? C.red : C.magenta);
    }

    // Bottom status bar
    const by = this.LH - 18;
    b.fillStyle = C.black;
    b.fillRect(0, by - 2, this.LW, 20);
    b.fillStyle = C.navy;
    b.fillRect(0, by - 2, this.LW, 1);

    const lowHp = p.hp / p.maxHp < 0.3;
    K.text(b, 'HP', 4, by, lowHp && this.blink(6) ? C.white : C.red);
    K.gauge(b, 18, by + 1, 10, p.hp / p.maxHp, lowHp ? C.red : C.green);
    K.text(b, 'SH', 4, by + 9, C.cyan);
    K.gauge(b, 18, by + 10, 10, p.shield / p.maxShield, C.aqua);

    // Spare ships and nova bombs as icons
    const shipIcon = K.sprite('mini-' + this.engine.selectedShip, S.MiniShip, S.Palettes[this.engine.selectedShip]);
    for (let i = 0; i < Math.min(5, Math.max(0, p.lives)); i++) b.drawImage(shipIcon, 64 + i * 9, by);
    const bombIcon = K.sprite('mini-bomb', S.MiniBomb, S.Palettes.gunship);
    for (let i = 0; i < Math.min(5, Math.max(0, p.bombs)); i++) b.drawImage(bombIcon, 64 + i * 9, by + 9);

    K.text(b, 'PWR', 200, by, C.gold, { align: 'right' });
    for (let i = 0; i < 4; i++) {
      b.fillStyle = i < p.weaponTier ? C.gold : C.darkGrey;
      b.fillRect(204 + i * 8, by + 1, 6, 5);
    }
    K.text(b, this.engine.selectedShip.toUpperCase(), 236, by + 9, C.grey, { align: 'right' });
  }

  renderOverlayBackdrop(b) {
    b.fillStyle = PixelKit.dither(b);
    b.fillRect(0, 22, this.LW, this.LH - 42);
  }

  renderGameOverOverlay(b) {
    const K = PixelKit, C = K.C;
    this.renderOverlayBackdrop(b);
    K.panel(b, 30, 100, 180, 110, C.red);
    K.text(b, 'GAME OVER', 120, 112, C.red, { scale: 2, align: 'center', shadow: C.navy });
    K.text(b, 'SCORE', 50, 140, C.white);
    K.text(b, String(this.engine.score).padStart(6, '0'), 190, 140, C.gold, { align: 'right' });
    K.text(b, 'STAGE', 50, 152, C.white);
    K.text(b, String(this.engine.wave).padStart(2, '0'), 190, 152, C.gold, { align: 'right' });
    if (this.engine.score > 0 && this.engine.score >= this.engine.highScore && this.blink(4)) {
      K.text(b, 'NEW HIGH SCORE!', 120, 168, C.green, { align: 'center' });
    }
    if (this.blink(2)) K.text(b, 'PUSH START', 120, 184, C.cyan, { align: 'center' });
    K.text(b, 'ESC = MENU', 120, 196, C.grey, { align: 'center' });
  }

  renderWaveClearedOverlay(b) {
    const K = PixelKit, C = K.C;
    K.text(b, `STAGE ${String(this.engine.wave).padStart(2, '0')}`, 120, 120, C.white, { scale: 2, align: 'center', shadow: C.navy });
    K.text(b, 'CLEAR!', 120, 140, C.green, { scale: 3, align: 'center', shadow: C.navy });
    if (this.blink(4)) K.text(b, 'BONUS 1000 PTS', 120, 172, C.gold, { align: 'center' });
  }

  renderPauseOverlay(b) {
    const K = PixelKit, C = K.C;
    this.renderOverlayBackdrop(b);
    K.text(b, 'PAUSE', 120, 130, C.gold, { scale: 3, align: 'center', shadow: C.navy });
    if (this.blink(2)) K.text(b, 'PRESS P TO RESUME', 120, 166, C.white, { align: 'center' });
  }
}

window.SpaceUI = SpaceUI;
