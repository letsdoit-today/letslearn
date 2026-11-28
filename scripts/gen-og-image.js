import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const PORT = 4175;
const BASE_URL = `http://localhost:${PORT}`;
const CLIP_WIDTH = 1200;
const CLIP_HEIGHT = 630;

// 分享图与 demos.json 同源：新增 demo 后自动纳入，无需再手工维护 routes。
// `buildDemoSEO` 按 slug 拼出 `og-${slug}.jpg`，因此这里少一条就会让该页 og:image 变成 404。
const demosPath = path.join(rootDir, 'src', 'lib', 'demos.json');
const demos = JSON.parse(fs.readFileSync(demosPath, 'utf-8'));
const routes = [
  { slug: 'dashboard', path: '/', isDemo: false },
  ...demos.map((demo) => ({ slug: demo.slug, path: demo.path, isDemo: true })),
];

// 增量生成：只对「页面源文件指纹」发生变化的路由重新截图，避免每次都全量重跑。
// 指纹缓存在 node_modules/.cache 下（属构建缓存，不进版本库）；缓存缺失时退回全量生成。
const CACHE_VERSION = 1;
const cachePath = path.join(rootDir, 'node_modules', '.cache', 'og-image-manifest.json');
const forceAll = process.argv.includes('--force') || process.argv.includes('-f');

// 所有页面共用的视觉资源：改了它们，全部截图都会变，因此并入每个路由的指纹
const SHARED_SOURCES = [
  'index.html',
  'src/index.css',
  'tailwind.config.cjs',
  'src/components/Layout.tsx',
  'src/lib/palette.ts',
  ...readDirSources('src/components/demo'),
  ...readDirSources('src/components/ui'),
];

const EXT_CANDIDATES = ['', '.tsx', '.ts', '/index.tsx', '/index.ts'];

function readDirSources(relDir) {
  const abs = path.join(rootDir, relDir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((name) => /\.(tsx?|css)$/.test(name))
    .sort()
    .map((name) => path.posix.join(relDir, name));
}

// 从 src/demos/*.tsx 的 `const SLUG = '...'` 反查每个 slug 对应的组件文件
function resolveDemoSources() {
  const demosDir = path.join(rootDir, 'src', 'demos');
  if (!fs.existsSync(demosDir)) return new Map();
  const sources = new Map();
  for (const file of fs.readdirSync(demosDir).filter((name) => name.endsWith('.tsx'))) {
    const content = fs.readFileSync(path.join(demosDir, file), 'utf-8');
    const matched = content.match(/const SLUG = '([^']+)'/);
    if (matched) sources.set(matched[1], path.posix.join('src', 'demos', file));
  }
  return sources;
}

// 递归收集组件依赖的 `@/` 模块（物理计算、hooks 等），保证它们改动时该页会重建
function collectImports(fileRel, visited) {
  if (visited.has(fileRel)) return;
  const abs = path.join(rootDir, fileRel);
  if (!fs.existsSync(abs)) return;
  visited.add(fileRel);

  const content = fs.readFileSync(abs, 'utf-8');
  const specs = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const spec of specs) {
    if (!spec.startsWith('@/')) continue;
    const base = path.posix.join('src', spec.slice(2));
    for (const ext of EXT_CANDIDATES) {
      const candidate = base + ext;
      if (!/\.(tsx?|css)$/.test(candidate)) continue;
      if (fs.existsSync(path.join(rootDir, candidate))) {
        collectImports(candidate, visited);
        break;
      }
    }
  }
}

function fingerprint(files, extra) {
  const hash = crypto.createHash('sha1');
  hash.update(`og-image-cache-v${CACHE_VERSION}\n`);
  for (const rel of [...new Set(files)].sort()) {
    const abs = path.join(rootDir, rel);
    hash.update(`${rel}\u0000`);
    hash.update(fs.existsSync(abs) ? fs.readFileSync(abs) : '<missing>');
    hash.update('\n');
  }
  hash.update(`meta\u0000${extra}\n`);
  return hash.digest('hex');
}

function buildFingerprint(route, sources) {
  if (!route.isDemo) {
    // 首页展示整份 demo 列表，因此任何条目的改动都会影响它
    const files = ['src/App.tsx', 'src/components/Dashboard.tsx', ...SHARED_SOURCES];
    return fingerprint(files, JSON.stringify(demos));
  }

  // 演示页只取自己那条 demos 记录，避免新增别的 demo 时把全部页面一起重建
  const entry = demos.find((demo) => demo.slug === route.slug);
  const source = sources.get(route.slug);
  const files = [...(source ? [source] : ['src/lib/demos.json']), ...SHARED_SOURCES];
  if (source) {
    const visited = new Set();
    collectImports(source, visited);
    files.push(...visited);
  }
  return fingerprint(files, JSON.stringify(entry ?? null));
}

function readCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    if (raw && raw.version === CACHE_VERSION && raw.routes) return raw.routes;
  } catch {
    // 缓存缺失或损坏时退回全量生成
  }
  return {};
}

