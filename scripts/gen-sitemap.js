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

// 取指定路径集合中最近一次提交时间；任一路径无提交记录时 git 会报错，此时返回 null 并省略 lastmod
function gitLastCommit(paths) {
  try {
    const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...paths], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return iso ? new Date(iso).toISOString() : null;
  } catch {
    return null;
  }
}

// 从 src/demos/*.tsx 的 `const SLUG = '...'` 反查每个 slug 对应的组件文件，
// 使 lastmod 能跟随页面自身改动，而不是所有页面共用 demos.json 的提交时间
function resolveDemoSources() {
  const demosDir = path.join(rootDir, 'src', 'demos');
  if (!fs.existsSync(demosDir)) return new Map();
  const sources = new Map();
  for (const file of fs.readdirSync(demosDir).filter((name) => name.endsWith('.tsx'))) {
    const content = fs.readFileSync(path.join(demosDir, file), 'utf-8');
    const matched = content.match(/const SLUG = '([^']+)'/);
    if (matched) sources.set(matched[1], path.join('src', 'demos', file));
  }
  return sources;
}

function buildSitemap(demos, sources) {
  // 首页会渲染整份 demo 列表，因此 demos.json 的改动对首页是真实的内容变化
  const homePaths = ['src/lib/demos.json', 'index.html', 'src/App.tsx', 'src/components/Dashboard.tsx'];
  const routes = [{ loc: `${SITE_URL}/`, lastmod: gitLastCommit(homePaths) }];
  for (const demo of demos) {
    const normalized = demo.path.replace(/^\/+|\/+$/g, '');
    const source = sources.get(demo.slug);
    // 只取该页自己的组件文件：若把 demos.json 也算进来，任何新增 demo 都会把
    // 全部页面的 lastmod 一起刷新，Google 会判定 lastmod 不可靠而直接忽略它
    routes.push({
      loc: `${SITE_URL}/${normalized}/`,
      lastmod: gitLastCommit(source ? [source] : ['src/lib/demos.json']),
    });
  }

  const body = routes
    .map((route) => {
      const lines = [`        <loc>${route.loc}</loc>`];
      if (route.lastmod) lines.push(`        <lastmod>${route.lastmod}</lastmod>`);
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
  const sources = resolveDemoSources();
  const content = buildSitemap(demos, sources);
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
  const withLastmod = [...content.matchAll(/<lastmod>/g)].length;
  console.log(
    `✓ 已生成 ${path.relative(rootDir, sitemapPath)}（${total} 条 URL，${withLastmod} 条带按页计算的 lastmod）`,
  );
}

main();