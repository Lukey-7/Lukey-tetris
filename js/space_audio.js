/**
 * Nova Strike: 1989 - NES-Style Chiptune Engine
 * 100% synthesized audio - zero external assets.
 *
 * Four voices modelled on the classic console sound chip:
 *   pulse1   - lead melody (25% duty pulse)
 *   pulse2   - harmony / arpeggios (12.5% duty pulse)
 *   triangle - bass
 *   noise    - drums (k = kick, s = snare, h = hi-hat)
 *
 * Songs are written in a tiny tracker format: one token per 16th note.
 *   "A4"  note on (sharps as "C#5")    "-"  hold previous note    "."  rest
 * Notes are scheduled ahead of time against the AudioContext clock, so timing
 * stays tight even when the page is busy.
 */

const CHIP_SONGS = {
  // Heroic anthem for the title screen and hangar (C major, I-vi-IV-V)
  title: {
    bpm: 112,
    pulse1: [
      'G4 - - - C5 - - - E5 - - D5 C5 - - -',
      'A4 - - - C5 - - - E5 - - - D5 - - -',
      'F4 - - - A4 - C5 - F5 - - E5 D5 - C5 -',
      'D5 - - - - - - - B4 - - - G4 - - -',
      'G4 - - - C5 - - - E5 - - D5 C5 - - -',
      'A4 - - - E5 - - - A5 - - G5 E5 - - -',
      'F5 - - - E5 - - - D5 - - - C5 - D5 -',
      'G4 - - - B4 - D5 - G5 - - - - - - -'
    ],
    pulse2: [
      'C4 - E4 - G4 - E4 - C4 - E4 - G4 - E4 -',
      'A3 - C4 - E4 - C4 - A3 - C4 - E4 - C4 -',
      'F3 - A3 - C4 - A3 - F3 - A3 - C4 - A3 -',
      'G3 - B3 - D4 - B3 - G3 - B3 - D4 - B3 -',
      'C4 - E4 - G4 - E4 - C4 - E4 - G4 - E4 -',
      'A3 - C4 - E4 - C4 - A3 - C4 - E4 - C4 -',
      'F3 - A3 - C4 - A3 - F3 - A3 - C4 - A3 -',
      'G3 - B3 - D4 - B3 - G3 - B3 - D4 - B3 -'
    ],
    triangle: [
      'C3 - - - - - - - G2 - - - - - - -',
      'A2 - - - - - - - E2 - - - - - - -',
      'F2 - - - - - - - C3 - - - - - - -',
      'G2 - - - - - - - D3 - - - - - - -',
      'C3 - - - - - - - G2 - - - - - - -',
      'A2 - - - - - - - E2 - - - - - - -',
      'F2 - - - - - - - C3 - - - - - - -',
      'G2 - - - - - - - G2 . G2 . B2 . D3 .'
    ],
    noise: [
      'k . . . h . . . s . . . h . . .',
      'k . . . h . . . s . . . h . . .',
      'k . . . h . . . s . . . h . . .',
      'k . . . h . . . s . . . h . h .',
      'k . . . h . . . s . . . h . . .',
      'k . . . h . . . s . . . h . . .',
      'k . . . h . . . s . . . h . . .',
      'k . . . s . . . s . s . s s s s'
    ]
  },

  // Driving stage theme (A minor, i-VI-III-VII)
  stage: {
    bpm: 150,
    pulse1: [
      'E5 - - E5 D5 - C5 - D5 - E5 - - - A4 -',
      'C5 - - C5 D5 - E5 - F5 - E5 - D5 - C5 -',
      'G4 - - G4 C5 - E5 - G5 - - - F5 - E5 -',
      'D5 - - - B4 - - - G4 - A4 - B4 - D5 -',
      'A5 - - - G5 - E5 - G5 - - - E5 - D5 -',
      'C5 - D5 - E5 - - - F5 - E5 - D5 - C5 -',
      'E5 - - - G5 - C6 - B5 - G5 - E5 - G5 -',
      'B5 - - - A5 - G5 - D5 - - - E5 - - -'
    ],
    pulse2: [
      '. . . . . . . . . . . . . . . .',
      '. . . . . . . . . . . . . . . .',
      '. . . . . . . . . . . . . . . .',
      '. . . . . . . . G4 . B4 . D5 . G5 .',
      'A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5',
      'F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4',
      'E4 G4 C5 G4 E4 G4 C5 G4 E4 G4 C5 G4 E4 G4 C5 G4',
      'D4 G4 B4 G4 D4 G4 B4 G4 D4 G4 B4 G4 D4 G4 B4 G4'
    ],
    triangle: [
      'A2 . A3 . A2 . A3 . A2 . A3 . G2 . A3 .',
      'F2 . F3 . F2 . F3 . F2 . F3 . E2 . F3 .',
      'C3 . C4 . C3 . C4 . C3 . C4 . B2 . C4 .',
      'G2 . G3 . G2 . G3 . G2 . G3 . D3 . G3 .',
      'A2 . A3 . A2 . A3 . A2 . A3 . G2 . A3 .',
      'F2 . F3 . F2 . F3 . F2 . F3 . E2 . F3 .',
      'C3 . C4 . C3 . C4 . C3 . C4 . B2 . C4 .',
      'G2 . G3 . G2 . G3 . G2 . G3 . D3 . G3 .'
    ],
    noise: [
      'k . h . s . h . k . k h s . h .',
      'k . h . s . h . k . k h s . h .',
      'k . h . s . h . k . k h s . h .',
      'k . h . s . h . k . k h s . h h',
      'k . h . s . h . k . k h s . h .',
      'k . h . s . h . k . k h s . h .',
      'k . h . s . h . k . k h s . h .',
      'k . h . s . h s k . s s s s s s'
    ]
  },

  // Tense boss battle (D minor with a dominant A major turnaround)
  boss: {
    bpm: 168,
    pulse1: [
      'D5 - - D5 F5 - - D5 G5 - F5 - E5 - D5 -',
      'A#4 - - A#4 D5 - - A#4 C5 - - - A4 - - -',
      'D5 - - D5 F5 - - D5 A5 - G5 - F5 - E5 -',
      'C#5 - - - E5 - - - A5 - - - G#5 - A5 -',
      'D6 - C6 - A5 - F5 - G5 - A5 - - - F5 -',
      'A#5 - A5 - F5 - D5 - C5 - D5 - - - . .',
      'D6 - C6 - A5 - F5 - A5 - C6 - D6 - F6 -',
      'E6 - - - C#6 - - - A5 - - - . . . .'
    ],
    pulse2: [
      'D4 F4 A4 F4 D4 F4 A4 F4 D4 F4 A4 F4 D4 F4 A4 F4',
      'A#3 D4 F4 D4 A#3 D4 F4 D4 A#3 D4 F4 D4 A#3 D4 F4 D4',
      'D4 F4 A4 F4 D4 F4 A4 F4 D4 F4 A4 F4 D4 F4 A4 F4',
      'A3 C#4 E4 C#4 A3 C#4 E4 C#4 A3 C#4 E4 C#4 A3 C#4 E4 C#4',
      'D4 F4 A4 F4 D4 F4 A4 F4 D4 F4 A4 F4 D4 F4 A4 F4',
      'A#3 D4 F4 D4 A#3 D4 F4 D4 A#3 D4 F4 D4 A#3 D4 F4 D4',
      'D4 F4 A4 F4 D4 F4 A4 F4 D4 F4 A4 F4 D4 F4 A4 F4',
      'A3 C#4 E4 C#4 A3 C#4 E4 C#4 A3 C#4 E4 C#4 A3 C#4 E4 C#4'
    ],
    triangle: [
      'D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 F2 F2 E2 E2',
      'A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 A#1 C2 C#2 D2',
      'D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 F2 F2 E2 E2',
      'A1 A1 A2 A1 A1 A1 A2 A1 C#2 C#2 C#3 C#2 E2 E2 G2 A2',
      'D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 F2 F2 E2 E2',
      'A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 A#1 A#1 A#2 A#1 A#1 C2 C#2 D2',
      'D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 F2 F2 E2 E2',
      'A1 A1 A2 A1 A1 A1 A2 A1 C#2 C#2 C#3 C#2 E2 E2 G2 A2'
    ],
    noise: [
      'k h s h k h s h k k s h k h s h',
      'k h s h k h s h k k s h k h s h',
      'k h s h k h s h k k s h k h s h',
      'k h s h k h s h s s s s s s s s',
      'k h s h k h s h k k s h k h s h',
      'k h s h k h s h k k s h k h s h',
      'k h s h k h s h k k s h k h s h',
      'k h s h k h s h s s s s s s s s'
    ]
  },

  // --- One-shot jingles ---
  launch: {
    bpm: 150, loop: false,
    pulse1: ['C5 E5 G5 C6 - - E6 - - - - - - - . .'],
    pulse2: ['G4 C5 E5 G5 - - C6 - - - - - - - . .'],
    triangle: ['C3 . . . . . C3 - - - - - - - . .'],
    noise: ['k . . . . . s . . . . . . . . .']
  },
  clear: {
    bpm: 160, loop: false,
    pulse1: ['G4 C5 E5 G5 - E5 G5 - - - C6 - - - - -', '- - - - - - - - . . . . . . . .'],
    pulse2: ['E4 G4 C5 E5 - C5 E5 - - - G5 - - - - -', '- - - - - - - - . . . . . . . .'],
    triangle: ['C3 . . . . . . . G2 . . . C3 - - -', '- - - - - - - - . . . . . . . .'],
    noise: ['k . . . s . . . k . s . s s s s', 'k . . . . . . . . . . . . . . .']
  },
  gameover: {
    bpm: 84, loop: false,
    pulse1: ['E5 - - - D#5 - - - D5 - - - C#5 - - -', 'C5 - - - - - - - - - - - . . . .'],
    pulse2: ['C5 - - - B4 - - - A#4 - - - A4 - - -', 'A4 - - - - - - - - - - - . . . .'],
    triangle: ['A2 - - - G#2 - - - G2 - - - F#2 - - -', 'A1 - - - - - - - - - - - . . . .'],
    noise: ['. . . . . . . . . . . . . . . .', 's . . . . . . . . . . . . . . .']
  }
};

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

