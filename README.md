# ProFinanceCast2 — v2 rebuild (design foundation)

This is the v2 rebuild of ProFinanceCast, scoped to a self-contained static
prototype for design review. No backend. No auth. All figures render from
`js/demo-data.js` (`window.PFC_DATA`).

## Design direction: "Aurora Cinema"

Premium fintech aesthetic. Cinematic dark base with slowly drifting aurora
gradients, electric mint as the single committed accent, soft coral and
lavender used sparingly for state and contrast.

- Display: Fraunces (editorial serif, variable optical size)
- Body: Geist (grotesque)
- Mono: JetBrains Mono — used on **every figure**

Color strategy (per impeccable): **Restrained** — tinted ink neutrals + one
accent (mint) below 10% surface coverage, with coral/lavender reserved for
state. Theme chosen from scene: "an analyst checking forecasts at 11pm on a
14-inch laptop, needing calm focus, not crypto-bro neon."

## Key files

```
repo/
  css/
    tokens.css       # all design tokens (colors, type, spacing, motion)
    base.css         # reset, typography, focus, scrollbar, utilities
    components.css   # btn, card, kpi, chip, tab, field, toggle, progress, toast, skeleton
    layout.css       # aurora background, app-shell, sidebar, topbar, sections, grids
  js/
    include.js       # <div data-include="..."> partial loader
    motion.js        # window.PFC_MOTION — reveal, countUp, magnetic, parallax, tilt3D, pulse
    charts.js        # window.PFC_CHARTS — area, sparkline, donut, ring, bar
    demo-data.js     # window.PFC_DATA — all illustrative figures
    app.js           # bootstrap (after partials-ready)
  partials/
    sidebar.html     # primary nav (data-active toggled via body[data-page])
    topbar.html      # breadcrumb + search + actions
    onboarding-progress.html
```

## Conventions page agents must follow

1. **Body attribute** `<body data-page="dashboard">` — controls active sidebar item.
2. **Partial injection** — drop `<div data-include="/partials/sidebar.html"></div>` and `<div data-include="/partials/topbar.html"></div>`. They load via `include.js`. App boots on `pfc:partials-ready`.
3. **Fonts** — every HTML head must include the Google Fonts link from the comment block at the top of `tokens.css`.
4. **All numbers** use `<span class="mono">` or the `.mono` class — never the body grotesque for figures.
5. **KPI big numbers** should animate with `PFC_MOTION.countUp(el, value, { currency: "USD" })` on reveal.
6. **Reveal animations** — add `data-reveal` to any element you want to fade-up on scroll; `app.js` wires it automatically.
7. **No emoji** anywhere in copy or labels. Use the inline SVG icons established in `partials/sidebar.html` as the style reference (1.5 stroke, 18px).
8. **Absolute paths** — link CSS/JS as `/css/tokens.css`, `/js/app.js`, etc.

## Preview locally

```bash
cd repo
python -m http.server 8000
# open http://localhost:8000/
```

A simple `index.html` doesn't ship from the foundation step — the page agents
will create individual pages (dashboard, net-worth, debt-optimizer, etc.).
