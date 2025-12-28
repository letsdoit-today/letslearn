import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

// 定義所有需要預渲染的路由
const routes = [
  // { 
  //   path: '/', 
  //   title: '物理學習平台 - 互動式物理實驗演示',
  //   description: '探索物理世界的奇妙現象，通過互動式實驗學習力學、光學等物理原理。'
  // },
  {
    path: '/falling-ball',
  },
  {
    path: '/friction-inclined-plane',
  },
  {
    path: '/air-water-refraction',
  },
  {
    path: '/convex-lens',
  },
  {
    path: '/concave-lens',
  },
  {
    path: '/eye-simulation',
  }
];

async function prerenderPages() {
  console.log('🚀 开始预渲染页面...');

  // 启动本地服务器
  console.log('📡 启动本地服务器...');
  // 使用 spawn 创建可分离进程（cross-platform）
  const serverProcess = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    detached: true,
    stdio: 'ignore'
  });
  serverProcess.unref();

  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // 动态导入puppeteer
    let puppeteer = null;
    try {
      puppeteer = await import('puppeteer');
    } catch (error) {
      puppeteer = await import('puppeteer-core');
    }

    // 启动浏览器
    console.log('🌐 启动浏览器...');
    const browser = await puppeteer.default.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    for (const route of routes) {
      try {
        console.log(`🔄 渲染: ${route.path}`);

        // 导航到页面
        await page.goto(`http://localhost:4173${route.path}`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // 等待React组件完全渲染
        await page.waitForFunction(
          () => document.querySelector('#root')?.innerHTML.includes('实验控制'),
          { timeout: 10000 }
        );

        // 获取渲染后的HTML内容
        const content = await page.evaluate(() => {
          // const root = document.getElementById('root');
          // return root ? root.innerHTML : '';
          return document.documentElement.outerHTML;
        });

        // 生成文件路径
        let filename = route.path === '/' ? 'index.html' : `${route.path.replace(/^\//, '')}/index.html`;
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
  try {
    // 檢查是否安裝了puppeteer
    await import('puppeteer');
    await prerenderPages();
  } catch (error) {

  }
}

main().catch(console.error);