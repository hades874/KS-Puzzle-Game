# Review — 3 remaining review fixes (ks-puzzle)

**VERDICT: SHIP**

Branch `fix/review-findings` vs `main`. 3 files changed (`css/game.css`, `js/puzzle-game.js`,
`js/puzzle-render.js`), +15 / -5. No files outside the spec's allowlist were touched; no scope
creep (no retry/timeout/backoff, no console logging, no extra styling, no `index.html` edits).

Reviewed independently of the tester's report: I re-derived the risky change from first
principles and re-ran browser verification myself rather than accepting the test results.

---

## Spec conformance — all 3 fixes match exactly

| Fix | Spec requirement | Diff | Status |
|---|---|---|---|
| 1 | `image.onerror` between `onload` and `image.src`, `<p class="tray-error bn" role="alert">`, `createElement`+`textContent`, appended to `trayEl` | `js/puzzle-game.js:181-187` | Exact |
| 1 | `.tray-error` CSS after `.tray`, before pieces comment, `var(--fg-2)` | `css/game.css:238-244` | Exact |
| 2 | 9-arg source-rect `drawImage` | `js/puzzle-render.js:41` | Exact |
| 3 | Delete dead reduced-motion rule + orphan blank line | end of `css/game.css` | Exact |

Bangla copy is a byte-for-byte match with the spec (68 codepoints, verified programmatically).
All three files are LF-only, no BOM, valid UTF-8 — encoding unchanged as required.
`css/game.css` is 274 lines ending `}\n` with a single trailing newline, no orphan rule.

## Bug 2 (highest risk) — independently proven pixel-identical

The tester's evidence for this was weaker than the spec demanded (see "Tester assessment"), so I
verified it directly. The correctness of the 9-arg switch rests on one unstated assumption: the
source-rect overload samples in the image's **intrinsic** pixel space, whereas the old 5-arg call
**scaled** the image to `S.IMG_W`x`S.IMG_H`. The two forms are equivalent only if the asset's
natural size equals 1080x1600.

- Read the JPEG SOF0 marker of `assets/puzzle-medal.jpg` directly: **1080x1600**, JFIF, **no EXIF**
  (so no orientation-based intrinsic-size surprise). Matches `IMG_W`/`IMG_H` in
  `js/puzzle-shapes.js:4-5`. Both draws are therefore 1:1 with mapping
  canvas `(X,Y)` -> image `(X + bbox.x, Y + bbox.y)` in both forms.
- Empirical proof in headless Chromium: rendered every piece twice (old 5-arg vs new 9-arg) under
  the identical clip and compared `getImageData()` buffers channel-by-channel.
  **12 pieces x 3 devicePixelRatio settings (1, 2, 3-clamped) = 36 tiles, 0 differing channels,
  max delta 0.** Opaque coverage 27.7%-41.3%, no near-empty tiles.
- Out-of-bounds source rects (col 0 `x=-122.4`; col 2 `x+w=1202.4`; row 0 `y=-136`) behave per
  spec: source clipped to the image, destination clipped in the same proportion. Confirmed, not
  assumed. The fallback clamp described in spec section "Bug 2" is correctly NOT implemented.
- Sub-pixel note: both forms carry the same fractional 0.4px offset, so resampling is identical —
  confirmed by the zero-delta result. Performance is equal-or-better (bbox-sized source region
  instead of a nominal full-image draw).

## Bug 1 — verified end to end in-browser

Forced the failure via `#ghost-image`'s src, clicked start:
- Exactly one `<p class="tray-error bn" role="alert">`, text matches spec exactly.
- Computed style: `font-size: 14px`, `color: rgb(75,85,99)` (= `--fg-2` -> `--gray-600`),
  `font-family` resolves to the Bangla stack via `.bn`. Rendered visible, inside the tray bounds,
  horizontally centered (delta < 2px). `flex: 1 1 auto` + `align-items: center` works as intended.
- Progress pill untouched (still `০`) — `onProgress`/`onWin` correctly not called on the error path.
- **Replay clears it**: `start()` (`js/puzzle-game.js:191-195`) runs `trayEl.innerHTML = ''` before
  `build()`; after replay with a good image, `.tray-error` count 0 and 12 pieces present.
- **No message stacking**: a second consecutive failure yields exactly 1 message node, not 2.
- Zero `pageerror` events throughout.
- Security: `textContent` (not `innerHTML`) — no injection surface. Static copy, no interpolation.
- `show('game')` runs before `start()` (`js/main.js:47-50`), so the tray is visible when the
  message is appended — the fix actually achieves its user-facing goal.

## Bug 3 — deletion confirmed safe

`assets/colors_and_type.css:135-137` applies `animation: none !important` to `*, *::before,
*::after` under the same media query. The deleted rule had no `!important`, so it was strictly
dominated — genuinely dead. Verified in-browser: `.geo-drift` computed `animationName` is `none` /
`0s` under `reducedMotion: 'reduce'`, and still `geo-drift` under `no-preference` (animation
remains live in the normal case — no over-deletion). `@keyframes geo-drift` / `.geo-drift`
untouched.

## Tester assessment — conclusion right, one methodology gap (non-blocking)

The report's conclusions are all correct and its artifacts exist with matching timestamps. One gap
worth recording:

- The spec's Verification steps 1 and 4 required capturing **before** screenshots, then applying
  Bug 2, then comparing. The tester only captured "after" images and judged them subjectively
  ("continuous, no seams"). That check cannot detect the one failure mode that mattered here: if
  intrinsic dims had differed from `IMG_W`/`IMG_H`, every piece would shift under the *same* global
  mapping, so the assembled board would still look perfectly seamless while displaying a
  cropped/zoomed image. "No seams" is not evidence of correct source-region sampling.
- Relatedly, `test-results.md` line "confirmed visually and pixel-sampled" overstates its evidence:
  the pixel sampling measured **alpha coverage** (31%-44% opaque), which only proves the canvases
  aren't blank — it does not verify *which* image region was sampled.
- This gap is closed by my own 36-tile zero-delta comparison above, so the verdict is unaffected.
  Flagged so the pipeline does not treat coverage-sampling as a substitute for a real diff next time.

## Non-blocking observations (correct as specified; do not fix in this change set)

1. `js/puzzle-game.js` error path: the broken `#ghost-image` stays in the board area, so the
   browser's broken-image affordance may show above the message. Pre-existing, out of scope.
2. If an image load fails on a replay *after* a win, the progress pill retains its previous count
   (e.g. 12) because `onProgress` is deliberately not called. This is exactly what the spec
   mandates ("leave the progress pill untouched"); noted only as a future nicety.
3. `role="alert"` is set before insertion, which is the reliable ordering for live-region
   announcement. Correct as written.

No security, performance, or correctness defects found. Ready to merge.
