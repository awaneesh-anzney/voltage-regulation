import { FAULT_SOLVER_REGISTRY, FaultSolverClauseId } from "./registries/faultSolverRegistry";
import { VerificationTag } from "./types/verification";

export interface ClauseReference {
  refId: FaultSolverClauseId;
  label: string;           
  verification: VerificationTag;
}

export interface FaultInput {
  voltageKv: number;          // V_n (kV)
  sourceMva: number;          // S_sc'' (MVA)
  lineLengthKm: number;       // Distance (km)
  lineRPerKm: number;         // R (ohm/km)
  lineXPerKm: number;         // X (ohm/km)
  zeroSeqRMultiplier: number; // e.g. 3.0
  zeroSeqXMultiplier: number; // e.g. 3.0
  cFactor: number;            // IEC voltage factor (typically 1.1)

  // V2 / Real-world fields
  sourceGroundingType?: "solid" | "resistance" | "reactance" | "isolated";
  sourceR0Mult?: number;
  sourceX0Mult?: number;
  faultLocationKm?: number;
  includeTransformer?: boolean;
  transformerMva?: number;
  transformerReactancePct?: number;
  transformerVectorGroup?: "Dyn" | "YNyn" | "Yy" | "YNy";
  faultType?: "far-from-generator" | "near-to-generator";
  generatorRatedCurrentKa?: number;
  breakerDelayS?: number;
  tk1?: number; // fault duration (seconds)

  // Motor contribution fields
  motorContribution?: {
    includeMotor: boolean;
    totalMotorMva: number;        // Aggregate motor MVA at fault bus
    motorXdPercent: number;       // Subtransient reactance Xd'' (typically 16.7% - 25%)
    motorXRRatio: number;         // X/R ratio (IEC 60909 default range — verify against nameplate if available)
  };
}

export interface FaultResults {
  zSource: { r: number; x: number; mag: number };
  zLinePositive: { r: number; x: number; mag: number };
  zLineZero: { r: number; x: number; mag: number };
  zTotalPositive: { r: number; x: number; mag: number };
  zTotalZero: { r: number; x: number; mag: number };
  
  // Symmetrical Initial SC Currents (kA)
  i3Phase: number;
  iLineToGround: number;
  iLineToLine: number;
  iLineToLineToGround: number;
  
  // Symmetrical Initial SC MVA
  mva3Phase: number;
  mvaLineToGround: number;
  mvaLineToLine: number;
  mvaLineToLineToGround: number;
  
  // New Peak, Breaking, and Thermal values:
  // Peak Currents (kA)
  ip3Phase: number;
  ipLineToGround: number;
  ipLineToLine: number;
  ipLineToLineToGround: number;

  // Symmetrical Breaking Currents (kA)
  ib3Phase: number;
  ibLineToGround: number;
  ibLineToLine: number;
  ibLineToLineToGround: number;

  // Thermal Equivalent Currents (kA)
  ith3Phase: number;
  ithLineToGround: number;
  ithLineToLine: number;
  ithLineToLineToGround: number;

  // Trace calculations for equation tab
  trace: {
    voltageKv: number;
    sourceMva: number;
    cFactor: number;
    zSourcePos: { r: number; x: number; mag: number };
    zSourceZero: { r: number; x: number; mag: number };
    zTransPos?: { r: number; x: number; mag: number };
    zTransZero?: { r: number; x: number; mag: number };
    zMotorPos?: { r: number; x: number; mag: number };
    zLinePos: { r: number; x: number; mag: number };
    zLineZero: { r: number; x: number; mag: number };
    zTotalPos: { r: number; x: number; mag: number };
    zTotalZero: { r: number; x: number; mag: number };
    kappa3ph: number;
    kappaLG: number;
    kappaLL: number;
    kappaLLG: number;
    tau3ph: number;
    tauLG: number;
    tauLL: number;
    tauLLG: number;
    m3ph: number;
    mLG: number;
    mLL: number;
    mLLG: number;
    tk1: number;
    includeTransformer: boolean;
    transformerMva?: number;
    transformerReactancePct?: number;
    faultLocationKm: number;
    transformerVectorGroup?: string;
    faultType?: string;
    generatorRatedCurrentKa?: number;
    breakerDelayS?: number;
    includeMotor: boolean;
    motorMva?: number;
    motorXdPercent?: number;
    motorXRRatio?: number;
  };

  // Clause references
  clauseReferences: ClauseReference[];
}

