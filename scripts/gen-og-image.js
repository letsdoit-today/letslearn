import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 4175;
const BASE_URL = `http://localhost:${PORT}`;
const CLIP_WIDTH = 1200;
const CLIP_HEIGHT = 630;

// 分享图与 demos.json 同源：新增 demo 后自动纳入，无需再手工维护 routes。
// `buildDemoSEO` 按 slug 拼出 `og-${slug}.jpg`，因此这里少一条就会让该页 og:image 变成 404。
const demosPath = path.join(__dirname, '..', 'src', 'lib', 'demos.json');
const demos = JSON.parse(fs.readFileSync(demosPath, 'utf-8'));
const routes = [
  { slug: 'dashboard', path: '/', isDemo: false },
  ...demos.map((demo) => ({ slug: demo.slug, path: demo.path, isDemo: true })),
];

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

async function generate() {
  console.log('🖼  生成 og:image 分享图...');

  const serverProcess = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    cwd: path.join(__dirname, '..'),
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

    for (const route of routes) {
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

      const target = path.join(__dirname, '..', 'public', `og-${route.slug}.jpg`);
      await page.screenshot({
        path: target,
        type: 'jpeg',
        quality: 82,
        clip,
      });

      const size = fs.statSync(target).size;
      console.log(`✅ 生成: public/og-${route.slug}.jpg (${Math.round(size / 1024)} KB)`);
    }

    const missing = routes.filter(
      (route) => !fs.existsSync(path.join(__dirname, '..', 'public', `og-${route.slug}.jpg`)),
    );
    if (missing.length) {
      throw new Error(`以下路由缺少分享图: ${missing.map((route) => route.slug).join(', ')}`);
    }

    console.log(`🎉 og:image 生成完成（共 ${routes.length} 张）！`);
  } finally {
    if (browser) await browser.close();
  }
}

generate().catch((error) => {
  console.error('❌ og:image 生成失败:', error);
  process.exit(1);
});