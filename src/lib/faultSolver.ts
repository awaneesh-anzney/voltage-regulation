export interface FaultInput {
  voltageKv: number;          // V_n (kV)
  sourceMva: number;          // S_sc'' (MVA)
  lineLengthKm: number;       // Distance (km)
  lineRPerKm: number;         // R (ohm/km)
  lineXPerKm: number;         // X (ohm/km)
  zeroSeqRMultiplier: number; // e.g. 3.0
  zeroSeqXMultiplier: number; // e.g. 3.0
  cFactor: number;            // IEC voltage factor (typically 1.1)
}

export interface FaultResults {
  zSource: { r: number; x: number; mag: number };
  zLinePositive: { r: number; x: number; mag: number };
  zLineZero: { r: number; x: number; mag: number };
  zTotalPositive: { r: number; x: number; mag: number };
  zTotalZero: { r: number; x: number; mag: number };
  
  // Fault Currents (kA)
  i3Phase: number;
  iLineToGround: number;
  iLineToLine: number;
  iLineToLineToGround: number;
  
  // Fault MVA
  mva3Phase: number;
  mvaLineToGround: number;
  mvaLineToLine: number;
  mvaLineToLineToGround: number;
  
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
    cFactor = 1.1
  } = input;

  // 1. Source Impedance Z_Q (referred to voltage level)
  // Z_Q = c * V_n^2 / S_sc''
  const zSourceMag = (cFactor * Math.pow(voltageKv, 2)) / sourceMva;
  // Assume X_Q / R_Q ratio is 10 (R_Q = 0.1 * X_Q)
  // Z_Q = R_Q + j X_Q => mag^2 = R_Q^2 + X_Q^2 = 0.01 * X_Q^2 + X_Q^2 = 1.01 * X_Q^2
  const xSource = zSourceMag / Math.sqrt(1.01);
  const rSource = 0.1 * xSource;

  // 2. Line Positive Sequence Impedance Z_L1
  const rLine1 = lineRPerKm * lineLengthKm;
  const xLine1 = lineXPerKm * lineLengthKm;
  const zLine1Mag = Math.sqrt(rLine1 * rLine1 + xLine1 * xLine1);

  // 3. Line Zero Sequence Impedance Z_L0
  const rLine0 = rLine1 * zeroSeqRMultiplier;
  const xLine0 = xLine1 * zeroSeqXMultiplier;
  const zLine0Mag = Math.sqrt(rLine0 * rLine0 + xLine0 * xLine0);

  // 4. Total Sequence Impedances at Fault Bus
  // Positive/Negative sequence Z1 = Z2 = Z_source + Z_line1
  const rPositive = rSource + rLine1;
  const xPositive = xSource + xLine1;
  const zPositiveMag = Math.sqrt(rPositive * rPositive + xPositive * xPositive);

  // Zero sequence Z0 = Z_source0 + Z_line0
  // Assume source zero sequence is similar or slightly higher, let's treat Z_source0 = Z_source
  const rZero = rSource + rLine0;
  const xZero = xSource + xLine0;
  const zZeroMag = Math.sqrt(rZero * rZero + xZero * xZero);

  // 5. Short-Circuit Current Calculations (IEC 60909)

  // A. Three-Phase Symmetrical Fault Current (I_k3'')
  // I_k3'' = (c * V_n) / (sqrt(3) * Z1)
  const i3Phase = (cFactor * voltageKv) / (Math.sqrt(3) * zPositiveMag);
  const mva3Phase = Math.sqrt(3) * voltageKv * i3Phase;

  // B. Line-to-Ground Fault Current (I_k1'')
  // I_k1'' = 3 * c * V_n / (sqrt(3) * |2*Z1 + Z0|)
  const rLGTotal = 2 * rPositive + rZero;
  const xLGTotal = 2 * xPositive + xZero;
  const zLGTotalMag = Math.sqrt(rLGTotal * rLGTotal + xLGTotal * xLGTotal);
  const iLineToGround = (3 * cFactor * voltageKv) / (Math.sqrt(3) * zLGTotalMag);
  const mvaLineToGround = Math.sqrt(3) * voltageKv * iLineToGround;

  // C. Line-to-Line Symmetrical Fault Current (I_k2'')
  // I_k2'' = c * V_n / (2 * Z1)
  const iLineToLine = (cFactor * voltageKv) / (2 * zPositiveMag);
  const mvaLineToLine = Math.sqrt(3) * voltageKv * iLineToLine;

  // D. Line-to-Line-to-Ground Fault Current (I_k2g'')
  // Direct sequence calculations for double line to ground fault current magnitude
  // I_k2g'' = sqrt(3) * c * V_n * |Z0 - a^2*Z2| / |Z1*Z2 + Z1*Z0 + Z2*Z0|
  // Standard approximation is:
  // I_k2g'' = c * V_n * sqrt( R_sum^2 + X_sum^2 ) / (denom)
  // Let's use sequence-impedance matrix values for double line to ground:
  // Z_eq = Z1 + (Z2 * Z0) / (Z2 + Z0)
  // Total current injected: I_total = c*V_n / (sqrt(3)*Z_eq)
  // But we want fault current into ground which is 3*I_0
  // Symmetrical components equations:
  // Let's calculate equivalent impedance for L-L-G:
  // Z2 + Z0:
  const r20 = rPositive + rZero;
  const x20 = xPositive + xZero;
  const z20MagSq = r20*r20 + x20*x20;
  
  // Z2 * Z0 = (rPositive + j*xPositive)*(rZero + j*xZero)
  const rProd = rPositive*rZero - xPositive*xZero;
  const xProd = rPositive*xZero + xPositive*rZero;

  // (Z2 * Z0) / (Z2 + Z0)
  const rParallel = (rProd*r20 + xProd*x20) / z20MagSq;
  const xParallel = (xProd*r20 - rProd*x20) / z20MagSq;

  // Total Z for phase current calculation
  const rTotalLLG = rPositive + rParallel;
  const xTotalLLG = xPositive + xParallel;
  const zTotalLLG = Math.sqrt(rTotalLLG*rTotalLLG + xTotalLLG*xTotalLLG);

  const iLineToLineToGround = (cFactor * voltageKv) / (Math.sqrt(3) * zTotalLLG);
  const mvaLineToLineToGround = Math.sqrt(3) * voltageKv * iLineToLineToGround;

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
    
    clauses: [
      "IEC 60909-0 Clause 3.2: Symmetrical three-phase short-circuit calculations",
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
