#!/usr/bin/env bash
# Switch the site's logo and palette: blueprint (E), monolith (D) or tribar (B).
#
# Sets data-brand and theme-color in the HTML pages and copies that brand's
# favicons, touch icon, social preview image and web manifest into public/.
# To compare first, open the site with ?brand=monolith (or tribar, blueprint).
#
# Usage: scripts/set-brand.sh blueprint|monolith|tribar
set -euo pipefail

brand="${1:-}"
case "$brand" in
  blueprint|monolith|tribar) ;;
  *) echo "usage: $0 blueprint|monolith|tribar" >&2; exit 1 ;;
esac

root="$(cd "$(dirname "$0")/.." && pwd)"
web="$root/brand/$brand/web"
public="$root/public"

for file in favicon.ico favicon.svg apple-touch-icon.png icon-192.png icon-512.png og-image.png site.webmanifest; do
  if [ ! -f "$web/$file" ]; then
    echo "missing $web/$file (run scripts/build-assets.sh)" >&2
    exit 1
  fi
  cp "$web/$file" "$public/$file"
done

color="$(sed -n 's/.*"theme_color": *"\(#[0-9A-Fa-f]*\)".*/\1/p' "$web/site.webmanifest")"
for page in "$public/index.html" "$public/404.html"; do
  sed -i.bak -E \
    -e "s/(<html lang=\"en\" data-brand=\")[a-z]+/\\1$brand/" \
    -e "s/(<meta name=\"theme-color\" content=\")#[0-9A-Fa-f]+/\\1$color/" \
    "$page"
  rm -f "$page.bak"
done

echo "Active brand: $brand ($color)"
