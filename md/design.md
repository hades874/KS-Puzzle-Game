# 10 Minute School — Unified Design System

This is the single source of truth for designing and building anything that should *feel* like 10 Minute School: student apps, teacher tools, internal ops (ClassroomOS, ERP), marketing pages, AI features (TenTen, SuperPrep), prototypes, and slides.

It consolidates `readme.md`, `sample.css`, and `sample.html` from this folder. If those files conflict with this doc, this doc wins; update the sources to match.

> **Brand in one line:** energetic, democratising, teacher-led, Bangla-first. Identity color is red, but real UI lives in a calmer, confident, content-dense frame — lots of white, sharp cards, Bengali headlines, **green for actions**.

---

## 0. How to use this doc

When starting any new 10MS surface:

1. **Pick the persona:** student (B2C — warm, motivating) or operator (B2B — neutral, table-dense).
2. **Pull the tokens:** `import` the CSS variables block in §3, or copy the Tailwind config snippet in §13.
3. **Compose with components from §8** — don't invent new cards/buttons; extend.
4. **Follow the layout rules in §6** (393px mobile, 1440px web, 16px gutters).
5. **Run the checklist in §15** before shipping.

Default fonts: **Inter** for English, **Hind Siliguri / Noto Sans Bengali** for Bangla.
Default action color: **green `#1CAB55`**, not red. Red is brand, not action.

---

## 1. Brand foundation

| | |
|---|---|
| **Mission** | Democratise quality education across Bangladesh, in Bangla. |
| **Visual identity color** | Red `#E8001D` (logo), `#931212` (deep brand red used in surfaces) |
| **Action color** | Green `#1CAB55` — primary CTAs, success, "go" states |
| **Default mode** | Light. White surfaces, dark text. Dark mode is reserved for video / Premium / hero moments. |
| **Density** | Content-dense. Cards. Lots of small structured information, not big empty hero space. |
| **Imagery** | Warm photo cutouts of teachers + flat colored SVG illustrations. Never b&w, never grainy, never hand-drawn. |

Audiences:

- **Students (B2C)** — Online Batch, TenTen, SuperPrep, Skills, Premium. Warm `তুমি` voice, motivating, slightly celebratory.
- **Operators (B2B)** — ClassroomOS, ERP, Compass (teachers), QC tools. Neutral, verb-led, table-dense. English-leaning UI with Bangla content.
- **Marketing / acquisition** — landing pages, lead-gate funnels, batch launches. High-energy, scarcity-aware, but never alarming.

---

## 2. Content principles

### Languages

- **Bangla-first.** Headlines and nav are almost always Bangla. English mixes in for technical words (`Live Class`, `QnA`, `HSC 27`, `Premium`).
- **Bilingual course names** are common: *বাংলা ১ম পত্র* + `Bangla 1st Paper`.
- Course/batch numbers refer to **exam/target year**, not enrollment year. `OB 26` = academic year 2026. `SSC 27` = Class 10 in 2026, boards in 2027.

### Voice

- Speak to students as **তুমি** — informal, never `আপনি`.
- Same beat in English: "Let's get started", "Keep going" — not formal.
- For operators: neutral, action-led. "Assign homework", "Mark attendance", "View report". No exclamation marks.

### Tone

- **B2C students:** motivating, slightly celebratory. Lots of progress language ("৬০% সঠিক উত্তরের হার", "Uploaded 12 hrs ago"). State prices and scarcity clearly: "প্রতি মাস ৳1300 থেকে শুরু", "7 days free trial".
- **B2B operators:** neutral, calm, dense.

### Casing

- English: **Title Case** for primary CTAs ("Subscribe Now"). **Sentence case** for body.
- Bangla: no case — relies on weight.

### No emoji

