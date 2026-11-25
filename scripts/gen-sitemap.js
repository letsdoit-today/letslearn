import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const demosPath = path.join(rootDir, 'src', 'lib', 'demos.json');
const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');

const SITE_URL = 'https://learn.letsdoit.today';
const CHANGEFREQ = 'weekly';
const PRIORITY = '0.8';

const isCheck = process.argv.includes('--check');

function readDemos() {
  const demos = JSON.parse(fs.readFileSync(demosPath, 'utf-8'));
  if (!Array.isArray(demos) || demos.length === 0) {
    throw new Error('demos.json 为空或格式不正确，应为一个非空数组');
  }
  const seen = new Set();
  for (const demo of demos) {
    if (!demo || typeof demo.slug !== 'string' || typeof demo.path !== 'string') {
      throw new Error(`demos.json 中存在缺少 slug/path 的条目: ${JSON.stringify(demo)}`);
    }
    const normalized = demo.path.replace(/^\/+|\/+$/g, '');
    if (normalized !== demo.slug) {
      throw new Error(`path 与 slug 不一致: path="${demo.path}" slug="${demo.slug}"`);
    }
    if (seen.has(demo.slug)) {
      throw new Error(`demos.json 中存在重复 slug: ${demo.slug}`);
    }
    seen.add(demo.slug);
  }
  return demos;
}

function lastMod() {
  try {
    const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', 'src/lib/demos.json'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return iso ? new Date(iso).toISOString() : null;
  } catch {
    return null;
  }
}

function buildSitemap(demos, lastmod) {
  const routes = [{ loc: `${SITE_URL}/` }];
  for (const demo of demos) {
    const normalized = demo.path.replace(/^\/+|\/+$/g, '');
    routes.push({ loc: `${SITE_URL}/${normalized}/` });
  }

  const body = routes
    .map((route) => {
      const lines = [`        <loc>${route.loc}</loc>`];
      if (lastmod) lines.push(`        <lastmod>${lastmod}</lastmod>`);
      lines.push(`        <changefreq>${CHANGEFREQ}</changefreq>`);
      lines.push(`        <priority>${PRIORITY}</priority>`);
      return `    <url>\n${lines.join('\n')}\n    </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"
    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
    xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${body}
</urlset>
`;
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function main() {
  const demos = readDemos();
  const lastmod = lastMod();
  const content = buildSitemap(demos, lastmod);
  const total = demos.length + 1;

  if (isCheck) {
    if (!fs.existsSync(sitemapPath)) {
      console.error(`✗ 未找到 ${path.relative(rootDir, sitemapPath)}，请先运行 npm run sitemap`);
      process.exit(1);
    }
    const existing = fs.readFileSync(sitemapPath, 'utf-8');
    if (existing === content) {
      console.log(`✓ sitemap.xml 与 demos.json 一致（${total} 条 URL）`);
      return;
    }
    const expectedLocs = extractLocs(content);
    const actualLocs = extractLocs(existing);
    const missing = expectedLocs.filter((loc) => !actualLocs.includes(loc));
    const extra = actualLocs.filter((loc) => !expectedLocs.includes(loc));
    console.error('✗ sitemap.xml 与 demos.json 不一致');
    if (missing.length) console.error(`  缺少条目:\n${missing.map((loc) => `    - ${loc}`).join('\n')}`);
    if (extra.length) console.error(`  多余条目:\n${extra.map((loc) => `    + ${loc}`).join('\n')}`);
    if (!missing.length && !extra.length) console.error('  URL 集合一致，但 lastmod 或格式存在差异');
    process.exit(1);
  }

  fs.writeFileSync(sitemapPath, content);
  console.log(
    `✓ 已生成 ${path.relative(rootDir, sitemapPath)}（${total} 条 URL${lastmod ? `，lastmod ${lastmod}` : '，未获取到 lastmod 已省略'}）`,
  );
}

main();