/**
 * Star Vanguard - Core Game Engine
 * Handles player, enemies, bullets, powerups, boss AI, collision, and wave progression.
 *
 * Enemies use Galaga-style behaviour: they fly in along curved entry paths, settle
 * into a swaying formation at the top of the screen, then break off to dive at the
 * player and loop back into place.
 */

// Campaign stages repeat every 5 waves; each lap is harder than the last
const SPACE_STAGES = [
  { name: 'ASTEROID FRONTIER', roster: { scout: 1 }, asteroids: 4 },
  { name: 'NEBULA CORRIDOR', roster: { scout: 0.6, striker: 0.4 }, asteroids: 2 },
  { name: 'IRON ARMADA', roster: { scout: 0.4, striker: 0.35, gunship: 0.25 }, asteroids: 1 },
  { name: 'BONUS STAGE', bonus: true },
  { name: 'DREADNOUGHT', boss: true }
];

// Cubic bezier point
function bezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
  };
}

class SpaceEngine {
  constructor(audio) {
    this.audio = audio;
    this.width = 480;
    this.height = 640;

    this.score = 0;
    this.highScore = 0;
    this.wave = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.waveCleared = false;
    this.waveTransitionTimer = 0;

    // Arcade State Machine
    this.gameState = 'BOOT'; // 'BOOT' -> 'TITLE' -> 'HANGAR' -> 'BRIEFING' -> 'PLAYING' -> 'GAMEOVER'
    this.selectedShip = 'viper'; // 'viper', 'titan', 'phantom'
    this.gameMode = 'campaign'; // 'campaign', 'endless', 'boss_rush'
    this.bootTimer = 0;
    this.bootStep = 0;
    this.bootMaxSteps = 5;
    this.briefingTimer = 0;
    this.briefingDuration = 2.2;

    // Screen Shake
    this.shake = 0;

    // Player State
    this.player = {
      x: this.width / 2,
      y: this.height - 80,
      targetX: this.width / 2,
      targetY: this.height - 80,
      vx: 0,
      vy: 0,
      speed: 360,
      radius: 16,
      tilt: 0, // for banking graphics
      hp: 100,
      maxHp: 100,
      shield: 100,
      maxShield: 100,
      shieldRegenTimer: 0,
      lives: 3,
      weaponTier: 1, // 1 to 4
      maxWeaponTier: 4,
      bombs: 2,
      maxBombs: 5,
      fireTimer: 0,
      fireRate: 0.12, // seconds per shot
      missileTimer: 0,
      invulnerableTimer: 2.0 // initial spawn shield
    };

    // Input state
    this.input = {
      left: false,
      right: false,
      up: false,
      down: false,
      fire: false,
      bomb: false,
      pointerActive: false,
      pointerX: this.width / 2,
      pointerY: this.height - 80
    };

    // Object Collections
    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];
    this.asteroids = [];
    this.boss = null;

    // Wave Spawner State
    this.waveSpawnQueue = [];
    this.spawnTimer = 0;
    this.totalWaveEnemies = 0;
    this.enemiesDefeated = 0;

