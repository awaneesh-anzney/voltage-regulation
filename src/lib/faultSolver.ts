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
  tk1?: number; // fault duration (seconds)
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
    faultLocationKm: number;
  };

  // Clause references
  clauses: string[];
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

  // 3. Line Impedances Z_L at faultLocationKm
  const actualLength = Math.max(0, Math.min(faultLocationKm, lineLengthKm));
  const rLine1 = lineRPerKm * actualLength;
  const xLine1 = lineXPerKm * actualLength;
  const zLine1Mag = Math.sqrt(rLine1 * rLine1 + xLine1 * xLine1);

  const rLine0 = rLine1 * zeroSeqRMultiplier;
  const xLine0 = xLine1 * zeroSeqXMultiplier;
  const zLine0Mag = Math.sqrt(rLine0 * rLine0 + xLine0 * xLine0);

  // 4. Total Sequence Impedances at Fault Bus
  // Z1 = Z2 = Z_source + Z_transformer + Z_line
  const rPositive = rSource + rTrans + rLine1;
  const xPositive = xSource + xTrans + xLine1;
  const zPositiveMag = Math.sqrt(rPositive * rPositive + xPositive * xPositive);

  // Z0 = Z_source0 + Z_transformer0 + Z_line0 (assume Transformer Z0 = Z1 for Delta-Star grounded)
  const rZero = rSource0 + rTrans + rLine0;
  const xZero = xSource0 + xTrans + xLine0;
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
  const r20 = rPositive + rZero;
  const x20 = xPositive + xZero;
  const z20MagSq = r20 * r20 + x20 * x20;
  
  // Z2 * Z0 = (rPositive + j*xPositive)*(rZero + j*xZero)
  const rProd = rPositive * rZero - xPositive * xZero;
  const xProd = rPositive * xZero + xPositive * rZero;

  // (Z2 * Z0) / (Z2 + Z0)
  const rParallel = z20MagSq > 1e-9 ? (rProd * r20 + xProd * x20) / z20MagSq : 0;
  const xParallel = z20MagSq > 1e-9 ? (xProd * r20 - rProd * x20) / z20MagSq : 0;

  // Total Z for phase current calculation
  const rTotalLLG = rPositive + rParallel;
  const xTotalLLG = xPositive + xParallel;
  const zTotalLLG = Math.sqrt(rTotalLLG * rTotalLLG + xTotalLLG * xTotalLLG);

  const iLineToLineToGround = (cFactor * voltageKv) / (Math.sqrt(3) * zTotalLLG);
  const mvaLineToLineToGround = Math.sqrt(3) * voltageKv * iLineToLineToGround;

  // 6. Dynamic Factors, Peaks, and Thermal Equivalents (IEC 60909)
  const calcFactors = (r: number, x: number, ik: number) => {
    const xr = x / Math.max(r, 0.0001);
    const kappa = 1.02 + 0.98 * Math.exp(-3 / xr);
    const ip = kappa * Math.sqrt(2) * ik;
    
    // Symmetrical breaking current (for far-from-generator short circuits)
    const ib = ik;

    // Thermal equivalent calculation:
    // tau = X / (2 * pi * f * R)
    const tau = x / (2 * Math.PI * f * Math.max(r, 0.0001));
    // m = (tau / tk1) * (1 - e^(-2 * tk1 / tau))
    const m = tk1 > 0 ? (tau / tk1) * (1 - Math.exp(-2 * tk1 / tau)) : 0;
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
      faultLocationKm
    },

    clauses: [
      "IEC 60909-0 Clause 3.2: Symmetrical three-phase short-circuit calculations (initial, peak, breaking, thermal)",
      "IEC 60909-0 Clause 3.5: Line-to-earth (L-G) short-circuit current calculation",
      "IEC 60909-0 Clause 3.6: Line-to-line (L-L) short-circuit calculations",
      "IS 2026 Clause 6.11: Short circuit withstand capability guidelines for transformers",
      "IS 5613 Clause 4.2: Tower loading and structural clearance margins under fault conditions"
    ]
  };
}

function round(val: number, decimals: number): number {
  return parseFloat(val.toFixed(decimals));
}
