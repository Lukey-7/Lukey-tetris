# 🕹️ Lukey-tetris // Retro Arcade Portal & Companion Widget

A lightweight, authentic 8-bit retro Tetris game featuring a full **Arcade Mission Control Hub & Portal**, a **floating draggable companion widget** that can be docked into a tiny corner pill while you code or wait for builds, and a **standalone pop-out window**.

---

## ✨ Features & Highlights

### 1. 🎛️ Arcade Mission Control & Game Modes
- **40-Lines Sprint (Time Attack)**: Race against the clock with millisecond precision and Personal Best (PB) records.
- **2-Minute Blitz (Score Rush)**: High-score speed challenge before the 2-minute buzzer.
- **Classic Marathon Mode**: Traditional 1989 endless progression with dynamic gravity curves.
- **Pentomino Master Wild**: Play with all 14 custom shapes including concave U-shape, Plus (+), Corner (V), Big-T, and Long-5.
- **Starting Level Picker (1 to 15)**: Start from Easy Level 1 up to Level 15 Grandmaster.

### 2. 🛸 Floating Draggable Companion Widget & Mini Pop-out
- **In-Page Widget**: Drag the title bar anywhere on your screen.
- **Translucency Slider**: Adjust opacity (100% down to 50%) to see code, build terminals, or logs underneath.
- **Scale Presets**: Switch between Compact (320px), Standard (360px), and Expanded (430px).
- **Minimize to Pill**: Click `_` to minimize into a live score pill in the corner.
- **Pop-out Window (`↗`)**: Opens a dedicated floating 380x640px window to dock beside your IDE.
- **Auto-Pause & Memory**: Automatically pauses and saves state upon minimizing, tab switching, or closing.

### 3. 🍅 Coding Pomodoro & Productivity Station
- Built-in 8-bit digital countdown clock with 25-min Work / 5-min Break intervals.
- Interactive coding task scratchpad with automatic persistence.
- Rings a cheerful chiptune chime and restores your widget when break time starts!

### 4. 🎵 8-Bit Chiptune Jukebox & Soundboard
- Zero external audio files — 100% Web Audio API synthesizer.
- **Multi-Track Player**:
  - **Theme A**: *Korobeiniki* (Classic Russian folk melody)
  - **Theme B**: *Troika* (Fast-tempo Russian dance track)
  - **Theme C**: *Bradinsky* (Funky retro arcade chiptune)
- **SFX Soundboard**: Sample all 6 retro sound effects (*Move*, *Rotate*, *Drop*, *Clear*, *Tetris!*, *Game Over*).

### 5. 🧱 Polyomino Shape Laboratory
- Interactive visual matrix of all 14 pieces (`I`, `J`, `L`, `O`, `S`, `T`, `Z`, `U`, `X`, `C`, `T5`, `W`, `I5`, `D1`).
- Click any piece to inspect its 4-state rotation matrix and geometric dimensions.

### 6. 🎨 4 Retro Themes & Visual FX
- **Game Boy (1989)**: Iconic 4-shade green LCD dot matrix.
- **NES Classic**: Vibrant 8-bit arcade palette.
- **Cyberpunk Neon**: Glowing synthwave aesthetic.
- **Matrix Phosphor**: Classic green phosphor terminal.
- Toggleable CRT scanlines, Hard Drop screen shake, and line clear pixel sparks.

---

## 🎮 Controls Reference

| Action | Primary Key | Alternate Keys | Custom Rebinding |
| :--- | :--- | :--- | :--- |
| **Move Left** | `←` Left Arrow | `A` | Customizable in Options |
| **Move Right** | `→` Right Arrow | `D` | Customizable in Options |
| **Rotate CW** | `↑` Up Arrow | `W` / `X` | Customizable in Options |
| **Rotate CCW** | `Z` | `Ctrl` | Customizable in Options |
| **Soft Drop** | `↓` Down Arrow | `S` | Customizable in Options |
| **Hard Drop** | `Space` | | Customizable in Options |
| **Hold Piece** | `C` | `Shift` | Customizable in Options |
| **Instant Reset** | `R` | Toolbar `🔄 RESET` | Customizable in Options |
| **Pause / Resume** | `P` | `Escape` / Toolbar `⏸️ PAUSE` | Customizable in Options |
| **Mute / Unmute** | `M` | Toolbar `🔊 MUTE` | Customizable in Options |

---

## 🚀 Quick Start

1. **Option 1 (Direct Browser)**:
   Open `index.html` in any modern web browser.

2. **Option 2 (Windows 1-Click Launcher)**:
   Double-click `run.bat`.

3. **Option 3 (Node.js Server)**:
   ```bash
   node server.js
   ```
   Open `http://localhost:3888/` or `http://localhost:3888/popup.html`.

---

## 📜 License
MIT License. Created with ❤️ for retro gaming and coding focus.
