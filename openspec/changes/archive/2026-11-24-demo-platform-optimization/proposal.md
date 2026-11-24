# Proposal

## Why

项目在技术基础设施层面存在多处脱节与冗余：`build:ssg` 脚本指向不存在的文件、路由尾斜杠不一致导致面包屑与侧边栏高亮失效、README 与代码脱节、仓库混入本地临时文件；同时 6 个 demo 各自重复实现 SEO、布局、控制面板与物理计算样板代码，新增一个实验需要在 5 处手动登记，维护成本高且极易漏改。此时先收敛基础设施，才能支撑后续数学/化学内容的低成本扩展。

## What Changes

- 移除冗余构建脚本：删除 `build:ssg`（本就指向不存在的 `scripts/ssg-generator.js`）与 `scripts/generate-static.js`，仅保留 `build:prerender`（`prerender.js` 已覆盖前者功能）。
- 移除无依赖/无配置的 `lint` 脚本（`tsc` 已提供基础静态检查，避免 `npm run lint` 直接报错）。
- 统一所有 demo 路由的尾斜杠规则，并将面包屑/侧边栏高亮改为归一化路径匹配。
- 更新 README，删除不存在的 `dynamicRoutes` 描述，收敛"新增 demo"的登记步骤。
- 清理根目录临时文件（`1.svg`、`excalidraw.log`、`server.log`、`vite.config.ts.timestamp-*.mjs`、`public/test.html`），并补全 `.gitignore`。
- 将 demo 元信息收敛为单一数据源（`Meta.tsx`），以配置驱动生成路由、侧边栏菜单与 `prerender.js` 的 routes 列表。
- 抽取公共抽象：`useSimulation`（物理预计算 + requestAnimationFrame 循环）、`useSVGScene`（svg.js 生命周期管理）、共享 `DemoPage` 壳（卡片/画布容器/就绪标志）与共享的演示控制条、数据面板组件。
- 将物理计算逻辑抽到纯函数层（`src/lib/physics/`），与 React/SVG 解耦，便于复用与测试。
- 增强预渲染健壮性：用由共享 `DemoPage` 统一设置的 `window.__PRERENDER_READY__` 就绪标志替代"等待特定文案出现"，并把固定 sleep 改为端口健康检查。

## Capabilities

### New Capabilities

无。本变更属于纯重构 / 工具链 / 文档修复，不引入新的系统行为，也不改变既有 spec 级需求，故通过 `.openspec.yaml` 的 `skip_specs: true` 显式跳过 specs。

### Modified Capabilities

无。

## Impact

- 构建脚本：`package.json`（删除 `build:ssg`/`lint`）、删除 `scripts/generate-static.js`
- 路由与元信息：`src/lib/Meta.tsx`、`src/App.tsx`、`src/components/Layout.tsx`
- 演示代码：`src/demos/*.tsx`（6 个 demo 抽取公共逻辑）
- 新增抽象：`src/hooks/useSimulation.ts`、`src/hooks/useSVGScene.ts`、`src/components/DemoPage.tsx`、`src/lib/physics/*.ts`
- SEO/预渲染：`scripts/prerender.js`、`vite.config.ts`、`index.html`
- 文档与清理：`README.md`、`.gitignore`