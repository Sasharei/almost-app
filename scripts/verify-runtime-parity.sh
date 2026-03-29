#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

assert_contains() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if ! rg -n --fixed-strings "$pattern" "$file" >/dev/null; then
    echo "[FAIL] $label"
    echo "  expected pattern: $pattern"
    echo "  file: $file"
    exit 1
  fi
  echo "[OK] $label"
}

assert_contains "$ROOT_DIR/app.json" '"newArchEnabled": false' "Expo config uses legacy architecture"
assert_contains "$ROOT_DIR/android/gradle.properties" "newArchEnabled=false" "Android uses legacy architecture"
assert_contains "$ROOT_DIR/ios/Podfile.properties.json" '"newArchEnabled": "false"' "iOS uses legacy architecture"
assert_contains "$ROOT_DIR/App.js" 'UI_REFRESH_ROLLOUT_RC_KEY = "ui_refresh_v1_enabled"' "UI refresh rollout flag is defined"
assert_contains "$ROOT_DIR/App.js" "setUiRefreshRolloutEnabled" "UI refresh rollout flag is wired"

echo "Runtime parity checks passed."
