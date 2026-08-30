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
  elasticModulus_N_mm2: number;  // Young's modulus E (N/mm²)
  thermalExpCoeff: number;    // Coefficient of linear thermal expansion (/°C)
  finalModulus_N_mm2: number; // Final modulus after creep (N/mm²), 0 = use elastic

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
}

export interface SagTableRow {
  temperature_C: number;
  condition: string;           // "No Wind" | "Full Wind" | "Ice Only" | "Ice & Wind"
  tension_kg: number;
  tension_pctUTS: number;
  sag_m: number;
  sag_parabolic_m: number;    // Parabolic approximation for comparison
  clearance_m: number;
  clearance_ok: boolean;
  blowout_m: number;          // Horizontal wind deflection
  swingAngle_deg: number;     // Swing angle due to wind
}

export interface SagTensionResults {
  // Key output for SC Forces
  staticTension_kg: number;    // Everyday tension at ref temp — maps to SC Forces fst_kg
  staticTension_kN: number;

  // Full table
  sagTable: SagTableRow[];

  // Summary metrics
  maxSag_m: number;
  maxSag_temp_C: number;
  minClearance_m: number;
  minClearance_temp_C: number;
  maxTension_kg: number;       // Usually at coldest temperature
  maxTension_temp_C: number;

  // Wind loading
  windForce_N_m: number;       // Wind force per unit length
  totalCombinedLoad_N_m: number;

  // Validation
  catenary_vs_parabolic_pct: number; // Max difference between catenary and parabolic
  uts_check: boolean;          // Whether max tension < UTS/safety_factor
  clearance_check: boolean;    // Whether all clearances pass

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
    80: [2.09, 2.56, 2.48, 2.41, 2.36, 2.32, 2.28],
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
  const E = inp.finalModulus_N_mm2 > 0 ? inp.finalModulus_N_mm2 * 1e6 : inp.elasticModulus_N_mm2 * 1e6;
  const alpha = inp.thermalExpCoeff;
  const UTS_N = inp.uts_kN * 1000;

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
  let maxTension = 0, maxTensionTemp = 0;
  let maxCatParDiff = 0;

  let finalSwingAngle = 0;
  let finalVerticalDrop = 0;

