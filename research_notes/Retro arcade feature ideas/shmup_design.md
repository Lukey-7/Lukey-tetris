# Shmup Design Features: Candidate Additions for Star Vanguard

Scope note: Star Vanguard already has formations with dive attacks, wingmen, looping named stages, a no-shoot bonus stage with a PERFECT bonus, a boss with destructible pods, 3 ship classes, weapon tiers 1-4, a screen-clearing bomb, a combo multiplier, 3 lives, a 240x320 pixel renderer and chiptune music. The items below are things it does not have yet. Effort ratings (Low / Medium / High, for one developer in plain JS/Canvas with no backend) are my own estimates and appear under Inferences.

Source caveats: shmuplations.com returned HTTP 418 and StrategyWiki returned HTTP 403 to direct fetches, so no developer interview text is quoted directly. Where a fact is search-snippet-derived rather than read from the full page, that is noted.

## Galaga-specific mechanics (capture/dual fighter, challenging stages, transforms, hit-miss ratio, extends)

### Takeaway
Galaga's best-loved additions over Galaxian are the risk/reward tractor beam with its rescued dual fighter, the challenging stages, and enemies that transform. Each is a small rule built on top of formation-and-dive enemy logic Star Vanguard already has. The hit-miss ratio screen and score-based extends cost very little and add a "one more go" pull at game over.

