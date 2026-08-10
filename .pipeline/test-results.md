# Test Results — 3 remaining review fixes (ks-puzzle)

**Result: ALL TESTS PASSED**

Tested against `.pipeline/spec.md` and `.pipeline/changes.md` by driving a real Chromium
browser (Playwright) against the static site served via `python -m http.server 8123`
from `d:\ks-puzzle`, viewport 393x852 (mobile). No automated test framework exists in
this repo, so verification is browser-driven, per the spec's own "Verification" section.

Test scripts (kept in scratchpad, not committed to the repo):
- `test_review_fixes.js` — main suite (happy path, Bug 1, Bug 2, Bug 3 reduced-motion)
- `debug_drag.js` — single-piece drag diagnostic used while isolating a test-script issue (see Notes)

Screenshots (scratchpad `C:\Users\Shamim Hasan\AppData\Local\Temp\claude\d--ks-puzzle\21d05b21-d302-4877-a28e-a61d85aef3c6\scratchpad\`):
`t1-00-start.png`, `t1-01-tray-unsolved.png`, `t1-01b-tray-only.png`, `t1-02-piece-r0c0.png`,
`t1-03b-board-only.png` (assembled board, pre win-transition), `t1-03-board-solved.png`,
`t1-04-win-screen.png`, `t2-00-onerror-tray.png`, `t3-reduced-motion-start.png`.

---

## Bug 2 — 9-arg `drawImage` (js/puzzle-render.js) — PASS (highest-risk change)

Solved the full 12-piece puzzle via simulated pointer drag-and-drop (mouse down on tray
piece → move in 2 steps → move to target cell center → up), computing target cell
centers from `#board`'s live bounding rect as specified.

- Tray (unsolved) screenshot (`t1-01-tray-unsolved.png`) and a close-up of piece
  row=0/col=0 (`t1-02-piece-r0c0.png`, a piece whose bbox legitimately extends outside
  the 1080x1600 source image on two sides) both show fully-filled jigsaw-shaped artwork
  with clean white stroke outlines — no transparent gaps, no misalignment, no seams.
- Assembled board screenshot (`t1-03b-board-only.png`, captured immediately after the
  12th piece locked, before the win-screen transition) shows the medal/ribbon artwork
  continuous and correctly registered across every piece boundary — ribbon stripes,
  trophy, and Bangla text all line up seamlessly with no offset or holes, including at
  every border row/column (row 0, row 3, col 0, col 2 — the ones that exercise the
  out-of-bounds source rect per the spec).
- Programmatic check: for each of the 12 locked piece `<canvas>` elements,
  `getImageData()` was sampled and the fraction of non-transparent (alpha > 10) pixels
  was computed. All 12 pieces had 31%–44% opaque coverage (consistent with a jigsaw
  Path2D clip inside a bbox that has ~34% overhang on each side) with zero errors and
  zero near-empty/transparent canvases.
- 12/12 pieces locked (`#board canvas.piece.locked` count == 12) and the win screen
  (`#screen-win`, no `hidden` attribute) appeared as expected, confirming the piece
  geometry/registration used for drop-tolerance matching was unaffected by the
  `drawImage` change.

Conclusion: the 9-arg source-rect `drawImage` call renders identically to the expected
5-arg behavior — out-of-bounds source rects are clipped correctly by the canvas per
spec, confirmed visually and pixel-sampled, not just assumed.

## Bug 1 — image `onerror` feedback (js/puzzle-game.js + css/game.css) — PASS

In a fresh page load, before clicking `#btn-start`, ran
`document.getElementById('ghost-image').src = 'assets/does-not-exist.jpg'` in the page
context, then clicked start.

- `.tray-error` element found in the DOM: `<p class="tray-error bn" role="alert">`.
- `textContent` exactly matches the spec's required Bangla copy:
  `ছবিটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে নিয়ে পেজটি আবার লোড করো।`
- Screenshot (`t2-00-onerror-tray.png`) confirms the message renders centered in the
  (otherwise-empty) tray, styled per `.tray-error` (14px, `--fg-2` color, Bangla font
  from `.bn`), below the broken ghost-image placeholder.
- Progress pill unaffected: `#progress-count` still reads `০` (i.e. `onProgress`/`onWin`
  were not called from the error path).
- No JS `pageerror` events were thrown during this flow. The only `console` `error`-type
  entries were two expected browser resource-load 404 messages for the deliberately
  broken image path (`ghost-image` src is set to a missing file directly, and `build()`
  separately requests the same missing path for the `Image()` object that drives
  rendering) — these are standard browser network-failure log lines, not JS runtime
  errors, and are the intended trigger for this test, not a regression.

## Bug 3 — dead reduced-motion CSS rule removed (css/game.css) — PASS

Text-level check of `css/game.css`:
- `grep -n "prefers-reduced-motion" css/game.css` → **no matches** (dead rule confirmed removed).
- `.tray-error` rule present at line 238, matching the spec's required properties
  (`flex: 1 1 auto`, `text-align: center`, `font-size: 14px`, `color: var(--fg-2)`).
- `@keyframes geo-drift` / `.geo-drift` still present and untouched at lines 76–77.
- File is 274 lines total, ending in `.drag-layer`'s closing `}` with no trailing blank
  line or orphaned rule — matches `changes.md`'s claim exactly.

Supplementary browser check (not required by grep alone, but confirms the CSS ecosystem
still behaves correctly after the deletion): with Chromium's `reducedMotion: 'reduce'`
emulation on, `getComputedStyle(document.querySelector('.geo-drift'))` reports
`animationName: 'none'`, `animationDuration: '0s'` — the watermark animation is still
correctly disabled, via the universal rule in `assets/colors_and_type.css` (untouched by
this change set), confirming Bug 3's rationale holds. Screenshot: `t3-reduced-motion-start.png`.

## General regression — full happy path — PASS

Start screen → click `#btn-start` → 12 pieces appear in tray → drag each of the 12
pieces from tray to its correct board cell (pointer down/move/up simulation) → all 12
lock onto the board → win screen (`#screen-win`) appears with confetti canvas
(`#confetti-canvas`) present and visibly animating (confetti particles visible in
`t1-04-win-screen.png`).

- Piece count in tray at start: 12 (correct).
- Locked pieces on board after solving: 12/12 (correct).
- Win screen visible after solve: true.
- Zero `console` `error`-type messages and zero `pageerror` events throughout the entire
  happy-path flow (this is the strict check, separate from the intentionally-triggered
  404s in the Bug 1 test above, which used a different page instance).

---

## Notes for the record (not code defects — testing-process note only)

While building the Playwright test script, an early run reported 0/12 pieces locking.
Root-caused to the *test script*, not the app: `elementHandle.screenshot()` on a piece
inside the tray auto-scrolls that piece into view, and since `.tray` is a horizontally
scrolling flex container (`overflow-x: auto`), that scrolled all sibling pieces'
bounding boxes out from under the drag loop's subsequently-computed coordinates. Fixed
by resetting `#tray.scrollLeft = 0` after taking that reference screenshot and before
starting the drag loop; confirmed with a minimal single-piece diagnostic
(`debug_drag.js`) that drag-and-drop works correctly end to end. No application code was
touched or needed to be touched to resolve this — it was purely a test-script ordering
issue, called out here for transparency.

## Conclusion

All three fixes behave exactly as specified. No regressions found in the core
start → solve → win flow. No code changes were made by the Tester.
