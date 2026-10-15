// Votura brand geometry, and the sources for every generated brand asset.
//
// The logo SVGs in brand/<name>/ (exported from the round-2 logo concepts:
// B Tribar, D Monolith, E Blueprint) are the source of truth; this script reads
// their path data and writes:
//   brand/<name>/web/favicon.svg        favicon (mark enlarged for small sizes)
//   brand/<name>/web/site.webmanifest   web app manifest with the brand color
//   public/assets/img/lattice.svg       still of the lattice figure, shown without JavaScript
//   <tmp>/<name>-touch.svg              full-bleed icon for apple-touch-icon.png
//   <tmp>/<name>-avatar.svg             profile picture, rendered to brand/<name>/github-avatar.png
//   <tmp>/og-<name>.html                1200x630 page, screenshotted to og-image.png
//
// Usage: node scripts/brand.mjs <project-root> <tmp-dir>
//        node scripts/brand.mjs --lockup      (prints the inline header lockup SVG)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const BRANDS = {
  blueprint: { field: '#2B1585', mark: 'white lines', name: 'Blueprint' },
  monolith: { field: '#5A2BF0', mark: 'solid white', name: 'Monolith' },
  tribar: { field: '#10112B', mark: 'three tones', name: 'Tribar' },
};
const TRIBAR_TONES_ON_DARK = ['#5552FF', '#C3C8FF', '#2B2AA6'];
const BLUEPRINT_STROKE = 3.3;

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const markPaths = (svg) => [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
const TRIBAR = markPaths(read('brand/tribar/mark.svg'));
const MONOLITH = markPaths(read('brand/monolith/mark.svg'));
const WORDMARK = read('brand/monolith/lockup.svg').match(/translate\(287\.863 142\)" d="([^"]+)"/)[1];
if (TRIBAR.length !== 3 || MONOLITH.length !== 3) throw new Error('unexpected mark SVGs in brand/');

// One brand's mark as an SVG group. `color` is used by the one-color marks.
function markGroup(brand, transform, { color = '#FFFFFF', stroke = BLUEPRINT_STROKE } = {}) {
  if (brand === 'blueprint') {
    return `<g transform="${transform}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="round">${TRIBAR.map((d) => `<path d="${d}"/>`).join('')}</g>`;
  }
  if (brand === 'monolith') {
    return `<g transform="${transform}" fill="${color}">${MONOLITH.map((d) => `<path d="${d}"/>`).join('')}</g>`;
  }
  return `<g transform="${transform}">${TRIBAR.map((d, i) => `<path fill="${TRIBAR_TONES_ON_DARK[i]}" d="${d}"/>`).join('')}</g>`;
}

// Square icon. `large` enlarges the mark to 78% of the width (for favicons);
// `bleed` drops the rounded corners (iOS applies its own mask); `avatar` is
// full-bleed with a smaller mark that survives a circular crop (GitHub, social).
function icon(brand, { large = false, bleed = false, avatar = false } = {}) {
  const stroke = brand === 'blueprint' && (large || avatar) ? 5.5 : BLUEPRINT_STROKE;
  const pad = brand === 'blueprint' ? stroke / 2 : 0;
  const width = large ? 400 : avatar ? 290 : 317.4;
  const scale = width / (100 + 2 * pad);
  const height = (86.6 + 2 * pad) * scale;
  const x = (512 - width) / 2 + pad * scale;
  const y = 256 - height / 2 - (large ? 12 : avatar ? 8 : 15.4) + pad * scale;
  const rx = bleed || avatar ? 0 : 115.2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${rx}" fill="${BRANDS[brand].field}"/>${markGroup(brand, `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})`, { stroke })}</svg>\n`;
}

// Inline lockup for the site header and footer: all three marks, CSS shows one.
export function inlineLockup() {
  const tribarGroup = TRIBAR.map((d, i) => `<path class="t${i + 1}" fill="${TRIBAR_TONES_ON_DARK[i]}" d="${d}"/>`).join('');
  return [
    '<svg class="lockup" viewBox="4 4 841.56 200" aria-hidden="true">',
    `<g class="mark mark--blueprint" transform="translate(7.671 7.671) scale(2.22463)" fill="none" stroke="currentColor" stroke-width="${BLUEPRINT_STROKE}" stroke-linejoin="round" display="none">${TRIBAR.map((d) => `<path d="${d}"/>`).join('')}</g>`,
    `<g class="mark mark--monolith" transform="translate(4 4) scale(2.3094)" fill="currentColor" display="none">${MONOLITH.map((d) => `<path d="${d}"/>`).join('')}</g>`,
    `<g class="mark mark--tribar" transform="translate(4 4) scale(2.3094)">${tribarGroup}</g>`,
    `<path class="wordmark" transform="translate(291.863 146)" fill="currentColor" d="${WORDMARK}"/>`,
    '</svg>',
  ].join('');
}

// Lagrange–Gauss reduction on the hexagonal lattice, in exact integer
// coordinates (same algorithm as public/assets/js/main.js).
const H = Math.sqrt(3) / 2;
const ip = (u, v) => 2 * u[0] * v[0] + u[0] * v[1] + u[1] * v[0] + 2 * u[1] * v[1];
const toPlane = (v) => [v[0] + v[1] / 2, v[1] * H];
function reduce(b1, b2) {
  const bases = [[b1, b2]];
  for (let guard = 0; guard < 64; guard += 1) {
    if (ip(b2, b2) < ip(b1, b1)) [b1, b2] = [b2, b1];
    const mu = Math.floor((2 * ip(b1, b2) + ip(b1, b1)) / (2 * ip(b1, b1)));
    if (mu === 0) break;
    b2 = [b2[0] - mu * b1[0], b2[1] - mu * b1[1]];
    bases.push([b1, b2]);
  }
  return bases;
}

// The lattice figure as a still: the starting basis (dashed) and the reduced basis.
function latticeSvg() {
  const size = 480;
  const s = size / 12;
  const start = [[2, 1], [3, 2]];
  const bases = reduce(...start);
  const corners = bases.flatMap(([a, b]) => [a, b, [a[0] + b[0], a[1] + b[1]]].map(toPlane)).concat([[0, 0]]);
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const ox = size / 2 - cx * s;
  const oy = size / 2 + cy * s;
  const X = (p) => (ox + p[0] * s).toFixed(1);
  const Y = (p) => (oy - p[1] * s).toFixed(1);
  const out = [];
  for (let j = -20; j <= 20; j += 1) {
    for (let i = -20; i <= 20; i += 1) {
      const x = ox + (i + j / 2) * s;
      const y = oy - j * H * s;
      const d = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
      if (d >= 0.98) continue;
      const fade = d < 0.55 ? 1 : 1 - (d - 0.55) / 0.43;
      out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.8" fill-opacity="${(0.55 * fade * fade).toFixed(3)}"/>`);
    }
  }
  const quad = ([a, b]) => {
    const [p, q] = [toPlane(a), toPlane(b)];
    const r = [p[0] + q[0], p[1] + q[1]];
    return `M${X([0, 0])} ${Y([0, 0])}L${X(p)} ${Y(p)}L${X(r)} ${Y(r)}L${X(q)} ${Y(q)}Z`;
  };
  const [r1, r2] = bases[bases.length - 1].map(toPlane);
  const arrow = (p) => {
    const [x0, y0, x1, y1] = [ox, oy, ox + p[0] * s, oy - p[1] * s];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const [ux, uy] = [(x1 - x0) / len, (y1 - y0) / len];
    const head = Math.min(10, len * 0.35);
    const wing = head * 0.42;
    const f = (n) => n.toFixed(1);
    return `<path d="M${f(x0)} ${f(y0)}L${f(x1 - ux * head * 0.7)} ${f(y1 - uy * head * 0.7)}" stroke="#fff" stroke-width="1.75" stroke-linecap="round"/>`
      + `<path d="M${f(x1)} ${f(y1)}L${f(x1 - ux * head - uy * wing)} ${f(y1 - uy * head + ux * wing)}L${f(x1 - ux * head + uy * wing)} ${f(y1 - uy * head - ux * wing)}Z" fill="#fff"/>`;
  };
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`,
    `<g fill="#fff">${out.join('')}</g>`,
    `<path d="${quad(start)}" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.25" stroke-dasharray="4 5"/>`,
    `<path d="${quad(bases[bases.length - 1])}" fill="#fff" fill-opacity="0.18"/>`,
    arrow(r1),
    arrow(r2),
    `<circle cx="${X([0, 0])}" cy="${Y([0, 0])}" r="3.3" fill="#fff"/>`,
    '</svg>\n',
  ].join('');
}

function ogHtml(brand) {
  const fonts = pathToFileURL(join(ROOT, 'public/assets/fonts')).href;
  const lattice = pathToFileURL(join(ROOT, 'public/assets/img/lattice.svg')).href;
  const lockup = inlineLockup()
    .replace('class="lockup"', 'class="lockup" width="420"')
    .replace(/ display="none"/g, '');
  return `<!doctype html><html lang="en" data-brand="${brand}"><head><meta charset="utf-8"><style>
@font-face { font-family: Sora; src: url("${fonts}/sora-latin.woff2") format("woff2"); font-weight: 100 800; }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
body { position: relative; background: ${BRANDS[brand].field}; color: #fff; font-family: Sora, sans-serif; }
.lockup { position: absolute; top: 88px; left: 88px; height: auto; }
.lockup .mark { display: none; }
[data-brand="blueprint"] .mark--blueprint, [data-brand="monolith"] .mark--monolith, [data-brand="tribar"] .mark--tribar { display: inline; }
.mark--blueprint path { stroke: #fff; }
.mark--monolith, .wordmark { fill: #fff; }
.t1 { fill: ${TRIBAR_TONES_ON_DARK[0]}; } .t2 { fill: ${TRIBAR_TONES_ON_DARK[1]}; } .t3 { fill: ${TRIBAR_TONES_ON_DARK[2]}; }
h1 { position: absolute; left: 88px; bottom: 92px; width: 640px; margin: 0; font-size: 62px; font-weight: 600; line-height: 1.05; letter-spacing: -0.03em; }
img { position: absolute; top: 35px; right: 10px; width: 560px; height: 560px; }
</style></head><body>${lockup}<h1>Cryptography, from proof to production.</h1><img src="${lattice}" alt=""></body></html>\n`;
}

function manifest(brand) {
  return `${JSON.stringify({
    name: 'Votura',
    short_name: 'Votura',
    description: 'Cryptography research, consulting and engineering.',
    start_url: '/',
    display: 'browser',
    theme_color: BRANDS[brand].field,
    background_color: BRANDS[brand].field,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, null, 2)}\n`;
}

if (process.argv[2] === '--lockup') {
  process.stdout.write(inlineLockup());
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [root, tmp] = process.argv.slice(2);
  if (!root || !tmp) throw new Error('usage: node scripts/brand.mjs <project-root> <tmp-dir>');
  writeFileSync(join(root, 'public/assets/img/lattice.svg'), latticeSvg());
  for (const brand of Object.keys(BRANDS)) {
    const web = join(root, 'brand', brand, 'web');
    mkdirSync(web, { recursive: true });
    writeFileSync(join(web, 'favicon.svg'), icon(brand, { large: true }));
    writeFileSync(join(web, 'site.webmanifest'), manifest(brand));
    writeFileSync(join(tmp, `${brand}-touch.svg`), icon(brand, { bleed: true }));
    writeFileSync(join(tmp, `${brand}-avatar.svg`), icon(brand, { avatar: true }));
    writeFileSync(join(tmp, `og-${brand}.html`), ogHtml(brand));
  }
}
