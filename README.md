# 🕹️ Lukey-Arcade // Classic Tetris & Star Vanguard

A retro 8-bit and 16-bit arcade suite featuring **Classic Tetris-89** with an Arcade Mission Control Hub & floating IDE companion widget, alongside **Star Vanguard**, a chunky pixel-art spaceship combat simulator with a 1989 hardware BIOS bootup, interactive cabinet menu, playable ship selection hangar, and multi-phase boss battles.

Both games are organized into **completely independent, dedicated pages** with zero clutter.

---

## 🏛️ Arcade Suite Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INDEPENDENT ARCADE SUITE                        │
├────────────────────────────────┬───────────────────────────────────────┤
│ 🕹️ TETRIS-89 (index.html)      │ 🚀 STAR VANGUARD (space.html)     │
├────────────────────────────────┼───────────────────────────────────────┤
│ • Full Tetris Mission Control  │ • Full Retro Arcade Cabinet           │
│ • Sprint 40, Blitz 2M, Marathon│ • 1989 BIOS Boot Memory Check         │
│ • Chiptune Jukebox & SFX Board │ • Arcade Title Screen & Main Menu     │
│ • Pomodoro Focus Companion     │ • Playable Ship Hangar (3 Classes)    │
│ • Polyomino Shape Laboratory   │ • Tactical Sector Briefing & Radar    │
│ • Movable Floating Mini Widget │ • 8/16-Bit Pixel Matrix Combat        │
│ • Floating Popup (popup.html)  │ • Floating Popup (space_popup.html)   │
│ • Direct Link: [🚀 STAR VANGUARD]│ • Direct Link: [🕹️ ← TETRIS-89]       │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## ✨ Features & Highlights

### 🕹️ 1. Classic Tetris-89 (`index.html`)

#### 🎛️ Arcade Mission Control & Game Modes
- **40-Lines Sprint (Time Attack)**: Race against the clock with millisecond precision and Personal Best (PB) records.
- **2-Minute Blitz (Score Rush)**: High-score challenge before the 2-minute buzzer with combo multipliers.
- **Classic Marathon Mode**: Traditional 1989 endless progression with dynamic gravity curves.
- **Pentomino Master Wild**: Play with all 14 custom shapes including concave U-shape, Plus (+), Corner (V), Big-T, and Long-5.
- **Starting Level Picker (1 to 15)**: Start from Easy Level 1 up to Level 15 Grandmaster.

#### 🛸 Floating Draggable Companion Widget & Mini Pop-out
- **In-Page Widget**: Drag the title bar anywhere on your screen.
- **Translucency Slider**: Adjust opacity (100% down to 50%) to see code, build terminals, or logs underneath.
- **Scale Presets**: Switch between Compact (320px), Standard (360px), and Expanded (430px).
- **Minimize to Pill**: Click `_` to minimize into a live score pill in the corner.
- **Pop-out Window (`↗`)**: Opens a dedicated floating 380x640px window (`popup.html`) to dock beside your IDE.
- **Auto-Pause & Memory**: Automatically pauses and saves state upon minimizing, tab switching, or closing.

#### 🍅 Coding Pomodoro & Productivity Station
- Built-in 8-bit digital countdown clock with 25-min Work / 5-min Break intervals.
- Interactive coding task scratchpad with automatic persistence.
- Rings a cheerful chiptune chime and restores your widget when break time starts!

#### 🎵 8-Bit Chiptune Synthesizer Jukebox
- Zero external audio files — 100% Web Audio API synthesizer.
- **Multi-Track Player**:
  - **Theme A**: *Korobeiniki* (Classic Russian folk melody)
  - **Theme B**: *Troika* (Fast-tempo Russian dance track)
  - **Theme C**: *Bradinsky* (Funky retro arcade chiptune)
- **SFX Soundboard**: Sample all 6 retro sound effects (*Move*, *Rotate*, *Drop*, *Clear*, *Tetris!*, *Game Over*).

#### 🧱 Polyomino Shape Laboratory
- Interactive visual matrix of all 14 pieces (`I`, `J`, `L`, `O`, `S`, `T`, `Z`, `U`, `X`, `C`, `T5`, `W`, `I5`, `D1`).
- Click any piece to inspect its 4-state rotation matrix and geometric dimensions.

---

### 🚀 2. Star Vanguard (`space.html`)

#### 👾 Authentic 8-Bit & 16-Bit Pixel-Matrix Engine
- Chunky pixel sprites rendered with crisp nearest-neighbor rasterization (`imageSmoothingEnabled = false`):
  - **Invader Fleet**: 2-frame flapping Scout drones, twin-pod Striker cruisers, armored Gunships, destructible Asteroids, and the multi-segment Dreadnought Flagship Boss.
  - **Explosion & FX**: 3-frame animated 8-bit fire bursts, thruster exhaust trails, and screen-clearing EMP shockwaves.

