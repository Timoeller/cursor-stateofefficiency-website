import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const posix = path.posix;

const readJson = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const readText = (p) => fs.readFile(p, 'utf8');

/* ---------- tiny template engine ---------- */

function tokenize(tpl) {
  const re = /\{\{\{?\s*(.+?)\s*\}?\}\}/g;
  const tokens = [];
  let last = 0;
  let m;
  while ((m = re.exec(tpl))) {
    if (m.index > last) tokens.push({ type: 'text', value: tpl.slice(last, m.index) });
    const expr = m[1];
    if (expr.startsWith('#each ')) tokens.push({ type: 'each', expr: expr.slice(6).trim() });
    else if (expr.startsWith('#if ')) tokens.push({ type: 'if', expr: expr.slice(4).trim() });
    else if (expr === '/each') tokens.push({ type: 'end', kind: 'each' });
    else if (expr === '/if') tokens.push({ type: 'end', kind: 'if' });
    else if (expr.startsWith('> ')) tokens.push({ type: 'partial', name: expr.slice(2).trim() });
    else tokens.push({ type: 'var', expr });
    last = re.lastIndex;
  }
  if (last < tpl.length) tokens.push({ type: 'text', value: tpl.slice(last) });
  return tokens;
}

function parse(tokens) {
  let i = 0;
  function block(closing) {
    const nodes = [];
    while (i < tokens.length) {
      const tok = tokens[i++];
      if (tok.type === 'end') {
        if (tok.kind !== closing) throw new Error(`Unexpected {{/${tok.kind}}}`);
        return nodes;
      }
      if (tok.type === 'each' || tok.type === 'if') {
        nodes.push({ ...tok, children: block(tok.type) });
      } else {
        nodes.push(tok);
      }
    }
    if (closing) throw new Error(`Missing {{/${closing}}}`);
    return nodes;
  }
  return block(null);
}

function lookup(expr, stack) {
  const parts = expr.split('.');
  for (let s = stack.length - 1; s >= 0; s--) {
    const scope = stack[s];
    if (scope && typeof scope === 'object' && parts[0] in scope) {
      let value = scope;
      for (const part of parts) {
        if (value == null) return undefined;
        value = value[part];
      }
      return value;
    }
  }
  return undefined;
}

function truthy(v) {
  if (Array.isArray(v)) return v.length > 0;
  return Boolean(v);
}

function makeRenderer(partials) {
  const cache = new Map();
  const compile = (name, source) => {
    if (!cache.has(name)) cache.set(name, parse(tokenize(source)));
    return cache.get(name);
  };

  function run(nodes, stack, out) {
    for (const node of nodes) {
      switch (node.type) {
        case 'text':
          out.push(node.value);
          break;
        case 'var': {
          const v = lookup(node.expr, stack);
          if (v === undefined) throw new Error(`Missing template value: ${node.expr}`);
          out.push(String(v));
          break;
        }
        case 'if':
          if (truthy(lookup(node.expr, stack))) run(node.children, stack, out);
          break;
        case 'each': {
          const list = lookup(node.expr, stack);
          if (!Array.isArray(list)) throw new Error(`Not a list: ${node.expr}`);
          list.forEach((item, idx) => {
            const scope =
              item && typeof item === 'object'
                ? { ...item, this: item }
                : { this: item };
            scope['@n'] = idx + 1;
            scope['@i'] = idx;
            run(node.children, [...stack, scope], out);
          });
          break;
        }
        case 'partial': {
          if (!(node.name in partials)) throw new Error(`Unknown partial: ${node.name}`);
          run(compile(`partial:${node.name}`, partials[node.name]), stack, out);
          break;
        }
        default:
          throw new Error(`Unknown node ${node.type}`);
      }
    }
  }

  return (name, source, data) => {
    const out = [];
    run(compile(name, source), [data], out);
    return out.join('');
  };
}

/* ---------- helpers ---------- */

const PAGES = ['home', 'about', 'contact', 'imprint', 'privacy'];

function pageDir(lang, slugs, page) {
  return slugs[page] ? `${lang}/${slugs[page]}` : lang;
}

function relUrl(fromDir, toDir, query = '') {
  const rel = posix.relative(fromDir, toDir);
  return (rel === '' ? './' : `${rel}/`) + query;
}

function mapStrings(value, fn) {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)]));
  }
  return value;
}

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(a, b);
    else await fs.copyFile(a, b);
  }
}

async function write(file, contents) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, contents);
}

/* ---------- build ---------- */

