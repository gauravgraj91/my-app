# Header Profile Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the header's raw email + logout button with a profile pill (avatar initial, first name, chevron) that opens a dropdown containing identity (avatar/name/email), Settings, a dark-mode toggle row, and a red Log out — and remove the Settings tab from the desktop top nav since Settings now lives in the profile menu.

**Architecture:** All profile-menu logic stays inside the existing `Header.js` component (state, click-outside ref, reuse of the existing `toggleDarkMode`). Styling goes in `Header.css` following the file's existing class-based pattern. `Navigation.js` only loses its desktop Settings `<Link>`.

**Tech Stack:** React (CRA, no TS), lucide-react icons, CSS custom properties from `src/styles/theme.css`, Jest + React Testing Library.

## Global Constraints

- Colors/shadows: theme tokens only (`var(--primary)`, `var(--primary-soft)`, `var(--primary-accent)`, `var(--danger)`, `var(--shadow-lg)`, `var(--radius)`, …) — never hardcoded hex.
- Dark mode works by `.dark` on `<body>` flipping tokens — never per-component `.dark` overrides.
- Existing shared components (`Header`, `Navigation`) use their own CSS files — extend those, no CSS modules/styled-components/MUI.
- The standalone moon button in the header STAYS (the mockup shows it alongside the profile pill); the menu's Dark-mode row toggles the same state.
- Mobile bottom nav keeps its Settings item — the request covers the header/top-nav; the mockup only shows desktop. (Easy follow-up to remove if wanted.)
- `npm test` has a known pre-existing failure baseline; gate is `npm run build` + the new Header test file passing.

---

### Task 1: Profile menu in Header (TDD)

**Files:**
- Test: `src/components/shared/__tests__/Header.test.js` (create)
- Modify: `src/components/shared/Header.js` (full rewrite of returned JSX for controls; keep brand + dark-mode logic)
- Modify: `src/components/shared/Header.css` (append profile classes)

**Interfaces:**
- Consumes: `useAuth()` → `user.displayName` (may be null) and `user.email`; `logout()` from `../../firebase/authService`; `useNavigate()`.
- Produces: no exports consumed elsewhere; `Header` remains the default export with no props.

- [ ] **Step 1: Write the failing test**

Create `src/components/shared/__tests__/Header.test.js`:

```javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

const mockLogout = jest.fn(() => Promise.resolve());
jest.mock('../../../firebase/authService', () => ({
  logout: (...args) => mockLogout(...args)
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'Gaurav Raj', email: 'gaurav@gmail.com' }
  })
}));

describe('Header profile menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    document.body.className = '';
  });

  it('shows a profile pill with first name and no raw email in the bar', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: /Gaurav/ })).toBeInTheDocument();
    expect(screen.queryByText('gaurav@gmail.com')).not.toBeInTheDocument();
  });

  it('opens the menu with identity, Settings, Dark mode and Log out', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /Gaurav/ }));
    expect(screen.getByText('gaurav@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('navigates to /settings and closes the menu', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /Gaurav/ }));
    fireEvent.click(screen.getByText('Settings'));
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
    expect(screen.queryByText('Log out')).not.toBeInTheDocument();
  });

  it('toggles dark mode from the menu row', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /Gaurav/ }));
    fireEvent.click(screen.getByText('Dark mode'));
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('logs out and navigates to /login', async () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /Gaurav/ }));
    fireEvent.click(screen.getByText('Log out'));
    expect(mockLogout).toHaveBeenCalled();
    await screen.findByRole('button', { name: /Gaurav/ });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npm test -- --watchAll=false src/components/shared/__tests__/Header.test.js`
Expected: FAIL — no button named /Gaurav/ (current header renders email text + Logout button).

- [ ] **Step 3: Rewrite Header.js**

