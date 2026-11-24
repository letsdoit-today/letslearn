# Tasks

## 1. 基础设施修复与清理

- [x] 1.1 删除 `package.json` 中的 `build:ssg` 脚本与 `scripts/generate-static.js` 文件，仅保留 `build:prerender`；验证：`package.json` 不再声明 `build:ssg`，`npm run build:prerender` 仍可完整产出各路由静态页
- [x] 1.2 删除根目录临时文件（`1.svg`、`excalidraw.log`、`server.log`、`vite.config.ts.timestamp-*.mjs`）与 `public/test.html`，并在 `.gitignore` 增加 `*.log`、`vite.config.ts.timestamp-*.mjs` 等条目；验证：`git status` 不再把这些文件列为未跟踪/变更项
- [x] 1.3 删除 `package.json` 中无依赖/无配置的 `lint` 脚本；验证：`package.json` 的 scripts 中不再出现 `lint`

## 2. 单一数据源（demos.json）

- [x] 2.1 新建 `src/lib/demos.json`，将 6 个 demo 的 `name/slug/category/path/description/keywords` 统一为带尾斜杠路径；新建 `src/lib/demoIcons.tsx` 提供 `slug -> icon` 映射与缺省回退；验证：`tsc` 通过且 JSON 可被 Vite 正常解析
- [x] 2.2 重构 `src/lib/Meta.tsx`，从 `demos.json` 与 `demoIcons.tsx` 派生 `Demos` 数组，保持 `Demo` 类型与 `siteUrl` 导出不变；验证：`npm run dev` 首页仍正确渲染 6 张实验卡片
- [x] 2.3 让 `src/App.tsx` 用 `Demos` 数据 `map()` 生成 `<Route>`，替代手写 6 条路由；验证：6 个路由均可正常访问
- [x] 2.4 让 `src/components/Layout.tsx` 的面包屑与侧边栏高亮改用 `normalizePath()`（去尾斜杠后比较）；验证：访问 `/friction-inclined-plane/` 时面包屑与侧边栏正确高亮
- [x] 2.5 让 `scripts/prerender.js` 通过 `fs.readFileSync` + `JSON.parse` 读取 `demos.json` 的 paths 派生 routes，替代手写数组；验证：脚本运行生成的 routes 与 `demos.json` 一致

## 3. 公共抽象（hooks 与组件）

- [x] 3.1 新建 `src/hooks/useSimulation.ts`，封装「useMemo 预计算时间轴 + requestAnimationFrame 推进 time + play/pause/reset/currentFrame」；验证：最小示例能正确推进时间并重置
- [x] 3.2 新建 `src/hooks/useSVGScene.ts`，封装 svg.js 的初始化/clear/卸载；验证：挂载/卸载不残留 SVG 节点
- [x] 3.3 新建共享组件 `DemoControls`、`ParamSlider`、`DataPanel`、`PrincipleCard`，抽离各 demo 重复的播放/重置、Slider、数据面板与原理说明 JSX；验证：`tsc` 通过
- [x] 3.4 新建共享 `DemoPage` 壳组件，统一承载卡片布局与画布容器，并在挂载后设置 `window.__PRERENDER_READY__ = true`；验证：任意 demo 经该壳渲染后该标志为真

## 4. 物理纯函数（src/lib/physics/）

- [x] 4.1 抽取落球/浮力/阻力欧拉积分为纯函数模块；验证：给定参数输出的状态数组与迁移前对拍一致
- [x] 4.2 抽取透镜成像公式（`1/f = 1/u + 1/v`、放大率、像类型判定）为纯函数；验证：典型物距（u>2f、u=2f、f<u<2f、u<f）结果符合预期
- [x] 4.3 抽取斜面受力与折射（斯涅尔/菲涅尔）计算为纯函数；验证：关键输入输出与迁移前一致

## 5. 迁移 6 个 demo 到公共抽象

- [x] 5.1 迁移 `FallingBall.tsx` 使用 `useSimulation` + `useSVGScene` + `DemoPage` + 共享组件，行为不变；验证：播放/拖动时间轴/调参的动画与数据面板与迁移前一致
- [x] 5.2 迁移 `FrictionInclinedPlane.tsx`；验证：受力分析交互与迁移前一致
- [x] 5.3 迁移 `AirWaterRefraction.tsx`；验证：折射光路随入射角变化与迁移前一致
- [x] 5.4 迁移 `ConvexLensSim.tsx`；验证：成像规律（实像/虚像、放大/缩小）与迁移前一致
- [x] 5.5 迁移 `ConcaveLensSim.tsx`；验证：凹透镜成像表现与迁移前一致
- [x] 5.6 迁移 `EyeSim.tsx`（纯 React SVG，复用共享控件与 `DemoPage` 壳承载就绪标志）；验证：晶状体厚度随物距变化与迁移前一致

## 6. 预渲染健壮性

- [x] 6.1 让 `scripts/prerender.js` 等待由 `DemoPage` 设置的 `window.__PRERENDER_READY__` 标志，替代「等待 `#root` 出现『实验控制』文案」；验证：页面文案变动时预渲染仍能稳定完成
- [x] 6.2 用对 preview 端口的健康检查轮询替代固定 `sleep 3000`；验证：冷启动与已启动两种情况下预渲染都能正确等待服务器就绪

## 7. 集成验证

- [x] 7.1 `npm run build`（`tsc` + `vite build`）全量通过；验证：无类型错误且产物正常生成
- [x] 7.2 `npm run build:prerender` 成功，`dist/` 下每个路由目录都包含渲染后的静态 `index.html`；验证：各页面静态 HTML 包含对应实验内容而非空 `#root`
- [x] 7.3 `npm run dev` 手动走查 6 个实验，确认无回归

## Workflow follow-up

- 实现完成后可按项目评审要求归档本 change（`openspec archive`）。
- 归档后复核部署产物（GitHub Pages）。