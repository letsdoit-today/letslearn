# Design

## Context

当前架构（见 proposal.md - Why）：

- 6 个 demo 通过 `react-router-dom` 的 `Routes` 显式声明，路由、侧边栏菜单、`prerender.js` 的 routes 数组、README 的登记清单各自维护一份路径，靠手工保持一致。
- 动画采用「useMemo 预计算物理量 + requestAnimationFrame 推进时间 + svg.js 命令式改属性」三件套，但每个 demo 独立实现，样板代码重复度高。
- `prerender.js` 用 Puppeteer 抓取渲染后的 HTML 做 SEO 预渲染，但"等待 `#root` 出现『实验控制』文案"与"固定 sleep 3 秒等服务器就绪"都是脆弱耦合。
- `tsconfig.json` 已开启 `resolveJsonModule`，React/Node 两侧均能读取 JSON。

约束：项目是纯静态站点，部署到 GitHub Pages；Node 端脚本（`scripts/*.js`）以 ESM 运行（`package.json` 的 `"type": "module"`），不能直接 import TSX。

## Goals / Non-Goals

**Goals:**

- 让 demo 元信息成为唯一事实来源，路由/菜单/预渲染 routes 全部由它派生。
- 把 6 个 demo 共用的"仿真循环 + SVG 生命周期 + 控制面板"抽象成可复用 hook 与组件。
- 把物理计算与 React/SVG 解耦为纯函数，便于复用与测试。
- 让预渲染的就绪判断稳定、可维护。

**Non-Goals:**

- 不新增任何实验能力或改变既有 demo 的物理/交互行为（纯重构，故 `skip_specs: true`）。
- 不引入 Canvas/WebGL 等新渲染方案（现有 svg.js 方案保持不变）。
- 不涉及数学/化学内容的实际开发。

## Decisions

### 1. 单一数据源：`src/lib/demos.json` + 图标映射分离

将 demo 的纯数据（`name`、`slug`、`category`、`path`、`description`、`keywords`）收敛到 `src/lib/demos.json`。图标是 React 组件，无法进 JSON，因此用 `src/lib/demoIcons.tsx` 做 `slug -> icon` 的映射（缺省回退到通用图标）。

- React 侧：`import demos from '@/lib/demos.json'`（`resolveJsonModule` 已开启）。
- Node 侧（`prerender.js`）：`fs.readFileSync` + `JSON.parse` 读取 paths，避免 Node ESM 的 JSON import assertion 兼容性问题。
- 派生：`App.tsx` 用 `demos.map()` 生成路由；`Layout.tsx` 用同一数据生成侧边栏；脚本用同一数据生成 routes。

> 备选：把数据写成 `.mjs` 模块（Node 可 import，但丢失 TS 类型）或 `.ts`（Node 无法直接运行）。JSON + `fs` 读取最稳妥，且无需引入额外构建步骤，故选用。

### 2. 公共抽象：`useSimulation` 与 `useSVGScene`

- `useSimulation(params, physicsFn, { dt, maxTime })`：内部用 `useMemo` 预计算时间轴状态数组，维护 `time` / `isRunning` / `play` / `pause` / `reset` / `currentFrame`，并用 `requestAnimationFrame` 推进时间。把现在 `FallingBall.tsx` 里散落的"计算 + RAF + 查表"逻辑收敛为一处。
- `useSVGScene(svgRef, drawFn)`：负责 `SVG(svgRef)` 初始化、`clear()`、卸载清理，返回 `Svg` 实例，统一管理 svg.js 生命周期。
- 共享 `DemoPage` 壳：统一承载卡片布局与画布容器，并在挂载后设置 `window.__PRERENDER_READY__ = true`（见决策 4）。所有 demo 都经由此壳，避免 `EyeSim` 这类非 svg.js 页面漏设标志。
- 共享 UI：`DemoControls`（播放/暂停/重置 + HoverCard）、`ParamSlider`、`DataPanel`、`PrincipleCard`，消除 6 个 demo 的重复 JSX。

> 备选：继续保留各 demo 独立实现，仅抽出物理函数。缺点是无法消除 RAF/SVG 生命周期/控件样板，维护成本仍高，故不采用。

### 3. 物理纯函数：`src/lib/physics/`

将欧拉积分、透镜公式（`1/f = 1/u + 1/v`、放大率）、斯涅尔/菲涅尔、斜面受力等抽到 `src/lib/physics/` 下的纯函数模块，输入参数、输出状态数组，不依赖 React 或 svg.js。可直接用测试覆盖。

### 4. 预渲染就绪信号

- 用 `window.__PRERENDER_READY__` 标志替代"等待文案出现"：标志由共享 `DemoPage` 壳在挂载后置真（所有 demo 统一经过），避免每个 demo 手动设置。
- `prerender.js` 把 `waitForFunction` 改为等待该标志，并把"固定 sleep 3 秒等服务器"改为对 preview 端口做健康检查轮询（`fetch` 直到可访问）。

> 备选：保留文案等待。缺点是与中文文案强耦合，文案一改即静默超时，故不采用。

### 5. 路由尾斜杠统一

统一所有路由为**带尾斜杠**（与当前多数路由一致），并新增 `normalizePath()`（去除尾斜杠后比较）用于 Layout 的面包屑与侧边栏高亮，避免再因斜杠差异失效。

### 6. 脚本与清理

- 删除冗余构建脚本：`build:ssg`（本就指向不存在的文件）与 `scripts/generate-static.js`，仅保留 `build:prerender`（`prerender.js` 已覆盖其功能）；同时删除无依赖/无配置的 `lint` 脚本。
- 删除根目录临时文件与 `public/test.html`，并在 `.gitignore` 增加 `*.log`、`vite.config.ts.timestamp-*.mjs` 等条目。

## Risks / Trade-offs

- [重构 6 个 demo 可能引入物理/动画回归] → 逐个 demo 迁移，保留视觉核对；以 `tsc`（`npm run build` 含类型检查）作为硬门禁。
- [JSON 作为数据源丢失图标类型安全] → 用 `demoIcons.tsx` 的 `Record<slug, icon>` 显式映射，缺省回退默认图标。
- [预渲染就绪标志若遗漏会导致超时] → 标志收敛到共享 `DemoPage` 壳内，不要求各 demo 单独设置。
- [尾斜杠变更可能影响既有收藏/外链] → 选择与现有链接一致的带斜杠方案，且 `prerender.js` 的 routes 由 JSON 统一派生，保持一致。

## Migration Plan

- 纯静态站点，无数据库/schema 迁移。改动合入后由 GitHub Actions 跑 `npm run build:prerender` 产出 `dist/` 并部署。
- 回滚策略：提交回退即可（无状态、无服务端数据）。

## Open Questions

- 未来数学/化学 demo 是否沿用 `useSimulation` 抽象，还是需引入 Canvas 等新渲染路径——留待新内容规划时评估。