export function calculateFaults(input: FaultInput): FaultResults {
  const {
    voltageKv,
    sourceMva,
    lineLengthKm,
    lineRPerKm,
    lineXPerKm,
    zeroSeqRMultiplier = 3.0,
    zeroSeqXMultiplier = 3.0,
    cFactor = 1.1,
    sourceGroundingType = "solid",
    sourceR0Mult = 2.0,
    sourceX0Mult = 2.0,
    faultLocationKm = lineLengthKm,
    includeTransformer = false,
    transformerMva = 100,
    transformerReactancePct = 12.5,
    transformerVectorGroup = "Dyn",
    faultType = "far-from-generator",
    generatorRatedCurrentKa = 2.0,
    breakerDelayS = 0.05,
    tk1 = 1.0,
  } = input;

  const f = 50; // Frequency 50 Hz

  // 1. Source Impedance Z_Q1 (Positive sequence)
  const zSourceMag = (cFactor * Math.pow(voltageKv, 2)) / sourceMva;
  // Assume X_Q / R_Q ratio is 10 (R_Q = 0.1 * X_Q)
  const xSource = zSourceMag / Math.sqrt(1.01);
  const rSource = 0.1 * xSource;

  // Source Zero Sequence Z_Q0
  let rSource0 = rSource * sourceR0Mult;
  let xSource0 = xSource * sourceX0Mult;
  if (sourceGroundingType === "isolated") {
    // Isolated neutral means zero sequence impedance is extremely high
    rSource0 = 1e6;
    xSource0 = 1e6;
  }
  const zSource0Mag = Math.sqrt(rSource0 * rSource0 + xSource0 * xSource0);

  // 2. Transformer Impedance Z_T (if included)
  let rTrans = 0;
  let xTrans = 0;
  let zTransMag = 0;
  if (includeTransformer) {
    // Z_T = %Z_T / 100 * V_n^2 / S_transformer
    zTransMag = (transformerReactancePct / 100) * Math.pow(voltageKv, 2) / transformerMva;
    // Assume power transformer X/R ratio is 20 (R_T = 0.05 * X_T)
    xTrans = zTransMag / Math.sqrt(1.0025);
    rTrans = 0.05 * xTrans;
  }

  // Zero-sequence transformer impedance (Fix #1)
  let rTrans0 = rTrans;
  let xTrans0 = xTrans;
  if (includeTransformer) {
    if (transformerVectorGroup === "Yy" || transformerVectorGroup === "YNy") {
      // Ungrounded secondary blocks zero-sequence path completely
      rTrans0 = 1e6;
      xTrans0 = 1e6;
    }
  }

  // 3. Line Impedances Z_L at faultLocationKm
  const actualLength = Math.max(0, Math.min(faultLocationKm, lineLengthKm));
  const rLine1 = lineRPerKm * actualLength;
  const xLine1 = lineXPerKm * actualLength;
  const zLine1Mag = Math.sqrt(rLine1 * rLine1 + xLine1 * xLine1);

  const rLine0 = rLine1 * zeroSeqRMultiplier;
  const xLine0 = xLine1 * zeroSeqXMultiplier;
  const zLine0Mag = Math.sqrt(rLine0 * rLine0 + xLine0 * xLine0);

  // 4. Motor Impedance Z_M (if included)
  // Motor acts as a parallel current source at the fault bus — contributes to positive and negative sequence only.
  // Zero-sequence contribution is excluded (motors are typically delta-connected or ungrounded star).
  const mc = input.motorContribution;
  const includeMotor = mc?.includeMotor ?? false;
  const motorMva = mc?.totalMotorMva ?? 10;
  const motorXdPercent = mc?.motorXdPercent ?? 20;
  const motorXRRatio = mc?.motorXRRatio ?? 10;

  let rMotor = 0;
  let xMotor = 0;
  let zMotorMag = 0;
  if (includeMotor && motorMva > 0) {
    // SIMPLIFICATION: IEC 60909-0 impedance correction factor K_M assumed = 1.0.
    // Real K_M = 0.95·c_max / (1 + x_d''·sin(φ_rN)) — TODO: verify exact formula before production use.
    const kM = 1.0;
    zMotorMag = kM * (motorXdPercent / 100) * Math.pow(voltageKv, 2) / motorMva;
    xMotor = zMotorMag / Math.sqrt(1 + Math.pow(1 / motorXRRatio, 2));
    rMotor = xMotor / motorXRRatio;
  }

  // 5. Total Sequence Impedances at Fault Bus
  // Z_series = Z_source + Z_transformer + Z_line (series path from grid)
  const rSeries = rSource + rTrans + rLine1;
  const xSeries = xSource + xTrans + xLine1;

  // If motor is included, Z1_total = Z_series || Z_motor (parallel combination)
  // If motor is not included, Z1_total = Z_series
  let rPositive: number;
  let xPositive: number;
  if (includeMotor && zMotorMag > 0) {
    const zSeriesVec: Complex = { r: rSeries, x: xSeries };
    const zMotorVec: Complex = { r: rMotor, x: xMotor };
    const zParallel = div(mul(zSeriesVec, zMotorVec), add(zSeriesVec, zMotorVec));
    rPositive = zParallel.r;
    xPositive = zParallel.x;
  } else {
    rPositive = rSeries;
    xPositive = xSeries;
  }
  const zPositiveMag = Math.sqrt(rPositive * rPositive + xPositive * xPositive);

  // Z0 = Z_source0 + Z_transformer0 + Z_line0 (Fix #2)
  // Note: For Dyn, delta primary blocks source zero-sequence transfer.
  // For Yy and YNy, the secondary side ungrounded star has no ground reference at the fault point (making Z_trans0 infinite).
  // Motor is excluded from zero-sequence (delta/ungrounded star — no zero-seq return path).
  const isSource0Blocked = includeTransformer && (transformerVectorGroup === "Dyn" || transformerVectorGroup === "Yy" || transformerVectorGroup === "YNy");
  const rZero = (isSource0Blocked ? 0 : rSource0) + rTrans0 + rLine0;
  const xZero = (isSource0Blocked ? 0 : xSource0) + xTrans0 + xLine0;
  const zZeroMag = Math.sqrt(rZero * rZero + xZero * xZero);

  // 5. Short-Circuit Current Calculations (IEC 60909)
  // A. Three-Phase Symmetrical Fault Current (I_k3'')
  const i3Phase = (cFactor * voltageKv) / (Math.sqrt(3) * zPositiveMag);
  const mva3Phase = Math.sqrt(3) * voltageKv * i3Phase;

  // B. Line-to-Ground Fault Current (I_k1'')
  const rLGTotal = 2 * rPositive + rZero;
  const xLGTotal = 2 * xPositive + xZero;
  const zLGTotalMag = Math.sqrt(rLGTotal * rLGTotal + xLGTotal * xLGTotal);
  const iLineToGround = (3 * cFactor * voltageKv) / (Math.sqrt(3) * zLGTotalMag);
  const mvaLineToGround = Math.sqrt(3) * voltageKv * iLineToGround;

  // C. Line-to-Line Symmetrical Fault Current (I_k2'')
  const iLineToLine = (cFactor * voltageKv) / (2 * zPositiveMag);
  const mvaLineToLine = Math.sqrt(3) * voltageKv * iLineToLine;

  // D. Line-to-Line-to-Ground Fault Current (I_k2g'')
  // Symmetrical components vector calculations for phase current in faulted phases (L2/L3)
  const vRef: Complex = { r: (cFactor * voltageKv) / Math.sqrt(3), x: 0 };
  const z1: Complex = { r: rPositive, x: xPositive };
  const z0: Complex = { r: rZero, x: xZero };
  const a: Complex = { r: -0.5, x: 0.8660254 };
  const a2: Complex = { r: -0.5, x: -0.8660254 };

  const z1PlusZ0 = add(z1, z0);
  const z1TimesZ0 = mul(z1, z0);
  const zp = div(z1TimesZ0, z1PlusZ0); // Z1 || Z0
  const zTotalLLGVec = add(z1, zp); // Z1 + (Z1 || Z0)

  const i1 = div(vRef, zTotalLLGVec); // Positive sequence current vector
  const i0 = div(mul({ r: -i1.r, x: -i1.x }, z1), z1PlusZ0); // Zero sequence current vector
  const i2 = div(mul({ r: -i1.r, x: -i1.x }, z0), z1PlusZ0); // Negative sequence current vector

  const iL2 = add(add(i0, mul(a2, i1)), mul(a, i2)); // Phase L2 current vector
  const iLineToLineToGround = mag(iL2);
  const mvaLineToLineToGround = Math.sqrt(3) * voltageKv * iLineToLineToGround;

  // Store variables for trace mapping
  const rTotalLLG = zTotalLLGVec.r;
  const xTotalLLG = zTotalLLGVec.x;

  // 6. Dynamic Factors, Peaks, and Thermal Equivalents (IEC 60909)
  const calcFactors = (r: number, x: number, ik: number) => {
    const xr = x / Math.max(r, 0.0001);
    const kappa = 1.02 + 0.98 * Math.exp(-3 / xr);
    const ip = kappa * Math.sqrt(2) * ik;
    
    // Symmetrical breaking current (for far-from-generator vs near-to-generator short circuits) (Fix #4)
    // NOTE: Motor contribution decay factor q is not yet implemented.
    // Motor current is conservatively treated as non-decaying (Ib_motor = Ik_motor), which gives a safe overestimate.
    // TODO: Implement IEC 60909 q-factor for motor breaking current decay when verified.
    const ib = faultType === "near-to-generator"
      ? ik * calculateMu(ik / Math.max(generatorRatedCurrentKa, 0.001), breakerDelayS)
      : ik;

    // Thermal equivalent calculation:
    const tau = x / (2 * Math.PI * f * Math.max(r, 0.0001));
    
    // IEC 60909-0 Clause 4.5 Standard Formula using kappa instead of tau approximation (Fix #3)
    let m = 0;
    if (tk1 > 0 && kappa > 1.0001) {
      const lnKappaMinus1 = Math.log(kappa - 1);
      const denom = 2 * f * tk1 * lnKappaMinus1;
      m = (Math.exp(4 * f * tk1 * lnKappaMinus1) - 1) / denom;
    }
    const ith = ik * Math.sqrt(1 + m);

    return { xr, kappa, ip, ib, tau, m, ith };
  };

  const f3ph = calcFactors(rPositive, xPositive, i3Phase);
  const fLG = calcFactors(rLGTotal / 3, xLGTotal / 3, iLineToGround);
  const fLL = calcFactors(rPositive, xPositive, iLineToLine);
  const fLLG = calcFactors(rTotalLLG, xTotalLLG, iLineToLineToGround);

  return {
    zSource: { r: round(rSource, 4), x: round(xSource, 4), mag: round(zSourceMag, 4) },
    zLinePositive: { r: round(rLine1, 4), x: round(xLine1, 4), mag: round(zLine1Mag, 4) },
    zLineZero: { r: round(rLine0, 4), x: round(xLine0, 4), mag: round(zLine0Mag, 4) },
    zTotalPositive: { r: round(rPositive, 4), x: round(xPositive, 4), mag: round(zPositiveMag, 4) },
    zTotalZero: { r: round(rZero, 4), x: round(xZero, 4), mag: round(zZeroMag, 4) },
    
    i3Phase: round(i3Phase, 3),
    iLineToGround: round(iLineToGround, 3),
    iLineToLine: round(iLineToLine, 3),
    iLineToLineToGround: round(iLineToLineToGround, 3),
    
    mva3Phase: round(mva3Phase, 2),
    mvaLineToGround: round(mvaLineToGround, 2),
    mvaLineToLine: round(mvaLineToLine, 2),
    mvaLineToLineToGround: round(mvaLineToLineToGround, 2),
    
    // New Peak, Breaking, and Thermal values
    ip3Phase: round(f3ph.ip, 3),
    ipLineToGround: round(fLG.ip, 3),
    ipLineToLine: round(fLL.ip, 3),
    ipLineToLineToGround: round(fLLG.ip, 3),

    ib3Phase: round(f3ph.ib, 3),
    ibLineToGround: round(fLG.ib, 3),
    ibLineToLine: round(fLL.ib, 3),
    ibLineToLineToGround: round(fLLG.ib, 3),

    ith3Phase: round(f3ph.ith, 3),
    ithLineToGround: round(fLG.ith, 3),
    ithLineToLine: round(fLL.ith, 3),
    ithLineToLineToGround: round(fLLG.ith, 3),

    trace: {
      voltageKv,
      sourceMva,
      cFactor,
      zSourcePos: { r: round(rSource, 4), x: round(xSource, 4), mag: round(zSourceMag, 4) },
      zSourceZero: { r: round(rSource0, 4), x: round(xSource0, 4), mag: round(zSource0Mag, 4) },
      zTransPos: includeTransformer ? { r: round(rTrans, 4), x: round(xTrans, 4), mag: round(zTransMag, 4) } : undefined,
      zTransZero: includeTransformer ? { r: round(rTrans, 4), x: round(xTrans, 4), mag: round(zTransMag, 4) } : undefined,
      zMotorPos: includeMotor ? { r: round(rMotor, 4), x: round(xMotor, 4), mag: round(zMotorMag, 4) } : undefined,
      zLinePos: { r: round(rLine1, 4), x: round(xLine1, 4), mag: round(zLine1Mag, 4) },
      zLineZero: { r: round(rLine0, 4), x: round(xLine0, 4), mag: round(zLine0Mag, 4) },
      zTotalPos: { r: round(rPositive, 4), x: round(xPositive, 4), mag: round(zPositiveMag, 4) },
      zTotalZero: { r: round(rZero, 4), x: round(xZero, 4), mag: round(zZeroMag, 4) },
      kappa3ph: round(f3ph.kappa, 4),
      kappaLG: round(fLG.kappa, 4),
      kappaLL: round(fLL.kappa, 4),
      kappaLLG: round(fLLG.kappa, 4),
      tau3ph: round(f3ph.tau, 4),
      tauLG: round(fLG.tau, 4),
      tauLL: round(fLL.tau, 4),
      tauLLG: round(fLLG.tau, 4),
      m3ph: round(f3ph.m, 4),
      mLG: round(fLG.m, 4),
      mLL: round(fLL.m, 4),
      mLLG: round(fLLG.m, 4),
      tk1,
      includeTransformer,
      transformerMva: includeTransformer ? transformerMva : undefined,
      transformerReactancePct: includeTransformer ? transformerReactancePct : undefined,
      faultLocationKm,
      transformerVectorGroup,
      faultType,
      generatorRatedCurrentKa,
      breakerDelayS,
      includeMotor,
      motorMva: includeMotor ? motorMva : undefined,
      motorXdPercent: includeMotor ? motorXdPercent : undefined,
      motorXRRatio: includeMotor ? motorXRRatio : undefined
    },

    clauseReferences: [
      { refId: FAULT_SOLVER_REGISTRY.threePhaseSC, label: "3-Phase Short-Circuit (initial, peak, breaking, thermal)", verification: "NOT_YET_ASSESSED" },
      { refId: FAULT_SOLVER_REGISTRY.lineToEarthSC, label: "Line-to-Earth Short-Circuit", verification: "NOT_YET_ASSESSED" },
      { refId: FAULT_SOLVER_REGISTRY.lineToLineSC, label: "Line-to-Line Short-Circuit", verification: "NOT_YET_ASSESSED" },
      ...(includeMotor ? [{ refId: FAULT_SOLVER_REGISTRY.motorContribution, label: "Asynchronous Motor Contribution", verification: "NOT_YET_ASSESSED" as VerificationTag }] : []),
      { refId: FAULT_SOLVER_REGISTRY.transformerWithstand, label: "Transformer Withstand Guideline", verification: "NOT_YET_ASSESSED" },
      { refId: FAULT_SOLVER_REGISTRY.towerClearance, label: "Tower Loading Clearance Margin", verification: "NOT_YET_ASSESSED" },
    ]
  };
}

