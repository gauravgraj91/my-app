# design-sync notes — my-app (Todo Shop UI)

- **Entry**: pass `--entry ./.design-sync/entry.js` to the converter/driver. The repo is a CRA *app* (no dist, no .d.ts); the custom entry re-exports the `src/components/ui/index.js` barrel plus ConfirmDialog (not in the barrel) and imports `.design-sync/ds.css` so theme tokens + the Google-Fonts import land in `_ds_bundle.css` via esbuild.
- **bundle.mjs fork** (`.design-sync/overrides/bundle.mjs`): CRA keeps JSX in `.js` files — the fork adds `loader: {'.js': 'jsx'}` + `jsx: 'automatic'` to sharedBuildOptions. On re-sync, diff against the staged `lib/bundle.mjs` and re-apply those two edits if upstream changed.
- **Component discovery**: no .d.ts tree exists, so every component is pinned in `cfg.componentSrcMap`. New UI components must be added there AND to `.design-sync/entry.js` (if not in the app barrel).
- **Overlay previews** (Modal, ConfirmDialog): fixed-position overlays escape the card scaffold (transformed ancestor breaks `position: fixed` centering). Pattern that works: wrap the preview in `<div style={{position:'relative', width:W, height:H, transform:'translateZ(0)', overflow:'hidden'}}>` plus `cfg.overrides.<Name> = {cardMode:'single', viewport:'WxH'}`.
- **App-source bug found (worth fixing in the app)**: `Card` spreads `{...props}` after `style={cardStyle}`, so any `style` prop replaces ALL card styling. `StatCard` always passes `style` (default `{}`) to Card, so StatCard renders with no card chrome in the real app too. Previews render the shipped behavior faithfully; conventions header warns the design agent never to pass `style` to Card/StatCard.
- **guidelinesGlob is `[]`** deliberately — `docs/` holds app planning docs, not design guidelines.
- **Previews import `lucide-react`** (the app's icon lib) — resolves from the repo's node_modules at preview compile.
- **Known render warns**: none. (Earlier `[GRID_OVERFLOW]` on Card/Input/SortableHeader/Textarea resolved via `cardMode: 'column'` overrides; `[FONT_REMOTE]` for Hanken Grotesk is expected — Google Fonts at runtime.)

## Re-sync risks

- `.design-sync/ds.css` duplicates the Google Fonts URL from `public/index.html` — update both if the brand font changes.
- `componentSrcMap` + `entry.js` are a hand-maintained component list — a new component in `src/components/ui/` is silently absent until added to both.
- The bundle.mjs fork can drift from upstream lib/bundle.mjs across skill versions.
- Theme tokens are read live from `src/styles/theme.css` at build — token renames flow through automatically, but the conventions header enumerates them and must be re-validated after theme changes.
