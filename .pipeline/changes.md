# Changes — 3 remaining review fixes (ks-puzzle)

Implemented exactly per `.pipeline/spec.md`. No open questions; no scope added beyond the spec (no retry/timeout logic, no extra styling, no other files touched).

## Files changed

### 1. `js/puzzle-game.js`
- In `build()`, added `image.onerror` between the existing `image.onload = ...` assignment and `image.src = ghostImg.src;` (now lines 181–187).
- On error, creates a `<p className="tray-error bn" role="alert">` via `document.createElement` + `textContent` (no `innerHTML`), with the exact Bangla copy from the spec, and appends it to `trayEl`.
- Does not call `onProgress`/`onWin`. No cleanup code added — `start()` (unchanged, still calls `trayEl.innerHTML = ''` before `build()`) already clears the message on replay.
- UTF-8 literal Bangla text used (no escapes), file encoding/BOM unchanged.

### 2. `js/puzzle-render.js`
- Single-line change inside `renderPieces()`: replaced the 5-arg
  `ctx.drawImage(image, -bbox.x, -bbox.y, S.IMG_W, S.IMG_H);`
  with the 9-arg source-rect overload
  `ctx.drawImage(image, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);`
- Nothing else in the file touched (`buildPath2D`, `ctx.scale(dpr, dpr)`, `ctx.clip(path)`, stroke block, canvas sizing all untouched).

### 3. `css/game.css`
- Added a `.tray-error` rule immediately after the `.tray { ... }` block, before the `/* ---------- Puzzle pieces ---------- */` comment. Uses `flex: 1 1 auto`, centered text, `font-size: 14px`, `color: var(--fg-2)` (existing token, no hardcoded hex).
- Deleted the dead `@media (prefers-reduced-motion: reduce) { .geo-drift { animation: none; } }` rule and its preceding blank line, which were the last lines of the file. File now ends with `.drag-layer`'s closing `}` followed by a single trailing newline (verified with `wc -l` / `tail -c`: 274 lines, no stray blank line or extra rule after it).
- `@keyframes geo-drift` / `.geo-drift` (lines 76–77 originally) left untouched — still live.

### Not touched (per spec)
`index.html`, `js/main.js`, `js/puzzle-shapes.js`, `js/confetti.js`, `assets/colors_and_type.css` — no edits made to any of these.

## Verification notes for the Tester

- Both modified JS files pass `node -c` syntax checks; no build step exists for this project (static HTML/CSS/JS, serve via `python -m http.server 8000` from `d:\ks-puzzle`).
- **Bug 2 (drawImage) is the highest-risk change and needs a visual before/after check**, not just a code read: capture screenshots of `#tray` (unsolved, showing border pieces from row 0, row 3, col 0, col 2 — these are the ones whose bbox extends outside the 1080×1600 source image) and of the solved `#board`, before and after the change, and confirm they are pixel-identical (piece art aligned inside jigsaw outline, white stroke intact, no seams/offsets/transparent gaps). Per the spec, out-of-bounds source rects are expected to be legal/clipped correctly by the canvas spec — this should hold, but must be confirmed rather than assumed.
- **Bug 1**: force `image.onerror` by pointing `#ghost-image`'s `src` at a missing path via the console before clicking `#btn-start` (see spec Verification step 5), then confirm the Bangla `role="alert"` message renders centered in the tray with the `.tray-error` styling (14px, `--fg-2` color, Bangla font from `.bn`). Confirm the progress pill is untouched and that starting a fresh game (replay) clears the message via `trayEl.innerHTML = ''` in `start()`.
- **Bug 3**: with Chromium's `prefers-reduced-motion: reduce` emulation on, confirm start-screen watermarks (`.geo-drift`) are still static — this is now handled solely by the universal rule in `assets/colors_and_type.css` (lines 135–137), which was not modified.
- Confirm `css/game.css` has no trailing extra blank line/rule after `.drag-layer` and that no other CSS rules were altered.
