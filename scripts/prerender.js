import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

// 從單一數據源 demos.json 派生需要預渲染的路由，並包含首頁
const demosPath = path.join(__dirname, '..', 'src', 'lib', 'demos.json');
const demos = JSON.parse(fs.readFileSync(demosPath, 'utf-8'));
const routes = [{ path: '/' }, ...demos.map((demo) => ({ path: demo.path }))];

// 輪詢端口直到服務器就緒（替代固定 sleep）
async function waitForServer(url, { timeout = 30000, interval = 250 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // 尚未就緒，繼續輪詢
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`服务器在 ${timeout}ms 内未能就绪: ${url}`);
}

async function prerenderPages() {
  console.log('🚀 开始预渲染页面...');

  // 启动本地服务器
  console.log('📡 启动本地服务器...');
  // 使用 spawn 创建可分离进程（cross-platform）
  const serverProcess = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    detached: true,
    stdio: 'ignore'
  });
  serverProcess.unref();

  try {
    // 等待服务器就绪（端口健康检查）
    await waitForServer(BASE_URL);
    // 动态导入puppeteer
    let puppeteer = null;
    try {
      puppeteer = await import('puppeteer');
    } catch (error) {
      puppeteer = await import('puppeteer-core');
    }

    // 探测系统 Chrome 可执行文件路径（puppeteer 缓存未命中时回退）
    const candidatePaths = process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        ]
      : [
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
        ];
    const executablePath = candidatePaths.find((p) => fs.existsSync(p));

    // 启动浏览器
    console.log('🌐 启动浏览器...');
    const browser = await puppeteer.default.launch({
      headless: 'new',
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    for (const route of routes) {
      try {
        console.log(`🔄 渲染: ${route.path}`);

        // 导航到页面
        await page.goto(`${BASE_URL}${route.path}`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // 等待 React 组件挂载完成并置起预渲染就绪标志
        await page.waitForFunction(
          () => window.__PRERENDER_READY__ === true,
          { timeout: 15000 }
        );

        // 获取渲染后的HTML内容
        const content = await page.evaluate(() => {
          // const root = document.getElementById('root');
          // return root ? root.innerHTML : '';
          return document.documentElement.outerHTML;
        });

        // 生成文件路径
        const dirName = route.path.replace(/^\/+|\/+$/g, '');
        const filename = dirName ? `${dirName}/index.html` : 'index.html';
        const filePath = path.join(__dirname, '..', 'dist', filename);

        // 确保目录存在
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // 写入HTML文件
        fs.writeFileSync(filePath, content);
        console.log(`✅ 生成: ${filename}`);

      } catch (error) {
        console.error(`❌ 渲染 ${route.path} 时出错:`, error.message);
      }
    }

    await browser.close();
    console.log('🎉 预渲染完成！');

  } catch (error) {
    console.error('❌ 预渲染过程出错:', error);
  } finally {
    // 关闭服务器（跨平台：Windows 用 taskkill，POSIX 用负 PID 杀掉进程组）
    if (serverProcess && serverProcess.pid) {
      try {
        const pid = serverProcess.pid;
        if (process.platform === 'win32') {
          await execAsync(`taskkill /PID ${pid} /T /F`);
        } else {
          // 通过负 PID 结束整个进程组（spawn 时设置 detached: true）
          process.kill(-pid, 'SIGTERM');
        }
      } catch (err) {
        // 忽略关闭错误
      }
    }
  }
}



// 主執行函數
async function main() {
  // 檢查是否安裝了puppeteer
  await import('puppeteer');
  await prerenderPages();
}

main().catch((error) => {
  console.error('❌ 预渲染失败:', error);
  process.exit(1);
});