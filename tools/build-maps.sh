#!/usr/bin/env bash
# Regenerate every map: defs -> .aseprite -> public JSON.
# Only needed while the .aseprite files are still generated from map-defs.mjs.
# Once you start editing them by hand in Aseprite, run `npm run map:export` instead.
set -euo pipefail
cd "$(dirname "$0")/.."
DEFS="$(mktemp -d)"
trap 'rm -rf "$DEFS"' EXIT

node tools/map-defs.mjs "$DEFS"
for def in "$DEFS"/*.json; do
  name="$(basename "$def" .json)"
  aseprite -b --script-param world="$def" \
    --script-param out="assets/maps/$name.aseprite" \
    --script tools/strings-to-aseprite.lua
  aseprite -b --script-param file="assets/maps/$name.aseprite" \
    --script-param out="public/maps/$name.json" \
    --script tools/export-map.lua
done
