# Elevated Soft UI — Refactoring Rules

> **Audience:** AI coding agents performing UI refactoring on the Medical Diary frontend.
> **Prerequisite:** Read `FRONTEND_CONTEXT.md` first for current state.
> **Scope:** Visual-only refactoring. No changes to routing, state management, API calls, or business logic.

---

## 1. Design Philosophy

**Elevated Soft UI** is a modern aesthetic that combines:

- **Soft depth** — Layered, diffused shadows instead of flat borders. Elements feel like they float above the surface.
- **Frosted glass (glassmorphism)** — Semi-transparent surfaces with `backdrop-blur` for overlays, sidebar, topbar, modals, and dropdowns.
- **Generous rounding** — Larger border-radius values (`12px`–`20px`) for a friendly, approachable feel.
- **Muted, warm palette** — Slightly warmer neutrals. Softer accent colors (less saturated). Subtle tinted backgrounds.
- **Micro-animations** — Smooth transitions on hover, focus, and mount. Spring-like interactions.
- **Breathing whitespace** — More padding, more gap, more margin. Let elements breathe.
- **Gradient accents** — Subtle gradients on primary surfaces and CTAs instead of flat solid colors.

### What This Is NOT

- ❌ Full neumorphism (no inset shadows mimicking physical buttons)
- ❌ Skeuomorphism
- ❌ Flat/brutalist
- ❌ Heavy glassmorphism (no full transparent cards with unreadable text)

---

## 2. Tailwind Config Changes

### 2.1 Color Token Migration

Replace the existing `tailwind.config.js` colors with these softened values:

```js
colors: {
  // --- Core (softened, slightly warmer) ---
  primary:           "#3B82F6",   // was #0284C7 — brighter blue-500
  primaryLight:      "#93C5FD",   // NEW — blue-300 for soft backgrounds
  primaryDark:       "#2563EB",   // was #0369A1 — blue-600
  secondary:         "#1E293B",   // was #0F172A — slate-800 (slightly lighter)
  accent:            "#14B8A6",   // was #0D9488 — teal-400 (brighter)
  accentLight:       "#99F6E4",   // NEW — teal-200 for soft tints
  background:        "#F8FAFC",   // unchanged
  card:              "rgba(255, 255, 255, 0.72)", // was #FFFFFF — semi-transparent for glass
  cardSolid:         "#FFFFFF",   // NEW — for contexts needing opaque white
  muted:             "#F1F5F9",   // unchanged
  mutedForeground:   "#64748B",   // unchanged
  border:            "#E2E8F0",   // unchanged
  inputBackground:   "#F8FAFC",   // was #FFFFFF — subtle off-white
  ring:              "#3B82F6",   // match new primary

  // --- Status (softer saturation) ---
  emergency:         "#EF4444",   // was #DC2626 — red-500 (softer)
  success:           "#22C55E",   // was #16A34A — green-500 (brighter)
  pending:           "#F97316",   // was #EA580C — orange-500
  warning:           "#FBBF24",   // was #F59E0B — amber-400 (warmer)

  // --- Tinted backgrounds (softer, more tint) ---
  infoBg:            "#EFF6FF",   // unchanged
  successBg:         "#F0FDF4",   // was #DCFCE7 — lighter green-50
  dangerBg:          "#FEF2F2",   // unchanged
  warningBg:         "#FFFBEB",   // was #FEF3C7 — lighter amber-50

  // --- Admin (keep distinct but soften) ---
  adminPrimary:      "#0EA5E9",   // was #0077B6 — sky-500 (brighter)
  adminSecondary:    "#0284C7",   // was #005F8C
  adminAccent:       "#0369A1",   // was #004E73
  adminBackground:   "#F0F9FF",   // was #E0F2FE — sky-50 (lighter)
  adminMuted:        "#E0F2FE",   // was #BAE6FD

  // --- Chart (keep functional, slightly softer) ---
  chartHeart:        "#F87171",   // was #DC2626 — red-400
  chartBloodPressure:"#60A5FA",   // was #0284C7 — blue-400
  chartSteps:        "#2DD4BF",   // was #0D9488 — teal-400
  chartRespiratory:  "#A78BFA",   // was #7C3AED — violet-400
  chartWarning:      "#FBBF24",   // was #F59E0B — amber-400
},
```

