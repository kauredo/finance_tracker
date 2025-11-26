# Wallet Joy Design System

> [!NOTE]
> This design system is the foundation for the Wallet Joy finance tracker. It ensures consistency, accessibility, and a delightful user experience across all interfaces.

## Core Principles

- **Modern & Clean**: Minimalist layout, ample whitespace, no heavy gradients
- **Inviting & Friendly**: Soft colors, rounded corners, approachable typography
- **Focus on Content**: Data is the star; UI supports it without distraction
- **Accessible**: WCAG 2.1 AA compliant color contrast and interactive elements
- **Responsive**: Mobile-first design that scales beautifully

---

## Color Palette

Derived from the "Wallet Joy" piggy bank logo and designed for both light and dark modes.

### Primary (Brand)

| Token              | Light Mode | Usage                                        |
| ------------------ | ---------- | -------------------------------------------- |
| **Joy Pink**       | `#FF8FAB`  | Primary buttons, links, brand accents        |
| **Joy Pink Light** | `#FFC2D1`  | Hover states, backgrounds, subtle highlights |
| **Joy Pink Dark**  | `#FB6F92`  | Active states, pressed buttons, emphasis     |
| **Joy Pink Pale**  | `#FFF0F4`  | Very light backgrounds, table rows           |

### Neutral

| Token              | Light Mode | Dark Mode | Usage                            |
| ------------------ | ---------- | --------- | -------------------------------- |
| **Background**     | `#FFFFFF`  | `#0F172A` | Main page background             |
| **Surface**        | `#F8FAFC`  | `#1E293B` | Cards, panels, elevated surfaces |
| **Surface Alt**    | `#F1F5F9`  | `#273549` | Alternate backgrounds, sidebars  |
| **Text Primary**   | `#1E293B`  | `#F8FAFC` | Headings, primary content        |
| **Text Secondary** | `#64748B`  | `#94A3B8` | Body text, descriptions          |
| **Text Muted**     | `#94A3B8`  | `#64748B` | Captions, disabled text          |
| **Border**         | `#E2E8F0`  | `#334155` | Dividers, input borders          |
| **Border Light**   | `#F1F5F9`  | `#1E293B` | Subtle separators                |

### Functional

| Token             | Color     | Usage                                    |
| ----------------- | --------- | ---------------------------------------- |
| **Success**       | `#10B981` | Income, positive balance, success states |
| **Success Light** | `#D1FAE5` | Success backgrounds                      |
| **Danger**        | `#EF4444` | Expenses, errors, destructive actions    |
| **Danger Light**  | `#FEE2E2` | Error backgrounds                        |
| **Warning**       | `#F59E0B` | Alerts, cautions                         |
| **Warning Light** | `#FEF3C7` | Warning backgrounds                      |
| **Info**          | `#3B82F6` | Information, neutral highlights          |
| **Info Light**    | `#DBEAFE` | Info backgrounds                         |

---

## Typography

### Font Families

- **Primary**: `Geist Sans` - Modern, clean, highly readable
- **Monospace**: `Geist Mono` - Code, data tables, numbers

### Type Scale

| Token          | Size              | Line Height | Weight | Usage              |
| -------------- | ----------------- | ----------- | ------ | ------------------ |
| **Display**    | `3.75rem` (60px)  | 1.1         | 700    | Hero headlines     |
| **H1**         | `2.25rem` (36px)  | 1.2         | 700    | Page titles        |
| **H2**         | `1.875rem` (30px) | 1.3         | 700    | Section headers    |
| **H3**         | `1.5rem` (24px)   | 1.4         | 600    | Subsection headers |
| **H4**         | `1.25rem` (20px)  | 1.4         | 600    | Card titles        |
| **H5**         | `1.125rem` (18px) | 1.5         | 600    | Small headers      |
| **Body Large** | `1.125rem` (18px) | 1.6         | 400    | Large body text    |
| **Body**       | `1rem` (16px)     | 1.6         | 400    | Default body text  |
| **Body Small** | `0.875rem` (14px) | 1.5         | 400    | Secondary text     |
| **Caption**    | `0.75rem` (12px)  | 1.4         | 400    | Captions, labels   |
| **Overline**   | `0.75rem` (12px)  | 1.4         | 600    | All caps labels    |

### Font Weights

- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

---

## Spacing & Layout

### Spacing Scale

Using a consistent 4px base unit:

| Token | Value           | Usage                    |
| ----- | --------------- | ------------------------ |
| `xs`  | `0.25rem` (4px) | Micro spacing, icon gaps |
| `sm`  | `0.5rem` (8px)  | Tight element spacing    |
| `md`  | `1rem` (16px)   | Standard spacing         |
| `lg`  | `1.5rem` (24px) | Section spacing          |
| `xl`  | `2rem` (32px)   | Large gaps               |
| `2xl` | `3rem` (48px)   | Major sections           |
| `3xl` | `4rem` (64px)   | Hero spacing             |
| `4xl` | `6rem` (96px)   | Giant spacing            |

### Layout Grid

- **Max Content Width**: `1280px` (7xl container)
- **Gutter**: `1.5rem` (24px) on mobile, `2rem` (32px) on desktop
- **Columns**: 4 (mobile), 8 (tablet), 12 (desktop)
- **Breakpoints**:
  - `sm`: `640px`
  - `md`: `768px`
  - `lg`: `1024px`
  - `xl`: `1280px`
  - `2xl`: `1536px`

---

## Shadows & Elevation

