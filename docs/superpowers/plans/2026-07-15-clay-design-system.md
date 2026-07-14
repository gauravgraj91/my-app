# Dukaan Clay Design System Adoption — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the "Dukaan Clay" design language (warm cream/clay palette, pill shapes, Bricolage Grotesque display type) across the app by remapping theme tokens, restyling the core UI kit, adding four new Clay components, and converting the nav to a segmented pill bar.

**Architecture:** Clay's values are mapped onto the app's *existing* token names in `src/styles/theme.css` (e.g. Clay `--accent` → app `--primary`), so the ~27 token-consuming files restyle themselves with zero churn. Component work is limited to shape/weight changes (pill radii, font weights, shadow policy) plus four new components ported from the Clay package. Screen-level layout redesign (Dashboard/HomeView rework to match the prototype) is deliberately **out of scope** — it's a follow-up plan once the system lands.

**Tech Stack:** React 18 (CRA, JSX in `.js`), inline styles + CSS variables, `.dark` class on `<body>` for dark mode, React Testing Library/Jest, lucide-react.

**Design source of truth:** `/Users/gauravraj/Downloads/App design improvement clay/` — `Clay Prototype v2.dc.html` (visual reference), `tokens/*.css` (values), `components/core/*.jsx` (component reference), `readme.md` (rules).

## Global Constraints

- Inline styles only; no CSS modules, styled-components, MUI, or new dependencies.
- All colors/shadows via theme tokens (`var(--*)`) — never hardcoded hex in components. Hex values are allowed ONLY inside `src/styles/theme.css`.
- Hex-alpha appends (`` `${color}20` ``) break with `var()` — use `color-mix(in srgb, ${color} 12%, transparent)` if needed.
- Clay shadow policy: **no shadows on cards**; shadows only on the primary button (`--shadow-accent`) and overlays/modals (`--shadow-lg`).
- Everything interactive is a pill (`--radius-pill: 999px`); cards 20px; rows 14px; inputs 12px; modals 24px.
- Fonts: Bricolage Grotesque (display/headings, weight 800) + Hanken Grotesk (body). Google-hosted; URL must be identical in `public/index.html` and `.design-sync/ds.css`.
- New components in `src/components/ui/` MUST be registered in `.design-sync/config.json` (`componentSrcMap`); they're covered by `entry.js` automatically only if exported from the `src/components/ui/index.js` barrel.
- **Test baseline gotcha:** the full suite has a known ~191-failure baseline. NEVER use the full `npm test` run as a pass/fail gate. Run only the specific test file for the task: `CI=true npx react-scripts test --watchAll=false <path>`.
- `npm run build` must pass after every task (per CLAUDE.md).
- Work on a feature branch off `dev`: `git checkout -b clay-design` (or a worktree via superpowers:using-git-worktrees).
- Clay→app token translation used throughout this plan (memorize; Clay names appear in the reference `.jsx` files but must NOT appear in app code):
  | Clay token | App token |
  |---|---|
  | `--accent` | `--primary` |
  | `--accent-hover` | `--primary-hover` |
  | `--accent-soft` | `--primary-soft` |
  | `--on-accent` | `--primary-foreground` |
  | `--surface-page` | `--background` |
  | `--surface-card` | `--card` |
  | `--surface-soft` | `--muted` |
  | `--surface-pill` | `--secondary` |
  | `--border-line` | `--border` |
  | `--text-heading` | `--foreground` |
  | `--text-muted` | `--muted-foreground` |
  | `--font-body` | `--font-sans` |
  | `--font-display` | `--font-display` (new) |
  | `--radius-pill` | `--radius-pill` (new) |
  | `--shadow-accent` | `--shadow-accent` (new) |

---

### Task 1: Load the Clay webfonts

**Files:**
- Modify: `public/index.html:19-22` (the Google Fonts `<link>`)
- Modify: `.design-sync/ds.css` (the duplicated fonts URL — find it with `grep -n "fonts.googleapis" .design-sync/ds.css`)

**Interfaces:**
- Produces: the font families `'Bricolage Grotesque'` (400/600/700/800) and `'Hanken Grotesk'` (400/500/600/700/800) available at runtime; Task 2's `--font-display` token depends on this.

- [ ] **Step 1: Update the font link in `public/index.html`**

Replace:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
```

with:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap"
      rel="stylesheet"
    />
```

- [ ] **Step 2: Update the same URL in `.design-sync/ds.css`**

