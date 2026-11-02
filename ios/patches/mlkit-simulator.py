#!/usr/bin/env python3
"""Prepare isolated ML Kit framework copies for Apple Silicon Simulator.

Google's static frameworks contain arm64 device objects and x86_64 simulator
objects. Only the copies' arm64 LC_BUILD_VERSION platform fields are changed.
The Pods originals, machine instructions, symbols and archive offsets stay intact.
Background: https://issuetracker.google.com/issues/178965151
"""

import argparse
import hashlib
import os
from pathlib import Path
import shutil
import struct


def simulator_binary(source):
    data = bytearray(source)
    changed = 0
    arm64_objects = 0

    def macho(start, end):
        nonlocal changed, arm64_objects
        if start + 32 > end or data[start:start + 4] != b"\xcf\xfa\xed\xfe":
            return
        cpu, _, filetype, count, size = struct.unpack_from("<IIIII", data, start + 4)
        if cpu != 0x0100000C:
            return
        arm64_objects += 1
        cursor = start + 32
        limit = cursor + size
        if limit > end:
            raise ValueError("Invalid Mach-O load command bounds")
        found = False
        for _ in range(count):
            if cursor + 8 > limit:
                raise ValueError("Truncated Mach-O load command")
            command, length = struct.unpack_from("<II", data, cursor)
            if length < 8 or cursor + length > limit:
                raise ValueError("Invalid Mach-O load command length")
            if command == 0x32:  # LC_BUILD_VERSION
                if length < 24:
                    raise ValueError("Truncated LC_BUILD_VERSION")
                platform = struct.unpack_from("<I", data, cursor + 8)[0]
                if platform not in (2, 7):
                    raise ValueError(f"Unexpected arm64 platform: {platform}")
                if platform == 2:
                    struct.pack_into("<I", data, cursor + 8, 7)
                    changed += 1
                found = True
            if command in (0x24, 0x25, 0x2F, 0x30):
                raise ValueError("Legacy platform command requires a reviewed converter")
            cursor += length
        # Google's prelinked OCR model object has no platform command at all.
        # It is already platform-neutral. Do not invent or insert load commands.
        if not found and filetype != 1:
            raise ValueError("Missing arm64 LC_BUILD_VERSION")

    def archive(start, end):
        if data[start:start + 8] != b"!<arch>\n":
            macho(start, end)
            return
        cursor = start + 8
        while cursor < end:
            if cursor + 60 > end or data[cursor + 58:cursor + 60] != b"`\n":
                raise ValueError("Invalid archive member header")
            length = int(data[cursor + 48:cursor + 58])
            body = cursor + 60
            member_end = body + length
            if member_end > end:
                raise ValueError("Invalid archive member bounds")
            name = bytes(data[cursor:cursor + 16]).strip()
            name_size = int(name[3:]) if name.startswith(b"#1/") else 0
            if name_size > length:
                raise ValueError("Invalid archive member name")
            macho(body + name_size, member_end)
            cursor = member_end + (length & 1)

    if len(data) < 8:
        raise ValueError("Empty framework binary")
    magic, count = struct.unpack_from(">II", data)
    if magic in (0xCAFEBABE, 0xCAFEBABF):
        width = 20 if magic == 0xCAFEBABE else 32
        if 8 + count * width > len(data):
            raise ValueError("Invalid universal binary header")
        for index in range(count):
            offset = 8 + index * width
            cpu = struct.unpack_from(">I", data, offset)[0]
            start, size = struct.unpack_from(">II" if width == 20 else ">QQ", data, offset + 8)
            if start + size > len(data):
                raise ValueError("Invalid universal binary slice")
            if cpu == 0x0100000C:
                archive(start, start + size)
    else:
        archive(0, len(data))
    if not arm64_objects:
        raise ValueError("Missing arm64 Mach-O objects")
    return bytes(data), changed


def prepare(pods_root, output):
    if output == pods_root or pods_root in output.parents:
        raise ValueError("Simulator output must be outside the original Pods tree")
    frameworks = sorted(pods_root.glob("ML*/Frameworks/*.framework"))
    if not frameworks:
        raise ValueError("No ML Kit frameworks found")
    output.mkdir(parents=True, exist_ok=True)
    for framework in frameworks:
        binary = framework / framework.stem
        original = binary.read_bytes()
        digest = hashlib.sha256(original).hexdigest()
        destination = output / framework.name
        stamp = output / (framework.name + ".sha256")
        if stamp.exists() and stamp.read_text() == digest and (destination / framework.stem).exists():
            continue
        converted, count = simulator_binary(original)
        temporary = output / (framework.name + ".preparing")
        if temporary.exists():
            shutil.rmtree(temporary)
        shutil.copytree(framework, temporary, symlinks=True)
        target = temporary / framework.stem
        target.chmod(target.stat().st_mode | 0o200)
        target.write_bytes(converted)
        # Static framework copies are linked into the app, not embedded/signed.
        if (temporary / "_CodeSignature").exists():
            shutil.rmtree(temporary / "_CodeSignature")
        if destination.exists():
            shutil.rmtree(destination)
        temporary.rename(destination)
        stamp.write_text(digest)
        print(f"[ML Kit Simulator] Prepared {framework.name}: {count} platform markers")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pods-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if os.environ.get("PLATFORM_NAME") == "iphonesimulator":
        prepare(args.pods_root.resolve(), args.output.resolve())