  for (const temp of inp.tempCases_C) {
    const deltaT = temp - inp.refTemp_C;

    // Determine if ice is active for this case (typically active only in coldest conditions <= 0°C)
    const hasIce = t_ice > 0 && temp <= 0;
    const w_active_noWind = hasIce ? w_self_iced : w_self;
    const w_active_wind = hasIce ? w_combined_iced : w_combined;
    const w_active_wind_only = hasIce ? w_wind_iced : w_wind;

    // --- No Wind / Ice Only Condition ---
    const T_noWind = solveChangeOfState(
      T_ref_N, w_self, w_active_noWind, L, A_m2, E, alpha, deltaT
    );
    const sag_cat_nw = catenarySag(T_noWind, w_active_noWind, inp.span_m);
    const sag_par_nw = parabolicSag(T_noWind, w_active_noWind, inp.span_m);
    
    // Ground clearance (Insulator hangs straight down)
    const clearance_nw = (inp.towerHeight_m - inp.insulatorLength_m) - sag_cat_nw;
    const tension_kg_nw = T_noWind / G;

    sagTable.push({
      temperature_C: temp,
      condition: hasIce ? 'Ice Only' : 'No Wind',
      tension_kg: tension_kg_nw,
      tension_pctUTS: (T_noWind / UTS_N) * 100,
      sag_m: sag_cat_nw,
      sag_parabolic_m: sag_par_nw,
      clearance_m: clearance_nw,
      clearance_ok: clearance_nw >= inp.minGroundClearance_m,
      blowout_m: 0,
      swingAngle_deg: 0,
    });

    if (sag_cat_nw > maxSag) { maxSag = sag_cat_nw; maxSagTemp = temp; }
    if (clearance_nw < minClearance) { minClearance = clearance_nw; minClearanceTemp = temp; }
    if (T_noWind > maxTension) { maxTension = T_noWind; maxTensionTemp = temp; }

    if (sag_cat_nw > 0) {
      const diff = Math.abs(sag_cat_nw - sag_par_nw) / sag_cat_nw * 100;
      if (diff > maxCatParDiff) maxCatParDiff = diff;
    }

    // --- Full Wind / Ice & Wind Condition ---
    const T_wind = solveChangeOfState(
      T_ref_N, w_self, w_active_wind, L, A_m2, E, alpha, deltaT
    );
    const sag_cat_w = catenarySag(T_wind, w_active_wind, inp.span_m);
    const sag_par_w = parabolicSag(T_wind, w_active_wind, inp.span_m);
    const verticalSag_w = sag_cat_w * (w_active_noWind / w_active_wind);

    // Calculate Insulator Swing Plane
    const W_ins_N = insulatorWeightKg * G;
    const verticalForceAtSupport = W_ins_N + 0.5 * w_active_noWind * inp.span_m;
    const horizontalForceAtSupport = F_wind_ins + 0.5 * w_active_wind_only * inp.span_m;

    const swingAngleRad = Math.atan2(horizontalForceAtSupport, verticalForceAtSupport);
    const swingAngleDeg = swingAngleRad * (180 / Math.PI);
    const insulatorVerticalDrop = inp.insulatorLength_m * Math.cos(swingAngleRad);

    const clearance_w = inp.towerHeight_m - insulatorVerticalDrop - verticalSag_w;
    const tension_kg_w = T_wind / G;

    // Blowout under wind (Insulator displacement + Conductor blowout)
    const insulatorHorizontalDeflection = inp.insulatorLength_m * Math.sin(swingAngleRad);
    const conductorBlowout = sag_cat_w * (w_active_wind_only / w_active_wind);
    const totalBlowout = insulatorHorizontalDeflection + conductorBlowout;

    sagTable.push({
      temperature_C: temp,
      condition: hasIce ? 'Ice & Wind' : 'Full Wind',
      tension_kg: tension_kg_w,
      tension_pctUTS: (T_wind / UTS_N) * 100,
      sag_m: verticalSag_w,
      sag_parabolic_m: sag_par_w * (w_active_noWind / w_active_wind),
      clearance_m: clearance_w,
      clearance_ok: clearance_w >= inp.minGroundClearance_m,
      blowout_m: totalBlowout,
      swingAngle_deg: swingAngleDeg,
    });

    if (T_wind > maxTension) { maxTension = T_wind; maxTensionTemp = temp; }
    if (clearance_w < minClearance) { minClearance = clearance_w; minClearanceTemp = temp; }

    // Save one set of swing params for the trace summary
    finalSwingAngle = swingAngleDeg;
    finalVerticalDrop = insulatorVerticalDrop;
  }

  // Static tension at reference temperature (no wind)
  const T_static_nw = solveChangeOfState(T_ref_N, w_self, w_self, L, A_m2, E, alpha, 0);
  const staticTension_kg = T_static_nw / G;

  const utsCheck = maxTension <= maxAllowable_N;
  if (!utsCheck) {
    warnings.push(`Maximum tension (${(maxTension / G).toFixed(0)} kg = ${((maxTension / UTS_N) * 100).toFixed(1)}% UTS) exceeds allowable (${(maxAllowable_N / G).toFixed(0)} kg = ${(100 / inp.safetyFactor).toFixed(1)}% UTS)`);
  }

  const clearanceCheck = sagTable.every(r => r.clearance_ok);
  if (!clearanceCheck) {
    const failedRows = sagTable.filter(r => !r.clearance_ok);
    warnings.push(`Ground clearance violated at: ${failedRows.map(r => `${r.temperature_C}°C (${r.condition})`).join(', ')}`);
  }

  return {
    staticTension_kg,
    staticTension_kN: T_static_nw / 1000,

    sagTable,

    maxSag_m: maxSag,
    maxSag_temp_C: maxSagTemp,
    minClearance_m: minClearance === Infinity ? 0 : minClearance,
    minClearance_temp_C: minClearanceTemp,
    maxTension_kg: maxTension / G,
    maxTension_temp_C: maxTensionTemp,

    windForce_N_m: w_wind,
    totalCombinedLoad_N_m: w_combined,

    catenary_vs_parabolic_pct: maxCatParDiff,
    uts_check: utsCheck,
    clearance_check: clearanceCheck,

    rulingSpan_m: L,

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
      icedDiameter_mm: t_ice > 0 ? d_iced * 1000 : undefined
    },

    warnings,
  };
}
