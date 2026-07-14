# Todo Shop UI — conventions for building with these components

## Setup

No provider or wrapper is required — every component renders standalone. Import everything from the bundle root (`window.TodoShopUI` exports: Badge, Button, Card, ConfirmDialog, Input, LoadingSpinner, Modal, Select, SortableHeader, StatCard, StatGrid, StatItem, SummaryCard, Textarea). Dark mode works by adding the `dark` class to `<body>` — the CSS custom properties flip automatically; never write per-component dark styles.

## Styling idiom: inline styles + theme tokens

This system uses **inline styles as JS objects** — no CSS classes, no utility framework, no styled-components. All colors, radii, and shadows come from CSS custom properties defined in the stylesheet. Always use tokens, never hardcoded hex:

- Surfaces/text: `var(--background)`, `var(--card)`, `var(--foreground)`, `var(--foreground-body)`, `var(--muted-foreground)`, `var(--card-foreground)`
- Brand (clay orange): `var(--primary)`, `var(--primary-hover)`, `var(--primary-foreground)`, `var(--primary-soft)`, `var(--primary-accent)`
- Neutrals: `var(--secondary)`, `var(--muted)`, `var(--border)`, `var(--border-subtle)`, `var(--input)`, `var(--ring)`
- Status (status ONLY, never decoration): `var(--success)` / `var(--success-soft)`, `var(--warning)` / `var(--warning-soft)`, `var(--danger)` / `var(--danger-soft)`, `var(--overdue)` / `var(--overdue-foreground)`
- Shape/depth: `var(--radius-sm)` 12px, `var(--radius)` 14px, `var(--radius-lg)` 20px, `var(--radius-pill)` 999px, `var(--radius-modal)` 24px; `var(--shadow-sm)`, `var(--shadow)`, `var(--shadow-lg)`, `var(--shadow-accent)` (clay glow on primary button only)
- Font: `var(--font-sans)` — Hanken Grotesk (400/600/700), `var(--font-display)` — Bricolage Grotesque (headings), loaded by the stylesheet

Tinting: hex-alpha appends (`` `${color}20` ``) break with `var()` — use `color-mix(in srgb, ${color} 12%, transparent)` instead (LoadingSpinner does this).

Icons come from `lucide-react` (the app's icon library) — pass them as elements (`icon={<Plus size={16} />}` for Button/Badge) or as component references (`icon={IndianRupee}` for SummaryCard, which renders `<Icon size={20} />` itself).

## Component gotchas

- **Never pass a `style` prop to `Card` or `StatCard`** — Card spreads `{...props}` after its own `style`, so any `style` prop *replaces all card styling* (background, border, radius). Size cards with a wrapper div instead: `<div style={{ maxWidth: 360 }}><Card>…</Card></div>`.
- `Modal` / `ConfirmDialog` render `position: fixed` full-screen overlays; render them at the page root with `isOpen`.
- `SortableHeader` is a `<th>` — it must live inside `<table><thead><tr>`. Props: `field`, `label`, `sortField`, `sortDirection` (`'asc'|'desc'`), `handleSort`.
- `SummaryCard` with the `amount` prop formats Indian rupees (₹ with Indian digit grouping) automatically; use `value` for pre-formatted strings.
- `StatItem`/`StatGrid` compose inside `StatCard` for dashboard stat blocks.

## Where the truth lives

Read `styles.css` (imports `_ds_bundle.css`, which carries every token above plus the `.dark` overrides and the font import) before inventing styling. Each component's `.d.ts` is its exact prop contract; its `.prompt.md` shows composed usage.

## Idiomatic example

```jsx
import { SummaryCard, Button, Badge } from 'my-app';
import { TrendingUp, Plus } from 'lucide-react';

const Dashboard = () => (
  <div style={{ background: 'var(--background)', padding: 24, fontFamily: 'var(--font-sans)' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      <SummaryCard label="Paid This Month" amount={128400} subtitle="38 bills settled"
        icon={TrendingUp} color="var(--success)" bgColor="var(--success-soft)" />
    </div>
    <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
      <Button icon={<Plus size={16} />}>Add Bill</Button>
      <Badge variant="warning">Due Soon</Badge>
    </div>
  </div>
);
```