function writeCache(entries) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify({ version: CACHE_VERSION, routes: entries }, null, 2)}\n`);
}

async function waitForServer(url, { timeout = 30000, interval = 250 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // 尚未就绪，继续轮询
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`服务器在 ${timeout}ms 内未能就绪: ${url}`);
}

async function resolvePuppeteer() {
  try {
    return await import('puppeteer');
  } catch {
    return await import('puppeteer-core');
  }
}

function resolveExecutablePath() {
  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        ]
      : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
  return candidates.find((p) => fs.existsSync(p));
}

async function generate(tasks) {
  const serverProcess = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    cwd: rootDir,
    shell: true,
    detached: true,
    stdio: 'ignore',
  });
  serverProcess.unref();

  let browser;
  try {
    await waitForServer(BASE_URL);

    const puppeteer = await resolvePuppeteer();
    const executablePath = resolveExecutablePath();
    browser = await puppeteer.default.launch({
      headless: 'new',
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });

    for (const task of tasks) {
      const route = task.route;
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await page.waitForFunction(() => window.__PRERENDER_READY__ === true, { timeout: 15000 });

      // 演示页：把演示工作区滚动到内容区顶部，保证截图取到画布 + KPI + 侧栏
      // 首页：回到顶部，截图取站点头部 + 标题 + 演示卡片
      await page.evaluate((isDemo) => {
        if (!isDemo) {
          window.scrollTo(0, 0);
          return;
        }
        const workspace = document.querySelector('[data-demo-workspace]');
        if (workspace) workspace.scrollIntoView({ block: 'start' });
      }, route.isDemo);
      await new Promise((resolve) => setTimeout(resolve, 300));

      let clip;
      if (route.isDemo) {
        const rect = await page.evaluate(() => {
          const row = document.querySelector('[data-demo-row]');
          const workspace = document.querySelector('[data-demo-workspace]');
          if (!row || !workspace) return null;
          const r = row.getBoundingClientRect();
          const w = workspace.getBoundingClientRect();
          return { x: r.x, y: w.y, width: r.width, height: r.height };
        });

        if (!rect) {
          throw new Error(`${route.path} 未找到演示工作区，无法生成分享图`);
        }

        clip = {
          x: Math.max(0, Math.round(rect.x)),
          y: Math.min(1000 - CLIP_HEIGHT, Math.max(0, Math.round(rect.y) - 8)),
          width: Math.min(CLIP_WIDTH, Math.round(rect.width)),
          height: CLIP_HEIGHT,
        };
      } else {
        const rect = await page.evaluate(() => {
          const container = document.querySelector('[data-page-container]');
          if (!container) return null;
          const r = container.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        });

        if (!rect) {
          throw new Error(`${route.path} 未找到页面容器，无法生成分享图`);
        }

        clip = {
          x: Math.max(0, Math.round(rect.x)),
          y: Math.min(1000 - CLIP_HEIGHT, Math.max(0, Math.round(rect.y))),
          width: Math.min(CLIP_WIDTH, Math.round(rect.width)),
          height: CLIP_HEIGHT,
        };
      }

      await page.screenshot({
        path: task.target,
        type: 'jpeg',
        quality: 82,
        clip,
      });

      const size = fs.statSync(task.target).size;
      console.log(`✅ 生成: public/og-${route.slug}.jpg (${Math.round(size / 1024)} KB)`);
    }

    const missing = routes.filter((route) => !fs.existsSync(path.join(rootDir, 'public', `og-${route.slug}.jpg`)));
    if (missing.length) {
      throw new Error(`以下路由缺少分享图: ${missing.map((route) => route.slug).join(', ')}`);
    }
  } finally {
    if (browser) await browser.close();
  }
}

async function main() {
  const sources = resolveDemoSources();
  const cache = readCache();

  const tasks = routes.map((route) => ({
    route,
    fingerprint: buildFingerprint(route, sources),
    target: path.join(rootDir, 'public', `og-${route.slug}.jpg`),
  }));

  const stale = forceAll
    ? tasks
    : tasks.filter((task) => !fs.existsSync(task.target) || cache[task.route.slug] !== task.fingerprint);

  if (stale.length === 0) {
    console.log(`✓ 全部 ${tasks.length} 张分享图均为最新，跳过生成（需要强制重建时用 npm run og:image -- --force）`);
    return;
  }

  console.log(`🖼  生成 og:image 分享图...（待更新 ${stale.length} / ${tasks.length} 张）`);
  await generate(stale);

  const nextCache = { ...cache };
  for (const task of stale) nextCache[task.route.slug] = task.fingerprint;
  writeCache(nextCache);

  const skipped = tasks.length - stale.length;
  console.log(
    `🎉 og:image 生成完成（新生成 ${stale.length} 张${skipped > 0 ? `，跳过 ${skipped} 张未变动` : ''}）！`,
  );
}

main().catch((error) => {
  console.error('❌ og:image 生成失败:', error);
  process.exit(1);
});