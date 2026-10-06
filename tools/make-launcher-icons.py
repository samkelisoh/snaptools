#!/usr/bin/env python3
"""Generate Android launcher icons from store-assets/icon-512.png.

The workflow deletes and regenerates android/ on every build, so Capacitor's
placeholder icon comes back each time. This script runs after `cap add` and
overwrites the mipmaps with the real brand icon.

Produces, for every density:
  ic_launcher.png            legacy square  (48dp)
  ic_launcher_round.png      legacy round   (48dp)
  ic_launcher_foreground.png adaptive layer (108dp, symbol in the 66% safe zone)

...and sets the adaptive background colour to the brand purple so the icon
isn't a white square with a floating glyph on Android 8+.
"""
import sys
import pathlib
import xml.etree.ElementTree as ET

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is required:  pip install pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "store-assets" / "icon-512.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

# Brand background for the adaptive icon (sampled from the icon's gradient).
BRAND_BG = "#7A3BE0"

# density -> (legacy px, adaptive foreground px)
DENSITIES = {
    "mdpi":    (48, 108),
    "hdpi":    (72, 162),
    "xhdpi":   (96, 216),
    "xxhdpi":  (144, 324),
    "xxxhdpi": (192, 432),
}


def main():
    if not SRC.exists():
        sys.exit(f"missing source icon: {SRC}")
    if not RES.exists():
        sys.exit(f"missing android res dir: {RES}\nRun `npx cap add android` first.")

    src = Image.open(SRC).convert("RGB")
    written = 0

    for density, (legacy, fg_size) in DENSITIES.items():
        d = RES / f"mipmap-{density}"
        if not d.exists():
            print(f"  skip {density} (no such dir)")
            continue

        # --- legacy square ---
        sq = src.resize((legacy, legacy), Image.LANCZOS)
        sq.save(d / "ic_launcher.png", "PNG")

        # --- legacy round ---
        rnd = sq.convert("RGBA")
        mask = Image.new("L", (legacy, legacy), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, legacy - 1, legacy - 1), fill=255)
        out = Image.new("RGBA", (legacy, legacy), (0, 0, 0, 0))
        out.paste(rnd, (0, 0), mask)
        out.save(d / "ic_launcher_round.png", "PNG")

        # --- adaptive foreground ---
        # Android crops adaptive icons hard; only the central 66% is guaranteed
        # visible, so the artwork is inset rather than filling the layer.
        fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        inner = int(fg_size * 0.66)
        fg.paste(src.resize((inner, inner), Image.LANCZOS),
                 ((fg_size - inner) // 2, (fg_size - inner) // 2))
        fg.save(d / "ic_launcher_foreground.png", "PNG")

        written += 3
        print(f"  {density}: {legacy}px legacy + {fg_size}px adaptive")

    # --- adaptive background colour ---
    bg_xml = RES / "values" / "ic_launcher_background.xml"
    if bg_xml.exists():
        tree = ET.parse(bg_xml)
        for node in tree.getroot().iter("color"):
            if node.get("name") == "ic_launcher_background":
                node.text = BRAND_BG
        tree.write(bg_xml, encoding="utf-8", xml_declaration=True)
        print(f"  adaptive background -> {BRAND_BG}")

    print(f"✅ wrote {written} launcher icons")


if __name__ == "__main__":
    main()
