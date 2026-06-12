# Frontend Context — Medical Diary

> **Purpose:** This document gives an AI assistant full context about the current frontend structure, design system, CSS tokens, shared components, and pages — before suggesting any UI refactoring.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 (Vite, TypeScript) |
| Routing | React Router DOM v6 |
| Styling | **Tailwind CSS v3** (utility-first, no CSS Modules) |
| State Management | Zustand v5 |
| Icons | Lucide React |
| Charts | Recharts |
| HTTP | Axios |
| Date Utilities | date-fns |
| QR Generation | qrcode |
| Class merging | `clsx` + `tailwind-merge` (via `cn()` util) |

Entry point: `frontend/src/main.tsx` → `App.tsx` → `providers.tsx` → `AppRouter`.

---

## 2. CSS & Styling Architecture

### 2.1 Global CSS (`src/styles/globals.css`)
Minimal reset-style globals. No component-level CSS files exist.

```css
:root {
  color: #0f172a;            /* --secondary */
  background: #f8fafc;       /* --background */
  font-family: Inter, Roboto, system-ui, sans-serif;
  font-size: 16px;
}
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: #f8fafc; }
/* form elements inherit font */
/* Recharts font override */
```

`src/styles/tailwind.css` — only 3 lines (`@tailwind base/components/utilities`).

**No dark mode** is currently configured. Theme is light-only.

### 2.2 Tailwind Config (`tailwind.config.js`)

All design tokens live here as **custom color aliases**:

#### Color Palette

| Token | Hex | Role |
|---|---|---|
| `primary` | `#0284C7` | Sky-600. Patient/user accent |
| `primaryDark` | `#0369A1` | Hover state of primary |
| `secondary` | `#0F172A` | Slate-900. Body text, headings |
| `accent` | `#0D9488` | Teal-600. Doctor role accent |
| `background` | `#F8FAFC` | Page background |
| `card` | `#FFFFFF` | Card / topbar / modal surfaces |
| `muted` | `#F1F5F9` | Muted surface (tab hover, input bg alt) |
| `mutedForeground` | `#64748B` | Slate-500. Secondary text |
| `border` | `#E2E8F0` | Slate-200. Dividers |
| `inputBackground` | `#FFFFFF` | Input bg |
| `ring` | `#0284C7` | Focus ring |
| `emergency` | `#DC2626` | Red-600. Errors, danger actions |
| `success` | `#16A34A` | Green-600 |
| `pending` | `#EA580C` | Orange-600 |
| `warning` | `#F59E0B` | Amber-500 |
| `infoBg` | `#EFF6FF` | Blue-50 background |
| `successBg` | `#DCFCE7` | Green-100 background |
| `dangerBg` | `#FEF2F2` | Red-50 background |
| `warningBg` | `#FEF3C7` | Amber-100 background |

#### Admin Color Sub-theme

| Token | Hex |
|---|---|
| `adminPrimary` | `#0077B6` |
| `adminSecondary` | `#005F8C` |
| `adminAccent` | `#004E73` |
| `adminBackground` | `#E0F2FE` |
| `adminMuted` | `#BAE6FD` |

#### Chart Colors

| Token | Hex | Used for |
|---|---|---|
| `chartHeart` | `#DC2626` | Heart rate lines |
| `chartBloodPressure` | `#0284C7` | Blood pressure |
| `chartSteps` | `#0D9488` | Step count |
| `chartRespiratory` | `#7C3AED` | Respiratory rate |
| `chartWarning` | `#F59E0B` | Warnings on charts |

#### Other Tokens

```js
borderRadius: { card: "8px", input: "6px" }
fontFamily: { sans: ["Inter", "Roboto", "system-ui", "sans-serif"] }
boxShadow: { card: "0 1px 2px rgba(15, 23, 42, 0.06)" }
```

#### Role-Based Theming Pattern
The app supports 3 role themes: **patient** (primary/blue), **doctor** (accent/teal), **admin** (adminPrimary/dark-blue). The active role is set via `uiStore.setRoleTheme()` inside `AppShell`. Components like `Sidebar` and `Topbar` read the role prop and `cn()` conditionally apply admin/doctor color overrides.

---

## 3. Directory Structure

```
frontend/src/
├── api/            # Typed API client modules (axios)
├── app/
│   ├── App.tsx
│   ├── providers.tsx   # BrowserRouter + QueryClient wrapper
│   └── router.tsx      # All route declarations
├── components/     # Shared UI components (flat, no subdirs)
├── config/         # Supabase client config
├── constants/
│   ├── routes.ts   # ROUTES map + navLinks per role
│   └── roles.ts    # roleLabels map
├── hooks/          # Custom React hooks
├── mappers/        # API response → domain type mappers
├── pages/
│   ├── Dashboard/
│   ├── Diary/
│   ├── HealthMetrics/
│   ├── Login/
│   └── Profile/
├── realtime/       # Supabase realtime subscriptions
├── store/          # Zustand stores
├── styles/
│   ├── globals.css
│   └── tailwind.css
├── types/          # TypeScript type declarations
└── utils/          # cn(), date, format, validation helpers
```

