// Sag-Tension Engine — IS 802 / IEC 60826
// Catenary sag-tension calculation with change-of-state equation
//
// PRIMARY OUTPUT: staticTension_kg → feeds into SC Forces module's fst_kg input
//
// References:
//  - IS 802:2015 — Use of Structural Steel in Overhead Transmission Line Towers
//  - IEC 60826:2017 — Design criteria of overhead transmission lines
//  - IS 398 — Aluminium conductors for overhead transmission purposes
//  - PGCIL stringing charts (validation reference)

export interface SagTensionInputs {
  // Conductor properties
  conductorName: string;
  area_mm2: number;           // Total cross-section area (mm²)
  diameter_mm: number;        // Overall diameter (mm)
  weight_kg_m: number;        // Weight per unit length (kg/m)
  uts_kN: number;             // Ultimate tensile strength (kN)
  elasticModulus_N_mm2: number;  // Young's modulus E (N/mm²) — used for Initial/As-strung track
  thermalExpCoeff: number;    // Coefficient of linear thermal expansion (/°C)
  finalModulus_N_mm2: number; // Final modulus after creep (N/mm²), 0 = use elastic — used for Final track
  creepStrain_pct?: number;   // Creep strain (%), converted to equivalent thermal offset for Final track

  // Span geometry
  span_m: number;             // Span length (m)
  rulingSpan_m: number;       // Ruling span for sag-tension calc (m), 0 = use span
  levelDiff_m: number;        // Height difference between supports (m)

  // Loading conditions
  windPressure_Pa: number;    // Design wind pressure on conductor (Pa)
  iceFactor: number;          // Ice radial thickness (mm), 0 = no ice (most of India)
  dragCoeff: number;          // Legacy drag coefficient field

  // Stringing conditions (initial/reference state)
  refTemp_C: number;          // Reference stringing temperature (°C)
  initialTension_pctUTS: number; // Initial everyday tension as % of UTS
  safetyFactor: number;       // Safety factor on UTS (typically 4.0 for IS 802)

  // Temperature cases to evaluate
  tempCases_C: number[];      // e.g. [-5, 0, 15, 32, 53, 75, 85, 100]

  // Tower/clearance
  towerHeight_m: number;       // Conductor attachment height above ground (m)
  insulatorLength_m: number;   // Insulator string length (m)
  minGroundClearance_m: number; // Required minimum ground clearance (m) per IS 802

  // New V2 fields:
  standard?: 'IS802' | 'IEC60826';
  windZone?: number;              // 1 to 6
  terrainCategory?: 1 | 2 | 3;    // 1 to 3
  reliabilityLevel?: 1 | 2 | 3;   // 1 to 3
  conductorGustFactor?: number;   // G_c
  insulatorGustFactor?: number;   // G_i
  dragCoeff_conductor?: number;   // C_dc
  dragCoeff_insulator?: number;   // C_di
  insulatorWeight_kg?: number;    // W_ins
  insulatorArea_m2?: number;      // A_ins
  systemVoltageKv?: number;

  // Phase 4: Broken Wire
  towerType?: 'suspension' | 'tension' | 'deadend';
  brokenWireLoadFactor_pct?: number; // 0 or undefined = use user input
}

// Sub-interface for one track's intermediate values in the change-of-state equation
export interface TrackTrace {
  T1_N: number;
  w1_N_m: number;
  w2_N_m: number;
  L_m: number;
  K_AE_N: number;           // A × E
  w1L2K_term_N: number;     // w1²L²K/(24×T1²)
  w2L2K_term_N: number;     // w2²L²K/(24×T2²)
  deltaT_C: number;          // Effective ΔT (includes creep offset for Final track)
  alphaExpansion_term_N: number; // K × α × ΔT
  C1_value_N: number;
  T2_result_N: number;
  sag_catenary_m: number;
  sag_parabolic_m: number;
  insulatorDrop_m: number;
  verticalSag_m: number;
  clearance_m: number;
  clearance_ok: boolean;
}

export interface PerTempTrace {
  temperature_C: number;
  condition: string;
  initial: TrackTrace;
  final: TrackTrace;
}

export interface SagTableRow {
  temperature_C: number;
  condition: string;           // "No Wind" | "Full Wind" | "Ice Only" | "Ice & Wind"
  // Legacy fields — consistently mapped to FINAL state for backward compatibility
  tension_kg: number;
  tension_pctUTS: number;
  sag_m: number;
  sag_parabolic_m: number;
  clearance_m: number;
  clearance_ok: boolean;
  blowout_m: number;          // Horizontal wind deflection
  swingAngle_deg: number;     // Swing angle due to wind
  // Phase 3: Explicit Initial/Final fields
  initial_tension_kg: number;
  initial_sag_m: number;
  initial_clearance_m: number;
  initial_clearance_ok: boolean;
  final_tension_kg: number;
  final_sag_m: number;
  final_clearance_m: number;
  final_clearance_ok: boolean;
}