function noteToFreq(name) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const midi = 12 * (parseInt(m[2], 10) + 1) + NOTE_INDEX[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Turn bar strings into a flat list of events: { step, len, value }. */
function compileChannel(bars, isDrums) {
  const tokens = bars.join(' ').trim().split(/\s+/);
  const events = [];
  let current = null;
  tokens.forEach((tok, step) => {
    if (tok === '-') {
      if (current) current.len++;
      return;
    }
    current = null;
    if (tok === '.') return;
    if (isDrums) {
      events.push({ step, len: 1, value: tok });
    } else {
      current = { step, len: 1, value: noteToFreq(tok) };
      events.push(current);
    }
  });
  return { events, length: tokens.length };
}

function compileSong(song) {
  const channels = {};
  let length = 0;
  for (const ch of ['pulse1', 'pulse2', 'triangle', 'noise']) {
    channels[ch] = compileChannel(song[ch] || [], ch === 'noise');
    length = Math.max(length, channels[ch].length);
  }
  // Index events by step for fast lookup while scheduling
  const byStep = Array.from({ length }, () => []);
  for (const ch of Object.keys(channels)) {
    channels[ch].events.forEach(ev => byStep[ev.step].push({ ch, len: ev.len, value: ev.value }));
  }
  return { bpm: song.bpm, loop: song.loop !== false, length, byStep };
}

class SpaceAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.isMuted = false;

    this.songs = {};
    for (const name of Object.keys(CHIP_SONGS)) this.songs[name] = compileSong(CHIP_SONGS[name]);

    // Sequencer state
    this.currentTrack = null;   // name of the song being played (null = silence)
    this.song = null;
    this.step = 0;
    this.nextStepTime = 0;
    this.schedulerTimer = null;
    this.onSongEnd = null;
    this.bgmPlaying = false;

    // Browsers only allow audio after a user gesture; unlock on the first one
    const unlock = () => {
      this.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.42, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      // Pulse waves at the three classic duty cycles
      this.pulseWaves = {};
      for (const duty of [0.125, 0.25, 0.5]) this.pulseWaves[duty] = this.makePulseWave(duty);

      // One second of white noise, looped for drums and explosions
      const len = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      // Sample-and-hold every 4 samples for a crunchier, lo-fi chip noise
      let v = 0;
      for (let i = 0; i < len; i++) {
        if (i % 4 === 0) v = Math.random() * 2 - 1;
        data[i] = v;
      }
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  makePulseWave(duty) {
    const n = 64;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    }
    return this.ctx.createPeriodicWave(real, imag);
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(mute) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.7, this.ctx.currentTime);
    }
    if (mute) {
      this.stopMusic();
      this.jingleActive = false;
    }
  }

  toggleMute() {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  // =====================================================================
  //  MUSIC
  // =====================================================================

  /**
   * Choose the looping background track ('title' | 'stage' | 'boss' | null).
   * Called every frame by the UI; does nothing if that track is already on.
   */
  setTrack(name) {
    if (name === this.currentTrack && (this.bgmPlaying || !name)) return;
    if (this.jingleActive) return; // let a jingle finish first
    if (!name || this.isMuted) {
      this.stopMusic();
      this.currentTrack = name;
      return;
    }
    this.playSong(name);
  }

  /** Play a one-shot jingle ('launch' | 'clear' | 'gameover'); music resumes afterwards. */
  playJingle(name) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;
    this.jingleActive = true;
    this.playSong(name, () => {
      this.jingleActive = false;
      this.bgmPlaying = false;
      this.currentTrack = null; // the UI will pick the right track again next frame
    });
  }

  playSong(name, onEnd = null) {
    this.resume();
    if (!this.ctx || !this.songs[name]) return;
    this.stopMusic();
    this.currentTrack = name;
    this.song = this.songs[name];
    this.step = 0;
    // Ignore the end callback if another song replaced this one in the meantime
    const id = ++this.songId;
    this.onSongEnd = onEnd ? () => { if (id === this.songId) onEnd(); } : null;
    this.nextStepTime = this.ctx.currentTime + 0.06;
    this.bgmPlaying = true;
    this.schedulerTimer = setInterval(() => this.scheduler(), 25);
    this.scheduler();
  }

  stopMusic() {
    this.songId = (this.songId || 0) + 1;
    this.bgmPlaying = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    // Fade out anything already scheduled
    if (this.ctx && this.musicBus) {
      const bus = this.musicBus;
      bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      setTimeout(() => bus.disconnect(), 300);
    }
    this.musicBus = null;
  }

  // Kept for compatibility with existing callers; the UI's music director decides the track.
  startBGM() {
    this.resume();
  }

  stopBGM() {
    this.stopMusic();
    this.jingleActive = false;
    this.currentTrack = null;
  }

  scheduler() {
    if (!this.bgmPlaying || !this.ctx || !this.song) return;
    // Don't queue notes against a frozen clock while the context is suspended
    if (this.ctx.state !== 'running') {
      this.nextStepTime = this.ctx.currentTime + 0.06;
      return;
    }
    if (!this.musicBus) {
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.bgmGain);
    }
    const stepDur = 60 / this.song.bpm / 4;
    while (this.nextStepTime < this.ctx.currentTime + 0.12) {
      if (this.step >= this.song.length) {
        if (this.song.loop) {
          this.step = 0;
        } else {
          const done = this.onSongEnd;
          const endIn = Math.max(0, (this.nextStepTime - this.ctx.currentTime) * 1000);
          this.stopMusicAfter(endIn, done);
          return;
        }
      }
      for (const ev of this.song.byStep[this.step]) {
        this.playVoice(ev.ch, ev.value, this.nextStepTime, ev.len * stepDur);
      }
      this.nextStepTime += stepDur;
      this.step++;
    }
  }

  stopMusicAfter(ms, done) {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    setTimeout(() => {
      if (done) done();
    }, ms);
  }

  playVoice(ch, value, t, dur) {
    const bus = this.musicBus;
    if (ch === 'noise') {
      this.playDrum(value, t, bus);
      return;
    }
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const gate = Math.max(0.03, dur * 0.92);

    if (ch === 'triangle') {
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.55, t + 0.004);
      gain.gain.setValueAtTime(0.55, t + gate - 0.01);
      gain.gain.linearRampToValueAtTime(0.0001, t + gate);
    } else {
      osc.setPeriodicWave(this.pulseWaves[ch === 'pulse1' ? 0.25 : 0.125]);
      const peak = ch === 'pulse1' ? 0.2 : 0.09;
      // NES-ish envelope: quick attack, decay to a sustain level, short release
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.005);
      gain.gain.linearRampToValueAtTime(peak * 0.65, t + Math.min(0.12, gate * 0.5));
      gain.gain.setValueAtTime(peak * 0.65, t + gate - 0.015);
      gain.gain.linearRampToValueAtTime(0.0001, t + gate);

      // Delayed vibrato on long lead notes
      if (ch === 'pulse1' && dur > 0.3) {
        const lfo = this.ctx.createOscillator();
        const depth = this.ctx.createGain();
        lfo.frequency.setValueAtTime(6, t);
        depth.gain.setValueAtTime(0, t);
        depth.gain.linearRampToValueAtTime(value * 0.012, t + 0.25);
        lfo.connect(depth);
        depth.connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + gate);
      }
    }
    osc.frequency.setValueAtTime(value, t);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(t);
    osc.stop(t + gate + 0.02);
  }

  playDrum(kind, t, dest) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    let dur;

    if (kind === 'k') {
      // Kick: low thump from a pitch-dropping triangle plus a click of noise
      dur = 0.12;
      const osc = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + dur);
      og.gain.setValueAtTime(0.7, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(og);
      og.connect(dest);
      osc.start(t);
      osc.stop(t + dur);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, t);
      gain.gain.setValueAtTime(0.25, t);
      dur = 0.03;
    } else if (kind === 's') {
      dur = 0.13;
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, t);
      gain.gain.setValueAtTime(0.32, t);
    } else {
      dur = 0.035;
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, t);
      gain.gain.setValueAtTime(0.16, t);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(t, Math.random() * 0.5);
    noise.stop(t + dur);
  }

  // =====================================================================
  //  SOUND EFFECTS (pulse and noise channels, like the music)
  // =====================================================================

  /** Pulse-wave blip with an exponential pitch sweep. */
  sweep(duty, from, to, dur, vol, when = 0) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.setPeriodicWave(this.pulseWaves[duty]);
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  /** Burst of filtered chip noise. */
  noiseBurst(dur, vol, cutoffFrom, cutoffTo, when = 0) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffFrom, t);
    filter.frequency.exponentialRampToValueAtTime(cutoffTo, t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur);
  }

  /** Short arpeggio of pulse notes. */
  arp(notes, gap, noteLen, vol, duty = 0.5) {
    notes.forEach((f, i) => this.sweep(duty, f, f * 0.999, noteLen, vol, i * gap));
  }

  playLaser(tier = 1) {
    this.sweep(tier > 2 ? 0.25 : 0.125, 1200 + tier * 150, 300, 0.07, 0.16);
  }

  playMissile() {
    this.sweep(0.25, 180, 900, 0.14, 0.14);
    this.noiseBurst(0.12, 0.08, 3000, 800);
  }

  playEnemyShoot() {
    this.sweep(0.5, 520, 130, 0.09, 0.08);
  }

  playExplosion(type = 'small') {
    const dur = type === 'boss' ? 1.3 : (type === 'medium' ? 0.5 : 0.24);
    const vol = type === 'boss' ? 0.75 : (type === 'medium' ? 0.5 : 0.3);
    this.noiseBurst(dur, vol, type === 'boss' ? 2400 : 3600, 60);
    if (type !== 'small') {
      this.sweep(0.5, 180, 30, dur, type === 'boss' ? 0.35 : 0.22);
    }
    if (type === 'boss') {
      // Rolling secondary blasts
      this.noiseBurst(0.6, 0.45, 1800, 50, 0.35);
      this.noiseBurst(0.7, 0.4, 1400, 40, 0.75);
    }
  }

  playPowerUp() {
    this.arp([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.045, 0.09, 0.16, 0.25);
  }

  playShieldHit() {
    this.sweep(0.125, 1600, 400, 0.1, 0.18);
  }

  playNovaBomb() {
    this.sweep(0.5, 120, 1800, 0.22, 0.25);
    this.sweep(0.5, 1800, 35, 1.1, 0.22, 0.22);
    this.playExplosion('boss');
  }

  playBossAlert() {
    // Classic two-tone klaxon
    for (let i = 0; i < 4; i++) {
      this.sweep(0.5, 880, 870, 0.14, 0.2, i * 0.3);
      this.sweep(0.5, 660, 650, 0.14, 0.2, i * 0.3 + 0.15);
    }
  }

  playBootBeep() {
    this.sweep(0.5, 1046.5, 1046, 0.06, 0.14);
  }

  playMenuMove() {
    this.sweep(0.25, 880, 870, 0.04, 0.12);
  }

  playMenuSelect() {
    this.arp([659.25, 987.77, 1318.5], 0.05, 0.08, 0.16, 0.25);
  }

  playLaunchFanfare() {
    this.playJingle('launch');
  }
}

window.SpaceAudio = SpaceAudio;
window.CHIP_SONGS = CHIP_SONGS;
