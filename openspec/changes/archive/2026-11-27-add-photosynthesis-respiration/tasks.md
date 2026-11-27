# Tasks

## 1. 速率内核

- [x] 1.1 在 `src/lib/bio/photosynthesis.ts` 定义常量与类型：`DAY_START = 6`、`DAY_END = 18`、`P_MAX = 30`、`K_HALF = 45`、`RESPIRATION = 5`、`FRAME_DT = 0.05`，以及 `RateFrame`（`t`、`light`、`photo`、`respire`、`net`）、`DayCycle`（`frames`、`compensationLight`、`compensationTimes`）；验证方式：`npm run build` 的 tsc 阶段通过，被 demo 引用时无隐式 any
- [x] 1.2 实现 `lightAt(t)`：`t` 落在 `[6, 18]` 时返回 `100 * sin(π * (t - 6) / 12)`，其余时刻返回 0；验证方式：`lightAt(12) = 100`、`lightAt(6) = 0`、`lightAt(18) = 0`、`lightAt(3) = 0`、`lightAt(24) = 0`，且 `lightAt(9) ≈ 70.71`
- [x] 1.3 实现 `photoRate(light)`：返回 `P_MAX * L / (L + K_HALF)`（Michaelis–Menten 饱和型），`L ≤ 0` 时返回 0；验证方式：`photoRate(0) = 0`、`photoRate(9) ≈ 5.00`、`photoRate(100) ≈ 20.69`，且对 `L` 单调递增、弱光段增幅远大于强光段
- [x] 1.4 实现 `solveAt(t)`：返回单帧 `RateFrame`，其中 `respire` 恒为 `RESPIRATION`、`net = photo - respire`；验证方式：`solveAt(3).net = -5`、`solveAt(12).net ≈ 15.69`、任意两帧的 `respire` 完全相等
- [x] 1.5 实现 `buildDayCycle()`：生成 `t ∈ [0, 24)` 步长 `FRAME_DT` 的 480 帧，并从 `photoRate` 反解光补偿点光照强度与对应时刻（`arcsin` 反推 `t`，仅取日出到日落区间内的两个解）；验证方式：帧数为 480、`compensationLight ≈ 9.00`、两个补偿时刻分别落在 `[6, 12]` 与 `[12, 18]` 内且为 `06:21` / `17:39`
- [x] 1.6 实现 `netDirection(net)` 与 `formatTime(t)`：`netDirection` 在 `|net| < 0.05` 时返回 `'balanced'`，否则按符号返回 `'absorb'` / `'release'`；`formatTime` 输出 `HH:MM` 且分钟两位补零；验证方式：`netDirection(0)` 为 `balanced`、`netDirection(-5)` 为 `release`、`netDirection(15.69)` 为 `absorb`、`formatTime(6.344) = '06:21'`、`formatTime(23.995) = '00:00'`
- [x] 1.7 在 `tmp/` 下用一次性脚本跑通 1.2–1.6 的全部断言，并额外验证「`P_MAX`、`K_HALF`、`RESPIRATION` 任一改动后补偿点读数随之改变」；验证方式：脚本全部断言通过，输出中可见补偿点与两个补偿时刻，脚本在任务末尾删除

## 2. 语义色与站点登记

- [x] 2.1 在 `src/lib/palette.ts` 的生物色区追加 `bioChloroplast`（绿）、`bioMitochondrion`（橙）、`bioGasCo2`（灰）、`bioGasO2`（蓝）、`bioOrganic`（琥珀），色值沿用 Tailwind 默认色阶；验证方式：`npm run build` 通过，且该文件内无新增十六进制字面量出现在 demo 文件中
- [x] 2.2 在 `src/lib/demoIcons.tsx` 的 `iconMap` 注册 `'photosynthesis-respiration'`，选用与光合/呼吸语义相符的图标，不走 `FlaskConical` 兜底；验证方式：`npm run build` 通过，且侧栏条目与首页卡片显示该图标
- [x] 2.3 在 `src/lib/demos.json` 追加条目：`slug` 为 `photosynthesis-respiration`、`category` 为 `biology`、`path` 为 `/photosynthesis-respiration/`、名称「光合作用与呼吸作用」，`description` 覆盖昼夜扫描、净交换方向与光补偿点，`keywords` 含初中生物检索词；验证方式：`npm run sitemap:check` 通过且输出含 `/photosynthesis-respiration/`
- [x] 2.4 在 `src/App.tsx` 的 `demoComponents` 映射注册 `'photosynthesis-respiration'`，并在顶部导入组件；验证方式：`npm run build` 通过，且访问该路由不再落 404

