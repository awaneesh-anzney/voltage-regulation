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
  windPressure_Pa: number;    // Basic wind pressure on conductor (Pa) — IS 802 Table 3
  iceFactor: number;          // Ice radial thickness (mm), 0 = no ice (most of India)
  dragCoeff: number;          // Aerodynamic drag coefficient (typically 1.0)

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
}

export interface SagTableRow {
  temperature_C: number;
  condition: string;           // "No Wind" | "Full Wind"
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

  warnings: string[];
}

const G = 9.807; // m/s²

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

    windPressure_Pa: 590,        // IS 802 Zone IV
    iceFactor: 0,
    dragCoeff: 1.0,

    refTemp_C: 32,               // IS 802 everyday temperature
    initialTension_pctUTS: 25,   // 25% UTS at 32°C no-wind
    safetyFactor: 4.0,

    tempCases_C: [-5, 0, 15, 32, 53, 75, 85, 100],

    towerHeight_m: 30,
    insulatorLength_m: 3.5,
    minGroundClearance_m: 8.84,  // IS 802 for 400kV
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

  const w_wind = windForcePerMeter(inp.windPressure_Pa, d_m, inp.dragCoeff);
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

  const effectiveHeight = inp.towerHeight_m - inp.insulatorLength_m;

  for (const temp of inp.tempCases_C) {
    const deltaT = temp - inp.refTemp_C;

    // No Wind condition
    const T_noWind = solveChangeOfState(
      T_ref_N, w_self, w_self, L, A_m2, E, alpha, deltaT
    );
    const sag_cat_nw = catenarySag(T_noWind, w_self, inp.span_m);
    const sag_par_nw = parabolicSag(T_noWind, w_self, inp.span_m);
    const clearance_nw = effectiveHeight - sag_cat_nw;
    const tension_kg_nw = T_noWind / G;

    sagTable.push({
      temperature_C: temp,
      condition: 'No Wind',
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

    // Full Wind condition
    const T_wind = solveChangeOfState(
      T_ref_N, w_self, w_combined, L, A_m2, E, alpha, deltaT
    );
    const sag_cat_w = catenarySag(T_wind, w_combined, inp.span_m);
    const sag_par_w = parabolicSag(T_wind, w_combined, inp.span_m);
    const verticalSag_w = sag_cat_w * (w_self / w_combined);
    const clearance_w = effectiveHeight - verticalSag_w;
    const tension_kg_w = T_wind / G;

    const blowout = sag_cat_w * (w_wind / w_combined);
    const swingAngle = Math.atan2(w_wind, w_self) * (180 / Math.PI);

    sagTable.push({
      temperature_C: temp,
      condition: 'Full Wind',
      tension_kg: tension_kg_w,
      tension_pctUTS: (T_wind / UTS_N) * 100,
      sag_m: verticalSag_w,
      sag_parabolic_m: sag_par_w * (w_self / w_combined),
      clearance_m: clearance_w,
      clearance_ok: clearance_w >= inp.minGroundClearance_m,
      blowout_m: blowout,
      swingAngle_deg: swingAngle,
    });

    if (T_wind > maxTension) { maxTension = T_wind; maxTensionTemp = temp; }
  }

  // Static tension at reference temperature (no wind) — THE key output for SC Forces
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

    warnings,
  };
}
