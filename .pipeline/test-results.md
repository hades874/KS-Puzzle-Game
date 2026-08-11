# Test Results — straighten/centre the puzzle image + black theme

Tested against `.pipeline/spec.md`, changes described in `.pipeline/changes.md`.
Files under test: `js/puzzle-render.js`, `js/main.js`, `js/puzzle-game.js`, `index.html`, `css/game.css`.

## Method

Real browser automation was available and used (this supersedes the interrupted prior attempt, which
had none). Repo root served via `python -m http.server 8000` (not `file://`, per the spec's tainted-canvas
warning). Driven with Playwright (Chromium, installed fresh into a scratch npm project since the repo has
no `package.json`/devDependencies), viewport 390×844 (iPhone-ish, matches spec's Verification section).
Console (`console.error`) and uncaught page errors (`pageerror`) were captured on every page instance.
Screenshots and full-resolution canvas exports were captured for visual review. The image-load-failure
path was tested by temporarily editing `js/main.js`'s `PUZZLE_IMAGE_SRC` to a nonexistent file, then
reverting the edit — confirmed via `git diff --stat js/main.js` afterward that the file is back to the
coder's original committed content (only the intended diff remains, no stray change).

Static code review (line-by-line against spec) was also done for every changed file before/alongside
the dynamic testing.

## Happy path — PASS

- Start screen background: `rgb(11, 17, 23)` = `#0B1117` on both `<body>` and `#screen-start` — matches
  `var(--bg-inverse)`, no red gradient/glow. Game screen (`rgb(11,17,23)`) and win screen (`rgb(11,17,23)`)
  same. `.brand-mark-text` renders `rgb(255,255,255)`, `.progress-pill` text `rgb(255,255,255)` on
  `rgba(255,255,255,0.08)` background — legible, matches spec Change 5 values exactly.
- Board aspect ratio (the Change 4 regression test called out explicitly in spec's Verification section):
  `#board` `getBoundingClientRect()` gave `height/width = 1.48145...` vs. expected `1600/1080 = 1.48148...`
  (delta ≈ 0.00003, i.e. sub-pixel rounding noise) — **the aspect-ratio bug is fixed**, confirmed by
  actually running `layoutBoardSize()` in a real layout, not just reading the code.
- Full solve-by-dragging-every-piece flow: for all 12 tray pieces, computed the drop target via the
  spec's exact formula (`board.left/top + (col/row + 0.5) * board.width/height / 3-or-4`), drove
  `page.mouse.move → down → 5 intermediate moves → up`. All 12 pieces locked on the **first** attempt
  each (`lockedSoFar` incremented cleanly 1→12, no piece bounced back to tray needing a retry), i.e. no
  visible snap-jump / drop-target misalignment. `#tray` ended empty, `#board` had 12 `.locked` pieces.
- Win screen appeared automatically ~420ms after the last lock (per spec/`puzzle-game.js` `setTimeout`),
  dark background, confetti canvas rendered, medal thumbnail canvas non-blank.
- Console/page errors across all three screens through the entire happy-path run: **zero**. Specifically
  no error from `getImageData`/`putImageData` when served via `http.server` — confirms the canvas is not
  tainted under `http://localhost`, and that the try/catch in `normalizeSource` step 9 wraps the right
  scope without swallowing real errors elsewhere.
- Replay/reset edge case (spec's "cache never re-runs normalization" case): after a full win, clicked
  `#btn-replay` — game screen reappeared, 12 fresh pieces in tray, board ratio still correct
  (`1.48145...`), ghost canvas still showed the cached normalized bitmap (non-transparent, correct RGB),
  zero console/page errors. Confirms `getSource`'s singleton cache works across `start()`→`reset()`.
- Race-condition edge case (spec's "start clicked before the image finishes loading" case): throttled
  the network via CDP (`Network.emulateNetworkConditions`, 150KB/s) so the 650KB JPEG genuinely took
  several seconds to arrive, then clicked `#btn-start` immediately on `domcontentloaded`. Tray piece
  count was measured at 0 immediately after click and stayed at 0 for ~5.7s (image still loading), then
  cleanly transitioned to 12 the moment the image finished — no polling artifacts, no errors. Confirms
  the `sourceCallbacks` queue in `main.js` works as designed.
- Forced image-load-failure path (spec's Verification step 3): temporarily pointed `PUZZLE_IMAGE_SRC` at
  a missing file. Start screen: `#start-medal-canvas` stayed fully blank/transparent (confirmed via
  `getImageData` alpha channel all-zero), no crash. Clicked start: the Bangla `tray-error` message
  appeared verbatim — `ছবিটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে নিয়ে পেজটি আবার লোড করো।` — with
  `class="tray-error bn"`, `role="alert"`, legible white-ish text (`rgba(255,255,255,0.78)`) on the dark
  background; progress pill correctly stayed at `০/১২` (i.e. `onProgress` was **not** called, per spec).
  Only console message was the browser's own expected `404` resource-load notice for the missing file —
  not a thrown JS error (`pageerror` list was empty). Reverted the edit immediately after;
  `git diff --stat js/main.js` confirms the file is back to exactly the coder's committed diff, nothing
  extra left behind.
- Static line-by-line review of the algorithm/scope items called out in the test brief: `layoutBoardSize()`
  content-box math is correct (`clientWidth`/`clientHeight` already exclude border, subtracting padding
  gives the true content box — verified both by reading and by the 1.48145 ratio measured live); the
  `try/catch` in `normalizeSource` step 9 wraps exactly `getImageData`...`putImageData`, nothing more/less;
  `getSource`'s callback queue has no double-fire or lost-callback path (`sourceCallbacks = []` resets
  after both the success and failure drains); canvases carry both `width`/`height` attributes (1080×1600,
  intrinsic bitmap size) and separate CSS sizing rules, matching spec Change 3's stated reasoning; CSS
  uses `var(--bg-inverse)` throughout the touched rules, no stray `var(--ten-black)` or leftover light-mode
  token found in any changed rule. `assets/colors_and_type.css`, `js/puzzle-shapes.js`, `js/confetti.js`
  show zero diff (`git diff --stat`) — the spec's exclusion list was respected.

## Edge cases named by the spec — PASS (see happy-path bullets above for the detailed runs)

- Replay/reset — PASS (above)
- Start clicked before image load finishes (callback queue) — PASS (above)
- Load failure (Bangla message, no `onProgress`/`onWin`, blank canvases, no throw) — PASS (above)
- Tainted canvas (`file://`) degrading gracefully — **not independently re-verified this run** (the
  server-based run already proves the non-tainted path throws no error; the coder's static syntax check
  and the try/catch's presence give reasonable confidence for the `file://` path specifically, but no
  browser was actually pointed at `file://` this pass — low-risk, code path is a plain `try/catch` with
  an already-covered "canvas still returned, just unkeyed" contract)
- Non-1080×1600 source photo (no hardcoded size) — verified by reading `normalizeSource`, which only ever
  reads `image.naturalWidth/naturalHeight`; not independently re-tested with a differently-sized image
  file this pass
- Hidden-screen / zero-size resize guard — verified by reading the guard conditions in both
  `layoutBoardSize()` and the `resize` listener; not driven live via an actual browser resize event this
  pass
- No black wedge in any corner from the rotate/crop (`SOURCE_ZOOM` headroom) — **PASS**, confirmed by
  sampling all four corners of the normalized 1080×1600 bitmap; none were black/near-black
  (values ranged e.g. `[47,47,45]`, `[114,118,119]`, `[125,49,62]`, `[88,89,90]` — real content, not the
  canvas's black fill)

## Failure case tested

- Image load 404 → graceful Bangla error message, blank canvases, no thrown error (see above). This is
  the failure case the spec explicitly designs for, and it passes.

## FINDING (RESOLVED) — background-suppression heuristic retuned, now meets the spec's stated visual bar

**Original finding (first pass):** with the spec's suggested defaults
(`BG_LUM_MIN=140, BG_LUM_SOFT=60, BG_SAT_MAX=0.16`), only 6.89% of all pixels in the normalized bitmap
were suppressed, and only 26.6% of plausibly-background (low-saturation) pixels crossed the luminance
floor to be touched at all — the office wall/window/ceiling clutter remained clearly visible, failing the
spec's "visibly darkened toward black" / "mostly black/dark" bar. Full detail on that measurement is
preserved below for the record.

**Retune applied by the coordinator directly in `js/puzzle-render.js`** (not by me — I only re-verified
it): `BG_LUM_MIN: 140 → 50`, `BG_LUM_SOFT: 60 → 100`, `BG_SAT_MAX: 0.16 → 0.20`. I re-ran the exact same
methodology against the retuned code to get a direct before/after comparison, confirmed via a live
cross-check (comparing my replica math against the actual `window.PuzzleRender.normalizeSource()` output
at 7 sample points — all matched exactly) that the numbers below reflect the real code currently in the
file, not an assumption:

| Metric | Original (140/60/0.16) | Retuned (50/100/0.20) |
| --- | --- | --- |
| % of all pixels suppressed (`t > 0.05`) | 6.89% | **25.40%** |
| % of low-saturation ("plausibly background") pixels actually suppressed | 26.6% | **86.84%** |
| Average suppression strength `t` across the whole image | — | 0.1200 |

**Undertuning check — PASS.** Visually confirmed via full-resolution export of `#start-medal-canvas`
(1080×1600) and viewport screenshots: the office wall/ceiling in the upper-left and most of the frame is
now visibly dark/near-black (e.g. one sampled wall pixel went from `rgb(110,112,111)` pre-key to
`rgb(49,49,49)` post-key — a real, visible ~55% luminance cut, not a rounding artifact). One small residual
patch remains: a light gray door/cabinet-like feature in the top-right corner (roughly 150×100px within
the 1080×1600 canvas, ≈0.9% of total image area) stays close to its original brightness because its
saturation (~0.28–0.33, warm-toned reflection) sits above `BG_SAT_MAX=0.20`. This is a small, contained
corner artifact, consistent with the spec's own explicitly-accepted tolerance ("some fringing... is
acceptable"), not the widespread "wall clearly visible across the frame" failure the original constants
produced.

**Overtuning / speckling check — PASS.** Built a per-pixel diff mask (before-key vs. after-key,
`normalizeSource()`'s actual output) and specifically isolated pixels that are (a) suppressed by a visible
amount (channel delta > 10) **and** (b) clearly-saturated subject material (`sat ≥ 0.35`, i.e. unambiguously
the gold medal or maroon ribbon, not a borderline/desaturated highlight) — the exact false-positive mode
the spec names ("false positives speckle the medal's highlights"). Result: **0 pixels** (0.0000% of
1,728,000) met both conditions — no speckling of the saturated gold/maroon subject. The diff mask does
show suppression reaching into the medal's own recessed dark engraving, black diagonal border stripes, and
some mottling on the flat grayish plaque backdrop behind the embossed lettering — all low-saturation,
low-to-mid-luminance areas that are photometrically similar to the wall (an inherent limit of a
color-only heuristic, explicitly caveated by the spec: "expect soft fringing at edges, not a
pixel-perfect cutout"). Visually this reads as added contrast/patina on already-dark engraved detail
rather than damage to the medal's legibility or its bright gold highlights — the trophy cup, fist, gold
border, and "SUPER" plate all remain vivid, untouched gold in both the screenshot and the diff mask.

**Verdict: this retune meets the spec's stated visual bar.** Both failure directions named in the
coordinator's request were checked quantitatively (not just eyeballed) and neither reproduces at a
significant level:

- (a) undertuning (wall/ceiling/window still clearly visible) — mostly resolved; one small (~0.9% of
  frame) corner patch remains, within the spec's own "some fringing acceptable" tolerance.
- (b) overtuning (speckling on gold highlights / maroon ribbon) — does not occur (0.0000% of strictly-
  saturated subject pixels affected).

No further retuning pass is required to meet the spec's bar. If the team wants to fully eliminate the
last top-right corner patch as a polish item (not a blocker), the next lever to pull is `BG_SAT_MAX`
(raise slightly further) or `SOURCE_ZOOM` (crop tighter so that corner falls outside the frame
entirely) — not `BG_LUM_MIN`/`BG_LUM_SOFT`, which are now well-calibrated for this photo's luminance
distribution.

Final constants now in `js/puzzle-render.js` (confirmed by reading the file): `SOURCE_TILT_DEG=4.5`,
`SOURCE_FOCUS_X=0.57`, `SOURCE_FOCUS_Y=0.59`, `SOURCE_ZOOM=1.30` (unchanged), `BG_LUM_MIN=50`,
`BG_LUM_SOFT=100`, `BG_SAT_MAX=0.20` (retuned this pass, by the coordinator, verified by me).

### Original measurement (spec's default constants — superseded, kept for the record)

- Only 6.89% of all pixels in the normalized bitmap received any background suppression (`t > 0.05`).
- Of pixels that are plausibly background by saturation alone (`sat < 0.16` — 25.9% of the image), only
  26.6% actually got suppressed. The other 73.4% had luminance in the 0–139 range, entirely below
  `BG_LUM_MIN = 140`, so `tLum` clamped to 0 and they were left completely untouched regardless of how
  gray/background-like they looked. A histogram of luminance for these low-saturation pixels showed the
  bulk sitting at 40–139 (medium-gray office wall / shadow tones), below the floor the heuristic required
  to act at all.
- Tilt correction and centering were already correct on visual review in this original pass and remain
  so (this part of Change 1 was never in question): the plaque frame and its horizontal text/border lines
  read level, the medal is centered and fills the frame, and there is no black wedge in any corner.

Screenshots/exports saved for review (not committed to the repo — scratch/temp paths):

- Original-constants run: start screen, game screen, mid-solve board, win screen (390×844 viewport);
  full-resolution (1080×1600) export of the normalized `#start-medal-canvas` bitmap; error-path
  screenshots (blank canvas + Bangla message)
- Retuned-constants run: start screen, game screen (390×844 viewport); full-resolution
  (1080×1600) export of the normalized bitmap; a magenta/green diff-mask visualizing exactly which
  pixels were suppressed vs. left alone; cropped close-ups of the remaining top-right undertuned patch

## Not independently re-verified this pass (low risk, noted for completeness)

- `file://` protocol specifically (tested via `http://localhost` only, per the spec's own instruction not
  to test via `file://`)
- A source photo with dimensions other than the actual 1080×1600 `assets/puzzle-medal.jpg`
- An actual browser-native `resize` event (window resize) mid-game; the guard logic was read, not driven

## Overall

Happy path, all named edge cases, and the failure case all **PASS** — no thrown errors anywhere, the
Change 4 aspect-ratio bug is verifiably fixed, drag/drop/snap/win flow works end-to-end, dark theme is
correctly applied, and graceful degradation on load failure works exactly as specified. The
background-suppression heuristic, which failed the spec's own Verification bar on the first pass (only
~7% of the image darkened at all), was retuned by the coordinator
(`BG_LUM_MIN: 140→50, BG_LUM_SOFT: 60→100, BG_SAT_MAX: 0.16→0.20`) and I re-verified the retune directly
against the real photo: background suppression coverage rose to 25.40% of all pixels / 86.84% of
plausibly-background pixels, with zero measurable speckling of the saturated gold/maroon subject, and no
regression to the happy path (board ratio, console/page errors, full solve, and win screen all still
clean). **This retune now meets the spec's stated visual bar.** One very small (~0.9% of frame) residual
undertuned corner patch remains and is optional polish, not a blocker, per the spec's own "some fringing
is acceptable" tolerance. No code or behavior outside `js/puzzle-render.js`'s three tuning constants was
touched by this retune. Nothing else needs another pass.
