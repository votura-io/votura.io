#!/usr/bin/env bash
# Regenerate every derived brand asset from the logo SVGs in brand/:
#   brand/<name>/web/  favicon.svg, favicon.ico, apple-touch-icon.png,
#                      icon-192.png, icon-512.png, og-image.png, site.webmanifest
#   brand/<name>/github-avatar.png (512x512 profile picture for GitHub etc.)
#   public/assets/img/lattice.svg (still of the lattice, shown without JavaScript)
# then re-applies the active brand to public/ with set-brand.sh.
#
# Only needed after changing a logo or brand color. Requires node, rsvg-convert
# (brew install librsvg), magick (brew install imagemagick) and Google Chrome
# (set CHROME=/path/to/chrome if it is not in the default macOS location).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

node "$root/scripts/brand.mjs" "$root" "$tmp"

for brand in blueprint monolith tribar; do
  web="$root/brand/$brand/web"
  for px in 16 32 48; do
    rsvg-convert -w "$px" -h "$px" "$web/favicon.svg" -o "$tmp/$brand-$px.png"
  done
  magick "$tmp/$brand-16.png" "$tmp/$brand-32.png" "$tmp/$brand-48.png" "$web/favicon.ico"
  rsvg-convert -w 180 -h 180 "$tmp/$brand-touch.svg" -o "$web/apple-touch-icon.png"
  rsvg-convert -w 192 -h 192 "$root/brand/$brand/app-icon.svg" -o "$web/icon-192.png"
  rsvg-convert -w 512 -h 512 "$root/brand/$brand/app-icon.svg" -o "$web/icon-512.png"
  rsvg-convert -w 512 -h 512 "$tmp/$brand-avatar.svg" -o "$root/brand/$brand/github-avatar.png"
  "$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --virtual-time-budget=3000 --window-size=1200,630 \
    --screenshot="$web/og-image.png" "file://$tmp/og-$brand.html" >/dev/null 2>&1
  echo "built brand/$brand/web"
done

active="$(sed -n 's/.*<html lang="en" data-brand="\([a-z]*\)".*/\1/p' "$root/public/index.html")"
"$root/scripts/set-brand.sh" "${active:-blueprint}"
