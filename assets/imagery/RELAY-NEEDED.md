# Atmospheric Imagery — Manual Relay Needed

The Gemini API key on this environment is on a free tier with **zero quota for
image-generation models** (`gemini-3-pro-image-preview`, `gemini-2.5-flash-image`,
`gemini-3.1-flash-image-preview` all returned 429 RESOURCE_EXHAUSTED). Imagen 4
returned 400 "available on paid plans only." See `scripts/generate-hero-images.py`
for the working SDK call once the key is upgraded.

## How to fix

**Option A — upgrade the API project to a paid plan**, then re-run:

```powershell
cd "C:\Users\Nitin\OneDrive\Documents\Claude\Obsedian demo\profinancecast2-build\repo"
python scripts/generate-hero-images.py
```

The script will skip any files already present, so partial runs are safe.

**Option B — generate manually** in Google AI Studio / ChatGPT / Midjourney
using the prompts below, and save the outputs into this folder with the exact
filenames listed.

---

## 1. `hero-atmospheric.jpg` (2400 x 1400)

Used by: `index.html` hero section background.
Recommended tool: Midjourney v6.1+ (`--ar 12:7 --style raw --s 100`) or Imagen 4.

> Editorial close-up photograph, 35mm film, warm bone-paper background filling
> the frame. On the paper, a single fountain-pen line sketch of a rising
> staircase rendered in deep oxblood ink, off-center to the right. Generous
> negative space top-left. Soft window light from the upper-left, faint paper
> grain visible. Color palette strictly warm bone, deep oxblood, and graphite.
> No people, no text, no logos. Style: Wallpaper magazine 2024, Kinfolk,
> Apartamento. Composition: rule of thirds, asymmetric.

## 2. `divider-ledger.jpg` (2000 x 1200)

Used by: landing-page section divider between hero and four-number demo.
Recommended tool: Midjourney v6.1+ (`--ar 5:3 --style raw --s 100`).

> Overhead shot of an open leather-bound ledger on a warm bone desk, half-filled
> with handwritten numerical columns in oxblood fountain pen. A brass
> paperweight in the upper corner. Natural window light. No faces. Editorial
> magazine photography, 35mm, no text overlay, no logos, no people.

## 3. `divider-watch.jpg` (2000 x 1200)

Used by: landing-page divider between features and pricing.
Recommended tool: Midjourney v6.1+ (`--ar 5:3 --style raw --s 100`).

> Macro photograph of a single Swiss-precision pocket watch face, warm bone
> background, dial in deep oxblood and graphite, second hand frozen at 12.
> Studio lighting, no shadow. Editorial magazine photography, 35mm, no text,
> no logos, no people.

## 4. `divider-reports.jpg` (2000 x 1200)

Used by: landing-page divider before FAQ.
Recommended tool: Midjourney v6.1+ (`--ar 5:3 --style raw --s 100`).

> Architectural still life: a stack of three matte cream financial reports on a
> warm wooden surface, one ribbon bookmark in deep oxblood draping over the
> edge. Side light from a tall window. Vermeer color discipline. Editorial
> magazine photography, 35mm, no text, no logos, no people.

---

## Downstream-agent fallback

Every page that references these images MUST tolerate them being absent.
Pattern to use in HTML:

```html
<picture>
  <source srcset="/repo/assets/imagery/hero-atmospheric.jpg" type="image/jpeg">
  <img
    alt=""
    aria-hidden="true"
    onerror="this.style.display='none'; this.parentElement.classList.add('img-missing')"
    loading="lazy">
</picture>
```

And in CSS, ensure the parent section still composes without the image (the
oxblood hairline divider, headline, and copy carry the page on their own).
