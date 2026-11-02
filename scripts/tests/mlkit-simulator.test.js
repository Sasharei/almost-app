const test = require("node:test");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

test("ML Kit simulator conversion preserves originals, device builds and binary payloads", () => {
  execFileSync("python3", [path.join(__dirname, "mlkit-simulator.test.py")], {
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    stdio: "pipe",
  });
});