| Level    | Shadow                                                      | Usage                            |
| -------- | ----------------------------------------------------------- | -------------------------------- |
| **None** | `none`                                                      | Flat elements, inline components |
| **XS**   | `0 1px 2px rgba(0,0,0,0.05)`                                | Subtle depth, buttons            |
| **SM**   | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`     | Cards, containers                |
| **MD**   | `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)`    | Dropdowns, popovers              |
| **LG**   | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)`   | Modals, overlays                 |
| **XL**   | `0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)` | Large modals                     |
| **2XL**  | `0 25px 50px rgba(0,0,0,0.25)`                              | Floating elements                |

**Dark Mode**: Reduce shadow opacity by 50% for subtlety.

---

## Border Radius

| Token  | Value            | Usage               |
| ------ | ---------------- | ------------------- |
| `sm`   | `0.375rem` (6px) | Buttons, badges     |
| `md`   | `0.5rem` (8px)   | Input fields        |
| `lg`   | `0.75rem` (12px) | Small cards         |
| `xl`   | `1rem` (16px)    | Standard cards      |
| `2xl`  | `1.5rem` (24px)  | Large cards, panels |
| `3xl`  | `2rem` (32px)    | Hero sections       |
| `full` | `9999px`         | Pills, avatars      |

---

## Animation & Transitions

### Timing Functions

- **Ease In**: `cubic-bezier(0.4, 0, 1, 1)` - Elements leaving
- **Ease Out**: `cubic-bezier(0, 0, 0.2, 1)` - Elements entering
- **Ease In Out**: `cubic-bezier(0.4, 0, 0.2, 1)` - Standard transitions
- **Spring**: Custom spring animations for interactive elements

### Duration

- **Fast**: `100ms` - Micro-interactions
- **Normal**: `200ms` - Standard transitions
- **Slow**: `300ms` - Complex animations
- **Slower**: `500ms` - Page transitions

### Common Transitions

```css
/* Hover effects */
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* Color changes */
transition:
  color 150ms ease-out,
  background-color 150ms ease-out;

/* Transform */
transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
```

---

## Iconography

### Icon System

- **Library**: Lucide React (consistent, modern, open source)
- **Size Scale**:
  - `xs`: 12px
  - `sm`: 16px
  - `md`: 20px (default)
  - `lg`: 24px
  - `xl`: 32px
  - `2xl`: 48px

### Usage Guidelines

- Always include `aria-label` for icon-only buttons
- Use consistent stroke width (2px default)
- Align icons vertically with text using flex containers
- Color icons with text colors for semantic meaning

---

## Components

### Buttons

#### Variants

**Primary**

```tsx
className =
  "bg-primary hover:bg-primary-dark active:bg-primary-dark text-white font-medium px-4 py-2 rounded-xl transition-all shadow-xs hover:shadow-sm";
```

**Secondary**

```tsx
className =
  "bg-white border border-border hover:border-primary/50 text-foreground font-medium px-4 py-2 rounded-xl transition-all shadow-xs hover:shadow-sm";
```

**Ghost**

```tsx
className =
  "text-primary hover:bg-primary-light/20 font-medium px-4 py-2 rounded-xl transition-colors";
```

**Danger**

```tsx
className =
  "bg-danger hover:bg-danger/90 text-white font-medium px-4 py-2 rounded-xl transition-all shadow-xs";
```

#### Sizes

- **sm**: `px-3 py-1.5 text-sm`
- **md**: `px-4 py-2 text-base` (default)
- **lg**: `px-6 py-3 text-lg`

#### States

- **Disabled**: `opacity-50 cursor-not-allowed pointer-events-none`
- **Loading**: Show spinner, disable interaction

---

### Cards

**Default Card**

```tsx
className =
  "bg-surface rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow";
```

**Interactive Card**

```tsx
className =
  "bg-surface rounded-2xl p-6 shadow-sm border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer";
```

**Stat Card**

```tsx
className =
  "bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20";
```

---

### Inputs

**Text Input**

```tsx
className =
  "w-full px-4 py-2.5 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
```

**Input with Icon**

```tsx
<div className="relative">
  <input className="pl-10 ..." />
  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
</div>
```

**States**

- **Error**: `border-danger focus:ring-danger/50`
- **Disabled**: `bg-surface/50 cursor-not-allowed opacity-60`

---

### Navigation

**Top Navigation**

```tsx
className =
  "bg-surface/80 backdrop-blur-lg border-b border-border sticky top-0 z-50";
```

**Sidebar**

```tsx
className = "bg-surface border-r border-border min-h-screen w-64";
```

**Nav Item**

```tsx
className =
  "flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-background transition-colors text-muted hover:text-foreground";
```

**Active Nav Item**

```tsx
className =
  "flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/10 text-primary font-medium";
```

---

## Accessibility Guidelines

### Color Contrast

- Text on background: minimum 4.5:1 for normal text, 3:1 for large text
- Interactive elements: clear visual focus states
- Never rely on color alone to convey information

### Interactive Elements

- Minimum touch target: 44x44px
- Keyboard navigation support for all interactive elements
- Clear focus indicators with 2px ring

### Screen Readers

- Semantic HTML elements
- ARIA labels for icon buttons
- Descriptive link text

---

## Best Practices

### Do's ✅

- Use design tokens consistently
- Maintain visual hierarchy with typography scale
- Apply micro-interactions for better UX
- Test in both light and dark mode
- Ensure responsive behavior at all breakpoints

### Don'ts ❌

- Don't use arbitrary colors outside the palette
- Avoid mixing border radius scales
- Don't create new spacing values
- Never hard-code colors in components
- Avoid heavy gradients or complex backgrounds

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Geist Font](https://vercel.com/font)
- [Lucide Icons](https://lucide.dev)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
