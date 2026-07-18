# Transaction Categories in Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Transaction Categories" card to Settings that adds/removes personal transaction categories stored in the `personalCategories` localStorage key.

**Architecture:** Replicate the existing shop-categories pattern inline in `src/components/settings/Settings.js` (state + localStorage-sync effect + card JSX reusing the same CSS classes). No new components, no Firestore.

**Tech Stack:** React (no TS), inline styles + existing Settings CSS classes, localStorage.

## Global Constraints

- Theme tokens only, no hardcoded hex; no card shadows; interactive elements are pills (existing classes already comply).
- Category names stored lowercase (matches `PersonalTracker.js` normalization: `(name || '').trim().toLowerCase()`).
- `other` must never be removable (hardcoded fallback `tx.category || 'other'` in PersonalTracker).
- Unit tests for Settings are blocked by the known Firebase-in-tests baseline (~191 failures); verification is `npm run build` + driving the app.

---

### Task 1: Transaction Categories card in Settings

**Files:**
- Modify: `src/components/settings/Settings.js` (state near line 96-124; JSX after the Categories card ending line 336)

**Interfaces:**
- Consumes: `personalCategories` localStorage key; default list `['food','travel','shopping','bills','health','entertainment','other']` (mirrors `DEFAULT_CATEGORIES` in `src/components/personal/PersonalTracker.js:27`).
- Produces: nothing consumed by other tasks (single-task plan).

- [ ] **Step 1: Add state + handlers**

After the shop `handleRemoveCategory` (line ~124) add:

```jsx
  // Personal Transaction Categories State
  const defaultTxCategories = ['food', 'travel', 'shopping', 'bills', 'health', 'entertainment', 'other'];

  const [txCategories, setTxCategories] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('personalCategories'));
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch (e) { /* fall through to defaults */ }
    return defaultTxCategories;
  });
  const [newTxCategory, setNewTxCategory] = useState('');

  useEffect(() => {
    localStorage.setItem('personalCategories', JSON.stringify(txCategories));
  }, [txCategories]);

  const handleAddTxCategory = () => {
    const name = newTxCategory.trim().toLowerCase();
    if (!name || txCategories.includes(name)) return;
    setTxCategories([...txCategories, name]);
    setNewTxCategory('');
  };
  const handleRemoveTxCategory = (name) => {
    if (name === 'other') return;
    setTxCategories(txCategories.filter(c => c !== name));
  };
```

Note: the load logic must be the try/catch + non-empty-array check above (same as `loadCategories` in PersonalTracker.js:79-85), NOT the bare `JSON.parse` the shop section uses — `personalCategories` may contain invalid data from older versions.

- [ ] **Step 2: Add the card JSX**

Directly after the shop Categories card's closing `</div>` (line ~336, still inside the same grid container) add:

```jsx
          {/* Transaction Categories Card */}
          <div className="settings-card" style={{ padding: '24px' }}>
            <h4 className="subsection-title">Transaction Categories</h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 12px' }}>
              Used for personal transactions. Removing one keeps it on existing entries.
            </p>
            <div className="tags-container">
              {txCategories.map(category => (
                <span key={category} className="tag-item">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                  {category !== 'other' && (
                    <button
                      className="tag-remove"
                      onClick={() => handleRemoveTxCategory(category)}
                      title="Remove category"
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
            </div>

            <div className="add-item-row">
              <input
                type="text"
                value={newTxCategory}
                onChange={e => setNewTxCategory(e.target.value)}
                placeholder="Add category..."
                className="setting-select"
                style={{ flex: 1, minWidth: 0 }}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTxCategory(); }}
              />
              <button
                className="dashboard-btn-secondary"
                onClick={handleAddTxCategory}
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              >
                Add
              </button>
            </div>
          </div>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: "Compiled with warnings." — only the pre-existing warnings (BillsView `handleEditBill`, ProductModal hook deps). Any NEW warning or error = fix before proceeding.

- [ ] **Step 4: Drive the app**

Run `BROWSER=none npm start`, then in the app (user signed in):
1. Settings → new "Transaction Categories" card shows current categories capitalized; `other` has no ×.
2. Add "gifts" → chip appears; reload page → still there (localStorage persisted).
3. Transactions → Personal → add/edit modal category dropdown includes Gifts.
4. Back in Settings remove "gifts" → Transactions dropdown no longer offers it; existing entries keep their labels.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/Settings.js
git commit -m "feat(settings): manage personal transaction categories

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