Across thousands of Figma text nodes, **emoji usage is essentially zero**. Use Lucide / Vuesax SVG icons inline instead. (Note: the marketing landing page in `sample.html` uses 🧪 📊 📚 in group tabs as a deliberate exception for high-energy lead gates — don't propagate that into product UI.)

### Numbers

- Use **Bengali numerals** in Bengali contexts (৫০০, ৬০%).
- Use English numerals in English-leaning phrases (`HSC 27`, `10MS`).
- Match the surrounding sentence. The helper `toBn(n)` in `sample.html` converts cleanly.

### Concrete copy examples

- Section header: **সর্বশেষ যুক্ত হয়েছে** · link: **সব দেখো**
- Tab switcher: **একাডেমিক / ইংলিশ / স্কিলস**
- Exam card: **500 টি — সর্বমোট প্রশ্ন** / **4 টি — উত্তর দিয়েছেন** / **60% — সঠিক উত্তরের হার**
- Premium upsell title: **টেন মিনিট স্কুল প্রিমিয়াম**
- CTA buttons: **কিনে নাও**, **শুরু করো**, **সাবস্ক্রাইব করো**

---

## 3. Design tokens (CSS variables)

Drop this `:root` block into any new project (it's a normalized version of `sample.css`). Then prefer variables over hard-coded hex.

```css
:root {
  /* ---------- Brand ---------- */
  --ten-red:        #E8001D;   /* primary identity red — logo only */
  --ten-red-dark:   #931212;   /* deep header / banner red */
  --ten-red-deep:   #721111;   /* deepest red — long shadows / strokes */
  --ten-red-accent: #A51E35;   /* supporting crimson */
  --ten-red-soft:   #F14545;   /* bright avatar-chip red */
  --ten-black:      #000000;
  --ten-white:      #FFFFFF;
  --ten-ink:        #111827;   /* near-black for body text — never pure #000 */

  /* ---------- Semantic ---------- */
  --success:        #1CAB55;   /* CTA green */
  --success-dark:   #0E7B4F;   /* CTA border */
  --success-deep:   #149353;   /* secondary green */
  --success-text:   #1B9E66;   /* pill / label green */
  --warn:           #EA580C;   /* orange */
  --warn-deep:      #A23F00;   /* darker orange text */
  --info:           #274FE3;   /* link / info blue */
  --info-soft:      #AFC3E6;   /* pale info blue tint */
  --premium-gold-1: #FFEAB4;
  --premium-gold-2: #E7B946;

  /* ---------- Neutrals (Tailwind-gray aligned) ---------- */
  --gray-50:  #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;

  /* ---------- Surfaces ---------- */
  --bg:             var(--ten-white);
  --bg-muted:       var(--gray-100);
  --bg-inverse:     #0B1117;   /* dark hero / video player */
  --surface-card:   var(--ten-white);
  --surface-subtle: #EEF2F4;   /* LX background */
  --surface-info:   #D8F3FF;   /* subject top-card tint */
  --border:         var(--gray-200);
  --border-strong:  var(--gray-300);

  /* ---------- Foreground roles ---------- */
  --fg-1: var(--gray-900);   /* primary text */
  --fg-2: var(--gray-600);   /* secondary text */
  --fg-3: var(--gray-500);   /* tertiary / meta */
  --fg-muted: var(--gray-400);
  --fg-on-brand: var(--ten-white);
  --fg-link: var(--info);

  /* ---------- Typography ---------- */
  --font-sans:    'Inter', 'Hind Siliguri', 'Noto Sans Bengali', system-ui, -apple-system, sans-serif;
  --font-bangla:  'Noto Sans Bengali', 'Hind Siliguri', 'Anek Bangla', 'Inter', sans-serif;
  --font-display: 'Inter', 'Hind Siliguri', sans-serif;
  --font-mono:    ui-monospace, SFMono-Regular, Menlo, monospace;

  --fs-display:  28px;
  --fs-h1:       22px;   /* section titles */
  --fs-h2:       20px;   /* screen titles */
  --fs-h3:       18px;   /* card titles, rail headers */
  --fs-body:     16px;
  --fs-body-sm:  14px;
  --fs-caption:  12px;
  --fs-micro:    11px;

  --lh-tight:   1.0;
  --lh-snug:    1.25;
  --lh-normal:  1.5;
  --lh-relaxed: 1.625;

  --tracking-tight:  -0.2px;
  --tracking-snug:   -0.1px;
  --tracking-normal:  0em;
  --tracking-wide:    0.01em;   /* Bengali */

  /* ---------- Radii ---------- */
  --r-xs:   4px;
  --r-sm:   8px;    /* inputs, primary buttons */
  --r-md:   12px;
  --r-lg:   16px;   /* cards (default) */
  --r-xl:   24px;   /* hero / home rail cards */
  --r-pill: 1000px; /* full capsules — tabs, chips */

  /* ---------- Spacing (4pt) ---------- */
  --s-1:  4px;
  --s-2:  8px;
  --s-3:  12px;
  --s-4:  16px;
  --s-5:  20px;
  --s-6:  24px;
  --s-7:  32px;
  --s-8:  40px;
  --s-10: 64px;

  /* ---------- Shadows ---------- */
  --sh-card:      0 1px 2px rgba(17, 24, 39, 0.04),
                  0 1px 3px rgba(17, 24, 39, 0.06);
  --sh-raised:    0 4px 12px rgba(17, 24, 39, 0.08);
  --sh-nav:       0 -4px 20px rgba(0, 0, 0, 0.05);
  --sh-inset-btn: inset 0 1px 1px rgba(255, 255, 255, 0.25);

  /* ---------- Motion ---------- */
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-in:  cubic-bezier(0.4, 0, 1, 1);
  --dur-fast: 120ms;
  --dur-base: 180ms;
  --dur-slow: 260ms;
}
```

### Token rules

- Body text is `var(--ten-ink)` (`#111827`), **not** `#000`.
- Card border is `1px solid var(--border)`. Shadows are rare — elevation is conveyed by border, not drop-shadow.
- Action surfaces (primary buttons, success states) use `var(--success)`, not red.
- Red `var(--ten-red)` is for: brand mark, eyebrow accents, bold marketing headlines, error/destructive states. Don't use it for default CTAs.
- Premium / video / "main stage" moments use `var(--bg-inverse)` (`#0B1117`) with a single colored radial glow.

---

## 4. Typography

### Fonts

| Role | Font | Weights |
|---|---|---|
| English UI | Inter | 400 / 500 / 600 / 700 |
| Bangla UI | Hind Siliguri | 300 / 400 / 500 / 600 / 700 |
| Bangla brand-supplied | Noto Sans Bengali (self-hosted) | 400 / 700 |
| Display moments | Inter Bold (substitute for licensed *Li Ador Noirrit* / *Beatrice Trial*) | 700 |
| Marketing display only | Bebas Neue (countdowns, retro hero numerals) | 400 |

Stack always falls back: `Inter → Hind Siliguri → Noto Sans Bengali → system-ui`.

### Scale

Mobile-first, 18/16/14/12 rhythm. 20/28 for screen titles. 22 for section centerpieces.

| Class | Size / Line | Weight | Use |
|---|---|---|---|
| `.h-display` | 28 / 1.25 | 700 | Hero / onboarding |
| `.h1` | 22 / 1.25 | 700 | Section title |
| `.h2` | 20 / 28 | 700 | Screen title |
| `.h3` | 18 / 26 | 700 | Card title, rail header |
| `.body-md` | 16 / 24 | 500 | Default body emphasis |
| `.body` | 16 / 24 | 400 | Default body |
| `.body-sm` | 14 / 20 | 400 | Supporting text |
| `.caption` | 12 / 16 | 400 | Meta / timestamps |
| `.meta` | 12 / 16 | 500 | Labels / chips |

Bangla uses `--tracking-wide` (+0.01em) and slightly taller line-height (1.5) to give ascenders/descenders room. Apply with the `.bn` class.

```css
.h1   { font: 700 22px/1.25 var(--font-sans); letter-spacing: -0.2px; color: var(--fg-1); }
.body { font: 400 16px/24px var(--font-sans); color: var(--fg-1); }
.bn   { font-family: var(--font-bangla); letter-spacing: 0.01em; line-height: 1.5; }
```

### Numbers in tables / countdowns

Use `font-variant-numeric: tabular-nums;` for any aligned column.

---

## 5. Iconography

10MS uses three icon systems side-by-side. Standardize on **Lucide** for product UI; copy custom Figma SVGs only for hero / branded moments.

| System | Where | Stroke | Size |
|---|---|---|---|
| **Lucide** (substitute for Vuesax) | Nav, list rows, player controls, inline | 1.5–1.75px | 20–24px |
| **Custom Figma SVGs** (`assets/icons/`) | Category tiles, Premium crown, SuperPrep mascot | Filled colored | 28–32px |
| **Photo cutouts** (PNG) | Course cards (teachers) | n/a | 28–44px |

### Rules of thumb

- **Inline / list:** 20–24px Lucide outline, `stroke-width: 1.75`.
- **Category tile:** 28–32px filled colored SVG inside a tinted circle/rounded square.
- **Bottom-tab:** 24px. Filled black when active, gray-600 outline when inactive.
- **Icon in colored circle (e.g. red play):** 28–36px circle, white glyph inside.
- **Emoji:** none, except deliberately on marketing lead-gate funnels.
- **Unicode symbols** (✓ ● →): only as flat bullets inside running copy.

---

## 6. Layout

### Canvas widths

| Surface | Width | Gutter | Content cap |
|---|---|---|---|
| Mobile | 393px (iPhone 14/15) | 16px | 361px |
| Tablet | 768px+ | 24px | 720px |
| Web (desktop) | 1440px | 24px | **1216px** |

### Mobile chrome

- **Top header:** 88px total = 30px status bar + 58px header. Content screens show back arrow + title only.
- **Bottom tab bar:** 72px fixed. 5 tabs — Home / Class / Discover / Assignments / Profile. 16px safe-area pad.
- Sticky chrome uses `backdrop-filter: blur(50px)` over `rgba(255,255,255,0.85)` on iOS surfaces.

### Vertical rhythm

- 24px top/bottom between sections within a screen.
- 48px between sections on web (72px on large viewports).
- 14px padding inside content cards. 16px gutters at screen edge.
- 8–12px gaps inside list rows.

### Grid

4pt grid throughout. Spacing tokens `--s-1 … --s-10` map directly.

---

## 7. Surfaces and elevation

- Screens are overwhelmingly **white** (`var(--bg)`).
- **No body gradients.** Pastel category cards use **flat fills**.
- **Dark surfaces** (`--bg-inverse`, `#0B1117` / `#000`) only for: video players, Premium modal, marketing hero. Add a **single colored radial glow** (red or orange) behind the title — never stacked gradients.
- **Borders, not shadows.** A standard 10MS surface = `1px solid var(--border)` on white.
- Tints for category cards: sky `#AFC3E6`, mint `#CCEBC0`, lavender `#E8DDFF`, info `#D8F3FF`, butter `#FFF5D6`. Always pastel, never saturated.
- Premium glass-effect: `linear-gradient(rgba(255,255,255,.25), rgba(255,255,255,0))` + `backdrop-filter: blur(8px)`.
- Premium gold gradient: `linear-gradient(--premium-gold-1 → --premium-gold-2)`.

---

## 8. Component library

The 10MS UI is built from a small, repeated set of primitives. Copy these patterns directly into any new build.

### 8.1 Card (the most important element)

```css
.card {
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);     /* 24px standard, 16px for compact */
  padding: var(--s-4);            /* 14–16px */
  transition: border-color var(--dur-base) var(--ease-out),
              transform   var(--dur-base) var(--ease-out),
              box-shadow  var(--dur-base) var(--ease-out);
}
.card:hover {
  border-color: var(--ten-red);
  box-shadow: 0 4px 14px rgba(232, 0, 29, 0.08);
  transform: translateY(-1px);
}
```

Anatomy: `leading icon/avatar · title (18px / 700 / --fg-1) · supporting line (12px / --fg-3) · trailing chevron or right-aligned metadata`. Rows inside a card are separated by `1px dashed var(--border-strong)`, not by padding alone.

### 8.2 Buttons

Three families. Use **green primary** by default. Use red only for marketing punch / destructive.

```css
/* Primary — green, the default action */
.btn-primary {
  background: var(--success);
  border: 1px solid var(--success-dark);
  box-shadow: var(--sh-inset-btn);
  color: var(--ten-white);
  font-weight: 700;
  border-radius: var(--r-sm);     /* 8px */
  padding: 14px 20px;
  transition: background var(--dur-base) var(--ease-out),
              transform  var(--dur-base);
}
.btn-primary:hover  { background: #17994B; }
.btn-primary:active { transform: scale(0.98); }

/* Outline (on dark heroes) */
.btn-outline-white {
  background: transparent;
  border: 1.5px solid rgba(255,255,255,0.75);
  color: #fff;
  font-weight: 600;
  border-radius: var(--r-sm);
  padding: 14px 20px;
  transition: all var(--dur-base) var(--ease-out);
}
.btn-outline-white:hover { background: rgba(255,255,255,0.08); border-color: #fff; }

/* Red — marketing emphasis / destructive only */
.btn-red {
  background: var(--ten-red);
  color: #fff;
  font-weight: 700;
  border: 1px solid var(--ten-red-dark);
  box-shadow: var(--sh-inset-btn);
  border-radius: var(--r-sm);
  padding: 12px 24px;
  transition: background var(--dur-base);
}
.btn-red:hover { background: #C70019; }
```

- Pill button (secondary): `border-radius: var(--r-pill)`, 27–44px tall.
- Pulse glow on critical CTAs: `glow-pulse 2.4s ease-out infinite` (see §11).
- Press state: 8% darken or `scale(0.98)`.
- Hover: 5% darken on filled, lighten one step on outlined.

### 8.3 Inputs

```css
.input-field {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  font-size: 15px;
  font-family: var(--font-sans);
  background: #fff;
  transition: border-color var(--dur-base), box-shadow var(--dur-base);
}
.input-field:focus {
  outline: none;
  border-color: var(--ten-red);
  box-shadow: 0 0 0 3px rgba(232, 0, 29, 0.12);
}
```

Focus ring is **always red** (brand) regardless of CTA color. 3px translucent ring, never solid outline.

### 8.4 Group tabs (segmented selector)

White cards in a row, active state = red border + soft red bg + 3px halo.

```css
.group-tab {
  flex: 1;
  padding: 12px 8px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  color: var(--gray-600);
  cursor: pointer;
  transition: all var(--dur-base);
  text-align: center;
}
.group-tab:hover  { border-color: var(--gray-400); }
.group-tab.active {
  border-color: var(--ten-red);
  background: #FFF5F6;
  color: var(--ten-red);
  box-shadow: 0 0 0 3px rgba(232, 0, 29, 0.08);
}
```

### 8.5 Pills / chips

- Eyebrow tag: small uppercase, tracked, red on translucent red — `bg: rgba(232,0,29,0.10–0.15); color: var(--ten-red); border: 1px solid rgba(232,0,29,0.40);`.
- Live indicator: tiny `bg-ten-red` dot + `animate-pulse` + uppercase "Live Now" / "FRL · SSC 2026".
- Status pill: `var(--success)` bg, white text, micro size for "LIVE আজ".

### 8.6 Capsule tabs (top of screen)

`border-radius: var(--r-pill)`. Active tab = filled black/red with white text. Inactive = transparent with `--fg-2`.

### 8.7 Subject tile / date chip (course rail)

A standard 10MS list row for an upcoming class or homework item:

```html
<div class="subject-tile">
  <div class="date-chip"><div class="d-day">১৮</div><div class="d-mon">এপ্রিল</div></div>
  <div>
    <div class="title bn">বাংলা ১ম পত্র</div>
    <div class="meta">৪:০০ PM</div>
  </div>
</div>
```

```css
.subject-tile {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 14px;
  display: flex; align-items: center; gap: 12px;
  transition: border-color .18s, transform .18s, box-shadow .18s;
}
.subject-tile:hover     { border-color: var(--ten-red); transform: translateY(-1px); }
.subject-tile.is-today  { border-color: var(--success); background: linear-gradient(180deg,#F0FBF4 0%,#fff 60%);
                          box-shadow: 0 0 0 3px rgba(28,171,85,0.12); }
.subject-tile.is-past   { opacity: 0.55; background: var(--gray-50); }

.date-chip {
  flex-shrink: 0; width: 56px; height: 60px; border-radius: 12px;
  background: #1A0005; color: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}
.date-chip::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--ten-red); }
.date-chip .d-day  { font-size: 22px; font-weight: 700; margin-top: 6px; }
.date-chip .d-mon  { font-size: 11px; font-weight: 500; margin-top: 3px; color: #FFD600; }

.subject-tile.is-today .date-chip          { background: var(--success); }
.subject-tile.is-today .date-chip::before  { background: #FFD600; }
```

### 8.8 Routine / data table

```css
.routine-table { border-collapse: separate; border-spacing: 0; width: 100%; }
.routine-table thead th {
  background: #1A0005;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  text-align: left;
  padding: 12px 14px;
  position: sticky; top: 0;
}
.routine-table thead th:first-child { border-top-left-radius: 12px; }
.routine-table thead th:last-child  { border-top-right-radius: 12px; }
.routine-table tbody td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  color: var(--fg-1);
}
.routine-table tbody tr:hover td { background: #FFF8E7; }
.routine-table tbody tr:last-child td { border-bottom: none; }
```

For B2B operator surfaces, swap dark-red header for `var(--gray-100)` background + `var(--fg-2)` text.

### 8.9 Countdown digits (marketing)

Dark boxes with red glow + Bebas Neue numerals.

```css
.cd-box {
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(232,0,29,0.50);
  box-shadow: 0 0 18px rgba(232,0,29,0.25) inset;
  border-radius: 10px;
  min-width: 78px;
  padding: 14px 10px 10px;
}
.cd-num {
  font-family: 'Bebas Neue', system-ui, sans-serif;
  font-size: 48px; line-height: 1; color: #fff;
  text-shadow: 0 0 14px rgba(232,0,29,0.6);
  font-variant-numeric: tabular-nums;
}
.cd-label { color: #FFD600; font-size: 11px; letter-spacing: 2px; font-weight: 700; }
```

### 8.10 Ticker strip

Yellow scroll-marquee for "FREE FRL · প্রতিদিন বিকাল ৪টা · …". Use sparingly, marketing only.

```css
.ticker         { background: #FFD600; color: #1A0005; padding: 10px 0; overflow: hidden;
                  border-top: 2px solid #1A0005; border-bottom: 2px solid #1A0005; font-weight: 700; }
.ticker-track   { display: inline-block; white-space: nowrap;
                  animation: ticker-scroll 38s linear infinite; padding-left: 100%; }
.ticker-track .dot { color: var(--ten-red); font-size: 18px; }

@keyframes ticker-scroll {
  0%   { transform: translate3d(0,0,0); }
  100% { transform: translate3d(-100%,0,0); }
}
```

### 8.11 Geometry watermarks (hero decoration)

Stroked △ ○ ▢ in `var(--ten-red)` at 0.10–0.22 opacity, optionally drifting.

```css
.geo-watermark { position: absolute; pointer-events: none; stroke: var(--ten-red); fill: none; opacity: 0.22; }
@keyframes geo-drift { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-12px) rotate(4deg); } }
.geo-drift     { animation: geo-drift 9s ease-in-out infinite; }
```

### 8.12 Sticky bottom nav

72px tall, white with `backdrop-filter: blur(50px)` and `--sh-nav` shadow. 5 tabs. Active = filled black icon + black label, inactive = `var(--gray-600)` outline + label.

### 8.13 Premium / dark moments

```css
.premium {
  background: radial-gradient(ellipse at 80% 10%, rgba(232,0,29,0.22), transparent 55%),
              radial-gradient(ellipse at 10% 90%, rgba(232,0,29,0.12), transparent 60%),
              linear-gradient(180deg, #1A0005 0%, #0A0004 100%);
  color: #fff;
}
```

Premium **title** uses gold gradient as the text fill (or background-clip text). Crown icon optional.

### 8.14 Footer (dark)

Background `#0A0004`, text `rgba(255,255,255,0.55)`, links hover to white. Divider `border-top: 1px solid rgba(255,255,255,0.10);`.

---

## 9. Page patterns

These are recipe-level patterns proven in production / `sample.html`.

### 9.1 Marketing hero (dark)

`Premium dark gradient + geo watermarks + eyebrow pill + Bangla bold headline (32–58px) + Bangla subhead + dual CTA (green primary + outline white) + countdown + ticker.`

Use for: batch launches, FRL, Final Revision, course pre-books.

### 9.2 Class routine grid

3-column grid of `.subject-tile`s on desktop, 2-col on tablet, 1-col on mobile. Mark today's class with `.is-today`, past with `.is-past`.

### 9.3 Lead-gate / Suggestion PDF funnel

`Eyebrow ("100% FREE") → bilingual headline → form card (name + phone + district + group tabs) → primary green submit → success card with red download button.`

- Phone: `pattern="01[3-9][0-9]{8}"`, `maxlength="11"`.
- District: 64-district select dropdown (full list in `sample.html`).
- Submit posts to a Google Apps Script Web App; fires Pixel `Lead` event.

### 9.4 Recorded course rail

3 cards in a row, each with a tinted icon square, "SSC Masterplan" eyebrow, group title, supporting line, red `→` link.

### 9.5 Bottom CTA / "What's Next?"

Dark surface with red radial glow, centered headline, single green primary CTA. One job, one button.

### 9.6 Student home (B2C app)

`Top header (avatar + greeting in Bangla) → Premium banner card → Continue learning rail → Subject category tiles (pastel) → Live class strip → Featured courses → Bottom tab nav.`

### 9.7 Operator dashboard (B2B — ClassroomOS, ERP)

`Left rail nav + breadcrumb + page title + filters chip row + dense table + side detail drawer.` English-leaning labels, Bangla content cells, no emoji, neutral header on tables.

### 9.8 LX / Live class player

Near-black `#0B1117` surface, video at top, sidebar tabs ("Doubt", "Resources", "Chat"), bottom controls with white glyphs in 36px circles. Outside the player, return to white surfaces.

---

## 10. Motion

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120ms | Micro-states (chip select, checkbox) |
| `--dur-base` | 180ms | Default (hover, focus, color shifts) |
| `--dur-slow` | 260ms | Larger transitions (drawers, reveal) |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Default |
| `--ease-in`  | `cubic-bezier(0.4, 0, 1, 1)` | Exits only |

### Patterns

- **Hover (filled):** background darkens ~5%.
- **Hover (outlined):** background lightens one step.
- **Press:** `scale(0.98)` or 8% darken.
- **Reveal on scroll:** `opacity 0 → 1`, `translateY(16px) → 0`, 600ms.
- **Pulse glow on hero CTA:** keyframe alternating box-shadow for 2.4s.
- **Geometry drift:** ±12px translateY + 4deg rotate, 9s loop. Marketing only.

### Don't

- No bounces.
- No parallax.
- No floating cards.
- No 3D rotates.

---

## 11. Reusable keyframes

```css
@keyframes glow-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(28,171,85,0.55), 0 10px 30px rgba(0,0,0,0.35); }
  50%     { box-shadow: 0 0 0 14px rgba(28,171,85,0),    0 10px 30px rgba(0,0,0,0.35); }
}
@keyframes geo-drift   { 0%,100% { transform: translateY(0) rotate(0); }
                         50%     { transform: translateY(-12px) rotate(4deg); } }
@keyframes ticker-scroll { 0% { transform: translate3d(0,0,0); }
                           100% { transform: translate3d(-100%,0,0); } }

.reveal      { opacity: 0; transform: translateY(16px);
               transition: opacity .6s ease, transform .6s ease; }
.reveal.in   { opacity: 1; transform: none; }
.btn-pulse   { animation: glow-pulse 2.4s ease-out infinite; }
```

Bind `.reveal` via `IntersectionObserver` (threshold 0.12) — see implementation in `sample.html`.

---

## 12. Accessibility

- **Color contrast:** body text `--ten-ink` on white = 16:1. CTA white on `--success` = 4.5:1 (passes AA at large). Don't put white text on light pastel tints.
- **Focus state:** 3px translucent red ring on inputs and interactive cards. Never remove `:focus-visible`.
- **Tap targets:** minimum 44×44px on mobile (bottom-tab icons live in a 72px bar so they pass).
- **Bangla line-height:** keep `line-height: 1.5+` to avoid clipping diacritics.
- **Form validation:** show inline messages in `var(--ten-red)` below the input; never rely only on color (use icon + text).
- **Motion:** respect `prefers-reduced-motion: reduce` — disable `geo-drift`, `glow-pulse`, ticker, and `.reveal` transitions.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .reveal { opacity: 1; transform: none; }
}
```

---

## 13. Implementation playbook

### Folder convention for any new app/feature

```
my-app/
  assets/
    colors_and_type.css     # the §3 token block
    fonts/                  # NotoSansBengali-{Regular,Bold}.ttf
    icons/                  # custom Figma SVGs (Premium crown, category tiles)
    10ms-logo-{default,red,white}.svg
  components/               # cards, buttons, inputs reused across screens
  pages/ or screens/
  index.html  (or app entry)
```

Always import:

```html
<link rel="stylesheet" href="assets/colors_and_type.css" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

### Tailwind config (drop-in)

```js
tailwind.config = {
  theme: {
    extend: {
      colors: {
        'ten-red':       '#E8001D',
        'ten-red-dark':  '#931212',
        'ten-red-deep':  '#721111',
        'ten-ink':       '#111827',
        'ten-green':     '#1CAB55',
        'ten-green-dk':  '#0E7B4F',
        'ten-info':      '#274FE3',
        'sg-bg':         '#0A0004',  // marketing hero only
        'sg-yellow':     '#FFD600',  // ticker / accent only
      },
      fontFamily: {
        bn:      ['Hind Siliguri', 'Noto Sans Bengali', 'sans-serif'],
        inter:   ['Inter', 'sans-serif'],
        display: ['"Bebas Neue"', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'pill': '1000px',
      },
      boxShadow: {
        'inset-btn': 'inset 0 1px 1px rgba(255,255,255,0.25)',
        'nav':       '0 -4px 20px rgba(0,0,0,0.05)',
        'card':      '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
      },
      transitionTimingFunction: {
        'ten': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
};
```

### Flutter / native parity

When porting to Flutter (per `projects/flutter-migration.md`):

- Map `--ten-ink` → `Color(0xFF111827)`, `--success` → `Color(0xFF1CAB55)`, `--ten-red` → `Color(0xFFE8001D)`.
- Use **Inter** + **Hind Siliguri** via `google_fonts` package; bundle Noto Sans Bengali as asset font.
- Card = `Container(decoration: BoxDecoration(color: white, border: Border.all(color: 0xFFE5E7EB), borderRadius: BorderRadius.circular(24)))`. **No `BoxShadow`** by default.
- Bottom nav = 72px with `BackdropFilter(sigmaX:50, sigmaY:50)` and 85% white.

### React component naming

Prefix shared primitives with `Ten`: `<TenCard>`, `<TenButton variant="primary"/>`, `<TenInput/>`, `<TenSubjectTile/>`, `<TenCountdown/>`. Keep the variant names in this doc canonical (`primary | red | outline-white | pill`).

---

## 14. Do's and don'ts

### Do

- Use **borders, not shadows**, for elevation.
- Default to **green** for the primary action.
- Lead Bangla headlines with **Hind Siliguri 700**, English with **Inter 700**, both with `letter-spacing: -0.2px` at 16px+.
- Use pastel tints for category cards, never saturated.
- Keep dark surfaces to video, Premium, and marketing heroes only.
- Write `তুমি` for students.
- Use `1px dashed var(--border-strong)` to separate card-internal sections.
- Use `font-variant-numeric: tabular-nums` for any aligned numbers.

### Don't

- ❌ Big drop shadows on cards.
- ❌ Purple/blue SaaS gradients (10MS is red + green, not a fintech app).
- ❌ Emoji in product UI.
- ❌ Pure black `#000` for body text — always `#111827`.
- ❌ Left-border-only accent cards.
- ❌ Hand-drawn / squiggly illustrations.
- ❌ Red as the default CTA color (it reads alarming) — use green.
- ❌ `আপনি` voice in student-facing copy.
- ❌ Mixing 3+ icon families in one screen — pick Lucide + one custom system.
- ❌ Animating every card — `.reveal` once on scroll-in, not on every state change.

---

## 15. App-building checklist

Before you ship, verify:

**Brand & content**

- [ ] Bangla-first? Headlines / nav in Bangla?
- [ ] Voice is `তুমি` (B2C) or neutral verb-led (B2B)?
- [ ] No emoji in product UI (marketing exception aside)?
- [ ] Numerals match surrounding language (Bengali in Bangla copy)?

**Tokens**

- [ ] `colors_and_type.css` (or token block) imported?
- [ ] No raw hex outside the token file (search the codebase for `#`)?
- [ ] Body text is `--ten-ink`, never `#000`?
- [ ] Action color is `--success`, not `--ten-red`?

**Typography**

- [ ] Inter loaded (400/500/600/700)?
- [ ] Hind Siliguri + Noto Sans Bengali loaded?
- [ ] `letter-spacing: -0.2px` on Inter headings 16px+?
- [ ] Bangla blocks have `--tracking-wide` and `line-height ≥ 1.5`?

**Layout**

- [ ] Mobile design width 393px? Web cap 1216px on a 1440px canvas?
- [ ] 16px screen gutters? 14–16px card padding?
- [ ] Bottom tab bar 72px on mobile? Top header 88px?

**Components**

- [ ] Cards use `1px solid var(--border)` + `--r-xl` radius, no shadow?
- [ ] Inputs have red focus ring (3px translucent)?
- [ ] Primary buttons green with inset-white highlight + `--success-dark` border?
- [ ] Press state `scale(0.98)` or 8% darken?

**Motion**

- [ ] Transitions 120–260ms with `--ease-out`?
- [ ] No bounces, no parallax?
- [ ] `prefers-reduced-motion` honored?
- [ ] Reveal-on-scroll bound via IntersectionObserver, not `setTimeout`?

**Accessibility**

- [ ] Tap targets ≥ 44×44px?
- [ ] Focus visible on every interactive element?
- [ ] Contrast AA on body text and CTAs?
- [ ] Form errors use icon + text, not color alone?

**Performance**

- [ ] Fonts: `display=swap`, preconnect to Google Fonts?
- [ ] Bangla self-hosted (Noto Sans Bengali) for first paint?
- [ ] No animation loops bound to scroll? Use IO not scroll listeners.

---

## 16. Per-product quick reference

| Product | Surface mode | Primary action | Notable patterns |
|---|---|---|---|
| **Online Batch (OB)** student app | Light, dense | Green | Subject tiles, live class strip, Premium banner, bottom-tab |
| **TenTen** (AI doubt-solver) | Light + chat dark mode | Green | Chat bubbles, HITL escalation pill, attachment thumbs |
| **SuperPrep** | Light + exam dark mode | Green | Question cards, MCQ tiles, score ring, attempt history |
| **ClassroomOS** (ops) | Light, table-dense | Neutral / blue | Left nav, filter chips, dense table, side drawer |
| **ERP** (admin) | Light, table-dense | Neutral | Same as ClassroomOS, heavier forms |
| **CBT** (offline English) | Light + invigilation dark | Green | OMR-style answer grid, timer ring, fullscreen exam |
| **Compass** (teacher app) | Light, mobile-first | Green | Attendance roll, lesson plan cards, payroll summary |
| **Marketing pages** | Dark hero + light body | Green primary, red emphasis | Geo watermarks, ticker, countdown, lead-gate funnel |

---

## 17. Source files in this folder

| File | Role |
|---|---|
| [readme.md](readme.md) | Original written design notes (foundation) |
| [sample.css](sample.css) | Canonical token CSS — import in every project |
| [sample.html](sample.html) | Reference implementation: hero, routine, lead gate, recorded rail, dark CTA, footer |
| [DESIGN.md](DESIGN.md) | This file — unified, build-ready spec |

If you change a token, update `sample.css` *and* §3 of this file in the same commit. If you build a new component, add it to §8.

---

*Last reviewed: 2026-04-29.*


