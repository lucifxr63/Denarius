# Account Onboarding Page Overrides

> **PROJECT:** Denarius
> **Generated:** 2026-08-09 21:12:09
> **Page Type:** Settings / Profile

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content
- **Sections:** 1. Hero, 2. Step 1 (problem), 3. Step 2 (solution), 4. Step 3 (action), 5. CTA progression

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Step colors: 1 (Red/Problem), 2 (Orange/Process), 3 (Green/Solution). CTA: Brand color

### Component Overrides

- Avoid: Force linear unskippable tour
- Avoid: Icon buttons without labels
- Avoid: Keyboard traps or illogical tab order

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: transform: translateY(scroll), position: fixed/sticky, perspective: 1px, scroll-triggered animations
- Onboarding: Provide Skip and Back buttons
- Accessibility: Add aria-label for icon-only buttons
- Accessibility: Tab order matches visual order
- CTA Placement: Each step: mini-CTA. Final: main CTA