export interface BrokenWireResult {
  towerType: 'suspension' | 'tension' | 'deadend';
  operatingTension_kg: number;      // reference tension jise "unbalanced" treat karenge
  loadFactorApplied_pct: number;    // kaunsa % use hua
  longitudinalLoad_kg: number;      // = operatingTension_kg × loadFactorApplied_pct/100
  insulatorSwingAngle_deg?: number; // sirf suspension ke liye, illustrative
  insulatorSwingWarning?: string;   // agar swing angle unrealistic ho (>60°), warning
}

export interface SagTensionResults {
  // Key output for SC Forces — INITIAL state (as-strung reference for tower structural loading)
  staticTension_kg: number;
  staticTension_kN: number;

  // Full table
  sagTable: SagTableRow[];

  // Summary metrics (from Final state — design/steady-state condition)
  maxSag_m: number;
  maxSag_temp_C: number;
  minClearance_m: number;
  minClearance_temp_C: number;
  maxTension_kg: number;       // Final-track max tension
  maxTension_temp_C: number;

  // Phase 3: Initial-track UTS check (worst-case tension = Initial + Coldest + Full Wind)
  initial_maxTension_kg: number;
  initial_maxTension_temp_C: number;
  initial_uts_check: boolean;

  // Wind loading
  windForce_N_m: number;
  totalCombinedLoad_N_m: number;

  // Validation
  catenary_vs_parabolic_pct: number;
  uts_check: boolean;          // Final-track UTS check
  clearance_check: boolean;    // Whether all clearances pass (Final state)

  // Phase 4: Broken Wire
  brokenWire: BrokenWireResult | null;

  // Ruling span
  rulingSpan_m: number;

  // New V2 fields:
  trace?: {
    standard: string;
    windZone: number;
    terrainCategory: number;
    reliabilityLevel: number;
    k1: number;
    k2: number;
    vBasic: number;
    vDesign: number;
    pDesign: number;
    conductorGustFactor: number;
    insulatorGustFactor: number;
    dragCoeffConductor: number;
    dragCoeffInsulator: number;
    insulatorWeightKg: number;
    insulatorAreaM2: number;
    effectiveWindPressurePa: number;
    wWindCond: number;
    fWindIns: number;
    insulatorSwingAngleDeg: number;
    insulatorVerticalDropM: number;
    iceWeight_N_m?: number;
    icedDiameter_mm?: number;
    wSelf_N_m: number;
    wCombined_N_m: number;
    perTempTraces: PerTempTrace[];
  };

  warnings: string[];
}

const G = 9.807; // m/s²

// --- Design Wind Pressure Table 4 (reliabilityLevel 1-3, terrainCategory 1-3, windZone 1-6) ---
export const IS802_TABLE_4_PD: Record<number, Record<number, number[]>> = {
  1: { // Reliability Level 1
    1: [403, 563, 717, 818, 925, 1120], // Terrain Category 1 (Zones 1-6)
    2: [346, 483, 614, 701, 793, 960], // Terrain Category 2
    3: [250, 349, 444, 507, 573, 694], // Terrain Category 3
  },
  2: { // Reliability Level 2
    1: [470, 681, 883, 1026, 1182, 1455], // Terrain Category 1 (Zones 1-6)
    2: [403, 584, 757, 879, 1013, 1248], // Terrain Category 2
    3: [291, 422, 547, 635, 732, 901], // Terrain Category 3
  },
  3: { // Reliability Level 3
    1: [552, 838, 1120, 1319, 1516, 1892], // Terrain Category 1 (Zones 1-6)
    2: [473, 719, 960, 1131, 1300, 1622], // Terrain Category 2
    3: [342, 519, 694, 817, 939, 1172], // Terrain Category 3
  }
};

// --- Risk Coefficient K_1 Table 2 (reliabilityLevel 1-3, windZone 1-6) ---
export const IS802_TABLE_2_K1: Record<number, number[]> = {
  1: [1.00, 1.00, 1.00, 1.00, 1.00, 1.00], // Reliability Level 1 (Zones 1-6)
  2: [1.08, 1.10, 1.11, 1.12, 1.13, 1.14], // Reliability Level 2
  3: [1.17, 1.22, 1.25, 1.27, 1.28, 1.30]  // Reliability Level 3
};

// --- Gust Response Tables 6 and 7 ---
const TABLE_6_HEIGHTS = [10, 20, 30, 40, 50, 60, 70, 80];
export const IS802_TABLE_6_GI_GT: Record<number, number[]> = {
  10: [1.70, 1.92, 2.55],
  20: [1.85, 2.20, 2.82],
  30: [1.96, 2.30, 2.98],
  40: [2.07, 2.40, 3.12],
  50: [2.13, 2.48, 3.24],
  60: [2.20, 2.55, 3.34],
  70: [2.26, 2.63, 3.46],
  80: [2.31, 2.69, 3.58],
};

const TABLE_7_SPANS = [200, 300, 400, 500, 600, 700, 800];
const TABLE_7_HEIGHTS = [10, 20, 40, 60, 80];

