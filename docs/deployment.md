# Deploying votura.io

The site is static: deploying it means publishing the `public/` folder. It is hosted on **Netlify's free plan** and deployed from this public GitHub repository.

The domain `votura.io` stays registered at Namecheap, and so does its DNS. Namecheap's DNS also holds the records that make Proton Mail work for `@votura.io`.

## Why Netlify

Checked against each provider's documentation in October 2026:

| | Netlify Free (chosen) | Cloudflare Pages | GitHub Pages | Vercel Hobby |
| --- | --- | --- | --- | --- |
| DNS for votura.io | Stays at Namecheap (2 new records) | Must move to Cloudflare | Stays at Namecheap | n/a |
| Deploys from this repository | Yes, because it is public | Yes, even if private | Public repositories only (free plan) | n/a |
| Free-tier limit | 300 credits a month; all projects pause when they run out | Static traffic not metered | 100 GB/month soft bandwidth limit | n/a |
| Custom headers (`_headers`) | Yes | Yes | No | n/a |
| Company site allowed | Yes | Yes | Grey zone: not for running an online business | No: non-commercial use only |

- **Mail stays untouched.** Proton Mail relies on DNS records at Namecheap: MX, SPF, DKIM, DMARC and a verification record. With Netlify they stay where they are. Cloudflare Pages needs the whole DNS zone, so those records would have to be copied over first (see *Alternatives*).
- **Why the repository is public.** Netlify's free plan only deploys private repositories owned by a personal account. Private organization repositories, such as `votura-io/votura.io`, need the Pro plan.

### Netlify credits

The free plan includes 300 credits a month. Costs:

| What | Credits |
| --- | --- |
| Production deploy | 15 each |
| Bandwidth | 20 per GB |
| Requests | 2 per 10,000 |
| Deploy previews, branch deploys | Free |

A first visit to the site downloads about 91 KB in 10 requests (measured in October 2026), which costs roughly 0.004 credits:

| Production deploys per month | Credits left | First visits that fit |
| --- | --- | --- |
| 0 | 300 | about 78,000 |
| 5 | 225 | about 59,000 |
| 10 | 150 | about 39,000 |

If the credits run out, Netlify pauses **every** project of the team until the next cycle, and visitors see a "Site not available" page. Every push to `main` is a production deploy, so group changes before pushing. Pushes to other branches and pull requests only create free deploy previews.

## Setup

### 1. Make the repository public

On GitHub, go to `votura-io/votura.io` → Settings → General → Danger Zone → *Change repository visibility* → Public.

### 2. Create the Netlify project

1. Sign in at <https://app.netlify.com> with GitHub.
2. On the Projects page, choose *Add new project* → *Import an existing project* → GitHub. Authorize the Netlify app and give it access to the `votura-io` organization.
3. Pick `votura-io/votura.io` and deploy branch `main`.
   - Leave the build command empty.
   - The repository's `netlify.toml` sets the publish directory to `public` and overrides the dashboard fields.
4. Make the project public; new projects start private. Go to Project configuration → General → Visitor access → *Project visibility*.
5. Optionally, rename the project, which changes its `*.netlify.app` address.

### 3. Connect votura.io

1. In the Netlify project, go to Domain management → *Add a domain* and enter `votura.io`.
   - Netlify adds `www.votura.io` as well.
   - When Netlify offers to manage the DNS, decline: the DNS stays at Namecheap.
2. In Namecheap, go to Domain List → Manage → Advanced DNS → Host records.
   - **Leave the Proton Mail records as they are:**
     - the two MX records;
     - the two TXT records on `@` (`protonmail-verification=…` and `v=spf1 …`);
     - the CNAME records `protonmail._domainkey`, `protonmail2._domainkey` and `protonmail3._domainkey`;
     - the TXT record `_dmarc`.
   - Delete any parking records on `@` or `www`, such as a URL Redirect or a CNAME to `parkingpage.namecheap.com`.
   - Add these two records:

     | Type | Host | Value |
     | --- | --- | --- |
     | ALIAS Record | `@` | `apex-loadbalancer.netlify.com` |
     | CNAME Record | `www` | `<project>.netlify.app` (shown in Netlify's domain settings) |

     If no ALIAS type is offered, use an A Record on `@` pointing to `75.2.60.5` instead. Never put a CNAME on `@`: it cannot coexist with the mail records.
3. Wait for DNS to update; this takes minutes to a few hours. Netlify then issues a Let's Encrypt certificate (Domain management → HTTPS). If that stalls, use *Verify DNS configuration* there.
4. Keep `votura.io` as the primary domain; Netlify redirects `www` to it.
   - The site's canonical URLs (`index.html`, `sitemap.xml`, `security.txt`) all use the bare domain.
   - Netlify recommends `www` as the primary domain with external DNS, because the bare domain goes through a load balancer instead of its CDN. That makes little difference for a site this small.

### 4. Check

- `curl -sI https://votura.io | grep -i content-security` prints the policy from `public/_headers`.
- <https://votura.io/no-such-page> shows the site's 404 page.
- Send an email to `contact@votura.io` and reply from it. The address must exist in Proton, because Proton only accepts mail for addresses that were added there.

## Day to day

- `python3 scripts/serve.py` previews the site locally at <http://localhost:8765>, with the production headers.
- Merging or pushing to `main` deploys to production (15 credits).
- Other branches and pull requests get free preview deploys.
- Watch credit usage in the team's billing settings.

## Alternatives

**Cloudflare Pages** has unmetered static hosting and deploys private repositories. Use it if Netlify's credit limit ever becomes a problem. It requires moving the DNS:

1. Add `votura.io` to Cloudflare (Free plan) but don't change the nameservers yet.
2. Make sure every Proton record exists in Cloudflare. Copy them from Namecheap, or from Proton's *Domain names* settings.
3. Set the three `protonmail*._domainkey` CNAME records to **DNS only**. Proton's guide says they don't work when proxied.
4. Do **not** enable Cloudflare Email Routing. It replaces the MX records and would take the mail away from Proton.
5. Switch the nameservers at Namecheap (Domain List → Manage → Nameservers → Custom DNS).
6. Connect the repository: Workers & Pages → Create application → Pages → *Connect to Git*. Leave the build command empty and set the output directory to `public`.
7. Delete the Netlify records from step 3 once the site runs on Cloudflare.

**GitHub Pages** keeps the DNS at Namecheap too, but it has three drawbacks:
- it cannot send the headers in `_headers`;
- it needs a GitHub Actions workflow to publish `public/`;
- GitHub's terms say Pages is not meant for running an online business.

**Vercel Hobby** is restricted to non-commercial use, so it is not an option for a company site.

## Later

- **Netlify paid plans:** Personal at $9 a month for 1,000 credits, or Pro from $20 a month for 3,000 credits (October 2026).
- **Legal pages:** depending on where Votura is registered, a legal notice (for example an Impressum in Germany or Austria) and a privacy notice may be required. The site sets no cookies and loads nothing from third parties, so the privacy notice can be short.
