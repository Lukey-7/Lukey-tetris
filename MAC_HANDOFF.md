# Mac handoff: Lukey Tetris (Lukey-Arcade)

## 1. What it is
A static retro arcade site with two games: **Tetris-89** (`index.html`, `popup.html`) and **Star Vanguard**, a Galaga-style shooter (`space.html`, `space_popup.html`; formerly "Nova Strike").
The stack is plain HTML/CSS/JS with the Web Audio API and no build step. `server.js` is a tiny Node static server, `vercel.json` (cleanUrls) handles static hosting, and `flutter_app/` is an Android WebView wrapper. GitHub Actions builds the APK.

## 2. Mac setup from zero
```zsh
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git node gh            # no Node version is pinned; any current LTS works
gh auth login
git clone https://github.com/Lukey-7/Lukey-tetris.git ~/code/Lukey-tetris
cd ~/code/Lukey-tetris

node server.js 4000                 # http://localhost:4000/ and /space.html
open index.html                     # or open the file directly, with no server
node test_engine.js                 # engine/modes/storage checks (mocks browser globals)
```
- **Windows-only items:**
  - `run.bat` (whole file; `start "" "%~dp0index.html"` at run.bat:7) and README.md:148 ("Double-click `run.bat`"). On the Mac, use `open index.html` instead.
  - No other hardcoded Windows paths are tracked.
- **README mismatch:** the README says the default port is 3888, but `server.js` actually defaults to 4000 (it reads `PORT` env or argv[2]).
- **Android APK (optional, local):**
  - Install the tools with `brew install --cask flutter temurin@17 android-studio`.
  - Mirror the CI steps in `.github/workflows/build-apk.yml`: copy the web files into `flutter_app/assets/web/`, run `flutter create --platforms=android ...` into a temp dir, copy `android/` over without overwriting, then `cd flutter_app && flutter pub get && flutter build apk --release`.
  - The simplest route is to push to `main`, which makes CI build the APK and update the `v1.0.0` release.
- **Deploy:** this is a static site with `vercel.json`. No Vercel project is documented in the repo, so confirm with the owner before deploying.

## 3. Env / secrets
- There is no `.env` and none is needed. `PORT` is optional.
- CI uses only the built-in `GITHUB_TOKEN`.
- **Copy manually from the PC:** the untracked `reports/` and `research_notes/` folders. They are not in git (see below).

## 4. Current state (as of 2026-10-10)
```
7d0c2bb 2026-10-10 feat: Star Vanguard gameplay overhaul; classic 7 pieces by default   <- LOCAL ONLY, not pushed
4ad9253 2026-10-09 feat(nova-strike): NES-style chiptune soundtrack
93ed68a 2026-10-09 feat(nova-strike): true 8-bit arcade pixel renderer
75c6daa 2026-10-09 fix(android): upgrade vibration plugin ... and webview_flutter_android
cd6e4e9 2026-10-09 feat: swipe controls, volume sliders, PNG icons, Zen & Daily modes; fix Android build
ec9038a 2026-10-09 fix: harden dev server and fix Tetris gameplay bugs
2b01464 2026-09-10 docs: update README with Nova Strike 1989 arcade suite ...
576d60a 2026-09-10 refactor: separate Tetris and Nova Strike into independent pages
```
- **Before leaving the PC:**
  - Push `7d0c2bb` with `git push` from the PC, or it is lost on a fresh clone.
  - Copy `reports/Retro arcade feature ideas.md` and `research_notes/` (`retention_polish.md`, `shmup_design.md`, `social_multiplayer.md`, `tetris_features.md`). You can also commit them first if you want them in the repo.
- **Last work:**
  - Star Vanguard overhaul: Galaga-style formations and dives, named stages, bonus stage, a boss with destructible pods, and a spawn-timer fix.
  - Tetris now defaults to the classic 7 pieces.
- **Next, per the research report (not yet agreed with the owner):**
  - A social layer: an initials high-score table, a shareable Daily result, URL-fragment challenge codes, and rematch.
  - Then the Galaga tractor beam / dual fighter for Star Vanguard, and T-spin detection for Tetris, which must come before any versus mode.
- The README still describes old features in places, for example "Nova Strike" and the 14-piece default.

## 5. First prompt for Claude on the Mac
> This is Lukey-Arcade (Lukey-7/Lukey-tetris), a no-build static HTML/JS site with Tetris-89 and Star Vanguard, plus a Flutter WebView APK built by GitHub Actions. I just moved from Windows. Read MAC_HANDOFF.md, README.md and `reports/Retro arcade feature ideas.md` (if I copied it over). Confirm `git log -1` shows 7d0c2bb (Star Vanguard overhaul). Run `node test_engine.js` and `node server.js 4000`, then sanity-check both games in a browser. Then fix the README's stale bits (run.bat, port 3888, Nova Strike naming, piece default) and propose a short plan for the social-layer features from the report. Don't implement anything until I agree.
