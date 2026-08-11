# Review — straighten/centre the puzzle image + black, background-removed theme

Reviewer pass over `fix/review-findings`, diffing the working tree against `6175cc7`.
Files reviewed: `d:\ks-puzzle\js\puzzle-render.js`, `d:\ks-puzzle\js\main.js`,
`d:\ks-puzzle\js\puzzle-game.js`, `d:\ks-puzzle\index.html`, `d:\ks-puzzle\css\game.css`.

Method: read the full diff and the resulting files; re-derived `normalizeSource()`'s transform and
pixel key independently (a NumPy/PIL replica of the exact canvas affine plus the exact
`t = tLum * tSat` math) and ran it against the real `assets/puzzle-medal.jpg`; recomputed every
changed colour pair's WCAG contrast including alpha compositing. My replica reproduces the tester's
headline numbers to within rounding (6.85% vs their 6.89%, 25.29% vs 25.40%, 86.72% vs 86.84%, mean
`t` 0.1192 vs 0.1200), so their instrumentation was sound — the problem below is what was measured,
not how.

---

## VERDICT: BLOCK

One defect makes the feature ship-unacceptable, and it is invisible to every check the tester ran.

---

## BLOCKING

### B1. The background key erases the medal's embossed lettering — the actual subject of the image

`d:\ks-puzzle\js\puzzle-render.js:19-21` (constants) and `:100-113` (the pixel loop)

The plaque's raised silver/white lettering — the `10 MINUTE SCHOOL` wordmark and the campaign name
`কৃতী শিক্ষার্থী ২০২৫` — is bright AND near-zero saturation. That is precisely the heuristic's
definition of "background", so the key blacks it out. Rendering the real asset through the committed
code, the embossed text goes from bright silver-on-gold to muddy dark-on-grey: it reads as corrosion,
and the `২০২৫` line is close to illegible at thumbnail size (the start peek renders ~220 CSS px wide,
the win image ~240 px).

Measured on the text panel (normalized-bitmap region x 560-930, y 540-1140), over the pixels that are
bright lettering before the key (`lum > 170`, 84,886 px):

| constants | mean lettering luminance retained |
| --- | --- |
| pre-key | 100% (mean lum 216.5) |
| spec defaults 140/60/0.16 | 46% (mean lum 100.0) |
| committed retune 50/100/0.20 | 41% (mean lum 89.2) |

So this is NOT caused by the coordinator's retune — the coder's spec-verbatim constants already
destroyed the lettering; the retune made it modestly worse. It is a defect in the feature as
specified, and it needs fixing regardless of which constants ship.

**Why the green tests missed it.** The tester's overtuning check (`test-results.md:132-144`) isolated
pixels that are both visibly darkened and `sat >= 0.35`. White lettering has saturation near 0, so it
was excluded from the false-positive metric by construction — the check could not fail. The tester did
observe the symptom ("mottling on the flat grayish plaque backdrop behind the embossed lettering") and
classified it as "added contrast/patina", which is the one judgement call in the pipeline that went
the wrong way. This is the textbook green-tests-wrong-behaviour case.

**Fix (verified, 3 lines).** Gate the key with a luminance *ceiling* so specular/white subject material
is protected, instead of using only a floor. In `js/puzzle-render.js`, next to the other constants:

    var BG_LUM_MAX  = 200; // luminance above which a pixel is protected (embossed white lettering,
                           // specular gold) - the wall/ceiling sits below this, the lettering above it
    var BG_LUM_ROLL = 30;  // roll-off width for that protection

and in the loop replace `var t = tLum * tSat;` with:

    var tHi = clamp((BG_LUM_MAX - lum) / BG_LUM_ROLL, 0, 1);
    var t = tLum * tSat * tHi;

I ran this variant against the real photo: lettering retains 96.6% of its luminance (vs 41% now) while
background suppression barely moves — mean `t` on three background samples goes 0.71/0.53/0.56 to
0.59/0.43/0.56. Visually the wall, window and floor are still clearly darkened and the plaque text is
intact. The separation exists in the data: the wall tops out around lum 180 (p90 of the top strip =
183) while the lettering sits at p50 220 / p90 248.

An alternative that also works (100% lettering retention, comparable background kill) is to gate `t` by
distance from frame centre, e.g. multiply by `clamp((max(|x-540|/540, |y-800|/800) - 0.72) / 0.18, 0, 1)`,
since after `SOURCE_ZOOM = 1.30` the only real background left is the four corners and the top/bottom
strips. Either is acceptable; the ceiling is the smaller change and stays colour-only, in the spirit of
the spec.