### 2.2 Border Radius — More Generous

```js
borderRadius: {
  card:    "16px",    // was 8px
  input:   "12px",    // was 6px
  button:  "12px",    // NEW
  badge:   "9999px",  // pill shape (unchanged behavior)
  modal:   "20px",    // NEW
  sidebar: "0px",     // sidebar itself stays flush
},
```

### 2.3 Box Shadows — Layered Soft Depth

```js
boxShadow: {
  // Soft elevation levels
  "soft-sm":  "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
  "soft":     "0 4px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
  "soft-md":  "0 8px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.03)",
  "soft-lg":  "0 16px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
  "soft-xl":  "0 24px 56px rgba(0,0,0,0.10), 0 6px 16px rgba(0,0,0,0.05)",
  // Glass shadow
  "glass":    "0 8px 32px rgba(0,0,0,0.06)",
  // Card default
  "card":     "0 4px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
  // Interactive hover lift
  "card-hover": "0 12px 28px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)",
},
```

### 2.4 New Utility Extensions

```js
backdropBlur: {
  glass: "16px",
  "glass-heavy": "24px",
},
keyframes: {
  "fade-in": {
    "0%":   { opacity: "0", transform: "translateY(8px)" },
    "100%": { opacity: "1", transform: "translateY(0)" },
  },
  "scale-in": {
    "0%":   { opacity: "0", transform: "scale(0.95)" },
    "100%": { opacity: "1", transform: "scale(1)" },
  },
  "slide-in-right": {
    "0%":   { transform: "translateX(100%)" },
    "100%": { transform: "translateX(0)" },
  },
},
animation: {
  "fade-in":        "fade-in 0.3s ease-out",
  "scale-in":       "scale-in 0.2s ease-out",
  "slide-in-right": "slide-in-right 0.3s ease-out",
},
```

---

## 3. Global CSS Changes

Update `src/styles/globals.css` — add scrollbar and selection styling:

```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

::selection {
  background: rgba(59, 130, 246, 0.15);
  color: inherit;
}
```

---

## 4. Component-by-Component Migration

### 4.1 `Card.tsx`

| Aspect | Current | Target |
|---|---|---|
| Base | `rounded-card border shadow-card` | `rounded-card border border-white/60 bg-card shadow-soft backdrop-blur-glass` |
| Tone default | `border-border bg-card` | `border-white/60 bg-card backdrop-blur-glass` |
| Tone info | `border-blue-100 bg-infoBg` | `border-blue-200/40 bg-blue-50/60 backdrop-blur-glass` |
| Tone success | `border-green-100 bg-successBg` | `border-green-200/40 bg-green-50/60 backdrop-blur-glass` |
| Tone danger | `border-red-100 bg-dangerBg` | `border-red-200/40 bg-red-50/60 backdrop-blur-glass` |
| Tone warning | `border-amber-100 bg-warningBg` | `border-amber-200/40 bg-amber-50/60 backdrop-blur-glass` |
| Tone admin | `border-sky-200 bg-white` | `border-sky-200/40 bg-sky-50/60 backdrop-blur-glass` |
| Interactive hover | `hover:-translate-y-0.5 hover:shadow-md` | `hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300` |

### 4.2 `Button.tsx`

Replace `rounded-input` → `rounded-button`. Add `active:scale-[0.98]` to base.

