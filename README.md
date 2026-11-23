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

## Using the custom domains later

GitHub Pages serves one custom domain per site, and a custom domain needs DNS records at the registrar. Until then the host-based default does not apply, because the site is served from `github.io`. When you are ready:

- Add the domain you want as the primary one under **Settings > Pages > Custom domain** and create the DNS records GitHub shows.
- Set `baseUrl` in `site.config.json` (or the `SITE_URL` environment variable at build time) to the final address, so canonical and `hreflang` links are correct.
- To serve the second domain, forward it to the primary one at the registrar or with a second Pages site built from this repository. Hosts ending in `.de` and `.com` then open the matching language automatically.

## Legal texts

`impressum` / `imprint` and `datenschutz` / `privacy` are a starting point. Have them reviewed before relying on them.
