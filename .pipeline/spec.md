# Spec — 3 remaining review fixes (ks-puzzle)

## OPEN QUESTIONS

None. Bug 1's copy/styling decisions are made below (wording, element, class, CSS) — implement exactly as written.

## Scope

Three independent fixes. No new files, no dependencies, no build step. Vanilla ES5-style IIFE modules with `var` — match the existing style in every file you touch.

Files to modify (absolute paths):

1. `d:\ks-puzzle\js\puzzle-game.js` — add image `onerror` feedback
2. `d:\ks-puzzle\js\puzzle-render.js` — switch to 9-arg `drawImage`
3. `d:\ks-puzzle\css\game.css` — add `.tray-error` rule (for fix 1) and delete the dead reduced-motion rule (fix 3)

Do not touch `index.html`, `js/main.js`, `js/puzzle-shapes.js`, `js/confetti.js`, or `assets/colors_and_type.css`.

---

## Bug 1 — image load failure is silent

### File: `d:\ks-puzzle\js\puzzle-game.js`

Current `build()` is at lines 159–182. It creates `var image = new Image();`, assigns only `image.onload = function () {...}`, then `image.src = ghostImg.src;`.

Add an `onerror` handler between the `onload` assignment and the `image.src = ...` line. Required behavior:

- Show a visible Bangla message inside `trayEl` (the tray is the only empty region the player is staring at when this fails).
- Build the node with `document.createElement` + `textContent` (matches how `js/main.js` sets text, e.g. `progressCount.textContent = toBn(count)`); do not use `innerHTML`.
- Element: `<p>` with `className = 'tray-error bn'` and `setAttribute('role', 'alert')`. The `bn` class is the project-wide Bangla-font class (see every Bangla node in `index.html`, defined in `assets/colors_and_type.css` line 133).
- Exact copy (Bangla, `তুমি` voice, no emoji, matching `index.html` / `js/main.js` tone):

  `ছবিটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে নিয়ে পেজটি আবার লোড করো।`

- Append it to `trayEl`.

Suggested shape (adapt naming to surrounding code):

```js
image.onerror = function () {
  var msg = document.createElement('p');
  msg.className = 'tray-error bn';
  msg.setAttribute('role', 'alert');
  msg.textContent = 'ছবিটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে নিয়ে পেজটি আবার লোড করো।';
  trayEl.appendChild(msg);
};
```

Constraints / edge cases:

- No retry, no timeout, no backoff, no console-only logging. Visible feedback is the whole requirement.
- Do NOT call `onProgress` or `onWin` from the error path; leave the progress pill untouched.
- Do NOT add cleanup code for this node: `start()` (line 184–188) already does `trayEl.innerHTML = ''` before `build()`, so a replay clears the message automatically. Verify that ordering still holds after your edit; do not reorder `start()`.
- The file must stay ASCII-safe-agnostic: it is UTF-8; keep the Bangla string as literal UTF-8 text (same as `js/main.js` lines 59–60), not escapes. Do not change the file encoding or add a BOM.

### File: `d:\ks-puzzle\css\game.css` (part 1 of 2)

Add a `.tray-error` rule immediately after the `.tray { ... }` block (currently ends at line 236), before the `/* ---------- Puzzle pieces ---------- */` comment:

```css
.tray-error {
  flex: 1 1 auto;
  margin: 0;
  text-align: center;
  font-size: 14px;
  color: var(--fg-2);
}
```

Rationale for the coder: `.tray` is `display: flex; align-items: center;` so `flex: 1 1 auto` + `text-align: center` centers the message in the empty tray. Use the existing token `var(--fg-2)` (defined in `assets/colors_and_type.css`) — do not hardcode a hex color. Font family/line-height come from `.bn`.

---

## Bug 2 — full-image draw per piece

### File: `d:\ks-puzzle\js\puzzle-render.js`

Current line 41, inside `renderPieces()`:

```js
ctx.drawImage(image, -bbox.x, -bbox.y, S.IMG_W, S.IMG_H);
```

Replace with the 9-argument source-rect overload:

```js
ctx.drawImage(image, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);
```

