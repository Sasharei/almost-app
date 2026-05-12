#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKINS=(green teal yellow purple)
GIF_SIZE="360x360"
GIF_COLORS="96"
WEBP_QUALITY="85"

if ! command -v gifsicle >/dev/null 2>&1; then
  echo "gifsicle is required" >&2
  exit 1
fi

if ! command -v gif2webp >/dev/null 2>&1; then
  echo "gif2webp is required" >&2
  exit 1
fi

for skin in "${SKINS[@]}"; do
  src_dir="$ROOT_DIR/assets/tamagotchi_skins/$skin"
  gif_tmp="$(mktemp -d)"
  webp_tmp="$(mktemp -d)"

  cp "$src_dir"/*.gif "$gif_tmp"/

  for gif_path in "$gif_tmp"/*.gif; do
    gifsicle --resize-fit "$GIF_SIZE" --colors "$GIF_COLORS" -O3 "$gif_path" -o "$gif_path"
  done

  for gif_path in "$gif_tmp"/*.gif; do
    base_name="$(basename "$gif_path" .gif)"
    gif2webp -mixed -mt -q "$WEBP_QUALITY" "$gif_path" -o "$webp_tmp/$base_name.webp" >/dev/null 2>&1
  done

  cp "$gif_tmp"/*.gif "$src_dir"/
  cp "$webp_tmp"/*.webp "$src_dir"/
done
