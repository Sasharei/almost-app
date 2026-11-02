#!/usr/bin/env python3
"""Build the tintable care glow without a screen-sized Android SVG bitmap."""
import math
import struct
import zlib
from pathlib import Path

SIZE = 256


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))


def main():
    rows = bytearray()
    for y in range(SIZE):
        rows.append(0)  # PNG filter: none
        for x in range(SIZE):
            radius = math.hypot(((x + 0.5) / SIZE - 0.70) / 0.65,
                                ((y + 0.5) / SIZE - 0.28) / 0.55)
            alpha = round(255 * 0.16 * max(0, 1 - radius))
            rows.extend((255, 255, 255, alpha))
    header = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
    png += chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b"")
    target = Path(__file__).resolve().parents[1] / "assets/almi_room/care_glow.png"
    target.write_bytes(png)


if __name__ == "__main__":
    main()