async function main() {
  const site = await readJson(path.join(root, 'site.config.json'));
  if (process.env.SITE_URL) site.baseUrl = process.env.SITE_URL;
  if (!site.baseUrl.endsWith('/')) site.baseUrl += '/';

  const content = {};
  for (const lang of site.languages) {
    content[lang] = await readJson(path.join(src, 'content', `${lang}.json`));
  }

  const tplDir = path.join(src, 'templates');
  const layout = await readText(path.join(tplDir, 'layout.html'));
  const pageTemplates = {
    home: await readText(path.join(tplDir, 'home.html')),
    about: await readText(path.join(tplDir, 'about.html')),
    contact: await readText(path.join(tplDir, 'contact.html')),
    imprint: await readText(path.join(tplDir, 'legal.html')),
    privacy: await readText(path.join(tplDir, 'legal.html'))
  };
  const partials = {};
  for (const file of await fs.readdir(path.join(tplDir, 'partials'))) {
    partials[path.basename(file, '.html')] = await readText(path.join(tplDir, 'partials', file));
  }
  const render = makeRenderer(partials);

  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });
  await copyDir(path.join(src, 'assets'), path.join(dist, 'assets'));
  await fs.copyFile(path.join(src, 'styles.css'), path.join(dist, 'assets', 'styles.css'));
  await fs.copyFile(path.join(src, 'main.js'), path.join(dist, 'assets', 'main.js'));
  await write(path.join(dist, '.nojekyll'), '');
  if (site.domain) await write(path.join(dist, 'CNAME'), `${site.domain}\n`);

  for (const lang of site.languages) {
    const otherLang = site.languages.find((l) => l !== lang);
    const email = site.email[lang];
    const slugs = content[lang].slugs;

    for (const page of PAGES) {
      const dir = pageDir(lang, slugs, page);
      const rootRel = `${posix.relative(dir, '') || '.'}/`;

      const url = {};
      for (const p of PAGES) url[p] = relUrl(dir, pageDir(lang, slugs, p));
      url.contactSecurity = relUrl(dir, pageDir(lang, slugs, 'contact'), '?topic=security');

      const otherSlugs = content[otherLang].slugs;
      const switchUrl = relUrl(dir, pageDir(otherLang, otherSlugs, page));

      const resolve = (s) =>
        s
          .replace(/\[\[href:([a-z]+)(\?[^\]]*)?\]\]/g, (_, p, q = '') =>
            relUrl(dir, pageDir(lang, slugs, p), q)
          )
          .replace(/\[\[mail:imprint\]\]/g, () => {
            const e = site.imprint.email;
            return `<a class="link" href="mailto:${e}">${e}</a>`;
          })
          .replace(/\[\[email\]\]/g, email)
          .replace(/\[\[imprint\.(\w+)\]\]/g, (_, k) => site.imprint[k]);

      const t = mapStrings(content[lang], resolve);

      t.home.features.items.forEach((item, i) => { item.num = String(i + 1).padStart(2, '0'); });
      for (const person of t.about.people) person.linkedinUrl = site.linkedin[person.key];
      for (const step of t.home.soe.mock.steps) {
        step.initial = step.done <= 2 ? 'is-done' : step.active === 2 ? 'is-active' : '';
      }

      const alternates = [
        ...site.languages.map((l) => ({
          hreflang: l,
          href: `${site.baseUrl}${pageDir(l, content[l].slugs, page)}/`
        })),
        { hreflang: 'x-default', href: site.baseUrl }
      ];

      const data = {
        lang,
        otherLang,
        page,
        site,
        root: rootRel,
        assets: `${rootRel}assets/`,
        email,
        url,
        switchUrl,
        t,
        a11y: t.a11y,
        nav: t.nav,
        footer: t.footer,
        meta: t.meta,
        seo: t.seo[page],
        doc: t[page],
        navCurrent: {
          home: page === 'home' ? ' is-current' : '',
          about: page === 'about' ? ' is-current' : ''
        },
        canonical: `${site.baseUrl}${dir}/`,
        alternates
      };

      const body = render(`page:${page}`, pageTemplates[page], data);
      const html = render('layout', layout, { ...data, content: body });
      await write(path.join(dist, dir, 'index.html'), html);
    }
  }

  const router = (await readText(path.join(tplDir, 'router.html')))
    .replace('__HOSTS__', JSON.stringify(site.hostLanguages))
    .replace('__LANGS__', JSON.stringify(site.languages))
    .replace('__DEFAULT__', JSON.stringify(site.defaultLanguage))
    .replaceAll('__BASE__', site.baseUrl);
  await write(path.join(dist, 'index.html'), router);

  const notFound = (await readText(path.join(tplDir, '404.html'))).replaceAll('__BASE__', site.baseUrl);
  await write(path.join(dist, '404.html'), notFound);

  console.log(`Built ${site.languages.length * PAGES.length} pages into ${path.relative(root, dist)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
