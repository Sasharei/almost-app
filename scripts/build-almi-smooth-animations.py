#!/usr/bin/env python3
"""Rebuild Almi's antialiased animated WebP assets from the original GIFs.

Requires Pillow and NumPy. The GIF palette has binary transparency and dark
fringe pixels; shrinking the opaque mask by one source pixel before feathering
removes that fringe while keeping the original frame timing and motion.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
NAMES = (
    "Cat_idle", "Cat_curious", "Cat_follows", "Cat_speaks", "Cat_happy",
    "Cat_happy_headshake", "Cat_sad", "Cat_oh_oh", "Cat_cry", "Cat_waving",
)
SKINS = ("classic", "green", "teal", "yellow", "purple")


def smooth_frame(frame):
    rgba = np.asarray(frame.convert("RGBA"), dtype=np.float32)
    alpha = Image.fromarray(rgba[:, :, 3].astype("uint8"), "L")
    core = alpha.filter(ImageFilter.MinFilter(3))
    soft_alpha = np.asarray(core.filter(ImageFilter.GaussianBlur(0.7)))
    weight = np.asarray(core.filter(ImageFilter.GaussianBlur(1.3)), dtype=np.float32)
    core_values = np.asarray(core, dtype=np.float32)
    output = np.empty_like(rgba, dtype=np.uint8)
    for channel in range(3):
        weighted = Image.fromarray(
            np.uint8(rgba[:, :, channel] * core_values / 255), "L"
        ).filter(ImageFilter.GaussianBlur(1.3))
        color = np.asarray(weighted, dtype=np.float32) * 255 / np.maximum(weight, 1)
        output[:, :, channel] = np.clip(color, 0, 255).astype("uint8")
    output[:, :, 3] = soft_alpha
    return Image.fromarray(output, "RGBA")


def main():
    for skin in SKINS:
        source_dir = ROOT / "assets" if skin == "classic" else ROOT / "assets" / "tamagotchi_skins" / skin
        target_dir = ROOT / "assets" / "almi_animations" / skin
        target_dir.mkdir(parents=True, exist_ok=True)
        for name in NAMES:
            source = source_dir / f"{name}.gif"
            image = Image.open(source)
            frames = []
            durations = []
            for frame in ImageSequence.Iterator(image):
                frames.append(smooth_frame(frame))
                durations.append(frame.info.get("duration", 100))
            target = target_dir / f"{name}.webp"
            frames[0].save(
                target, save_all=True, append_images=frames[1:], duration=durations,
                loop=image.info.get("loop", 0), quality=85, alpha_quality=100, method=3,
            )
            print(f"{skin}/{name}: {len(frames)} frames, {sum(durations)} ms, {target.stat().st_size} bytes", flush=True)


if __name__ == "__main__":
    main()
