import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;
const TOLERANCE = 8;

const VIEWPORTS = [
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

const OVERLAY_AREA_LIMIT = 0.25;

const demosPath = path.join(__dirname, '..', 'src', 'lib', 'demos.json');
const demos = JSON.parse(fs.readFileSync(demosPath, 'utf-8'));
const routes = demos.map((demo) => demo.path);

async function waitForServer(url, { timeout = 60000, interval = 250 } = {}) {
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

async function measure(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-shell-content]');
    const workspace = document.querySelector('[data-demo-workspace]');
    const sidebar = document.querySelector('[data-demo-sidebar]');
    const kpi = document.querySelector('[data-demo-kpi]');
    const canvas = document.querySelector('[data-demo-canvas]');
    const legend = document.querySelector('[data-demo-legend]');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        width: r.width,
        height: r.height,
      };
    };
    const overlays = canvas
      ? Array.from(canvas.querySelectorAll('*'))
          .filter((el) => {
            const position = window.getComputedStyle(el).position;
            return position === 'absolute' || position === 'fixed';
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              label: (el.textContent || '').trim().slice(0, 40),
              width: r.width,
              height: r.height,
            };
          })
      : [];
    const shellBox = box(shell);
    return {
      viewportHeight: window.innerHeight,
      canvas: box(canvas),
      sidebar: box(sidebar),
      kpi: box(kpi),
      legend: box(legend),
      legendInsideCanvas: canvas && legend ? canvas.contains(legend) : null,
      overlays,
      workspaceTop:
        workspace && shellBox ? workspace.getBoundingClientRect().top - shellBox.top : null,
      shellScrollWidth: shell ? shell.scrollWidth : null,
      shellClientWidth: shell ? shell.clientWidth : null,
      documentScrollY: window.scrollY,
      nestedParagraphs: document.querySelectorAll('p p').length,
    };
  });
}

