# Proposal

## Why

`/concave-lens/` 直接沿用了凸透镜演示的骨架，带来三个会误导学生的正确性问题：画布标出 `2F / 2F′`（凹透镜不存在「二倍焦距分大小」的判定意义）、虚焦点被画成实心实焦点、像距直接显示负值 `-75`。同时，初中凹透镜的两大必考点「不能用光屏承接」与「虚焦点」在页面上完全缺席，第三条特殊光线也缺失。

## What Changes

- **BREAKING**（仅限页面视觉标注）：移除画布上的 `2F / 2F′` 标注；`F / F′` 改为虚线空心圆并标注「虚焦点」，与凸透镜的实焦点在视觉上区分开。
- 像距读数改为非负的「距离 + 同侧」表述（如 `75（同侧）`），不再直接呈现负值。
- 反向延长线延长到虚焦点，使「平行光折射后发散、反向延长线过虚焦点」在画面上可见。
- 新增第三条特殊光线：射向另一侧虚焦点 F′ 的光线，出射后平行主光轴；其反向延长线为水平线，正好落在像顶。
- KPI 由 4 卡扩展为 5 卡：物距 u、像距 v、放大率 m（提示像高 h′）、成像性质、像的位置（提示光屏不可承接）。
- 演示区下方新增「凹透镜考点速查」6 条，仅以链接指向对照表页面，不复制已有表格。
- 关键词分工：`/lens-imaging-rules/` 让出「凹透镜成像规律」主词，该词归 `/concave-lens/` 独占。
- 同步更新 `ROADMAP.md` 的光学章节说明。

明确不做：焦距可调、可拖光屏、物距区段高亮。凹透镜没有 u>2f / f<u<2f 的分界，强行标注反而制造误导；光屏在凹透镜下只能演示「永远接不到」，价值主要来自跨页对照，留待单独评估。

## Capabilities

### New Capabilities

- `concave-lens-imaging`: 凹透镜成像演示能力，覆盖虚焦点表示、三条特殊光线作图、像距非负读数、像与物同侧且不可用光屏承接、物近像大等初中考点。

### Modified Capabilities

（无。`convex-lens-imaging` 与 `plane-mirror-imaging` 的要求不变；本次关键词调整属于元数据，不构成 spec 级行为变更。）

## Impact

- `src/demos/ConcaveLensSim.tsx`：主要改动文件，涉及静态标注、光路、KPI 与 extra 插槽。
- `src/lib/demos.json`：`concave-lens` 的 description / keywords 更新；`lens-imaging-rules` 的 keywords 移除「凹透镜成像规律」。
- `src/lib/physics/lens.ts`：不改逻辑，仅在页面侧对 `v` 做取绝对值与同侧判定。
- `ROADMAP.md`：光学章节补充凹透镜说明。
- 校验链：`tsc`、`build`、`sitemap:check`、`verify:layout`、`build:prerender` 均需保持通过。