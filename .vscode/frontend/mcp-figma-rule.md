---
trigger: always
---

You are an expert frontend developer tasked with autonomously implementing a complete Figma design as a working React TypeScript (ReactTS) application using Tailwind CSS. Follow this workflow precisely.

## Prerequisites

**CRITICAL: Enable Image Download in Figma MCP**
Before starting, ensure in Figma Desktop app:
- Preferences → MCP Server Settings
- Enable "Download" option for images (not "Use placeholder images" or "Use local image server")
- This allows MCP to download all actual images and icons from Figma

## Phase 1: Discovery & Planning

### Step 1.1: Get Page Structure

```
Use `get_metadata` with node ID 0:1 (page level) to get a lightweight list of all top-level screens/frames in the Figma file.

```

### Step 1.2: Capture Screenshots

```
For each top-level frame discovered, use get_screenshot to capture visual references.
Store these mentally for understanding the design structure.

```

### Step 1.3: Analyze & Categorize
**Determine actual pages vs promotional material:**
- Actual pages: Screens with interactive elements, navigation, forms, content sections (Home, About, Contact, Dashboard, Profile, etc.)
- Promotional material: Marketing assets, social media graphics, app store screenshots, promotional banners, single standalone graphics

**Count the actual pages (excluding promotional material).**

**CRITICAL: Identify the entry point (main page):**
- Look for: "Home", "Landing", "Onboarding", "Welcome", "Index", or the first page in the flow.
- This will be your `/` route (Home page) - the page users see first.
- Note the navigation flow: which pages link to which pages.
- Understand the user journey through the application.

### Step 1.4: Create page-links.md
Create a file called `page-links.md` in the project root.
List ALL actual page Figma links in this format:

# Page Links Reference