## 3. 画布骨架与细胞场景

- [x] 3.1 新建 `src/demos/PhotosynthesisRespiration.tsx`，用 `DemoPage` + `DemoMain` + `DemoSidebar` 搭骨架，画布 `viewBox` 取 `0 0 800 500`，`useSVGScene` 一次性创建全部元素并把引用存入 `snapRef`；验证方式：`npm run dev` 打开该路由，静态骨架完整显示且无控制台报错
- [x] 3.2 绘制细胞轮廓与细胞膜、叶绿体、线粒体三个结构，叶绿体用 `palette.bioChloroplast`、线粒体用 `palette.bioMitochondrion`，并在结构内标注「叶绿体（光合作用）」「线粒体（呼吸作用）」；验证方式：`verify:layout` 下该路由浮层 0 个，且画布文本无重叠
- [x] 3.3 绘制细胞内部的物质流路径：叶绿体 → 线粒体的有机物箭头、线粒体 → 叶绿体的 CO₂ 与 H₂O 箭头，颜色分别用 `bioOrganic` 与 `bioGasCo2`；验证方式：画布可见两条内部流向，方向与「光合产物供呼吸、呼吸产物供光合」一致
- [x] 3.4 绘制细胞膜上的净交换箭头：CO₂ 与 O₂ 各一对，箭头长度按 `|net|` 缩放并设最小可视长度 8px，`netDirection` 为 `balanced` 时切换为「收支平衡」标记；验证方式：拖到夜间箭头指示净释放 CO₂、正午指示净吸收 CO₂、补偿时刻显示「收支平衡」标记且无残留半截箭头
- [x] 3.5 实现内部物质流的粒子点：位置为 `t` 的纯函数（`(t * k + offset) % 1`），不使用 `Math.random()` 也不引入 PRNG；验证方式：暂停后粒子完全静止，同一 `t` 下两次渲染位置完全一致

## 4. 速率曲线区

- [x] 4.1 在画布下半部绘制坐标区：横轴光照强度 0–100（标 `0 / 20 / 40 / 60 / 80 / 100` 六处刻度）、纵轴速率 0–30，并标注轴含义与单位；验证方式：`verify:layout` 下该路由画布内文本无重叠，刻度标签全部落在画布内
- [x] 4.2 绘制呼吸速率水平线（恒定值 5.0，虚线）与光合速率曲线（`P(L)` 逐点采样），两者分别用 `bioMitochondrion` 与 `bioChloroplast`；验证方式：水平线高度在任意时刻不变，光合曲线在 `L = 0` 时过原点、在 `L = 100` 时约为 20.69
- [x] 4.3 绘制净速率曲线 `N(L) = P(L) - R`，并标出其在横轴上的过零点；验证方式：过零点横坐标与内核 `compensationLight` 一致（误差 ≤ 0.5）
- [x] 4.4 绘制随时刻移动的工作点：横坐标取当前 `light`、纵坐标取当前 `photo`，并加一条到横轴的竖直参考线与数值标签；验证方式：拖到正午工作点位于曲线右端，拖到夜间工作点落在原点，标签数值与 KPI 的光合速率一致
- [x] 4.5 在横轴标注光补偿点位置与「光补偿点」标签，并在旁给出对应时刻；验证方式：标注位置与 4.3 的过零点重合，时刻文本与内核 `compensationTimes` 一致

## 5. 播放与交互

