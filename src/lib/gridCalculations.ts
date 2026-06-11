// ===== GridIntel — Calculation Engine =====

export const CONDUCTORS: Record<string, ConductorData> = {
  rabbit: { r: 0.641, x: 0.391, name: 'Rabbit (50 mm²)', ampacity: 150, cost: 12000 },
  dog: { r: 0.320, x: 0.380, name: 'Dog (100 mm²)', ampacity: 250, cost: 22000 },
  panther: { r: 0.161, x: 0.360, name: 'Panther (200 mm²)', ampacity: 380, cost: 38000 },
  zebra: { r: 0.080, x: 0.350, name: 'Zebra (400 mm²)', ampacity: 550, cost: 62000 },
  moose: { r: 0.054, x: 0.343, name: 'Moose (600 mm²)', ampacity: 700, cost: 85000 },
};

export interface ConductorData {
  r: number;
  x: number;
  name: string;
  ampacity: number;
  cost: number;
}

export interface SegmentInput {
  km: number;
  mva: number;
  df: number;
  label: string;
}

export interface SegmentResult {
  label: string;
  km: number;
  mva: number;
  df: number;
  I: string;
  Rdrop: string;
  Xdrop: string;
  reg: string;
  cumReg: string;
  Vcurrent: string;
  activeLoss: string;
  reactiveLoss: string;
  status: 'ok' | 'warn' | 'danger';
}

export interface CalculationOutput {
  results: SegmentResult[];
  Vs: number;
  totalActiveLoss: number;
  totalReactiveLoss: number;
  cumulativeReg: number;
}

export interface AnalysisData {
  results: SegmentResult[];
  Vn: number;
  pf: number;
  limit: number;
  segs: SegmentInput[];
  peakReg: number;
  totalLen: number;
  totalLoad: number;
  VR: number;
  R: number;
  X: number;
  oltcPct: number;
  statcomEnabled: boolean;
  statcomBus: string;
  statcomMvar: number;
  totalActiveLoss: number;
  totalReactiveLoss: number;
  Vs: number;
}

export function calculateRegulation(
  segs: SegmentInput[],
  Vn: number, R: number, X: number,
  pf: number, limit: number,
  oltcPct: number,
  statcomEnabled: boolean, statcomBus: string, statcomMvar: number
): CalculationOutput {
  const sinphi = Math.sqrt(1 - pf * pf);
  const Vs = Vn * (1 + oltcPct / 100);
  const results: SegmentResult[] = [];
  let cumulativeReg = 0;
  let Vcurrent = Vs;
  let totalActiveLoss = 0;
  let totalReactiveLoss = 0;

  segs.forEach((seg, i) => {
    const apparentLoad = seg.mva * seg.df;
    const P_flow = apparentLoad * pf;
    let Q_flow = apparentLoad * sinphi;

    // STATCOM provides local reactive power, reducing the reactive power 
    // that needs to flow from the source (upstream segments).
    if (statcomEnabled && i <= parseInt(statcomBus)) {
      const qComp = Math.abs(statcomMvar) * (statcomMvar > 0 ? 1 : -1);
      Q_flow = Math.max(0, Q_flow - qComp);
    }

    const S_eff = Math.sqrt(P_flow * P_flow + Q_flow * Q_flow);
    const I = (S_eff * 1000) / (Math.sqrt(3) * Vs);
    
    // Power factor components for this specific segment after compensation
    const current_pf = S_eff > 0 ? P_flow / S_eff : pf;
    const current_sinphi = S_eff > 0 ? Q_flow / S_eff : sinphi;

    const Rdrop = I * R * seg.km * Math.sqrt(3) / 1000;
    const Xdrop = I * X * seg.km * Math.sqrt(3) / 1000;

    const Vdrop = Rdrop * current_pf + Xdrop * current_sinphi;
    const reg = (Vdrop / Vs) * 100;
    
    cumulativeReg += reg;
    Vcurrent -= Vdrop;

    const activeLoss = 3 * I * I * R * seg.km / 1000;
    const reactiveLoss = 3 * I * I * X * seg.km / 1000;
    totalActiveLoss += activeLoss;
    totalReactiveLoss += reactiveLoss;

    results.push({
      label: seg.label, km: seg.km, mva: seg.mva, df: seg.df,
      I: I.toFixed(1), Rdrop: Rdrop.toFixed(3), Xdrop: Xdrop.toFixed(3),
      reg: reg.toFixed(2), cumReg: cumulativeReg.toFixed(2),
      Vcurrent: Vcurrent.toFixed(1), activeLoss: activeLoss.toFixed(2),
      reactiveLoss: reactiveLoss.toFixed(2),
      status: cumulativeReg > limit ? 'danger' : cumulativeReg > limit * 0.8 ? 'warn' : 'ok'
    });
  });

  return { results, Vs, totalActiveLoss, totalReactiveLoss, cumulativeReg };
}