export const IS802_TABLE_7_GC: Record<1 | 2 | 3, Record<number, number[]>> = {
  1: {
    10: [1.70, 1.65, 1.60, 1.56, 1.53, 1.50, 1.47],
    20: [1.90, 1.87, 1.83, 1.79, 1.75, 1.70, 1.66],
    40: [2.10, 2.04, 2.00, 1.95, 1.90, 1.85, 1.80],
    60: [2.24, 2.18, 2.12, 2.07, 2.02, 1.96, 1.90],
    80: [2.35, 2.25, 2.18, 2.13, 2.10, 2.06, 2.03],
  },
  2: {
    10: [1.83, 1.78, 1.73, 1.69, 1.65, 1.60, 1.55],
    20: [2.12, 2.04, 1.95, 1.88, 1.84, 1.80, 1.80],
    40: [2.34, 2.27, 2.20, 2.13, 2.08, 2.05, 2.02],
    60: [2.55, 2.46, 2.37, 2.28, 2.23, 2.20, 2.17],
    80: [2.69, 2.56, 2.48, 2.41, 2.36, 2.32, 2.28],
  },
  3: {
    10: [2.05, 1.98, 1.93, 1.88, 1.83, 1.77, 1.73],
    20: [2.44, 2.35, 2.25, 2.15, 2.10, 2.06, 2.03],
    40: [2.76, 2.67, 2.58, 2.49, 2.42, 2.38, 2.34],
    60: [2.97, 2.87, 2.77, 2.67, 2.60, 2.56, 2.52],
    80: [3.19, 3.04, 2.93, 2.85, 2.78, 2.73, 2.69],
  },
};

/** Linear interpolation helper: find y at x, given sorted xs/ys arrays. */
function lerp1D(x: number, xs: number[], ys: number[]): number {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) {
      const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + t * (ys[i + 1] - ys[i]);
    }
  }
  return ys[ys.length - 1];
}

/**
 * Gi / GT lookup — interpolates over height for a given terrain category.
 */
export function getGiFromTable6(terrainCategory: 1 | 2 | 3, heightAboveGroundM: number): number {
  const ys = TABLE_6_HEIGHTS.map((h) => IS802_TABLE_6_GI_GT[h][terrainCategory - 1]);
  return lerp1D(heightAboveGroundM, TABLE_6_HEIGHTS, ys);
}

/**
 * Gc lookup — bilinear interpolation over height AND ruling span, for a given terrain category.
 */
export function getGcFromTable7(
  terrainCategory: 1 | 2 | 3,
  heightAboveGroundM: number,
  rulingSpanM: number
): number {
  const table = IS802_TABLE_7_GC[terrainCategory];
  const ys = TABLE_7_HEIGHTS.map((h) => lerp1D(rulingSpanM, TABLE_7_SPANS, table[h]));
  return lerp1D(heightAboveGroundM, TABLE_7_HEIGHTS, ys);
}

/**
 * Default inputs — typical 400kV Moose ACSR, PGCIL-style
 */
export function getDefaultSagTensionInputs(): SagTensionInputs {
  return {
    conductorName: 'ACSR Moose',
    area_mm2: 596.0,
    diameter_mm: 31.77,
    weight_kg_m: 2.004,
    uts_kN: 159.7,
    elasticModulus_N_mm2: 65000,
    thermalExpCoeff: 19.3e-6,
    finalModulus_N_mm2: 0,
    creepStrain_pct: 0,

    span_m: 300,
    rulingSpan_m: 0,
    levelDiff_m: 0,

    windPressure_Pa: 701,        // IS 802 Zone IV, Category 2, Level 1
    iceFactor: 0,
    dragCoeff: 1.0,

    refTemp_C: 32,               // IS 802 everyday temperature
    initialTension_pctUTS: 25,   // 25% UTS at 32°C no-wind
    safetyFactor: 4.0,

    tempCases_C: [-5, 0, 15, 32, 53, 75, 85, 100],

    towerHeight_m: 30,
    insulatorLength_m: 3.5,
    minGroundClearance_m: 8.84,  // IS 802 for 400kV

    // New V2 fields:
    standard: 'IS802',
    windZone: 4,
    terrainCategory: 2,
    reliabilityLevel: 1,
    conductorGustFactor: undefined, // Dynamic default
    insulatorGustFactor: undefined, // Dynamic default
    dragCoeff_conductor: 1.0,
    dragCoeff_insulator: 1.2,
    insulatorWeight_kg: 100,
    insulatorArea_m2: 0.5,
    systemVoltageKv: 400,

    // Phase 4: Broken Wire
    towerType: 'suspension',
    brokenWireLoadFactor_pct: undefined
  };
}

/**
 * Solve the change-of-state equation (cubic in T₂) using bisection.
 *
 *   T₂ - (w₂² × L² × A × E) / (24 × T₂²)
 *     = T₁ - (w₁² × L² × A × E) / (24 × T₁²) + A × E × α × (temp₂ - temp₁)
 */
