# Retention, Progression and Game Feel (Juice) for a No-Backend Retro Arcade Project

Context: a plain HTML/JS/Canvas project (also an Android WebView app) with a Galaga-style vertical shooter (240x320 pixel renderer, NES-style chiptune) and a Tetris clone. No server, so persistence is localStorage only. Effort ratings (Low / Medium / High) are for one JS developer and are the researcher's judgement, not sourced.

## Game feel / juice techniques (screen shake, hit-stop, flash, particles, sound layering, camera kick, slow-mo, tweening) and pixel-art pitfalls

### Takeaway
The canonical sources agree that small, cheap feedback layers (tweens, squash/stretch, muzzle flash, impact effects, knockback, permanence, shake, hit-pause) turn a functional game into a satisfying one, and most are Low effort in Canvas. In a strict 240x320 pixel style, every offset (shake, kick, tween) must be rounded to whole pixels at draw time, and shake/flash must be toggleable for accessibility.

### Cited Findings
- "Juice it or lose it" (Martin Jonasson and Petri Purho) was a live demo that took a plain Breakout clone and added juice. They described "juicy" things as ones that "wobble, squirt, bounce around, and make little cute noises", framed as maximum output for minimum input. The demo showed tweening, stretching and squeezing objects, and the coverage stresses the tips are "very simple to implement" — [Game Developer: Is your game juicy enough?](https://gamedeveloper.com/design/video-is-your-game-juicy-enough-)
- Purho argued interactivity matters more than graphical fidelity: "It doesn't matter if the graphics are crappy, but if it lacks that interactivity, it feels off" — [Game Developer](https://gamedeveloper.com/design/video-is-your-game-juicy-enough-)
- Sources differ on where the talk first appeared: Nordic Game 2012 is cited by some; it was also presented at GDC Europe 2012's Independent Games Summit — [GDC Europe 2012 session listing](https://www.gamedeveloper.com/business/gdc-europe-2012-details-the-top-sessions-for-next-week-s-show); the Game Developer video write-up's date (2013) looks inconsistent with its text — [Game Developer](https://gamedeveloper.com/design/video-is-your-game-juicy-enough-)
- Jan Willem Nijman's (Vlambeer) "The Art of Screenshake" (about 40 minutes) asks why one game plays great and a similar one feels terrible — [Kenney: must-see videos for indie developers](https://kenney.nl/learn/must-see-videos-for-indie-developers)
- A step-by-step recreation of the talk lists its effects in order: baseline, animation, lower time-to-kill, higher rate of fire, bigger bullets, muzzle flash, faster bullets, lower accuracy (spread) for dynamism, impact effect, hit reaction (flash), enemy knockback, permanence (debris/corpses stay), camera lerp, screenshake, player knockback (recoil), hit pause. The breakdown includes on/off GIF comparisons. This is a fan recreation, not Nijman's own notes — [DK Liao devlog: Quick breakdown of all the effects](https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog/451576/quick-breakdown-of-all-the-effects)
- Steve Swink's *Game Feel* defines game feel as "real-time control of virtual objects in a simulated space, with interactions emphasised by polish". "Real-time" means a response within a correction cycle under ~100 ms. Polish removal leaves function intact but makes the experience "less perceptually convincing" — [Wikipedia: Game feel](https://en.wikipedia.org/wiki/Game_feel); [Liz England review](https://lizengland.com/blog/review-game-feel-by-steve-swink/)
- Swink's list of good-feel experiences includes the aesthetic sensation of control, the pleasure of learning and mastering a skill, extension of the senses and identity — [Liz England review](https://lizengland.com/blog/review-game-feel-by-steve-swink/). An academic survey notes the term has no standard measurement and is defined differently by developers — [Designing Game Feel: A Survey (arXiv 2011.09201)](https://arxiv.org/pdf/2011.09201)
- Hit-stop: Sakurai (Smash Bros.) explains that freezing both attacker and victim on impact sells weight, and relates timing, camera and vibration to hitstop; he also warns that freezing on every hit slows the overall pace (which is why Tekken/Virtua Fighter use little) — [Source Gaming translation of Sakurai's Famitsu column](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/). Pausing the arc at collision "gives the eyes a few frames to register" the hit — [Critpoints](https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/)
- Typical fighting-game impact-freeze values: light ~9 frames, medium ~11, heavy ~13 (genre generalisation, not Smash-specific) — [Sonic Hurricane: Impact Freeze](https://sonichurricane.com/?p=1043)
- Trauma-based shake (Squirrel Eiserloh, GDC 2016 "Juicing Your Cameras With Math", as implemented by third parties): one trauma value in [0,1] that decays over time, offset = maxOffset * trauma² * noise(t); smooth noise rather than random values; stacking events add to one clamped value; shake applies to rendering only, not game-logic camera — [Bevy 2D screen shake example](https://bevy.org/examples/camera/2d-screen-shake/); [KidsCanCode Godot recipe](https://kidscancode.org/godot_recipes/3.x/2d/screen_shake/); [npm screen-shake](https://www.npmjs.com/package/screen-shake)
- Pixel-art pitfall: sub-pixel camera positions sample between texels and shimmer; fix by snapping the final camera/shake offset to whole pixels and using integer scaling with nearest-neighbour filtering — [bugnet: fix pixel-perfect camera jitter](https://bugnet.io/blog/how-to-fix-pixel-perfect-camera-jitter); one practitioner states pixel-perfect motion "requires jitter. You can try to mitigate it" — [Godot forum](https://forum.godotengine.org/t/smooth-camera-in-pixel-perfect-game/112586?page=2). Rounding at draw time (keeping float positions in logic) is recommended over rounding stored coordinates — [r/gamemaker thread](https://redlib.hackliberty.org/r/gamemaker/comments/1l0a0r1/the_sprite_is_shaking_when_walking)
- Xbox guidance: avoid camera shake or let players turn it off; Halo Infinite is cited as a model with 0–100% sliders for screen shake, full-screen effects etc. — [Xbox Accessibility Guideline 117](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/117)
- Flash safety: nothing should flash more than three times per second unless below general/red flash thresholds; saturated red flashing is especially risky — [W3C WCAG 2.2 Understanding 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)

### Inferences
Catalogue (effort / risk for this project):
- **Hit flash on enemies** (draw sprite white for 1–2 frames on damage; keep a pre-tinted white copy of each sprite on an offscreen canvas). Low. Risk: very low.
- **Muzzle flash + 1px player recoil** (Nijman list). Low. Risk: none at 240x320 if snapped to integers.
- **Hit-stop / sleep** on player death, boss kill, Tetris 4-line clear: freeze the update loop for ~3–8 frames while rendering continues. Low. Risk: if applied on every small enemy kill in a shmup with many kills it stalls pace (Sakurai's caution) — reserve for big events.
- **Trauma screen shake** with integer rounding at draw (ctx.translate(Math.round(dx), Math.round(dy))), max 2–4 game pixels at 240x320, translation only (no rotation — rotating pixel art breaks the grid). Low. Risk: nausea, cheapness if overused; must have a slider/toggle.
- **Particles / debris permanence**: pooled pixel particles (1x1/2x2 rects) in palette colours; leave short-lived scorch/debris. Low–Medium (pooling to avoid GC hitches on low-end Android WebView).
- **Squash/stretch and tweens**: easing library (a ~20-line easeOutBack/elastic set) for menus, score popups, Tetris piece lock "bump", line-clear collapse. Low. Pitfall: non-integer scaling of pixel sprites looks blurry — use pre-drawn squash frames or scale only by integer steps, or apply tweens to position only.
- **Slow-motion on boss kill**: scale dt by 0.3 for ~0.5 s with a white flash ≤1 frame. Low. Risk: flash rule — keep big full-screen flashes rare and dimmed; offer "reduce flashing".
- **Sound layering**: layered chiptune SFX (noise burst + pitch-swept square) per hit, pitch randomised ±a few semitones to avoid repetition; combo SFX that rises in pitch. Low–Medium in WebAudio. Risk: mobile WebView audio unlock and latency.
- **Camera lerp/lookahead** is less applicable to a fixed single-screen Galaga layout; skip or limit to small "kick" offsets.
- **Haptics** (Android WebView via existing vibration plugin) as a juice channel for hits/line clears; must respect a toggle. Low.

### Gaps
- Could not access the primary "Juice it or lose it" or "Art of Screenshake" videos/transcripts; technique lists come from a write-up and a fan recreation. Nijman's exact numbers (e.g. hit-pause lengths) were not verified.
- Eiserloh's talk was not accessed directly; parameters come from third-party implementations.
- No controlled study found that quantifies juice's effect on retention specifically (the arXiv survey notes measurement is non-standard).

## Achievements and challenges (skill feats, discovery, milestones vs grind; local-only systems; daily/weekly challenges)

### Takeaway
Evidence for achievements is mixed: field data shows badges can increase activity, but lab work finds little effect on intrinsic motivation and players report some achievements as burdens. For an arcade game the best bets are skill feats and discovery achievements that point players toward varied play, plus a seeded daily challenge — all doable client-side.

### Cited Findings
- Hamari & Eranti define an achievement as "an optional challenge provided by a meta-game that is independent of a single game session and yields possible reward(s)", with components: signifying element, rewards, completion logic — [DiGRA 2011: Framework for Designing and Evaluating Game Achievements](https://dl.digra.org/index.php/dl/article/view/545)
- A 2-year field study (pre N=1410, post N=1579) on a P2P trading service found users after badge introduction were significantly more likely to post, trade and comment — [Hamari 2017, Computers in Human Behavior, via Univ. of Turku](https://research.utu.fi/converis/portal/detail/Publication/27336812?lang=en_US); [Tampere gamification group summary](https://webpages.tuni.fi/gamification/2018/09/20/badges-increase-user-activity-a-field-experiment-on-the-effects-of-gamification/). Caveat: sequential (not concurrent random) groups, non-game service.
- The precursor study (3,234 users) found "the mere implementation of gamification mechanisms does not automatically lead to significant increases", but users who actively followed their badges were more active — [gamification-research.org](https://gamification-research.org/2013/05/1-5-year-experiment-on-gamification-surprising-results/)
- A University of Tasmania experiment found no strong link between achievements and intrinsic motivation; the game itself mattered more, though achievements may affect how often players return — [UTas: The effects of videogame achievements on player motivation](https://figshare.utas.edu.au/articles/journal_contribution/The_effects_of_videogame_achievements_on_player_motivation/22922864)
- In a focus group of 36 frequent gamers, some said achievements give positive feedback and "encourage diverse ways to play", while others felt they were burdens representing extra tasks — [arXiv 2205.15163: You Have Earned a Trophy](https://arxiv.org/pdf/2205.15163)
- An "Endless Mode" in a shooter significantly increased perceived replayability (IMI Interest/Pleasure); Explorers and Killers benefited most, Achievers slightly preferred the structured mode — [HAW Hamburg thesis](https://reposit.haw-hamburg.de/handle/20.500.12738/19142?mode=full)
- Daily runs: same seed for everyone, changing every 24h; arguments for are fairness, a daily reason to return, "perfect line" puzzle appeal and stakes; against are grinding/memorisation advantages and harshness of one-shot modes. Caveblazers (one attempt/day, daily modifiers, built in about a weekend); Dead Cells (unlimited attempts, best score kept, ~7,000 runs/day); OlliOlli (unlimited practice, one recorded attempt) — [Game Developer: The 24-hour ticket, examining daily runs](https://www.gamedeveloper.com/design/the-24-hour-ticket-examining-daily-runs-)
- Spelunky's daily: identical cave for every player, one attempt per day; random elements (gambling wheel) locked for fairness — [Spelunky Wiki](https://spelunky.fandom.com/wiki/Daily_Challenge_Mode_(HD)); critiqued as changing players' risk approach in a bad way — [The Ludite: When Scoring Goes Bad](https://theludite.com/2014/06/23/spelunky-when-scoring-goes-bad/)

### Inferences
- **Local achievements** (Low–Medium): a JSON array of {id, name, desc, check(stats), hidden} evaluated on game events; unlocked set stored in localStorage; pixel "ACHIEVEMENT" toast with jingle. Prefer: skill feats (no-hit wave, 100% hit ratio on a challenging stage, Tetris back-to-back, T-spin, perfect clear), discovery (rescue captured ship / dual fighter, find secret, try every mode), and small milestones. Avoid "kill 10,000 enemies" style counters — grindy and, per the arXiv focus group, felt as burdens. Keep ~20–40 total.
- **Daily challenge** (Low–Medium): seed a PRNG (e.g. mulberry32) from the local date string (YYYYMMDD) so every device gets the same wave order/piece sequence/modifier without a server; store best score and streak per date. Without a backend there is no global leaderboard, but a shareable result string (Wordle-style) gives social comparison — inference, not sourced. Offer unlimited attempts with "first attempt" score shown separately (OlliOlli/Dead Cells hybrid) to avoid one-shot harshness. Note the project already has a Daily mode (commit cd6e4e9), so the gain is in modifiers and streaks.
- **Weekly challenge** (Low): rotating modifiers (double-speed, no-hold, mirrored, one-life) seeded from ISO week number.
- Risk: device clock manipulation lets players replay dailies — acceptable for local-only.
- Risk: localStorage can be cleared (WebView "clear data"); offer export/import of a save code (base64 JSON). Low.

### Gaps
- Did not access Hamari & Eranti's full taxonomy of achievement types.
- No arcade-specific (shmup/Tetris) achievement studies found; evidence comes from other genres and non-game services.

## Unlockables and meta-progression (ships, palettes, modes, music, cheat codes, secrets, roguelite meta)

### Takeaway
Unlocks that add options/variety (sidegrades, palettes, modes, music) are widely welcomed; permanent power upgrades are controversial because they undermine the skill-based "die and retry" core of arcade games. Accessibility features should never be locked behind progression.

### Cited Findings
- Player criticism of permanent upgrades: they undermine "player growth and the entire point of die and retry", and a game balanced around upgrades loses fairness on a clean slate — [Steam discussion](https://steamcommunity.com/app/1145350/discussions/0/4358999171576511867); unlocks can trivialise difficulty (Roguebook comparison) — [Steam discussion](https://steamcommunity.com/app/1076200/discussions/0/3070873501568676154)
- Defenders say discovering/unlocking more content is the appeal; sidegrades (e.g. Hades weapons) are preferred over raw power — [lemmy/feddit thread: meta progression feeling unrewarding](https://feddit.it/post/5081108)
- Design guidance: meta-progression "must be balanced so it enhances rather than trivializes the skill-based core" (a tutorial blog, limited authority) — [bugnet: how to design roguelite meta progression](https://bugnet.io/blog/how-to-design-a-roguelite-meta-progression)
- Puyo Puyo Tetris locks its colourblind-friendly "Alphabet Puyos" behind 100 shop credits; AbleGamers argues they should be available from the start — [AbleGamers: Unlocking colorblind accessibility in puzzle games](https://ablegamers.org/unlockingaccessibilitypuzzlegames/)

### Inferences
- **Unlockable palettes/skins** (Low): the 8-bit renderer can swap palettes (NES-style palette tables); unlock via achievements. Good fit, no balance risk.
- **Unlockable ships as sidegrades** (Medium): e.g. wide-spread vs narrow-fast shot, smaller hitbox but slower — keep power-neutral. Risk: balance testing.
- **Unlockable modes** (Low–Medium): Boss Rush, Endless (supported by the HAW Hamburg finding above), Tetris variants (40-line sprint, ultra 2-min, invisible). Unlock after first clear rather than long grinds.
- **Music player / sound test** (Low): unlock chiptune tracks as they are heard; classic retro "sound test" screen.
- **Konami code and secrets** (Low): keydown sequence listener plus a touch equivalent (swipe sequence) for the Android app; reward cosmetic (e.g. palette, "30 lives" style easy mode that disables high-score saving). Risk: cheat that pollutes high scores — flag scores made with cheats.
- **Light meta-progression** (Medium): a cumulative "pilot rank" that unlocks cosmetics only. Avoid permanent stat upgrades in an arcade score-attack game.
- Do not gate accessibility (colourblind patterns, assist options) behind unlocks.

### Gaps
- No formal study found on unlockables/meta-progression in arcade score-attack games; evidence is forum opinion and a design blog. Konami-code/secret engagement data not found.

## Mobile/touch playability for a vertical shooter

### Takeaway
Community consensus (mostly 2012–2016 forums/reviews, no formal studies found) is that relative-drag ("relative touch", as in Cave's DoDonPachi mobile ports) with a sensitivity multiplier and auto-fire is best for shmups; direct tracking hides the ship unless the ship is offset above the finger.

### Cited Findings
- Direct 1:1 finger tracking hides the ship under the finger; relative/offset drag avoids this but creates a "conscious disconnect" — [TouchArcade forum: preferred control method for shmups](https://toucharcade.com/community/threads/preferred-control-method-for-shmup-bullethell-free-flight-games.125655/)
- Cave's DoDonPachi uses screen-drag that applies the drag delta to the ship regardless of touch location ("relative touch"); forum members argue shooters "have to be relative touch" — [TouchArcade forum](https://toucharcade.com/community/threads/preferred-control-method-for-shmup-bullethell-free-flight-games.125655/)
- Players praise a relative-touch movement sensitivity multiplier (2x mentioned) and a movable/resizable play area so the thumb sits outside the playfield — [TouchArcade: Relative touch control for shmups done right](https://toucharcade.com/community/threads/relative-touch-control-for-shmups-done-right-no-finger-of-gameplay.287378/)
- Sky Force Reloaded places the ship slightly above the finger with some lag; reviewers say finger occlusion is less of a problem in practice than in video — [TouchArcade](https://toucharcade.com/?p=166238)
- Tilt is disliked for shooters; virtual sticks (bottom-left) are an alternative — [TouchArcade forum](https://devforums.toucharcade.com/threads/preferred-control-method-for-shmup-bullethell-free-flight-games.125655/)

### Inferences
- Default: relative drag anywhere on screen, delta * sensitivity (1.0–2.5 slider), clamped to the 240x320 bounds; auto-fire always on during touch (or always on). Low effort with pointer events; use `touch-action: none` and pointer capture to prevent WebView scrolling.
- Option: "offset direct" mode (ship at finger + ~40 CSS px up). Low.
- Scale canvas by integer multiples and use the leftover letterbox area (below the 240x320 field on tall phones) as a thumb zone — matches the "smaller playfield + control area" advice. Low–Medium.
- Tetris on touch: the project already has swipe controls; consider tap-to-rotate, drag for lateral shift with cell-snapping, flick-down for hard drop with a threshold to avoid accidental drops (inference).
- Risk: no empirical study; offer 2–3 schemes and remember choice in localStorage.

### Gaps
- No academic or telemetry-based study found comparing touch schemes for shooters; evidence is forum consensus and reviews.

## Accessibility and options for casual players

### Takeaway
The Game Accessibility Guidelines' "Basic" tier maps cleanly onto a small arcade game: difficulty choice, game-speed option, no colour-only information, remappable controls, separate volume controls, avoiding flicker. Add shake/flash toggles (XAG 117) and pattern overlays for Tetris pieces (as in Tetris Effect: Connected).

### Cited Findings
- Game Accessibility Guidelines (Basic): offer a wide choice of difficulty levels; include an option to adjust game speed; no essential information by colour alone; allow controls to be remapped; separate volume controls for effects/music; avoid flickering images and repetitive patterns; readable default font size; no essential info by sound alone. (Intermediate): allow difficulty change during play; assist modes; option to hide background movement; distinct sounds per key event. (Advanced): avoid sudden unexpected movement; do not make precise timing essential — [gameaccessibilityguidelines.com full list](https://gameaccessibilityguidelines.com/full-list/)
- XAG 117 "Visual Distractions and Motion Settings": avoid camera shake or allow turning it off; provide a mechanism to disable or pause moving/blinking/flashing non-gameplay content (HyperDot "Animate Background" toggle example). XAG are guidance, not a compliance checklist; current version 3.2 — [Xbox Accessibility Guidelines](https://devdocs.xbox.com/build/game-principles/accessibility/xbox-accessibility-guidelines); [XAG 117](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/117)
- WCAG 2.3.1: no more than three flashes per second unless below thresholds; red flashes are higher risk — [W3C](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold)
- Tetris Effect: Connected v1.3.1 added Color Assist Types A/B/C, adding patterns to traditional Tetriminos to make them easier to identify — [Nintendo Everything patch notes](https://nintendoeverything.com/tetris-effect-connected-update-out-now-version-1-3-1-patch-notes/); Game Boy Tetris was greyscale and so avoided colour confusion — [AbleGamers](https://ablegamers.org/unlockingaccessibilitypuzzlegames/)

### Inferences
- **Shake slider (0–100%) + "reduce flashing" toggle** (Low): multiply trauma; replace full-screen white flashes with a dim border flash; cap flashes to <3/s.
- **Tetris pattern/glyph overlays** (Low): 8x8 dither or glyph per piece type; trivially fits the pixel style. Also a ghost piece and lock-delay option.
- **Difficulty / assist** (Low–Medium): shmup — Easy (slower bullets, extra lives, larger graze margin/smaller hitbox), game speed 75/100%; Tetris — starting level, gravity curve, lock delay. Mark scores by difficulty to keep high-score tables fair.
- **Remappable keys** (Medium for UI; logic Low): store key map in localStorage; include gamepad API support.
- **Pause on blur / visibilitychange** (Low): `document.addEventListener('visibilitychange', …)` and `window.onblur` to auto-pause and suspend the AudioContext — important in Android WebView when the app is backgrounded. (Inference; GAG has no explicit pause guideline.)
- **Separate music/SFX volumes** already exist in the project (commit cd6e4e9); add a haptics toggle.

### Gaps
- Did not retrieve XAG's difficulty-and-pace guideline text. No source found on pause-on-blur specifically.

## Session and onboarding design (attract mode, tutorial via play, "one more go", quick restart)

### Takeaway
Arcade practice and modern indie postmortems point the same way: show the game playing well when idle (attract mode), teach through play, and minimise the time and penalty between death and the next attempt (Super Meat Boy's "remove lives, reduce respawn time, keep levels short").

### Cited Findings
- Attract mode is a pre-recorded demonstration shown when the game is idle, meant to entice passers-by and build understanding of the game, typically cycling demo play, high-score table and title — [Giant Bomb: Attract Mode](https://giantbomb.com/wiki/Concepts/Attract_Mode); [TV Tropes: Attract Mode](https://tvtropes.org/pmwiki/pmwiki.php/Main/AttractMode)
- A designer argues attract modes should show solid play that teaches the game rather than the traditional comically poor demo play — [Law of Game Design: Phalanx3d's attract mode](https://lawofgamedesign.com/2016/07/29/phalanx3ds-attract-mode/)
- McMillen frames difficulty as chance of dying multiplied by the penalty for dying; removing lives and making the penalty just restart time lets difficulty come from level design. Postmortem summary: "Remove lives, reduce respawn time, keep the levels short and keep the goal always in sight"; frustration was something to remove "at all costs" — [Game Developer: McMillen explains 'Why so hard?'](https://www.gamedeveloper.com/game-platforms/-i-super-meat-boy-i-s-mcmillen-explains-why-so-hard-); [MetaFilter quoting the postmortem](https://metafilter.com/102535/Almost-Insideout-Ninja); [gamedev.net interview](https://gamedev.net/tutorials/game-design/game-design-and-theory/raw-meat-game-design-tips-from-team-meats-edmund-mcmillen-r2868)
- Players complain when restart sequences/cutscenes are slow: "the restart scene must be very fast" — [Steam discussion](https://steamcommunity.com/app/40800/discussions/0/846958724682969433)

### Inferences
- **Attract mode** (Medium): record player inputs + RNG seed for a good run (deterministic replay) and loop it on the title screen after ~10 s idle, alternating with the local high-score table. Deterministic fixed-timestep update is required; if the engine isn't deterministic, a scripted AI demo is the fallback (Medium–High).
- **Tutorial via play** (Low–Medium): first wave has slow, non-firing enemies and a one-line pixel prompt ("DRAG TO MOVE"); Tetris shows ghost piece and control hints for the first 3 pieces; store "seenTutorial" in localStorage.
- **Quick restart** (Low): one tap/key from game-over to a new run in <1 s; skip any death animation on input. Show "NEW BEST" / "x points from your best" on the game-over screen to fuel "one more go" (inference).
- **Session hooks** (Low): personal-best ghost line in Tetris (row reached), per-mode best, daily streak counter, last-run stats summary.
- Risk: heavy "retention" pressure (streak loss guilt) — keep streaks forgiving (e.g. one free miss per week).

### Gaps
- No empirical study found quantifying attract mode or quick-restart effects on session length; evidence is designer accounts and player anecdotes.