export function findOptimalTap(
  segs: SegmentInput[], Vn: number, R: number, X: number, pf: number, limit: number
): number {
  let bestTap = 0, bestReg = 999;
  for (let tap = -10; tap <= 10; tap += 1.25) {
    const c = calculateRegulation(segs, Vn, R, X, pf, limit, tap, false, '0', 0);
    const pr = parseFloat(c.results[c.results.length - 1]?.cumReg || '0');
    if (pr < bestReg && pr >= 0) { bestReg = pr; bestTap = tap; }
  }
  return bestTap;
}

export interface OptimalConfig {
  tap: number;
  statcomBus: number;
  statcomMvar: number;
  conductor: string;
  peakReg: number;
  totalLoss: number;
}

export function runOptimizer(
  segs: SegmentInput[], Vn: number, pf: number, limit: number, currentConductor: string
): OptimalConfig {
  const conductorKeys = Object.keys(CONDUCTORS);
  const currentCondIdx = conductorKeys.indexOf(currentConductor);

  let bestConfig: OptimalConfig = { tap: 0, statcomBus: 0, statcomMvar: 0, conductor: currentConductor, peakReg: 999, totalLoss: 999 };

  for (let ci = currentCondIdx; ci < conductorKeys.length; ci++) {
    const cKey = conductorKeys[ci];
    const cR = CONDUCTORS[cKey].r;
    const cX = CONDUCTORS[cKey].x;

    for (let tap = -5; tap <= 10; tap += 2.5) {
      for (let bus = 0; bus < segs.length; bus++) {
        for (let mvar = 0; mvar <= 30; mvar += 5) {
          const calc = calculateRegulation(segs, Vn, cR, cX, pf, limit, tap, mvar > 0, bus.toString(), mvar);
          const pr = parseFloat(calc.results[calc.results.length - 1]?.cumReg || '0');
          const loss = calc.totalActiveLoss;

          if (pr <= limit && (pr < bestConfig.peakReg || (Math.abs(pr - bestConfig.peakReg) < 0.1 && loss < bestConfig.totalLoss))) {
            bestConfig = { tap, statcomBus: bus, statcomMvar: mvar, conductor: cKey, peakReg: pr, totalLoss: loss };
          }
        }
      }
    }
  }

  return bestConfig;
}

// Demo data generator
export function getDemoAnalysisData(): AnalysisData {
  const segs: SegmentInput[] = [
    { km: 12, mva: 18, df: 1.0, label: 'S1' },
    { km: 8, mva: 12, df: 1.0, label: 'S2' },
    { km: 5, mva: 6, df: 1.0, label: 'S3' },
  ];
  const Vn = 132, R = 0.161, X = 0.360, pf = 0.92, limit = 5;
  const oltcPct = 0;
  const calc = calculateRegulation(segs, Vn, R, X, pf, limit, oltcPct, false, '0', 0);
  const results = calc.results;
  const totalLen = segs.reduce((a, b) => a + b.km, 0);
  const totalLoad = segs.reduce((a, b) => a + b.mva, 0);
  const peakReg = parseFloat(results[results.length - 1]?.cumReg || '0');
  const VR = parseFloat(results[results.length - 1]?.Vcurrent || String(Vn));

  return {
    results, Vn, pf, limit, segs, peakReg, totalLen, totalLoad, VR, R, X,
    oltcPct, statcomEnabled: false, statcomBus: '0', statcomMvar: 0,
    totalActiveLoss: calc.totalActiveLoss, totalReactiveLoss: calc.totalReactiveLoss,
    Vs: calc.Vs,
  };
}