function solveChangeOfState(
  T1_N: number,
  w1_N_m: number,
  w2_N_m: number,
  L_m: number,
  A_m2: number,
  E_Pa: number,
  alpha: number,
  deltaT_C: number,
  warnings?: string[],
): number {
  const K = A_m2 * E_Pa;
  const w1L2K = w1_N_m * w1_N_m * L_m * L_m * K;
  const w2L2K = w2_N_m * w2_N_m * L_m * L_m * K;

  const C1 = T1_N - w1L2K / (24 * T1_N * T1_N) + K * alpha * deltaT_C;

  const f = (T2: number): number => {
    return T2 - w2L2K / (24 * T2 * T2) - C1;
  };

  let lo = 100;
  let hi = K * 0.01;
  if (hi < 1000) hi = 500000;

  if (f(lo) * f(hi) > 0) {
    lo = 1;
    hi = K * 0.1;
    if (f(lo) * f(hi) > 0) {
      if (warnings) warnings.push(`Bisection solver failed to bracket root for deltaT=${deltaT_C}°C. Falling back to initial tension.`);
      return T1_N;
    }
  }

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return (lo + hi) / 2;
}

/**
 * Catenary sag (exact): sag = (T/w) × (cosh(wL/2T) - 1)
 */
function catenarySag(T_N: number, w_N_m: number, L_m: number): number {
  if (T_N <= 0 || w_N_m <= 0) return 0;
  const ratio = (w_N_m * L_m) / (2 * T_N);
  return (T_N / w_N_m) * (Math.cosh(ratio) - 1);
}

/**
 * Parabolic sag: sag = wL² / (8T)
 */
function parabolicSag(T_N: number, w_N_m: number, L_m: number): number {
  if (T_N <= 0) return 0;
  return (w_N_m * L_m * L_m) / (8 * T_N);
}

/**
 * Wind force on conductor per unit length (N/m)
 * IS 802: F_w = C_d × q × d
 */
function windForcePerMeter(
  windPressure_Pa: number,
  diameter_m: number,
  dragCoeff: number,
): number {
  return dragCoeff * windPressure_Pa * diameter_m;
}

/**
 * Combined loading: w_combined = √(w_self² + w_wind²)
 */
function combinedLoad(w_self_N_m: number, w_wind_N_m: number): number {
  return Math.sqrt(w_self_N_m * w_self_N_m + w_wind_N_m * w_wind_N_m);
}

/**
 * Main sag-tension computation
 */
