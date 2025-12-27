import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义所有需要生成的路由
const routes = [
  '/',
  '/falling-ball',
  '/friction-inclined-plane',
  '/air-water-refraction',
  '/convex-lens',
  '/concave-lens',
  '/eye-simulation'
];

// 读取原始HTML模板
const templatePath = path.join(__dirname, '..', 'dist', 'index.html');
const template = fs.readFileSync(templatePath, 'utf-8');

// 为每个路由生成对应的HTML文件
routes.forEach(route => {
  let filename = route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`;
  const filePath = path.join(__dirname, '..', 'dist', filename);
  
  // 确保目录存在
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 写入HTML文件
  fs.writeFileSync(filePath, template);
  console.log(`Generated: ${filename}`);
});

console.log('SSG generation completed!');