### Cited Findings
**Tractor beam and dual fighter**
- Four Boss Galaga sit at the top of the formation and take two hits each. A Boss Galaga can capture the player's ship with a tractor beam, which costs a life. If the player has lives left, shooting the captor while it dives frees the ship, which then docks as a "dual fighter" with double firepower and a larger hitbox. Destroying the captor while it is still in formation turns the captured ship hostile instead. — [Wikipedia: Galaga](https://en.wikipedia.org/wiki/Galaga)
- Design history: Shigeru Yokoyama wanted enemies with different attack styles, and that led to the dual-fighter idea. The tractor beam was inspired by a film scene in which a ship was caught by a circling laser. Rescuing a ship originally gave an extra life, but this was changed so the ship fights alongside you. Hardware sprite limits first stopped the dual fighter from firing, until the team switched to 16x16 sprites. — [Wikipedia: Galaga](https://en.wikipedia.org/wiki/Galaga)
- Critics single out the dual-fighter strategy and the bonus stages as what keeps the game engaging. AllGame called it "perfectly balanced shooting action". — [Wikipedia: Galaga](https://en.wikipedia.org/wiki/Galaga)
- Guide advice for perfecting challenging stages is to bring a dual fighter in, which shows the double ship's value as a tool even though it doubles your exposure. — [Knoef trophy guide (via search snippet)](https://knoef.info/trophy-guides/ps4-guides/arcade-game-series-galaga-trophy-guide/)

**Challenging stages**
- Stage 3 and every fourth stage after it is a challenging stage, in which aliens fly preset patterns and do not fire. — [Wikipedia: Galaga](https://en.wikipedia.org/wiki/Galaga)
- Each challenging stage has 40 enemies in 5 groups of 8. Destroying a whole group of 8 pays a bonus that rises across stages: 1000 on the first two challenging stages, 1500 on the 3rd and 4th, 2000 on the 5th and 6th, and 3000 from the 7th on (one source only). Killing all 40 is a "Perfect" worth 10,000. Otherwise the payout is 100 per ship. — [Search-snippet summary of Galaga guides incl. StrategyWiki](https://strategywiki.org/wiki/Galaga/Gameplay) (full page fetch was blocked, so treat the per-group values as single-source)
- Note for Star Vanguard, which already has a perfect bonus: the missing pieces are the **per-group-of-8 bonus** and a **pattern that changes each loop**.

**Enemy transforms**
- Some enemies can morph mid-stage into new types with different attack patterns. Examples are Galaxian Flagships and the Bosconian-style "Midori" spy ships. — [Wikipedia: Galaga](https://en.wikipedia.org/wiki/Galaga)
- Scorpions, Stingrays and Galbosses are transform types. Each is worth 160 points, and destroying a whole transformed trio pays a group bonus (scorpions 1000, Bosconian ships 2000, Galaxian Flagships 3000, according to one table). — [Search-snippet summary of StrategyWiki](https://strategywiki.org/wiki/Galaga/Gameplay) (single source; base values also disagree between StrategyWiki and the US manual)

**Hit-miss ratio screen**
- Galaga counts every shot fired and shows a "hit-miss ratio" at game over. In rare cases the ratio can exceed 100%. — [Wikipedia mirror text (via search)](https://wikipedia2007.classicistranieri.com/g/a/l/Galaga.html)

**Extra-life thresholds**
- The default 3-life setting awards extends at 20,000, at 70,000, and then every 70,000. Operators can change this with DIP switches. — [Museum of the Game / MAME dip table](https://arcade-museum.com/tech-center/game-dips/galaga); [RetroAchievements](https://retroachievements.org/game/12138)
- The shmups glossary says extends are "usually rewarded after earning a certain score, or after completing specific in-game tasks". — [shmups.wiki: 1up/Extend](https://shmups.wiki/library/1up)

**Difficulty tuning history**
- Early location tests disappointed because players got too far on one coin, and executives asked for more difficulty. — [Wikipedia: Galaga](https://en.wikipedia.org/wiki/Galaga)

### Inferences
- **Tractor-beam capture and dual fighter: Medium.** Needs a new Boss dive state (hover plus a beam hit-zone), a captured-ship entity that rides in formation, rescue-on-dive logic, a hostile-ship variant if the captor is shot in formation, and a two-ship player with a doubled hitbox and doubled shots. The existing wingmen system could be reused for the docked ship. This is the most iconic missing Galaga feature and creates a real group-play decision ("do I let it take me?").
- **Per-group-of-8 bonus and loop-varying challenging patterns: Low.** These are data-table work on top of the existing bonus stage.
- **Enemy transforms: Low to Medium.** Swap a sprite and dive script mid-stage on a timer, spawn 3 copies, and track a trio bonus.
- **Hit-miss ratio on the game-over screen: Low.** Two counters and one screen. It feeds friendly bragging.
- **Score-based extends (for example 20k, 70k, every 70k, scaled to Star Vanguard's score economy): Low.** This gives a steady mid-game reward.

### Gaps
- Exact rescue scoring (Boss with captured ship escorted) was not verified because the StrategyWiki fetch was blocked.
- No primary-source developer quote on why players love the capture mechanic. Wikipedia's development section was the closest source.

## Modern scoring systems (grazing, chaining, medals, bullet cancelling, point-blank): approachable or expert-only?

### Takeaway
Simple, visible, forgiving systems work for casual groups: a graze counter, Garegga-style escalating medals, and Ikaruga-style "3 of a kind" chains. Systems built on hidden formulas or draining gauges (DoDonPachi chains, Mushihimesama counters, Espgaluda cancels) are for score-attack experts. Commenters on shmup forums say chain systems "can be disproportionately punishing of screwups" unless capped.

### Cited Findings
**Grazing**
- Grazing gives an effect for getting "extremely close to, but not touching, enemy bullets", such as score, items or slowed bullets. Raiden Fighters (Seibu Kaihatsu, 1996) is the earliest known commercial example. NMK's unreleased Uchuu Sensou (1995) paid escalating bonuses from 1000 to 8000, stepping up every 8 grazes and resetting on death. Raiden DX (1994) had a "GUTS" rating that included bullet proximity. Grazing is central to Psyvariar and many Touhou games. — [shmups.wiki: History](https://shmups.wiki/library/History)
- Touhou's graze counter tallies bullets that pass through the sprite without touching the hitbox, rewarding risky play. Some entries, such as Mountain of Faith, drop it. — [Wikipedia: Touhou Project](https://en.wikipedia.org/wiki/Touhou_Project)
- In Raiden Fighters the player is either grazing or not. Points build per frame, and the chain resets to zero after 30 frames without a graze. — [TASVideos forum](https://tasvideos.org/Forum/Posts/521592) (via search snippet)

**Chaining**
- Glossary definition of a chain: a repeated technique that raises points, usually by killing many enemies in a row or collecting one item type repeatedly. Also called "combos". — [shmups.system11.org glossary thread](https://shmups.system11.org/viewtopic.php?p=1213361) (via search snippet)
- **Ikaruga:** killing three same-coloured enemies in a row earns a chain. The first chain is worth 100 and each later chain doubles, capped at 25,600. Killing out of order resets the chain. Same-colour bullets are absorbed to charge a homing laser, and opposite-polarity shots do double damage. — [Wikipedia: Ikaruga](https://en.wikipedia.org/wiki/Ikaruga)
- Ikaruga got mixed Japanese arcade reception. Players told Iuchi "this isn't an arcade game...make it more thrilling and fast-paced." Western critics praised it as "innovative" and "clever" but found the difficulty a barrier for newcomers. — [Wikipedia: Ikaruga](https://en.wikipedia.org/wiki/Ikaruga)
- **DoDonPachi:** the combo gauge drains constantly and the combo breaks when it empties. Holding the laser on an enemy keeps the gauge up and adds hits. Bigger combos pay more per kill. Reaching the second loop requires a max hit count of at least 270 (Type A) or 300 (Type B). — [Wikipedia: DoDonPachi](https://en.wikipedia.org/wiki/DoDonPachi) (via search snippet)
- SaiDaiOuJou softened this: losing the gauge drops the counter by 25% and lets it decay, instead of zeroing it. — [Wikipedia: DoDonPachi SaiDaiOuJou](https://en.wikipedia.org/wiki/DoDonPachi_SaiDaiOuJou) (via search snippet)

**Medals**
- Battle Garegga: popcorn enemies drop medals in a fixed order. Each one collected makes the next worth more, from 100 up to 10,000. Letting a medal fall off the bottom of the screen resets the value to the lowest tier. — [Wikipedia: Battle Garegga](https://en.wikipedia.org/wiki/Battle_Garegga)
- Garegga bomb fragments: ground enemies drop small bomb tokens, and enough of them make a full bomb (up to 5 stocked). Small bombs can be used partially, with strength scaling by fraction. — [Wikipedia: Battle Garegga](https://en.wikipedia.org/wiki/Battle_Garegga)
- Raiden Fighters medals: some stages pay a bonus based on destruction percentage and medals collected per stage "chunk". — [TASVideos submission](https://tasvideos.org/8211S) (via search snippet)

**Bullet cancelling and point-blank**
- Espgaluda's Kakusei mode slows enemy bullets and cancels them into score gems, giving "an open-ended, bullet cancel-based scoring system". — [shmups.wiki: Espgaluda](https://shmups.wiki/library/Espgaluda) (via search snippet)
- In Espgaluda II Black Label, point-blank kills give more gems (exact amount unstated), and the cancel multiplier reaches 1000x while a chain bar holds. — [elotrolado.net fan thread (Spanish)](https://elotrolado.net/hilo_hilo-oficial-espgaluda-ii-black-label_1383827_s100) (via search snippet; low reliability)
- Mushihimesama scoring uses a "counter" raised by chaining and counter-banking, with fan-derived formulas (for example Counter*2 + base value per kill). — [shmups.system11.org Mushihimesama scoring thread](https://shmups.system11.org/viewtopic.php?p=1431640) (via search snippet)
- DaiOuJou's hyper gauge fills from big combos, **close-range attacks** and bee medals. Activating it cancels bullets and raises both scoring potential and base difficulty. — [shmups.wiki: History](https://shmups.wiki/library/History); [Wikipedia: DoDonPachi DaiOuJou](https://en.wikipedia.org/wiki/DoDonPachi_DaiOuJou) (via search snippet)

**Approachability evidence from developer and player communities**
- Scoring "incentivizes players to play in a certain way", for example by rewarding risk through chaining, and adds a measure of skill beyond lives remaining. — [itch.io dev discussion](https://itch.io/post/5811262) (via search snippet)
- Forum advice: make survival fun first so the game appeals to everyone, and balance scoring for depth and longevity for experts. Complex rank systems are "really hard to get right" for less experienced players. Chain systems are easy to understand but can be "disproportionately punishing", depending on whether there is a cap. — [shmups.system11.org "STG veterans - need your feedback"](https://shmups.system11.org/viewtopic.php?p=1571991) (via search snippet)
- A design argument from the same forum: treat a near-perfect run as the maximum, then decide which errors are "terrible", "significant" or "completely forgiven". — [shmups.system11.org](https://shmups.system11.org/viewtopic.php?p=1571696) (via search snippet)
- A warning against front-loaded scoring: a TAS critique found that about 65-90% of one game's score came from an initial no-miss period. — [TASVideos forum](https://tasvideos.org/Forum/Topics/7780) (via search snippet)

### Inferences
- **Graze counter with small points per graze and a visible counter: Low.** One extra distance check per bullet against a ring around the hitbox, plus a sound tick. It is very readable for casual players ("ooh, close one!"). It suits Star Vanguard best if enemies fire enough bullets, which Galaga-style games do sparingly. A graze-fed meter that recharges the bomb would tie into existing systems.
- **Escalating medal or pickup chain, Garegga-style: Low to Medium.** Enemies drop one medal type. Each catch raises the next value through a 100 → 10,000 ladder, and a missed medal resets it. This is highly legible and creates fun "dive for it" moments. It would sit beside, or replace part of, the existing combo multiplier, so check for overlap.
- **Ikaruga-style "kill 3 of the same type in a row" chain: Low.** This maps naturally onto Galaga's bee, butterfly and boss enemy types. It is a light puzzle layer that doesn't need polarity.
- **Point-blank bonus (more points or a bigger drop when the kill happens near the enemy): Low.** A distance check at kill time. It rewards the aggressive play a group enjoys.
- **Bullet cancel on boss or big-enemy death, turning bullets into score pickups: Low to Medium.** Very satisfying visually. A cancel-based scoring economy like Espgaluda's is expert-only and High effort to balance.
- **DoDonPachi drain-gauge chains or Mushihimesama counter systems: Medium to High** to tune, and expert-oriented. Not recommended for a casual group.

### Gaps
- No primary developer interview (Shmuplations was unreachable) on the design intent behind grazing, medals or chains.
- No exact point-blank formulas for Espgaluda or Mushihimesama were found.

## Rank / dynamic difficulty (Battle Garegga, Zanac)

### Takeaway
Rank raises difficulty in response to how strongly or aggressively you play. It keeps strong players challenged without separate difficulty modes. When it is hidden and steep, as in Garegga, it produces counter-intuitive play such as deliberate suicides and refusing power-ups, which casual players find baffling. A mild, transparent version is the friendly variant.

### Cited Findings
- **Battle Garegga:** firing, powering up the main weapon and picking up items raise rank. Losing a life lowers it, and the fewer lives you have, the bigger the drop. Players are effectively pushed to stay powered down, conserve shots, and deliberately die to keep late stages playable. A one-life clear needs detailed rank knowledge and a very cautious playstyle. — [Wikipedia: Battle Garegga](https://en.wikipedia.org/wiki/Battle_Garegga)
- Garegga's reception: Hardcore Gaming 101 called it "an absolute classic", while Push Square said it "may be an acquired taste these days". Realistically coloured bullets and explosion debris make bullets hard to see. — [Wikipedia: Battle Garegga](https://en.wikipedia.org/wiki/Battle_Garegga)
- **Zanac (Compile, 1986) ALC (Automatic Level Control):** the system measures performance and adjusts enemy spawns. Collecting power-ups and using the special weapon constantly bring tougher enemies, while losing ships or destroying recon ships reduce them. — [Giant Bomb: Zanac](https://www.giantbomb.com/zanac/3030-4394/) (via search snippet)
- Zanac's inputs reportedly include weapon type and power, fire rate, enemies missed and survival time. Failing to kill a boss before the timer ends raises the ALC, and starting a new level partly resets it. The writer notes it can make you die several times in a row. — [Retro XP: Remembering Compile: Zanac](https://retroxp.substack.com/p/remembering-compile-zanac) (via search snippet; secondary source)
- A play-rank variant ties rank to a score multiplier: eight rank steps multiply score from x1 at the lowest to x96 at the highest. — [PlayStation Blog](https://blog.playstation.com/?p=29740) (via search snippet; game not identified in snippet)
- Forum caution: complex rank systems are "really hard to get right" when targeting less experienced players. — [shmups.system11.org](https://shmups.system11.org/viewtopic.php?p=1571991) (via search snippet)

### Inferences
- **Pros:** one build serves both strong and weak players. Rank can be paired with a score multiplier so skilled players opt in for more points, which suits a friends' leaderboard.
- **Cons:** hidden rank feels unfair, rewards perverse play (suicide, under-powering), and makes friends' scores less comparable.
- **Recommendation for Star Vanguard: Low effort.** A small, visible "HEAT" or rank meter that rises with kill speed and no-death time, slightly speeds up dives and enemy bullets, multiplies score, and drops on death. Avoid punishing power-up pickups, because that is the Garegga trap. Star Vanguard already scales difficulty per loop, so this is a within-loop modifier.

### Gaps
- No primary developer statements on rank intent (Yagawa or Compile interviews were not reachable).

## Arcade conventions (attract mode, initials entry, continues/credits, 1CC culture, extends, stage select, second loop)

### Takeaway
High-score tables with initials and score-based extends are among the oldest drivers of arcade replay, and they are cheap to build in a browser game with localStorage. A continue system that resets or flags the score (plus a 1CC badge) keeps leaderboards meaningful while letting casual friends see later stages. Attract mode adds polish and makes the game feel like a real cabinet.

### Cited Findings
- **High-score history:** Sea Wolf (1976) was the first to use the term "high score". Space Invaders (1978) drove repeat play through an ever-rising best score. Exidy's Star Fire (December 1978) let players save initials next to a high score, held in RAM and erased when operators powered machines off at night. — [Wikipedia: High score](https://en.wikipedia.org/wiki/High_score)
- The same article says "high scores are inherently competitive" and can involve one-upmanship. Arcades often gave a free game for a high score. Twin Galaxies reported that score attempts got as much media coverage as any other game topic from 1982 to 1985. — [Wikipedia: High score](https://en.wikipedia.org/wiki/High_score)
- Eurogamer said online leaderboards add to Galaga's "addictiveness". — [Wikipedia: Galaga](https://en.wikipedia.org/wiki/Galaga)
- **Attract mode:** a demo that runs when nobody is playing, meant to entice passers-by. It typically cycles the title, story, high-score list and "Insert Coin" / "Game Over" text alongside a computer-controlled demo. Gameplay-demo attract modes remain common in home games. — [Wikipedia: Attract mode](https://en.wikipedia.org/wiki/Attract_mode)
- **1CC culture:** a 1CC is a "1 Credit Clear": finishing all stages on one credit with no continues. In looping games, clearing both loops is an "ALL" or "2-ALL" and clearing only the first is a "1-ALL". — [shmups.wiki: 1CC](https://shmups.wiki/library/1CC) (via search snippet)
- The 1CC grew out of the "quarter muncher" design of old arcade games, and one writer calls it "a benchmark without being a barrier" now that home versions have free play. The same writer argues that clearing in 5, 10 or 20 credits is "good enough" for most players. — [AUTOMATON: "Beating" arcade-style games and the coveted 1CC](https://automaton-media.com/en/column/20220627-13597/) (via search snippet; full fetch failed)
- Players who chase scores use only one credit and never continue, so continuing effectively voids a score run. — [shmups.system11.org thread](https://shmups.system11.org/viewtopic.php?p=1430994) (via search snippet)
- **Second loop / true ending gating:** DoDonPachi's second loop requires conditions including a minimum max-hit count. — [Wikipedia: DoDonPachi](https://en.wikipedia.org/wiki/DoDonPachi) (via search snippet)
- **Unlock for no-continue clears:** Touhou's Extra stage unlocks only after a clear without continues. — [Wikipedia: Touhou Project](https://en.wikipedia.org/wiki/Touhou_Project)
- **Stage select:** guides for Galaga's modern re-release suggest using level select to practise the stage before a challenging stage. — [Knoef trophy guide](https://knoef.info/trophy-guides/ps4-guides/arcade-game-series-galaga-trophy-guide/) (via search snippet)

### Inferences
- **Top-10 high-score table with 3-letter arcade-style initials entry, saved in localStorage: Low.** This is probably the single best fun-per-effort feature for a group sharing one machine. Show the table in attract mode.
- **Attract mode (title → demo → hi-score table loop after about 10 s idle): Low to Medium.** A cheap demo can replay a recorded input log, which is deterministic only if the RNG is seeded, or use a simple AI that steers toward the nearest enemy x position and fires.
- **Continues with a 10-second countdown: Low.** Reset score to 0 or mark the score with a "C" so continued runs don't pollute the high-score table. Show a "1CC!" badge or tag on scores achieved without continuing.
- **Stage select or practice mode: Low.** Unlock stages after first reaching them, and mark practice scores as non-ranked.
- **Second-loop or true-ending gate:** for example, an "ALL CLEAR" or harder second loop unlocked only by no-continue runs, or a secret final stage for a 1CC. Low to Medium. Star Vanguard already loops, so this is mostly a named gate plus a tougher palette and variant.
- No backend means leaderboards are per-device. A shareable score string or code (for example, score plus initials plus checksum to paste in chat) is a Low-effort substitute for online boards.

### Gaps
- Could not verify which game was first with 3-initial entry (Asteroids is often claimed, but the Wikipedia High score article credits Star Fire with initials and does not mention Asteroids).
- No sourced data on continue-countdown conventions (for example, a typical 9 or 10 second timer). This is common knowledge but not cited here.

## Other mechanics (options, charge shots, weapon switching, shields vs one-hit deaths, hitbox visualisation, focus/slow movement)

### Takeaway
Focus/slow movement with a visible hitbox (Touhou) and small hitboxes are cheap and make dodging feel fair. Gradius-style options are iconic and moderately easy to build. Shields soften one-hit deaths for casual players. A deathbomb window gives a Low-effort forgiveness mechanic that fits the existing bomb.

### Cited Findings
- **Focus mode and visible hitbox:** in Touhou, holding Shift slows movement and concentrates fire. From Perfect Cherry Blossom onward it also shows the hitbox. Hitboxes have been smaller than the sprite since Story of Eastern Wonderland. — [Wikipedia: Touhou Project](https://en.wikipedia.org/wiki/Touhou_Project)
- **Deathbomb:** a bomb used within about 8 frames (roughly 0.3 s) after being hit cancels the death. Losing a life refills bombs up to a cap. — [Wikipedia: Touhou Project](https://en.wikipedia.org/wiki/Touhou_Project)
- **Fragment extends and bombs:** from Subterranean Animism on, life pieces and bomb pieces add up to full extras. Garegga stocks bomb fragments the same way. — [Wikipedia: Touhou Project](https://en.wikipedia.org/wiki/Touhou_Project); [Wikipedia: Battle Garegga](https://en.wikipedia.org/wiki/Battle_Garegga)
- **Spell-card-style boss phases with a capture bonus:** a boss attack phase ends when health drops a set amount or time runs out. Clearing it with no deaths and no bombs gives a bonus (Mountain of Faith). Capturing enough of them unlocks a bonus stage (Perfect Cherry Blossom). — [Wikipedia: Touhou Project](https://en.wikipedia.org/wiki/Touhou_Project)
- **Gradius options and power meter:** power-up capsules advance a selector on the power meter, and the player chooses when to activate the highlighted ability, which resets the meter. Developers tried twenty movement patterns for the Options before choosing one. In Salamander 2, Options can be fired as homing projectiles. — [Wikipedia: Gradius](https://en.wikipedia.org/wiki/Gradius) (the article does not list option count or trailing behaviour)
- **Garegga options:** up to four option pods with five preset formations, plus secret formations unlocked by dropping a set number of power-ups. — [Wikipedia: Battle Garegga](https://en.wikipedia.org/wiki/Battle_Garegga)
- **Hyper or temporary power mode:** a gauge-funded temporary power-up that cancels bullets, strengthens the player and raises score potential, at the cost of higher base difficulty (DaiOuJou, 2002; P-47 Aces prototype, 1995). — [shmups.wiki: History](https://shmups.wiki/library/History)
- **Ikaruga polarity switching:** an example of "weapon/state switching" as the core mechanic. Critics found it innovative but a barrier for newcomers. — [Wikipedia: Ikaruga](https://en.wikipedia.org/wiki/Ikaruga)

### Inferences
- **Focus/slow-move key with a visible hitbox dot and a shrunken hitbox: Low.** This is one modifier on speed plus one draw call. It improves fairness feel immediately. At 240x320 the dot should be 1-2 px with an outline.
- **Deathbomb window of about 8-10 frames: Low.** It reuses the existing bomb and is very forgiving for casual friends.
- **Gradius-style options trailing the ship's past positions: Medium.** Keep a ring buffer of the last N positions and place options at fixed offsets. Fire duplicates of the main shot. Make sure this doesn't clash visually with the existing wingmen. A "trail" behaviour differs from fixed wingmen, so it could be a ship-class perk.
- **Gradius power-meter "choose your upgrade": Medium.** It needs UI and rebalancing of weapon tiers 1-4. It is strategically deep but risks muddying the current simple tier system.
- **Charge shot (hold to charge a piercing blast, release to fire): Low to Medium.** It is a good fit for one of the 3 ship classes.
- **One-hit shield (absorbs one hit, dropped by special enemies): Low.** This softens one-hit deaths for casual players without removing tension. A shield on the rescued dual fighter is not needed: losing one of the two ships already acts as a soft shield.
- **Boss "spell-card" phases with a per-phase no-hit/no-bomb bonus: Medium.** This mainly needs boss pattern authoring and gives clear moment-to-moment goals.
- **Hyper mode fed by combo: Medium.** It overlaps with the existing bomb and combo, so treat it as optional.

### Gaps
- No source found for exact Gradius option count or trailing algorithm in the fetched article. The commonly known values (max 4 options following the ship's path) are unverified here.
- No source evaluated shields versus one-hit deaths in casual play directly.

## Fun per unit of effort for a small game played casually by friends

### Takeaway
Ranked by my judgement from the evidence above, the best value comes first from social and competition features (initials high-score table, hit-miss ratio, 1CC tags, score extends), then from Galaga's signature capture/dual-fighter mechanic, then from simple, visible scoring hooks (medal ladder, graze counter, point-blank). Hidden or punishing systems (Garegga rank, DoDonPachi drain chains, cancel economies) give poor returns for casual groups.

### Cited Findings
- High scores are "inherently competitive" and drove arcade-era media attention and repeat play. — [Wikipedia: High score](https://en.wikipedia.org/wiki/High_score)
- Critics credit Galaga's dual-fighter strategy and bonus stages for its lasting appeal. — [Wikipedia: Galaga](https://en.wikipedia.org/wiki/Galaga)
- Survival should be fun for all, scoring adds depth for experts, rank is hard to get right for novices, and chains can be "disproportionately punishing" unless capped. — [shmups.system11.org](https://shmups.system11.org/viewtopic.php?p=1571991) (via search snippet)
- Players praise scoring that "reward[s] aggressive play and aren't too fiddly". — [shmups.system11.org / reviews (via search snippet)](https://shmups.system11.org/viewtopic.php?p=1571696)
- Garegga's rank pushes players into deliberate deaths and staying powered down, which is counter-intuitive for newcomers. — [Wikipedia: Battle Garegga](https://en.wikipedia.org/wiki/Battle_Garegga)
- Ikaruga's novel system was a barrier for newcomers. — [Wikipedia: Ikaruga](https://en.wikipedia.org/wiki/Ikaruga)

### Inferences
Suggested priority list (effort for one developer in JS):
1. **Local high-score table with 3-letter initials entry** (Low). Shown in attract mode. Mark scores achieved with continues.
2. **Score-based extends** (Low), for example a first extend early, then every N points, scaled to the current score economy.
3. **Game-over results screen**: shots fired, hits, hit-miss ratio, max combo, grazes, medals (Low).
4. **Tractor-beam capture and dual-fighter rescue** (Medium). The signature Galaga moment and a social talking point.
5. **Escalating medal ladder (100 → 10,000, resets if missed)** or a **"3 of a kind" kill chain** (Low). Pick one, not both, to avoid stacking on the existing combo.
6. **Graze counter and point-blank bonus** (Low). These reward aggression and close calls, and pair well with a graze-charged bomb.
7. **Focus/slow movement with a visible hitbox, plus a deathbomb window** (Low). Fairness and forgiveness for casual players.
8. **Continue countdown with a 1CC badge and a practice/stage select** (Low).
9. **Enemy transforms and challenging-stage per-group bonuses** (Low to Medium).
10. **Attract mode with a demo** (Low to Medium).
11. **Visible "heat" rank multiplier** (Low), mild and transparent, never punishing pickups.
12. **Gradius-style trailing options or a charge shot as a ship-class perk** (Medium).

Avoid for this audience: Garegga-style hidden rank, DoDonPachi drain-gauge chains, Espgaluda-style cancel economies, Ikaruga polarity as a core loop (High tuning cost, expert-oriented).

### Gaps
- No quantitative playtest data compares the fun of these features. The ranking above is a reasoned inference, not a measured result.
- Primary Japanese developer interviews (Shmuplations) were not reachable in this session. A follow-up fetch from another network might add first-hand design rationale.