| Variant | Target classes |
|---|---|
| primary | `bg-gradient-to-r from-primary to-primaryDark text-white shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 transition-all` |
| secondary | `bg-secondary text-white shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 transition-all` |
| outline | `border border-border/60 bg-white/60 backdrop-blur-sm shadow-soft-sm hover:bg-white hover:shadow-soft transition-all` |
| ghost | `bg-transparent hover:bg-muted/60 transition-all` |
| danger | `bg-gradient-to-r from-emergency to-red-600 text-white shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 transition-all` |
| success | `bg-gradient-to-r from-success to-green-600 text-white shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 transition-all` |

### 4.3 `FormInput.tsx`

| Aspect | Current | Target |
|---|---|---|
| Height | `h-10` | `h-11` |
| Border | `border border-border` | `border border-border/50 shadow-soft-sm` |
| Focus | `focus:ring-2 focus:ring-primary/20` | `focus:ring-4 focus:ring-primary/10 focus:shadow-soft focus:border-primary/40 transition-all` |

### 4.4 `FormSelect.tsx`

Same input treatment. Dropdown panel:

- Current: `rounded-input border border-border bg-card shadow-lg`
- Target: `rounded-card border border-white/60 bg-white/80 backdrop-blur-glass shadow-soft-lg animate-scale-in`

### 4.5 `Badge.tsx`

Add `shadow-soft-sm`. Use `/80` opacity on background colors for softer appearance.

### 4.6 `StatCard.tsx`

- Icon container: `rounded-2xl` (was `rounded-card`), add `shadow-soft-sm`
- Value text: `text-2xl` (was `text-xl`)
- Icon background: use gradient e.g., `bg-gradient-to-br from-primary/15 to-primary/5`

### 4.7 `Modal.tsx`

| Aspect | Current | Target |
|---|---|---|
| Overlay | `bg-slate-950/45` | `bg-slate-950/30 backdrop-blur-sm` |
| Panel | `rounded-card max-w-lg border` | `rounded-modal bg-white/85 backdrop-blur-glass-heavy shadow-soft-xl border border-white/60 animate-scale-in` |
| Padding | `p-5` | `p-6` |

### 4.8 `Sidebar.tsx`

| Aspect | Current | Target |
|---|---|---|
| Background | `bg-secondary` | `bg-secondary/95 backdrop-blur-glass-heavy` |
| Border | `border-r border-slate-700` | `border-r border-white/5` |
| NavLink hover | `hover:bg-slate-800` | `hover:bg-white/8` |
| NavLink active | solid color bg | same color + `shadow-soft-sm rounded-xl` |
| Logo icon | `rounded-xl` | `rounded-2xl` |
| User card | `rounded-card bg-slate-800` | `rounded-2xl bg-white/8` |
| Mobile overlay | `bg-slate-950/45` | `bg-slate-950/30 backdrop-blur-sm` |

### 4.9 `Topbar.tsx`

| Aspect | Current | Target |
|---|---|---|
| Height | `h-14` | `h-16` |
| Background | `bg-card` | `bg-white/70 backdrop-blur-glass` |
| Border | `border-b border-border` | `border-b border-border/40` |
| Action buttons | `rounded-input` | `rounded-xl hover:bg-muted/60 hover:shadow-soft-sm transition-all` |
| Dropdowns | - | Add `animate-fade-in` |

### 4.10 `AppShell.tsx`

Toast update:

- Current: `rounded-card border border-border bg-card`
- Target: `rounded-2xl border border-white/60 bg-white/80 backdrop-blur-glass shadow-soft-lg animate-slide-in-right`

### 4.11 `DataTable.tsx`

- Container: inherit Card glass
- Header row: `bg-muted/40`
- Row hover: `hover:bg-primary/[0.03]`
- Cell borders: `border-border/30`

---

## 5. Page-Specific Rules

### 5.1 Login Pages

**Hero panel:** Keep gradient. Add 2–3 decorative `div` elements:

```tsx
<div aria-hidden="true" className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
<div aria-hidden="true" className="absolute bottom-10 left-10 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
```

