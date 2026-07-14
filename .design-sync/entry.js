// design-sync bundle entry: barrel exports + ConfirmDialog (not in the app barrel)
// plus the theme tokens & brand font so they land in _ds_bundle.css.
import './ds.css';
export * from '../src/components/ui/index';
export { default as ConfirmDialog } from '../src/components/ui/ConfirmDialog';
