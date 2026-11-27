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

const routes = [
  { slug: 'convex-lens', path: '/convex-lens/' },
  { slug: 'concave-lens', path: '/concave-lens/' },
  { slug: 'lens-imaging-rules', path: '/lens-imaging-rules/' },
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

      // 将演示工作区滚动到内容区顶部，保证截图取到画布 + KPI + 侧栏
      await page.evaluate(() => {
        const workspace = document.querySelector('[data-demo-workspace]');
        if (workspace) workspace.scrollIntoView({ block: 'start' });
      });
      await new Promise((resolve) => setTimeout(resolve, 300));

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

      const clipX = Math.max(0, Math.round(rect.x));
      const clipY = Math.min(
        1000 - CLIP_HEIGHT,
        Math.max(0, Math.round(rect.y) - 8),
      );
      const clipWidth = Math.min(CLIP_WIDTH, Math.round(rect.width));

      const target = path.join(__dirname, '..', 'public', `og-${route.slug}.jpg`);
      await page.screenshot({
        path: target,
        type: 'jpeg',
        quality: 82,
        clip: { x: clipX, y: clipY, width: clipWidth, height: CLIP_HEIGHT },
      });

      const size = fs.statSync(target).size;
      console.log(`✅ 生成: public/og-${route.slug}.jpg (${Math.round(size / 1024)} KB)`);
    }

    console.log('🎉 og:image 生成完成！');
  } finally {
    if (browser) await browser.close();
  }
}

generate().catch((error) => {
  console.error('❌ og:image 生成失败:', error);
  process.exit(1);
});