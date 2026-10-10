# Modern Block-Stacker Community Features: Candidate Additions for a Browser Tetris Clone

Context: the clone already has SRS + wall kicks, 7-bag, hold, ghost, lock delay with a move-reset limit, B2B and combos, Sprint 40L, Blitz 2 min, Marathon, Zen, a seeded Daily Challenge, custom polyomino sets, fixed DAS/ARR, and remappable keys. It does NOT detect T-spins.

Effort ratings (Low / Medium / High, for one JS developer working in this codebase) are the researcher's own estimates. They are not sourced facts.

## Q1. T-spin detection, Mini vs full, the SRS kick-5 exception, Guideline scoring and perfect-clear bonuses

### Takeaway
Guideline T-spin detection has three parts: (a) the last successful move was a rotation, (b) at least 3 of the 4 diagonal corners around the T's center are occupied, and (c) the front/back corner test, which decides between full and Mini. A Mini is upgraded to a full T-spin when the last rotation used the kick that moves the piece 1 horizontally and 2 vertically (SRS kick test 5, the "TST/fin" kick). Scoring is a fixed table multiplied by level, with ×1.5 for back-to-back and separate perfect-clear bonuses. Effort: **Low–Medium.** Detection is about 40 lines of code once the rotation code records "last move was a rotation" and "kick index used". The scoring tables are just lookups.

