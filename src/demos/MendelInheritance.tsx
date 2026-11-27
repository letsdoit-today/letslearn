import { useCallback, useEffect, useRef, useState } from 'react';
import type { Line, Polygon, Rect, Text } from '@svgdotjs/svg.js';
import { Dices, RotateCcw, Shuffle } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { useSVGScene } from '@/hooks/useSVGScene';
import { Button } from '@/components/ui/button';
import { DemoPage, SimulationCanvas, DemoSidebar } from '@/components/demo/DemoPage';
import { CanvasLegend } from '@/components/demo/CanvasLegend';
import { DemoMain } from '@/components/demo/DemoMain';
import { KpiBar, type KpiItem } from '@/components/demo/KpiBar';
import { ParamSlider } from '@/components/demo/ParamSlider';
import { PrincipleCard } from '@/components/demo/PrincipleCard';
import Demos, { siteUrl } from '@/lib/Meta';
import { palette, rgba } from '@/lib/palette';
import {
  CROSSES,
  CROSS_KINDS,
  DEFAULT_INPUT,
  SAMPLE_SIZES,
  TRAIT,
  formatRatio,
  phenotypeLabel,
  pickOffspring,
  solve,
  type CrossInput,
  type CrossKind,
} from '@/lib/bio/mendel';

const name = '孟德尔遗传实验';

const WIDTH = 800;
const HEIGHT = 500;

const BOARD = { x: 96, y: 180, cell: 96 };
const BAR = { left: 372, right: 728, top: 186, bottom: 246 };
const BAR_W = BAR.right - BAR.left;

const PARENT = { y: 44, w: 130, h: 42 };

const MIN_SEGMENT = 6;

interface SceneEls {
  parentMBox: Rect;
  parentMText: Text;
  parentPBox: Rect;
  parentPText: Text;
  crossText: Text;
  arrowLine: Line;
  arrowHead: Polygon;
  f1Title: Text;
  f1Combos: Text;
  gameteMText: Text;
  gametePText: Text;
  colHeader: Text[];
  rowHeader: Text[];
  cellBox: Rect[];
  cellGeno: Text[];
  cellPheno: Text[];
  genotypeLine: Text;
  theoryLine: Text;
  barDom: Rect;
  barRec: Rect;
  barDomLabel: Text;
  barRecLabel: Text;
  theoryTick: Line;
  theoryTickLabel: Text;
  measuredLabel: Text;
  sampleBox: Rect;
  sampleTitle: Text;
  sampleGeno: Text;
  samplePheno: Text;
}

const labelStyle = {
  fill: palette.canvasText,
  'font-size': '12px',
  'dominant-baseline': 'middle',
} as const;

