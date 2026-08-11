# Spec — straighten/centre the puzzle image + black, background-removed theme (ks-puzzle)

## Resolved decisions (user answered the open questions below)

1. **Background scope = Both.** The app/page background (red gradient on start/win, white on game screen) becomes solid dark (#0B1117, see below). *And* the photo's own background (office wall/ceiling/floor/lanyard-adjacent clutter) is suppressed toward black in-code via a luminance/saturation heuristic — see Change 1. This is **not** true ML segmentation (none is available in this offline, vanilla-JS, no-build-step, no-dependency codebase); it is a best-effort key that fades bright, low-saturation pixels (the wall/ceiling/floor) toward black while preserving the saturated gold medal and maroon ribbon. Expect soft fringing at edges, not a pixel-perfect cutout. Combined with the tighter crop already needed for the tilt fix (Change 1's `SOURCE_ZOOM`), most of the background area is gone before the key even runs.
2. **Black shade = `#0B1117`**, not pure `#000000`. This is **already a token**: `--bg-inverse: #0B1117` in `assets/colors_and_type.css:40`. Use `var(--bg-inverse)` everywhere below — do not add a new token, do not touch `colors_and_type.css`.
3. **Geo-watermarks stay.** The three drifting `.geo-watermark` SVGs (`index.html:19-21`, red strokes at 0.14-0.20 opacity) are unchanged.
4. **Tilt fix = auto-correct in code.** Rotate+crop the existing `assets/puzzle-medal.jpg` at load time via tunable constants. Approximate; iterate visually per the Verification section.

## Why this spec restructures image loading (read before implementing)

The same photo is used in three places: the start-screen peek (`index.html:29`), the game-screen ghost (`index.html:48`), and the win-screen image (`index.html:60`). Today all three independently load the raw, tilted, un-keyed JPEG. Since the user wants straightening *and* background removal applied consistently, all three must show the **same normalized bitmap**, not three independent copies. Doing the correction three times would also run the (non-trivial) per-pixel background key three times.

The fix: `main.js` loads and normalizes the image **once**, eagerly, on page load (not lazily when the user clicks "start" — the start-screen peek is visible immediately). It caches the resulting canvas and draws it into all three `<canvas>` elements (start peek, ghost, win). `puzzle-game.js` no longer loads or owns the image at all — it asks `main.js` for the cached bitmap via a `getSource(callback)` accessor when it needs to build pieces. This is simpler than the previous per-module lazy-load design, not more complex: one fetch, one decode, one normalize pass, three consumers.

---

## Findings the implementation depends on (do not re-litigate)

- **Tilt:** purely the photo's content, not a CSS/DOM rotation. No `rotate()`/`transform` exists anywhere on the board/piece/ghost code path today (the only rotations in the repo are `js/confetti.js:42` and the decorative SVG `index.html:20`). Correcting it in an offscreen bitmap keeps all pointer/drag math untouched.
- **Not centred / mis-registered (real, separate bug):** `layoutBoardSize()` (`js/puzzle-game.js:30-43`) measures `wrap.getBoundingClientRect()`, which **includes** `.board-wrap`'s `padding: 12px 16px` (`* { box-sizing: border-box }`). On a 390px viewport it sets the board to `380 × 563`, but the wrap's content box is only 358px, so flexbox (default `flex-shrink: 1`) shrinks the board to **358 × 563** — aspect 0.636 instead of the required 0.675 (1080:1600). Consequences: `computeScale()` uses width only, so the solved puzzle covers only 530px of a 563px-tall board (dead band at the bottom); the ghost (`object-fit: cover`) no longer lines up with the pieces; the drop targets in `tryDropOrReturn()` (from `boardRect.height / ROWS`) sit up to ~28px off from where `snapToBoard()` places a row-3 piece — pieces visibly jump on snap. Fixed in Change 4.
- **`getImageData`/`putImageData` is new to this codebase.** `renderPieces()` in `puzzle-render.js` only ever calls `drawImage` (no pixel readback), so nothing in the existing code depends on canvas same-origin access. The new background-suppression step in Change 1 is the **first** pixel-readback call in the app. This taints/throws under Chrome's file:// origin policy if the page is ever opened by double-clicking `index.html` instead of via a local server (the existing Verification section already assumes `python -m http.server`, so this is not a new requirement — but the code must degrade gracefully, not crash, if it happens anyway). Change 1 wraps this in try/catch.
- **Contrast on the new dark background:** going to `#0B1117` breaks `.brand-mark-text` (`--fg-1` #111827 on #0B1117 ≈ 1.05:1), `.tray-error` (`--fg-2` #4B5563 ≈ 2.2:1), the light `.progress-pill`, the light `.board` surface, the dark `.share-toast`, the light `--border` hairlines, and the dark `.piece.dragging` drop-shadow (invisible on a dark board). All re-themed in Change 5 — none may be left on the old light-mode tokens.

---

## Scope

Vanilla ES5-style IIFE modules, `var`, no build step, no dependencies (still true — the background key is hand-rolled pixel math, not a library). Match the existing style in every file you touch.

Files to modify (absolute paths):

1. `d:\ks-puzzle\js\puzzle-render.js` — add `normalizeSource()` (rotate/crop/zoom + background suppression)
2. `d:\ks-puzzle\js\main.js` — own the eager, shared image load; draw all three display canvases; expose `getSource` to the game module
3. `d:\ks-puzzle\index.html` — all three `<img src="assets/puzzle-medal.jpg">` become `<canvas>`; add `theme-color` meta
4. `d:\ks-puzzle\js\puzzle-game.js` — consume `opts.getSource` instead of loading its own image; fix `layoutBoardSize()`
5. `d:\ks-puzzle\css\game.css` — dark theme via `var(--bg-inverse)`, `.board { flex: 0 0 auto }`, canvas display rules for the start/win thumbnails

Do **not** touch `assets/colors_and_type.css` (shared design tokens — `--bg-inverse` already exists there; override presentation in `game.css`, which loads after it), `js/puzzle-shapes.js`, `js/confetti.js`, or any file in `assets/`.

---

## Change 1 — normalize the source image (`d:\ks-puzzle\js\puzzle-render.js`)

Add module-level tuning constants at the top of the IIFE, directly under `var S = global.PuzzleShapes;`:

```js
// Corrects the hand-held source photo: the medal plaque sits ~4.5 deg
// counter-clockwise and low-and-right of frame centre in assets/puzzle-medal.jpg.
var SOURCE_TILT_DEG = 4.5;   // positive = rotate content clockwise
var SOURCE_FOCUS_X  = 0.57;  // subject centre, fraction of natural width
var SOURCE_FOCUS_Y  = 0.59;  // subject centre, fraction of natural height
var SOURCE_ZOOM     = 1.30;  // >1 crops tighter around the focus point

// Background-suppression heuristic (no ML segmentation available offline):
// fades pixels that look like the office wall/ceiling/floor (bright, low
// saturation) toward black, while leaving the saturated gold medal and
// maroon ribbon alone. Tune conservatively — false positives speckle the
// medal's highlights, false negatives leave background visible.
var BG_LUM_MIN  = 140; // luminance (0-255) above which a pixel can be "background"
var BG_LUM_SOFT = 60;  // luminance range over which the fade ramps in
var BG_SAT_MAX  = 0.16; // saturation below which a pixel can be "background"
```

Add a `clamp` helper and export a new function (keep `renderPieces` exactly as it is):

```js
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

// image: HTMLImageElement (loaded). Returns a canvas exactly S.IMG_W x S.IMG_H.
function normalizeSource(image) { ... }

global.PuzzleRender = { renderPieces: renderPieces, normalizeSource: normalizeSource };
```

Required algorithm, in this order:

1. `canvas.width = S.IMG_W; canvas.height = S.IMG_H;` (bitmap only — never displayed directly, so **no DPR scaling**).
2. Fill the whole canvas with `#000` first, so any uncovered corner is black rather than transparent.
3. `var nw = image.naturalWidth || image.width, nh = image.naturalHeight || image.height;` If either is falsy, return the canvas as-is (all black) — do not throw.
4. `var s = Math.max(S.IMG_W / nw, S.IMG_H / nh) * SOURCE_ZOOM;` (cover-fit, then zoom).
5. `ctx.translate(S.IMG_W / 2, S.IMG_H / 2);`
6. `ctx.rotate(SOURCE_TILT_DEG * Math.PI / 180);`
7. `ctx.scale(s, s);`
8. `ctx.drawImage(image, -nw * SOURCE_FOCUS_X, -nh * SOURCE_FOCUS_Y);` — puts the focus point at the frame centre.
9. **Background suppression — wrap this entire step in `try { ... } catch (err) {}`.** If `getImageData` throws (tainted canvas, e.g. opened via `file://`), silently skip it; the rotated/cropped-but-unkeyed image is still a correct, acceptable result.
   ```js
   try {
     var imgData = ctx.getImageData(0, 0, S.IMG_W, S.IMG_H);
     var d = imgData.data;
     for (var i = 0; i < d.length; i += 4) {
       var r = d[i], g = d[i + 1], b = d[i + 2];
       var max = Math.max(r, g, b), min = Math.min(r, g, b);
       var lum = 0.299 * r + 0.587 * g + 0.114 * b;
       var sat = max > 0 ? (max - min) / max : 0;
       var tLum = clamp((lum - BG_LUM_MIN) / BG_LUM_SOFT, 0, 1);
       var tSat = clamp((BG_SAT_MAX - sat) / BG_SAT_MAX, 0, 1);
       var t = tLum * tSat; // 0 = keep pixel as-is, 1 = fully black
       if (t > 0) {
         d[i]     = r * (1 - t);
         d[i + 1] = g * (1 - t);
         d[i + 2] = b * (1 - t);
       }
     }
     ctx.putImageData(imgData, 0, 0);
   } catch (err) { /* tainted canvas (e.g. file://) — keep the unkeyed image */ }
   ```

Notes for tuning (the tilt/zoom/focus defaults were derived by measuring the plaque corners at roughly (207,553), (1010,487), (248,1470), (1035,1400) in the ~1069×1600 photo; all constants are fractions/angles so they hold regardless of the true pixel size):

- If the medal ends up tilted the *other* way, flip the sign of `SOURCE_TILT_DEG`.
- If a black wedge appears in any corner of the board, raise `SOURCE_ZOOM` or move `SOURCE_FOCUS_*` toward `0.5`. At 4.5° the minimum wedge-free zoom is ~1.12; 1.30 has margin.
- Target framing: plaque edges level to the eye, plaque centred, plaque filling most of the frame width, a strip of the maroon ribbon visible above it.
- If the background key leaves visible speckling on the gold medal's bright highlights, raise `BG_LUM_MIN` and/or lower `BG_SAT_MAX` (more conservative — keys away less). If too much pale background survives, lower `BG_LUM_MIN` and/or raise `BG_SAT_MAX`. Iterate visually; there is no single correct value for a heuristic key.

## Change 2 — `main.js` owns the shared, eager image load

```js
var PUZZLE_IMAGE_SRC = 'assets/puzzle-medal.jpg';

var startCanvas = document.getElementById('start-medal-canvas');
var winCanvas   = document.getElementById('win-medal-canvas');
var ghostCanvas = document.getElementById('ghost-canvas');

var sourceCanvas = null;
var sourceFailed = false;
var sourceCallbacks = [];

function getSource(cb) {
  if (sourceCanvas) { cb(sourceCanvas); return; }
  if (sourceFailed) { cb(null); return; }
  sourceCallbacks.push(cb);
}

function drawInto(canvas, source) {
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext('2d').drawImage(source, 0, 0);
}

(function loadSource() {
  var image = new Image();
  image.onload = function () {
    sourceCanvas = window.PuzzleRender.normalizeSource(image);
    drawInto(startCanvas, sourceCanvas);
    drawInto(winCanvas, sourceCanvas);
    drawInto(ghostCanvas, sourceCanvas);
    sourceCallbacks.forEach(function (cb) { cb(sourceCanvas); });
    sourceCallbacks = [];
  };
  image.onerror = function () {
    sourceFailed = true;
    sourceCallbacks.forEach(function (cb) { cb(null); });
    sourceCallbacks = [];
  };
  image.src = PUZZLE_IMAGE_SRC;
})();
```

Remove the old `var ghostImg = document.getElementById('ghost-image');` line.

In `ensureGame()`'s `initGame({...})` options object: remove `ghostImg: ghostImg,` and add `getSource: getSource,`. Everything else in `main.js` (screen switching, share/replay handlers, Bangla digit formatting) is unchanged.

## Change 3 — `index.html`: all three photo placements become canvases

- After the `viewport` meta (line 5) add: `<meta name="theme-color" content="#0B1117" />`.
- Line 29 (start peek), replace:
  ```html
  <img src="assets/puzzle-medal.jpg" alt="কৃতী শিক্ষার্থী ২০২৫ মেডেল" />
  ```
  with:
  ```html
  <canvas id="start-medal-canvas" class="start-medal-canvas" width="1080" height="1600" role="img" aria-label="কৃতী শিক্ষার্থী ২০২৫ মেডেল"></canvas>
  ```
- Line 48 (game-screen ghost), replace:
  ```html
  <img id="ghost-image" class="ghost-image" src="assets/puzzle-medal.jpg" alt="" aria-hidden="true" draggable="false" />
  ```
  with:
  ```html
  <canvas id="ghost-canvas" class="ghost-image" width="1080" height="1600" aria-hidden="true"></canvas>
  ```
- Line 60 (win image), replace:
  ```html
  <img src="assets/puzzle-medal.jpg" alt="কৃতী শিক্ষার্থী ২০২৫ মেডেল" />
  ```
  with:
  ```html
  <canvas id="win-medal-canvas" class="win-medal-canvas" width="1080" height="1600" role="img" aria-label="কৃতী শিক্ষার্থী ২০২৫ মেডেল"></canvas>
  ```

The `width`/`height` attributes (not just CSS) matter here: they give the canvas its intrinsic 1080:1600 aspect ratio so the layout doesn't jump when `main.js` draws into it a moment after first paint. No other HTML changes.

## Change 4 — make the board exactly board-shaped and centred, drop the per-module image load

### `d:\ks-puzzle\js\puzzle-game.js` — `initGame()` signature and `build()`

- Replace `var ghostImg = opts.ghostImg;` with `var getSource = opts.getSource;`.
- Rewrite `build()` (currently lines 159-189) to ask `main.js` for the bitmap instead of loading its own `Image()`:
  ```js
  function build() {
    layoutBoardSize();
    computeScale();
    grid = S.buildGrid((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);

    getSource(function (source) {
      if (!source) {
        var msg = document.createElement('p');
        msg.className = 'tray-error bn';
        msg.setAttribute('role', 'alert');
        msg.textContent = 'ছবিটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে নিয়ে পেজটি আবার লোড করো।';
        trayEl.appendChild(msg);
        return;
      }
      var rawPieces = global.PuzzleRender.renderPieces(source, grid);
      var order = shuffleArray(rawPieces.map(function (_, i) { return i; }));
      order.forEach(function (idx) {
        var p = rawPieces[idx];
        p.locked = false;
        p.canvas.className = 'piece';
        p.canvas.dataset.row = p.row;
        p.canvas.dataset.col = p.col;
        placeTrayStyle(p);
        trayEl.appendChild(p.canvas);
        attachDrag(p);
        pieces.push(p);
      });
      onProgress(0, pieces.length);
    });
  }
  ```
  `renderPieces` needs no change: `drawImage` already accepts a canvas as a source. The old `image.onerror` Bangla-message path is preserved verbatim, just triggered by `source === null` instead of a load error.

### `d:\ks-puzzle\js\puzzle-game.js` — rewrite `layoutBoardSize()` (lines 30-43)

Measure the wrap's **content box** (its `getBoundingClientRect()` includes the 12/16px padding, which is the current bug):

```js
function layoutBoardSize() {
  var wrap = boardEl.parentElement;
  var cs = global.getComputedStyle(wrap);
  var availW = wrap.clientWidth  - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  var availH = wrap.clientHeight - parseFloat(cs.paddingTop)  - parseFloat(cs.paddingBottom);
  if (!(availW > 0) || !(availH > 0)) return;   // screen hidden / zero-size: leave as-is

  var w = Math.min(availW, 380);                 // keep the existing 380px cap
  var h = w * (S.IMG_H / S.IMG_W);
  if (h > availH) { h = availH; w = h * (S.IMG_W / S.IMG_H); }

  boardEl.style.width = w + 'px';
  boardEl.style.height = h + 'px';
}
```

Do not round only one of the two dimensions — the width:height ratio must stay exactly `IMG_W:IMG_H` or the ghost and the drop targets drift apart again.

### `d:\ks-puzzle\css\game.css` — `.board` (lines 206-212)

Add `flex: 0 0 auto;` to `.board`. Without it flexbox can still shrink the explicit width while the explicit height stays, which is what breaks the aspect ratio today. `.board-wrap`'s `display:flex; align-items:center; justify-content:center` already handles the actual centring — do not change it.

## Change 5 — dark theme (`d:\ks-puzzle\css\game.css`)

`game.css` is linked after `assets/colors_and_type.css`, so later same-specificity rules win. Use `var(--bg-inverse)` (`#0B1117`) — **not** `var(--ten-black)` — everywhere a dark background is meant, per the resolved decision above.

- **Add at the top of the file** (before `.screen`): `html, body { background: var(--bg-inverse); }` — kills the white overscroll/safe-area gutter on mobile.
- `.screen-start, .screen-win` (lines 49-63): replace the whole three-layer `background:` value with `background: var(--bg-inverse);`. Keep `position/overflow/display/align/justify/padding/color/text-align`.
- `.screen-game` (line 162): `background: var(--bg-inverse);`
- `.game-header` (line 173): `border-bottom: 1px solid rgba(255,255,255,0.12);`
- `.brand-mark-text` (line 183): `color: #fff;`
- `.progress-pill` (lines 185-194): `background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); color: #fff;`
- `.progress-sep` (line 195): `color: rgba(255,255,255,0.5);`
- `.board` (lines 206-212): `background: #060809; border: 1px solid rgba(255,255,255,0.14);` (near-black, one step darker than `--bg-inverse` so the board reads as a distinct surface).
- `.tray` (lines 224-236): `background: var(--bg-inverse); border-top: 1px solid rgba(255,255,255,0.12);`
- `.tray-error` (line 243): `color: rgba(255,255,255,0.78);` (was `var(--fg-2)` — 2.2:1 on a dark background, fails)
- `.piece.dragging` (line 260): `filter: drop-shadow(0 0 14px rgba(255,255,255,0.30));` (the current dark shadow is invisible on a dark board)
- `.share-toast` (line 148): `background: #1A1A1A; border: 1px solid rgba(255,255,255,0.22);`
- Replace the old `.start-medal-peek img { width: 100%; display: block; }` and `.win-image-wrap img { width: 100%; display: block; }` rules (lines 120, 130) with canvas-targeted selectors (same rules, new selector — the canvases carry `width`/`height` attributes giving them the correct intrinsic aspect ratio, so `width:100%; height:auto;` scales them exactly as the `<img>` did):
  ```css
  .start-medal-canvas, .win-medal-canvas { width: 100%; height: auto; display: block; }
  ```

Leave `.ghost-image` (opacity 0.22), `.btn-primary`, `.btn-outline`, `.eyebrow`, `.start-sub/.win-sub`, `.geo-watermark`, `.start-medal-peek`'s mask-image, and the confetti canvas alone — all already read correctly on the dark background and are unaffected by the img→canvas swap.

---

## Edge cases the implementation must handle

- **Replay/reset:** `reset()` → `start()` → `build()` runs again. `getSource` in `main.js` is a module-level singleton cache, so normalization never re-runs; `build()` simply gets the cached canvas back synchronously-via-callback on the second and later calls.
- **Start clicked before the image finishes loading:** `getSource`'s callback queue (`sourceCallbacks`) handles this — `build()` just waits, pieces appear a moment after `onload` fires. No polling, no race.
- **Load failure:** the Bangla tray message must survive verbatim, must fire from the `source === null` branch, and must not call `onProgress`/`onWin`. The start/win canvases simply stay blank (transparent, showing the dark screen background through) if the image never loads — acceptable, matches the "black" aesthetic, no exception thrown.
- **Tainted canvas (`file://`):** the try/catch in Change 1 step 9 means a missing background-key is the *only* degradation — rotation/crop/centering/black-theme all still work. Must not throw out of `normalizeSource`.
- **Hidden screen on resize:** keep the existing zero-rect guard in the `resize` listener (lines 201-221 today); the new `layoutBoardSize()` has its own guard too. Keep the in-progress-drag guard as well.
- **Non-1080×1600 photo:** `normalizeSource` reads `naturalWidth/naturalHeight`; nothing may re-introduce a hardcoded source size.
- **Rotation stays in the bitmap:** no DOM element gets a CSS `rotate()`. Drag, `getBoundingClientRect()` math and the snap tolerance in `tryDropOrReturn()` stay exactly as they are.
- **`.board { overflow: hidden }`** still clips the transparent 34% overhang of edge pieces. Pre-existing and unchanged — do not "fix" it.
- **Short/landscape viewports:** the `availH` branch already handles them; the board must never end up with zero or negative size.
- **Perf:** the background-suppression loop touches ~1.7M pixels (1080×1600) once, on page load, off the critical rendering path (inside an `Image.onload` callback, after first paint). This is a one-time cost, not per-frame — do not call `normalizeSource` more than once per page life (the `sourceCanvas` cache in `main.js` enforces this).

---

## Verification (manual — no test suite, no package.json)

1. Serve from the project root: `python -m http.server 8000` in `d:\ks-puzzle` (do **not** test via `file://` — see the tainted-canvas note above; if it's tested via `file://` anyway, confirm the graceful degradation: no console error, medal still shows straightened, just with its original background).
2. Capture before/after screenshots with Playwright (`chromium.launch()`, iPhone-ish viewport 390×844):
   - **Start screen:** background is `#0B1117` (not red, not white), no red glow. The medal thumbnail (now a canvas) reads level/straight, and the office wall/ceiling behind the medal is visibly darkened toward black compared to the original JPEG.
   - Click `#btn-start`. Screenshot the game screen: dark page/header/tray, board visibly centred between header and tray, header text and progress pill legible against `#0B1117`.
   - In the console: `var b=document.getElementById('board').getBoundingClientRect(); b.height/b.width` ≈ `1600/1080` = 1.481 (this is the layout regression Change 4 fixes — confirm it no longer reproduces).
   - Solve it: for each `#tray canvas.piece` read `dataset.row`/`dataset.col`, compute the target from `#board`'s rect (`left + (col+0.5)*width/3`, `top + (row+0.5)*height/4`) and drag with `page.mouse.move` → `down` → a couple of intermediate `move`s → `up`. Pieces must land without a visible jump, and the assembled image must fill the board edge-to-edge and register exactly with the ghost.
   - Screenshot `#board` solved: the medal is upright and centred, background is mostly black/dark (some fringing at the ribbon edges is acceptable), no black wedge from the rotate/crop in any corner. Iterate `SOURCE_TILT_DEG` / `SOURCE_ZOOM` / `SOURCE_FOCUS_*` and `BG_LUM_MIN` / `BG_SAT_MAX` until it looks right.
   - Win screen (~420 ms after the last lock): dark background, straight thumbnail with suppressed background, buttons and toast legible.
   - Check the browser console across all three screens for any thrown error from `getImageData`/`putImageData` (there should be none when served via `http.server`).
3. Force the error path once (temporarily point `PUZZLE_IMAGE_SRC` at a missing file, or block the request in devtools) and confirm the Bangla tray message still appears and is legible on the dark background, and that the start/win canvases simply stay blank without throwing. Revert any temporary edit.
4. Optional sanity check while tuning: log `image.naturalWidth`/`naturalHeight` once in `main.js`'s `onload`; remove the log before committing.
