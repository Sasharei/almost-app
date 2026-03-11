#!/bin/bash
set -euo pipefail

echo "Xcode Cloud post-clone: installing CocoaPods dependencies"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$REPO_ROOT/ios"

if [ ! -d "$IOS_DIR" ]; then
  echo "error: iOS directory not found at $IOS_DIR" >&2
  exit 1
fi

cd "$IOS_DIR"

if [ -f "Gemfile" ] && command -v bundle >/dev/null 2>&1; then
  echo "Using Bundler from ios/Gemfile"
  bundle check || bundle install
  bundle exec pod install
else
  pod install
fi