---

## 4. Layout Architecture

### `AppShell` (wraps all authenticated pages)

```
┌──────────────────────────────────────────┐
│  Sidebar (w-64, hidden on mobile)        │
│  ┌──────────────────────────────────────┐│
│  │ Logo + App name + Role label         ││
│  │ NavLinks (role-specific)             ││
│  │ User avatar card + Logout button     ││
│  └──────────────────────────────────────┘│
│                                          │
│  Main content area (flex-1)              │
│  ┌──────────────────────────────────────┐│
│  │ Topbar (h-14, sticky)               ││
│  │  ├─ Hamburger (mobile only)         ││
│  │  ├─ Page title + description        ││
│  │  ├─ QR quick-access (patient only)  ││
│  │  ├─ Notification bell + dropdown    ││
│  │  └─ User name Badge                 ││
│  ├──────────────────────────────────────┤│
│  │ <main> px-4 py-4 lg:p-6            ││
│  │   {page content}                    ││
│  └──────────────────────────────────────┘│
│                                          │
│  Toast (fixed bottom-right, z-50)        │
└──────────────────────────────────────────┘
```

- **Sidebar** is `w-64`, `bg-secondary` (dark navy), white text.  
- **Topbar** is `h-14`, `bg-card` (white), `border-b border-border`.  
- **Mobile**: Sidebar is hidden (`lg:hidden`); hamburger opens an overlay drawer.

---

## 5. Shared Components (`src/components/`)

### `Button`
**Variants:** `primary | secondary | outline | ghost | danger | success`  
**Sizes:** `sm (h-8) | md (h-10) | lg (h-11) | icon (h-10 w-10)`  
Base classes: `inline-flex rounded-input font-medium transition-colors focus-visible:ring-2 disabled:opacity-60`

### `Card`
**Padding:** `none | sm (p-3) | md (p-4) | lg (p-6)`  
**Tones:** `default | info | success | danger | warning | admin`  
Base: `rounded-card border shadow-card`  
Interactive variant: `hover:-translate-y-0.5 hover:shadow-md`

### `Badge`
**Tones:** `success | pending | emergency | info | muted | admin`  
Shape: `rounded-full px-2 py-0.5 text-[11px] font-semibold`

### `Modal`
Full-screen overlay (`bg-slate-950/45`). Max width `max-w-lg`, `rounded-card`.  
Sections: header (title + close X), optional body (`p-5`), footer (Cancel + Confirm buttons).  
Confirm variant: `primary | danger | success`.

### `FormInput`
Wraps `<label>` + `<input>`. Optional left icon. Error state: red border + ring.  
Input: `h-10 rounded-input border border-border bg-inputBackground focus:ring-2 focus:ring-primary/20`

### `FormSelect`
Custom dropdown (not native `<select>`). Keyboard close on outside click.  
Trigger matches `FormInput` styles. Dropdown: `rounded-input border border-border bg-card shadow-lg`.  
Selected item highlighted with `bg-primary/10 text-primary`.

### `StatCard`
Uses `Card` internally. Shows: label (xs muted), value (xl semibold), optional unit, trend icon (`ArrowUpRight | ArrowDownRight | ArrowRight`).  
**Tones:** `primary | accent | danger | success | warning | admin` — applied to icon background.

### `Topbar`
- Displays `<h1>` (page title) and optional description.
- QR button (patient role only) → opens an inline popover with `QRPreview` + navigation between multiple tokens.
- Notification Bell → inline `<ul>` dropdown, max-h-64 scrollable.
- User name `Badge` (hidden on mobile).

### `Sidebar`
- Dark navy (`bg-secondary`), white text. Width `w-64`.
- Logo block: Heart icon (colored by role theme), app name, role label.
- Nav: `NavLink` with active state colored by role theme.
- Dynamic badges: shows pending consent request count on `/dong-y` link; pending doctor approvals on admin approval link.
- Bottom: user avatar card (initials) + ghost logout button.

### `EmptyState`
Simple centered text block for empty lists.

### `DataTable`
Generic table wrapper (basic `<table>`).

### `QRPreview`
Renders a QR code image using the `qrcode` library. Accepts `token` (string) + `size` (number).

---

## 6. Pages

### Auth Pages (`pages/Login/`)

| File | Route | Description |
|---|---|---|
| `LoginPage.tsx` | `/dang-nhap` | Split layout (hero left, form right on desktop). Role tab switcher (Patient / Doctor). Email + password fields. Forgot password modal. Links to Register + Admin login. |
| `RegisterPage.tsx` | `/dang-ky` | Patient/Doctor registration form. Multi-field. |
| `ResetPasswordPage.tsx` | `/dat-lai-mat-khau` | Token-based password reset form. |
| `AdminLoginPage.tsx` | `/admin/dang-nhap` | Minimal admin-only login form. |

**Login layout pattern:** `grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]` — left hero panel with gradient (`from-primary via-primaryDark to-accent`), right panel with `Card`.

