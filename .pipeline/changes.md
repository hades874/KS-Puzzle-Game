# Changes — straighten/centre the puzzle image + black, background-removed theme

Implements `.pipeline/spec.md` exactly. Spec had no OPEN QUESTIONS (its "Resolved decisions" section already answers what would otherwise have been open questions), so no clarification was needed before implementing.

## Files changed

### `d:\ks-puzzle\js\puzzle-render.js`
- Added module-level tuning constants (`SOURCE_TILT_DEG`, `SOURCE_FOCUS_X/Y`, `SOURCE_ZOOM`, `BG_LUM_MIN`, `BG_LUM_SOFT`, `BG_SAT_MAX`) directly under `var S = global.PuzzleShapes;`, verbatim from the spec.
- Added `clamp(v, lo, hi)` helper.
- Added `normalizeSource(image)`: creates an `S.IMG_W x S.IMG_H` canvas, fills it black, reads `naturalWidth/naturalHeight` (bails out returning the black canvas if either is falsy — no throw), cover-fits + zooms + rotates + translates to the focus point via `drawImage`, then runs the luminance/saturation background-suppression pass wrapped in `try/catch` (silently no-ops on a tainted canvas, e.g. `file://`). Algorithm order matches the spec's 9 numbered steps exactly (fill black → read natural size → compute scale → translate → rotate → scale → drawImage → try/catch pixel key).
- `renderPieces` is untouched. Export changed to `global.PuzzleRender = { renderPieces: renderPieces, normalizeSource: normalizeSource };`.

### `d:\ks-puzzle\js\main.js`
- Removed `var ghostImg = document.getElementById('ghost-image');`.
- Added the eager, shared image-load block from the spec verbatim: `PUZZLE_IMAGE_SRC`, `startCanvas`/`winCanvas`/`ghostCanvas` lookups (`start-medal-canvas`, `win-medal-canvas`, `ghost-canvas`), the `sourceCanvas`/`sourceFailed`/`sourceCallbacks` cache, `getSource(cb)` accessor, `drawInto(canvas, source)` helper, and the self-invoking `loadSource()` that creates one `Image`, normalizes it once via `window.PuzzleRender.normalizeSource`, draws the result into all three canvases, and flushes any queued `getSource` callbacks (success and failure paths both drain the queue).
- In `ensureGame()`'s options object: removed `ghostImg: ghostImg,`, added `getSource: getSource,`. Screen switching, share/replay handlers, and Bangla digit formatting are unchanged.

### `d:\ks-puzzle\index.html`
- Added `<meta name="theme-color" content="#0B1117" />` right after the viewport meta.
- Start peek `<img>` → `<canvas id="start-medal-canvas" class="start-medal-canvas" width="1080" height="1600" role="img" aria-label="...">`.
- Game-screen ghost `<img id="ghost-image">` → `<canvas id="ghost-canvas" class="ghost-image" width="1080" height="1600" aria-hidden="true">`.
- Win-screen `<img>` → `<canvas id="win-medal-canvas" class="win-medal-canvas" width="1080" height="1600" role="img" aria-label="...">`.
- No other HTML changes.

### `d:\ks-puzzle\js\puzzle-game.js`
- `initGame()`: `var ghostImg = opts.ghostImg;` → `var getSource = opts.getSource;`.
- `layoutBoardSize()` rewritten to measure `wrap.clientWidth/clientHeight` minus `getComputedStyle` padding (content box) instead of `getBoundingClientRect()` (border box, which double-counted the 12/16px `.board-wrap` padding and broke the 1080:1600 aspect ratio). Guards on `availW > 0 && availH > 0` before doing anything; width and height are always derived together from the same ratio so `IMG_W:IMG_H` is preserved exactly (never rounds one dimension independently of the other).
- `build()` rewritten to call `getSource(function (source) { ... })` instead of creating its own `Image()`. The `source === null` branch reproduces the original Bangla `tray-error` message verbatim (same class, `role="alert"`, same text) and returns without calling `onProgress`. The success branch is otherwise identical to the old `image.onload` body, just fed the shared `source` canvas into `global.PuzzleRender.renderPieces(source, grid)` (unchanged signature — `drawImage` already accepts a canvas source).

