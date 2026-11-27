import { useCallback, useRef, useState } from 'react';
import type { Svg, G, Path, Text } from '@svgdotjs/svg.js';
import { Matrix } from '@svgdotjs/svg.js';
import { Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { useSVGScene } from '@/hooks/useSVGScene';
import { calculateThinLens, imageTypeText } from '@/lib/physics/lens';
import { DemoPage, SimulationCanvas, DemoSidebar } from '@/components/demo/DemoPage';
import { DemoMain } from '@/components/demo/DemoMain';
import { KpiBar, type KpiItem } from '@/components/demo/KpiBar';
import { buildDemoSEO, getDemoBySlug } from '@/lib/Meta';
import { palette } from '@/lib/palette';
import { cn } from '@/lib/utils';

const SLUG = 'lens-imaging-rules';
const demo = getDemoBySlug(SLUG);
const name = demo.name;

const CONFIG = {
  width: 800,
  height: 500,
  centerX: 400,
  centerY: 250,
  f: 100,
  lensHeight: 200,
  lensWidth: 30,
  axisLength: 700,
};

const OBJ_H = 60;

type CaseId = 'u-gt-2f' | 'u-eq-2f' | 'f-lt-u-lt-2f' | 'u-eq-f' | 'u-lt-f';

interface CaseItem {
  id: CaseId;
  u: number;
  range: string;
  imageRange: string;
  nature: string;
  application: string;
  note: string;
}

const CASES: CaseItem[] = [
  {
    id: 'u-gt-2f',
    u: 300,
    range: 'u > 2f',
    imageRange: 'f < v < 2f',
    nature: '倒立、缩小、实像',
    application: '照相机、人眼',
    note: '物距越远，像越小、像距越接近焦点。',
  },
  {
    id: 'u-eq-2f',
    u: 200,
    range: 'u = 2f',
    imageRange: 'v = 2f',
    nature: '倒立、等大、实像',
    application: '测量焦距',
    note: '唯一像与物等大的位置，此时 u = v = 2f。',
  },
  {
    id: 'f-lt-u-lt-2f',
    u: 150,
    range: 'f < u < 2f',
    imageRange: 'v > 2f',
    nature: '倒立、放大、实像',
    application: '投影仪、幻灯机',
    note: '物近像远像变大，像距超过二倍焦距。',
  },
  {
    id: 'u-eq-f',
    u: 100,
    range: 'u = f',
    imageRange: '不成像',
    nature: '出射光线平行主光轴',
    application: '探照灯、平行光源',
    note: '焦点上的物点发出的光经透镜后平行射出，不成像。',
  },
  {
    id: 'u-lt-f',
    u: 60,
    range: 'u < f',
    imageRange: '虚像，与物同侧',
    nature: '正立、放大、虚像',
    application: '放大镜',
    note: '像与物在透镜同侧，只能用眼睛观察，不能用光屏承接。',
  },
];

const LensImagingRules: React.FC = () => {
  useSEO(buildDemoSEO(SLUG));

  const svgRef = useRef<SVGSVGElement>(null);

  const [caseId, setCaseId] = useState<CaseId>(CASES[0].id);
  const [u, setU] = useState(CASES[0].u);
  const [data, setData] = useState({
    v: 150,
    m: -0.5,
    typeText: '倒立 缩小 实像',
  });

  const snapRef = useRef<{
    s: Svg;
    objectArrow: G;
    imageArrow: G;
    caseLabel: Text;
    rays: {
      parallel: Path;
      center: Path;
      extParallel: Path;
      extCenter: Path;
    };
  } | null>(null);

  const updateScene = useCallback((nextU: number) => {
    const snap = snapRef.current;
    if (!snap) return;
    const { objectArrow, imageArrow, caseLabel, rays } = snap;

    const phys = calculateThinLens(nextU, CONFIG.f);
    setData({
      v: phys.v,
      m: phys.m,
      typeText: Number.isFinite(phys.v) ? imageTypeText(phys.typeKey) : '不成像（出射光平行）',
    });

    const objX = CONFIG.centerX - nextU;
    const objTopY = CONFIG.centerY - OBJ_H;
    const imgX = CONFIG.centerX + phys.v;

    objectArrow.transform(new Matrix().translate(objX, CONFIG.centerY));
    caseLabel.text(`物距 u = ${nextU}，焦距 f = ${CONFIG.f}`);

    const toRightEdge = 800 - CONFIG.centerX;
    const parallelSlope = (CONFIG.centerY - objTopY) / CONFIG.f;
    const centerSlope = (CONFIG.centerY - objTopY) / nextU;
    const parallelEndY = objTopY + parallelSlope * toRightEdge;
    const centerEndY = CONFIG.centerY + centerSlope * toRightEdge;

    rays.extParallel.plot('');
    rays.extCenter.plot('');

    if (!Number.isFinite(phys.v) || Math.abs(phys.v) > 2000) {
      imageArrow.opacity(0);
      rays.parallel.plot(`M${objX},${objTopY} L${CONFIG.centerX},${objTopY} L800,${parallelEndY}`);
      rays.center.plot(`M${objX},${objTopY} L800,${centerEndY}`);
      return;
    }

    imageArrow.opacity(1);
    imageArrow.transform(
      new Matrix().translate(imgX, CONFIG.centerY).scale(Math.abs(phys.m), phys.m, imgX, CONFIG.centerY),
    );

    const imgTopY = CONFIG.centerY - OBJ_H * phys.m;

    rays.parallel.plot(`M${objX},${objTopY} L${CONFIG.centerX},${objTopY} L${imgX},${imgTopY}`);
    rays.center.plot(`M${objX},${objTopY} L${CONFIG.centerX},${CONFIG.centerY} L${imgX},${imgTopY}`);

    if (phys.v < 0) {
      rays.parallel.plot(`M${objX},${objTopY} L${CONFIG.centerX},${objTopY} L800,${parallelEndY}`);
      rays.center.plot(`M${objX},${objTopY} L800,${centerEndY}`);
      rays.extParallel.plot(`M${CONFIG.centerX},${objTopY} L${imgX},${imgTopY}`);
      rays.extCenter.plot(`M${CONFIG.centerX},${CONFIG.centerY} L${imgX},${imgTopY}`);
    }
  }, []);

  useSVGScene(svgRef, (s) => {
    s.line(
      CONFIG.centerX - CONFIG.axisLength / 2,
      CONFIG.centerY,
      CONFIG.centerX + CONFIG.axisLength / 2,
      CONFIG.centerY,
    ).stroke({ color: palette.reference, width: 2 });

    s.ellipse(CONFIG.lensWidth, CONFIG.lensHeight)
      .center(CONFIG.centerX, CONFIG.centerY)
      .fill({ color: palette.lensGlass, opacity: 0.5 })
      .stroke({ color: palette.reference, width: 2 });

    s.line(
      CONFIG.centerX,
      CONFIG.centerY - CONFIG.lensHeight / 2,
      CONFIG.centerX,
      CONFIG.centerY + CONFIG.lensHeight / 2,
    ).stroke({ color: palette.reference, width: 1, dasharray: '2,2', opacity: 0.5 });

    const marks = [
      { x: CONFIG.centerX - CONFIG.f, label: 'F' },
      { x: CONFIG.centerX - 2 * CONFIG.f, label: '2F' },
      { x: CONFIG.centerX + CONFIG.f, label: "F'" },
      { x: CONFIG.centerX + 2 * CONFIG.f, label: "2F'" },
      { x: CONFIG.centerX, label: 'O' },
    ];
    marks.forEach((mark) => {
      s.circle(8).center(mark.x, CONFIG.centerY).fill(palette.canvasText);
      s.text(mark.label)
        .move(mark.x - 5, CONFIG.centerY + 20)
        .fill(palette.canvasText)
        .font({ size: '12px' });
    });

    const createArrow = (color: string) => {
      const g = s.group();
      g.line(0, 0, 0, -OBJ_H).stroke({ color, width: 4 });
      g.polygon(`-5,-${OBJ_H} 5,-${OBJ_H} 0,-${OBJ_H + 15}`).fill(color);
      return g;
    };

    const objectArrow = createArrow(palette.object);
    const imageArrow = createArrow(palette.object).opacity(0.7);

    const rayAttr = { color: palette.ray, width: 2 };
    const virtualRayAttr = { color: palette.ray, width: 1, dasharray: '4,4' };

    const rays = {
      parallel: s.path('').stroke(rayAttr).fill('none'),
      center: s.path('').stroke(rayAttr).fill('none'),
      extParallel: s.path('').stroke(virtualRayAttr).fill('none'),
      extCenter: s.path('').stroke(virtualRayAttr).fill('none'),
    };

    const caseLabel = s.text('')
      .move(12, 12)
      .fill(palette.canvasText)
      .font({ size: '13px' });

    snapRef.current = { s, objectArrow, imageArrow, caseLabel, rays };
    updateScene(CASES[0].u);
  });

  const handleSelect = (item: CaseItem) => {
    setCaseId(item.id);
    setU(item.u);
    updateScene(item.u);
  };

  const current = CASES.find((item) => item.id === caseId) ?? CASES[0];

  const kpiItems: KpiItem[] = [
    { label: '物距 u', value: u.toFixed(0) },
    {
      label: '像距 v',
      value: Number.isFinite(data.v) ? Math.round(data.v).toString() : '不成像',
    },
    {
      label: '放大率 m',
      value: Number.isFinite(data.m) ? data.m.toFixed(2) : '-',
    },
    { label: '成像性质', value: data.typeText },
    { label: '典型应用', value: current.application },
  ];

  const tableRows = [
    { u: 'u > 2f', v: 'f < v < 2f', nature: '倒立、缩小、实像', app: '照相机、人眼' },
    { u: 'u = 2f', v: 'v = 2f', nature: '倒立、等大、实像', app: '测量焦距' },
    { u: 'f < u < 2f', v: 'v > 2f', nature: '倒立、放大、实像', app: '投影仪、幻灯机' },
    { u: 'u = f', v: '不成像', nature: '出射光线平行主光轴', app: '探照灯、平行光源' },
    { u: 'u < f', v: '虚像（与物同侧）', nature: '正立、放大、虚像', app: '放大镜' },
  ];

  return (
    <DemoPage
      title={name}
      description={demo.description}
      principles={
        <>
          <div className="bg-muted p-3 rounded">
            <h4 className="text-primary font-bold mb-1 text-sm">一倍焦距分虚实</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              u &gt; f 时成实像（可用光屏承接）；u &lt; f 时成正立放大的虚像；u = f 时不成像。
            </p>
          </div>
          <div className="bg-muted p-3 rounded">
            <h4 className="text-primary font-bold mb-1 text-sm">二倍焦距分大小</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              u &gt; 2f 成缩小的像，u = 2f 成等大的像，f &lt; u &lt; 2f 成放大的像。
            </p>
          </div>
        </>
      }
      extra={
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">凸透镜成像规律对照表（五种物距）</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">物距 u</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">像距 v</th>
                    <th className="px-3 py-2 font-semibold">像的性质</th>
                    <th className="px-3 py-2 font-semibold">应用</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.u} className="border-t">
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{row.u}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">{row.v}</td>
                      <td className="px-3 py-2">{row.nature}</td>
                      <td className="px-3 py-2">{row.app}</td>
                    </tr>
                  ))}
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono whitespace-nowrap">凹透镜</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">虚像（与物同侧）</td>
                    <td className="px-3 py-2">正立、缩小、虚像</td>
                    <td className="px-3 py-2">近视眼镜</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              口诀：一倍焦距分虚实，二倍焦距分大小；物近像远像变大，物远像近像变小。凹透镜对任何物距都只成正立、缩小的虚像，因此常用于近视眼镜。
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-x-3">
            <span className="text-muted-foreground">相关演示：</span>
            <Link className="text-primary underline-offset-4 hover:underline" to="/convex-lens/">
              凸透镜成像规律动画演示（可拖动）
            </Link>
            <Link className="text-primary underline-offset-4 hover:underline" to="/concave-lens/">
              凹透镜成像规律动画演示（可拖动）
            </Link>
          </div>
        </div>
      }
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox="0 0 800 500" />
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">五种物距情形</h3>
          <div className="space-y-2">
            {CASES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                aria-pressed={item.id === caseId}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                  item.id === caseId
                    ? 'border-primary bg-primary/10'
                    : 'bg-card hover:bg-accent',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold">{item.range}</span>
                  <span className="text-[11px] text-muted-foreground">{item.application}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.nature}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <h4 className="text-sm font-semibold">当前情形</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {current.range}：像距 {current.imageRange}，成{current.nature}，对应{current.application}。
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{current.note}</p>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default LensImagingRules;