#!/bin/bash
set -euo pipefail

echo "Running CocoaPods install..."
cd ios
pod install