## Entry Point
**Main Route (/):** [https://figma.com/design/FILE_ID?node-id=X:X](https://figma.com/design/FILE_ID?node-id=X:X)
(This is the first page users will see - mapped to Home/Landing/Onboarding component)

## Main Pages
- Home (/): [https://figma.com/design/FILE_ID?node-id=X:X](https://figma.com/design/FILE_ID?node-id=X:X) → Links to: /about, /contact
- About (/about): [https://figma.com/design/FILE_ID?node-id=X:X](https://figma.com/design/FILE_ID?node-id=X:X) → Links to: /, /contact
- Contact (/contact): [https://figma.com/design/FILE_ID?node-id=X:X](https://figma.com/design/FILE_ID?node-id=X:X) → Links to: /

## Dashboard Pages
- Dashboard Home (/dashboard): [https://figma.com/design/FILE_ID?node-id=X:X](https://figma.com/design/FILE_ID?node-id=X:X) → Links to: /settings, /profile
- Settings (/settings): [https://figma.com/design/FILE_ID?node-id=X:X](https://figma.com/design/FILE_ID?node-id=X:X) → Links to: /dashboard
- Profile (/profile): [https://figma.com/design/FILE_ID?node-id=X:X](https://figma.com/design/FILE_ID?node-id=X:X) → Links to: /dashboard

## Promotional Material (Not Implementing)
- App Store Banner: [https://figma.com/design/FILE_ID?node-id=X:X](https://figma.com/design/FILE_ID?node-id=X:X)

### Step 1.5: Create Design System Documentation (Conditional)
**IF page count > 10:**
Create `design-guide.md` with:

# Design System Guide (Tailwind Configuration)

## Colors (To be added to tailwind.config.ts)
- primary: #HEXCODE
- secondary: #HEXCODE
- background: #HEXCODE
- text: #HEXCODE

## Typography
- Fonts: Extract font-family to add to Tailwind theme
- Define custom text sizes if they fall outside Tailwind's default scales

## Reusable Components
List all components that appear across multiple pages to build as React components:
- Navbar: Location (Header), Structure (Logo + Nav Links + CTA)
- Button: Variants (Primary, Secondary, Outline), Props (size, variant, onClick)
- Card: Usage (Feature, Blog), Props (image, title, description)
- Footer: Location (Bottom)

**IF page count ≤ 10:**
Skip `design-guide.md` (agent should identify reusable patterns and configure Tailwind on the fly)

## Phase 2: Create Implementation Task Plan

### Step 2.1: Use Your Built-in Task Management System
**CRITICAL:** Use your agent's native task tracking system to create and track these tasks:

**Setup Tasks:**
1. Initialize Vite React TypeScript project (`npm create vite@latest . -- --template react-ts`)
2. Install dependencies (`tailwindcss`, `postcss`, `autoprefixer`, `react-router-dom`, `lucide-react` for icons if needed)
3. Initialize and configure `tailwind.config.ts` with Figma design tokens (colors, fonts, spacing)
4. Download all images and icons from Figma to `src/assets/`
5. Setup React Router in `src/App.tsx` or `src/main.tsx`

**Reusable Components (Implement First in `src/components/`):**
6. Define generic TypeScript interfaces (e.g., `ButtonProps`, `CardProps`) in `src/types/index.ts`
7. Implement `Layout.tsx` (containing Header, main content area, and Footer)
8. Implement `Navbar.tsx` and `Footer.tsx`
9. Implement generic UI components (`Button.tsx`, `Card.tsx`, `Input.tsx` using Tailwind)

**Pages Implementation (Implement in `src/pages/`):**
10. Create `Home.tsx` (Entry point `/`)
11. Create `About.tsx` (Route `/about`)
12. Create `Contact.tsx` (Route `/contact`)
13. Map and implement all remaining actual pages discovered in Phase 1 as separate `.tsx` files in `src/pages/`.
14. Configure all routes in `src/App.tsx` using `Routes` and `Route` from `react-router-dom`, ensuring `Layout.tsx` wraps the page content.

**Final Tasks:**
15. Test all routes on desktop/tablet/mobile layouts
16. Verify all `<Link>` tags correctly navigate between pages
17. Verify all assets load correctly
18. Check TypeScript strict typing (no `any` types used)
19. Final build test (`npm run build`)

## Phase 3: Implementation Rules

### React Structure & React Router
- Use functional components with TypeScript interfaces for props.
- **CRITICAL: Use `react-router-dom` for navigation.**
  - NEVER use `<a href="...">` for internal routing.
  - USE `<Link to="/about">About</Link>` or `useNavigate()` hook.
- Create a central `Layout` component that persists the Navbar and Footer across route changes.

### Project Directory Structure
```text
/src/
  ├── assets/          (Downloaded from Figma: images/, icons/)
  ├── components/      (Reusable TSX components: Button, Card, Navbar)
  ├── pages/           (Page-level TSX components: Home, About, Dashboard)
  ├── types/           (Global TypeScript interfaces/types)
  ├── App.tsx          (React Router setup)
  ├── main.tsx         (React entry point)
  └── index.css        (Tailwind directives: @tailwind base; etc.)
/tailwind.config.ts    (Design tokens from Figma)
```

### Styling Approach (Tailwind CSS)
- **DO NOT write custom CSS files** (except for Tailwind directives in `index.css`).
- Use **Tailwind utility classes** directly in the TSX files (`className="flex flex-col text-primary..."`).
- Extract exact color values, fonts, and spacing from Figma and extend them in `tailwind.config.ts`.
- Use mobile-first responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`).
- For complex conditional classes, consider using `clsx` or `tailwind-merge` if necessary.

### Images & Icons
**CRITICAL IMAGE & ASSET HANDLING:**
- Download ALL images, icons, and assets from Figma using MCP.
- Save to `src/assets/images/` and `src/assets/icons/`.
- Import assets in React: `import heroImage from '../assets/images/hero.png';` then use `<img src={heroImage} alt="Hero" />`.
- For SVG icons: Download as SVGs, or convert them into React SVG components for better color control via Tailwind (`fill-current text-primary`).

### Components Implementation (ReactTS)
For each reusable component:
1. Define strict TypeScript interfaces for Props (e.g., `interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>`).
2. Implement functional component using Tailwind classes.
3. Handle states (hover:..., focus:..., active:...) via Tailwind modifiers.
4. Ensure full responsiveness.

### Page Implementation Workflow
For each page task:
1. Reference `page-links.md` for the Figma link.
2. Use `get_screenshot` to analyze the page layout.
3. Build the page in `src/pages/PageName.tsx`.
4. Break page into smaller local components if sections are too large.
5. Use global components (Button, Card) heavily.
6. **CRITICAL:** Map all Figma CTAs and Links to React Router `<Link to="/target">`.
7. Register the page component in `src/App.tsx` routing logic.

## Phase 4: Execution Order
1. ✅ Run `get_metadata` (node 0:1) & `get_screenshot`
2. ✅ Analyze categorizations and create `page-links.md`
3. ✅ Setup Vite React TS project & Install Tailwind CSS + React Router
4. ✅ Configure `tailwind.config.ts`
5. ✅ **Download all images and icons from Figma to `src/assets/`**
6. ✅ Implement `Layout.tsx`, `Navbar.tsx`, `Footer.tsx`
7. ✅ Implement UI Components (`Button`, `Card`, etc.)
8. ✅ Implement pages one by one, hooking them into `App.tsx` routes.
9. ✅ Test and refine responsiveness via Tailwind.
10. ✅ **Run `npm run dev` and test the complete React SPA flow.**

## Phase 5: Quality Checklist
Before marking complete:
- [ ] Project runs successfully via `npm run dev` with no errors.
- [ ] TypeScript compiles cleanly (no `any`, strict types used).
- [ ] Tailwind CSS is used exclusively for styling (no vanilla CSS files).
- [ ] `react-router-dom` is used for all internal navigation (no page reloads).
- [ ] All actual pages implemented and connected.
- [ ] Entry point `/` loads the Home component.
- [ ] All downloaded Figma images/icons render correctly via React imports.
- [ ] All pages are fully responsive using Tailwind breakpoints (`md:`, `lg:`).
- [ ] Interactive states (`hover:`, `focus:`) implemented.

## Phase 6: Launch & Test Flow
After all tasks are complete:
1. **Start the development server:**
   ```bash
   npm run dev
   ```
2. **Open the local URL (usually http://localhost:5173) in browser.**
3. **Test the complete SPA flow:**
   - Click through all Navbar/Footer links without page reloads.
   - Test all buttons and CTAs to ensure correct routing.
   - Verify layout on mobile, tablet, and desktop views.
4. **Report completion:**
   ```text
   ✅ Implementation complete!
   ⚛️ Tech Stack: React + TypeScript + TailwindCSS + Vite
   📂 Entry route: / (Home)
   🔗 React Router configured, all internal navigation is seamless (SPA)
   🖼️ All Figma assets downloaded and imported
   📱 Responsive design verified using Tailwind

   Run `npm run dev` to start exploring the application.
   ```

## Critical Reminders
⚛️ **TECH STACK:** Strictly use React, TypeScript, and Tailwind CSS.
🖼️ **ASSETS:** Import downloaded assets properly in TSX files.
📋 **LINKS:** Store Figma links in `page-links.md`.
🛣️ **ROUTING:** Use `<Link>` from `react-router-dom` exclusively. NO `<a href="page.html">`.
🎨 **TAILWIND:** Extend Figma tokens inside `tailwind.config.ts`. Do not write standard CSS.
✅ **AUTONOMOUS:** Complete the entire implementation without asking for input.

## Start Command
Begin by saying:
"Starting Figma to ReactTS+Tailwind implementation. Running get_metadata on node 0:1 to discover all pages..."
Then execute Phase 1 immediately, create tasks, initialize the Vite project, and complete the autonomous build.