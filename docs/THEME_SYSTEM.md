# EduFlow Theme System & Architectural Guide

## Overview

EduFlow uses a centralized, semantic Design Token architecture supporting both **Light Theme** and **Dark Theme** seamlessly across the entire application.

The theme system is built to ensure that **no component or feature is ever stuck in a mismatched theme**, and that future features automatically render with complete visual consistency without ad-hoc CSS overrides.

---

## 1. Central Semantic Tokens Reference

All components, modals, inputs, and layouts must style their surfaces, borders, and text using these CSS custom properties:

| Semantic Token | Purpose | Light Theme Value | Dark Theme Value |
| :--- | :--- | :--- | :--- |
| `--bg-main` | Page root background | `#F5F7FC` (Clean subtle off-white) | `#0B1020` (Deep midnight navy) |
| `--bg-sidebar` | Navigation sidebar surface | `#FFFFFF` | `#080D1A` |
| `--bg-header` | Top navigation header surface | `#FFFFFF` | `#0B1020` |
| `--bg-card` | Cards, modals, containers | `#FFFFFF` | `#11182A` |
| `--bg-card-hover` | Card/row hover state | `#F1F5F9` | `#16213A` |
| `--bg-elevated` | Modal headers, elevated popovers | `#F8FAFC` | `#141D33` |
| `--bg-input` | Text inputs, selects, textareas | `#F8FAFC` | `#080D19` |
| `--bg-subtle` | Secondary chips, badges, pill boxes | `#F1F5F9` | `#0F172A` |
| `--text-main` / `--text-primary` | Primary headings, prominent body | `#172033` (Charcoal navy, high contrast) | `#F8FAFC` (Clean white) |
| `--text-secondary` | Labels, descriptions, table body | `#475569` (Slate) | `#CBD5E1` (Soft slate) |
| `--text-muted` | Metadata, timestamps, placeholders | `#64748B` (Muted gray) | `#94A3B8` (Cool gray) |
| `--text-subtle` | Fine captions, secondary hints | `#94A3B8` | `#64748B` |
| `--border-color` | Dividers, card/modal outlines | `#E2E8F0` (Light gray border) | `#1E293B` (Dark navy border) |
| `--border-subtle` | Subtle row separators | `#F1F5F9` | `#172238` |
| `--primary` | Primary brand accent color | `#635BEE` (Vibrant purple-indigo) | `#6366F1` (Indigo accent) |
| `--primary-hover` | Brand hover state | `#5249DE` | `#4F46E5` |
| `--primary-light` | Subtle brand tint for focus/rings | `rgba(99, 91, 238, 0.12)` | `rgba(99, 102, 241, 0.2)` |
| `--overlay-color` | Modal & portal backdrops | `rgba(15, 23, 42, 0.65)` | `rgba(0, 0, 0, 0.75)` |
| `--success-color` | Success status, passing grades | `#10B981` | `#34D399` |
| `--warning-color` | Caution notices, deadlines | `#F59E0B` | `#FBBF24` |
| `--danger-color` | Errors, destructive actions | `#EF4444` | `#F87171` |

---

## 2. Tailwind CSS v4 & Operating System Immunity

A critical architectural bug was discovered and fixed in Tailwind CSS v4:
- By default, Tailwind CSS v4 interprets `@variant dark` using the browser's `@media (prefers-color-scheme: dark)`. If a user's operating system (e.g. macOS) was set to Dark Mode, Tailwind's `dark:` classes were applied **even when EduFlow was explicitly in Light Theme**.
- **Fix**: In `frontend/app/globals.css`, the dark variant is explicitly bound to our theme attribute and classes:
  ```css
  @variant dark (&:where([data-theme="dark"], [data-theme="dark"] *, .dark, .dark *));
  ```
- Additionally, `ThemeContext.tsx` applies both `data-theme="light"|"dark"` and the corresponding `.light` / `.dark` classes to **both** `document.documentElement` (`<html>`) and `document.body`. This guarantees that React portals rendered at the root inherit the active theme.