### Dashboard Pages (`pages/Dashboard/`)

| File | Route | Role | Description |
|---|---|---|---|
| `PatientDashboard.tsx` | `/benh-nhan` | patient | Hero welcome banner (gradient bg), 4 StatCards (heart rate, respiratory, steps, medication), line chart (heart + respiratory trends), today's medication list, 3 quick-summary cards (latest diary, latest medical record, privacy link). |
| `DoctorSearch.tsx` | `/bac-si/tim-kiem` | doctor | Search form for finding patients. |
| `DoctorPatientManagement.tsx` | `/bac-si/benh-nhan` | doctor | List of patients under care. |
| `DoctorPatientDetail.tsx` | `/bac-si/benh-nhan/:patientId` | doctor | Full patient profile view (records, metrics, diary, prescriptions). |
| `DoctorPrescription.tsx` | `/bac-si/tao-don-thuoc/:patientId` | doctor | Prescription creation form. |
| `AdminDoctorApproval.tsx` | `/admin/duyet-bac-si` | admin | List of pending doctor registrations; approve/reject actions. |
| `AdminAuditLogs.tsx` | `/admin/lich-su` | admin | Audit log viewer. |

### Diary (`pages/Diary/`)

| File | Route | Description |
|---|---|---|
| `DiaryPage.tsx` | `/nhat-ky` | Full-page diary CRUD. Entry list + create/edit inline or modal. |

### Health Metrics (`pages/HealthMetrics/`)

| File | Route | Description |
|---|---|---|
| `HealthMetricsPage.tsx` | `/chi-so-suc-khoe` | Log and visualize health metrics. Multi-chart (heart rate, blood pressure, steps, respiratory). Form to add new entries. |

### Profile Pages (`pages/Profile/`)

| File | Route | Description |
|---|---|---|
| `ProfilePage.tsx` | `/ho-so` | Patient profile view/edit: personal info, avatar initials, address, blood type, allergies. |
| `PrivacySettings.tsx` | `/quyen-rieng-tu` | Manage emergency QR tokens (create, toggle fields exposed, view expiry, deactivate). |
| `PrivateSettingsPage.tsx` | `/cai-dat-rieng-tu` | Extended privacy/security settings (password change, account settings). |
| `ConsentManagement.tsx` | `/dong-y` | Review & approve/reject doctor access requests. Badge count shown in Sidebar. |
| `EmergencyPublicView.tsx` | `/cap-cuu/:token` | **Public, no auth.** Renders emergency info exposed by the patient's QR token (blood type, allergies, emergency contact). |

---

## 7. Routing Summary

```
/dang-nhap              → LoginPage
/dang-ky                → RegisterPage
/dat-lai-mat-khau       → ResetPasswordPage
/admin/dang-nhap        → AdminLoginPage
/benh-nhan              → PatientDashboard       [patient]
/nhat-ky                → DiaryPage              [patient]
/chi-so-suc-khoe        → HealthMetricsPage      [patient]
/ho-so                  → ProfilePage            [patient]
/dong-y                 → ConsentManagement      [patient]
/cai-dat-rieng-tu       → PrivateSettingsPage    [patient]
/quyen-rieng-tu         → PrivacySettings        [patient]
/cap-cuu/:token         → EmergencyPublicView    [public]
/bac-si/tim-kiem        → DoctorSearch           [doctor]
/bac-si/benh-nhan       → DoctorPatientManagement[doctor]
/bac-si/benh-nhan/:id   → DoctorPatientDetail    [doctor]
/bac-si/tao-don-thuoc/:id → DoctorPrescription   [doctor]
/admin/duyet-bac-si     → AdminDoctorApproval    [admin]
/admin/lich-su          → AdminAuditLogs         [admin]
*                       → redirect to /dang-nhap
```

Auth guard lives in `AppShell` — redirects to `/dang-nhap` if `!isAuthenticated`.

---

## 8. Known Design Patterns & Conventions

1. **All inline styling is done via Tailwind utility classes** — no CSS-in-JS, no style props, no CSS modules.
2. **`cn()` utility** is used everywhere for conditional class merging (`clsx` + `tailwind-merge`).
3. **Role-aware styling** is handled via conditional `cn()` checks on the `role` prop. Three themes: `patient` (blue), `doctor` (teal), `admin` (dark blue).
4. **No animations** currently exist beyond Tailwind's `transition` and `hover:-translate-y-0.5` on interactive cards.
5. **No dark mode** — single light theme only.
6. **Typography:** only Tailwind text utility classes — no custom font scale beyond what Tailwind provides.
7. **Responsive breakpoints in use:** `sm:`, `lg:`, `xl:`, `md:` — primarily `lg:` for sidebar/layout splits.
8. **Vietnamese UI** — all user-facing text is in Vietnamese.
9. **Toast notification** is a simple fixed `div` managed in `uiStore` — no library used.
10. **Modals** use a custom `Modal` component (not a library). Rendered in-tree, not a portal.
11. **Forms** use uncontrolled local state (`useState`) with manual validation — no form library.