### `d:\ks-puzzle\css\game.css`
- Added `html, body { background: var(--bg-inverse); }` at the top of the file, before `.screen`.
- `.screen-start, .screen-win`: three-layer red gradient background replaced with `background: var(--bg-inverse);`; all other declarations (position/overflow/display/align/justify/padding/color/text-align) untouched.
- `.screen-game`: `background: var(--bg);` → `background: var(--bg-inverse);`.
- `.game-header`: `border-bottom: 1px solid var(--border);` → `rgba(255,255,255,0.12)`.
- `.brand-mark-text`: `color: var(--fg-1);` → `#fff`.
- `.progress-pill`: background/border/color switched to the rgba(255,255,255,…) dark-theme values from the spec.
- `.progress-sep`: `color: var(--fg-3);` → `rgba(255,255,255,0.5)`.
- `.board`: added `flex: 0 0 auto;` (Change 4 — stops flexbox shrinking the explicit width while the explicit height stays fixed, which was the root cause of the aspect-ratio bug); `background`/`border` switched to `#060809` / `rgba(255,255,255,0.14)` (Change 5).
- `.tray`: `border-top`/`background` switched to the dark-theme values.
- `.tray-error`: `color: var(--fg-2);` → `rgba(255,255,255,0.78)`.
- `.piece.dragging`: `filter: drop-shadow(0 10px 22px rgba(17,24,39,0.32));` → `drop-shadow(0 0 14px rgba(255,255,255,0.30));` (dark shadow was invisible on the new dark board).
- `.share-toast`: `background: rgba(17,24,39,0.94);` → `#1A1A1A;` plus added `border: 1px solid rgba(255,255,255,0.22);`.
- Replaced `.start-medal-peek img { width: 100%; display: block; }` and `.win-image-wrap img { width: 100%; display: block; }` with a single combined rule: `.start-medal-canvas, .win-medal-canvas { width: 100%; height: auto; display: block; }`.
- `.ghost-image`, `.btn-primary`, `.btn-outline`, `.eyebrow`, `.start-sub/.win-sub`, `.geo-watermark`, `.start-medal-peek`'s mask-image, and `.confetti-canvas` left untouched, per spec.
- `assets/colors_and_type.css`, `js/puzzle-shapes.js`, and `js/confetti.js` were not touched, per spec's explicit exclusion list.

## Verification performed
- `node -c` syntax-checked `js/puzzle-render.js`, `js/main.js`, `js/puzzle-game.js` — all pass.
- Served the repo via `python -m http.server 8000` and confirmed `index.html`, all three modified JS files, `css/game.css`, and `assets/puzzle-medal.jpg` all return HTTP 200 (then stopped the server).
- Playwright is not installed in this environment, so the spec's Verification section (screenshot diffing, drag-drop simulation, the `b.height/b.width ≈ 1.481` console check, forcing the error path) was **not** run by me. The tester should run through that section manually/with Playwright, in particular:
  - Confirm the medal photo reads level/centred and the background is visibly darkened, and tune `SOURCE_TILT_DEG`/`SOURCE_ZOOM`/`SOURCE_FOCUS_*`/`BG_LUM_MIN`/`BG_SAT_MAX` visually if it doesn't look right — the spec explicitly says these constants are a starting point ("iterate visually; there is no single correct value").
  - Confirm `#board`'s `getBoundingClientRect()` ratio is ≈1.481 and pieces snap without a visible jump.
  - Confirm no console errors from `getImageData`/`putImageData` when served via `http.server`, and confirm graceful degradation (Bangla tray-error message, blank start/win canvases, no throw) when the image fails to load.

## Deviations / risks
- No deviations from the spec's exact algorithm order, function signatures, CSS selectors, or values — implemented as specified throughout.
- One thing to flag for the tester, not a deviation: the tuning constants (tilt angle, zoom, focus point, luminance/saturation thresholds) were copied verbatim from the spec's suggested defaults, which the spec itself describes as approximate/derived from manual corner measurements. Actual visual correctness of the straightening and background-suppression on `assets/puzzle-medal.jpg` has not been eyeballed by me (no visual/screenshot tooling used in this pass) — this is exactly the iterative tuning step the spec's Verification section calls out as expected follow-up.