export function computeSagTension(inp: SagTensionInputs): SagTensionResults {
  const warnings: string[] = [];

  const L = inp.rulingSpan_m > 0 ? inp.rulingSpan_m : inp.span_m;
  const A_m2 = inp.area_mm2 * 1e-6;
  const d_m = inp.diameter_mm * 1e-3;
  const w_self = inp.weight_kg_m * G;
  // Phase 3: Dual modulus — Initial (as-strung) vs Final (post-creep)
  const E_initial = inp.elasticModulus_N_mm2 * 1e6;
  const E_final = inp.finalModulus_N_mm2 > 0 ? inp.finalModulus_N_mm2 * 1e6 : inp.elasticModulus_N_mm2 * 1e6;
  const alpha = inp.thermalExpCoeff;
  const UTS_N = inp.uts_kN * 1000;
  // Creep strain → equivalent thermal offset (Southwire/Alcoa method)
  const deltaT_creep = alpha > 0 ? ((inp.creepStrain_pct ?? 0) / 100) / alpha : 0;

  // Unpack V2 fields
  const standard = inp.standard || 'IS802';
  const windZone = inp.windZone || 4;
  const terrainCategory = inp.terrainCategory || 2;
  const reliabilityLevel = inp.reliabilityLevel || 1;
  const dragCoeffConductor = inp.dragCoeff_conductor !== undefined ? inp.dragCoeff_conductor : (inp.dragCoeff || 1.0);
  const dragCoeffInsulator = inp.dragCoeff_insulator !== undefined ? inp.dragCoeff_insulator : 1.2;
  const insulatorWeightKg = inp.insulatorWeight_kg !== undefined ? inp.insulatorWeight_kg : 100;
  const insulatorAreaM2 = inp.insulatorArea_m2 !== undefined ? inp.insulatorArea_m2 : 0.5;

  // Determine wind pressure
  let P_d = inp.windPressure_Pa;
  let k1 = 1.0;
  let k2 = 1.0;
  let v_b = 47;
  let v_d = 47;

  if (standard === 'IS802') {
    const zoneIndex = windZone - 1;

    // Table 2 K1
    const k1Row = IS802_TABLE_2_K1[reliabilityLevel];
    if (k1Row && k1Row[zoneIndex] !== undefined) {
      k1 = k1Row[zoneIndex];
    }

    // Zone speed
    const vBasicMap = [33, 39, 44, 47, 50, 55];
    if (vBasicMap[zoneIndex] !== undefined) {
      v_b = vBasicMap[zoneIndex];
    }

    // Terrain factor
    const k2Map = { 1: 1.08, 2: 1.00, 3: 0.85 };
    k2 = k2Map[terrainCategory] || 1.00;

    v_d = v_b * k1 * k2;

    // Table 4 Pressure Lookup
    const pdRow = IS802_TABLE_4_PD[reliabilityLevel]?.[terrainCategory];
    if (pdRow && pdRow[zoneIndex] !== undefined) {
      P_d = pdRow[zoneIndex];
    } else {
      P_d = 0.6 * v_d * v_d;
    }
  }

  // Dynamic Gust Factors lookup
  const lookupGc = standard === 'IS802' ? getGcFromTable7(terrainCategory, inp.towerHeight_m, L) : 1.0;
  const lookupGi = standard === 'IS802' ? getGiFromTable6(terrainCategory, inp.towerHeight_m) : 1.0;

  const conductorGustFactor = inp.conductorGustFactor !== undefined && inp.conductorGustFactor !== 0
    ? inp.conductorGustFactor
    : lookupGc;
  const insulatorGustFactor = inp.insulatorGustFactor !== undefined && inp.insulatorGustFactor !== 0
    ? inp.insulatorGustFactor
    : lookupGi;

  // Conductor Ice Load Calculations
  const t_ice = inp.iceFactor || 0;
  const rho_ice = 915; // kg/m³
  let w_ice = 0;
  let d_iced = d_m;
  let w_self_iced = w_self;
  let w_wind_iced = 0;
  let w_combined_iced = w_self;

  if (t_ice > 0) {
    const t_ice_m = t_ice * 1e-3;
    const A_ice_m2 = Math.PI * (d_m + t_ice_m) * t_ice_m;
    w_ice = A_ice_m2 * rho_ice * G; // N/m
    w_self_iced = w_self + w_ice;
    d_iced = d_m + 2 * t_ice_m;
    const effectiveConductorWindPressure = standard === 'IS802' ? P_d * conductorGustFactor : P_d;
    w_wind_iced = windForcePerMeter(effectiveConductorWindPressure, d_iced, dragCoeffConductor);
    w_combined_iced = combinedLoad(w_self_iced, w_wind_iced);
  }

  // Calculate Conductor Wind Force (N/m) (Bare Conductor)
  const effectiveConductorWindPressure = standard === 'IS802' ? P_d * conductorGustFactor : P_d;
  const w_wind = windForcePerMeter(effectiveConductorWindPressure, d_m, dragCoeffConductor);

  // Calculate Insulator Wind Force (N)
  const effectiveInsulatorWindPressure = standard === 'IS802' ? P_d * insulatorGustFactor : P_d;
  const F_wind_ins = dragCoeffInsulator * effectiveInsulatorWindPressure * insulatorAreaM2;

  const w_combined = combinedLoad(w_self, w_wind);
  const T_ref_N = (inp.initialTension_pctUTS / 100) * UTS_N;

  const maxAllowable_N = UTS_N / inp.safetyFactor;
  if (T_ref_N > maxAllowable_N) {
    warnings.push(`Initial tension (${(T_ref_N / 1000).toFixed(1)} kN) exceeds UTS/SF limit (${(maxAllowable_N / 1000).toFixed(1)} kN)`);
  }

  const sagTable: SagTableRow[] = [];
  let maxSag = 0, maxSagTemp = 0;
  let minClearance = Infinity, minClearanceTemp = 0;
  let maxTension_final = 0, maxTensionTemp_final = 0;
  let maxTension_initial = 0, maxTensionTemp_initial = 0;
  let maxCatParDiff = 0;

  const perTempTraces: PerTempTrace[] = [];

  let finalSwingAngle = 0;
  let finalVerticalDrop = 0;

  // Helper: compute one track's TrackTrace from solve results
  function buildTrackTrace(
    T_ref: number, w1: number, w2: number, L_span: number,
    A: number, E_Pa: number, alphaCoeff: number, effectiveDeltaT: number,
    T2: number, span_actual: number, insulDrop: number, towerH: number, minCl: number
  ): TrackTrace {
    const K = A * E_Pa;
    const w1L2K = w1 * w1 * L_span * L_span * K / (24 * T_ref * T_ref);
    const w2L2K = w2 * w2 * L_span * L_span * K / (24 * T2 * T2);
    const alphaExp = K * alphaCoeff * effectiveDeltaT;
    const C1 = T_ref - w1L2K + alphaExp;
    const sag_cat = catenarySag(T2, w2, span_actual);
    const sag_par = parabolicSag(T2, w2, span_actual);
    // For wind rows, verticalSag is adjusted later; for no-wind, verticalSag = sag_cat
    const clearance = towerH - insulDrop - sag_cat;
    return {
      T1_N: T_ref, w1_N_m: w1, w2_N_m: w2, L_m: L_span,
      K_AE_N: K, w1L2K_term_N: w1L2K, w2L2K_term_N: w2L2K,
      deltaT_C: effectiveDeltaT, alphaExpansion_term_N: alphaExp, C1_value_N: C1,
      T2_result_N: T2, sag_catenary_m: sag_cat, sag_parabolic_m: sag_par,
      insulatorDrop_m: insulDrop, verticalSag_m: sag_cat, clearance_m: clearance,
      clearance_ok: clearance >= minCl,
    };
  }

  for (const temp of inp.tempCases_C) {
    const deltaT = temp - inp.refTemp_C;
    const deltaT_final = deltaT + deltaT_creep; // Creep adds equivalent thermal offset

    // Determine if ice is active for this case (typically active only in coldest conditions <= 0°C)
    const hasIce = t_ice > 0 && temp <= 0;
    const w_active_noWind = hasIce ? w_self_iced : w_self;
    const w_active_wind = hasIce ? w_combined_iced : w_combined;
    const w_active_wind_only = hasIce ? w_wind_iced : w_wind;
    const condNoWind = hasIce ? 'Ice Only' : 'No Wind';
    const condWind = hasIce ? 'Ice & Wind' : 'Full Wind';

    // ===================== No Wind / Ice Only =====================

    // Track 1 — Initial (As-strung, elastic modulus, no creep offset)
    const T_nw_init = solveChangeOfState(
      T_ref_N, w_self, w_active_noWind, L, A_m2, E_initial, alpha, deltaT, warnings
    );
    const insulatorDrop_nw = inp.insulatorLength_m;
    const trNwInit = buildTrackTrace(
      T_ref_N, w_self, w_active_noWind, L, A_m2, E_initial, alpha, deltaT,
      T_nw_init, inp.span_m, insulatorDrop_nw, inp.towerHeight_m, inp.minGroundClearance_m
    );

    // Track 2 — Final (post-creep modulus + creep equivalent temp offset)
    const T_nw_final = solveChangeOfState(
      T_ref_N, w_self, w_active_noWind, L, A_m2, E_final, alpha, deltaT_final, warnings
    );
    const trNwFinal = buildTrackTrace(
      T_ref_N, w_self, w_active_noWind, L, A_m2, E_final, alpha, deltaT_final,
      T_nw_final, inp.span_m, insulatorDrop_nw, inp.towerHeight_m, inp.minGroundClearance_m
    );

    perTempTraces.push({
      temperature_C: temp, condition: condNoWind,
      initial: trNwInit, final: trNwFinal,
    });

    // Legacy sagTable row — mapped to FINAL state consistently
    const sag_final_nw = trNwFinal.sag_catenary_m;
    const clearance_final_nw = trNwFinal.clearance_m;
    sagTable.push({
      temperature_C: temp, condition: condNoWind,
      tension_kg: T_nw_final / G,
      tension_pctUTS: (T_nw_final / UTS_N) * 100,
      sag_m: sag_final_nw,
      sag_parabolic_m: trNwFinal.sag_parabolic_m,
      clearance_m: clearance_final_nw,
      clearance_ok: clearance_final_nw >= inp.minGroundClearance_m,
      blowout_m: 0, swingAngle_deg: 0,
      // Explicit Initial/Final fields
      initial_tension_kg: T_nw_init / G,
      initial_sag_m: trNwInit.sag_catenary_m,
      initial_clearance_m: trNwInit.clearance_m,
      initial_clearance_ok: trNwInit.clearance_ok,
      final_tension_kg: T_nw_final / G,
      final_sag_m: sag_final_nw,
      final_clearance_m: clearance_final_nw,
      final_clearance_ok: clearance_final_nw >= inp.minGroundClearance_m,
    });

    // Track summary metrics (Final state for sag/clearance)
    if (sag_final_nw > maxSag) { maxSag = sag_final_nw; maxSagTemp = temp; }
    if (clearance_final_nw < minClearance) { minClearance = clearance_final_nw; minClearanceTemp = temp; }
    if (T_nw_final > maxTension_final) { maxTension_final = T_nw_final; maxTensionTemp_final = temp; }
    if (T_nw_init > maxTension_initial) { maxTension_initial = T_nw_init; maxTensionTemp_initial = temp; }

    if (sag_final_nw > 0) {
      const diff = Math.abs(sag_final_nw - trNwFinal.sag_parabolic_m) / sag_final_nw * 100;
      if (diff > maxCatParDiff) maxCatParDiff = diff;
    }

    // ===================== Full Wind / Ice & Wind =====================

    // Track 1 — Initial
    const T_w_init = solveChangeOfState(
      T_ref_N, w_self, w_active_wind, L, A_m2, E_initial, alpha, deltaT, warnings
    );
    // Track 2 — Final
    const T_w_final = solveChangeOfState(
      T_ref_N, w_self, w_active_wind, L, A_m2, E_final, alpha, deltaT_final, warnings
    );

    // Swing/blowout geometry (use Final-track tension for display)
    const sag_cat_w_final = catenarySag(T_w_final, w_active_wind, inp.span_m);
    const sag_par_w_final = parabolicSag(T_w_final, w_active_wind, inp.span_m);
    const verticalSag_w_final = sag_cat_w_final * (w_active_noWind / w_active_wind);

    const W_ins_N = insulatorWeightKg * G;
    const verticalForceAtSupport = W_ins_N + 0.5 * w_active_noWind * inp.span_m;
    const horizontalForceAtSupport = F_wind_ins + 0.5 * w_active_wind_only * inp.span_m;
    const swingAngleRad = Math.atan2(horizontalForceAtSupport, verticalForceAtSupport);
    const swingAngleDeg = swingAngleRad * (180 / Math.PI);
    const insulatorVerticalDrop = inp.insulatorLength_m * Math.cos(swingAngleRad);

    const clearance_w_final = inp.towerHeight_m - insulatorVerticalDrop - verticalSag_w_final;

    const insulatorHorizontalDeflection = inp.insulatorLength_m * Math.sin(swingAngleRad);
    const conductorBlowout = sag_cat_w_final * (w_active_wind_only / w_active_wind);
    const totalBlowout = insulatorHorizontalDeflection + conductorBlowout;

    // Build traces for wind condition — Initial track
    const sag_cat_w_init = catenarySag(T_w_init, w_active_wind, inp.span_m);
    const sag_par_w_init = parabolicSag(T_w_init, w_active_wind, inp.span_m);
    const verticalSag_w_init = sag_cat_w_init * (w_active_noWind / w_active_wind);
    const clearance_w_init = inp.towerHeight_m - insulatorVerticalDrop - verticalSag_w_init;

    const trWindInit: TrackTrace = {
      T1_N: T_ref_N, w1_N_m: w_self, w2_N_m: w_active_wind, L_m: L,
      K_AE_N: A_m2 * E_initial,
      w1L2K_term_N: w_self * w_self * L * L * A_m2 * E_initial / (24 * T_ref_N * T_ref_N),
      w2L2K_term_N: w_active_wind * w_active_wind * L * L * A_m2 * E_initial / (24 * T_w_init * T_w_init),
      deltaT_C: deltaT,
      alphaExpansion_term_N: A_m2 * E_initial * alpha * deltaT,
      C1_value_N: T_ref_N - (w_self * w_self * L * L * A_m2 * E_initial / (24 * T_ref_N * T_ref_N)) + A_m2 * E_initial * alpha * deltaT,
      T2_result_N: T_w_init, sag_catenary_m: sag_cat_w_init, sag_parabolic_m: sag_par_w_init,
      insulatorDrop_m: insulatorVerticalDrop, verticalSag_m: verticalSag_w_init,
      clearance_m: clearance_w_init, clearance_ok: clearance_w_init >= inp.minGroundClearance_m,
    };

    const K_AE_final = A_m2 * E_final;
    const trWindFinal: TrackTrace = {
      T1_N: T_ref_N, w1_N_m: w_self, w2_N_m: w_active_wind, L_m: L,
      K_AE_N: K_AE_final,
      w1L2K_term_N: w_self * w_self * L * L * K_AE_final / (24 * T_ref_N * T_ref_N),
      w2L2K_term_N: w_active_wind * w_active_wind * L * L * K_AE_final / (24 * T_w_final * T_w_final),
      deltaT_C: deltaT_final,
      alphaExpansion_term_N: K_AE_final * alpha * deltaT_final,
      C1_value_N: T_ref_N - (w_self * w_self * L * L * K_AE_final / (24 * T_ref_N * T_ref_N)) + K_AE_final * alpha * deltaT_final,
      T2_result_N: T_w_final, sag_catenary_m: sag_cat_w_final, sag_parabolic_m: sag_par_w_final,
      insulatorDrop_m: insulatorVerticalDrop, verticalSag_m: verticalSag_w_final,
      clearance_m: clearance_w_final, clearance_ok: clearance_w_final >= inp.minGroundClearance_m,
    };

    perTempTraces.push({
      temperature_C: temp, condition: condWind,
      initial: trWindInit, final: trWindFinal,
    });

    sagTable.push({
      temperature_C: temp, condition: condWind,
      // Legacy fields → Final state
      tension_kg: T_w_final / G,
      tension_pctUTS: (T_w_final / UTS_N) * 100,
      sag_m: verticalSag_w_final,
      sag_parabolic_m: sag_par_w_final * (w_active_noWind / w_active_wind),
      clearance_m: clearance_w_final,
      clearance_ok: clearance_w_final >= inp.minGroundClearance_m,
      blowout_m: totalBlowout,
      swingAngle_deg: swingAngleDeg,
      // Explicit Initial/Final
      initial_tension_kg: T_w_init / G,
      initial_sag_m: verticalSag_w_init,
      initial_clearance_m: clearance_w_init,
      initial_clearance_ok: clearance_w_init >= inp.minGroundClearance_m,
      final_tension_kg: T_w_final / G,
      final_sag_m: verticalSag_w_final,
      final_clearance_m: clearance_w_final,
      final_clearance_ok: clearance_w_final >= inp.minGroundClearance_m,
    });

    if (T_w_final > maxTension_final) { maxTension_final = T_w_final; maxTensionTemp_final = temp; }
    if (T_w_init > maxTension_initial) { maxTension_initial = T_w_init; maxTensionTemp_initial = temp; }
    if (clearance_w_final < minClearance) { minClearance = clearance_w_final; minClearanceTemp = temp; }

    finalSwingAngle = swingAngleDeg;
    finalVerticalDrop = insulatorVerticalDrop;
  }

  // Static tension at reference temperature (no wind) — INITIAL state for SC Forces
  // This represents the as-strung everyday tension used for tower structural loading design.
  const staticTension_kg = T_ref_N / G;

  // UTS checks — Final track (design/steady-state) and Initial track (worst-case tension)
  const utsCheck_final = maxTension_final <= maxAllowable_N;
  const utsCheck_initial = maxTension_initial <= maxAllowable_N;
  if (!utsCheck_initial) {
    warnings.push(`Initial-track max tension (${(maxTension_initial / G).toFixed(0)} kg = ${((maxTension_initial / UTS_N) * 100).toFixed(1)}% UTS) exceeds allowable (${(maxAllowable_N / G).toFixed(0)} kg = ${(100 / inp.safetyFactor).toFixed(1)}% UTS)`);
  }
  if (!utsCheck_final) {
    warnings.push(`Final-track max tension (${(maxTension_final / G).toFixed(0)} kg = ${((maxTension_final / UTS_N) * 100).toFixed(1)}% UTS) exceeds allowable (${(maxAllowable_N / G).toFixed(0)} kg = ${(100 / inp.safetyFactor).toFixed(1)}% UTS)`);
  }


  const clearanceCheck = sagTable.every(r => r.clearance_ok);
  if (!clearanceCheck) {
    const failedRows = sagTable.filter(r => !r.clearance_ok);
    warnings.push(`Ground clearance violated at: ${failedRows.map(r => `${r.temperature_C}°C (${r.condition})`).join(', ')}`);
  }

  // Phase 4: Broken Wire Condition
  let brokenWire: BrokenWireResult | null = null;
  if (inp.brokenWireLoadFactor_pct !== undefined) {
    const longitudinalLoad_kg = staticTension_kg * (inp.brokenWireLoadFactor_pct / 100);
    const towerType = inp.towerType ?? 'suspension';
    
    let insulatorSwingAngle_deg: number | undefined;
    let insulatorSwingWarning: string | undefined;

    if (towerType === 'suspension') {
      const W_ins_N = (inp.insulatorWeight_kg ?? 100) * G;
      const W_cond_N = w_self * L; // full weight of conductor in span
      // Vertical force at support = insulator weight + half conductor weight of intact span
      const verticalForce_N = W_ins_N + 0.5 * W_cond_N;
      const longitudinalLoad_N = longitudinalLoad_kg * G;
      
      const angleRad = Math.atan(longitudinalLoad_N / verticalForce_N);
      insulatorSwingAngle_deg = angleRad * (180 / Math.PI);

      if (insulatorSwingAngle_deg > 60) {
        insulatorSwingWarning = "Calculated swing angle exceeds typical insulator design range (>60°). Suspension towers are typically not designed to fully resist this load without damage or controlled failure. Value is purely illustrative.";
      }
    }

    brokenWire = {
      towerType,
      operatingTension_kg: staticTension_kg,
      loadFactorApplied_pct: inp.brokenWireLoadFactor_pct,
      longitudinalLoad_kg,
      insulatorSwingAngle_deg,
      insulatorSwingWarning
    };

    if (insulatorSwingWarning) {
      warnings.push(`Broken Wire: ${insulatorSwingWarning}`);
    }
  }

  return {
    staticTension_kg,
    staticTension_kN: T_ref_N / 1000,

    sagTable,

    maxSag_m: maxSag,
    maxSag_temp_C: maxSagTemp,
    minClearance_m: minClearance === Infinity ? 0 : minClearance,
    minClearance_temp_C: minClearanceTemp,
    maxTension_kg: maxTension_final / G,
    maxTension_temp_C: maxTensionTemp_final,

    initial_maxTension_kg: maxTension_initial / G,
    initial_maxTension_temp_C: maxTensionTemp_initial,
    initial_uts_check: utsCheck_initial,

    windForce_N_m: w_wind,
    totalCombinedLoad_N_m: w_combined,

    catenary_vs_parabolic_pct: maxCatParDiff,
    uts_check: utsCheck_initial && utsCheck_final,  // Both tracks must pass
    clearance_check: clearanceCheck,

    rulingSpan_m: L,

    brokenWire,

    trace: {
      standard,
      windZone,
      terrainCategory,
      reliabilityLevel,
      k1,
      k2,
      vBasic: v_b,
      vDesign: v_d,
      pDesign: P_d,
      conductorGustFactor,
      insulatorGustFactor,
      dragCoeffConductor,
      dragCoeffInsulator,
      insulatorWeightKg,
      insulatorAreaM2,
      effectiveWindPressurePa: effectiveConductorWindPressure,
      wWindCond: w_wind,
      fWindIns: F_wind_ins,
      insulatorSwingAngleDeg: finalSwingAngle,
      insulatorVerticalDropM: finalVerticalDrop,
      iceWeight_N_m: w_ice,
      icedDiameter_mm: t_ice > 0 ? d_iced * 1000 : undefined,
      wSelf_N_m: w_self,
      wCombined_N_m: w_combined,
      perTempTraces
    },

    warnings,
  };
}
