# Feature Thumbnails — Midjourney Prompts (Human Relay)

These six feature-block thumbnails for `index.html` must be generated manually.
Recommended tool: **Midjourney v6.1 or higher** (best photographic restraint and
editorial color discipline for the Atelier Paper register).

**Global settings:** `--ar 3:2 --style raw --s 100`

Save each output into:
`C:\Users\Nitin\OneDrive\Documents\Claude\Obsedian demo\profinancecast2-build\repo\assets\imagery\`

with the exact filename specified. Target dimensions: **1200 x 800**.

**Fallback if Midjourney unavailable:** use Google AI Studio / Gemini / ChatGPT
with the same prompt and append "*editorial magazine photography, 35mm, no
text, no logos, no people*".

---

## 1. `feature-debt.jpg`
Page: `index.html` -> three-feature zig-zag, block 1 ("Debt optimizer")

> Editorial still life, single black ballpoint pen resting on a printed
> amortization schedule, warm bone paper, deep oxblood ink underlining one row.
> Wallpaper magazine. --ar 3:2 --style raw --s 100

## 2. `feature-salary.jpg`
Page: `index.html` -> three-feature zig-zag, block 2 ("Salary calculator")

> Macro of vintage brass desk calculator keys on warm bone surface, soft window
> light from left, no screen visible, color graded warm bone and oxblood.
> --ar 3:2 --style raw --s 100

## 3. `feature-goals.jpg`
Page: `index.html` -> three-feature zig-zag, block 3 ("Goals")

> Architectural photograph of three small ceramic bowls on a bone-linen
> tablecloth, each holding a different denomination of folded paper. Top-down.
> Editorial restraint. --ar 3:2 --style raw --s 100

## 4. `feature-networth.jpg`
Page: `index.html` -> referenced from net-worth feature block

> Single tall champagne flute, half-full, on a warm bone surface, soft afternoon
> light, casting a long oxblood-tinted shadow. Minimal.
> --ar 3:2 --style raw --s 100

## 5. `feature-forecast.jpg`
Page: `index.html` -> referenced from cash-forecast feature block

> Open weather almanac page on a warm desk, oxblood ribbon bookmark, brass
> compass partially visible at edge. --ar 3:2 --style raw --s 100

## 6. `feature-sage.jpg`
Page: `index.html` -> referenced from Sage (AI advisor) feature block

> A single empty Eames lounge chair in a sun-drenched study, warm bone walls,
> oxblood Persian rug edge visible. No people. --ar 3:2 --style raw --s 100

---

## Notes for downstream page-building agents

- All six paths above must be referenced from `index.html` and corresponding
  product pages. If the file is missing, the page MUST still render gracefully
  (use the `onerror` pattern documented in `RELAY-NEEDED.md`).
- Color audit: every output must read as bone + oxblood + graphite only. Reject
  any candidate containing emerald, navy, mustard yellow, or saturated wood
  tones. The point of these images is to *prove the palette*, not to decorate.
- No text, no logos, no faces, no hands in any frame. If MJ inserts any, reroll.
