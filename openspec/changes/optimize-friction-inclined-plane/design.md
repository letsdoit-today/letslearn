# Design

## Context

参见 `proposal.md` 的 Why。当前实现要点：

- `src/demos/FrictionInclinedPlane.tsx` 用一个 `requestAnimationFrame` 循环同时承担「抬升倾角」与「方块下滑」两件事，倾角因此没有独立的输入通道。
- 物理计算集中在 `src/lib/physics/inclinedPlane.ts` 的 `calculateInclinedPlaneForces`，只输出 `G / N / Gx / f / fMax`，不含临界角与加速度。
- 画布用 `snapRef` 缓存 4 条力矢量路径与 4 个标签，全部挂在方块所属的 `blockLayer` 上，随斜面一起旋转。
- 侧栏放置了 `DataPanel(G, N)`，与 `openspec/specs/demo-workspace-layout/spec.md` 的「侧栏 MUST NOT 包含实时读数」冲突。

## Goals / Non-Goals

**Goals**

- 把倾角从「动画内部变量」提升为「可外部设定的状态」，使自动演示与手动滑块共享同一条倾角通道。
- 让临界角在画布上可见，而不只是卡片里的一行公式。
- 让状态机同时覆盖静止、下滑与上滑三条路径，且三者的摩擦力方向、加速度计算各自独立。
- 把页面重新对齐 `demo-workspace-layout`：实时读数只进 KPI 条，侧栏只放控制。

**Non-Goals**

- 不做 `f–θ` 曲线图：会挤占工作台同屏预算，且信息可由 KPI 的 `f` 与 `f_max` 两个数加状态提示覆盖。
- 不做方块拖动：拖动只改变初始位置，不改变任何物理结论，性价比低于前两项。
- 不引入抛体、碰撞、弹簧振子、圆周运动内容，本页只覆盖斜面与摩擦。
- 不改动 `demo-workspace-layout` 的既有要求，只让本页重新满足它。

## Decisions

### 1. 倾角改为受控状态，自动演示降级为「倾角驱动器」

`angle` 由 `useState` 持有，滑块与自动演示都写同一份 `stateRef.current.angle`。自动演示不再是独立状态机，而是「以固定角速度推进倾角」的循环；用户拖动滑块时立即置 `isSimulating = false`，自动演示让位。

- 备选：保留两套倾角（动画用 `stateRef`、滑块用 `useState`），再同步。已否决——两套真值来源正是当前「滑块缺失」的根源。
- 备选：用 `useSimulation` 统一驱动。已否决——该 hook 以「固定物理模型逐帧推进」为前提，而本页需要的是「倾角推进 + 滑动积分」两段不同语义的推进，套用会引入额外抽象。

### 2. 临界角作为独立派生量，画布绘制幽灵板

`calculateInclinedPlaneForces` 增加 `thetaC`（`arctan μ`，`μ = 0` 时为 0）与 `accel`（滑动时的 `g(sinθ − μcosθ)`，静止时为 0）。画布新增一块独立于当前斜面的 `criticalPlank`（虚线、低透明度），其旋转角固定为 `thetaC`，不参与方块定位。

- 幽灵板挂在 `staticLayer` 而不是 `plankLayer`：它描述的是「阈值」而非「实体」，不应随当前斜面一起旋转。
- 方块是否滑动由 `Gx > fMax` 判定，与幽灵板角度仅做视觉一致性校验，不做逻辑耦合，避免「视觉与物理各算一次」的分叉。

### 3. 状态机四态：静止 / 临界 / 下滑 / 上滑

`status` 由字符串改为联合类型 `'static' | 'critical' | 'sliding' | 'rising'`，画布角标的文案与配色由该枚举映射。

- `critical` 只在 `|θ − θc|` 小于 1° 且物体静止时进入，用于提示「即将滑动」。
- `rising` 与 `sliding` 共用同一套动力学积分，区别仅在于摩擦力的符号与初速度方向。

### 4. 上滑模式用初速度注入，不新增独立页面状态

复用同一套积分：给 `velocity` 一个正值（沿斜面向上为正），摩擦力恒指向斜面下方。当速度过零时按 `Gx > fMax` 重新判定，满足则转 `sliding`，否则停在最高点。

- 备选：为上滑单独建一套「冲上斜面」动画脚本。已否决——上滑与下滑的差别只有初速度符号与摩擦力方向，独立脚本会造成两处重复的积分逻辑。

### 5. 力矢量由「旋转层内坐标」改为「沿斜面基向量计算」

现有实现把矢量画在随斜面旋转的 `blockLayer` 内，长度方向用 `sin/cos` 拼出来，倾角变化时容易出现标签错位。改为在 `draw()` 中按斜面单位向量 `(cosθ, sinθ)` 与法向 `(−sinθ, cosθ)` 直接计算端点，矢量仍挂在 `blockLayer`，但长度与方向全部由世界坐标换算，标签位置同步。

- 保留 `blockLayer` 挂载：方块本体已经在其中，矢量随方块平移的语义不变，改动面最小。

### 6. 实时读数分层

- KPI 条（6 项）：`θ`、`θc`、`Gx`、`f_max`、`f`、状态（`hint` 放加速度）。
- 侧栏：只留倾角、质量、摩擦系数三个滑块与播放控制，移除 `DataPanel`。
- `G` 与 `N` 不再单独占一行明细：`G` 由质量与 `g` 直接决定（属恒定派生量），`N` 由 `G` 与 `θ` 决定且已在画布矢量中体现，按 `demo-workspace-layout` 的「同一物理量 MUST NOT 在多个层级重复出现」降级为讲解区下方的参考常量行。

### 7. 动画循环按时间步长推进

`loop` 改为接收时间戳，用 `dt` 累积推进：倾角按 `degPerSecond` 推进，滑动速度按 `accel * dt` 积分。同时循环仅在 `isSimulating` 时继续 `requestAnimationFrame`，空闲时停表。

- 这同时修掉两件事：120Hz 屏幕上速度翻倍，以及页面打开后每帧空转。

## Risks / Trade-offs

- [幽灵板与当前斜面角度接近时视觉重叠] → 幽灵板用虚线 + 0.35 透明度，且 `θc` 标签单独标注在板端，重叠时仍可分辨。
- [上滑模式的初速度对用户不可见，可能误以为方块无故上升] → 进入上滑模式时在画布角标写明「初速度上滑」，并让速度读数出现在状态 hint 中。
- [KPI 扩到 6 项后 1024 视口可能换行] → 沿用 `KpiBar` 的 `flex-wrap`，并跑 `verify-layout.mjs` 断言无横向溢出；若换行导致超屏，则把「状态」项合并为 `θ` 项的 `hint`。
- [移除侧栏 `DataPanel` 后 `G`、`N` 无处安放] → 按决策 6 降级为参考常量行，放在讲解卡片下方，不占侧栏纵向空间。

## Migration Plan

单页改动，无数据迁移。发布顺序：改 `inclinedPlane.ts` → 改 `FrictionInclinedPlane.tsx` → 改 `demos.json` → 重跑 `build:prerender` 与 `verify-layout` → 重生成 `og-friction-inclined-plane.jpg`。回滚即恢复该三文件与对应 og 图。

## Open Questions

（无。上滑模式、`f–θ` 曲线、方块拖动三项已由用户确认取舍，其余决策均可在本设计内闭环。）