**Re-verification required after the fix:** the tester's false-positive check must be re-run with the
`sat >= 0.35` filter removed (or replaced by "pre-key `lum > 170`"), otherwise it will pass again
without testing anything.

---

## NEEDS FIX (fold into the same pass)

### N1. A throw inside `image.onload` hangs the game permanently, with no error shown

`d:\ks-puzzle\js\main.js:50-57`

The `onload` handler has no error handling. If `normalizeSource()` or any `drawInto()` throws, then
`sourceCanvas` stays `null`, `sourceFailed` stays `false`, and `sourceCallbacks` is never drained.
`build()`'s queued callback never runs, so the player sits on the game screen with an empty tray, an
empty board, `০/১২` forever, and NO Bangla error message — the exact failure mode the spec's
graceful-degradation design exists to prevent, reached through a path that design does not cover.

Not purely hypothetical on the target platform: the page now holds four 1080x1600 canvases plus twelve
piece canvases, and iOS Safari returns `null` from `getContext('2d')` under canvas-memory pressure,
which would make `ctx.fillStyle = '#000'` throw a TypeError at `js/puzzle-render.js:84`. A missing DOM
id would do the same at `js/main.js:43`.

Fix: wrap the `onload` body so any throw falls through to the existing failure path.

    image.onload = function () {
      try {
        sourceCanvas = window.PuzzleRender.normalizeSource(image);
        drawInto(startCanvas, sourceCanvas);
        drawInto(winCanvas, sourceCanvas);
        drawInto(ghostCanvas, sourceCanvas);
      } catch (err) {
        sourceCanvas = null;
        image.onerror();
        return;
      }
      sourceCallbacks.forEach(function (cb) { cb(sourceCanvas); });
      sourceCallbacks = [];
    };

### N2. The empty `catch` in `normalizeSource` masks real bugs, not just tainted canvases

`d:\ks-puzzle\js\puzzle-render.js:97-115`

The concern you flagged is real. The `try` spans `getImageData`, the entire 1.7M-iteration loop, AND
`putImageData`, and the catch body is empty — no `console.warn`, no rethrow, no discrimination on error
type. Any future edit that introduces a `TypeError` or a bad index inside the loop silently degrades to
"the background key just did not happen", which looks identical to the intended `file://` behaviour and
identical to an under-tuned constant. This is also why nobody has ever confirmed the `file://` path
actually works (`test-results.md:78-82`, not verified this pass): there is no observable signal either
way.

Narrow the catch to the case it exists for, while keeping it non-throwing per the spec's contract:

    } catch (err) {
      // SecurityError = tainted canvas (e.g. opened via file://) - keep the unkeyed image.
      // Anything else is a real bug; surface it rather than silently shipping an unkeyed photo.
      if (!err || err.name !== 'SecurityError') {
        console.warn('normalizeSource: background key skipped', err);
      }
    }

### N3. The inherited light `color` token is never overridden on the dark theme

`d:\ks-puzzle\css\game.css:1`

`assets/colors_and_type.css:116-123` sets `html, body { background: var(--bg); color: var(--fg-1); }`.
The new rule overrides only `background`. `--fg-1` is `#111827`, which is 1.07:1 on `#0B1117`. Nothing
visible breaks today only because every text element currently on the game screen carries an explicit
colour (`.brand-mark-text`, `.progress-pill`, `.progress-sep`, `.tray-error`) — and `.screen-game` sets
no `color` of its own. Any text added to the game screen later renders invisible, and this is exactly
the class of gap that computed-style spot checks on existing elements cannot catch.

Fix: `html, body { background: var(--bg-inverse); color: #fff; }`, or set `color: #fff` on
`.screen-game` to match how `.screen-start, .screen-win` already do it at `css/game.css:60`.

---

## NITS (non-blocking, worth a follow-up)

- **N4. Drop-target boundary contrast.** `css/game.css:205-212`. The board surface `#060809` is 1.06:1
  against the `#0B1117` page and its `rgba(255,255,255,0.14)` border is 1.47:1 — below the 3:1 WCAG
  1.4.11 asks of a meaningful UI boundary. The only other cue is the ghost, and I measured the ghost as
  composited on screen (0.22 opacity over `#060809`, post-key bitmap): mean 1.21:1, max 1.85:1, zero
  pixels above 3:1. For reference the old ghost (raw photo at 0.22 over the old light `#EEF2F4` board)
  measured mean 1.32:1 / max 1.68:1 — so roughly a wash, not a regression, but it means the drop area is
  now defined almost entirely by a 1.47:1 hairline. Consider `rgba(255,255,255,0.28)` for the border
  and/or ghost `opacity: 0.32-0.38`. Note the tester's "ghost canvas non-transparent, correct RGB" check
  reads the bitmap, not the composited result, so it cannot see this.
