"""Generate ProFinanceCast v4 hero imagery via Gemini / Imagen.

Tries the Google GenAI SDK (`google-genai`, the current path for Imagen) first,
then falls back to `google-generativeai` for `gemini-2.5-flash-image-preview`.

Reads GEMINI_API_KEY from the environment, then falls back to
%USERPROFILE%\.claude\settings.json -> env.GEMINI_API_KEY.

Writes JPEGs into repo/assets/imagery/.
"""

from __future__ import annotations

import base64
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "imagery"
OUT.mkdir(parents=True, exist_ok=True)

PROMPTS = {
    "hero-atmospheric.jpg": (
        "Editorial close-up photograph, 35mm film, warm bone-paper background "
        "filling the frame. On the paper, a single fountain-pen line sketch of "
        "a rising staircase rendered in deep oxblood ink, off-center to the "
        "right. Generous negative space top-left. Soft window light from the "
        "upper-left, faint paper grain visible. Color palette strictly warm "
        "bone, deep oxblood, and graphite. No people, no text, no logos. "
        "Style: Wallpaper magazine 2024, Kinfolk, Apartamento. Composition: "
        "rule of thirds, asymmetric. 2400x1400."
    ),
    "divider-ledger.jpg": (
        "Overhead shot of an open leather-bound ledger on a warm bone desk, "
        "half-filled with handwritten numerical columns in oxblood fountain "
        "pen. A brass paperweight in the upper corner. Natural window light. "
        "No faces. Editorial magazine photography, 35mm, no text overlay, no "
        "logos, no people."
    ),
    "divider-watch.jpg": (
        "Macro photograph of a single Swiss-precision pocket watch face, warm "
        "bone background, dial in deep oxblood and graphite, second hand "
        "frozen at 12. Studio lighting, no shadow. Editorial magazine "
        "photography, 35mm, no text, no logos, no people."
    ),
    "divider-reports.jpg": (
        "Architectural still life: a stack of three matte cream financial "
        "reports on a warm wooden surface, one ribbon bookmark in deep "
        "oxblood draping over the edge. Side light from a tall window. "
        "Vermeer color discipline. Editorial magazine photography, 35mm, no "
        "text, no logos, no people."
    ),
}


def load_api_key() -> str | None:
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    settings_path = Path(os.path.expanduser("~")) / ".claude" / "settings.json"
    if settings_path.exists():
        try:
            data = json.loads(settings_path.read_text(encoding="utf-8"))
            return (data.get("env") or {}).get("GEMINI_API_KEY")
        except Exception as exc:
            print(f"[warn] could not read settings.json: {exc}", file=sys.stderr)
    return None


def try_google_genai(api_key: str) -> bool:
    """Newer SDK path: supports Imagen and Gemini image preview."""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("[info] google-genai not installed; skipping Imagen path.")
        return False

    client = genai.Client(api_key=api_key)
    any_success = False

    # Prefer Imagen for photographic quality, fall back to Gemini image preview.
    for model_id in ("imagen-3.0-generate-002", "imagen-4.0-generate-001"):
        try:
            print(f"[try] {model_id}")
            for filename, prompt in PROMPTS.items():
                out_path = OUT / filename
                if out_path.exists() and out_path.stat().st_size > 0:
                    print(f"  [skip] {filename} (exists)")
                    continue
                result = client.models.generate_images(
                    model=model_id,
                    prompt=prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        aspect_ratio="16:9",
                    ),
                )
                if not result.generated_images:
                    print(f"  [empty] {filename}")
                    continue
                img_bytes = result.generated_images[0].image.image_bytes
                out_path.write_bytes(img_bytes)
                print(f"  [ok] {filename} ({len(img_bytes)} bytes)")
                any_success = True
            if any_success:
                return True
        except Exception as exc:
            print(f"  [fail] {model_id}: {exc}")
            continue

    # Gemini image preview via google-genai
    for model_id in (
        "gemini-3-pro-image-preview",
        "gemini-3.1-flash-image-preview",
        "gemini-2.5-flash-image",
        "gemini-2.5-flash-image-preview",
    ):
        try:
            print(f"[try] {model_id} via google-genai")
            for filename, prompt in PROMPTS.items():
                out_path = OUT / filename
                if out_path.exists() and out_path.stat().st_size > 0:
                    continue
                resp = client.models.generate_content(
                    model=model_id,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE", "TEXT"],
                    ),
                )
                wrote = False
                for cand in resp.candidates or []:
                    for part in cand.content.parts or []:
                        if getattr(part, "inline_data", None) and part.inline_data.data:
                            data = part.inline_data.data
                            if isinstance(data, str):
                                data = base64.b64decode(data)
                            out_path.write_bytes(data)
                            print(f"  [ok] {filename} ({len(data)} bytes)")
                            wrote = True
                            any_success = True
                            break
                    if wrote:
                        break
                if not wrote:
                    print(f"  [empty] {filename}")
            if any_success:
                return True
        except Exception as exc:
            print(f"  [fail] {model_id}: {exc}")
            continue

    return any_success


def try_google_generativeai(api_key: str) -> bool:
    """Older SDK path."""
    try:
        import google.generativeai as genai
    except ImportError:
        print("[info] google-generativeai not installed.")
        return False

    genai.configure(api_key=api_key)
    any_success = False
    for model_id in ("gemini-2.5-flash-image-preview", "gemini-2.0-flash-exp-image-generation"):
        try:
            print(f"[try] {model_id} via google-generativeai")
            model = genai.GenerativeModel(model_id)
            for filename, prompt in PROMPTS.items():
                out_path = OUT / filename
                if out_path.exists() and out_path.stat().st_size > 0:
                    continue
                resp = model.generate_content(prompt)
                wrote = False
                for cand in getattr(resp, "candidates", []) or []:
                    for part in cand.content.parts or []:
                        inline = getattr(part, "inline_data", None)
                        if inline and inline.data:
                            data = inline.data
                            if isinstance(data, str):
                                data = base64.b64decode(data)
                            out_path.write_bytes(data)
                            print(f"  [ok] {filename} ({len(data)} bytes)")
                            wrote = True
                            any_success = True
                            break
                    if wrote:
                        break
                if not wrote:
                    print(f"  [empty] {filename}")
            if any_success:
                return True
        except Exception as exc:
            print(f"  [fail] {model_id}: {exc}")
            continue
    return any_success


def main() -> int:
    api_key = load_api_key()
    if not api_key:
        print("[error] GEMINI_API_KEY not found in env or settings.json", file=sys.stderr)
        return 2

    print(f"[info] writing into {OUT}")
    if try_google_genai(api_key):
        print("[done] google-genai path succeeded.")
        return 0
    if try_google_generativeai(api_key):
        print("[done] google-generativeai path succeeded.")
        return 0
    print("[error] all SDK paths failed. See RELAY-NEEDED.md for manual prompts.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