That is the only change in this file. Do not touch `buildPath2D`, the `ctx.scale(dpr, dpr)` call (line 35), the clip (`ctx.clip(path)`, line 40), the stroke block (lines 44–48), or the canvas sizing (lines 29–32).

Edge cases the implementation must be aware of (do not "fix" these — just confirm rendering is unchanged):

- `S.getPieceBBox` (`js/puzzle-shapes.js` lines 116–125) adds a fixed 34% overhang on all four sides, so the bbox of every border piece extends **outside** the 1080×1600 image: e.g. col 0 has `bbox.x = -122.4`; col 2 has `bbox.x + bbox.w = 1202.4`; row 0 has `bbox.y = -136`. Negative and over-size source rects are expected and legal — per the HTML canvas spec the source rect is clipped to the image and the destination rect is clipped in the same proportion, so the drawn pixels land at exactly the same canvas-local coordinates as the old 5-arg call, with the off-image area left transparent. This must be confirmed visually (see Verification), not assumed.
- Alignment invariant: `buildPath2D(segments, bbox.x, bbox.y)` already shifts path coords into canvas-local space where `(0,0)` is the bbox top-left. The new draw uses the same origin, so clip and image stay in register. If (and only if) verification shows a misalignment on border pieces in some browser, the fallback is to clamp the source rect to `[0, IMG_W] × [0, IMG_H]` and offset the destination by the same clamped amount — but do not write that code preemptively.
- Do not change the DPR handling: dest width/height are CSS-pixel units (`bbox.w`/`bbox.h`) because the context is already scaled by `dpr`.

---

## Bug 3 — dead reduced-motion rule

### File: `d:\ks-puzzle\css\game.css` (part 2 of 2)

Delete lines 268–270 (currently the last rule in the file):

```css
@media (prefers-reduced-motion: reduce) {
  .geo-drift { animation: none; }
}
```

Also delete the now-orphaned blank line 267 that preceded it, so the file ends with the closing `}` of `.drag-layer` (line 266) followed by a single trailing newline. There is no comment attached to the deleted rule; nothing else needs removing.

Do not delete or alter the `@keyframes geo-drift` / `.geo-drift` rules at lines 76–77 — those are live. The rule is dead only because `assets/colors_and_type.css` lines 135–137 already apply `animation: none !important` to `*, *::before, *::after` under the same media query.

---

## Verification (manual — this repo has no test suite, no package.json)

1. Capture "before" screenshots first, then apply Bug 2's change, then "after" — a before/after comparison of the solved board and of the tray is the only reliable check for the `drawImage` change.
2. Serve statically from the project root: `python -m http.server 8000` run in `d:\ks-puzzle`.
3. Drive with Playwright (`npx playwright install chromium` if needed) via a script using `chromium.launch()`:
   - Load `http://localhost:8000/`, click `#btn-start`, wait for `#tray canvas.piece` to be present.
   - Screenshot `#tray` (unsolved pieces) — border pieces (row 0, row 3, col 0, col 2) are the ones that exercise the out-of-bounds source rect.
   - Solve: for each `#tray canvas.piece`, read `dataset.row` / `dataset.col`, compute the target cell center from `#board`'s bounding rect (`left + (col + 0.5) * width/3`, `top + (row + 0.5) * height/4`), and drag with `page.mouse.move` → `down` → `move` (a couple of intermediate steps) → `up`.
   - Screenshot `#board` once all 12 are locked; the win screen appears ~420 ms after the last lock.
4. Before/after screenshots must be visually identical (piece art aligned inside each jigsaw outline, white stroke on the outline, no seams or offsets).
5. Bug 1 check: temporarily point the game's image at a missing path to force `onerror` — e.g. in the browser console before clicking start, run `document.getElementById('ghost-image').src = 'assets/does-not-exist.jpg'` — then click `#btn-start` and confirm the Bangla message renders centered in the tray. Revert the console change / reload afterwards; do not commit any change to `index.html`.
6. Bug 3 check: with Chromium's `prefers-reduced-motion: reduce` emulation on, confirm the start screen watermarks are still static (the `colors_and_type.css` universal rule handles it).
