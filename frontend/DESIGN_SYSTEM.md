# World Cup Dashboard Design System

## Direction

The interface is clean, minimal, and product-led. It uses restrained neutral
surfaces, strong typography, generous space, and a single high-energy brand
color suited to live sport.

## Source palette

| Role | Value |
| --- | --- |
| Ink | `#0f0f0f` |
| Charcoal | `#1c1c1c` |
| White | `#ffffff` |
| Brand | `#0253ba` |

Only palette primitives in `src/styles/tokens.css` should contain brand hex
values. Components must use semantic names such as `primary`, `surface`,
`foreground`, and `border`.

## Themes

The system supports `light`, `dark`, and `system` preferences. `ThemeProvider`
stores the preference under `wcd-theme`, resolves system changes in real time,
and applies the resolved theme to `data-theme` on the root element.

Use `useTheme()` to read or update the preference:

```jsx
const { theme, resolvedTheme, setTheme } = useTheme()
setTheme('dark') // 'light' | 'dark' | 'system'
```

## Component rules

- Use the brand color for primary actions, selection, focus, and live emphasis.
- Use neutral surfaces for structure; do not introduce decorative accent colors.
- Functional warning and danger colors are reserved for genuine status meaning.
- Match-card and tournament graphics may retain their existing team gradients.
- Use semantic Tailwind utilities such as `bg-background`, `bg-surface`,
  `text-foreground`, `text-muted-foreground`, `border-border`, and `bg-primary`.
- Interactive controls must include keyboard focus, hover, active, disabled, and
  loading states.
- Use borders, color, and spacing for hierarchy. The system is intentionally
  flat and does not use elevation or dimensional shadows.
- Motion uses the shared duration and easing tokens and respects reduced-motion
  preferences.

## Typography

The system font stack intentionally prioritizes native Apple and platform fonts.
Display text uses the same family with stronger weight and tighter tracking.
Scores and time data may use tabular numerals for stable alignment.

## Token layers

1. Palette primitives define brand-owned values.
2. Theme tokens map those primitives to semantic UI roles.
3. Tailwind theme aliases expose semantic utilities to components.

This separation allows a future rebrand to change the palette without rewriting
components or theme-specific styles.