#### 💾 1989 Hardware BIOS Bootup & Memory Check
- Authentic cold-boot initialization sequence with ROM/RAM memory checks, audio chip test, and progress bar with chiptune test beeps (click or press any key to fast-boot directly to title).

#### 🕹️ Arcade Title Screen & Main Menu
- Retro cabinet title screen with flashing `INSERT COIN / PRESS ENTER`.
- Interactive menu options: Mission Campaign, Ship Hangar, Boss Rush, and Audio Sound Test.

#### 🚀 Playable Starfighter Hangar
Choose between 3 distinct starfighter loadouts:

| Ship Class | Combat Style | Hull Integrity | Deflector Shield | Speed | Starting Weapon |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Viper MK-I** | Balanced All-Rounder | 100 HP | 100 SP | Normal (360) | Twin Plasma Blasters |
| **Titan Dreadnought** | Heavy Armored Tank | 150 HP | 150 SP | Tank (280) | Triple Vulcan Spread |
| **Phantom Interceptor**| High-Speed Infiltrator | 75 HP | 80 SP | Hyper (430) | Piercing Laser Beams |

#### 📡 Sector Mission Briefing & Radar
- Pre-mission radar sweep showing sector name, threat assessment, starfighter system check, and synthesized launch fanfare countdown (`READY IN 3... 2... 1... LAUNCH!`).

#### 📦 Field Ordnance & Power-Ups
- **[P] Weapon Upgrade**: Progress from Twin Blasters → Triple Vulcan → Piercing Beams → 5-Way Hyper Spread with Homing Micro-Missiles.
- **[S] Shield Recharger**: Instantly recharges deflector shields to 100%.
- **[B] Nova EMP Bomb**: Adds a screen-clearing ordnance charge that vaporizes enemy projectile curtains.
- **[1UP] Extra Pilot Life**: Grants a reserve starfighter hull.

---

## 🎮 Controls Reference

### Classic Tetris-89
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
| **Pause / Resume** | `P` | `Escape` | Customizable in Options |
| **Mute / Unmute** | `M` | Toolbar `🔊 MUTE` | Customizable in Options |

### Star Vanguard
| Action | Keyboard | Mouse / Touch Pointer |
| :--- | :--- | :--- |
| **Menu Navigate** | `W` `S` or `↑` `↓` | Click / Tap menu items |
| **Menu Select** | `Enter` or `Space` | Click Launch buttons |
| **Move Starfighter** | `W` `A` `S` `D` / `Arrow Keys` | Move / Drag cursor smoothly |
| **Fire Weapons** | `Space` / `Z` | Left Click / Hold touch |
| **Detonate Nova Bomb**| `X` / `B` | Right Click / On-screen Button |
| **Pause / Resume** | `P` / `Escape` | On-screen Button |
| **Instant Restart** | `R` | On-screen Button |
| **Return to Menu** | `Escape` (in Hangar) | On-screen Button |

---

## 📱 Mobile Flutter App & Offline PWA

A cross-platform Flutter mobile application is bundled under `flutter_app/`:
- **Complete Offline Play**: Bundles all web assets directly inside the APK.
- **Haptic Tactile Feedback**: Physical device vibrations on line clears, hard drops, laser fire, and boss explosions.
- **Persistent Data Storage**: All Personal Bests, high scores, custom keybindings, and sound preferences persist across APK updates.
- **Automated CI/CD**: `.github/workflows/build-apk.yml` automatically compiles signed release APKs on push to GitHub.

---

## 🚀 Quick Start & Running Locally

### Option 1: Direct Browser
Open `index.html` (Tetris) or `space.html` (Star Vanguard) in any modern web browser.

### Option 2: Windows 1-Click Launcher
Double-click `run.bat`.

### Option 3: Node.js Local Server
Run with default port (3888):
```bash
node server.js
```

Or specify any custom uninterrupted port (e.g. 4000):
```bash
node server.js 4000
```

Open in your browser:
- **🕹️ Classic Tetris-89**: [http://localhost:4000/index.html](http://localhost:4000/index.html) *(or [http://localhost:4000/](http://localhost:4000/))*
- **🚀 Star Vanguard**: [http://localhost:4000/space.html](http://localhost:4000/space.html)
- **🪟 Tetris Mini Floating Window**: [http://localhost:4000/popup.html](http://localhost:4000/popup.html)
- **🪟 Star Vanguard Mini Floating Window**: [http://localhost:4000/space_popup.html](http://localhost:4000/space_popup.html)

---

## 📜 License
MIT License. Created with ❤️ for retro arcade gaming and coding productivity.
