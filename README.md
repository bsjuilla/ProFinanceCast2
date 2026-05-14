# ProFinanceCast2

A boutique forecasting house. Based in Europe. Independent.

This repository is a static-site rebuild of ProFinanceCast — pure HTML, CSS, and vanilla JavaScript. No backend, no build step, no external services. Deploy to Vercel as a static site.

## Stack

- Static HTML + CSS + vanilla JS
- No framework, no bundler, no Node dependencies
- Vercel for hosting (clean URLs via `vercel.json`)
- Hand-rolled SVG charts (no chart library)

## Local preview

Any static-file server works. From the repo root:

```
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Deploy

Connect this repo to Vercel and deploy. No configuration needed; `vercel.json` handles clean URLs and headers.

## Design system

- Palette: emerald-black `#0B1410` + ivory `#F4EFE5` + champagne gold `#D4AF6A`
- Type: Cormorant (display) + Inter (body) + JetBrains Mono (figures)
- Two themes: `data-theme="ivory"` for marketing surfaces, `data-theme="emerald"` for application surfaces

## Notes

- Auth, billing, and AI chat exist as UI only in this build; nothing is wired to a backend.
- Calculators (debt simulator, take-home pay) run client-side.
- Demo data uses a single canonical example household; numbers are not stored.