const MendelInheritance: React.FC = () => {
  useSEO({
    title: `${name} - 生物演示 | Physics Learn`,
    description: Demos.find((demo) => demo.name === name)?.description || '',
    keywords: '孟德尔遗传,一对相对性状,基因的分离,棋盘法,显性与隐性,3:1分离比,初中生物',
    canonical: `${siteUrl}${Demos.find((demo) => demo.name === name)?.path || ''}`,
    ogImage: `${siteUrl}/og-mendel-inheritance.jpg`,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const snapRef = useRef<SceneEls | null>(null);
  const [input, setInput] = useState<CrossInput>(DEFAULT_INPUT);
  const [pickTick, setPickTick] = useState(0);

  const draw = useCallback(() => {
    const ctx = snapRef.current;
    if (!ctx) return;

    const result = solve(input);
    const sim = result.simulation;
    const sample = pickOffspring(result, pickTick * 977 + 29);

    ctx.parentMText.text(`♀ ${result.def.maternal.join('')}`);
    ctx.parentPText.text(`♂ ${result.def.paternal.join('')}`);
    ctx.gameteMText.text(`配子 ${result.maternalGameteTypes.join('、')}`);
    ctx.gametePText.text(`配子 ${result.paternalGameteTypes.join('、')}`);
    ctx.f1Combos.text(
      result.cells.map((cell) => cell.key).join('  '),
    );

    for (let col = 0; col < 2; col += 1) {
      ctx.colHeader[col].text(result.paternalGametes[col]);
    }
    for (let row = 0; row < 2; row += 1) {
      ctx.rowHeader[row].text(result.maternalGametes[row]);
    }

    result.cells.forEach((cell, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const isDominant = cell.phenotype === 'dominant';
      const color = isDominant ? palette.bioDominant : palette.bioRecessive;
      ctx.cellBox[i].attr({
        x: BOARD.x + col * BOARD.cell,
        y: BOARD.y + row * BOARD.cell,
        fill: rgba(color, 0.16),
        stroke: color,
      });
      ctx.cellGeno[i].text(cell.key).attr({
        x: BOARD.x + col * BOARD.cell + BOARD.cell / 2,
        y: BOARD.y + row * BOARD.cell + BOARD.cell / 2 - 8,
      });
      ctx.cellPheno[i].text(phenotypeLabel(cell.phenotype)).attr({
        x: BOARD.x + col * BOARD.cell + BOARD.cell / 2,
        y: BOARD.y + row * BOARD.cell + BOARD.cell / 2 + 18,
        fill: color,
      });
    });

    ctx.genotypeLine.text(`基因型比例 ${result.genotypeRatioLabel}`);
    ctx.theoryLine.text(
      `理论分离比 ${TRAIT.dominant} : ${TRAIT.recessive} = ${result.expected.ratioLabel}`,
    );

    const total = Math.max(1, sim.total);
    const rawDomW = (sim.dominant / total) * BAR_W;
    let domW: number;
    let recW: number;
    if (sim.recessive === 0) {
      domW = BAR_W - MIN_SEGMENT;
      recW = MIN_SEGMENT;
    } else if (sim.dominant === 0) {
      domW = MIN_SEGMENT;
      recW = BAR_W - MIN_SEGMENT;
    } else {
      domW = Math.max(MIN_SEGMENT, Math.min(BAR_W - MIN_SEGMENT, rawDomW));
      recW = BAR_W - domW;
    }

    ctx.barDom.attr({
      x: BAR.left,
      y: BAR.top,
      width: domW,
      height: BAR.bottom - BAR.top,
      fill: rgba(palette.bioDominant, 0.82),
      opacity: sim.dominant === 0 ? 0.28 : 1,
    });
    ctx.barRec.attr({
      x: BAR.left + domW,
      y: BAR.top,
      width: recW,
      height: BAR.bottom - BAR.top,
      fill: rgba(palette.bioRecessive, 0.82),
      opacity: sim.recessive === 0 ? 0.28 : 1,
    });

    const barMid = (BAR.top + BAR.bottom) / 2;
    if (domW >= 40) {
      ctx.barDomLabel.show().text(TRAIT.dominant).attr({
        x: BAR.left + 10,
        y: barMid,
      });
    } else {
      ctx.barDomLabel.hide().text('');
    }
    if (recW >= 40) {
      ctx.barRecLabel.show().text(TRAIT.recessive).attr({
        x: BAR.right - 10,
        y: barMid,
      });
    } else {
      ctx.barRecLabel.hide().text('');
    }

    const theoryX = BAR.left + (result.expected.dominant / result.expected.total) * BAR_W;
    ctx.theoryTick.plot(theoryX, BAR.top - 8, theoryX, BAR.bottom + 8);
    ctx.theoryTickLabel.attr({ x: theoryX, y: BAR.top - 20 });
    ctx.measuredLabel.text('实测');

    const sampleColor =
      sample.phenotype === 'dominant' ? palette.bioDominant : palette.bioRecessive;
    ctx.sampleBox.attr({ stroke: sampleColor, fill: rgba(sampleColor, 0.08) });
    ctx.sampleTitle.text(`子代抽样 · 第 ${pickTick + 1} 次抽取`);
    ctx.sampleGeno.text(sample.key).attr({ fill: sampleColor });
    ctx.samplePheno.text(`${phenotypeLabel(sample.phenotype)}性状`).attr({
      fill: sampleColor,
    });
  }, [input, pickTick]);

  useSVGScene(svgRef, (s) => {
    s.text('亲本 P')
      .attr({ ...labelStyle, x: 44, y: 28, 'text-anchor': 'start' });

    const parentMBox = s
      .rect(PARENT.w, PARENT.h)
      .radius(8)
      .attr({ x: 44, y: PARENT.y, fill: rgba(palette.bioParent, 0.08), stroke: palette.bioParent, 'stroke-width': 1.5 });

    const parentMText = s.text('♀').attr({
      x: 44 + PARENT.w / 2,
      y: PARENT.y + PARENT.h / 2,
      fill: palette.canvasText,
      'font-size': '18px',
      'font-weight': 'bold',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });

    const crossText = s.text('×').attr({
      x: 190,
      y: PARENT.y + PARENT.h / 2,
      fill: palette.canvasText,
      'font-size': '18px',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });

    const parentPBox = s
      .rect(PARENT.w, PARENT.h)
      .radius(8)
      .attr({ x: 204, y: PARENT.y, fill: rgba(palette.bioParent, 0.08), stroke: palette.bioParent, 'stroke-width': 1.5 });

    const parentPText = s.text('♂').attr({
      x: 204 + PARENT.w / 2,
      y: PARENT.y + PARENT.h / 2,
      fill: palette.canvasText,
      'font-size': '18px',
      'font-weight': 'bold',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });

    const arrowLine = s.line(348, PARENT.y + PARENT.h / 2, 392, PARENT.y + PARENT.h / 2).stroke({
      color: palette.bioParent,
      width: 1.5,
    });

    const arrowHead = s.polygon('392,65 382,60 382,70').attr({
      fill: palette.bioParent,
      stroke: 'none',
    });

    const f1Title = s.text('F₁ 子代').attr({
      x: 400,
      y: PARENT.y + 10,
      fill: palette.canvasText,
      'font-size': '13px',
      'font-weight': 'bold',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
    });

    const f1Combos = s.text('').attr({
      x: 400,
      y: PARENT.y + 32,
      fill: palette.canvasText,
      'font-size': '12px',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
    });

    const gameteMText = s.text('').attr({
      ...labelStyle,
      'font-size': '11px',
      x: 44 + PARENT.w / 2,
      y: PARENT.y + PARENT.h + 22,
      'text-anchor': 'middle',
      fill: palette.bioGamete,
    });

    const gametePText = s.text('').attr({
      ...labelStyle,
      'font-size': '11px',
      x: 204 + PARENT.w / 2,
      y: PARENT.y + PARENT.h + 22,
      'text-anchor': 'middle',
      fill: palette.bioGamete,
    });

    s.text('棋盘法 · 子代基因型')
      .attr({
        x: BOARD.x,
        y: 140,
        fill: palette.canvasText,
        'font-size': '13px',
        'font-weight': 'bold',
        'text-anchor': 'start',
        'dominant-baseline': 'middle',
      });

    const colHeader = [0, 1].map((i) =>
      s.text('').attr({
        x: BOARD.x + BOARD.cell / 2 + i * BOARD.cell,
        y: BOARD.y - 16,
        fill: palette.bioGamete,
        'font-size': '16px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      }),
    );

    const rowHeader = [0, 1].map((i) =>
      s.text('').attr({
        x: BOARD.x - 14,
        y: BOARD.y + BOARD.cell / 2 + i * BOARD.cell,
        fill: palette.bioGamete,
        'font-size': '16px',
        'font-weight': 'bold',
        'text-anchor': 'end',
        'dominant-baseline': 'middle',
      }),
    );

    const cellBox = [0, 1, 2, 3].map(() =>
      s.rect(BOARD.cell, BOARD.cell).attr({ 'stroke-width': 1.5 }),
    );

    const cellGeno = [0, 1, 2, 3].map(() =>
      s.text('').attr({
        fill: palette.canvasText,
        'font-size': '20px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      }),
    );

    const cellPheno = [0, 1, 2, 3].map(() =>
      s.text('').attr({
        'font-size': '12px',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      }),
    );

    const genotypeLine = s.text('').attr({
      x: BOARD.x,
      y: BOARD.y + 2 * BOARD.cell + 26,
      fill: palette.canvasText,
      'font-size': '12px',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
    });

    const theoryLine = s.text('').attr({
      x: BOARD.x,
      y: BOARD.y + 2 * BOARD.cell + 48,
      fill: palette.canvasText,
      'font-size': '12px',
      'font-weight': 'bold',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
    });

    s.text('大样本随机模拟')
      .attr({
        x: BAR.left,
        y: 140,
        fill: palette.canvasText,
        'font-size': '13px',
        'font-weight': 'bold',
        'text-anchor': 'start',
        'dominant-baseline': 'middle',
      });

    const barDom = s.rect(1, 1).attr({ y: BAR.top });
    const barRec = s.rect(1, 1).attr({ y: BAR.top });

    const barDomLabel = s.text('').attr({
      fill: '#ffffff',
      'font-size': '12px',
      'font-weight': 'bold',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
    });

    const barRecLabel = s.text('').attr({
      fill: '#ffffff',
      'font-size': '12px',
      'font-weight': 'bold',
      'text-anchor': 'end',
      'dominant-baseline': 'middle',
    });

    const theoryTick = s
      .line(0, 0, 0, 0)
      .stroke({ color: palette.objectStroke, width: 2 })
      .attr({ 'stroke-dasharray': '5 4' });

    const theoryTickLabel = s.text('理论').attr({
      fill: palette.objectStroke,
      'font-size': '11px',
      'font-weight': 'bold',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });

    const measuredLabel = s.text('实测').attr({
      fill: palette.canvasText,
      'font-size': '11px',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
      x: BAR.left,
      y: BAR.bottom + 24,
    });

    const sampleBox = s.rect(356, 88).radius(8).attr({
      x: BAR.left,
      y: 288,
      'stroke-width': 1.5,
    });

    const sampleTitle = s.text('').attr({
      fill: palette.canvasText,
      'font-size': '12px',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
      x: BAR.left + 14,
      y: 308,
    });

    const sampleGeno = s.text('').attr({
      'font-size': '22px',
      'font-weight': 'bold',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
      x: BAR.left + 14,
      y: 334,
    });

    const samplePheno = s.text('').attr({
      'font-size': '13px',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
      x: BAR.left + 14,
      y: 358,
    });

    snapRef.current = {
      parentMBox,
      parentMText,
      parentPBox,
      parentPText,
      crossText,
      arrowLine,
      arrowHead,
      f1Title,
      f1Combos,
      gameteMText,
      gametePText,
      colHeader,
      rowHeader,
      cellBox,
      cellGeno,
      cellPheno,
      genotypeLine,
      theoryLine,
      barDom,
      barRec,
      barDomLabel,
      barRecLabel,
      theoryTick,
      theoryTickLabel,
      measuredLabel,
      sampleBox,
      sampleTitle,
      sampleGeno,
      samplePheno,
    };
  });

  useEffect(() => {
    draw();
  }, [draw]);

  const result = solve(input);

  const update = (patch: Partial<CrossInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

  const switchCross = (kind: CrossKind) => {
    setPickTick(0);
    update({ kind });
  };

  const kpiItems: KpiItem[] = [
    { label: '样本数 n', value: String(result.simulation.total) },
    {
      label: `${TRAIT.dominant}（显性）`,
      value: String(result.simulation.dominant),
      color: palette.bioDominant,
    },
    {
      label: `${TRAIT.recessive}（隐性）`,
      value: String(result.simulation.recessive),
      color: palette.bioRecessive,
    },
    { label: '实测比例', value: formatRatio(result.simulation.dominant, result.simulation.recessive) },
  ];

  const sampleSizeIndex = SAMPLE_SIZES.indexOf(input.sampleSize);

  return (
    <DemoPage
      title={name}
      description={Demos.find((demo) => demo.name === name)?.description || ''}
      principles={
        <>
          <PrincipleCard title="基因的分离">
            亲本的体细胞中，一对等位基因（D 与 d）分别位于一对染色体上。形成配子时，这对染色体彼此分离，
            每个配子只得到其中一个基因，因此 Dd 个体产生的配子中 D 与 d 各占一半。
          </PrincipleCard>
          <PrincipleCard title="配子随机结合与棋盘法">
            受精时雌雄配子随机结合，棋盘法把两个亲本可能产生的配子分别写在行与列，格内就是子代的基因型组合。
            四个格子代表四种机会均等的结合方式，概率由此一目了然。
          </PrincipleCard>
          <PrincipleCard title="显隐性判定">
            显性基因 D 会掩盖隐性基因 d 的作用：基因型为 DD 或 Dd 的个体都表现为高茎，
            只有基因型为 dd 的个体才表现为矮茎。因此子代的基因型比例与表现型比例并不相同。
          </PrincipleCard>
          <PrincipleCard title="3 : 1 的概率本质">
            Dd × Dd 的四个组合中有三个带 D、一个为 dd，所以高茎 : 矮茎 = 3 : 1。
            这里的 3 : 1 是概率意义上的期望比例：样本越少越容易偏离，样本越多越接近，但不会必然等于 3 : 1。
          </PrincipleCard>
        </>
      }
      reference={`理论分离比 ${result.expected.ratioLabel}；显性基因完全掩盖隐性基因（DD 与 Dd 都表现${TRAIT.dominant}）；配子随机结合决定子代基因型；表现型相同不代表基因型相同。`}
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} />
        <CanvasLegend
          items={[
            { label: `${TRAIT.dominant}（显性）`, color: palette.bioDominant },
            { label: `${TRAIT.recessive}（隐性）`, color: palette.bioRecessive },
            { label: '配子', color: palette.bioGamete },
            { label: '理论比例刻度', color: palette.objectStroke },
          ]}
        />
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">亲本组合</h3>
          <div className="grid grid-cols-3 gap-2">
            {CROSS_KINDS.map((kind) => (
              <Button
                key={kind}
                variant={input.kind === kind ? 'default' : 'outline'}
                size="sm"
                onClick={() => switchCross(kind)}
              >
                {CROSSES[kind].label}
              </Button>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">{CROSSES[input.kind].hint}</div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">参数调节</h3>
          <ParamSlider
            label="样本数 n"
            value={sampleSizeIndex}
            min={0}
            max={SAMPLE_SIZES.length - 1}
            step={1}
            onValueChange={(v) => {
              setPickTick(0);
              update({ sampleSize: SAMPLE_SIZES[v] });
            }}
            formatValue={(v) => String(SAMPLE_SIZES[v])}
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-lg">抽样动作</h3>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => update({ seed: input.seed + 1 })}
          >
            <Shuffle className="mr-2 h-4 w-4" />
            重新抽样
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setPickTick((prev) => prev + 1)}
          >
            <Dices className="mr-2 h-4 w-4" />
            抽取一个子代
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setInput(DEFAULT_INPUT);
              setPickTick(0);
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            恢复默认参数
          </Button>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default MendelInheritance;