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

    // Fixed virtual resolution with pixel-art integer scaling
    this.vWidth = 480;
    this.vHeight = 640;
    this.scale = 1;

    // Menu Navigation State
    this.menuIndex = 0;
    this.menuOptions = [
      { id: 'campaign', label: '1. MISSION CAMPAIGN' },
      { id: 'hangar', label: '2. SHIP HANGAR' },
      { id: 'mode', label: '3. BATTLE MODE: CAMPAIGN' },
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
    this.stars = [];
    // 3 Layers of 8-bit chunky stars
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.floor(Math.random() * this.vWidth),
        y: Math.floor(Math.random() * this.vHeight),
        speed: 22 + Math.random() * 18,
        size: 2,
        color: Math.random() > 0.4 ? '#ffffff' : (Math.random() > 0.5 ? '#00f0f0' : '#ffaa00'),
        layer: 0
      });
    }
    for (let i = 0; i < 35; i++) {
      this.stars.push({
        x: Math.floor(Math.random() * this.vWidth),
        y: Math.floor(Math.random() * this.vHeight),
        speed: 55 + Math.random() * 35,
        size: 3,
        color: '#ffffff',
        layer: 1
      });
    }
    for (let i = 0; i < 12; i++) {
      this.stars.push({
        x: Math.floor(Math.random() * this.vWidth),
        y: Math.floor(Math.random() * this.vHeight),
        speed: 160 + Math.random() * 80,
        size: 3,
        length: 10 + Math.random() * 12, // Warp streak
        color: '#33ffcc',
        layer: 2
      });
    }
  }

  resizeCanvas() {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const w = rect.width || this.vWidth;
    const h = rect.height || this.vHeight;

    const aspect = this.vWidth / this.vHeight;
    let targetW = w;
    let targetH = w / aspect;

    if (targetH > h) {
      targetH = h;
      targetW = h * aspect;
    }

    this.canvas.width = this.vWidth;
    this.canvas.height = this.vHeight;
    this.canvas.style.width = `${targetW}px`;
    this.canvas.style.height = `${targetH}px`;
    this.scale = targetW / this.vWidth;

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false; // Authentic pixel art rendering!
    }
  }

  initInputs() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const k = e.key.toLowerCase();
      const state = this.engine.gameState;

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
          // Check menu item clicks
          const startY = 320;
          for (let i = 0; i < this.menuOptions.length; i++) {
            const itemY = startY + i * 40;
            if (pos.y >= itemY - 15 && pos.y <= itemY + 15) {
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
      this.menuOptions[2].label = `3. BATTLE MODE: ${mode.toUpperCase()}`;
    } else if (index === 3) {
      // 4. Hall of Aces
      alert(`?? HALL OF ACES RECORD:\nHIGH SCORE: ${this.engine.highScore} PTS\nCURRENT SHIP: ${this.engine.selectedShip.toUpperCase()}`);
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
    this.nebulaOffset += dt * 8;

    // Parallax starfield update
    this.stars.forEach(star => {
      star.y += star.speed * dt;
      if (star.y > this.vHeight) {
        star.y = -10;
        star.x = Math.floor(Math.random() * this.vWidth);
      }
    });

    this.engine.update(dt);
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.save();

    // Pixel Rendering Settings
    ctx.imageSmoothingEnabled = false;

    // 1. Background
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);

    // 2. Parallax Nebula & Starfield
    this.renderNebula(ctx);
    this.renderStarfield(ctx);

    // 3. Screen State Routing
    const state = this.engine.gameState;

    if (state === 'BOOT') {
      this.renderBootScreen(ctx);
    } else if (state === 'TITLE') {
      this.renderTitleScreen(ctx);
    } else if (state === 'HANGAR') {
      this.renderHangarScreen(ctx);
    } else if (state === 'BRIEFING') {
      this.renderBriefingScreen(ctx);
    } else {
      // PLAYING or GAMEOVER
      this.renderCombat(ctx);
    }

    // 4. CRT Scanlines effect
    this.renderScanlines(ctx);

    ctx.restore();
  }

  renderNebula(ctx) {
    const grad = ctx.createRadialGradient(
      this.vWidth * 0.35,
      (this.nebulaOffset % (this.vHeight * 2)) - 80,
      10,
      this.vWidth * 0.35,
      (this.nebulaOffset % (this.vHeight * 2)) - 80,
      280
    );
    grad.addColorStop(0, 'rgba(35, 10, 60, 0.4)');
    grad.addColorStop(0.6, 'rgba(8, 20, 50, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);
  }

  renderStarfield(ctx) {
    this.stars.forEach(s => {
      ctx.fillStyle = s.color;
      if (s.layer === 2) {
        ctx.fillRect(s.x, s.y, s.size, s.length);
      } else {
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
    });
  }

  renderScanlines(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < this.vHeight; y += 4) {
      ctx.fillRect(0, y, this.vWidth, 1.5);
    }
  }

  // --- 1. RETRO 1989 BIOS BOOT SCREEN ---
  renderBootScreen(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00f0f0';

    ctx.fillText('? NEO-ARCADE 1989 SYSTEM BIOS V2.4 ?', 30, 80);
    ctx.fillStyle = '#6688aa';
    ctx.fillText('COPYRIGHT (C) 1989 LUKEY CORP. ALL RIGHTS RESERVED.', 30, 105);

    const steps = [
      'MAIN CPU (MC68000 @ 12MHz) ........ [ OK ]',
      'RAM SYSTEM CHECK (64KB SRAM) ...... [ OK ]',
      'VRAM TILES (128KB 16-COLOR) ....... [ OK ]',
      'FM SYNTH AUDIO (YM2151 + DAC) .... [ OK ]',
      'WARP DRIVE SECTOR ENGINE .......... [ ONLINE ]'
    ];

    ctx.font = '10px monospace';
    const curStep = this.engine.bootStep;

    for (let i = 0; i < Math.min(curStep, steps.length); i++) {
      ctx.fillStyle = i === steps.length - 1 ? '#33ffaa' : '#ffffff';
      ctx.fillText(steps[i], 30, 160 + i * 36);
    }

    // Warp loading progress bar
    const barY = 400;
    ctx.strokeStyle = '#00f0f0';
    ctx.strokeRect(30, barY, this.vWidth - 60, 16);

    const progress = Math.min(1.0, (curStep + this.engine.bootTimer / 0.4) / this.engine.bootMaxSteps);
    ctx.fillStyle = '#00f0f0';
    ctx.fillRect(32, barY + 2, (this.vWidth - 64) * progress, 12);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '9px monospace';
    ctx.fillText(`LOADING SECTOR ASSETS: ${Math.round(progress * 100)}%`, this.vWidth / 2, barY + 36);

    if (Math.floor(this.blinkTimer * 3) % 2 === 0) {
      ctx.fillStyle = '#ffff00';
      ctx.fillText('[ TAP OR CLICK ANYWHERE TO SKIP BOOT ]', this.vWidth / 2, 540);
    }
  }

  // --- 2. ARCADE TITLE & MAIN MENU SCREEN ---
  renderTitleScreen(ctx) {
    ctx.textAlign = 'center';

    // Giant Pixel Title Banner
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#00f0f0';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00f0f0';
    ctx.fillText('? NOVA STRIKE ?', this.vWidth / 2, 120);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.fillText('1 9 8 9   S E C T O R   V A N G U A R D', this.vWidth / 2, 145);
    ctx.shadowBlur = 0;

    // Animated Starfighter Preview
    const previewShip = SpaceSprites[this.engine.selectedShip === 'titan' ? 'Titan' : (this.engine.selectedShip === 'phantom' ? 'Phantom' : 'Viper')];
    const palette = SpaceSprites.Palettes[this.engine.selectedShip];
    SpaceSprites.drawSprite(ctx, previewShip, this.vWidth / 2, 220, 3, palette);

    // Flashing Insert Coin prompt
    if (Math.floor(this.blinkTimer * 2) % 2 === 0) {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#ffff00';
      ctx.fillText('? INSERT COIN / PRESS ENTER TO START ?', this.vWidth / 2, 285);
    }

    // Interactive Menu Options
    const startY = 340;
    this.menuOptions.forEach((opt, idx) => {
      const isSelected = this.menuIndex === idx;
      ctx.font = isSelected ? 'bold 12px monospace' : '11px monospace';

      if (isSelected) {
        ctx.fillStyle = '#00ffff';
        ctx.fillText(`>  ${opt.label}  <`, this.vWidth / 2, startY + idx * 36);
      } else {
        ctx.fillStyle = '#7799bb';
        ctx.fillText(opt.label, this.vWidth / 2, startY + idx * 36);
      }
    });

    // Arcade Footer
    ctx.font = '8px monospace';
    ctx.fillStyle = '#445566';
    ctx.fillText('CREDIT 01    HIGHEST: ' + String(this.engine.highScore).padStart(6, '0'), this.vWidth / 2, 590);
    ctx.fillText('USE ARROWS / WASD TO NAVIGATE • ENTER TO SELECT', this.vWidth / 2, 610);
  }

  // --- 3. SHIP SELECTION HANGAR ---
  renderHangarScreen(ctx) {
    ctx.textAlign = 'center';

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#00f0f0';
    ctx.fillText('?? SHIP SELECTION HANGAR', this.vWidth / 2, 60);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#88aa99';
    ctx.fillText('CHOOSE YOUR FIGHTER FOR THE CAMPAIGN', this.vWidth / 2, 85);

    const shipConfigs = {
      viper: { name: 'VIPER MK-I', role: 'BALANCED ALL-ROUNDER', hp: '100', shield: '100', spd: '360', wep: 'TWIN BLASTER' },
      titan: { name: 'TITAN DREADNOUGHT', role: 'HEAVY SIEGE TANK', hp: '150', shield: '150', spd: '280', wep: 'TRIPLE VULCAN' },
      phantom: { name: 'PHANTOM INTERCEPTOR', role: 'SPEED STRIKER', hp: '75', shield: '80', spd: '420', wep: 'PIERCING BEAM' }
    };

    const currentId = this.shipsList[this.hangarIndex];
    const cfg = shipConfigs[currentId];

    // Left/Right Navigation Chevrons
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#00f0f0';
    ctx.fillText('?', 45, 220);
    ctx.fillText('?', this.vWidth - 45, 220);

    // Large Pixel Ship Display in Center
    const spriteMatrix = SpaceSprites[currentId === 'titan' ? 'Titan' : (currentId === 'phantom' ? 'Phantom' : 'Viper')];
    const palette = SpaceSprites.Palettes[currentId];
    SpaceSprites.drawSprite(ctx, spriteMatrix, this.vWidth / 2, 210, 5, palette);

    // Animated Thrusters
    ctx.fillStyle = Math.random() > 0.4 ? '#00ffff' : '#ffffff';
    ctx.fillRect(this.vWidth / 2 - 8, 255, 16, 6);

    // Ship Specifications Card
    ctx.fillStyle = 'rgba(6, 12, 24, 0.85)';
    ctx.fillRect(40, 290, this.vWidth - 80, 180);
    ctx.strokeStyle = '#00f0f0';
    ctx.strokeRect(40, 290, this.vWidth - 80, 180);

    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(cfg.name, this.vWidth / 2, 320);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText(cfg.role, this.vWidth / 2, 340);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#00f0f0';
    ctx.font = '10px monospace';
    ctx.fillText(`• HULL INTEGRITY:  ${cfg.hp}%`, 70, 375);
    ctx.fillText(`• ENERGY SHIELD:   ${cfg.shield}%`, 70, 400);
    ctx.fillText(`• SUB-LIGHT SPEED: ${cfg.spd}`, 70, 425);
    ctx.fillText(`• DEFAULT WEAPON:  ${cfg.wep}`, 70, 450);

    // Launch Button
    ctx.textAlign = 'center';
    ctx.fillStyle = '#33ffaa';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('[ PRESS ENTER OR TAP TO LAUNCH ]', this.vWidth / 2, 515);

    ctx.fillStyle = '#667788';
    ctx.font = '8px monospace';
    ctx.fillText('PRESS ESC OR X TO RETURN TO TITLE', this.vWidth / 2, 550);
  }

  // --- 4. SECTOR MISSION BRIEFING CUTSCENE ---
  renderBriefingScreen(ctx) {
    ctx.fillStyle = 'rgba(4, 6, 12, 0.85)';
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);

    ctx.textAlign = 'center';

    // Sector Radar Circle
    ctx.strokeStyle = '#00f0f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.vWidth / 2, 200, 65, 0, Math.PI * 2);
    ctx.stroke();

    // Sweeping Radar Line
    const angle = Date.now() * 0.004;
    ctx.beginPath();
    ctx.moveTo(this.vWidth / 2, 200);
    ctx.lineTo(this.vWidth / 2 + Math.cos(angle) * 65, 200 + Math.sin(angle) * 65);
    ctx.stroke();

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#ffff00';
    ctx.fillText(`SECTOR ${String(this.engine.wave).padStart(2, '0')}: ASTEROID FRONTIER`, this.vWidth / 2, 320);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`FIGHTER: ${this.engine.selectedShip.toUpperCase()} MK-I`, this.vWidth / 2, 355);

    ctx.fillStyle = '#ff0055';
    ctx.fillText('THREAT LEVEL: HIGH // SQUADRONS APPROACHING', this.vWidth / 2, 385);

    // Countdown
    const remaining = Math.max(1, Math.ceil(this.engine.briefingDuration - this.engine.briefingTimer));
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#00ffff';
    ctx.fillText(`LAUNCH IN ${remaining}...`, this.vWidth / 2, 450);

    ctx.font = '8px monospace';
    ctx.fillStyle = '#667788';
    ctx.fillText('[ TAP OR PRESS SPACE TO LAUNCH IMMEDIATELY ]', this.vWidth / 2, 520);
  }

  // --- 5. 8-BIT & 16-BIT IN-GAME COMBAT RENDERING ---
  renderCombat(ctx) {
    // Screen Shake
    if (this.engine.shake > 0) {
      const shakeX = (Math.random() - 0.5) * this.engine.shake;
      const shakeY = (Math.random() - 0.5) * this.engine.shake;
      ctx.translate(shakeX, shakeY);
    }

    // Powerups
    this.renderPowerups(ctx);

    // Asteroids
    this.renderAsteroids(ctx);

    // Enemies
    this.renderEnemies(ctx);

    // Boss
    if (this.engine.boss) {
      this.renderBoss(ctx, this.engine.boss);
    }

    // Bullets (Pixel Glow)
    this.engine.playerBullets.forEach(b => this.renderPlayerBullet(ctx, b));
    this.engine.enemyBullets.forEach(b => this.renderEnemyBullet(ctx, b));

    // Player
    if (!this.engine.isGameOver) {
      this.renderPlayer(ctx, this.engine.player);
    }

    // Particles
    this.renderParticles(ctx);

    // Pixel HUD
    this.renderHUD(ctx);

    // Overlays
    if (this.engine.isGameOver) {
      this.renderGameOverOverlay(ctx);
    } else if (this.engine.waveCleared) {
      this.renderWaveClearedOverlay(ctx);
    } else if (this.engine.isPaused) {
      this.renderPauseOverlay(ctx);
    }
  }

  renderPlayer(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer * 12) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // 8-Bit Pixel Ship Rendering
    const spriteMatrix = SpaceSprites[this.engine.selectedShip === 'titan' ? 'Titan' : (this.engine.selectedShip === 'phantom' ? 'Phantom' : 'Viper')];
    const palette = SpaceSprites.Palettes[this.engine.selectedShip];
    SpaceSprites.drawSprite(ctx, spriteMatrix, 0, 0, 2.2, palette);

    // Chunky Engine Thruster Flame
    ctx.fillStyle = Math.random() > 0.4 ? '#00f0f0' : '#ffffff';
    ctx.fillRect(-4, 18, 8, 4);

    // Deflector Shield (Pixel Bubble)
    if (p.shield > 0) {
      ctx.strokeStyle = '#00f0f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderPlayerBullet(ctx, b) {
    if (b.isMissile) {
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(b.x - 3, b.y - 5, 6, 10);
      ctx.fillStyle = '#ff5500';
      ctx.fillRect(b.x - 2, b.y + 5, 4, 3);
    } else {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - 2, b.y - 8, 4, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - 1, b.y - 6, 2, 12);
    }
  }

  renderEnemyBullet(ctx, b) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
  }

  renderEnemies(ctx) {
    const isFlap = Math.floor(Date.now() / 150) % 2 === 0;

    this.engine.enemies.forEach(e => {
      if (e.type === 'scout') {
        const sprite = isFlap ? SpaceSprites.Scout_F1 : SpaceSprites.Scout_F2;
        SpaceSprites.drawSprite(ctx, sprite, e.x, e.y, 2, SpaceSprites.Palettes.scout);
      } else if (e.type === 'striker') {
        SpaceSprites.drawSprite(ctx, SpaceSprites.Striker, e.x, e.y, 2, SpaceSprites.Palettes.striker);
      } else if (e.type === 'gunship') {
        SpaceSprites.drawSprite(ctx, SpaceSprites.Gunship, e.x, e.y, 2.2, SpaceSprites.Palettes.gunship);
      }
    });
  }

  renderBoss(ctx, b) {
    // 64x48 Modular Pixel Boss
    SpaceSprites.drawSprite(ctx, SpaceSprites.BossCore, b.x, b.y, 3, SpaceSprites.Palettes.boss);

    // Pulsing Core Reactor
    if (Math.floor(Date.now() / 120) % 2 === 0) {
      ctx.fillStyle = b.enraged ? '#ff0033' : '#ffff00';
      ctx.fillRect(b.x - 6, b.y + 4, 12, 12);
    }
  }

  renderAsteroids(ctx) {
    this.engine.asteroids.forEach(a => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      SpaceSprites.drawSprite(ctx, SpaceSprites.AsteroidLarge, 0, 0, a.isFragment ? 1.2 : 2.2, SpaceSprites.Palettes.asteroid);
      ctx.restore();
    });
  }

  renderPowerups(ctx) {
    const labels = { weapon: 'UP', shield: 'SHLD', bomb: 'BOMB', health: 'HP', score: '+500' };
    const colors = { weapon: '#00ffff', shield: '#33ffaa', bomb: '#ff33ff', health: '#ff3344', score: '#ffff00' };

    this.engine.powerups.forEach(pu => {
      ctx.save();
      ctx.translate(pu.x, pu.y);

      ctx.fillStyle = '#0a101d';
      ctx.strokeStyle = colors[pu.type] || '#00ffff';
      ctx.lineWidth = 2;
      ctx.fillRect(-12, -12, 24, 24);
      ctx.strokeRect(-12, -12, 24, 24);

      ctx.font = 'bold 7px monospace';
      ctx.fillStyle = colors[pu.type] || '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[pu.type] || 'UP', 0, 0);

      ctx.restore();
    });
  }

  renderParticles(ctx) {
    this.engine.particles.forEach(pt => {
      if (pt.type === 'debris') {
        // 3-Frame 8-Bit Pixel Explosion
        let matrix = SpaceSprites.Explosion_F1;
        if (pt.life < 0.25) matrix = SpaceSprites.Explosion_F2;
        if (pt.life < 0.12) matrix = SpaceSprites.Explosion_F3;
        SpaceSprites.drawSprite(ctx, matrix, pt.x, pt.y, 2, SpaceSprites.Palettes.explosion);
      } else if (pt.type === 'shockwave') {
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.radius * 2, pt.radius * 2);
      }
    });
  }

  // --- 16-BIT ARCADE HUD ---
  renderHUD(ctx) {
    const p = this.engine.player;

    // Header Background
    ctx.fillStyle = 'rgba(4, 6, 12, 0.9)';
    ctx.fillRect(0, 0, this.vWidth, 38);
    ctx.strokeStyle = '#1e3048';
    ctx.strokeRect(0, 0, this.vWidth, 38);

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#00f0f0';
    ctx.textAlign = 'left';
    ctx.fillText(`1UP: ${String(this.engine.score).padStart(6, '0')}`, 14, 16);

    ctx.fillStyle = '#888888';
    ctx.fillText(`HIGH: ${String(Math.max(this.engine.highScore, this.engine.score)).padStart(6, '0')}`, 14, 30);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffff00';
    ctx.fillText(`SECTOR ${String(this.engine.wave).padStart(2, '0')}`, this.vWidth / 2, 16);

    if (this.engine.combo > 1) {
      ctx.fillStyle = '#ffaa00';
      const mult = Math.min(5, 1 + Math.floor(this.engine.combo / 4));
      ctx.fillText(`COMBO x${mult}`, this.vWidth / 2, 30);
    }

    // Mini Pixel Ship Lives
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff3344';
    ctx.fillText(`SHIPS: ${'? '.repeat(Math.max(0, p.lives))}`, this.vWidth - 14, 16);

    ctx.fillStyle = '#ff33ff';
    ctx.fillText(`NOVA: ${'¦ '.repeat(Math.max(0, p.bombs))}`, this.vWidth - 14, 30);

    // Boss Bar
    if (this.engine.boss) {
      const boss = this.engine.boss;
      const bW = this.vWidth - 80;
      const bRatio = Math.max(0, boss.hp / boss.maxHp);

      ctx.fillStyle = '#110008';
      ctx.fillRect(40, 46, bW, 10);
      ctx.strokeStyle = '#ff0055';
      ctx.strokeRect(40, 46, bW, 10);

      ctx.fillStyle = boss.enraged ? '#ff0033' : '#ff0066';
      ctx.fillRect(41, 47, (bW - 2) * bRatio, 8);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`BOSS DREADNOUGHT: ${Math.round(bRatio * 100)}%`, this.vWidth / 2, 42);
    }

    // Bottom Health & Shield Gauges
    const barY = this.vHeight - 18;

    // Hull Bar
    ctx.fillStyle = '#000000';
    ctx.fillRect(14, barY, 80, 8);
    ctx.fillStyle = p.hp > 30 ? '#00f080' : '#ff3344';
    ctx.fillRect(14, barY, 80 * (p.hp / p.maxHp), 8);
    ctx.strokeStyle = '#333333';
    ctx.strokeRect(14, barY, 80, 8);

    // Shield Bar
    ctx.fillStyle = '#000000';
    ctx.fillRect(104, barY, 80, 8);
    ctx.fillStyle = '#00f0f0';
    ctx.fillRect(104, barY, 80 * (p.shield / p.maxShield), 8);
    ctx.strokeStyle = '#333333';
    ctx.strokeRect(104, barY, 80, 8);

    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`HULL: ${Math.max(0, Math.round(p.hp))}%`, 14, barY - 3);
    ctx.fillText(`SHIELD: ${Math.round(p.shield)}%`, 104, barY - 3);

    // Weapon Tier
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00ffff';
    ctx.fillText(`TIER ${p.weaponTier}/4 [${this.engine.selectedShip.toUpperCase()}]`, this.vWidth - 14, barY + 5);
  }

  renderGameOverOverlay(ctx) {
    ctx.fillStyle = 'rgba(4, 6, 12, 0.88)';
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);

    ctx.textAlign = 'center';
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#ff0055';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff0055';
    ctx.fillText('GAME OVER', this.vWidth / 2, this.vHeight / 2 - 50);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText(`FINAL SCORE: ${this.engine.score}`, this.vWidth / 2, this.vHeight / 2 - 10);
    ctx.fillText(`SECTORS REACHED: ${this.engine.wave}`, this.vWidth / 2, this.vHeight / 2 + 15);

    ctx.fillStyle = '#00f0f0';
    ctx.fillText('[ PRESS ENTER OR TAP TO PLAY AGAIN ]', this.vWidth / 2, this.vHeight / 2 + 65);
    ctx.fillStyle = '#667788';
    ctx.font = '9px monospace';
    ctx.fillText('PRESS ESC TO RETURN TO MAIN MENU', this.vWidth / 2, this.vHeight / 2 + 95);
  }

  renderWaveClearedOverlay(ctx) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#33ffaa';
    ctx.fillText(`SECTOR ${this.engine.wave} CLEARED!`, this.vWidth / 2, this.vHeight / 2 - 20);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('+1000 SECTOR CLEAR BONUS', this.vWidth / 2, this.vHeight / 2 + 10);
    ctx.fillText('WARP CORES CHARGING...', this.vWidth / 2, this.vHeight / 2 + 30);
  }

  renderPauseOverlay(ctx) {
    ctx.fillStyle = 'rgba(4, 6, 12, 0.75)';
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);

    ctx.textAlign = 'center';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffff00';
    ctx.fillText('MISSION PAUSED', this.vWidth / 2, this.vHeight / 2 - 20);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('[ PRESS P OR ESC TO RESUME ]', this.vWidth / 2, this.vHeight / 2 + 15);
  }
}

window.SpaceUI = SpaceUI;
