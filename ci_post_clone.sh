#!/bin/bash
set -euo pipefail

# Keep compatibility for local/manual calls and delegate to Xcode Cloud layout.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/ci_scripts/ci_post_clone.sh"