async function scrollToWorkspace(page) {
  await page.evaluate(() => {
    const workspace = document.querySelector('[data-demo-workspace]');
    if (workspace) workspace.scrollIntoView({ block: 'start' });
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
}

async function checkRoute(page, route, viewport, { foldedNav }) {
  const failures = [];
  await page.setViewport({ width: viewport.width, height: viewport.height });

  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => window.__PRERENDER_READY__ === true, { timeout: 15000 });

  if (foldedNav) {
    const toggle = await page.$('button[title="隐藏侧边栏"]');
    if (toggle) {
      await toggle.click();
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  await scrollToWorkspace(page);
  const m = await measure(page);
  const label = `${route} @ ${viewport.name}${foldedNav ? ' (折叠导航)' : ''}`;

  const vh = m.viewportHeight;
  const rowLayout = viewport.width >= 1280;
  if (!m.canvas) failures.push(`${label}: 未找到画布元素`);
  if (!m.kpi) failures.push(`${label}: 未找到 KPI 条`);
  if (!m.sidebar) failures.push(`${label}: 未找到侧栏`);

  if (m.canvas && m.canvas.bottom > vh + TOLERANCE) {
    failures.push(`${label}: 画布底边 ${Math.round(m.canvas.bottom)} 超出视口 ${vh}`);
  }
  if (m.kpi && m.kpi.bottom > vh + TOLERANCE) {
    failures.push(`${label}: KPI 条底边 ${Math.round(m.kpi.bottom)} 超出视口 ${vh}`);
  }
  if (rowLayout) {
    if (m.sidebar && m.sidebar.bottom > vh + TOLERANCE) {
      failures.push(`${label}: 侧栏底边 ${Math.round(m.sidebar.bottom)} 超出视口 ${vh}`);
    }
  } else if (m.sidebar && m.canvas && m.sidebar.top < m.canvas.bottom - TOLERANCE) {
    failures.push(
      `${label}: 侧栏未回落到画布下方（侧栏顶边 ${Math.round(m.sidebar.top)} < 画布底边 ${Math.round(
        m.canvas.bottom,
      )}）`,
    );
  }
  if (m.shellScrollWidth !== null && m.shellScrollWidth > m.shellClientWidth) {
    failures.push(
      `${label}: 内容区横向溢出 scrollWidth=${m.shellScrollWidth} clientWidth=${m.shellClientWidth}`,
    );
  }
  if (m.documentScrollY !== 0) {
    failures.push(`${label}: 文档根元素发生滚动 scrollY=${m.documentScrollY}，滚动应只发生在内容区`);
  }
  if (m.nestedParagraphs > 0) {
    failures.push(`${label}: 存在 ${m.nestedParagraphs} 处段落嵌套段落`);
  }

  if (m.legendInsideCanvas) {
    failures.push(`${label}: 图例位于画布容器内部，应作为画布下方的图注渲染`);
  }
  if (m.legend && m.canvas && m.legend.top < m.canvas.bottom - TOLERANCE) {
    failures.push(
      `${label}: 图例顶边 ${Math.round(m.legend.top)} 与画布底边 ${Math.round(
        m.canvas.bottom,
      )} 重叠`,
    );
  }

  if (m.canvas) {
    const canvasArea = m.canvas.width * m.canvas.height;
    for (const overlay of m.overlays) {
      const ratio = canvasArea > 0 ? (overlay.width * overlay.height) / canvasArea : 0;
      if (ratio > OVERLAY_AREA_LIMIT) {
        failures.push(
          `${label}: 画布浮层「${overlay.label}」尺寸 ${Math.round(overlay.width)}x${Math.round(
            overlay.height,
          )} 占画布面积 ${(ratio * 100).toFixed(1)}%，超过 ${
            OVERLAY_AREA_LIMIT * 100
          }% 上限`,
        );
      }
    }
  }

  const band = m.workspaceTop === null ? null : Math.max(
    m.canvas ? m.canvas.height : 0,
    rowLayout && m.sidebar ? m.sidebar.height : 0,
  );
  console.log(
    `   ${label}: 画布 ${m.canvas ? `${Math.round(m.canvas.width)}x${Math.round(m.canvas.height)}` : '-'}px, 侧栏 ${
      m.sidebar ? Math.round(m.sidebar.height) : '-'
    }px, KPI ${m.kpi ? Math.round(m.kpi.height) : '-'}px, 图注 ${
      m.legend ? Math.round(m.legend.height) : '-'
    }px, 浮层 ${m.overlays.length} 个, band ${band === null ? '-' : Math.round(band)}px, 偏移 ${
      m.workspaceTop === null ? '-' : Math.round(m.workspaceTop)
    }px, 内容区 ${m.shellClientWidth ?? '-'}px, 视口 ${vh}px`,
  );

  return failures;
}

async function main() {
  console.log('🚀 开始校验演示工作台布局...');
  console.log(`📋 待校验路由 ${routes.length} 条: ${routes.join(', ')}`);

  const serverProcess = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    detached: true,
    stdio: 'ignore',
  });
  serverProcess.unref();

  const failures = [];
  try {
    await waitForServer(BASE_URL);
    const puppeteer = await resolvePuppeteer();
    const executablePath = resolveExecutablePath();
    const browser = await puppeteer.default.launch({
      headless: 'new',
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    for (const viewport of VIEWPORTS) {
      for (const route of routes) {
        failures.push(...(await checkRoute(page, route, viewport, { foldedNav: false })));
      }
    }

    for (const viewport of VIEWPORTS) {
      for (const route of routes) {
        failures.push(...(await checkRoute(page, route, viewport, { foldedNav: true })));
      }
    }

    await browser.close();
  } catch (error) {
    failures.push(`校验过程出错: ${error.message}`);
  } finally {
    if (serverProcess && serverProcess.pid) {
      try {
        const pid = serverProcess.pid;
        if (process.platform === 'win32') {
          await execAsync(`taskkill /PID ${pid} /T /F`);
        } else {
          process.kill(-pid);
        }
      } catch {
        // 进程可能已退出
      }
    }
  }

  if (failures.length > 0) {
    console.error(`\n❌ 布局校验失败，共 ${failures.length} 项:`);
    failures.forEach((f) => console.error(`   - ${f}`));
    process.exit(1);
  }
  console.log('\n✅ 布局校验通过');
}

main();