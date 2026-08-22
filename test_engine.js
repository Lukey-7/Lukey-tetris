// Comprehensive verification test for Tetris Engine, Game Modes, Audio Tracks & Storage
const fs = require('fs');

// Mock browser globals for Node.js test environment
global.window = global;
global.performance = { now: () => Date.now() };

let mockStore = {};
global.localStorage = {
  setItem: (k, v) => { mockStore[k] = v.toString(); },
  getItem: (k) => mockStore[k] || null,
  removeItem: (k) => { delete mockStore[k]; }
};

// Evaluate files
eval(fs.readFileSync('js/audio.js', 'utf8'));
eval(fs.readFileSync('js/storage.js', 'utf8'));
eval(fs.readFileSync('js/engine.js', 'utf8'));

console.log('1. Testing Storage & QoL Settings Initialization...');
const storage = new RetroStorage();
const settings = storage.getSettings();
console.log('Default Game Mode:', settings.gameMode);
console.log('Default Track:', settings.bgmTrack);
console.log('Default Scale:', settings.windowScale);
console.log('Pomodoro Default:', settings.pomodoro.workMinutes, 'min work /', settings.pomodoro.breakMinutes, 'min break');

console.log('2. Testing Audio Synth Multi-Track Selection...');
const audio = new RetroAudio();
audio.setTrack('themeB');
console.log('Audio track switched to themeB, steps:', audio.leadTrack.length);
audio.setTrack('themeC');
console.log('Audio track switched to themeC, steps:', audio.leadTrack.length);

console.log('3. Testing Starting Level Selection (Level 8)...');
const engine = new TetrisEngine(storage, audio);
engine.startNewGame(8, 'marathon');
if (engine.level !== 8) throw new Error(`Expected level 8, got ${engine.level}`);
console.log('Engine successfully started at Level:', engine.level);

console.log('4. Testing Sprint 40 Lines Victory Condition...');
engine.startNewGame(1, 'sprint40');
let winEvent = null;
engine.onGameWinCallback = (res) => { winEvent = res; };
engine.lines = 39;
engine.elapsedSeconds = 42.5;
engine.executeLineClear([18]); // Clear 1 line to hit 40 lines
if (!engine.isGameWon || !winEvent) throw new Error('Sprint 40 lines should trigger win');
console.log('Sprint 40 lines cleared in:', winEvent.timeSpent, 'seconds! isNewPB:', winEvent.isNewPB);

console.log('5. Testing Blitz 2-Min Time Attack Condition...');
engine.startNewGame(5, 'blitz2min');
let blitzWin = null;
engine.onGameWinCallback = (res) => { blitzWin = res; };
engine.score = 25400;
engine.elapsedSeconds = 120.1;
engine.update(performance.now());
if (!engine.isGameWon || !blitzWin) throw new Error('Blitz 2min should trigger completion');
console.log('Blitz 2-min finished with Score:', blitzWin.score, 'isNewPB:', blitzWin.isNewPB);

console.log('6. Testing Custom Keybinding Remapper Storage...');
settings.keybinds.hardDrop = ['KeyW'];
settings.keybinds.restart = ['KeyR'];
storage.saveSettings(settings);
const reloaded = storage.getSettings();
if (reloaded.keybinds.hardDrop[0] !== 'KeyW') throw new Error('Custom keybind not saved');
console.log('Keybindings persisted successfully! HardDrop bound to:', reloaded.keybinds.hardDrop);

console.log('\nALL QUALITY-OF-LIFE & ENGINE TESTS PASSED WITH 100% SUCCESS! 🚀');
