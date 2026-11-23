# State of Efficiency website

Minimal, bilingual (DE/EN) static website for State of Efficiency. No runtime dependencies: a small Node script renders templates and copy into `dist/`.

## Structure

| Path | Purpose |
| --- | --- |
| `site.config.json` | Email addresses, LinkedIn URLs, imprint address, base URL |
| `src/content/de.json`, `src/content/en.json` | All copy, per language |
| `src/templates/` | HTML templates and partials, language router, 404 page |
| `src/styles.css`, `src/main.js` | Styling and small progressive enhancements |
| `src/assets/` | Fonts (self-hosted), portraits, favicon |
| `scripts/build.mjs` | Renders every page into `dist/` |
| `scripts/serve.mjs` | Local preview that mimics the GitHub Pages sub-path |
| `.github/workflows/pages.yml` | Builds and deploys to GitHub Pages on every push to `main` |

Generated pages: `/de/`, `/de/ueber-uns/`, `/de/kontakt/`, `/de/impressum/`, `/de/datenschutz/` and `/en/`, `/en/about/`, `/en/contact/`, `/en/imprint/`, `/en/privacy/`, plus a language router at `/`.

## Develop

```bash
node scripts/build.mjs        # or: npm run build
node scripts/serve.mjs        # http://localhost:4173/cursor-stateofefficiency-website/
```

Edit copy in the JSON files, then rebuild. Emails and links live in `site.config.json`.

## Deploy on GitHub Pages

1. Merge to `main`.
2. In the repository, open **Settings > Pages** and set **Source** to **GitHub Actions** (one time).
3. The workflow publishes the site to `https://<user>.github.io/<repo>/`.

All links are relative, so the site works under the repository sub-path and on a custom domain without changes.

## Language selection

The router at `/` picks a language in this order:

1. Host name: `*.de` opens German, `*.com` opens English (see `hostLanguages` in `site.config.json`).
2. The language the visitor chose earlier (stored only in the browser).
3. The browser language.
4. German.

The DE/EN switch in the header always works.

## Domains

The site is served at `https://stateofefficiency.de/`. `site.config.json` holds the domain in `domain` and the address in `baseUrl` (canonical and `hreflang` links). The build also writes `dist/CNAME` so the intended domain is recorded in the published files.

GitHub Pages serves exactly one custom domain per site, and for a site published with a GitHub Actions workflow that domain is set in the repository settings, not by the `CNAME` file (GitHub ignores it). `stateofefficiency.de` is the primary domain and `stateofefficiency.com` redirects to the English pages. The DNS for both domains already points at GitHub Pages (apex A records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, `www` as a CNAME to `timoeller.github.io`).

`stateofefficiency.de` needs nothing more at IONOS. In the repository, open **Settings > Pages**, enter `stateofefficiency.de` under **Custom domain** and save. GitHub then checks the DNS and provisions the certificate. Tick **Enforce HTTPS** once the checkbox becomes available.

`stateofefficiency.com` cannot be served by the same Pages site. In the IONOS control panel, set up domain forwarding for `stateofefficiency.com` (including `www`) as an HTTP redirect to `https://stateofefficiency.de/en/`. This replaces the domain's A records, which is intended. Visitors to the `.com` domain then land on the English site. Forwarding redirects the whole domain to that one address, so individual paths are not preserved; share links with the `.de` domain.

When editing DNS, keep the existing records for both domains: the MX records (`mx00.ionos.de`, `mx01.ionos.de`) and the SPF TXT record. Email for `kontakt@stateofefficiency.de` and `contact@stateofefficiency.com` depends on them.

Optionally, verify the domains on GitHub to prevent domain takeover: profile **Settings > Pages > Add a domain**, then add the TXT record GitHub shows (`_github-pages-challenge-timoeller.stateofefficiency.de`) alongside the existing SPF record.

## Legal texts

`impressum` / `imprint` and `datenschutz` / `privacy` are a starting point. Have them reviewed before relying on them.
