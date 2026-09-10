/**
 * Nova Strike: 1989 - UI & Canvas Renderer
 * Multi-layer parallax starfield, neon vector sprites, particles, and HUD.
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

    // Fixed virtual resolution
    this.vWidth = 480;
    this.vHeight = 640;
    this.scale = 1;

    // Starfield Background
    this.stars = [];
    this.nebulaOffset = 0;
    this.initStars();

    // Timing
    this.lastTime = performance.now();
    this.animationFrameId = null;

    this.initInputs();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.startLoop();
  }

  initStars() {
    this.stars = [];
    // 3 Layers of stars: distant, mid, near
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random() * this.vWidth,
        y: Math.random() * this.vHeight,
        speed: 25 + Math.random() * 20,
        radius: 0.8 + Math.random() * 0.8,
        color: Math.random() > 0.4 ? '#ffffff' : (Math.random() > 0.5 ? '#88ccff' : '#ffccaa'),
        layer: 0
      });
    }
    for (let i = 0; i < 45; i++) {
      this.stars.push({
        x: Math.random() * this.vWidth,
        y: Math.random() * this.vHeight,
        speed: 60 + Math.random() * 40,
        radius: 1.4 + Math.random() * 0.8,
        color: '#ffffff',
        layer: 1
      });
    }
    for (let i = 0; i < 15; i++) {
      this.stars.push({
        x: Math.random() * this.vWidth,
        y: Math.random() * this.vHeight,
        speed: 150 + Math.random() * 90,
        radius: 2.2,
        length: 8 + Math.random() * 12, // warp streaks
        color: '#00f0f0',
        layer: 2
      });
    }
  }

  resizeCanvas() {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const w = rect.width || this.vWidth;
    const h = rect.height || this.vHeight;

    // Maintain 3:4 aspect ratio
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
  }

  initInputs() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      // Ignore if chatting or in input field
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const k = e.key.toLowerCase();
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
        if (e.button === 0) {
          this.engine.input.pointerActive = true;
          this.engine.input.fire = true;
          const pos = getCanvasPos(e.clientX, e.clientY);
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

      // Touch Controls
      this.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.engine.input.pointerActive = true;
        this.engine.input.fire = true;
        const touch = e.touches[0];
        const pos = getCanvasPos(touch.clientX, touch.clientY);
        this.engine.input.pointerX = pos.x;
        this.engine.input.pointerY = pos.y - 40; // finger offset
      }, { passive: false });

      this.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = getCanvasPos(touch.clientX, touch.clientY);
        this.engine.input.pointerX = pos.x;
        this.engine.input.pointerY = pos.y - 40;
      }, { passive: false });

      this.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.engine.input.pointerActive = false;
        this.engine.input.fire = false;
      }, { passive: false });
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

  stopLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  update(dt) {
    // Parallax star update
    this.nebulaOffset += dt * 8;
    this.stars.forEach(star => {
      star.y += star.speed * dt;
      if (star.y > this.vHeight) {
        star.y = -10;
        star.x = Math.random() * this.vWidth;
      }
    });

    this.engine.update(dt);
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();

    // Apply Screen Shake
    if (this.engine.shake > 0) {
      const shakeX = (Math.random() - 0.5) * this.engine.shake;
      const shakeY = (Math.random() - 0.5) * this.engine.shake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Clear & Background
    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);

    // 2. Parallax Nebula Clouds
    this.renderNebula(ctx);

    // 3. Parallax Starfield
    this.renderStarfield(ctx);

    // 4. Power-ups
    this.renderPowerups(ctx);

    // 5. Asteroids
    this.renderAsteroids(ctx);

    // 6. Enemies
    this.renderEnemies(ctx);

    // 7. Boss
    if (this.engine.boss) {
      this.renderBoss(ctx, this.engine.boss);
    }

    // 8. Player Bullets (Additive Glow)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.engine.playerBullets.forEach(b => this.renderPlayerBullet(ctx, b));
    this.engine.enemyBullets.forEach(b => this.renderEnemyBullet(ctx, b));
    ctx.restore();

    // 9. Player Ship
    if (!this.engine.isGameOver) {
      this.renderPlayer(ctx, this.engine.player);
    }

    // 10. Particles & Shockwaves
    this.renderParticles(ctx);

    // 11. HUD Overlay
    this.renderHUD(ctx);

    // 12. Overlays (Game Over, Wave Clear, Paused)
    if (this.engine.isGameOver) {
      this.renderGameOverOverlay(ctx);
    } else if (this.engine.waveCleared) {
      this.renderWaveClearedOverlay(ctx);
    } else if (this.engine.isPaused) {
      this.renderPauseOverlay(ctx);
    }

    ctx.restore();
  }

  renderNebula(ctx) {
    const grad = ctx.createRadialGradient(
      this.vWidth * 0.3,
      (this.nebulaOffset % (this.vHeight * 2)) - 100,
      20,
      this.vWidth * 0.3,
      (this.nebulaOffset % (this.vHeight * 2)) - 100,
      260
    );
    grad.addColorStop(0, 'rgba(40, 10, 70, 0.45)');
    grad.addColorStop(0.6, 'rgba(10, 20, 60, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);
  }

  renderStarfield(ctx) {
    this.stars.forEach(s => {
      ctx.fillStyle = s.color;
      if (s.layer === 2) {
        // Fast streak
        ctx.fillRect(s.x, s.y, s.radius, s.length);
      } else {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  renderPlayer(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt * 0.22); // Banking tilt

    // Invulnerability Blink
    if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Player Hull Drawing (Sleek Neon Starfighter)
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00f0f0';

    // Wings
    ctx.fillStyle = '#0a1a2f';
    ctx.strokeStyle = '#00f0f0';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -20);        // Nose
    ctx.lineTo(18, 14);        // Right wingtip
    ctx.lineTo(8, 12);         // Wing inner
    ctx.lineTo(0, 16);         // Engine center
    ctx.lineTo(-8, 12);        // Wing inner
    ctx.lineTo(-18, 14);       // Left wingtip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Canopy / Cockpit
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -4, 3.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing Cannons
    ctx.fillStyle = '#33ffaa';
    ctx.fillRect(-16, 2, 3, 10);
    ctx.fillRect(13, 2, 3, 10);

    // Deflector Shield Aura
    if (p.shield > 0) {
      const shieldRatio = p.shield / p.maxShield;
      ctx.strokeStyle = `rgba(0, 240, 240, ${0.35 + shieldRatio * 0.45})`;
      ctx.shadowColor = '#00f0f0';
      ctx.shadowBlur = 15 * shieldRatio;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderPlayerBullet(ctx, b) {
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = b.color;

    if (b.isMissile) {
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - b.radius, b.y - 8, b.radius * 2, 16);
    }
    ctx.restore();
  }

  renderEnemyBullet(ctx, b) {
    ctx.save();
    ctx.fillStyle = b.color;
    ctx.shadowBlur = 7;
    ctx.shadowColor = b.color;

    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderEnemies(ctx) {
    this.engine.enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.shadowBlur = 10;
      ctx.shadowColor = e.color;

      ctx.strokeStyle = e.color;
      ctx.fillStyle = '#140810';
      ctx.lineWidth = 2;

      if (e.type === 'scout') {
        // Fast Swooping Drone
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(12, -10);
        ctx.lineTo(0, -4);
        ctx.lineTo(-12, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye core
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'striker') {
        // Heavy V-Wing Cruiser
        ctx.beginPath();
        ctx.moveTo(0, 16);
        ctx.lineTo(18, -12);
        ctx.lineTo(8, -8);
        ctx.lineTo(0, -2);
        ctx.lineTo(-8, -8);
        ctx.lineTo(-18, -12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dual plasma pods
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(-10, -4, 4, 8);
        ctx.fillRect(6, -4, 4, 8);
      } else if (e.type === 'gunship') {
        // Hexagonal Armored Fortress
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2;
          const px = Math.cos(ang) * e.radius;
          const py = Math.sin(ang) * e.radius;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Core pulsating eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  renderBoss(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.shadowBlur = 18;
    ctx.shadowColor = b.enraged ? '#ff0033' : '#ff0055';

    // Massive Command Cruiser Silhouette
    ctx.fillStyle = '#160410';
    ctx.strokeStyle = b.enraged ? '#ff0033' : '#ff3388';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, 45);        // Bow
    ctx.lineTo(60, 10);       // Right main wing
    ctx.lineTo(45, -30);      // Right rear
    ctx.lineTo(0, -20);       // Engine center
    ctx.lineTo(-45, -30);     // Left rear
    ctx.lineTo(-60, 10);      // Left main wing
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Core Reactor Eye
    const pulse = 10 + Math.sin(b.stateTimer * 6) * 4;
    ctx.fillStyle = b.enraged ? '#ffff00' : '#00ffff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath();
    ctx.arc(0, 5, pulse, 0, Math.PI * 2);
    ctx.fill();

    // Wing plasma turrets
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(-45, 12, 8, 14);
    ctx.fillRect(37, 12, 8, 14);

    ctx.restore();
  }

  renderAsteroids(ctx) {
    this.engine.asteroids.forEach(a => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);

      ctx.fillStyle = '#181e22';
      ctx.strokeStyle = '#6a7885';
      ctx.lineWidth = 2;

      ctx.beginPath();
      a.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });
  }

  renderPowerups(ctx) {
    const icons = {
      weapon: { label: 'UP', color: '#00f0f0' },
      shield: { label: 'SHLD', color: '#33ffaa' },
      bomb: { label: 'BOMB', color: '#ff33ff' },
      health: { label: 'HP', color: '#ff3344' },
      score: { label: '+500', color: '#ffff00' }
    };

    this.engine.powerups.forEach(pu => {
      const cfg = icons[pu.type] || icons.weapon;
      ctx.save();
      ctx.translate(pu.x, pu.y);

      // Glowing badge
      ctx.shadowBlur = 10;
      ctx.shadowColor = cfg.color;
      ctx.strokeStyle = cfg.color;
      ctx.fillStyle = '#060b14';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Icon Text
      ctx.fillStyle = cfg.color;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cfg.label, 0, 0);

      ctx.restore();
    });
  }

  renderParticles(ctx) {
    ctx.save();
    this.engine.particles.forEach(pt => {
      ctx.globalAlpha = pt.alpha;
      if (pt.type === 'shockwave') {
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  renderHUD(ctx) {
    const p = this.engine.player;

    // --- Top Header ---
    ctx.fillStyle = 'rgba(6, 10, 18, 0.85)';
    ctx.fillRect(0, 0, this.vWidth, 38);
    ctx.strokeStyle = '#1e3048';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, this.vWidth, 38);

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#00f0f0';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${this.engine.score}`, 12, 16);

    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`HIGH: ${Math.max(this.engine.highScore, this.engine.score)}`, 12, 30);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffff00';
    ctx.fillText(`WAVE ${this.engine.wave}`, this.vWidth / 2, 16);

    if (this.engine.combo > 1) {
      ctx.fillStyle = '#ffaa00';
      const mult = Math.min(5, 1 + Math.floor(this.engine.combo / 4));
      ctx.fillText(`COMBO x${mult} (${this.engine.combo})`, this.vWidth / 2, 30);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff3344';
    ctx.fillText(`LIVES: ${'?? '.repeat(Math.max(0, p.lives))}`, this.vWidth - 12, 16);

    ctx.fillStyle = '#ff33ff';
    ctx.fillText(`BOMBS: ${'?? '.repeat(Math.max(0, p.bombs))}`, this.vWidth - 12, 30);

    // --- Boss Health Bar ---
    if (this.engine.boss) {
      const boss = this.engine.boss;
      const bW = this.vWidth - 80;
      const bRatio = Math.max(0, boss.hp / boss.maxHp);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(40, 46, bW, 10);
      ctx.strokeStyle = boss.enraged ? '#ff0033' : '#ff3388';
      ctx.strokeRect(40, 46, bW, 10);

      ctx.fillStyle = boss.enraged ? '#ff0033' : '#ff0066';
      ctx.fillRect(41, 47, (bW - 2) * bRatio, 8);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`WARNING: DREADNOUGHT CORE (${Math.round(bRatio * 100)}%)`, this.vWidth / 2, 42);
    }

    // --- Bottom Player Gauges ---
    const barY = this.vHeight - 20;

    // Hull HP Bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(12, barY, 90, 8);
    ctx.fillStyle = p.hp > 30 ? '#00f080' : '#ff3344';
    ctx.fillRect(12, barY, 90 * (p.hp / p.maxHp), 8);
    ctx.strokeStyle = '#333333';
    ctx.strokeRect(12, barY, 90, 8);

    // Shield Bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(110, barY, 90, 8);
    ctx.fillStyle = '#00f0f0';
    ctx.fillRect(110, barY, 90 * (p.shield / p.maxShield), 8);
    ctx.strokeStyle = '#333333';
    ctx.strokeRect(110, barY, 90, 8);

    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`HULL: ${Math.max(0, Math.round(p.hp))}%`, 12, barY - 4);
    ctx.fillText(`SHIELD: ${Math.round(p.shield)}%`, 110, barY - 4);

    // Weapon Tier indicator
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00ffff';
    ctx.fillText(`WEAPON TIER ${p.weaponTier}/4`, this.vWidth - 12, barY + 4);
  }

  renderGameOverOverlay(ctx) {
    ctx.fillStyle = 'rgba(6, 8, 14, 0.85)';
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);

    ctx.textAlign = 'center';
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#ff0055';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0055';
    ctx.fillText('MISSION FAILED', this.vWidth / 2, this.vHeight / 2 - 50);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText(`FINAL SCORE: ${this.engine.score}`, this.vWidth / 2, this.vHeight / 2 - 10);
    ctx.fillText(`WAVES CLEARED: ${this.engine.wave - 1}`, this.vWidth / 2, this.vHeight / 2 + 15);

    ctx.fillStyle = '#00f0f0';
    ctx.fillText('[ CLICK OR PRESS SPACE TO RESTART ]', this.vWidth / 2, this.vHeight / 2 + 65);
  }

  renderWaveClearedOverlay(ctx) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#33ffaa';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#33ffaa';
    ctx.fillText(`WAVE ${this.engine.wave} CLEARED!`, this.vWidth / 2, this.vHeight / 2 - 20);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText('+1000 WAVE CLEAR BONUS', this.vWidth / 2, this.vHeight / 2 + 10);
    ctx.fillText('PREPARE FOR NEXT SECTOR...', this.vWidth / 2, this.vHeight / 2 + 30);
  }

  renderPauseOverlay(ctx) {
    ctx.fillStyle = 'rgba(6, 8, 14, 0.75)';
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);

    ctx.textAlign = 'center';
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffff00';
    ctx.fillText('SYSTEM PAUSED', this.vWidth / 2, this.vHeight / 2 - 20);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('[ PRESS P OR ESC TO RESUME ]', this.vWidth / 2, this.vHeight / 2 + 15);
  }
}

window.SpaceUI = SpaceUI;