    this.loadHighScore();
    this.setupWave(1);
  }

  setShip(shipId) {
    this.selectedShip = shipId;
    const p = this.player;
    if (shipId === 'titan') {
      p.maxHp = 150;
      p.hp = 150;
      p.maxShield = 150;
      p.shield = 150;
      p.speed = 280;
      p.weaponTier = 2; // Starts with Triple Vulcan
    } else if (shipId === 'phantom') {
      p.maxHp = 75;
      p.hp = 75;
      p.maxShield = 80;
      p.shield = 80;
      p.speed = 430;
      p.weaponTier = 3; // Starts with Piercing Beams
    } else {
      // Viper MK-I (Balanced)
      p.maxHp = 100;
      p.hp = 100;
      p.maxShield = 100;
      p.shield = 100;
      p.speed = 360;
      p.weaponTier = 1;
    }
  }

  startMission(mode = 'campaign') {
    this.gameMode = mode;
    this.resetGame();
    this.setShip(this.selectedShip);
    this.stageBannerTimer = 0; // the briefing screen already announces stage 1

    this.gameState = 'BRIEFING';
    this.briefingTimer = 0;
    if (this.audio) this.audio.playLaunchFanfare();
  }

  goToTitle() {
    this.gameState = 'TITLE';
    if (this.audio) this.audio.startBGM();
  }

  goToHangar() {
    this.gameState = 'HANGAR';
    if (this.audio) this.audio.playMenuSelect();
  }

  skipBoot() {
    this.gameState = 'TITLE';
    if (this.audio) this.audio.startBGM();
  }

  loadHighScore() {
    try {
      const saved = localStorage.getItem('nova_strike_highscore');
      this.highScore = saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      this.highScore = 0;
    }
  }

  saveHighScore() {
    try {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('nova_strike_highscore', this.highScore.toString());
      }
    } catch (e) {}
  }

  resetGame() {
    this.score = 0;
    this.wave = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.waveCleared = false;
    this.shake = 0;

    this.player.x = this.width / 2;
    this.player.y = this.height - 80;
    this.player.targetX = this.player.x;
    this.player.targetY = this.player.y;
    this.player.hp = 100;
    this.player.shield = 100;
    this.player.lives = 3;
    this.player.weaponTier = 1;
    this.player.bombs = 2;
    this.player.invulnerableTimer = 2.0;

    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];
    this.asteroids = [];
    this.boss = null;

    this.setupWave(1);
    if (this.audio) this.audio.startBGM();
  }

  // --- Stages & Waves ---

  /** Stage definition for a wave number, adjusted for the current game mode. */
  getStageInfo(waveNum = this.wave) {
    if (this.gameMode === 'boss_rush') {
      return { name: 'DREADNOUGHT', boss: true, idx: 4, lap: waveNum - 1 };
    }
    const idx = (waveNum - 1) % SPACE_STAGES.length;
    let stage = SPACE_STAGES[idx];
    let lap = Math.floor((waveNum - 1) / SPACE_STAGES.length);
    if (this.gameMode === 'endless') {
      // Endless: no breather stages, and difficulty ramps every 3 waves
      if (stage.bonus) stage = SPACE_STAGES[2];
      lap = Math.floor((waveNum - 1) / 3);
    }
    return Object.assign({ idx, lap }, stage);
  }

  setupWave(waveNum) {
    this.wave = waveNum;
    this.waveCleared = false;
    this.waveTransitionTimer = 0;
    this.enemies = [];
    this.waveSpawnQueue = [];
    this.spawnTimer = 0;
    this.boss = null;
    this.isBonusStage = false;
    this.bonusResult = null;
    this.stageBannerTimer = 2.2;

    const stage = this.getStageInfo(waveNum);
    this.stage = stage;
    this.difficulty = stage.lap;

    // Formation that the enemies fly into
    this.formation = { x: this.width / 2, y: 96, t: 0 };
    this.diveTimer = 3.0;

    if (stage.boss) {
      if (this.audio) this.audio.playBossAlert();
      this.shake = 15;
      const hp = 1200 + (waveNum * 400);
      const wingHp = 260 + waveNum * 70;
      this.boss = {
        x: this.width / 2,
        y: -100,
        targetY: 130,
        vx: 80,
        width: 140,
        height: 70,
        radius: 40,
        hp,
        maxHp: hp,
        phase: 1,
        fireTimer: 0,
        attackPattern: 0,
        stateTimer: 0,
        enraged: false,
        // Destructible wing pods shield the core until they are destroyed
        wings: [
          { side: -1, hp: wingHp, maxHp: wingHp, alive: true, flash: 0 },
          { side: 1, hp: wingHp, maxHp: wingHp, alive: true, flash: 0 }
        ],
        wingsAlive: true,
        hitFlash: 0
      };
      return;
    }

    if (stage.bonus) {
      this.setupBonusStage();
      return;
    }

    // Build the roster for this stage
    const count = Math.min(32, 16 + stage.lap * 4 + stage.idx * 2);
    const types = [];
    const roster = Object.entries(stage.roster);
    for (let i = 0; i < count; i++) {
      let r = Math.random(), type = roster[0][0];
      for (const [t, w] of roster) {
        if (r < w) { type = t; break; }
        r -= w;
      }
      types.push(type);
    }
    // Heavier ships take the back rows, like a Galaga formation
    const rank = { gunship: 0, striker: 1, scout: 2 };
    types.sort((a, b) => rank[a] - rank[b]);

    this.totalWaveEnemies = count;
    this.enemiesDefeated = 0;

    const cols = 8;
    const entries = ['left', 'right', 'topL', 'topR'];
    types.forEach((type, i) => {
      const row = Math.floor(i / cols), col = i % cols;
      const group = Math.floor(i / 4);
      this.waveSpawnQueue.push({
        type,
        delay: 1.0 + group * 1.5 + (i % 4) * 0.18,
        slot: { x: (col - (cols - 1) / 2) * 46, y: row * 34 },
        entry: entries[group % entries.length]
      });
    });

    const asteroidCount = Math.min(6, (stage.asteroids || 0) + stage.lap);
    for (let a = 0; a < asteroidCount; a++) {
      this.spawnAsteroid(false, Math.random() * (this.width - 60) + 30, -80 - a * 220);
    }
  }

  setupBonusStage() {
    this.isBonusStage = true;
    this.bonusHits = 0;
    const groups = 5, perGroup = 8;
    this.bonusTotal = groups * perGroup;
    this.totalWaveEnemies = this.bonusTotal;
    this.enemiesDefeated = 0;
    for (let g = 0; g < groups; g++) {
      for (let i = 0; i < perGroup; i++) {
        this.waveSpawnQueue.push({
          type: g % 2 === 0 ? 'scout' : 'striker',
          delay: 1.2 + g * 3.2 + i * 0.16,
          entry: 'bonus' + g,
          flyby: true
        });
      }
    }
  }

  /** Entry/flyby path control points. p3 = null means "fly to my formation slot". */
  entryPath(entry) {
    const W = this.width;
    const mirror = (pts) => pts.map(p => (p ? { x: W - p.x, y: p.y } : p));
    const paths = {
      left: [{ x: -30, y: 200 }, { x: 320, y: 620 }, { x: 40, y: 380 }, null],
      topL: [{ x: 160, y: -30 }, { x: 60, y: 440 }, { x: 420, y: 420 }, null],
      bonus0: [{ x: -30, y: 120 }, { x: 560, y: 160 }, { x: -80, y: 520 }, { x: W + 40, y: 560 }],
      bonus2: [{ x: W / 2, y: -30 }, { x: -140, y: 560 }, { x: W + 140, y: 560 }, { x: W / 2, y: -40 }],
      bonus3: [{ x: -30, y: 560 }, { x: W / 2, y: -220 }, { x: W / 2, y: 760 }, { x: W + 40, y: 100 }]
    };
    paths.right = mirror(paths.left);
    paths.topR = mirror(paths.topL);
    paths.bonus1 = mirror(paths.bonus0);
    paths.bonus4 = mirror(paths.bonus3);
    return paths[entry] || paths.left;
  }

  slotPosition(e) {
    const f = this.formation;
    // Gentle side-to-side sway plus a slow "breathing" spread
    const spread = 1 + Math.sin(f.t * 0.9) * 0.06;
    return {
      x: f.x + Math.sin(f.t * 0.5) * 34 + e.slot.x * spread,
      y: f.y + e.slot.y * spread
    };
  }

  spawnEnemy(spec) {
    const type = spec.type;
    const pts = this.entryPath(spec.entry);
    const enemy = {
      type,
      x: pts[0].x,
      y: pts[0].y,
      radius: type === 'gunship' ? 24 : (type === 'striker' ? 18 : 14),
      hp: type === 'gunship' ? 12 : (type === 'striker' ? 5 : 2),
      maxHp: type === 'gunship' ? 12 : (type === 'striker' ? 5 : 2),
      fireTimer: 2 + Math.random() * 3,
      fireRate: type === 'gunship' ? 3.6 : (type === 'striker' ? 5.5 : 8.0),
      color: type === 'gunship' ? '#ff0055' : (type === 'striker' ? '#ffaa00' : '#00ffff'),
      scoreValue: type === 'gunship' ? 250 : (type === 'striker' ? 120 : 60),
      slot: spec.slot || { x: 0, y: 0 },
      state: spec.flyby ? 'flyby' : 'enter',
      path: { pts, t: 0, dur: spec.flyby ? 3.4 : 2.4 },
      hitFlash: 0,
      t: Math.random() * Math.PI * 2
    };
    this.enemies.push(enemy);
  }

  startDive(e) {
    const side = e.x < this.width / 2 ? -1 : 1;
    const p = this.player;
    e.state = 'dive';
    e.shotsFired = 0;
    e.path = {
      pts: [
        { x: e.x, y: e.y },
        { x: e.x - side * 110, y: e.y - 80 },                       // loop up and out
        { x: p.x, y: p.y - 140 },                                     // swing toward the player
        { x: p.x + (Math.random() - 0.5) * 200, y: this.height + 50 } // and out the bottom
      ],
      t: 0,
      dur: Math.max(1.3, 2.2 - this.difficulty * 0.2)
    };
  }

  updateFormationAI(dt) {
    this.formation.t += dt;
    if (this.isBonusStage || this.boss) return;

    // Launch dive attacks once some of the wave has settled
    this.diveTimer -= dt;
    if (this.diveTimer > 0) return;
    const settled = this.enemies.filter(e => e.state === 'formation' && e.type !== 'gunship');
    const diving = this.enemies.filter(e => e.state === 'dive').length;
    const maxDivers = 1 + Math.min(3, this.difficulty + Math.floor(this.stage.idx / 2));
    if (settled.length && diving < maxDivers) {
      const leader = settled[Math.floor(Math.random() * settled.length)];
      this.startDive(leader);
      // Strikers bring a wingman along
      if (leader.type === 'striker') {
        const wingman = settled.find(e => e !== leader && Math.abs(e.slot.y - leader.slot.y) < 40 && Math.abs(e.slot.x - leader.slot.x) < 60);
        if (wingman) this.startDive(wingman);
      }
    }
    this.diveTimer = Math.max(0.5, 2.0 - this.difficulty * 0.3 - this.stage.idx * 0.2) + Math.random() * 0.8;
  }

  spawnAsteroid(isFragment, x, y) {
    const size = isFragment ? 14 : (22 + Math.random() * 10);
    // Generate random polygon vertices for jagged rock
    const points = [];
    const numPoints = 8;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const r = size * (0.75 + Math.random() * 0.45);
      points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }

    this.asteroids.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * (isFragment ? 90 : 35),
      vy: (isFragment ? 130 : 60) + Math.random() * 40,
      radius: size,
      hp: isFragment ? 2 : 6,
      maxHp: isFragment ? 2 : 6,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 2,
      points: points,
      isFragment: isFragment
    });
  }

  triggerNovaBomb() {
    if (this.player.bombs <= 0 || this.isGameOver || this.isPaused) return;
    this.player.bombs--;
    this.shake = 25;

    if (this.audio) this.audio.playNovaBomb();

    // Clear all enemy bullets
    this.enemyBullets = [];

    // Damage all enemies on screen
    this.enemies.forEach(enemy => {
      enemy.hp -= 15;
      this.createSparks(enemy.x, enemy.y, '#00ffff', 12);
    });

    // Damage asteroids
    this.asteroids.forEach(ast => {
      ast.hp -= 10;
      this.createSparks(ast.x, ast.y, '#aaaaaa', 8);
    });

    // Actually destroy whatever the blast killed
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].hp <= 0) this.destroyEnemy(this.enemies[i], i);
    }
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      if (this.asteroids[i].hp <= 0) this.destroyAsteroid(this.asteroids[i], i);
    }

    // Heavy damage to Boss (wing pods take a hit too)
    if (this.boss) {
      this.boss.wings.forEach(w => {
        if (!w.alive) return;
        w.hp -= 150;
        if (w.hp <= 0) this.destroyBossWing(w);
      });
      this.boss.hp -= this.boss.wingsAlive ? 120 : 350;
      this.createSparks(this.boss.x, this.boss.y, '#ff0055', 25);
      if (this.boss.hp <= 0) this.destroyBoss();
    }

    // Giant shockwave particle
    this.particles.push({
      type: 'shockwave',
      x: this.player.x,
      y: this.player.y,
      radius: 10,
      maxRadius: this.width * 1.2,
      color: '#00f0f0',
      alpha: 1.0,
      speed: 600
    });
  }

  // --- Main Update Loop (60 FPS dt in seconds) ---
  update(dt) {
    if (this.isPaused) return;

    // 1. BOOT SEQUENCE
    if (this.gameState === 'BOOT') {
      this.bootTimer += dt;
      if (this.bootTimer >= 0.35 && this.bootStep < this.bootMaxSteps) {
        this.bootTimer = 0;
        this.bootStep++;
        if (this.audio) this.audio.playBootBeep();
      }
      if (this.bootStep >= this.bootMaxSteps && this.bootTimer >= 0.7) {
        this.gameState = 'TITLE';
        if (this.audio) this.audio.startBGM();
      }
      return;
    }

    // 2. TITLE SCREEN or HANGAR
    if (this.gameState === 'TITLE' || this.gameState === 'HANGAR') {
      return;
    }

    // 3. SECTOR BRIEFING CUTSCENE
    if (this.gameState === 'BRIEFING') {
      this.briefingTimer += dt;
      if (this.briefingTimer >= this.briefingDuration) {
        this.gameState = 'PLAYING';
        if (this.audio) this.audio.startBGM();
      }
      return;
    }

    if (this.isGameOver) return;

    // Decay Screen Shake
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 45);
    }

    if (this.stageBannerTimer > 0) this.stageBannerTimer -= dt;

    // Combo Timer Decay
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // 1. Update Player
    this.updatePlayer(dt);

    // 2. Update Player Projectiles
    this.updatePlayerBullets(dt);

    // 3. Update Enemy Wave Spawning
    this.updateSpawner(dt);

    // 4. Update Enemies & Boss
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateAsteroids(dt);

    // 5. Update Enemy Projectiles
    this.updateEnemyBullets(dt);

    // 6. Update Power-ups
    this.updatePowerups(dt);

    // 7. Update Particles
    this.updateParticles(dt);

    // 8. Collision Detection
    this.checkCollisions();

    // 9. Check Wave Completion
    this.checkWaveProgress(dt);

    this.saveHighScore();
  }

  updatePlayer(dt) {
    const p = this.player;

    // Invulnerability timer
    if (p.invulnerableTimer > 0) {
      p.invulnerableTimer -= dt;
    }

    // Shield Regeneration
    p.shieldRegenTimer += dt;
    if (p.shieldRegenTimer >= 5.0 && p.shield < p.maxShield) {
      p.shield = Math.min(p.maxShield, p.shield + dt * 15);
    }

    // Movement: Keyboard or Pointer Follow
    let moveX = 0;
    let moveY = 0;

    if (this.input.left) moveX -= 1;
    if (this.input.right) moveX += 1;
    if (this.input.up) moveY -= 1;
    if (this.input.down) moveY += 1;

    if (this.input.pointerActive) {
      // Lerp smoothly towards mouse/touch cursor
      const dx = this.input.pointerX - p.x;
      const dy = this.input.pointerY - p.y;
      p.x += dx * Math.min(1.0, dt * 14);
      p.y += dy * Math.min(1.0, dt * 14);
      p.tilt = Math.max(-1, Math.min(1, dx / 40));
    } else {
      p.vx = moveX * p.speed;
      p.vy = moveY * p.speed;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Banking tilt based on velocity
      const targetTilt = moveX;
      p.tilt += (targetTilt - p.tilt) * dt * 12;
    }

    // Constrain within bounds
    p.x = Math.max(p.radius + 8, Math.min(this.width - p.radius - 8, p.x));
    p.y = Math.max(p.radius + 20, Math.min(this.height - p.radius - 12, p.y));

    // Engine thruster flame particles
    if (Math.random() < 0.8) {
      this.particles.push({
        type: 'flame',
        x: p.x + (Math.random() - 0.5) * 8,
        y: p.y + p.radius + 2,
        vx: (Math.random() - 0.5) * 25,
        vy: 120 + Math.random() * 80,
        radius: 3 + Math.random() * 2.5,
        color: Math.random() > 0.4 ? '#00f0f0' : '#ffffff',
        alpha: 0.9,
        life: 0.2
      });
    }

    // Firing Weapons
    p.fireTimer -= dt;
    if ((this.input.fire || this.input.pointerActive) && p.fireTimer <= 0) {
      this.firePlayerWeapon();
      p.fireTimer = p.fireRate;
    }

    // Homing micro-missiles (Tier 4 perk)
    if (p.weaponTier >= 4) {
      p.missileTimer -= dt;
      if (p.missileTimer <= 0) {
        this.fireHomingMissiles();
        p.missileTimer = 0.8;
      }
    }

    // Nova Bomb input
    if (this.input.bomb) {
      this.input.bomb = false;
      this.triggerNovaBomb();
    }
  }

  firePlayerWeapon() {
    const p = this.player;
    if (this.audio) this.audio.playLaser(p.weaponTier);

    if (p.weaponTier === 1) {
      // Dual Blaster
      this.playerBullets.push({ x: p.x - 7, y: p.y - 14, vx: 0, vy: -650, radius: 3, damage: 1, color: '#00f0f0' });
      this.playerBullets.push({ x: p.x + 7, y: p.y - 14, vx: 0, vy: -650, radius: 3, damage: 1, color: '#00f0f0' });
    } else if (p.weaponTier === 2) {
      // Triple Vulcan Spread
      this.playerBullets.push({ x: p.x, y: p.y - 16, vx: 0, vy: -680, radius: 3.5, damage: 1.2, color: '#00ffff' });
      this.playerBullets.push({ x: p.x - 10, y: p.y - 12, vx: -110, vy: -650, radius: 3, damage: 1, color: '#00ffff' });
      this.playerBullets.push({ x: p.x + 10, y: p.y - 12, vx: 110, vy: -650, radius: 3, damage: 1, color: '#00ffff' });
    } else if (p.weaponTier === 3) {
      // Quad Piercing Heavy Beams
      [-12, -4, 4, 12].forEach((offset, idx) => {
        this.playerBullets.push({
          x: p.x + offset,
          y: p.y - 16,
          vx: (idx - 1.5) * 35,
          vy: -720,
          radius: 3.5,
          damage: 1.5,
          color: '#33ffaa',
          piercing: true,
          pierceCount: 2
        });
      });
    } else {
      // Tier 4: 5-Way Hyper Spread
      const angles = [-0.35, -0.17, 0, 0.17, 0.35];
      angles.forEach(ang => {
        this.playerBullets.push({
          x: p.x + Math.sin(ang) * 12,
          y: p.y - 16,
          vx: Math.sin(ang) * 650,
          vy: -Math.cos(ang) * 680,
          radius: 4,
          damage: 1.6,
          color: '#ff33ff'
        });
      });
    }
  }

  fireHomingMissiles() {
    const p = this.player;
    if (this.audio) this.audio.playMissile();

    [-14, 14].forEach(offset => {
      this.playerBullets.push({
        x: p.x + offset,
        y: p.y,
        vx: offset * 4,
        vy: -180,
        radius: 4.5,
        damage: 4,
        color: '#ffff00',
        isMissile: true,
        target: null,
        trailTimer: 0
      });
    });
  }

  updatePlayerBullets(dt) {
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];

      // Homing Missile logic
      if (b.isMissile) {
        if (!b.target || b.target.hp <= 0) {
          // Find closest enemy or boss
          let closest = null;
          let minDist = 99999;
          this.enemies.forEach(e => {
            const dist = Math.hypot(e.x - b.x, e.y - b.y);
            if (dist < minDist) {
              minDist = dist;
              closest = e;
            }
          });
          if (this.boss && Math.hypot(this.boss.x - b.x, this.boss.y - b.y) < minDist) {
            closest = this.boss;
          }
          b.target = closest;
        }

        if (b.target) {
          const angle = Math.atan2(b.target.y - b.y, b.target.x - b.x);
          const currentSpeed = 480;
          b.vx += (Math.cos(angle) * currentSpeed - b.vx) * dt * 7;
          b.vy += (Math.sin(angle) * currentSpeed - b.vy) * dt * 7;
        }

        // Missile smoke trail
        b.trailTimer = (b.trailTimer || 0) + dt;
        if (b.trailTimer > 0.04) {
          b.trailTimer = 0;
          this.particles.push({
            type: 'spark',
            x: b.x,
            y: b.y + 4,
            vx: (Math.random() - 0.5) * 20,
            vy: 40 + Math.random() * 30,
            radius: 2,
            color: '#ffaa00',
            alpha: 0.8,
            life: 0.18
          });
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Remove out of bounds
      if (b.y < -20 || b.y > this.height + 20 || b.x < -20 || b.x > this.width + 20) {
        this.playerBullets.splice(i, 1);
      }
    }
  }

  updateSpawner(dt) {
    if (this.boss || this.waveSpawnQueue.length === 0) return;

    this.spawnTimer += dt;
    while (this.waveSpawnQueue.length > 0 && this.spawnTimer >= this.waveSpawnQueue[0].delay) {
      this.spawnEnemy(this.waveSpawnQueue.shift());
    }
  }

  updateEnemies(dt) {
    this.updateFormationAI(dt);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.t += dt * 2.5;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      if (e.state === 'formation') {
        const s = this.slotPosition(e);
        e.x = s.x;
        e.y = s.y;
      } else {
        // Follow the current bezier path (entry, dive, return or bonus flyby)
        const path = e.path;
        path.t = Math.min(1, path.t + dt / path.dur);
        const p3 = path.pts[3] || this.slotPosition(e);
        const pos = bezierPoint(path.pts[0], path.pts[1], path.pts[2], p3, path.t);
        e.x = pos.x;
        e.y = pos.y;

        if (path.t >= 1) {
          if (e.state === 'flyby') {
            // Bonus-stage target escaped
            this.enemies.splice(i, 1);
            continue;
          }
          if (e.state === 'dive') {
            // Wrap around: re-enter from the top and fly back to the formation slot
            const s = this.slotPosition(e);
            e.state = 'return';
            e.x = s.x;
            e.y = -40;
            e.path = { pts: [{ x: s.x, y: -40 }, { x: s.x, y: 30 }, { x: s.x, y: s.y - 40 }, null], t: 0, dur: 1.4 };
          } else {
            e.state = 'formation';
          }
        }
      }

      // Firing: divers shoot on the way down, the formation fires occasionally
      if (e.state === 'dive') {
        const shots = e.type === 'striker' ? 2 : 1;
        if (e.shotsFired < shots && e.path.t > 0.3 + e.shotsFired * 0.2 && e.y < this.player.y - 60) {
          e.shotsFired++;
          this.fireEnemyWeapon(e);
        }
      } else if (e.state === 'formation') {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = (e.fireRate * (0.7 + Math.random() * 0.6)) / (1 + this.difficulty * 0.25);
          this.fireEnemyWeapon(e);
        }
      }
    }
  }

  fireEnemyWeapon(e) {
    if (this.audio) this.audio.playEnemyShoot();

    if (e.type === 'gunship') {
      // 5-way downward fan
      for (let k = -2; k <= 2; k++) {
        const ang = Math.PI / 2 + k * 0.28;
        this.enemyBullets.push({
          x: e.x,
          y: e.y + e.radius,
          vx: Math.cos(ang) * 170,
          vy: Math.sin(ang) * 170,
          radius: 3.5,
          color: '#ff0055'
        });
      }
    } else {
      // Aimed laser bullet at player
      const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      const speed = 210 + (this.wave * 12);
      this.enemyBullets.push({
        x: e.x,
        y: e.y + e.radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3,
        color: '#ff3333'
      });
    }
  }

  updateBoss(dt) {
    const b = this.boss;
    if (!b) return;

    b.stateTimer += dt;
    if (b.hitFlash > 0) b.hitFlash -= dt;
    b.wings.forEach(w => { if (w.flash > 0) w.flash -= dt; });

    // Entry slide-in
    if (b.y < b.targetY) {
      b.y += dt * 90;
      return;
    }

    // Horizontal oscillation
    b.x += b.vx * dt;
    if (b.x < 100) {
      b.x = 100;
      b.vx = Math.abs(b.vx);
    } else if (b.x > this.width - 100) {
      b.x = this.width - 100;
      b.vx = -Math.abs(b.vx);
    }

    // Enrage phase under 40% HP or once both wing pods are gone
    if ((b.hp < b.maxHp * 0.4 || !b.wingsAlive) && !b.enraged) {
      b.enraged = true;
      b.vx *= 1.4;
      this.shake = 10;
    }

    // Boss Attack Patterns
    b.fireTimer -= dt;
    if (b.fireTimer <= 0) {
      b.fireTimer = b.enraged ? 0.65 : 1.1;
      b.attackPattern = (b.attackPattern + 1) % 3;

      if (this.audio) this.audio.playEnemyShoot();

      if (b.attackPattern === 0) {
        // Spread fire from each surviving wing pod (the core fires a smaller fan once they're gone)
        const guns = b.wingsAlive ? b.wings.filter(w => w.alive).map(w => w.side * 68) : [0];
        guns.forEach(wingOffset => {
          for (let a = -0.3; a <= 0.3; a += 0.2) {
            this.enemyBullets.push({
              x: b.x + wingOffset,
              y: b.y + 25,
              vx: Math.sin(a) * 220,
              vy: Math.cos(a) * 220,
              radius: 4,
              color: '#ffaa00'
            });
          }
        });
      } else if (b.attackPattern === 1) {
        // Aimed heavy pulse barrage
        const angle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
        for (let s = -1; s <= 1; s++) {
          this.enemyBullets.push({
            x: b.x,
            y: b.y + 35,
            vx: Math.cos(angle + s * 0.15) * 260,
            vy: Math.sin(angle + s * 0.15) * 260,
            radius: 4.5,
            color: '#ff0055'
          });
        }
      } else {
        // Spiral curtain
        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * Math.PI * 2 + b.stateTimer * 2;
          this.enemyBullets.push({
            x: b.x,
            y: b.y + 20,
            vx: Math.cos(ang) * 180,
            vy: Math.sin(ang) * 180,
            radius: 3.5,
            color: '#00ffff'
          });
        }
      }
    }
  }

  updateAsteroids(dt) {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.vRot * dt;

      if (a.y > this.height + 50) {
        this.asteroids.splice(i, 1);
      }
    }
  }

  updateEnemyBullets(dt) {
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.y > this.height + 20 || b.y < -20 || b.x < -20 || b.x > this.width + 20) {
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  updatePowerups(dt) {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += p.vy * dt;
      p.pulse = (p.pulse || 0) + dt * 4;

      // Magnetic attraction to player if within 90px
      const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
      if (dist < 90) {
        p.x += (this.player.x - p.x) * dt * 4;
        p.y += (this.player.y - p.y) * dt * 4;
      }

      if (p.y > this.height + 30) {
        this.powerups.splice(i, 1);
      }
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];

      if (pt.type === 'shockwave') {
        pt.radius += pt.speed * dt;
        pt.alpha = Math.max(0, 1.0 - (pt.radius / pt.maxRadius));
        if (pt.radius >= pt.maxRadius) {
          this.particles.splice(i, 1);
        }
      } else {
        pt.x += (pt.vx || 0) * dt;
        pt.y += (pt.vy || 0) * dt;
        pt.life -= dt;
        pt.alpha = Math.max(0, pt.life * 3.5);
        if (pt.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }
  }

  // --- Collision Detection ---
  checkCollisions() {
    const p = this.player;

    // 1. Player Bullets vs Enemies
    for (let bIdx = this.playerBullets.length - 1; bIdx >= 0; bIdx--) {
      const b = this.playerBullets[bIdx];
      let bulletHit = false;

      // Check vs normal enemies
      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const e = this.enemies[eIdx];
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
          e.hp -= b.damage;
          e.hitFlash = 0.06;
          this.createSparks(b.x, b.y, b.color, 4);

          if (e.hp <= 0) {
            this.destroyEnemy(e, eIdx);
          }
          bulletHit = true;
          break;
        }
      }

      // Check vs Boss: wing pods first, then the core (armoured while any wing survives)
      if (!bulletHit && this.boss) {
        const boss = this.boss;
        for (const w of boss.wings) {
          if (!w.alive) continue;
          if (Math.hypot(b.x - (boss.x + w.side * 68), b.y - (boss.y + 4)) < b.radius + 26) {
            w.hp -= b.damage;
            w.flash = 0.06;
            this.createSparks(b.x, b.y, '#ffaa00', 3);
            bulletHit = true;
            if (w.hp <= 0) this.destroyBossWing(w);
            break;
          }
        }
        if (!bulletHit && Math.hypot(b.x - boss.x, b.y - boss.y) < b.radius + boss.radius) {
          const shielded = boss.wingsAlive;
          boss.hp -= b.damage * (shielded ? 0.35 : 1);
          boss.hitFlash = 0.06;
          this.createSparks(b.x, b.y, shielded ? '#888888' : '#ff0055', 3);
          bulletHit = true;

          if (boss.hp <= 0) {
            this.destroyBoss();
          }
        }
      }

      // Check vs Asteroids
      if (!bulletHit) {
        for (let aIdx = this.asteroids.length - 1; aIdx >= 0; aIdx--) {
          const ast = this.asteroids[aIdx];
          if (Math.hypot(b.x - ast.x, b.y - ast.y) < b.radius + ast.radius) {
            ast.hp -= b.damage;
            this.createSparks(b.x, b.y, '#cccccc', 4);
            bulletHit = true;

            if (ast.hp <= 0) {
              this.destroyAsteroid(ast, aIdx);
            }
            break;
          }
        }
      }

      if (bulletHit) {
        if (b.piercing) {
          b.pierceCount--;
          if (b.pierceCount <= 0) this.playerBullets.splice(bIdx, 1);
        } else {
          this.playerBullets.splice(bIdx, 1);
        }
      }
    }

    // 2. Enemy Bullets vs Player
    if (p.invulnerableTimer <= 0 && !this.isGameOver) {
      for (let bIdx = this.enemyBullets.length - 1; bIdx >= 0; bIdx--) {
        const b = this.enemyBullets[bIdx];
        if (Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius) {
          this.damagePlayer(15);
          this.enemyBullets.splice(bIdx, 1);
          break;
        }
      }

      // 3. Enemy Ship Collision vs Player (Kamikaze / Collision)
      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const e = this.enemies[eIdx];
        if (e.state === 'flyby') continue; // bonus-stage targets never attack
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
          this.damagePlayer(25);
          this.destroyEnemy(e, eIdx);
          break;
        }
      }

      // 4. Asteroids vs Player
      for (let aIdx = this.asteroids.length - 1; aIdx >= 0; aIdx--) {
        const ast = this.asteroids[aIdx];
        if (Math.hypot(ast.x - p.x, ast.y - p.y) < ast.radius + p.radius) {
          this.damagePlayer(30);
          this.destroyAsteroid(ast, aIdx);
          break;
        }
      }
    }

    // 5. Player vs Power-ups
    for (let pIdx = this.powerups.length - 1; pIdx >= 0; pIdx--) {
      const pu = this.powerups[pIdx];
      if (Math.hypot(pu.x - p.x, pu.y - p.y) < p.radius + pu.radius) {
        this.collectPowerup(pu);
        this.powerups.splice(pIdx, 1);
      }
    }
  }

  damagePlayer(amount) {
    const p = this.player;
    this.shake = 12;
    p.shieldRegenTimer = 0; // reset regen delay

    if (p.shield > 0) {
      if (this.audio) this.audio.playShieldHit();
      p.shield -= amount;
      if (p.shield < 0) {
        p.hp += p.shield; // overflow damage hits hull
        p.shield = 0;
      }
    } else {
      if (this.audio) this.audio.playExplosion('small');
      p.hp -= amount;
    }

    this.createSparks(p.x, p.y, '#00f0f0', 8);

    // Reset combo
    this.combo = 0;

    // Check Player Death
    if (p.hp <= 0) {
      this.killPlayer();
    }
  }

  killPlayer() {
    const p = this.player;
    p.lives--;
    this.shake = 22;
    if (this.audio) this.audio.playExplosion('medium');

    this.createExplosionParticles(p.x, p.y, '#00f0f0', 35);

    if (p.lives <= 0) {
      this.isGameOver = true;
      this.gameState = 'GAMEOVER';
      if (this.audio) this.audio.stopBGM();
    } else {
      // Respawn with invulnerability
      p.hp = p.maxHp;
      p.shield = p.maxShield;
      p.x = this.width / 2;
      p.y = this.height - 80;
      p.invulnerableTimer = 3.0;
      // Slight weapon downgrade on death
      p.weaponTier = Math.max(1, p.weaponTier - 1);
    }
  }

  destroyEnemy(enemy, index) {
    this.enemies.splice(index, 1);
    this.enemiesDefeated++;

    // Add Score with Combo Multiplier
    this.combo++;
    this.comboTimer = 3.0;
    const mult = Math.min(5, 1 + Math.floor(this.combo / 4));
    // Divers are worth double, like in Galaga
    const points = enemy.scoreValue * mult * (enemy.state === 'dive' ? 2 : 1);
    this.score += points;
    this.addScoreText(enemy.x, enemy.y, String(points), enemy.state === 'dive' ? '#fcfc00' : '#ffffff');
    if (this.isBonusStage) this.bonusHits++;

    if (this.audio) this.audio.playExplosion(enemy.type === 'gunship' ? 'medium' : 'small');
    this.createExplosionParticles(enemy.x, enemy.y, enemy.color, enemy.type === 'gunship' ? 24 : 14);

    // Chance to drop power-up (none during the bonus stage)
    const dropChance = this.isBonusStage ? 0 : (enemy.type === 'gunship' ? 0.85 : 0.12);
    if (Math.random() < dropChance) {
      this.spawnPowerup(enemy.x, enemy.y);
    }
  }

  addScoreText(x, y, text, color = '#ffffff') {
    this.particles.push({ type: 'text', x, y, vx: 0, vy: -40, text, color, life: 0.8 });
  }

  destroyBossWing(w) {
    const b = this.boss;
    w.alive = false;
    b.wingsAlive = b.wings.some(wing => wing.alive);
    const wx = b.x + w.side * 68;
    this.score += 2000;
    this.addScoreText(wx, b.y, '2000', '#fcfc00');
    this.shake = 18;
    if (this.audio) this.audio.playExplosion('medium');
    this.createExplosionParticles(wx, b.y, '#ffaa00', 28);
    this.spawnPowerup(wx, b.y + 20);
  }

  destroyBoss() {
    const b = this.boss;
    this.score += 5000 * this.wave;
    this.shake = 30;
    if (this.audio) this.audio.playExplosion('boss');

    // Massive fireworks explosions
    for (let k = 0; k < 6; k++) {
      setTimeout(() => {
        this.createExplosionParticles(
          b.x + (Math.random() - 0.5) * 80,
          b.y + (Math.random() - 0.5) * 40,
          '#ffaa00',
          30
        );
      }, k * 120);
    }

    // Drop guaranteed power-ups
    this.spawnPowerup(b.x - 30, b.y, 'weapon');
    this.spawnPowerup(b.x + 30, b.y, 'shield');
    this.spawnPowerup(b.x, b.y + 20, 'bomb');

    this.boss = null;
    this.waveCleared = true;
  }

  destroyAsteroid(ast, index) {
    this.asteroids.splice(index, 1);
    this.score += ast.isFragment ? 30 : 60;
    if (this.audio) this.audio.playExplosion('small');
    this.createExplosionParticles(ast.x, ast.y, '#999999', ast.isFragment ? 8 : 16);

    // If large asteroid, split into 2 fragments!
    if (!ast.isFragment) {
      this.spawnAsteroid(true, ast.x - 10, ast.y);
      this.spawnAsteroid(true, ast.x + 10, ast.y);
    }
  }

  spawnPowerup(x, y, forcedType = null) {
    const types = ['weapon', 'shield', 'bomb', 'health', 'score'];
    const weights = [0.4, 0.25, 0.15, 0.1, 0.1];
    let type = forcedType;

    if (!type) {
      const r = Math.random();
      let sum = 0;
      for (let i = 0; i < types.length; i++) {
        sum += weights[i];
        if (r <= sum) {
          type = types[i];
          break;
        }
      }
    }

    this.powerups.push({
      type: type || 'weapon',
      x: x,
      y: y,
      vy: 75,
      radius: 12
    });
  }

  collectPowerup(pu) {
    if (this.audio) this.audio.playPowerUp();
    this.createSparks(pu.x, pu.y, '#ffffff', 10);

    const p = this.player;
    if (pu.type === 'weapon') {
      if (p.weaponTier < p.maxWeaponTier) {
        p.weaponTier++;
      } else {
        this.score += 1000; // bonus if maxed
      }
    } else if (pu.type === 'shield') {
      p.shield = p.maxShield;
    } else if (pu.type === 'bomb') {
      p.bombs = Math.min(p.maxBombs, p.bombs + 1);
    } else if (pu.type === 'health') {
      p.hp = Math.min(p.maxHp, p.hp + 35);
    } else if (pu.type === 'score') {
      this.score += 500;
    }
  }

  checkWaveProgress(dt) {
    if (this.waveCleared) {
      this.waveTransitionTimer += dt;
      if (this.waveTransitionTimer >= 2.5) {
        this.setupWave(this.wave + 1);
      }
      return;
    }

    // Normal wave clear condition: all queued enemies spawned and defeated
    if (!this.boss && this.waveSpawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveCleared = true;
      this.waveTransitionTimer = 0;
      if (this.isBonusStage) {
        const perfect = this.bonusHits === this.bonusTotal;
        const bonus = perfect ? 10000 : this.bonusHits * 100;
        this.score += bonus;
        this.bonusResult = { hits: this.bonusHits, total: this.bonusTotal, bonus, perfect };
        this.waveTransitionTimer = -1.0; // linger a little longer on the results
      } else {
        this.score += 1000 * this.wave;
      }
    }
  }

  createSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 120;
      this.particles.push({
        type: 'spark',
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: 1.5 + Math.random() * 2,
        color: color,
        alpha: 1.0,
        life: 0.2 + Math.random() * 0.2
      });
    }
  }

  createExplosionParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 220;
      this.particles.push({
        type: 'debris',
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: 2 + Math.random() * 3.5,
        color: Math.random() > 0.3 ? color : '#ffffff',
        alpha: 1.0,
        life: 0.35 + Math.random() * 0.35
      });
    }
  }
}

window.SpaceEngine = SpaceEngine;
