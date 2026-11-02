"""Native binary conversion guards. Uses synthetic objects, never SDK binaries."""
import importlib.util
from pathlib import Path
import struct
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "ios/patches/mlkit-simulator.py"
spec = importlib.util.spec_from_file_location("mlkit_simulator", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def object_file(cpu=0x0100000C, platform=2):
    header = struct.pack("<IIIIIIII", 0xFEEDFACF, cpu, 0, 1, 1, 24, 0, 0)
    return header + struct.pack("<IIIIII", 0x32, 24, platform, 0xF0500, 0x120000, 0) + b"instructions"


def archive(member):
    name = b"long-object-name.o"
    payload = name + member
    header = (b"#1/" + str(len(name)).encode()).ljust(16)
    header += b"0".ljust(12) + b"0".ljust(6) + b"0".ljust(6) + b"100644".ljust(8)
    header += str(len(payload)).encode().ljust(10) + b"`\n"
    return b"!<arch>\n" + header + payload + (b"\n" if len(payload) & 1 else b"")


class SimulatorFrameworkTests(unittest.TestCase):
    def test_only_platform_marker_changes(self):
        original = object_file()
        converted, count = module.simulator_binary(original)
        self.assertEqual(count, 1)
        self.assertEqual(len(converted), len(original))
        self.assertEqual([i for i in range(len(original)) if original[i] != converted[i]], [40])
        self.assertEqual(original[40], 2)
        self.assertEqual(converted[40], 7)
        self.assertEqual(module.simulator_binary(converted), (converted, 0))

    def test_universal_archive_preserves_x86_and_symbols(self):
        x86 = archive(object_file(cpu=0x01000007, platform=7))
        arm = archive(object_file())
        header_size = 48
        fat = struct.pack(">II", 0xCAFEBABE, 2)
        fat += struct.pack(">IIIII", 0x01000007, 3, header_size, len(x86), 0)
        fat += struct.pack(">IIIII", 0x0100000C, 0, header_size + len(x86), len(arm), 0)
        original = fat + x86 + arm
        result, count = module.simulator_binary(original)
        self.assertEqual(count, 1)
        self.assertEqual(result[:header_size + len(x86)], original[:header_size + len(x86)])
        self.assertEqual(len(result), len(original))
        self.assertIn(b"instructions", result)

    def test_platform_neutral_model_object_stays_unchanged(self):
        obj = struct.pack("<IIIIIIII", 0xFEEDFACF, 0x0100000C, 0, 1, 0, 0, 0, 0)
        self.assertEqual(module.simulator_binary(obj), (obj, 0))

    def test_rejects_corrupt_and_wrong_platform_objects(self):
        for obj in [b"", object_file()[:35], object_file(platform=1), archive(object_file())[:-8]]:
            with self.assertRaises(ValueError):
                module.simulator_binary(obj)

    def test_originals_remain_identical_and_repeat_uses_cache(self):
        with tempfile.TemporaryDirectory(prefix="almost-mlkit-test-") as temporary:
            root = Path(temporary)
            pods = root / "Pods"
            framework = pods / "MLImage/Frameworks/MLImage.framework"
            framework.mkdir(parents=True)
            binary = framework / "MLImage"
            binary.write_bytes(object_file())
            (framework / "model.bin").write_bytes(b"model data")
            output = root / "DerivedData/Simulator"
            module.prepare(pods, output)
            copied = output / "MLImage.framework/MLImage"
            before = copied.stat().st_mtime_ns
            module.prepare(pods, output)
            self.assertEqual(copied.stat().st_mtime_ns, before)
            self.assertEqual(binary.read_bytes(), object_file())
            self.assertEqual((output / "MLImage.framework/model.bin").read_bytes(), b"model data")
            with self.assertRaises(ValueError):
                module.prepare(pods, pods / "Copies")

    def test_device_invocation_does_not_read_or_create_files(self):
        import os
        with tempfile.TemporaryDirectory(prefix="almost-mlkit-device-test-") as temporary:
            root = Path(temporary)
            subprocess.run(["python3", str(SCRIPT), "--pods-root", str(root / "MissingPods"),
                            "--output", str(root / "Output")],
                           check=True, env={**os.environ, "PLATFORM_NAME": "iphoneos"})
            self.assertFalse((root / "Output").exists())


if __name__ == "__main__":
    unittest.main()
