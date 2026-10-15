# Deploying votura.io

The site is static: deploying means serving the `public/` folder. The domain `votura.io` is registered at Namecheap; the public contact address is `contact@votura.io`.

## Choosing a host

Free-tier terms below were checked against each provider's documentation in October 2026.

| Host | Free tier | Company site allowed? | Custom headers | DNS stays at Namecheap? |
| --- | --- | --- | --- | --- |
| **Cloudflare Pages** (recommended) | Static requests and bandwidth unlimited; 20,000 files, 25 MiB per file | Yes | Yes (`_headers`) | No, nameservers move to Cloudflare |
| GitHub Pages | Public repository only; 1 GB site, 100 GB/month soft bandwidth limit | Grey zone (see below) | No | Yes |
| Netlify Free | 300 credits/month (about 15 GB of bandwidth, or 20 deploys); sites pause when credits run out | Yes | Yes | Yes |
| Vercel Hobby | n/a | **No**: Hobby is "non-commercial personal use only" | n/a | n/a |

Cloudflare is the recommendation:

- its static traffic is not metered;
- its terms have no non-commercial clause;
- it works with this private repository;
- its free Email Routing makes `contact@votura.io` work.

The cost is moving the domain's DNS from Namecheap to Cloudflare. The domain stays registered and renewed at Namecheap.

## Cloudflare Pages

1. **Add the domain to Cloudflare.**
   1. Create a free account at <https://dash.cloudflare.com>.
   2. Choose *Add a domain*, enter `votura.io` and pick the Free plan.
   3. If the scan imports Namecheap's parking records (a `www` CNAME to `parkingpage.namecheap.com`, or a URL redirect), delete them.
2. **Point Namecheap at Cloudflare.**
   1. If DNSSEC is on (Namecheap: Domain List → Manage → Advanced DNS → DNSSEC), turn it off first. Changing nameservers with DNSSEC active can take the domain offline.
   2. In Namecheap, go to Domain List → Manage → Nameservers and choose *Custom DNS*.
   3. Enter the two `…ns.cloudflare.com` names that Cloudflare shows and confirm with the green check mark.
   4. Activation usually takes minutes; Namecheap allows up to 24 hours.
3. **Connect this repository.**
   1. Go to Workers & Pages → Create application → Pages → *Connect to Git*.
   2. Sign in with GitHub and give the Cloudflare Pages app access to the `votura-io` organization (*Install & Authorize*).
   3. Select `votura-io/votura.io` and choose *Begin setup*.
   4. Enter these settings, then choose *Save and Deploy*:
      - Project name: `votura`
      - Production branch: `main`
      - Framework preset: None
      - Build command: leave empty
      - Build output directory: `public`
   5. Every push to `main` now deploys to production, and other branches get preview URLs on `*.votura.pages.dev`.

   Without Git, there are two other ways to deploy:
   - Drag the `public` folder into the dashboard (*Drag and drop your files*). A drag-and-drop project can't be connected to Git later.
   - Use the terminal:
     ```sh
     npx wrangler login
     npx wrangler pages project create votura --production-branch main
     npx wrangler pages deploy public --project-name votura
     ```
4. **Attach the domain.** In the Pages project, go to Custom domains → *Set up a custom domain* and enter `votura.io`. Cloudflare creates the DNS record and the TLS certificate itself.
5. **Redirect `www` to `votura.io`.** Follow <https://developers.cloudflare.com/pages/how-to/www-redirect/>. It takes a proxied `www` DNS record plus a redirect rule.
6. **Make `contact@votura.io` work.**
   1. In the Cloudflare dashboard, open `votura.io` → *Email Routing* and enable it. Cloudflare adds the MX, SPF and DKIM records itself.
   2. Add the inbox that should receive the mail as a destination, then confirm it via the verification email Cloudflare sends.
   3. Create a routing rule: custom address `contact`, action *Send to an email*, with that inbox as the destination.
   4. Send a test from a different account.

   Email Routing only receives mail; see *Later* for sending as `contact@votura.io`.
7. **Check.** Run `curl -sI https://votura.io | grep -i content-security`; it should print the policy from `public/_headers`.
   - If you turn on Cloudflare Web Analytics, add its hosts to that policy first.
   - If the address or the *Copy address* button looks wrong after deployment, check whether *Email Address Obfuscation* is enabled for the zone. It rewrites email addresses in the HTML, so turn it off if so.

Cloudflare's documentation now points new projects to Workers rather than Pages. Pages is still supported and is the simpler fit for a static site, because `404.html` is used automatically. With Workers, the custom 404 page needs a `wrangler.jsonc` containing `"assets": {"directory": "./public", "not_found_handling": "404-page"}`.

## GitHub Pages (alternative, DNS stays at Namecheap)

Trade-offs:
- GitHub's free plan only publishes **public** repositories, so this repository would have to be made public (or the organization upgraded).
- GitHub Pages cannot send the headers in `public/_headers`.
- GitHub's terms say Pages is not meant "to run your online business" or for sites "primarily directed at … commercial transactions". An informational company page is arguably fine, but that is a judgment call.

1. The site lives in `public/`, so deploy it with GitHub Actions:
   1. Go to Settings → Pages → Source and choose *GitHub Actions*.
   2. Add a workflow that uploads `public/`. GitHub's *Static HTML* starter works if its upload path is changed to `public`.
2. Set the custom domain to `votura.io` in the same settings page.
3. In Namecheap, go to Domain List → Manage → Advanced DNS. Delete the parking records, then add these:

   | Type | Host | Value |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA (optional) | `@` | `2606:50c0:8000::153`, `…8001::153`, `…8002::153`, `…8003::153` |
   | CNAME | `www` | `votura-io.github.io.` |

4. Verify the domain for the organization (Settings → Pages → *Add a domain*). Add the `_github-pages-challenge-…` TXT record it shows at Namecheap and keep the record in place. This stops anyone else from claiming the domain on GitHub.
5. Once the DNS check passes, tick *Enforce HTTPS*.
6. Forward email.
   1. In Namecheap, go to Advanced DNS → Mail Settings and choose *Email Forwarding*.
   2. Then go to the Domain tab → Redirect Email → *Add Forwarder*, and forward `contact` to the receiving inbox.
   3. This only works while Namecheap hosts the DNS.

## Later

- **Server-side features** (a contact form, an API): Cloudflare Workers Paid starts at $5 per month. The static site does not need it.
- **Sending mail as `contact@votura.io`:**
  - Zoho Mail has a free plan: up to 5 users, web and mobile apps only. It needs its own MX records, so it replaces Email Routing rather than running alongside it.
  - A paid mailbox (Google Workspace, Fastmail, Proton) is the cleaner option.
- **Taking payments:** Cloudflare's self-serve terms (§2.2.1(h)) bar collecting card details on a site that uses free services. Use the payment provider's hosted checkout page, or upgrade.
- **Legal pages:** depending on where Votura is registered, a legal notice (for example an Impressum in Germany or Austria) and a privacy notice may be required. The site sets no cookies and loads nothing from third parties, so the privacy notice can be short.