- [x] 5.1 接入 `useSimulation`：`compute` 返回 `buildDayCycle().frames`，`dt = FRAME_DT`、`loop: true`，并把 `sim.time` 映射到帧下标驱动 `draw`；验证方式：点击播放后画面连续推进，到达 24 后回到 0 继续推进不停机
- [x] 5.2 在侧栏接入 `DemoControls`（播放 / 暂停 / 重置）与时间轴 `ParamSlider`（`0` 到最后一帧下标），`onValueChange` 直接 `setTime`；验证方式：暂停后全部读数与粒子静止，拖拽时间轴后画面直接切到目标时刻、不经过中间状态
- [x] 5.3 在侧栏提供「跳到清晨 / 正午 / 傍晚」三个快捷按钮，分别定位到 06:00、12:00、18:00 对应帧；验证方式：点击后 KPI 的光照强度分别为 0、100、0，净流向分别为「净释放」「净吸收」「净释放」
- [x] 5.4 在侧栏提供「恢复默认」，重置到 06:00 且暂停；验证方式：点击后时刻回到 06:00、`isRunning` 为 false

## 6. 读数分层与原理卡

- [x] 6.1 配置 `KpiBar` 五项：时刻、光照强度、光合速率、净速率、净流向，全部随 `t` 变化，净流向按 `netDirection` 显示「净吸收 CO₂ / 净释放 CO₂ / 收支平衡」；验证方式：`verify:layout` 输出 KPI 高度 52px，且 KPI 项数为 5
- [x] 6.2 确认呼吸速率恒定值不出现在 KPI 条，仅以曲线水平线、图例条目与单行小字呈现；验证方式：KPI 五项中无呼吸速率，画布上可见 5.0 水平线
- [x] 6.3 配置 `CanvasLegend` 五条：叶绿体（光合）、线粒体（呼吸）、CO₂、O₂、有机物，色值与 `palette` 一一对应；验证方式：图例在画布下方单行排列，不覆盖画布，条目色块与画布用色一致
- [x] 6.4 在 `DemoPage` 的 `reference` 放置恒定结论单行小字：光合在叶绿体且需光、呼吸在线粒体且昼夜不停、呼吸速率不随光照改变；验证方式：文本出现在讲解区下方，不在 KPI 条与侧栏
- [x] 6.5 配置四张 `PrincipleCard`：光合作用反应式与场所、呼吸作用反应式与场所、光补偿点的含义、两者的区别与联系（同时进行、方向相反、净速率决定净交换）；验证方式：页面渲染后四张卡片在讲解区以两列网格排布，文案与 spec 的恒定结论不冲突

## 7. 集成验证与文档

- [x] 7.1 运行 `npm run build`，验证 tsc 类型检查与构建通过、无新增告警
- [x] 7.2 运行 `npm run sitemap:check`，验证站点地图与 `demos.json` 一致且包含 `/photosynthesis-respiration/`
- [x] 7.3 运行 `npm run verify:layout`，验证该路由在 1024×768、1366×768、1920×1080 三种视口及折叠导航下均无横向溢出、KPI 52px、浮层 0 个
- [x] 7.4 运行 `npm run build:prerender`，验证生成 `dist/photosynthesis-respiration/index.html` 且预渲染无报错
- [x] 7.5 端到端断言：在暂停态读取 SVG 实际文本与位置，验证 06:00 / 06:21 / 12:00 / 17:39 / 18:00 五个时刻的 KPI 数值、工作点坐标、补偿点标注与内核结果逐点一致，并验证「收支平衡」标记仅在 `|net| < 0.05` 时出现
- [x] 7.6 回归核对：验证既有 13 个演示的名称、路径与画布内容未受影响，侧栏四个学科分组的展开/折叠正常，首页 14 张卡片齐全
- [x] 7.7 更新 `ROADMAP.md`：勾选「光合作用与呼吸作用」条目并补 slug、生物覆盖计数 1 → 2、覆盖总览与「进行中的 change」表同步，验证方式：文件内计数与实际演示数一致

## Workflow follow-up

- 实施完成且全部验证通过后归档该 change，同步主规格至 `openspec/specs/photosynthesis-respiration/spec.md`。