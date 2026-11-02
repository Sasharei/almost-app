#!/usr/bin/env python3
"""Generate density-correct Android loading/background previews. Requires Pillow."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SKINS = ("classic", "green", "teal", "yellow", "purple")


def main():
    target = ROOT / "assets/almi_android_previews"
    target.mkdir(exist_ok=True)
    for skin in SKINS:
        source = ROOT / "assets/Cat_mascot.png" if skin == "classic" else (
            ROOT / f"assets/tamagotchi_skins/previews/{skin}.png"
        )
        image = Image.open(source).convert("RGBA")
        for scale in (1, 2, 3):
            suffix = "" if scale == 1 else f"@{scale}x"
            image.resize((128 * scale, 128 * scale), Image.Resampling.LANCZOS).save(
                target / f"{skin}{suffix}.png", optimize=True
            )
    # Bound old-Android room layers while retaining all furniture/backgrounds.
    for name in ("soft_room", "observatory", "garden", "bed", "bowl", "rug", "window", "shelf"):
        image = Image.open(ROOT / f"assets/almi_room/{name}.webp").convert("RGBA")
        limit = 768 if name in ("soft_room", "observatory", "garden") else 384
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        image.save(target / f"room_{name}.webp", quality=92, method=6)
    # The overlay need not exceed the 500px animated mascot on old Java heaps.
    Image.open(ROOT / "assets/almi_room/dust_smudges.png").convert("RGBA").resize(
        (512, 512), Image.Resampling.LANCZOS
    ).save(target / "dust.png", optimize=True)


if __name__ == "__main__":
    main()
