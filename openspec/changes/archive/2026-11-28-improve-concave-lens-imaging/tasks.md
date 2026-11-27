# Tasks

## 1. 几何标注修正

- [x] 1.1 在 `src/demos/ConcaveLensSim.tsx` 的 `useSVGScene` 中删除 `2F` 与 `2F′` 两个标注点，仅保留 `F`、`F′`、`O` 三个标记；验证：画布上不再出现 `2F` 文本，`grep "2F" src/demos/ConcaveLensSim.tsx` 在标注相关代码中无命中。
- [x] 1.2 将 `F` 与 `F′` 标记改为虚线空心圆（`fill('none')` + `stroke({ width: 1.5, dasharray: '2,2' })`），文字标注改为「虚焦点 F」与「虚焦点 F′」；验证：浏览器打开 `/concave-lens/`，两个焦点显示为空心虚线圈且标签含「虚焦点」。
- [x] 1.3 将 `virtualFocus` 虚线路径终点从像顶延长到物侧虚焦点 `(centerX - f, centerY)`；验证：拖动物距滑块后，该虚线始终穿过像顶并落在虚焦点圆环上。

## 2. 第三条特殊光线

- [x] 2.1 在 `snapRef` 的 `rays` 结构中新增 `thirdIncident`（入射段）与 `thirdRefracted`（出射段）两条路径，并在 `updateScene` 中按「物顶 → 像侧虚焦点」求入射落点、出射段水平延伸至画布右边界；验证：`u=300` 时入射落点为 `(400,235)`、出射段为 `y=235` 的水平线，与 design.md 的验算一致。
- [x] 2.2 为第三条光线的反向延长线补一段水平虚线，终点落在像顶 `(centerX + v, imgTopY)`；验证：画面上三条反向延长线在像点处共点。
- [x] 2.3 在 `updateScene` 中对 `v` 为负、像点在画布外或物距极小的边界情形做保护，避免路径出现 `NaN`；验证：把物距滑块拉到 `10` 与 `350` 两端，画布无报错、无异常折线。

## 3. KPI 与读数

- [x] 3.1 将像距卡改为显示 `Math.abs(data.v)`，不再出现负号；验证：任意物距下 KPI 像距均为正数。
- [x] 3.2 将 KPI 扩展为 5 卡：物距 u、像距 v、放大率 m（hint 显示像高 `h′ = |m| * 60`）、成像性质、像的位置（值「同侧」，hint「光屏不可承接」）；验证：`/concave-lens/` 的 KPI 为单行 5 卡，不折行。
- [x] 3.3 将 `成像性质` 文案统一为无空格形式（`data.typeText.replace(/\s+/g, '')` 或修正 `IMAGE_TYPE_TEXT` 中的 `正立、缩小、虚像` 条目），使两页显示一致；验证：`/concave-lens/` 与 `/convex-lens/` 的成像性质卡排版一致。

## 4. 考点速查与页面文案

- [x] 4.1 在 `extra` 插槽新增「凹透镜考点速查」区块，含 6 条（发散作用、虚焦点含义、光屏不可承接、近视眼镜应用、判断透镜类型、物近像大），采用 `grid gap-3 sm:grid-cols-2` 排布；验证：演示区下方可见 6 个条目卡，且不包含凸透镜五种物距表格。
- [x] 4.2 在考点速查末尾添加指向 `/lens-imaging-rules/` 的链接并说明本页只讲凹透镜；验证：链接可跳转且目标页存在该对照表。
- [x] 4.3 更新 `principles` 中的三条原理卡，使其与新的标注一致（明确「虚焦点」「反向延长线」表述，移除与 `2F` 相关的暗示）；验证：原理卡文本中不出现 `2F`。

## 5. 元数据与关键词分工

- [x] 5.1 更新 `src/lib/demos.json` 中 `concave-lens` 的 `description` 与 `keywords`，补充「虚焦点」「光屏不可承接」「三条特殊光线」等考点词；验证：`/concave-lens/` 页面 head 中 description 与 keywords 已更新。
- [x] 5.2 从 `src/lib/demos.json` 中 `lens-imaging-rules` 的 `keywords` 移除「凹透镜成像规律」，保留其凸透镜对照表主词；验证：遍历 `demos.json` 后，`keywords` 中含「凹透镜成像规律」的条目只剩 `concave-lens`（`description` 中的正常提及不计入关键词分工）。
- [x] 5.3 更新 `ROADMAP.md` 光学章节，补充凹透镜页面的考点覆盖说明；验证：`ROADMAP.md` 中出现凹透镜条目且描述与实现一致。

## 6. 全链路验证

- [x] 6.1 运行 `npm run build`（含 `tsc` 与 `sitemap:check`），确认类型检查与站点地图均通过。
- [x] 6.2 运行 `npm run verify:layout`，确认 `/concave-lens/` 的画布、KPI 与侧栏均无溢出断言失败。
- [x] 6.3 运行 `npm run build:prerender`，确认预渲染阶段 `/concave-lens/` 正常产出。

## Workflow follow-up

- 按项目评审要求归档该 change，并在归档后确认 `openspec/specs/concave-lens-imaging/spec.md` 已生成。