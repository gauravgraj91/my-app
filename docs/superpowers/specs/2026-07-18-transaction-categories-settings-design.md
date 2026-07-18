# Transaction Categories in Settings — Design

Date: 2026-07-18
Status: Approved

## Problem

Personal transaction categories (`personalCategories` in localStorage; defaults food, travel, shopping, bills, health, entertainment, other) can only be added — via a `window.prompt` inside the transaction modal in `src/components/personal/PersonalTracker.js` — and can never be removed. Shop product categories already have an add/remove section in Settings; personal categories have no management UI.

## Scope

Personal transaction categories only. The existing shop categories section stays untouched.

## Design

A "Transaction Categories" card in `src/components/settings/Settings.js`, placed directly after the existing shop categories section, replicating its pattern inline (no new shared component; not worth extraction yet).

- State initialized from the `personalCategories` localStorage key using the same load logic as `PersonalTracker.js` (`loadCategories`: parse, require non-empty array, else defaults). Persisted back with a `useEffect`, matching the shop section.
- Chip list of categories, displayed capitalized but stored lowercase. Each chip has an × remove button.
- Add: text input + button. Names trimmed and lowercased before saving; empty or duplicate names ignored — the same normalization the tracker's add-category prompt applies.
- `other` cannot be removed: it is the hardcoded fallback (`tx.category || 'other'`) in the tracker's filters and grouping.
- Visuals match the shop categories section: pills, theme tokens, no card shadows.

## Behavior on removal

Removal only stops offering the category for new transactions. Existing transactions keep their stored label and still display and filter correctly. A budget saved for a removed category simply stops being displayed. No data migration; no Firestore writes — localStorage only.

## Sync

`PersonalTracker` reads `personalCategories` on mount. Navigating between Settings and Transactions remounts it, so no additional wiring is needed.

## Testing / verification

The Settings component test suite is blocked by the known Firebase-in-tests baseline, so verification is `npm run build` plus driving the app: add a category in Settings → appears in the transaction modal's dropdown; remove one → gone from the dropdown; `other` shows no remove control; values persist across reload.
