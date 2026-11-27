export type Allele = 'D' | 'd';
export type Genotype = readonly Allele[];
export type Gamete = Allele;
export type GenotypeKey = 'DD' | 'Dd' | 'dd';
export type Phenotype = 'dominant' | 'recessive';
export type CrossKind = 'DDxdd' | 'DdxDd' | 'Ddxdd';

export const TRAIT = {
  gene: 'D / d',
  dominantAllele: 'D',
  recessiveAllele: 'd',
  dominant: '高茎',
  recessive: '矮茎',
  dominantShort: '高',
  recessiveShort: '矮',
} as const;

export interface CrossDef {
  kind: CrossKind;
  label: string;
  maternal: Genotype;
  paternal: Genotype;
  hint: string;
}

export const CROSS_KINDS: CrossKind[] = ['DdxDd', 'DDxdd', 'Ddxdd'];

export const CROSSES: Record<CrossKind, CrossDef> = {
  DdxDd: {
    kind: 'DdxDd',
    label: 'Dd × Dd',
    maternal: ['D', 'd'],
    paternal: ['D', 'd'],
    hint: '双杂合亲本自交，子代出现 3 : 1 分离比',
  },
  DDxdd: {
    kind: 'DDxdd',
    label: 'DD × dd',
    maternal: ['D', 'D'],
    paternal: ['d', 'd'],
    hint: '纯合显性与纯合隐性杂交，子代全为显性',
  },
  Ddxdd: {
    kind: 'Ddxdd',
    label: 'Dd × dd',
    maternal: ['D', 'd'],
    paternal: ['d', 'd'],
    hint: '杂合子与隐性纯合子测交，子代出现 1 : 1 分离比',
  },
};

export const SAMPLE_SIZES = [4, 10, 100, 1000];

export interface CrossInput {
  kind: CrossKind;
  sampleSize: number;
  seed: number;
}

export const DEFAULT_INPUT: CrossInput = {
  kind: 'DdxDd',
  sampleSize: 1000,
  seed: 20241126,
};

export interface PunnettCell {
  row: Gamete;
  col: Gamete;
  genotype: Genotype;
  key: GenotypeKey;
  phenotype: Phenotype;
}

export interface Counts {
  dominant: number;
  recessive: number;
  total: number;
}

export interface RatioSpec extends Counts {
  ratioLabel: string;
}

export interface SimulationResult extends Counts {
  ratio: number;
  ratioLabel: string;
  sampleSize: number;
  seed: number;
  offspring: Genotype[];
}

export interface CrossResult {
  input: CrossInput;
  def: CrossDef;
  maternalGametes: Gamete[];
  paternalGametes: Gamete[];
  maternalGameteTypes: Gamete[];
  paternalGameteTypes: Gamete[];
  cells: PunnettCell[];
  genotypeCounts: Record<GenotypeKey, number>;
  genotypeRatioLabel: string;
  expected: RatioSpec;
  simulation: SimulationResult;
  offspringGenotypeLabel: string;
  offspringPhenotypeLabel: string;
}

export interface Offspring {
  index: number;
  genotype: Genotype;
  key: GenotypeKey;
  phenotype: Phenotype;
}

function alleleRank(allele: Allele): number {
  return allele === TRAIT.dominantAllele ? 0 : 1;
}

export function orderPair(a: Allele, b: Allele): Genotype {
  return alleleRank(a) <= alleleRank(b) ? [a, b] : [b, a];
}

export function genotypeKey(genotype: Genotype): GenotypeKey {
  return [...genotype].sort((x, y) => alleleRank(x) - alleleRank(y)).join('') as GenotypeKey;
}

export function genotypeText(genotype: Genotype): string {
  return [...genotype].sort((x, y) => alleleRank(x) - alleleRank(y)).join('');
}

export function gametesOf(genotype: Genotype): Gamete[] {
  const unique = Array.from(new Set(genotype));
  return unique.sort((x, y) => alleleRank(x) - alleleRank(y));
}

export function gameteSlots(genotype: Genotype): Gamete[] {
  return [...genotype].sort((x, y) => alleleRank(x) - alleleRank(y));
}

export function phenotypeOf(genotype: Genotype): Phenotype {
  return genotype.some((allele) => allele === TRAIT.dominantAllele) ? 'dominant' : 'recessive';
}

export function phenotypeLabel(phenotype: Phenotype): string {
  return phenotype === 'dominant' ? TRAIT.dominant : TRAIT.recessive;
}

