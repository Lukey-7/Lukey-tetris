/**
 * Retro Classic Tetris - 8-Bit Web Audio API Synthesizer
 * Zero external audio files required. Generates authentic chiptune music & sound effects.
 */

class RetroAudio {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    
    this.isMuted = false;
    this.bgmVolume = 0.3;
    this.sfxVolume = 0.55;
    
    this.isPlayingBGM = false;
    this.bgmTimer = null;
    this.currentStep = 0;
    this.tempo = 136; // BPM (speeds up with levels)
    
    this.initMelody();
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
  }

  setBGMVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
  }

  setSFXVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  setTempoByLevel(level) {
    // Standard starting tempo 136 BPM, increases with level up to 215 BPM
    this.tempo = Math.min(215, 136 + (level - 1) * 6);
  }

  // --- Sound Effects ---

  playTone(freq, type = 'square', duration = 0.08, gainStart = 0.3, gainEnd = 0.001) {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(gainStart, now);
    gain.gain.exponentialRampToValueAtTime(gainEnd, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  playMove() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.035);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.035);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  playRotate() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(580, now + 0.06);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playSoftDrop() {
    this.playTone(180, 'square', 0.03, 0.15, 0.01);
  }

  playHardDrop() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.09);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playHold() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    [400, 600].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.25, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.04 + 0.06);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.06);
    });
  }

  playLineClear(lines = 1) {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    if (lines === 4) {
      this.playTetrisFanfare();
      return;
    }

    const chords = {
      1: [523.25, 659.25],          // C5, E5
      2: [523.25, 659.25, 783.99],   // C5, E5, G5
      3: [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    };

    const notes = chords[lines] || chords[1];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.3, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.15);
    });
  }

  playTetrisFanfare() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const fanfareNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];

    fanfareNotes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + i * 0.06;
      const dur = i === fanfareNotes.length - 1 ? 0.4 : 0.09;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.4, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + dur);
    });
  }

  playLevelUp() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73];

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + i * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.4, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.12);
    });
  }

  playGameOver() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const sadNotes = [392.00, 369.99, 349.23, 329.63, 293.66, 261.63, 220.00];

    sadNotes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + i * 0.12;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.35, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.18);
    });
  }

  playBreakChime() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 -> E5 -> G5 -> C6 happy bell
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.4, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    });
  }

  // --- Chiptune BGM Sequencer ---

  initMelody() {
    const N = {
      REST: 0,
      A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, FS4: 369.99, G4: 392.00,
      GS4: 415.30, A4: 440.00, B4: 493.88, C5: 523.25, CS5: 554.37, D5: 587.33, DS5: 622.25, E5: 659.25,
      F5: 698.46, FS5: 739.99, G5: 783.99, GS5: 830.61, A5: 880.00, B5: 987.77, C6: 1046.50
    };

    // Track 1: Theme A (Korobeiniki)
    this.trackA = [
      [N.E5, 4], [N.B4, 2], [N.C5, 2], [N.D5, 4], [N.C5, 2], [N.B4, 2],
      [N.A4, 4], [N.A4, 2], [N.C5, 2], [N.E5, 4], [N.D5, 2], [N.C5, 2],
      [N.B4, 6], [N.C5, 2], [N.D5, 4], [N.E5, 4],
      [N.C5, 4], [N.A4, 4], [N.A4, 6], [N.REST, 2],
      [N.D5, 4], [N.F5, 2], [N.A5, 4], [N.G5, 2], [N.F5, 2],
      [N.E5, 6], [N.C5, 2], [N.E5, 4], [N.D5, 2], [N.C5, 2],
      [N.B4, 4], [N.B4, 2], [N.C5, 2], [N.D5, 4], [N.E5, 4],
      [N.C5, 4], [N.A4, 4], [N.A4, 6], [N.REST, 2]
    ];

    // Track 2: Theme B (Troika / Russian Dance)
    this.trackB = [
      [N.D5, 2], [N.FS5, 2], [N.A5, 4], [N.G5, 2], [N.FS5, 2], [N.E5, 4],
      [N.D5, 2], [N.E5, 2], [N.FS5, 4], [N.E5, 4], [N.D5, 4],
      [N.A4, 2], [N.D5, 2], [N.FS5, 4], [N.A5, 4], [N.G5, 4],
      [N.FS5, 2], [N.E5, 2], [N.D5, 4], [N.D5, 6], [N.REST, 2],
      [N.FS5, 2], [N.A5, 2], [N.B5, 4], [N.A5, 2], [N.G5, 2], [N.FS5, 4],
      [N.E5, 2], [N.FS5, 2], [N.G5, 4], [N.FS5, 4], [N.E5, 4],
      [N.D5, 2], [N.FS5, 2], [N.A5, 4], [N.G5, 2], [N.FS5, 2], [N.E5, 4],
      [N.D5, 2], [N.E5, 2], [N.D5, 4], [N.D5, 6], [N.REST, 2]
    ];

    // Track 3: Theme C (Bradinsky / Retro Arcade)
    this.trackC = [
      [N.C5, 2], [N.E5, 2], [N.G5, 2], [N.C6, 2], [N.B5, 2], [N.G5, 2], [N.E5, 2], [N.C5, 2],
      [N.D5, 2], [N.F5, 2], [N.A5, 2], [N.D6, 2], [N.C6, 2], [N.A5, 2], [N.F5, 2], [N.D5, 2],
      [N.G4, 2], [N.B4, 2], [N.D5, 2], [N.G5, 2], [N.F5, 2], [N.D5, 2], [N.B4, 2], [N.G4, 2],
      [N.C5, 4], [N.E5, 4], [N.C5, 6], [N.REST, 2]
    ];

    this.currentTrackName = 'themeA';
    this.leadTrack = this.trackA;
  }

  setTrack(trackName) {
    this.currentTrackName = trackName;
    if (trackName === 'themeB') {
      this.leadTrack = this.trackB;
    } else if (trackName === 'themeC') {
      this.leadTrack = this.trackC;
    } else {
      this.leadTrack = this.trackA;
    }
    this.currentStep = 0;
  }

  startBGM() {
    this.init();
    this.resume();
    if (this.isPlayingBGM) return;
    this.isPlayingBGM = true;
    this.currentStep = 0;
    this.scheduleNextNote();
  }

  stopBGM() {
    this.isPlayingBGM = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  scheduleNextNote() {
    if (!this.isPlayingBGM || !this.ctx) return;

    const sixteenthDuration = (60 / this.tempo) / 4;
    const now = this.ctx.currentTime;

    const [freq, durationInSixteenths] = this.leadTrack[this.currentStep % this.leadTrack.length];
    const noteDuration = durationInSixteenths * sixteenthDuration;

    if (freq > 0 && !this.isMuted) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + noteDuration * 0.9);

      osc.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(now);
      osc.stop(now + noteDuration * 0.92);
    }

    this.currentStep++;
    this.bgmTimer = setTimeout(() => {
      this.scheduleNextNote();
    }, noteDuration * 1000);
  }
}

window.RetroAudio = RetroAudio;