**Form card:** Apply Card glass. Role switcher: `rounded-2xl bg-muted/40 p-1.5`, active tab `bg-white shadow-soft-sm rounded-xl`.

### 5.2 Patient Dashboard

**Welcome banner:** `rounded-2xl shadow-soft-md` + decorative blur circle. **StatCards:** Inherit component updates.

### 5.3 Emergency Public View

**⚠ DO NOT apply glassmorphism here.** Keep high-contrast solid red. Only change: `rounded-2xl` on cards, `shadow-soft-lg`.

### 5.4 All Other Pages

- Inherit component changes automatically.
- Increase `space-y-6` → `space-y-8`, `gap-4` → `gap-5` or `gap-6`.

---

## 6. Animation Rules

### 6.1 Every interactive element: `transition-all duration-200`

### 6.2 Hover Effects

| Element | Effect |
|---|---|
| Cards (interactive) | `hover:-translate-y-1 hover:shadow-card-hover` |
| Buttons (solid) | `hover:-translate-y-0.5 hover:shadow-soft active:scale-[0.98]` |
| Buttons (ghost/outline) | `hover:bg-muted/60` (no lift) |
| Table rows | `hover:bg-primary/[0.03]` |

### 6.3 Mount Animations

| Element | Animation |
|---|---|
| Modals | `animate-scale-in` |
| Dropdowns | `animate-scale-in` |
| Toast | `animate-slide-in-right` |
| Page content | `animate-fade-in` on first section |

### 6.4 Constraints

- No route transition animations
- Total animation ≤ 400ms
- No animation on data updates

---

## 7. Strict Constraints

### DO NOT Change

- ❌ File names, folder structure, component props API
- ❌ Routing, state management, API calls, business logic
- ❌ Vietnamese text content
- ❌ Role-based conditional logic
- ❌ Responsive breakpoint behavior
- ❌ Accessibility attributes

### DO Change

- ✅ Tailwind utility classes in `className`
- ✅ `tailwind.config.js` tokens
- ✅ `globals.css`
- ✅ Add decorative elements with `aria-hidden="true"` only

### Quality Checks

1. No TypeScript errors — only `className` strings change
2. `cn()` role-based conditionals still work
3. Text contrast remains readable (use `cardSolid` if glass hurts readability)
4. Mobile usability preserved

---

## 8. Migration Order

| Step | File(s) | What Changes |
|---|---|---|
| 1 | `tailwind.config.js` | All tokens |
| 2 | `globals.css` | Scrollbar, selection |
| 3 | `Card.tsx` | Glass treatment (cascades everywhere) |
| 4 | `Button.tsx` | Gradient + shadow + radius |
| 5 | `FormInput.tsx`, `FormSelect.tsx` | Soft inputs |
| 6 | `Badge.tsx`, `StatCard.tsx` | Subtle refinements |
| 7 | `Modal.tsx` | Glass overlay + animation |
| 8 | `Sidebar.tsx` | Dark glass + rounded nav |
| 9 | `Topbar.tsx` | Frosted header |
| 10 | `AppShell.tsx` | Toast animation |
| 11 | `LoginPage.tsx` | Hero blur shapes |
| 12 | `PatientDashboard.tsx` | Welcome banner |
| 13 | Remaining pages | Spacing adjustments |
| 14 | `EmergencyPublicView.tsx` | Radius only — no glass |

---

## 9. Visual Summary

```
 BEFORE (Flat Clinical)          →    AFTER (Elevated Soft UI)
─────────────────────────────    ─────────────────────────────
 Sharp 6-8px radius                   Generous 12-20px radius
 Hard 1px borders (#E2E8F0)           Soft white/60 borders
 Flat white cards, no depth           Multi-layer diffused shadows
 Solid opaque surfaces                Frosted glass (backdrop-blur)
 No animations                        Scale-in, fade-in, slide
 Compact spacing                      Breathing whitespace
 Flat solid buttons                   Gradient CTAs + press feedback
 Saturated status colors              Softer, warmer palette
```