export function buildPunnett(maternal: Gamete[], paternal: Gamete[]): PunnettCell[] {
  const cells: PunnettCell[] = [];
  for (const row of maternal) {
    for (const col of paternal) {
      const genotype = orderPair(row, col);
      cells.push({
        row,
        col,
        genotype,
        key: genotypeKey(genotype),
        phenotype: phenotypeOf(genotype),
      });
    }
  }
  return cells;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y > 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function ratioLabel(dominant: number, recessive: number): string {
  if (dominant === 0 && recessive === 0) return '0 : 0';
  if (recessive === 0) return '全为显性';
  if (dominant === 0) return '全为隐性';
  const g = gcd(dominant, recessive);
  return `${dominant / g} : ${recessive / g}`;
}

export function expectedRatio(cells: PunnettCell[]): RatioSpec {
  let dominant = 0;
  let recessive = 0;
  for (const cell of cells) {
    if (cell.phenotype === 'dominant') dominant += 1;
    else recessive += 1;
  }
  return {
    dominant,
    recessive,
    total: dominant + recessive,
    ratioLabel: ratioLabel(dominant, recessive),
  };
}

export function genotypeDistribution(cells: PunnettCell[]): Record<GenotypeKey, number> {
  const counts: Record<GenotypeKey, number> = { DD: 0, Dd: 0, dd: 0 };
  for (const cell of cells) counts[cell.key] += 1;
  return counts;
}

export function genotypeRatioLabel(counts: Record<GenotypeKey, number>): string {
  const keys = (['DD', 'Dd', 'dd'] as GenotypeKey[]).filter((key) => counts[key] > 0);
  if (keys.length === 0) return '';
  if (keys.length === 1) return `全为 ${keys[0]}`;
  const g = keys.map((key) => counts[key]).reduce(gcd);
  return keys.map((key) => counts[key] / g).join(' : ');
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickGamete(gametes: Gamete[], rng: () => number): Gamete {
  const index = Math.min(gametes.length - 1, Math.floor(rng() * gametes.length));
  return gametes[index];
}

export function simulate(input: CrossInput, seed: number = input.seed): SimulationResult {
  const def = CROSSES[input.kind];
  const maternalGametes = gametesOf(def.maternal);
  const paternalGametes = gametesOf(def.paternal);
  const rng = mulberry32(seed);
  const offspring: Genotype[] = [];
  let dominant = 0;
  let recessive = 0;

  for (let i = 0; i < input.sampleSize; i += 1) {
    const genotype = orderPair(
      pickGamete(maternalGametes, rng),
      pickGamete(paternalGametes, rng),
    );
    offspring.push(genotype);
    if (phenotypeOf(genotype) === 'dominant') dominant += 1;
    else recessive += 1;
  }

  const total = offspring.length;
  return {
    dominant,
    recessive,
    total,
    ratio: total > 0 ? dominant / total : 0,
    ratioLabel: ratioLabel(dominant, recessive),
    sampleSize: input.sampleSize,
    seed,
    offspring,
  };
}

export function solve(input: CrossInput): CrossResult {
  const def = CROSSES[input.kind];
  const maternalGametes = gameteSlots(def.maternal);
  const paternalGametes = gameteSlots(def.paternal);
  const cells = buildPunnett(maternalGametes, paternalGametes);
  const genotypeCounts = genotypeDistribution(cells);
  const expected = expectedRatio(cells);
  const simulation = simulate(input);

  return {
    input,
    def,
    maternalGametes,
    paternalGametes,
    maternalGameteTypes: gametesOf(def.maternal),
    paternalGameteTypes: gametesOf(def.paternal),
    cells,
    genotypeCounts,
    genotypeRatioLabel: genotypeRatioLabel(genotypeCounts),
    expected,
    simulation,
    offspringGenotypeLabel: genotypeRatioLabel(genotypeCounts),
    offspringPhenotypeLabel: expected.ratioLabel,
  };
}

export function pickOffspring(result: CrossResult, index: number): Offspring {
  const list = result.simulation.offspring;
  const safeIndex = Math.abs(Math.floor(index)) % Math.max(1, list.length);
  const genotype = list[safeIndex] ?? orderPair('D', 'D');
  return {
    index: safeIndex + 1,
    genotype,
    key: genotypeKey(genotype),
    phenotype: phenotypeOf(genotype),
  };
}

export function formatRatio(dominant: number, recessive: number): string {
  if (recessive === 0) return dominant > 0 ? '全为显性' : '—';
  if (dominant === 0) return '全为隐性';
  return `${(dominant / recessive).toFixed(2)} : 1`;
}