Replace `src/components/shared/Header.js` with:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, LayoutDashboard, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../firebase/authService';
import './Header.css';

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const firstName = (user?.displayName || user?.email || '').split(/[\s@]/)[0];
  const initial = firstName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await logout();
    } catch (err) {
      // Navigate to login even if sign-out fails
    }
    navigate('/login');
  };

  useEffect(() => {
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    document.body.classList.toggle('dark', savedDarkMode);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    document.body.classList.toggle('dark', newDarkMode);
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-brand">
          <div className="brand-logo">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="app-title">Personal Dashboard</h1>
        </div>
        <div className="header-controls">
          <button
            className="header-btn dark-mode-toggle"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {user && (
            <div className="profile-menu-container" ref={menuRef}>
              <button
                className="profile-pill"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="profile-avatar">{initial}</span>
                <span className="profile-name">{firstName}</span>
                <ChevronDown size={16} className={`profile-chevron ${menuOpen ? 'open' : ''}`} />
              </button>
              {menuOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-menu-identity">
                    <span className="profile-avatar profile-avatar-lg">{initial}</span>
                    <div>
                      <div className="profile-menu-name">{user.displayName || firstName}</div>
                      <div className="profile-menu-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="profile-menu-section">
                    <button
                      className="profile-menu-item"
                      role="menuitem"
                      onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    <button className="profile-menu-item" role="menuitem" onClick={toggleDarkMode}>
                      <Moon size={16} />
                      <span>Dark mode</span>
                      <span className={`menu-switch ${darkMode ? 'on' : ''}`}>
                        <span className="menu-switch-knob" />
                      </span>
                    </button>
                  </div>
                  <div className="profile-menu-section">
                    <button className="profile-menu-item profile-menu-danger" role="menuitem" onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
```

- [ ] **Step 4: Append profile styles to Header.css**

Append to `src/components/shared/Header.css` (before the existing `@media` block):

```css
/* ===== Profile Menu ===== */
.profile-menu-container {
  position: relative;
}

.profile-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  background: var(--secondary);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  color: var(--foreground);
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.profile-pill:hover {
  background: var(--border);
}

.profile-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
}

.profile-avatar-lg {
  width: 40px;
  height: 40px;
  font-size: 1rem;
}

.profile-chevron {
  color: var(--muted-foreground);
  transition: transform 0.2s ease;
}

.profile-chevron.open {
  transform: rotate(180deg);
}

.profile-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 260px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  overflow: hidden;
}

.profile-menu-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}

.profile-menu-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--foreground);
}

.profile-menu-email {
  font-size: 0.8rem;
  color: var(--muted-foreground);
}

.profile-menu-section {
  border-top: 1px solid var(--border);
  padding: 6px;
}

.profile-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--foreground);
  cursor: pointer;
  transition: background 0.15s ease;
  text-align: left;
}

.profile-menu-item:hover {
  background: var(--secondary);
}

.profile-menu-item svg {
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.profile-menu-danger,
.profile-menu-danger svg {
  color: var(--danger);
}

.profile-menu-danger:hover {
  background: var(--danger-soft);
}

.menu-switch {
  margin-left: auto;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: var(--border);
  position: relative;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.menu-switch.on {
  background: var(--primary);
}

.menu-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-foreground);
  transition: transform 0.2s ease;
}

.menu-switch.on .menu-switch-knob {
  transform: translateX(16px);
}
```

Also add inside the existing `@media (max-width: 600px)` block:

```css
  .profile-name {
    display: none;
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `CI=true npm test -- --watchAll=false src/components/shared/__tests__/Header.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: `Compiled with warnings.` — only the pre-existing `BillsView.js`/`ProductModal.js` warnings.

- [ ] **Step 7: Commit**

```bash
git add src/components/shared/Header.js src/components/shared/Header.css src/components/shared/__tests__/Header.test.js
git commit -m "feat(header): profile menu with identity, settings, dark-mode toggle and logout"
```

---

### Task 2: Remove Settings tab from desktop nav

**Files:**
- Modify: `src/components/shared/Navigation.js:122-128`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: nothing. The `Settings` lucide import STAYS (mobile bottom nav still uses it).

- [ ] **Step 1: Delete the desktop Settings link**

In `src/components/shared/Navigation.js`, delete this block from `DesktopNav` (after the Shop dropdown):

```jsx
        <Link
          to="/settings"
          className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </Link>
```

Leave the mobile bottom-nav Settings link and the `Settings` import untouched.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `Compiled with warnings.` — pre-existing warnings only, no new `no-unused-vars` for `Settings` (still used by MobileNav).

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/Navigation.js
git commit -m "feat(nav): remove desktop Settings tab, now in header profile menu"
```

---

### Task 3: Visual verification (light + dark)

**Files:** none (verification only; fix defects if found).

- [ ] **Step 1:** `npm start`, log in, full page reload.
- [ ] **Step 2: Light mode** — pill shows avatar initial + first name + chevron (no raw email in bar); menu matches mockup: identity block, divider, Settings, Dark-mode row with switch, divider, red Log out; desktop nav has no Settings tab; moon button still present.
- [ ] **Step 3:** Toggling Dark mode from the menu row flips the theme AND the header moon/sun icon; the switch turns indigo; menu surfaces flip via tokens.
- [ ] **Step 4:** Click outside closes the menu; Settings navigates to /settings; Log out returns to /login.
- [ ] **Step 5: Mobile width (<768px)** — pill collapses to avatar + chevron; bottom nav still has Settings.
- [ ] **Step 6:** `npm run build` → compiles.
