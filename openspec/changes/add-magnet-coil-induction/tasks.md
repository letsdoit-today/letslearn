# Tasks

## 1. 物理内核

- [x] 1.1 在 `src/lib/physics/magnetCoil.ts` 定义参数与帧类型（`MagnetCoilParams`、`MagnetCoilFrame`、阶段枚举），并导出默认参数与预设，验证 `tsc` 通过且类型被 demo 引用时无隐式 any
- [x] 1.2 实现磁通量闭式解 `fluxAt(params, z)` 与导数 `dFluxDz(params, z)`，验证在 z = 0 处取极大、在 z = a/2 处导数绝对值取极大（可在临时脚本中打印数值核对）
- [x] 1.3 实现自感与时间常数 `inductanceOf`、`tauL`，验证默认参数下 L 在毫亨量级、τ_L 小于 30 ms
- [x] 1.4 实现四阶段时间轴生成（插入 / 停留 / 拔出 / 停留）与「一次穿过」预设，验证总时长等于 2·z0/v + 2·holdTime、帧按 t 单调递增且帧数随运动段与自由衰减窗口动态确定
- [x] 1.5 实现逐帧派生量（ε = -N dΦ/dt、I = ε/R、楞次力、累计电荷 q = N|ΔΦ|/R、焦耳热 Q = ∫I²R dt），验证停留阶段 ε 与 I 均为零、插入与拔出后 q 各自稳定不再增长
- [x] 1.6 实现冲击电流计弹道积分（θ'' + 2ζω_n θ' + ω_n²θ = k·I，RK4，步长 `min(sampleDt/10, T_n/400)`），验证脉冲结束后 θ 回摆衰减至零且峰值偏角随 q 单调
- [x] 1.7 校验累计电荷与速度无关：同一行程取两档速度各生成一次帧序列，验证两者 q 相同而 ε、I 峰值随速度增大

## 2. 场景与图表绘制

- [x] 2.1 在 `src/demos/MagnetCoilInduction.tsx` 搭建 `DemoPage` 骨架（标题、描述、原理卡、画布列、侧栏），验证页面可渲染且控制台无报错
- [x] 2.2 绘制线圈、磁铁、轴线与磁场示意，使用 `palette.field` 与 `palette.current`，验证磁铁位置随帧移动且磁场符号随磁极朝向切换
- [x] 2.3 绘制感应电流方向标识与楞次力箭头，使用 `palette.current`，验证箭头方向始终与磁铁运动方向相反且大小随帧变化
- [x] 2.4 绘制冲击电流计表盘与指针，验证指针在脉冲后回摆衰减、峰值偏角与 q 对应
- [x] 2.5 绘制 Φ(t) 与 ε(t) 双极性曲线，使用 `palette.emf`，验证 Φ 极大处 ε 过零、ε 峰值出现在 Φ 峰值之前
- [x] 2.6 实现幽灵曲线叠加（低透明度）与对照开关，验证切换速度档后重新播放可叠加上一档曲线、关闭后仅剩当前曲线、首次播放不出现空占位
- [x] 2.7 在画布下方以 `CanvasLegend` 呈现图例，验证图例位于正常文档流且不覆盖画布

## 3. 控制区与读数分层

- [x] 3.1 侧栏接入 `DemoControls`、时间轴滑块、速度滑块与预设选择，验证拖动时间轴时画面与读数同步且播放/重置正常
- [x] 3.2 KPI 条接入 Φ、ε、I、θ、q 五项，验证项数在 4–6 之间且数值随播放逐帧变化
- [x] 3.3 将 N、a、R、m、ΔΦ_total、Q_total、L、τ_L 以单行小字置于讲解区下方，验证侧栏与 KPI 条中不出现这些恒定派生量
- [x] 3.4 核对同一物理量不在 KPI 条、侧栏面板与画布浮层重复出现，验证画布内无承载读数的绝对定位浮层
- [x] 3.5 编写原理卡（法拉第定律、楞次定律、q 与快慢无关、准静态与弹道近似的前提），验证每张卡片为单一文本段落且不出现段落嵌套

## 4. 站点登记

- [x] 4.1 在 `src/lib/demos.json` 新增条目（slug `magnet-coil-induction`、短名「磁铁插入/拔出线圈实验」、path `/magnet-coil-induction/`、描述与关键词），验证 Dashboard 卡片标题不换行且既有条目未改动
- [x] 4.2 在 `src/lib/demoIcons.tsx` 新增 slug 的图标映射，验证 Dashboard 卡片显示新图标而非兜底图标
- [x] 4.3 在 `App.tsx` 的 `demoComponents` 注册组件，验证访问 `/magnet-coil-induction/` 可打开新页面
- [x] 4.4 更新 `README.md` 路线图电磁学计数并标记新增项，验证计数与实际已完成项一致

## 5. 站点地图生成器

- [x] 5.1 实现 `scripts/gen-sitemap.js`，读取 `src/lib/demos.json` 生成 `public/sitemap.xml`（首页加全部演示路由，路径统一以结尾斜杠结尾），验证生成结果的条目集合等于首页与 demos.json 路由的并集
- [x] 5.2 实现 `lastmod` 取值：读取 `src/lib/demos.json` 的最近提交时间供全部条目共用，验证在无 git 信息的环境下生成文件不含 lastmod 字段且无空值
- [x] 5.3 实现 `--check` 模式：内存生成期望内容并与仓库内文件逐字比较，验证一致时退出码为零、手工删除任一条目后退出码非零并打印差异
- [x] 5.4 在 `package.json` 新增 `sitemap` 脚本并在 `build`、`build:prerender` 中置于 `vite build` 之前，验证 `npm run build` 后 `dist/sitemap.xml` 存在且包含全部演示路由
- [x] 5.5 运行生成器并确认 `public/sitemap.xml` 补齐了此前遗漏的 `lever-balance`、`pendulum-oscillation`，且 `friction-inclined-plane` 的路径带结尾斜杠

## 6. 集成验证

- [x] 6.1 运行 `npm run build` 验证类型检查与构建通过
- [x] 6.2 运行 `npm run verify:layout` 验证新路由在 1024×768、1366×768、1920×1080 三种视口下同屏约束、无横向溢出、无非法段落嵌套
- [x] 6.3 运行 `npm run build:prerender` 验证新路由生成 `dist/magnet-coil-induction/index.html`、`dist/sitemap.xml` 包含该路由且预渲染无报错
- [x] 6.4 人工核对既有导体棒演示页面的名称、路径与内容未受影响

## Workflow follow-up

- 待评审通过后归档该 change。
- 归档后确认主规格 `openspec/specs/magnet-coil-induction/spec.md` 已生成且 Purpose 非占位。