Locate the line containing `fonts.googleapis.com` and replace the URL portion with the exact URL from Step 1 (keep the line's existing form — `@import url('…');` or `<link>`-equivalent — only the URL changes):

```
https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: `Compiled successfully` (or compiled with pre-existing warnings only).

- [ ] **Step 4: Commit**

```bash
git add public/index.html .design-sync/ds.css
git commit -m "feat(clay): load Bricolage Grotesque + full Hanken Grotesk weights"
```

---

### Task 2: Remap theme tokens to the Clay palette

**Files:**
- Modify: `src/styles/theme.css` (full rewrite of token values; keep the existing token *names*)
- Modify: `.design-sync/conventions.md` (token list must mirror theme.css — per `.design-sync/NOTES.md` re-sync risk #4)

**Interfaces:**
- Consumes: fonts from Task 1.
- Produces: all existing tokens with Clay values, plus new tokens `--font-display`, `--radius-pill`, `--radius-modal`, `--shadow-accent`, `--overdue`, `--overdue-foreground`. Every later task uses these names.

- [ ] **Step 1: Replace the contents of `src/styles/theme.css`**

```css
/* ============================================================
   theme.css — single source of truth for the whole app.
   Import ONCE in src/index.js:  import './styles/theme.css';
   Dark mode already works: Header.js toggles `.dark` on <body>.
   Fonts (Hanken Grotesk + Bricolage Grotesque) load via <link>
   in public/index.html.
   Design language: "Dukaan Clay" — warm cream surfaces, one
   clay-orange accent, pill shapes, flat cards (no card shadows;
   shadows only on the primary button and overlays).
   ============================================================ */

:root {
  /* Surfaces & text */
  --background:        #faf4ec;
  --foreground:        #33261d;  /* headings / primary numbers */
  --foreground-body:   #33261d;  /* body copy — Clay uses ink for body too */
  --card:              #ffffff;
  --card-foreground:   #33261d;

  /* Brand — ONE hue (clay orange) */
  --primary:           #c2502e;  /* buttons, active nav, links */
  --primary-hover:     #a8431f;
  --primary-foreground:#fff6ef;
  --primary-soft:      #fdf0e8;  /* tinted chip / overdue row fill */
  --primary-accent:    #c2502e;  /* text/icon accent (same as primary in light) */

  /* Neutrals */
  --secondary:         #f0e6d8;  /* pill-bar track, chips, subtle fills */
  --muted:             #f7f1e7;  /* soft hover fills */
  --muted-foreground:  #7a6a58;  /* labels, captions */
  --border:            #ecdfd0;  /* warm hairline on cards */
  --border-subtle:     #f3e9db;  /* row dividers */
  --input:             #ecdfd0;  /* control borders */
  --ring:              #c2502e;

  /* Semantic — status ONLY, never decoration */
  --success:           #4f7a2e;  --success-soft: #e9f2dc;
  --warning:           #9c6b13;  --warning-soft: #fbf0d7;
  --danger:            #c2502e;  --danger-soft:  #fdf0e8;
  /* Overdue is SOLID clay (Clay spec), unlike soft-tinted statuses */
  --overdue:           #c2502e;  --overdue-foreground: #fff6ef;

  /* Shape — pills for interactives, generous card radii */
  --radius-sm: 12px;    /* inputs, small tiles */
  --radius:    14px;    /* list rows */
  --radius-lg: 20px;    /* cards, panels */
  --radius-pill: 999px; /* buttons, tabs, badges, search */
  --radius-modal: 24px;

  /* Depth — flat cards; shadow ONLY on primary button + overlays */
  --shadow-sm: none;
  --shadow:    none;
  --shadow-lg: 0 30px 80px rgba(30, 20, 12, .3);
  --shadow-accent: 0 4px 14px rgba(194, 80, 46, .35);

  --font-sans: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
  --font-display: 'Bricolage Grotesque', var(--font-sans);
}

.dark {
  --background:        #221a13;
  --foreground:        #f5ead9;
  --foreground-body:   #f5ead9;
  --card:              #2d241b;
  --card-foreground:   #f5ead9;

  --primary:           #c2502e;
  --primary-hover:     #a8431f;
  --primary-foreground:#fff6ef;
  --primary-soft:      #42281c;
  --primary-accent:    #d97b4a;  /* lighter clay for text/links on dark */

  --secondary:         #3a2e22;
  --muted:             #3a2e22;
  --muted-foreground:  #b39d84;
  --border:            #443627;
  --border-subtle:     #3a2e22;
  --input:             #443627;
  --ring:              #d97b4a;

  --success:           #a8d47a;  --success-soft: #33422a;
  --warning:           #eec37a;  --warning-soft: #463a1e;
  --danger:            #ffb08e;  --danger-soft:  #42281c;
  --overdue:           #c2502e;  --overdue-foreground: #fff6ef;

  --shadow-sm: none;
  --shadow:    none;
  --shadow-lg: 0 30px 80px rgba(0, 0, 0, .5);
  --shadow-accent: 0 4px 14px rgba(194, 80, 46, .35);
}

/* Global resets so every screen inherits the system */
body {
  margin: 0;
  font-family: var(--font-sans);
  background: var(--background);
  color: var(--foreground-body);
  font-variant-numeric: tabular-nums;   /* aligned money columns */
  -webkit-font-smoothing: antialiased;
  transition: background-color .25s, color .25s;
}

/* Clay display type for headings */
h1, h2, h3 {
  font-family: var(--font-display);
  letter-spacing: -0.02em;
}
```

- [ ] **Step 2: Reconcile `.design-sync/conventions.md`**

Open `.design-sync/conventions.md`. It enumerates the theme tokens for the design agent. Update that enumeration to match the file above: same token names as before plus the six new ones (`--font-display`, `--radius-pill`, `--radius-modal`, `--shadow-accent`, `--overdue`, `--overdue-foreground`), and update any prose describing the palette (indigo → clay orange, cool grays → warm cream/cocoa, "no colored glows" → "clay glow on primary button only"). Do not change anything else in the file.

- [ ] **Step 3: Verify build and visual smoke-check**

Run: `npm run build`
Expected: `Compiled successfully`.
Then run `npm start`, open http://localhost:3000, and confirm: cream page background, clay-orange primary buttons/links, dark-mode toggle produces warm cocoa (not gray/blue) surfaces. Do a full page reload after theme change (not HMR).

- [ ] **Step 4: Commit**

```bash
git add src/styles/theme.css .design-sync/conventions.md
git commit -m "feat(clay): remap theme tokens to Dukaan Clay palette"
```

---

### Task 3: Fix the Card prop-spread bug and apply Clay card chrome

**Files:**
- Modify: `src/components/ui/Card.js`
- Test: `src/components/ui/__tests__/Card.test.js` (create)
- Modify: `CLAUDE.md` (remove the Card gotcha; check off the P2 backlog item)

**Interfaces:**
- Consumes: `--radius-lg`, `--shadow-lg`, `--card`, `--card-foreground`, `--border` from Task 2.
- Produces: `Card` (default export) with unchanged props API `{ children, className, padding = 24, shadow = 'default', style, ...props }` — but `style` now MERGES with card chrome instead of replacing it. `StatCard` (which always passes `style`) starts rendering correctly with no changes of its own.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/Card.test.js`:

```js
import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from '../Card';

describe('Card', () => {
  test('keeps card chrome when a style prop is passed', () => {
    render(<Card style={{ marginTop: 4 }} data-testid="card">content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveStyle({ background: 'var(--card)' });
    expect(card).toHaveStyle({ marginTop: '4px' });
  });

  test('uses Clay card radius and no shadow by default', () => {
    render(<Card data-testid="card">content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveStyle({ borderRadius: 'var(--radius-lg)' });
    expect(card).toHaveStyle({ boxShadow: 'none' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/Card.test.js`
Expected: FAIL — first test fails because `{...props}` re-applies `style={{marginTop: 4}}` after `style={cardStyle}`, wiping `background`; second fails on `borderRadius: 12`.

- [ ] **Step 3: Rewrite `src/components/ui/Card.js`**

```js
import React from 'react';

const Card = ({
  children,
  className = '',
  padding = 24,
  shadow = 'default',
  style,
  ...props
}) => {
  const shadowStyles = {
    none: 'none',
    sm: 'none',
    default: 'none',
    lg: 'var(--shadow-lg)'
  };

  const cardStyle = {
    background: 'var(--card)',
    color: 'var(--card-foreground)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: shadowStyles[shadow],
    padding: padding,
    border: '1px solid var(--border)',
    ...style
  };

  return (
    <div
      className={`card ${className}`}
      {...props}
      style={cardStyle}
    >
      {children}
    </div>
  );
};

export default Card;
```

(Key changes: `style` is destructured out of `...props` so it can't clobber; `{...props}` moves BEFORE `style`; radius 12 → `var(--radius-lg)`; all default shadows → `none` per Clay's flat-card rule; the shadow-transition line is dropped since cards no longer elevate.)

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/Card.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Update `CLAUDE.md`**

In `## Gotchas`, delete the line:

```
- Never pass a `style` prop to `Card`/`StatCard` — `Card` spreads `{...props}` after `style={cardStyle}`, so any `style` prop replaces ALL card styling (see backlog)
```

In `### P2 — Medium`, change the `Fix Card prop-spread order` item from `- [ ]` to `- [x]` and append ` — DONE 2026-07-15 as part of Clay adoption.` to it.

- [ ] **Step 6: Verify build and commit**

Run: `npm run build` → expected `Compiled successfully`.

```bash
git add src/components/ui/Card.js src/components/ui/__tests__/Card.test.js CLAUDE.md
git commit -m "fix(ui): Card style prop no longer wipes card chrome; Clay card shape"
```

---

### Task 4: Restyle Button to Clay pills

**Files:**
- Modify: `src/components/ui/Button.js`
- Test: `src/components/ui/__tests__/Button.test.js` (create)

**Interfaces:**
- Consumes: `--radius-pill`, `--shadow-accent`, `--primary*` tokens from Task 2.
- Produces: `Button` (default export) with unchanged props API `{ children, variant = 'primary'|'secondary'|'success'|'danger'|'outline', size = 'small'|'medium'|'large', icon, loading, className, style, ...props }`. Callers need no changes.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/Button.test.js`:

```js
import React from 'react';
import { render, screen } from '@testing-library/react';
import Button from '../Button';

describe('Button', () => {
  test('primary is a pill with the clay glow', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveStyle({ borderRadius: 'var(--radius-pill)' });
    expect(btn).toHaveStyle({ boxShadow: 'var(--shadow-accent)' });
  });

  test('secondary has no glow', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole('button', { name: 'Cancel' });
    expect(btn).not.toHaveStyle({ boxShadow: 'var(--shadow-accent)' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/Button.test.js`
Expected: FAIL — `borderRadius` is currently `8px` and primary has no boxShadow.

- [ ] **Step 3: Edit `src/components/ui/Button.js`**

Replace the `variants` object (lines 13–39) with:

```js
  const variants = {
    primary: {
      background: 'var(--primary)',
      color: 'var(--primary-foreground)',
      border: 'none',
      boxShadow: 'var(--shadow-accent)'
    },
    secondary: {
      background: 'var(--card)',
      color: 'var(--foreground)',
      border: '1px solid var(--border)'
    },
    success: {
      background: 'var(--success)',
      color: 'var(--primary-foreground)',
      border: 'none'
    },
    danger: {
      background: 'var(--danger)',
      color: 'var(--primary-foreground)',
      border: 'none'
    },
    outline: {
      background: 'transparent',
      color: 'var(--primary)',
      border: '1px solid var(--primary)'
    }
  };
```

Replace the `sizes` object (lines 41–45) with Clay's paddings:

```js
  const sizes = {
    small: { padding: '8px 14px', fontSize: 12 },
    medium: { padding: '11px 22px', fontSize: 14 },
    large: { padding: '14px 28px', fontSize: 15 }
  };
```

In `buttonStyle`, change `borderRadius: 8` → `borderRadius: 'var(--radius-pill)'` and `fontWeight: 600` → `fontWeight: 700`.

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/Button.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify build and commit**

Run: `npm run build` → expected `Compiled successfully`.

```bash
git add src/components/ui/Button.js src/components/ui/__tests__/Button.test.js
git commit -m "feat(ui): Clay pill buttons with accent glow on primary"
```

---

### Task 5: Restyle Badge to Clay pills and add the solid overdue variant

**Files:**
- Modify: `src/components/ui/Badge.js`
- Test: `src/components/ui/__tests__/Badge.test.js` (create)

**Interfaces:**
- Consumes: `--overdue`, `--overdue-foreground`, `--radius-pill` from Task 2.
- Produces: `Badge` (default export), existing variants unchanged (`default|primary|success|warning|danger|info`) plus new `overdue` (solid clay bg, cream text — Clay spec: overdue is the only solid status pill). Existing call sites keep working; bill screens can adopt `variant="overdue"` during screen polish.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/Badge.test.js`:

```js
import React from 'react';
import { render, screen } from '@testing-library/react';
import Badge from '../Badge';

describe('Badge', () => {
  test('is a pill', () => {
    render(<Badge>Paid</Badge>);
    expect(screen.getByText('Paid')).toHaveStyle({ borderRadius: 'var(--radius-pill)' });
  });

  test('overdue variant is solid clay', () => {
    render(<Badge variant="overdue">Overdue</Badge>);
    const badge = screen.getByText('Overdue');
    expect(badge).toHaveStyle({ background: 'var(--overdue)' });
    expect(badge).toHaveStyle({ color: 'var(--overdue-foreground)' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/Badge.test.js`
Expected: FAIL — radius is `12px` and `overdue` is not a variant (falls through to undefined styles).

- [ ] **Step 3: Edit `src/components/ui/Badge.js`**

Add to the `variants` object (after `danger`):

```js
    overdue: {
      background: 'var(--overdue)',
      color: 'var(--overdue-foreground)'
    },
```

In `badgeStyle`, change `borderRadius: 12` → `borderRadius: 'var(--radius-pill)'` and `fontWeight: 500` → `fontWeight: 700`. In `sizes`, change `medium` padding `'4px 8px'` → `'4px 12px'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/Badge.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify build and commit**

Run: `npm run build` → expected `Compiled successfully`.

```bash
git add src/components/ui/Badge.js src/components/ui/__tests__/Badge.test.js
git commit -m "feat(ui): Clay pill badges + solid overdue variant"
```

---

### Task 6: Clay shape pass on form controls, Modal, ConfirmDialog, SummaryCard

**Files:**
- Modify: `src/components/ui/Input.js:18`
- Modify: `src/components/ui/Select.js:18`
- Modify: `src/components/ui/Textarea.js:18`
- Modify: `src/components/ui/Modal.js:30,37,48`
- Modify: `src/components/ui/ConfirmDialog.js:18,20,26,38,48`
- Modify: `src/components/ui/SummaryCard.js:6`

**Interfaces:**
- Consumes: `--radius-sm`, `--radius-lg`, `--radius-modal`, `--radius-pill`, `--shadow-lg` from Task 2.
- Produces: no API changes anywhere — pure style-value edits.

- [ ] **Step 1: Apply the radius/shadow edits**

Exact substitutions (all are single-value changes on the listed lines; line numbers are pre-edit):

| File:line | From | To |
|---|---|---|
| `Input.js:18` | `borderRadius: 8,` | `borderRadius: 'var(--radius-sm)',` |
| `Select.js:18` | `borderRadius: 8,` | `borderRadius: 'var(--radius-sm)',` |
| `Textarea.js:18` | `borderRadius: 8,` | `borderRadius: 'var(--radius-sm)',` |
| `Modal.js:30` | `borderRadius: 16,` | `borderRadius: 'var(--radius-modal)',` |
| `Modal.js:37` | `boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',` | `boxShadow: 'var(--shadow-lg)',` |
| `Modal.js:48` | `borderRadius: '16px 16px 0 0'` | `borderRadius: 'var(--radius-modal) var(--radius-modal) 0 0'` |
| `ConfirmDialog.js:18` | `borderRadius: '12px',` | `borderRadius: 'var(--radius-modal)',` |
| `ConfirmDialog.js:20` | `boxShadow: '0 20px 60px rgba(0,0,0,0.3)',` | `boxShadow: 'var(--shadow-lg)',` |
| `ConfirmDialog.js:26` | `borderRadius: '10px',` | `borderRadius: 'var(--radius-sm)',` |
| `ConfirmDialog.js:38` | `borderRadius: '8px',` | `borderRadius: 'var(--radius-pill)',` |
| `ConfirmDialog.js:48` | `borderRadius: '8px',` | `borderRadius: 'var(--radius-pill)',` |
| `SummaryCard.js:6` | `borderRadius: '12px',` | `borderRadius: 'var(--radius-lg)',` |

(Leave `SummaryCard.js:11`'s 40px icon tile at `'10px'` — small tiles keep a small radius; Clay's vendor tiles use 12px, close enough to revisit in screen polish.)

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 3: Visual smoke-check**

`npm start` → open a bill-create modal (Shop → Bills → create) and a confirm dialog; confirm 24px-radius modals with the large warm shadow, 12px inputs, pill dialog buttons, and that nothing overflows.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Input.js src/components/ui/Select.js src/components/ui/Textarea.js src/components/ui/Modal.js src/components/ui/ConfirmDialog.js src/components/ui/SummaryCard.js
git commit -m "feat(ui): Clay radii and overlay shadows for controls, modals, summary card"
```

---

### Task 7: Port the four new Clay components (Toggle, PillTabs, Avatar, Toast)

**Files:**
- Create: `src/components/ui/Toggle.js`
- Create: `src/components/ui/PillTabs.js`
- Create: `src/components/ui/Avatar.js`
- Create: `src/components/ui/Toast.js`
- Modify: `src/components/ui/index.js` (barrel)
- Modify: `.design-sync/config.json` (`componentSrcMap`)
- Test: `src/components/ui/__tests__/ClayComponents.test.js` (create)

**Interfaces:**
- Consumes: tokens from Task 2. Reference implementations: `/Users/gauravraj/Downloads/App design improvement clay/components/core/{Toggle,PillTabs,Avatar,Toast}.jsx` — but token names MUST be translated per the Global Constraints table, and exports are **default** exports to match the app's barrel convention.
- Produces:
  - `Toggle({ checked = false, onChange })` — calls `onChange(!checked)` on click.
  - `PillTabs({ items, value, onChange, size = 'md' })` — `items`: array of strings or `{value, label}`; calls `onChange(key)`.
  - `Avatar({ name, alert = false, round = false, size = 44 })` — two-letter initials tile.
  - `Toast({ children, fixed = true })` — ink pill, bottom-center when fixed.
  - All four exported from the `src/components/ui` barrel.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/ClayComponents.test.js`:

```js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle, PillTabs, Avatar, Toast } from '../index';

describe('Toggle', () => {
  test('calls onChange with the flipped value', () => {
    const onChange = jest.fn();
    render(<Toggle checked={false} onChange={onChange} data-testid="t" />);
    fireEvent.click(screen.getByTestId('t'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('PillTabs', () => {
  test('renders items and reports selection', () => {
    const onChange = jest.fn();
    render(<PillTabs items={['Bills', 'Products']} value="Bills" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Products' }));
    expect(onChange).toHaveBeenCalledWith('Products');
  });

  test('active tab is the ink pill', () => {
    render(<PillTabs items={['Bills', 'Products']} value="Bills" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Bills' }))
      .toHaveStyle({ background: 'var(--foreground)' });
  });
});

describe('Avatar', () => {
  test('derives two-letter initials', () => {
    render(<Avatar name="Sharma & Sons" />);
    expect(screen.getByText('SS')).toBeInTheDocument();
  });
});

describe('Toast', () => {
  test('renders an ink pill message', () => {
    render(<Toast>Bill marked as paid ✓</Toast>);
    expect(screen.getByText('Bill marked as paid ✓'))
      .toHaveStyle({ background: 'var(--foreground)' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/ClayComponents.test.js`
Expected: FAIL — `Toggle` etc. are not exported from the barrel.

- [ ] **Step 3: Create the four components**

`src/components/ui/Toggle.js`:

```js
import React from 'react';

const Toggle = ({ checked = false, onChange, ...props }) => (
  <span
    onClick={() => onChange && onChange(!checked)}
    {...props}
    style={{
      position: 'relative', display: 'inline-block',
      width: 48, height: 28, borderRadius: 'var(--radius-pill)', flexShrink: 0, cursor: 'pointer',
      background: checked ? 'var(--primary)' : 'var(--secondary)', transition: 'background .2s'
    }}
  >
    <span style={{
      position: 'absolute', top: 4, left: checked ? 24 : 4, width: 20, height: 20,
      borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.25)', transition: 'left .2s'
    }} />
  </span>
);

export default Toggle;
```

`src/components/ui/PillTabs.js`:

```js
import React from 'react';

const PillTabs = ({ items, value, onChange, size = 'md' }) => (
  <div style={{
    display: 'inline-flex', gap: 2, background: 'var(--secondary)',
    borderRadius: 'var(--radius-pill)', padding: 4, fontFamily: 'var(--font-sans)'
  }}>
    {items.map(item => {
      const key = typeof item === 'string' ? item : item.value;
      const label = typeof item === 'string' ? item : item.label;
      const active = key === value;
      return (
        <button
          key={key}
          onClick={() => onChange && onChange(key)}
          style={{
            fontFamily: 'var(--font-sans)', fontSize: size === 'sm' ? 13 : 14, fontWeight: active ? 700 : 600,
            padding: size === 'sm' ? '6px 14px' : '8px 18px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            borderRadius: 'var(--radius-pill)',
            background: active ? 'var(--foreground)' : 'transparent',
            color: active ? 'var(--background)' : 'var(--muted-foreground)'
          }}
        >
          {label}
        </button>
      );
    })}
  </div>
);

export default PillTabs;
```

`src/components/ui/Avatar.js`:

```js
import React from 'react';

const Avatar = ({ name, alert = false, round = false, size = 44 }) => {
  const initials = (name || '').split(/[\s&—]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <span style={{
      width: size, height: size, borderRadius: round ? '50%' : 'var(--radius-sm)', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: Math.round(size * 0.3),
      background: alert ? 'var(--primary)' : 'var(--primary-soft)',
      color: alert ? 'var(--primary-foreground)' : 'var(--primary-accent)'
    }}>
      {initials}
    </span>
  );
};

export default Avatar;
```

`src/components/ui/Toast.js`:

```js
import React from 'react';

const Toast = ({ children, fixed = true }) => (
  <div style={{
    position: fixed ? 'fixed' : 'static', bottom: 28, left: fixed ? '50%' : undefined,
    transform: fixed ? 'translateX(-50%)' : undefined, zIndex: 300,
    background: 'var(--foreground)', color: 'var(--background)', borderRadius: 'var(--radius-pill)',
    padding: '12px 24px', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700,
    boxShadow: 'var(--shadow-lg)', display: 'inline-block'
  }}>
    {children}
  </div>
);

export default Toast;
```

- [ ] **Step 4: Register in the barrel**

Append to `src/components/ui/index.js`:

```js
export { default as Toggle } from './Toggle';
export { default as PillTabs } from './PillTabs';
export { default as Avatar } from './Avatar';
export { default as Toast } from './Toast';
```

- [ ] **Step 5: Register in `.design-sync/config.json`**

Add to `componentSrcMap` (after the `"ConfirmDialog"` entry, keeping valid JSON):

```json
    "Toggle": "src/components/ui/Toggle.js",
    "PillTabs": "src/components/ui/PillTabs.js",
    "Avatar": "src/components/ui/Avatar.js",
    "Toast": "src/components/ui/Toast.js"
```

Also add a preview override for the fixed-position Toast (pattern from `.design-sync/NOTES.md`), in `overrides`:

```json
    "Toast": {
      "cardMode": "single",
      "viewport": "480x160"
    }
```

(`entry.js` needs no change — it re-exports the barrel.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/ClayComponents.test.js`
Expected: PASS (5 tests).

- [ ] **Step 7: Verify build and commit**

Run: `npm run build` → expected `Compiled successfully`.

```bash
git add src/components/ui/Toggle.js src/components/ui/PillTabs.js src/components/ui/Avatar.js src/components/ui/Toast.js src/components/ui/index.js src/components/ui/__tests__/ClayComponents.test.js .design-sync/config.json
git commit -m "feat(ui): add Clay Toggle, PillTabs, Avatar, Toast components"
```

---

### Task 8: Segmented pill navigation

**Files:**
- Modify: `src/components/shared/Navigation.css`

**Interfaces:**
- Consumes: `--radius-pill`, `--secondary`, `--foreground`, `--background`, `--radius-lg`, `--shadow-lg` from Task 2.
- Produces: no JS/API changes — `Navigation.js` class names are untouched; only the stylesheet changes. (This CSS file predates the inline-styles rule; restyling it in place is the minimal move — do NOT rewrite it to inline styles in this task.)

- [ ] **Step 1: Restyle the desktop nav to Clay's segmented pill bar**

In `src/components/shared/Navigation.css`, replace the blocks for `.desktop-nav`, `.nav-container`, `.nav-item`, `.nav-item:hover`, `.nav-item.active`, and `.nav-item.active::after` (lines 1–54) with:

```css
/* ===== Desktop Navigation — Clay segmented pill bar ===== */
.desktop-nav {
  background: transparent;
  display: block;
  padding: 12px 0 4px;
}

.nav-container {
  display: flex;
  align-items: center;
  gap: 2px;
  width: fit-content;
  margin: 0 auto;
  background: var(--secondary);
  border-radius: var(--radius-pill);
  padding: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  color: var(--muted-foreground);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: var(--radius-pill);
  transition: background 0.2s ease, color 0.2s ease;
  border: none;
  background: transparent;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
}

.nav-item:hover {
  color: var(--foreground);
}

.nav-item.active {
  color: var(--background);
  background: var(--foreground);
}
```

(The `::after` underline indicator is removed entirely — the ink pill IS the active indicator.)

- [ ] **Step 2: Warm up the dropdown and mobile sheet radii**

Still in `Navigation.css`:
- `.dropdown-menu`: `border-radius: 12px` → `border-radius: var(--radius-lg)`
- `.dropdown-item`: `border-radius: 8px` → `border-radius: var(--radius)`
- `.more-menu`: `border-radius: 16px` → `border-radius: var(--radius-lg)`
- `.more-menu-item`: `border-radius: 10px` → `border-radius: var(--radius)`

Leave the mobile bottom bar structure as-is (already token-driven; Clay has no mobile spec — the prototype is 1320px desktop).

- [ ] **Step 3: Verify build and visual check**

Run: `npm run build` → expected `Compiled successfully`.
`npm start` → confirm: desktop nav is a single cream pill track; active tab is a solid ink pill with cream text; Shop dropdown still opens/closes and highlights; mobile (narrow window) bottom nav still works; dark mode shows a cocoa pill track with light ink pill.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/Navigation.css
git commit -m "feat(nav): Clay segmented pill bar with ink active tab"
```

---

### Task 9: Clay wordmark in the Header

**Files:**
- Modify: `src/components/shared/Header.js:56-61`
- Modify: `src/components/shared/Header.css`

**Interfaces:**
- Consumes: `--font-display`, `--primary-accent` from Task 2.
- Produces: header brand renders the Clay wordmark — lowercase `dukaan` in Bricolage Grotesque 800 with a clay asterisk (`dukaan*`). Per the Clay readme: the wordmark is plain type; do NOT invent a logo mark. Dark-mode toggle and profile menu are untouched.

- [ ] **Step 1: Replace the brand block in `Header.js`**

Replace:

```jsx
        <div className="header-brand">
          <div className="brand-logo">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="app-title">Personal Dashboard</h1>
        </div>
```

with:

```jsx
        <div className="header-brand">
          <h1 className="app-title">dukaan<span className="brand-asterisk">*</span></h1>
        </div>
```

Then remove `LayoutDashboard` from the lucide-react import on line 2 (grep the file for other uses first; there are none as of this writing).

- [ ] **Step 2: Add wordmark styles in `Header.css`**

Find the existing `.app-title` rule and replace it with (and delete any `.brand-logo` rule):

```css
.app-title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
  color: var(--foreground);
  margin: 0;
}

.brand-asterisk {
  color: var(--primary-accent);
}
```

- [ ] **Step 3: Verify build and visual check**

Run: `npm run build` → expected `Compiled successfully` (an unused-import warning for `LayoutDashboard` means Step 1's import cleanup was missed — fix it).
`npm start` → header shows `dukaan*` with the clay asterisk in both themes.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/Header.js src/components/shared/Header.css
git commit -m "feat(header): Clay dukaan* wordmark"
```

---

### Task 10: Final verification and docs sync

**Files:**
- Modify: `CLAUDE.md` (conventions + gotchas reflecting Clay)
- Test: full targeted-suite re-run + visual pass

**Interfaces:**
- Consumes: everything above.
- Produces: a verified, documented Clay baseline on the `clay-design` branch, ready for the screen-polish follow-up plan.

- [ ] **Step 1: Run all task test files together**

Run: `CI=true npx react-scripts test --watchAll=false src/components/ui/__tests__/Card.test.js src/components/ui/__tests__/Button.test.js src/components/ui/__tests__/Badge.test.js src/components/ui/__tests__/ClayComponents.test.js`
Expected: PASS (11 tests). (Do NOT gate on the full suite — known ~191-failure baseline predates this work.)

- [ ] **Step 2: Full visual pass against the prototype**

`npm start`, side-by-side with `/Users/gauravraj/Downloads/App design improvement clay/Clay Prototype v2.dc.html`. Walk Home → Tasks → Office → Shop (Overview, Bills, Products, Price List, Vendors, Transactions) → Settings, in light AND dark mode (full page reload after toggling, not HMR). Checklist:
- Cream/cocoa surfaces everywhere; no leftover indigo or cool grays (screens with hardcoded colors, if any surface, get logged for the screen-polish plan — not fixed here).
- Cards: white/cocoa, 20px radius, 1px warm hairline, no shadows.
- Buttons/badges/nav/tabs: pills; primary button has the clay glow.
- Headings render in Bricolage Grotesque (check network tab loaded both font families).
- Modals: 24px radius, large warm shadow.

- [ ] **Step 3: Update `CLAUDE.md`**

In `## Coding Rules`, update the theme-token bullet's examples if they mention indigo, and add one bullet:

```
- Clay shadow policy: no shadows on cards; `var(--shadow-accent)` only on primary buttons, `var(--shadow-lg)` only on overlays/modals. Everything interactive is a pill (`var(--radius-pill)`)
```

In `## Instructions`, add:

```
- Design language is "Dukaan Clay" — source package at `~/Downloads/App design improvement clay/` (readme.md = rules, Clay Prototype v2.dc.html = visual ground truth)
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record Clay design system conventions"
```

- [ ] **Step 5: Hand off**

Use superpowers:finishing-a-development-branch to decide merge/PR. Follow-up plan to write next: **screen-level Clay polish** (Dashboard/HomeView layout per prototype, chunky CSS bar charts replacing any ad-hoc viz, Avatar adoption in VendorsView, Badge `overdue` adoption in BillsView, PillTabs adoption for in-page filters, copy/voice pass).
