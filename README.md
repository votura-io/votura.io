# votura.io

Source of the [Votura](https://votura.io) website: a single static page for a cryptography research, consulting and engineering company.

- Plain HTML, CSS and JavaScript, with no framework and no build step.
- No cookies, no analytics, no third-party requests; fonts are self-hosted.
- Strict Content-Security-Policy and other security headers in [`public/_headers`](public/_headers).

## Layout

```
public/                  the website: this folder is what gets deployed
  index.html, 404.html
  _headers               security headers (read by Netlify; Cloudflare Pages uses the same format)
  assets/css/            style.css (color and type tokens at the top), noscript.css
  assets/js/main.js      copy button, footer year, lattice animation
  assets/fonts/          Sora and Source Serif 4, SIL Open Font License 1.1
  assets/img/lattice.svg still of the lattice for visitors without JavaScript
  favicons, og-image.png, site.webmanifest, robots.txt, sitemap.xml, .well-known/security.txt
brand/                   logo kit: tribar/, monolith/, blueprint/
                         (SVG logos, generated web icons, github-avatar.png)
scripts/
  serve.py               local preview with the production headers
  set-brand.sh           switch the whole site to another logo
  build-assets.sh        regenerate icons, avatars and social images from the SVGs
  brand.mjs              logo geometry and generators used by build-assets.sh
docs/deployment.md       hosting, DNS and email setup
netlify.toml             Netlify settings: publish public/, no build step, 404 page
LICENSE, NOTICE          Apache License 2.0 and notices (brand/ has its own LICENSE)
```

## Run locally

```sh
python3 scripts/serve.py
```

Then open <http://localhost:8765>. The server applies the headers from `public/_headers`, so the preview runs under the production Content-Security-Policy, and unknown paths return `404.html`.

## Content

All of the copy is in `public/index.html`: the hero, *What we do* (`#services`) and *Get in touch* (`#contact`). Keep it free of claims that need evidence (clients, team, numbers) until each one can be backed.

- Analytics, embeds or external fonts must also be allowed in the Content-Security-Policy in `public/_headers`; otherwise browsers block them.
- `public/.well-known/security.txt` expires on 2027-10-14 (RFC 9116 requires an expiry date). Renew it every year.

## Logo

The site uses the **Tribar** logo (B from the logo concepts). The other two shortlisted logos, Monolith and Blueprint, stay in `brand/` together with their color themes.

- `scripts/set-brand.sh <tribar|monolith|blueprint>` switches the whole site to another logo, including the HTML, favicons, social image and manifest.
- `scripts/build-assets.sh` regenerates icons, avatars and social images after a logo or color change. It needs `node`, `rsvg-convert`, ImageMagick and Google Chrome.
- `brand/tribar/github-avatar.png` is the 512×512 profile picture for GitHub and similar services.

## Deployment

The site is hosted on Netlify's free plan, deployed from this repository:

- `netlify.toml` sets the publish directory to `public` and needs no build command.
- Pushes to `main` deploy to production; other branches and pull requests get free previews.
- The DNS for `votura.io` stays at Namecheap, next to the Proton Mail records.

[`docs/deployment.md`](docs/deployment.md) covers the full setup, the free-tier credit budget, and the alternatives that were considered.

## License

The code in this repository is licensed under the [Apache License 2.0](LICENSE); see also [`NOTICE`](NOTICE). The exceptions:

- **Brand:** the Votura name and logos are not licensed. Apache-2.0 grants no trademark rights (section 6), and the logo artwork is © Votura, all rights reserved. That covers [`brand/`](brand/LICENSE) and the logo graphics, icons and images derived from it in `public/`.
- **Fonts:** the fonts in `public/assets/fonts/` are third-party works under the SIL Open Font License 1.1.