function round(val: number, decimals: number): number {
  return parseFloat(val.toFixed(decimals));
}

// ─── Complex Number Helper Types & Functions ───
interface Complex { r: number; x: number; }

const add = (c1: Complex, c2: Complex): Complex => ({ r: c1.r + c2.r, x: c1.x + c2.x });
const sub = (c1: Complex, c2: Complex): Complex => ({ r: c1.r - c2.r, x: c1.x - c2.x });
const mul = (c1: Complex, c2: Complex): Complex => ({
  r: c1.r * c2.r - c1.x * c2.x,
  x: c1.r * c2.x + c1.x * c2.r
});
const div = (c1: Complex, c2: Complex): Complex => {
  const den = c2.r * c2.r + c2.x * c2.x;
  if (den === 0) return { r: 0, x: 0 };
  return {
    r: (c1.r * c2.r + c1.x * c2.x) / den,
    x: (c1.x * c2.r - c1.r * c2.x) / den
  };
};
const mag = (c: Complex): number => Math.sqrt(c.r * c.r + c.x * c.x);

// ─── Symmetrical Breaking Current mu Factor Calculation ───
function calculateMu(ikOverIr: number, tmin: number): number {
  const ratio = Math.max(0, ikOverIr);
  const mu02 = 0.84 + 0.26 * Math.exp(-0.26 * ratio);
  const mu05 = 0.71 + 0.51 * Math.exp(-0.30 * ratio);
  const mu10 = 0.62 + 0.72 * Math.exp(-0.32 * ratio);
  const mu25 = 0.56 + 0.94 * Math.exp(-0.38 * ratio);

  let muVal = 1.0;
  if (tmin <= 0.02) muVal = mu02;
  else if (tmin >= 0.25) muVal = mu25;
  else if (tmin < 0.05) {
    const frac = (tmin - 0.02) / (0.05 - 0.02);
    muVal = mu02 + frac * (mu05 - mu02);
  } else if (tmin < 0.10) {
    const frac = (tmin - 0.05) / (0.10 - 0.05);
    muVal = mu05 + frac * (mu10 - mu05);
  } else {
    const frac = (tmin - 0.10) / (0.25 - 0.10);
    muVal = mu10 + frac * (mu25 - mu10);
  }
  return Math.min(1.0, muVal);
}
