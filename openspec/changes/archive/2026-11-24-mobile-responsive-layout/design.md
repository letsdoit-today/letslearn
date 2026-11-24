# Design

## Context

技术栈为 Vite + React + Tailwind（`sm`=640px、`md`=768px 断点），纯静态站点，经 Puppeteer 预渲染后部署 GitHub Pages。当前布局（详见 proposal.md - Why）存在两层问题：内容区多层固定内边距叠加、侧边栏无移动端抽屉行为。

相关现状：

- 布局壳 [Layout.tsx](file:///e:/workspace/learn/src/components/Layout.tsx)：内容包裹层 `<div className="flex-1 p-6">`、顶栏 `<header className="... px-6">`、侧边栏 `<aside>` 用 `isSidebarOpen`（默认 `true`）控制 `w-64`/`w-0` 折叠。
- 页面容器 [DemoPage.tsx](file:///e:/workspace/learn/src/components/demo/DemoPage.tsx)：`container mx-auto p-4`。
- 首页 [Dashboard.tsx](file:///e:/workspace/learn/src/components/Dashboard.tsx)：`container mx-auto max-w-5xl`（无覆盖，吃满 container 配置的 `2rem` 内边距）。
- 共享卡片 [card.tsx](file:///e:/workspace/learn/src/components/ui/card.tsx)：`CardHeader`/`CardContent` 默认 `p-6`。
- `tailwind.config.cjs` 的 `container` 配置为 `center: true; padding: "2rem"`。

## Goals / Non-Goals

**Goals:**

- 移动端内容贴边约 12~16px（外层 gutter），桌面端视觉与现状完全一致。
- 移动端侧边栏默认收起，展开为带遮罩的抽屉浮层；桌面端保持常驻 + 可折叠。

**Non-Goals:**

- 不改动任何 demo 的物理/交互行为，纯布局与侧边栏交互调整。
- 不引入新的 UI 组件库、不引入 Canvas/WebGL 等新渲染方案。
- 不改变 `sm`（640px）及以上的桌面端间距与侧边栏行为。

## Decisions

### 1. 内边距响应式策略：逐层加断点变体

对每层内边距分别加 `sm:` 前缀，移动端收紧、`sm` 及以上恢复原值，保证桌面端零改动：

| 位置 | 现状 | 目标 |
|---|---|---|
| Layout 内容包裹层 | `p-6` | `p-3 sm:p-6` |
| Layout 顶栏 | `px-6` | `px-3 sm:px-6` |
| DemoPage 容器 | `p-4` | `p-2 sm:p-4` |
| Dashboard 容器 | `container mx-auto max-w-5xl`（吃 2rem） | 追加 `px-3 sm:px-8` |
| CardHeader | `p-6` | `p-4 sm:p-6` |
| CardContent | `p-6 pt-0` | `p-4 pt-0 sm:p-6 sm:pt-0` |

- 移动端外层 gutter（Layout `p-3` 12px + DemoPage `p-2` 8px）合计约 20px，符合「常见做法 12~16px」的量级；卡片内部（Card 16px）是正常内容留白。
- Dashboard 用 `px-3 sm:px-8`：`sm:px-8`（32px）恰好等于 container 配置的 `2rem`，桌面端保持不变，仅移动端收到 12px。

> 备选：直接改 `tailwind.config.cjs` 的 `container.padding` 为响应式。缺点是无法表达「按断点变化」，且会同时影响所有 `container` 使用方，粒度太粗，故不采用。

### 2. Card 组件是否收紧：收紧，但保持 `pt-0` 语义

`CardHeader`/`CardContent` 是全局共享组件，改默认值会波及首页卡片与 6 个实验页。移动端卡片内部 24px 同样偏大，因此一并收紧到 16px，桌面端保持 24px。`CardContent` 的 `pt-0`（顶部靠 Header 的内边距）语义保持不变，仅调整其值。

> 备选：只收紧外层 gutter、不动 Card。缺点是移动端「卡片边缘到文字」仍 24px，紧凑感不足，故不采用。

### 3. 侧边栏响应式：桌面常驻 + 移动抽屉，用 `isDesktop` 分流

引入 `useMediaQuery('(min-width: 768px)')` 判断是否桌面端，并拆分为两组状态：

- `desktopOpen`（默认 `true`）：桌面端侧边栏，沿用现有 `w-64`/`w-0` 折叠语义，推挤内容。
- `mobileOpen`（默认 `false`）：移动端抽屉，`fixed` 浮层滑入，不推挤内容。
- 左上角按钮：`isDesktop` 时切换 `desktopOpen`，否则切换 `mobileOpen`。

侧边栏 `<aside>` 通过 `md:` 断点前缀区分两种形态：

- 移动端（基础）：`fixed inset-y-0 left-0 z-50 w-64`，`translate-x-0` / `-translate-x-full` 控制滑入滑出，展开时加阴影。
- 桌面端（`md:`）：`md:static md:inset-auto md:z-auto`，`md:w-64` / `md:w-0` 控制折叠。

遮罩层仅在 `!isDesktop && mobileOpen` 时渲染：`fixed inset-0 z-40 bg-black/40`，点击遮罩关闭。移动端点击导航项后自动收起抽屉（常见做法）。

> 备选 A：纯 CSS 用 `md:` 类 + 单一布尔状态实现。缺点是无法在「移动端默认收起、桌面端默认展开」两种初始值之间切换（布尔只能有一个初始值），跨断点行为会错乱。
> 备选 B：用第三方 headless UI 抽屉组件。引入新依赖、收益有限，故不采用。

### 4. `useMediaQuery` 的 SSR/预渲染安全

项目经 Puppeteer 预渲染，Node 侧首次渲染无 `window`，需保证钩子安全：

- 初始值：`typeof window !== 'undefined' ? window.matchMedia(q).matches : true`（无 window 时默认桌面端，避免移动端首帧抽屉闪烁）。
- 副作用：`useEffect` 中 `matchMedia` + `change` 监听，卸载时移除监听。

## Risks / Trade-offs

- [共享 Card 组件改动波及首页卡片] → 桌面端值不变（`sm:p-6`），仅移动端收紧，且走查首页与 6 个实验页核对。
- [移动端首帧可能短暂显示桌面侧边栏再收起（预渲染 HTML 为桌面布局，移动端水合后纠正）] → 默认 `isDesktop=true` + `mobileOpen=false` 保证不闪抽屉；首帧闪烁极小且仅影响极短时间，接受。
- [fixed 浮层 z-index 与顶栏 sticky（`z-10`）的层级冲突] → 侧边栏 `z-50`、遮罩 `z-40`，均高于顶栏，展开时正确覆盖。
- [桌面端折叠行为回归] → 保留原 `w-64`/`w-0` 语义，仅在断点前缀与状态拆分上改动。

## Migration Plan

- 纯静态站点，无数据库/schema 迁移；改动合入后由 GitHub Actions 跑 `npm run build:prerender` 产出 `dist/` 并部署。
- 回滚策略：提交回退即可（无状态、无服务端数据）。

## Open Questions

- 抽屉展开时是否锁定背景滚动（body scroll lock）——属于可后置的体验细节，不影响本次方案与任务拆分，可在实现时按复杂度取舍。