- **N5. Canvas memory.** `js/main.js:42-46`. `drawInto` gives all three display canvases 1080x1600
  backing stores (~6.9 MB each) even though the start peek renders at <=220 CSS px and the win image at
  <=240 px. With the offscreen source that is ~27 MB of canvas held for the life of the page, on a
  mobile-first target, where previously the two thumbnails shared one decoded `<img>`. Downscaling the
  two thumbnails inside `drawInto` (cap at ~2x their CSS box) would recover ~13 MB. The `width`/`height`
  attributes in `index.html` still provide the pre-load aspect ratio either way.
- **N6. No stale-build guard.** `js/puzzle-game.js:159-188` with `js/main.js:36-40`. If `build()` ran
  twice while the image was still in flight, both queued callbacks fire on load and the tray gets 24
  pieces with `pieces.length === 24`, so the win condition would need 24 locks. Not reachable through the
  current UI (`#btn-start` becomes `display:none` the moment it is clicked, and `#btn-replay` only exists
  after a win, which requires the image), so this is latent rather than live. A generation counter
  (`var buildId = ++gen;` and `if (buildId !== gen) return;` inside the callback) closes it cheaply.
- **N7. `layoutBoardSize()` sub-pixel rounding.** `js/puzzle-game.js:30-43`. The content-box math is
  correct: `clientWidth`/`clientHeight` exclude the border, `.board-wrap` has no border, so subtracting
  computed padding yields the true content box, and the `!(availW > 0)` form correctly rejects `NaN`.
  But `clientWidth`/`clientHeight` are integer-rounded whereas the old `getBoundingClientRect()` was
  fractional, so on fractional layouts `availW` can round up to ~1px beyond the real content box — and
  with the newly added `flex: 0 0 auto` the board can no longer shrink, so it overflows the padding by
  that fraction instead. Cosmetic; `Math.floor` on `availW`/`availH` removes it.
- **N8. Ghost/piece registration is off by the board's 2px border (pre-existing).** `computeScale()`
  divides the border-box width (`getBoundingClientRect`, under `* { box-sizing: border-box }`) by
  `IMG_W`, while absolutely-positioned pieces and the `width:100%` ghost lay out against the
  padding/content box. Pieces therefore span ~2px more than the ghost and get clipped by
  `overflow:hidden` — a ~0.55% mismatch at 358px. Pre-existing and out of scope (the border existed
  before), but the spec's claim that the assembled image registers "exactly" with the ghost is not quite
  true. Harmless for snapping, where the tolerance is 38% of a cell.
- **N9. Canvas accessibility could be one step better.** `index.html:30,61`. `role="img"` plus
  `aria-label` is correct and preserves the old `alt` text verbatim, and `aria-hidden="true"` on the
  ghost is right (dropping `draggable="false"` is fine — canvas is not natively draggable and
  `-webkit-user-drag: none` still applies via `.ghost-image`). Two small things: canvas fallback content
  between the tags is the belt-and-braces convention and costs nothing, and on the image-load-failure
  path these canvases still announce a medal that is not rendered, a minor accessible-name lie.
- **N10. `theme-color` hardcodes `#0B1117`.** `index.html:6`. Unavoidable in a meta tag, but it now
  duplicates `--bg-inverse` in a second place; worth a comment so the two do not drift.
- **N11. Main-thread cost.** The key is a synchronous 1.73M-iteration loop plus a ~6.9 MB
  `getImageData`/`putImageData` round trip inside `image.onload`. Fine on desktop; on a low-end Android
  expect a few hundred ms of jank on the start screen right after first paint. Acceptable as a one-time
  cost per the spec, but revisit if the start screen ever gains an interaction before load.

---

## On the mid-pipeline constant retune

Process-wise this was a reasonable intervention: it responded to a genuine, well-evidenced tester
finding; it touched only the three tuning constants the spec explicitly designates as
iterate-visually knobs; the surrounding comment at `js/puzzle-render.js:16-18` was updated to explain
the new values; and the direction (lowering the luminance floor to where this photo's background
actually lives) follows directly from the tester's histogram. Nothing about it is inconsistent with the
code around it, and I independently reproduced the claimed coverage numbers.