### Cited Findings
**Detection rules (Guideline / SRS)**
- Condition 1: "The last maneuver of the T tetrimino must be a rotation." — [TetrisWiki: T-Spin](https://tetris.wiki/T-Spin)
- Condition 2: at least 3 of the 4 diagonal corners around the T's center are occupied. Walls and the floor count as occupied. — [TetrisWiki: T-Spin](https://tetris.wiki/T-Spin)
- Full ("proper") T-spin: both **front** corners (the side the T's stub points toward) are occupied, plus at least one back corner. — [TetrisWiki: T-Spin](https://tetris.wiki/T-Spin)
- T-spin Mini: only one front corner is occupied, and both back corners are occupied. — [TetrisWiki: T-Spin](https://tetris.wiki/T-Spin)
- Kick exception: if the last rotation's kick moved the T's center 1 block horizontally and 2 blocks vertically, a case that would be a Mini counts as a full T-spin. This is the 5th SRS kick test, which makes TST and "fin" T-spins count as full. — [TetrisWiki: T-Spin](https://tetris.wiki/T-Spin)
- The Guideline lists "3-corner T-Spin" recognition and "pointing-side" Mini recognition. — [TetrisWiki: Tetris Guideline](https://tetris.wiki/Tetris_Guideline)
- Historical variants other games used:
  - The New Tetris used an "immobile" rule: the T cannot move in any direction when it locks.
  - Tetris Worlds did not accept wall or floor rotations.
  - Tetris: New Century, iPod Tetris and Tetris Evolution accepted only in-place (unkicked) rotations.
  - Tetris Zone did not recognize T-spin Triples.
  - Source: [TetrisWiki: T-Spin](https://tetris.wiki/T-Spin)
- All-spin detection in TETR.IO: the "All-Mini" setting lets every piece spin. Non-T pieces use immobile detection and score as Mini-spins. "All-Mini+" has been the default since Beta 1.5.0 and also applies immobile detection to T. BLITZ uses only standard 3-corner T-spins. — [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO)

**T-spin scoring (× level)**

| Lines | Mini T-spin | T-spin |
|---|---|---|
| 0 | 100 | 400 |
| 1 | 200 | 800 |
| 2 | 400 | 1200 |
| 3 | (impossible) | 1600 |

Source: [TetrisWiki: T-Spin](https://tetris.wiki/T-Spin) and [TetrisWiki: Scoring](https://tetris.wiki/Scoring)

**Full Guideline scoring table** (post–Tetris DS games, for example Tetris Friends; level = level before the clear)
- Single 100, Double 300, Triple 500, Tetris 800 (difficult).
- Mini T-spin (no lines) 100, T-spin (no lines) 400.
- Mini TSS 200, TSS 800, Mini TSD 400 (where present), TSD 1200, TST 1600. All of these are "difficult".
- B2B: ×1.5 on the action score for consecutive difficult clears. Drop points are excluded from the multiplier.
- Only Single, Double or Triple clears break B2B. A T-spin with no lines does not break it.
- Combo: 50 × combo count × level.
- Soft drop: 1 point per cell. Hard drop: 2 points per cell.
- Source: [TetrisWiki: Scoring](https://tetris.wiki/Scoring)
- Any T-spin that clears lines, Mini included, is "difficult" for B2B purposes. — [TetrisWiki: T-Spin](https://tetris.wiki/T-Spin)

**Perfect clear (All Clear) bonuses** (Tetris Effect, Tetris 2020 mobile, and others; these are added to the line-clear score)
- PC Single 800, PC Double 1200, PC Triple 1800, PC Tetris 2000, B2B PC Tetris 3200, all × level.
- Example: a Triple PC scores 1800 + 500 = 2300.
- Source: [TetrisWiki: Scoring](https://tetris.wiki/Scoring)
- TETR.IO solo scoring is Single 100 / Double 300 / Triple 500 / Quad 800 with a flat All Clear of 3500, all × level (except ZEN). Hard drop is 2 per cell and soft drop 1 per cell. — [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO)

### Inferences
- Implementation outline:
  1. In the rotate function, store `lastMoveWasRotation = true` and `lastKickIndex`. Any successful shift or gravity drop sets `lastMoveWasRotation = false`.
  2. On lock, if the piece is T and the flag is set, count the corners at (cx±1, cy±1), treating out-of-bounds as filled.
  3. Pick the "front" corners using a lookup by rotation state (0: top-left/top-right, R: top-right/bottom-right, 2: bottom-left/bottom-right, L: top-left/bottom-left).
  4. If ≥3 corners and both front corners are filled, or `lastKickIndex === 4` (the 5th test), it is a full T-spin. If ≥3 corners otherwise, it is a Mini.
  5. Add the scores to the existing B2B and combo code. Treat any line-clearing T-spin as "difficult".
- The clone supports custom polyominoes, so "all-spin via immobile check" (TETR.IO-style) is the natural generalisation for non-T pieces. It is cheap: try moving the piece 1 cell left, right and up, and if all three collide it is a spin. Effort: Low.
- Show a "T-SPIN DOUBLE" / "MINI" / "B2B" / "PERFECT CLEAR" popup. This is a big part of the perceived value for both casual and hardcore players.

### Gaps
- No primary source quoted the exact wording of the official 2009 Tetris Design Guideline PDF. The rules above come from TetrisWiki's summary.
- The rule for "vertical TSMD on tetris.com gives no points" is garbled on the source page and was not verified.

## Q2. Handling settings: DAS, ARR, SDF, DCD, ARE / line-clear delay, IRS/IHS, and typical defaults and ranges

### Takeaway
Players expect DAS, ARR and SDF at minimum, plus DCD in TETR.IO-style clients. The Guideline recommends DAS 10 frames (~167 ms), ARR 2 frames (~33 ms) and ARE 6 frames. TETR.IO uses DAS 10F / ARR 2F / SDF 6× as defaults, with ARR down to 0 (instant), SDF up to 40× or infinite (sonic drop), and fractional frames. Competitive players run much lower values (ARR 0 is common advice). Effort: **Low.** The clone already has DAS/ARR internally, so this means exposing sliders and adding SDF/DCD logic. IRS/IHS are Low–Medium if the game has an ARE period.

### Cited Findings
- Definitions (TETR.IO glossary):
  - DAS = time from initial keypress until ARR activates (frames).
  - ARR = speed of auto-repeated movement while held (frames).
  - DCD (DAS Cut Delay) = pause in ongoing DAS after dropping or moving a piece (frames).
  - SDF = multiplier on gravity while soft drop is held. SDF set to infinite gives a sonic drop.
  - Source: [TETR.IO wiki: Terms](https://tetrio.wiki.gg/wiki/Terms)
- Guideline recommendations: ARE 6 frames, DAS 10 frames (~167 ms), ARR 2 frames (~33 ms). — [TetrisWiki: Tetris Guideline](https://tetris.wiki/Tetris_Guideline)
- Guideline lock-down: 0.5 s lock delay. Resets are limited to 15 moves or rotations (other variants: infinity, step reset). — [TetrisWiki: Tetris Guideline](https://tetris.wiki/Tetris_Guideline)
- IRS: rotate during ARE by holding a rotation button. IHS: hold during ARE by pressing Hold. Both appear in later Guideline games. — [TetrisWiki: Tetris Guideline](https://tetris.wiki/Tetris_Guideline)
- TGM's IRS: holding a rotate button makes the piece appear already rotated 90 degrees. This is important at high speed. — [TetrisWiki: TGM](https://tetris.wiki/Tetris_The_Grand_Master)
- Soft drop speed varies across Guideline games. 20× gravity is Tetris Zone's value, not a universal standard. — [TetrisWiki: Tetris Guideline](https://tetris.wiki/Tetris_Guideline)
- DAS "charging": some games let a held direction during ARE or line-clear delay charge DAS, so the next piece moves instantly. — [TetrisWiki: DAS](https://tetris.wiki/DAS)
- TETR.IO defaults and ranges (secondary source):
  - DAS default 10F since INFDEV 0.5.0. The reset button used 12 until INFDEV 0.5.4.
  - ARR minimum 0F.
  - SDF maximum raised from 21× to 40× in Alpha 4.0.0, plus an infinite setting.
  - DCD added in Alpha 5.0.0.
  - The "prevent accidental hard drops" option was added in Alpha 2.0.0.
  - Room-forced handling reference: DAS 10, ARR 2, SDF 6.
  - The community FAQ advises getting used to a low ARR, "or optimally, 0".
  - Source: [gamertagmythras TETR.IO handling guide](https://gamertagmythras.com/blog/tetris/tetris-tetrio-handling-settings-guide)
- TETR.IO supports sub-frame (fractional) DAS, gravity and inputs. A glossary/guide notes no official ms conversion. — summarised via search results from [gamertagmythras](https://gamertagmythras.com/blog/tetris/tetris-tetrio-handling-settings-guide)
- Jstris exposes DAS and ARR in **milliseconds**, unlike TETR.IO's frames. — [gamertagmythras](https://gamertagmythras.com/blog/tetris/tetris-tetrio-handling-settings-guide)
- A third-party page ([Tetrowars wiki](https://www.tetrowars.com/wiki/handling-settings)) lists DAS 167 ms / ARR 33 ms / SDF 20×. This is unverified and not clearly about TETR.IO.
- TGM1 timings: ARE 30F, DAS 16F, lock delay 30F, line clear delay 41F, all constant. — [TetrisWiki: TGM](https://tetris.wiki/Tetris_The_Grand_Master)

### Inferences
- Suggested settings panel (ms-based, like Jstris, for a browser game):
  - DAS 0–500 ms, default 167.
  - ARR 0–100 ms, default 33. 0 = instant.
  - SDF 1×–40× plus ∞, default 6× (TETR.IO) or 20×.
  - DCD 0–100 ms, default 0.
  - ARE 0–500 ms and line-clear delay 0–1000 ms, defaults 0 for "modern" feel. Note that modern clients (TETR.IO, Jstris) are widely understood to have effectively no ARE. This is not verified in the sources above.
  - Toggles: IRS, IHS, "prevent accidental hard drop" (ignore hard drop for N ms after spawn), and DAS charging during ARE on/off.
- Put all handling values in the same per-user settings object that already holds the remapped keys, and persist them in localStorage.
- These values define "feels right" for hardcore players. Fixed DAS/ARR is the clone's most likely objection from experienced players, and the fix is cheap.

### Gaps
- Could not retrieve official Jstris default or range values (the jstris.jezevec10.com/guide page returned 403). From memory, Jstris defaults are roughly DAS 133 ms / ARR 10 ms, but this is unverified and should not be cited.
- No official TETR.IO documentation page listing exact min/max ranges was retrieved. The TETR.IO default SDF of 6× is inferred from the "room-forced handling" reference.

## Q3. Finesse: what it is, and how faults are counted and displayed

### Takeaway
Finesse means placing each piece with the minimum number of inputs. Under SRS, any placement can be reached with at most about 2 movement/rotation keypresses, excluding hard drop (hence "two-step finesse"), using DAS-to-wall and tap-back techniques. Games count a finesse fault whenever a placement used more inputs than the optimal path, and show a running fault counter in Sprint/Pro modes. Effort: **Medium.** It needs a precomputed table of optimal input counts per piece, rotation and column (in practice 0G and hold-free, from spawn), or a BFS over input states at lock time, plus an input counter per piece.

### Cited Findings
- Finesse is an "input optimization technique used to place down tetrominos while saving keypresses". Under SRS any position is reachable in two keypresses, excluding hard drop ("two-step finesse"). Key technique: DAS tap-back. Benefits: speed and less thinking, because placements become muscle memory. — [Hard Drop wiki: Finesse](https://harddrop.com/wiki/Finesse)
- Hard Drop hosts 0G and 20G finesse charts for SRS and ARS (some incomplete) and links four.lol's finesse reference. — [Hard Drop wiki: Finesse](https://harddrop.com/wiki/Finesse)
- TETR.IO defines finesse as "The skill of using the fewest inputs possible to move a piece to a given position." — [TETR.IO wiki: Terms](https://tetrio.wiki.gg/wiki/Terms)
- TETR.IO's 40 LINES "Pro mode" adds input and **finesse counters** and a lines-left display. BLITZ Pro adds a finesse counter and a time display. — [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO)
- four.lol has a finesse page under "Mid-game". — [four.lol](https://four.lol/)

### Inferences
- Simple implementation:
  1. At spawn, record piece type, rotation, and x.
  2. Count left/right/rotate/DAS-start key events until hard drop. A DAS hold counts as 1 input, which matches standard practice.
  3. At lock, look up the minimum input count for (piece, final rotation, final x) in a precomputed 7 × 4 × 10 table. Generate the table offline via BFS over {tap L, tap R, DAS L, DAS R, CW, CCW, 180} on an empty board.
  4. If used > optimal, increment faults.
  5. Skip the check when the piece was soft-dropped or tucked, or when it used a spin or kick, since those are not "finesse-able" placements.
- Display: a live "Finesse: N faults" counter, finesse % = (pieces − faulty pieces) / pieces, and an optional red flash or sound on each fault. A "finesse trainer" mode could show target ghost placements and require optimal inputs.
- Custom polyomino sets would need the table regenerated at runtime with the same BFS. This is feasible in JS (a few thousand states).

### Gaps
- No source retrieved documented the exact fault-counting algorithm Jstris or Tetris Friends used (for example, whether 180° rotation or symmetrical pieces such as O, I, S and Z count specially). The tetris.wiki/Finesse page returned 404. Jstris's on-screen finesse display could not be confirmed from accessible sources.

## Q4. Versus and garbage mechanics: attack tables, B2B, combos, messiness, cancelling, local 1v1 and vs-AI

### Takeaway
Versus play rests on a small attack table (Double 1, Triple 2, Tetris 4, TSS 2, TSD 4, TST 6, PC 10 in standard Guideline/Jstris tables), a +1 B2B bonus and a combo table. Incoming garbage goes into a pending queue that the defender's own attacks cancel 1:1 before it rises. Effort: **Medium** for local split-screen 1v1 (two game instances sharing a keyboard plus a garbage queue). **Medium–High** for vs-AI (a simple heuristic bot is Medium; a strong bot like Cold Clear is High, though it can be embedded). **High** for online play (netcode, server).

### Cited Findings
**General Guideline attack table** (TetrisWiki, "General Garbage System in Guideline Games")
- Single 0, Double 1, Triple 2, Tetris 4.
- Mini TSS 0, Mini TSD 1, TSS 2, TSD 4, TST 6.
- B2B bonus: +1 (MTSS, MTSD, TSS), +2 (TSD, Tetris), +3 (TST).
- Perfect Clear: 10, plus the line-clear value where applicable.
- Source: [TetrisWiki: Garbage](https://tetris.wiki/Garbage)

**Jstris**
- Attack: Single 0, Double 1, Triple 2, Quad 4, Quint+ 6, TSS 2, TSD 4, TST 6, Mini TSS 0, Spin Quad+ 7, Perfect Clear 10, B2B +1.
- Combo bonus: combos 0–1 +0; 2–4 +1; 5–6 +2; 7–8 +3; 9–11 +4; 12+ +5.
- Source: [TetrisWiki: Jstris](https://tetris.wiki/Jstris)

**Tetris 99**
- Attack: Single 0, Double 1, Triple 2, Tetris 4; TSS 2, TSD 4, TST 6; Mini TSS 0, Mini TSD 1; B2B +1; All Clear +4.
- Combo: combo 1–2 +1, 3–4 +2, 5–6 +3, 7–9 +4, 10+ +5.
- Badge attack boosts: +25/50/75/100%.
- Targeting modes: KOs, Badges, Attackers, Random. Target bonus when multiple players target you: 2 → +1, 3 → +3, 4 → +5, 5 → +7, 6+ → +9.
- Pending queue max 12 lines. Max 20 lines sent per clear.
- Source: [TetrisWiki: Tetris 99](https://tetris.wiki/Tetris_99)

**Older combo tables** (garbage per combo count 0–12)

| Combo | Tetris Friends Expert+ | Tetris Friends Normal | TOJ | Tetris Battle (FB) |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 |
| 1 | 0 | 0 | 0 | 1 |
| 2 | 1 | 1 | 1 | 1 |
| 3 | 1 | 1 | 1 | 2 |
| 4 | 1 | 1 | 2 | 2 |
| 5 | 2 | 3 | 2 | 3 |
| 6 | 2 | 3 | 3 | 3 |
| 7 | 3 | 4 | 3 | 4 |
| 8 | 3 | 4 | 4 | 4 |
| 9 | 4 | 4 | 4 | 4 |
| 10 | 4 | 4 | 4 | 4 |
| 11 | 4 | 4 | 5 | 4 |
| 12 | 5 | 5 | 5 | 4 |

Source: [Hard Drop wiki: Combo](https://harddrop.com/wiki/Combo)

**TETR.IO**
- Combo is multiplicative: attack = base × (1 + 0.25 × combo). With base 0, it is ln(1 + 1.25 × combo) from a 2-combo up. Rounding is either DOWN (default in most multiplayer and ZEN) or RNG (QUICK PLAY).
- B2B "Charging" (current default): Surge starts at a B2B streak of 4 (4 lines, or 1 in QUICK PLAY), +1 line per further B2B level. It is released in three segments when the streak breaks. This replaced the older "Chaining" bonus (+1 up to +8 lines with streak length).
- All Clear grants +2 B2B. Quads and spins that clear garbage get +1 "garbage special bonus".
- Opener phase: for the first 14 pieces, cancelling is doubled when you send fewer lines than are pending.
- Source: [TETR.IO wiki: Garbage](https://tetrio.wiki.gg/wiki/Garbage); [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO)

**Garbage behaviour**
- Cancelling: the defender's line clears reduce the incoming queue first, and the remainder is sent back. — [TetrisWiki: Garbage](https://tetris.wiki/Garbage)
- TETR.IO pending garbage display: transparent yellow, then transparent red, then solid red when active. Placing a piece before activation does not bring it in. — [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO)
- TETR.IO "windup": attacks of 8 or more lines are split into chunks of 4 (9 → 4+4+1). There is a 1 s delay before the first chunk and 0.5 s between chunks. — [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO)
- TETR.IO "Passthrough": 20F travel time with no cancel. Disabled by default since Alpha 6.1.2. — [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO)
- Messiness: each garbage line has a chance to shift its hole column. In QUICK PLAY this chance is ×2.5 between separate attacks. — [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO)
- Hole alignment varies by game:
  - Tetris Worlds: 2 aligned holes 1:10, 3 aligned 1:100, 4 aligned 1:1000.
  - Tetris DS: semi-random.
  - Game Boy: hole switches about every 9 rows.
  - TGM Ace: multiple gaps per row.
  - Source: [TetrisWiki: Garbage](https://tetris.wiki/Garbage)

**AI opponent**
- Cold Clear is a "Modern Tetris Versus bot". It is playable in a browser, usable as a Rust library or C API, licensed MPL-2.0, and the repo was archived 22 Jan 2024. — [GitHub: MinusKelvin/cold-clear](https://github.com/MinusKelvin/cold-clear)

### Inferences
- Recommended minimal design for the clone:
  - Use the Jstris attack and combo tables (simple, integer, well-known).
  - Add +1 B2B.
  - Put garbage in a FIFO queue with a short delay (around 0.5–1 s) before insertion, and cancel 1:1 with outgoing attack.
  - Messiness: per attack, choose one hole column, then reroll it per line with probability p. A settings slider from "clean" (0%) to "messy" (100%) is useful.
  - Show a red pending-garbage meter beside the board.
- Local 1v1 on one keyboard: two Game instances, split keys (for example WASD + left Shift vs arrows + right Ctrl), a shared seed so both get the same bag (fair), and first-to-N rounds.
- Vs-AI options:
  - (a) Heuristic bot (Dellacherie / El-Tetris-style board evaluation with holes, bumpiness and height weights, with PPS throttled to set difficulty). Medium effort, and good enough for casual friends.
  - (b) Embed Cold Clear compiled to WASM. High effort or integration risk. The project is archived, and its MPL-2.0 licence requires keeping its own files open.

### Gaps
- Puyo Puyo Tetris attack and combo tables were not retrieved.
- The exact TETR.IO base attack table (per clear) and default messiness percentage were not on the pages fetched.
- Whether Tetris 99's "All Clear +4" stacks with the line value was not stated.

## Q5. Training and puzzle modes: Cheese/dig, PC practice, T-spin trainer, 4-wide, finesse/puzzle trainers, Ultra, Master/20G, line race

### Takeaway
Jstris's mode list is the de facto checklist: Sprint (20/40/100/1000L), Cheese (10/18/100/∞ garbage lines), Survival (1 garbage line/s), Ultra (2 min score), PC Mode, 20TSD, and Map/Downstack puzzles. TGM's Master mode (20G, grade system) is the hardcore "speed" mode. Most of these are **Low** effort once garbage generation and T-spin detection exist. Map/puzzle editors and TGM-style grading are **Medium**.

### Cited Findings
- Jstris modes:
  - Sprint: 20/40/100/1000 lines.
  - Cheese race: clear all garbage lines, in 10/18/100 or infinite variants.
  - Survival: garbage rises 1 line per second.
  - Ultra: highest score in 2 minutes.
  - PC Mode: consecutive perfect clears. The run ends if no PC is made within 10 pieces.
  - 20TSD: as many T-spin Doubles as possible. It ends on a non-TSD clear or a block-out.
  - Map Downstack: clear the map blocks and/or finish with a PC.
  - Source: [TetrisWiki: Jstris](https://tetris.wiki/Jstris)
- TETR.IO modes: 40 LINES, BLITZ (2 min with levelling), ZEN (endless, no game over), QUICK PLAY (Zenith Tower, 10 floors, mods, "fatigue" from 8 minutes). — [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO)
- Sprint and Ultra are recommended Guideline modes. Marathon's speed curve is based on Tetris Worlds. — [TetrisWiki: Tetris Guideline](https://tetris.wiki/Tetris_Guideline)
- TGM Master mode:
  - Gravity is measured in G (rows per frame). 20G (internal 5120/256) is reached at level 500.
  - Levels rise +1 per piece and +1 per line, but stop at x99 and 998 until a line is cleared.
  - Grades run from 9 to S9. The GM grade needs 12,000 points by level 300 in under 4:15, 40,000 by level 500 in under 7:30, and 126,000 at level 999 in under 13:30.
  - Source: [TetrisWiki: TGM](https://tetris.wiki/Tetris_The_Grand_Master)
- four.lol is the community reference library (diagrams, piece-order-dependent setups, success percentages, no interactive drills):
  - Openers: TKI, DT Cannon, PCO, C-Spin, MKO, Hachispin, BT Cannon.
  - Perfect-clear follow-ups: Grace System, 2nd–7th PC.
  - T-spin setups: TST, Triple Double, Fractal, STMB Cave, STSD.
  - 4-wide (the "infamous combo setup") and stacking styles.
  - TKI and DT Cannon are described as "very popular".
  - Source: [four.lol](https://four.lol/)

### Inferences
Candidate modes with effort estimates:
- **Cheese race** (Low): pre-fill N garbage rows, each with one random hole (optionally messy). The goal is to clear all garbage rows, and time is the score. It fits the existing Sprint timer.
- **Survival / dig** (Low): add a garbage row every X seconds.
- **Ultra** (Low): already effectively covered by Blitz 2 min. Could be renamed or aliased.
- **Line race** variants (Low): 20/100/1000L Sprint, using the existing Sprint mode with a parameter.
- **20TSD / T-spin trainer** (Low after T-spin detection): end the game on any non-TSD clear. A more guided trainer could pre-build a T-slot each time (Medium).
- **PC Mode** (Low–Medium): detect an empty board. The run fails if no PC within 10 pieces (Jstris rule). Optionally start with the 7-bag aligned to the PC opener.
- **4-wide combo trainer** (Low): pre-fill columns so a 4-wide well remains, with 3 residual cells. Score by combo count.
- **Opener/puzzle maps** (Medium): a board plus fixed queue loaded from JSON. A board editor is Medium–High. A PC/finesse puzzle pack could reuse the Daily Challenge seed infrastructure.
- **Master/20G** (Medium): needs 20G (piece instantly drops to the floor each frame), TGM-style shrinking ARE and lock delay, IRS, and a grade table. The 7-bag differs from TGM's randomizer, but that is acceptable.
- **Finesse trainer** (Medium): depends on the Q3 finesse table.

### Gaps
- No source detailed Puyo Puyo Tetris training modes or Tetris Effect "Zone".
- The TGM randomizer (history-based) page was not fetched.

## Q6. Stats players like: PPS, APM, KPP, finesse %, replays, splits

### Takeaway
The standard stats are PPS (pieces per second), APM (attack per minute), APP (attack per piece), VS score, KPP (keys per piece), finesse faults and %, and time splits in Sprint. TETR.IO and Jstris show these live in Pro modes and in post-game screens. Replays are deterministic given a seed plus a timestamped input log. Effort: **Low** for live stats. **Medium** for replays, because inputs must be logged with frame or ms timestamps and the engine must be fully deterministic. The clone's seeded Daily Challenge suggests the RNG side is already deterministic.

### Cited Findings
- TETR.IO glossary:
  - APM = "A measure of your offensive ability".
  - PPS = "A measure of how fast you play".
  - VS (Versus Score) = "A combined measure of attack and downstacking ability".
  - APP = "A measure of efficiency".
  - Source: [TETR.IO wiki: Terms](https://tetrio.wiki.gg/wiki/Terms)
- TETR.IO 40L Pro shows input and finesse counters and lines left. BLITZ Pro shows a finesse counter and time. — [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO)
- Jstris+ (community userscript) adds "long-sought features" to Jstris, which suggests demand for extra stats and UI. Details were not fetched. — [Greasy Fork: Jstris+](https://greasyfork.org/scripts/451607-jstris/versions)

### Inferences
- Formulas:
  - PPS = pieces / seconds.
  - APM = attack lines × 60 / seconds.
  - APP = attack / pieces.
  - KPP = keypresses / pieces.
  - Finesse % = 1 − faulty pieces / pieces.
  - VS = (attack + garbage cleared) / seconds × 100. This is the commonly cited TETR.IO formula but is not sourced above, so verify it.
  - "Attack" can be computed in single-player modes using the Q4 table, so solo players still get APM.
- Splits: record time at every 10 lines in Sprint, and show a delta vs personal best (green/red), like speedrun timers.
- Replays: store {seed, settings, [t, key, down/up]}, then re-simulate. This is also useful for "ghost racing" against your PB in Sprint, a social feature for friends.

### Gaps
- VS formula and KPP definitions were not confirmed from a retrieved source.
- No source confirmed which exact stats Jstris shows by default.

## Q7. Which features give the most value for casual friends vs hardcore players

### Takeaway
For a casual friend group, the biggest wins are things that create shared moments and competition: T-spin and Perfect Clear detection with flashy callouts, local 1v1 or vs-AI with garbage, and leaderboards/ghost replays on the existing Daily Challenge. For hardcore players, the biggest wins are configurable handling (DAS/ARR/SDF/DCD), correct Guideline T-spin rules, finesse feedback, PPS/APM stats, and training modes (Cheese, 20TSD, PC). Several of the highest-value items are Low effort.

### Cited Findings
- Sprint and Ultra are Guideline-recommended core modes. — [TetrisWiki: Tetris Guideline](https://tetris.wiki/Tetris_Guideline)
- Popular clients converge on the same mode set: Sprint/40L, Blitz/Ultra, Zen, Cheese, PC, 20TSD, and multiplayer versus. — [TetrisWiki: Jstris](https://tetris.wiki/Jstris); [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO)
- Multiplayer-focused mechanics (B2B surge, opener phase, messiness, targeting) are where TETR.IO and Tetris 99 put most of their design attention. — [TetrisWiki: TETR.IO](https://tetris.wiki/TETR.IO); [TetrisWiki: Tetris 99](https://tetris.wiki/Tetris_99)
- Handling customization is a first-class settings area in TETR.IO, and its defaults and ranges have changed repeatedly across versions in response to players. — [gamertagmythras](https://gamertagmythras.com/blog/tetris/tetris-tetrio-handling-settings-guide)

### Inferences
Suggested priority list (value ÷ effort):

| # | Feature | Effort | Casual value | Hardcore value |
|---|---|---|---|---|
| 1 | T-spin (3-corner + Mini + kick-5) + PC detection, Guideline scores, on-screen callouts | Low–Med | High | Essential |
| 2 | Adjustable DAS/ARR/SDF/DCD + IRS/IHS + "prevent accidental hard drop" | Low | Low | Essential |
| 3 | Live stats (PPS, APM, KPP) + Sprint splits vs PB | Low | Medium | High |
| 4 | Cheese race / Survival / 20TSD / PC Mode / 4-wide trainers | Low each | Medium | High |
| 5 | Local 1v1 split-keyboard versus with attack table, pending garbage meter, cancelling | Medium | Very high | Medium |
| 6 | Vs-AI (heuristic bot with difficulty = PPS cap) | Medium | High | Medium |
| 7 | Finesse fault counter + finesse trainer | Medium | Low | High |
| 8 | Replays / ghost race (builds on seeded Daily Challenge) | Medium | High (social) | High |
| 9 | Master/20G mode with TGM-style grades | Medium | Low | Medium–High |
| 10 | Opener/puzzle maps + board editor | Medium–High | Medium | Medium |
| 11 | Online multiplayer (WebRTC/WebSocket) | High | Very high | High |

- For a group of friends, items 1, 5, 6 and 8 together turn a solo game into a social one. A versus mode without T-spin detection would feel shallow, because T-spins are the main attack source in every table above.
- Items 2, 3 and 4 are cheap and mostly "parity" features that experienced players expect from any Jstris/TETR.IO-like clone.

### Gaps
- No survey or quantitative community data ranking feature importance was found. The rankings above are the researcher's judgement based on the features the major clients emphasise.