---

## 3. Reusable Themed Component Library

A set of theme-safe UI components is available in `frontend/components/ui/`:

| Component | Path | Description |
| :--- | :--- | :--- |
| `Modal` | `@/components/ui/Modal` | Theme-safe dialog with `ModalHeader`, `ModalBody`, `ModalFooter`, backdrop click-to-close, and keyboard escape handling |
| `Input` | `@/components/ui/Input` | Themed text, date, time, and search inputs with label, helper text, and error states |
| `Textarea` | `@/components/ui/Textarea` | Themed multi-line input with auto-contrast placeholder |
| `Select` | `@/components/ui/Select` | Themed native dropdown select with consistent arrows and options |
| `Card` | `@/components/ui/Card` | Universal container with `CardHeader`, `CardTitle`, `CardDescription`, and `CardContent` |
| `FileUpload` | `@/components/ui/FileUpload` | Drag-and-drop file upload with PDF verification, size limit check, and light/dark hover |
| `Table` | `@/components/ui/Table` | Themed data table with `TableHeader`, `TableHead`, `TableRow`, and `TableCell` |
| `ConfirmDialog` | `@/components/ui/ConfirmDialog` | Destructive/warning confirmation dialog with danger accents |

All these components are exported from `@/components/ui`.

---

## 4. Development Conventions for Future Features

To ensure no future page or component introduces theme regressions, follow these mandatory rules:

1. **Never Hardcode Color Hexes in Component Surfaces or Text:**
   - ❌ `className="bg-[#0d1425] text-white border-[#1b263e]"`
   - ❌ `className="bg-white text-gray-900 border-gray-200"`
   - ✅ `className="app-card"` or `style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}`
   - ✅ Use `@/components/ui` components (`Input`, `Modal`, `Card`, `Select`, `Table`).

2. **Always Use Semantic Utility Classes When Writing Pure CSS / Tailwind:**
   - `.app-card` for card containers
   - `.app-card-subtle` for secondary info boxes
   - `.app-input` for text/date/time inputs
   - `.app-textarea` for multiline textareas
   - `.app-select` for dropdown selects
   - `.app-table`, `.app-th`, `.app-td` for data tables
   - `.btn-primary` for primary call-to-actions
   - `.btn-secondary` for cancel or secondary buttons

3. **Date and Time Pickers:**
   - WebKit browsers render native calendar and clock picker indicators based on `color-scheme`.
   - `globals.css` automatically applies icon inversion filters (`filter: invert(0.85)` in dark mode and `opacity: 0.6` in light mode). Always test date pickers in both themes.

4. **React Portals & Popovers:**
   - Any component that renders into `document.body` or a portal root must verify it reads CSS variables from `document.body` or `[data-theme]`. Since `ThemeContext` updates both `<html>` and `<body>`, all portals automatically inherit theme variables.

---

## 5. Theme Validation Checklist for PRs and QA

Before approving or deploying any new feature, verify:

- [ ] **Modal Surfaces**: Click open every modal in Light Theme. The backdrop must be a clean dim overlay (`rgba(15, 23, 42, 0.65)`), and the modal dialog must have a pure white background with dark charcoal headings.
- [ ] **Input Fields & Textareas**: Check that input backgrounds are light `#F8FAFC`, text is `#172033`, and placeholder text is `#64748B`.
- [ ] **Date/Time Pickers**: Verify calendar and clock icons are visible and readable in both Light and Dark themes.
- [ ] **File Upload Dropzones**: Dropzone border is dashed with subtle tint, icon is colored indigo, and text is readable.
- [ ] **Tables & Headers**: Table headers have light gray backgrounds (`#F8FAFC`) with muted text, and row dividers are visible.
- [ ] **Theme Switching**: Toggle the theme switch in the top header. Confirm all open modals, dropdowns, and cards switch instantly without page reload.
- [ ] **OS Dark Mode Test**: Turn on macOS / Windows Dark Mode while keeping EduFlow in Light Theme. Confirm that EduFlow does NOT leak into dark styles.