The problem is what it was optimized against. Both the target metric ("percentage of plausibly-background
pixels suppressed") and the guardrail metric ("percentage of `sat >= 0.35` pixels damaged") are blind to
B1, because white lettering is neither low-luminance nor saturated. Pushing `BG_LUM_MIN` from 140 down to
50 moved the key deeper into the region where the medal's own light-on-dark detail lives, and the
guardrail could not report it. Since B1 was already present at the spec's original constants, the retune
is not the cause — but it should not be treated as validated either. After the B1 fix, re-tune and
re-measure with a lettering-preservation metric in the loop.

One process note for the audit trail: the tester's own summary calls the residual background patch
"optional polish, not a blocker" and concludes "nothing else needs another pass". That conclusion rests
on the guardrail above, so it should not be read as independent assurance that the key is safe for the
subject.

---

## Verified correct (no action needed)

- Tilt, crop and framing are genuinely good. My own render of `normalizeSource()`'s transform shows the
  plaque level, centred, filling the frame, with the ribbon strip visible above, and no black wedge in
  any corner — the corner-sampling result in `test-results.md:89-92` reproduces.
- `layoutBoardSize()` fixes the real aspect-ratio bug; the tester's live 1.48145 vs 1.48148 is consistent
  with the border-box width being what gets set inline. `flex: 0 0 auto` on `.board` is the correct
  companion change, and `.board-wrap`'s flex centring was correctly left alone.
- `getSource`'s queue has no double-fire or lost-callback path: both drains set their sentinel
  (`sourceCanvas` / `sourceFailed`) before iterating, so a re-entrant `getSource` from inside a callback
  resolves immediately rather than re-queueing, and `sourceCallbacks = []` after each drain prevents
  replay. No listener leak either — `initGame` is memoised by `ensureGame()`, so the `resize` handler is
  registered exactly once.
- The error path is faithful: the Bangla string, `class="tray-error bn"` and `role="alert"` are preserved
  verbatim, `onProgress`/`onWin` are correctly not called, and replay-after-failure re-renders the
  message (`start()` clears the tray, `build()` re-queues, `sourceFailed` short-circuits).
- `renderPieces` is untouched and correctly fed a canvas source; `d[i] = r * (1 - t)` is safe against a
  `Uint8ClampedArray` (rounds and clamps); alpha stays 255 because of the black fill, so never-drawn
  canvases remain fully transparent as the spec intends; and the leftover ctx transform does not affect
  `getImageData`/`putImageData`, which are device-space.
- Security/XSS surface is unchanged. No `innerHTML` with dynamic data (`trayEl.innerHTML = ''` is a
  constant), the error message uses `textContent`, and `getImageData` on a same-origin asset creates no
  new exposure. One thing to remember: moving `assets/puzzle-medal.jpg` to a CDN without CORS headers
  would silently disable the key via the catch in N2.
- The rest of the dark-theme contrast is fine: `.tray-error` 11.63:1, `.progress-sep` on the pill 4.39:1,
  white on the red brand badge 4.72:1, the badge itself 4.02:1 against the page, and `.share-toast`'s new
  border makes `#1A1A1A` legible against `#0B1117`. The `.btn-primary` focus ring is weak against the
  page (1.34:1) but 4.73:1 against the button it outlines, which is the adjacent colour that counts —
  acceptable, and unchanged from the previous near-black hero background.
- Scope was respected: `assets/colors_and_type.css`, `js/puzzle-shapes.js` and `js/confetti.js` show zero
  diff; `--bg-inverse` is used rather than a new token; and `game.css`'s `html, body` rule wins over
  `colors_and_type.css`'s by source order at equal specificity, as intended.

---

## What to do

1. Fix B1 in `d:\ks-puzzle\js\puzzle-render.js` (luminance ceiling, or the geometric gate).
2. Fix N1 in `d:\ks-puzzle\js\main.js` and N2 in `d:\ks-puzzle\js\puzzle-render.js`.
3. Fix N3 in `d:\ks-puzzle\css\game.css`.
4. Re-test with the false-positive metric re-scoped to bright low-saturation subject pixels (drop the
   `sat >= 0.35` filter); include a side-by-side crop of the plaque text panel in the evidence.
5. N4 through N11 are optional follow-ups.
