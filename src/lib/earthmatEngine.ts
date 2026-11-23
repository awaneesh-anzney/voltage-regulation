// ============================================================================
// GridIntel — Earthmat & Grounding Design Engine (IEEE Std 80-2000 & CBIP 223)
// ============================================================================

export interface MaterialProperties {
  name: string;
  alpha_r: number; // Temperature coefficient of resistance at Tr (1/°C)
  rho_r: number;   // Resistivity of conductor at Tr (µΩ·cm)
  Tm: number;      // Maximum allowable temperature (°C)
  K0: number;      // Inferred zero-resistance temperature constant (°C)
  TCAP: number;    // Thermal capacity per unit volume (J/cm³·°C)
}

/**
 * IEEE Std 80-2000 Table 1 — Material constants for conductor sizing
 */
export const MATERIAL_DB: Record<string, MaterialProperties> = {
  COPPER_ANNEALED: {
    name: 'Copper, annealed soft-drawn',
    alpha_r: 0.00393,
    rho_r: 1.72,
    Tm: 1083,
    K0: 234.0,
    TCAP: 3.42,
  },
  COPPER_HARD: {
    name: 'Copper, commercial hard-drawn',
    alpha_r: 0.00381,
    rho_r: 1.78,
    Tm: 1084,
    K0: 242.0,
    TCAP: 3.42,
  },
  CCS_40: {
    name: 'Copper-clad steel wire (40%)',
    alpha_r: 0.00378,
    rho_r: 5.86,
    Tm: 1084,
    K0: 245.0,
    TCAP: 3.85,
  },
  CCS_30: {
    name: 'Copper-clad steel wire (30%)',
    alpha_r: 0.00378,
    rho_r: 8.62,
    Tm: 1084,
    K0: 245.0,
    TCAP: 3.85,
  },
  CCS_ROD_20: {
    name: 'Copper-clad steel rod (20%)',
    alpha_r: 0.00378,
    rho_r: 10.1,
    Tm: 1084,
    K0: 245.0,
    TCAP: 3.85,
  },
  STEEL_1020: {
    name: 'Steel 1020',
    alpha_r: 0.0016,
    rho_r: 15.9,
    Tm: 1510,
    K0: 605.0,
    TCAP: 3.28,
  },
  STAINLESS_CLAD_STEEL: {
    name: 'Stainless-clad steel rod',
    alpha_r: 0.0016,
    rho_r: 15.9,
    Tm: 1400,
    K0: 605.0,
    TCAP: 3.28,
  },
  ZINC_COATED_STEEL: {
    name: 'Zinc-coated steel rod / GI',
    alpha_r: 0.0032,
    rho_r: 20.1,
    Tm: 419,
    K0: 293.0,
    TCAP: 3.93,
  },
  STAINLESS_STEEL_304: {
    name: 'Stainless steel 304',
    alpha_r: 0.0013,
    rho_r: 72.0,
    Tm: 1400,
    K0: 749.0,
    TCAP: 4.03,
  },
};

export interface EarthmatInput {
  // --- Step 1: System Data ---
  Vs: number;           // System nominal voltage (kV)
  Isc: number;          // Symmetrical system fault current (kA)
  IF: number;           // Symmetrical ground fault current for conductor sizing (kA)
  I_3I0?: number;       // Symmetrical SLG fault current at station (kA) (if omitted, defaults to IF or client value)
  tc: number;           // Duration of current flow for sizing (s)
  ts: number;           // Shock duration for fibrillation limit (s)
  tf: number;           // Fault duration for decrement factor (s)
  L: number;            // Length of switchyard (m)
  B: number;            // Breadth of switchyard (m)
  rho: number;          // Soil resistivity (Ω·m)
  rho_s: number;        // Crushed rock surface resistivity wet (Ω·m)
  Hs: number;           // Crushed rock layer thickness (m)
  Ta: number;           // Design ambient temperature (°C)
  frequency?: number;   // System frequency (Hz), default 50 Hz

  // --- Step 1 / 2: Earthing Conductor Data ---
  materialKey: keyof typeof MATERIAL_DB;
  conductorShape: 'flat' | 'round';
  conductorWidth?: number;      // mm (for flat strip, e.g. 16 mm)
  conductorThickness?: number;  // mm (for flat strip, e.g. 4 mm)
  conductorDiameter?: number;   // mm (for round rod, e.g. 32 mm)
  d_override?: number;          // m (optional explicit equivalent diameter override in Km/Ks)
  h: number;                    // Depth of burial of grid (m)
  D: number;                    // Grid mesh spacing (m)
  corrosionAllowancePct?: number; // e.g. 10% to 15% (default: 0)

  // --- Earth Bore Electrode (Rods) Data ---
  Neb: number;          // Number of earth bore electrodes / rods chosen
  Leb: number;          // Length of each earth bore electrode / rod (m)
  electrodeDiameter?: number; // mm (e.g. 32 mm dia MS rod)

  // --- Fault Current Distribution & Grid Current ---
  Sf: number;           // Fault current division factor (0.0 to 1.0)
  X_over_R?: number;    // X/R ratio for Df calculation (default: 15)
  Df_override?: number; // Optional explicit Df override (e.g. 1.0)
  Cp?: number;          // Corrective / future growth factor (default: 1.0)
  baseFaultCurrent_A?: number; // Optional explicit base current for Ig (e.g. 3180 A in sheet)

  // --- Reproduction & Legacy Audit Flags ---
  reproductionMode?: boolean;   // When true, allows replicating document quirks
  overrideRg?: number;          // Document override for Rg (e.g. 3.028 Ω)
  overrideKm?: number;          // Document override for Km (e.g. 0.906)
  overrideKs?: number;          // Document override for Ks (e.g. 0.406)
  overrideKii?: number;         // Document override for Kii (e.g. 0.5701 even if Leb=0)
  kcmilToMm2Factor?: number;    // Default 0.5067; sheet used 0.5
  tcapOverride?: number;        // Document override for TCAP (e.g. 3.85 vs 3.75)
  skipOptimization?: boolean;   // Internal flag to prevent recursion in recommendation generator
}

export interface Step2SizingResult {
  K0: number;
  TCAP: number;
  Akcmil: number;
  A_req_mm2: number;
  A_req_mm2_si: number;
  A_selected_mm2: number;
  d_calc_mm: number;
  d_selected_mm: number;
  isConductorSafe: boolean;
  corrosionAreaLoss_mm2: number;
  effectiveArea_mm2: number;
}

export interface Step3PotentialsResult {
  Cs: number;
  Etouch50: number;
  Estep50: number;
  Etouch70: number;
  Estep70: number;
}

export interface Step4LayoutResult {
  nA: number;
  nB: number;
  Lc: number;
  LR: number;
  LT: number;
  Lp: number;
  A_area: number;
  recommendedPerimeterRods: number;
}

export interface Step5ResistanceResult {
  Rg: number;
  Rg_theoretical: number;
  term1_invLT: number;
  term2_denom: number;
  term2_inner: number;
  term2: number;
  isBelowTarget: boolean; // Rg <= 1.0 Ω guideline
}

export interface Step6GridCurrentResult {
  Df: number;
  tau_s: number;
  Ig: number;
  IG: number;
  baseCurrentUsed_A: number;
}

export interface Step7GprResult {
  GPR: number;
  isGprBelowEtouch50: boolean;
  isGprBelowEtouch70: boolean;
}

export interface Step8MeshStepResult {
  na: number;
  nb: number;
  nc: number;
  nd: number;
  n: number;
  Ki: number;
  Kh: number;
  Kii: number;
  Km: number;
  Ks: number;
  d_m: number;
  Lm: number;
  Ls: number;
  Em: number;
  Es: number;
}

export interface SafetyVerdict {
  touchSafe50: boolean;
  touchSafe70: boolean;
  stepSafe50: boolean;
  stepSafe70: boolean;
  overallSafe50: boolean;
  overallSafe70: boolean;
  touchMargin50: number; // Etouch50 - Em
  touchMargin70: number; // Etouch70 - Em
  stepMargin50: number;  // Estep50 - Es
  stepMargin70: number;  // Estep70 - Es
  summaryStatus: 'SAFE' | 'NOT_SAFE';
  reasons: string[];
  warnings: string[];
}

export interface OptimizationRecommendation {
  type: 'ADD_RODS' | 'REDUCE_SPACING' | 'INCREASE_GRAVEL' | 'COMBINED';
  description: string;
  parameters: Partial<EarthmatInput>;
  result: {
    Rg: number;
    Em: number;
    Es: number;
    touchMargin70: number;
    isSafe70: boolean;
  };
}

export interface EarthmatResult {
  inputs: EarthmatInput;
  material: MaterialProperties;
  step2: Step2SizingResult;
  step3: Step3PotentialsResult;
  step4: Step4LayoutResult;
  step5: Step5ResistanceResult;
  step6: Step6GridCurrentResult;
  step7: Step7GprResult;
  step8: Step8MeshStepResult;
  verdict: SafetyVerdict;
  recommendations?: OptimizationRecommendation[];
}

// ============================================================================
// HELPER MATHEMATICAL FUNCTIONS
// ============================================================================

/**
 * IEEE Std 80-2000 Clause 15.10 / Eq. 79 — Decrement factor from X/R and tf
 * Df = sqrt(1 + (tau / tf) * (1 - exp(-2 * tf / tau)))   [or Eq. 79 standard approximation]
 * Standard IEEE 80 Eq. 79:
 * Df = sqrt(1 + (Ta / tf) * (1 - exp(-tf / Ta))) with Ta = (X/R) / (2 * pi * f)
 */
export function calculateDf(X_over_R: number, tf: number, frequency = 50): number {
  if (tf <= 0) return 1.0;
  const tau = X_over_R / (2 * Math.PI * frequency);
  const Df = Math.sqrt(1 + (tau / tf) * (1 - Math.exp(-tf / tau)));
  return Df;
}

/**
 * Equivalent diameter for rectangular flat conductor (m)
 * Cross-section area A = w * t => d_eq = sqrt(4 * A / pi) in meters
 */
export function calculateEquivalentDiameter(width_mm: number, thickness_mm: number): number {
  const area_mm2 = width_mm * thickness_mm;
  const d_mm = Math.sqrt((4 * area_mm2) / Math.PI);
  return d_mm / 1000;
}

/**
 * Conductor cross-section area in mm²
 */
export function getSelectedConductorArea(input: EarthmatInput): { area_mm2: number; d_m: number } {
  if (input.conductorShape === 'flat') {
    const w = input.conductorWidth || 16;
    const t = input.conductorThickness || 4;
    const area = w * t;
    const d = calculateEquivalentDiameter(w, t);
    return { area_mm2: area, d_m: d };
  } else {
    const dia = input.conductorDiameter || 10;
    const area = (Math.PI * Math.pow(dia, 2)) / 4;
    return { area_mm2: area, d_m: dia / 1000 };
  }
}

// ============================================================================
// MAIN CALCULATION ENGINE
// ============================================================================

export function calculateEarthmat(input: EarthmatInput): EarthmatResult {
  const warnings: string[] = [];
  const reasons: string[] = [];

  const mat = MATERIAL_DB[input.materialKey] || MATERIAL_DB.CCS_30;

  // --- Sanitize and guard inputs against invalid numbers / division by zero ---
  const L = Math.max(1.0, input.L || 70);
  const B = Math.max(1.0, input.B || 70);
  const D = Math.max(0.5, input.D || 7);
  const h = Math.max(0.1, input.h || 0.5);
  const tc = Math.max(0.01, input.tc || 0.5);
  const ts = Math.max(0.01, input.ts || 0.5);
  const tf = Math.max(0.01, input.tf || 0.5);
  const rho = Math.max(1.0, input.rho || 400);
  const Hs = Math.max(0.0, input.Hs ?? 0.102);
  const rho_s = Hs > 0 && input.rho_s > 0 ? input.rho_s : rho;

  // --- Input Validations & Integrity Checks ---
  if (input.Neb > 0 && input.Leb === 0) {
    warnings.push(
      `Rod count is ${input.Neb} but length Leb is 0 m. Ground rods have zero electrical contribution (LR = 0 m).`
    );
  }

  if (input.materialKey === 'ZINC_COATED_STEEL' && mat.Tm > 500) {
    warnings.push(`Zinc-coated steel Tm should not exceed 419°C (zinc melting point).`);
  }

  if (Hs === 0) {
    warnings.push(`Surface crushed rock thickness Hs is 0. Surface resistivity equals soil resistivity (Cs = 1.0).`);
  }

  // --- STEP 2: Conductor Sizing ---
  // If alpha_r is defined, K0 = 1/alpha_r - 20 (exact equation)
  const K0 = 1 / mat.alpha_r - 20;
  const TCAP = input.tcapOverride !== undefined ? input.tcapOverride : mat.TCAP;

  // IEEE 80 Eq. 41 in kcmil:
  // Akcmil = IF(kA) * 197.4 / sqrt( (TCAP / (tc * alpha_r * rho_r)) * ln((K0 + Tm) / (K0 + Ta)) )
  const logTerm = Math.log(Math.max(1.0001, (K0 + mat.Tm) / (K0 + input.Ta)));
  const underSqrt = (TCAP / (tc * mat.alpha_r * mat.rho_r)) * logTerm;
  const Akcmil = input.IF * (197.4 / Math.sqrt(Math.max(1e-6, underSqrt)));

  // Conversion from kcmil to mm2:
  // Exact physical constant is 0.506707 mm2/kcmil. Document used 0.5.
  const kcmilFactor = input.kcmilToMm2Factor !== undefined ? input.kcmilToMm2Factor : 0.5067;
  const A_req_mm2 = Akcmil * kcmilFactor;

  // SI formula:
  // A_req_si = IF(kA) * 1 / sqrt( (TCAP * 10^-4 / (tc * alpha_r * rho_r)) * ln((K0 + Tm)/(K0 + Ta)) )
  const underSqrtSi = ((TCAP * 1e-4) / (tc * mat.alpha_r * mat.rho_r)) * logTerm;
  const A_req_mm2_si = input.IF * (1 / Math.sqrt(Math.max(1e-6, underSqrtSi)));

  const { area_mm2: A_selected_raw, d_m: d_selected_raw } = getSelectedConductorArea(input);
  const corrPct = input.corrosionAllowancePct || 0;
  const corrosionAreaLoss_mm2 = A_selected_raw * (corrPct / 100);
  const effectiveArea_mm2 = A_selected_raw - corrosionAreaLoss_mm2;

  const isConductorSafe = effectiveArea_mm2 >= A_req_mm2;
  const d_calc_mm = Math.sqrt((4 * A_req_mm2) / Math.PI);
  const d_selected_mm = d_selected_raw * 1000;

  if (!isConductorSafe) {
    warnings.push(
      `Selected conductor effective area (${effectiveArea_mm2.toFixed(1)} mm²) is less than required (${A_req_mm2.toFixed(1)} mm²). Conductor thermal sizing FAILS.`
    );
  }

  // --- STEP 3: Tolerable Touch & Step Potentials ---
  // IEEE 80 Eq. 27: Cs = 1 - (0.09 * (1 - rho/rho_s)) / (2 * Hs + 0.09)
  let Cs = 1.0;
  if (Hs > 0 && rho_s > 0 && rho_s !== rho) {
    Cs = 1 - (0.09 * (1 - rho / rho_s)) / (2 * Hs + 0.09);
    if (input.reproductionMode) {
      // Sheet rounded Cs to 0.743
      Cs = Math.round(Cs * 1000) / 1000;
    }
  }

  // 50 kg person: k50 = 0.116
  const Etouch50 = (1000 + 1.5 * Cs * rho_s) * (0.116 / Math.sqrt(ts));
  const Estep50 = (1000 + 6.0 * Cs * rho_s) * (0.116 / Math.sqrt(ts));

  // 70 kg person: k70 = 0.157
  const Etouch70 = (1000 + 1.5 * Cs * rho_s) * (0.157 / Math.sqrt(ts));
  const Estep70 = (1000 + 6.0 * Cs * rho_s) * (0.157 / Math.sqrt(ts));

  // --- STEP 4: Initial Design Layout ---
  const nA = Math.round(L / D) + 1;
  const nB = Math.round(B / D) + 1;
  const Lc = nA * B + nB * L;
  const LR = input.Neb * Math.max(0, input.Leb);
  const LT = Lc + LR;
  const Lp = 2 * (L + B);
  const A_area = L * B;
  const recommendedPerimeterRods = Math.ceil(Lp / D);

  // --- STEP 5: Grid Resistance (Sverak's Formula, IEEE 80 Eq. 52) ---
  const term1_invLT = 1 / LT;
  const term2_denom = Math.sqrt(20 * A_area);
  const term2_inner = 1 + 1 / (1 + h * Math.sqrt(20 / A_area));
  const term2 = term2_inner / term2_denom;
  const Rg_theoretical = rho * (term1_invLT + term2);

  // If reproduction mode has override:
  const Rg = input.reproductionMode && input.overrideRg !== undefined ? input.overrideRg : Rg_theoretical;
  const isBelowTarget = Rg <= 1.0;

  if (!isBelowTarget) {
    warnings.push(
      `Grid resistance (${Rg.toFixed(3)} Ω) exceeds 1.0 Ω substation target guideline.`
    );
  }

  // --- STEP 6: Determination of Maximum Grid Current (IG) ---
  const Df =
    input.Df_override !== undefined
      ? input.Df_override
      : calculateDf(input.X_over_R ?? 15, input.tf, input.frequency ?? 50);

  const freq = input.frequency ?? 50;
  const tau_s = (input.X_over_R ?? 15) / (2 * Math.PI * freq);

  // Base current for ground fault
  let baseCurrentUsed_A = 0;
  if (input.baseFaultCurrent_A !== undefined) {
    baseCurrentUsed_A = input.baseFaultCurrent_A;
  } else if (input.I_3I0 !== undefined) {
    baseCurrentUsed_A = input.I_3I0 * 1000;
  } else {
    baseCurrentUsed_A = input.IF * 1000;
  }

  const Ig = input.Sf * baseCurrentUsed_A;
  const Cp = input.Cp !== undefined ? input.Cp : 1.0;
  const IG = Cp * Df * Ig;

  // --- STEP 7: Ground Potential Rise (GPR) ---
  const GPR = IG * Rg;
  const isGprBelowEtouch50 = GPR < Etouch50;
  const isGprBelowEtouch70 = GPR < Etouch70;

  // --- STEP 8: Mesh and Step Potentials ---
  // Geometric factors (IEEE 80 Eq. 82-86)
  const na = (2 * Lc) / Lp;
  const nb = Math.sqrt(Lp / (4 * Math.sqrt(A_area))); // 1.0 for square
  const nc = 1.0; // for square/rectangular
  const nd = 1.0;
  const n = na * nb * nc * nd;

  // Grid geometry correction factor Ki
  const Ki = 0.644 + 0.148 * n;

  // Depth factor Kh (IEEE 80 Eq. 84: Kh = sqrt(1 + h/h0), h0 = 1.0 m)
  const Kh = Math.sqrt(1 + h / 1.0);

  // Inner conductor weighting factor Kii
  let Kii: number;
  if (input.overrideKii !== undefined) {
    Kii = input.overrideKii;
  } else if (input.reproductionMode) {
    // Legacy sheet bug: used with-rods factor even when Leb = 0
    Kii = 1 / Math.pow(2 * n, 2 / n);
  } else {
    // Rigorous IEEE 80-2000 rule:
    // If no rods or Leb = 0 => Kii = 1.0
    // If rods present along perimeter and grid area => Kii = 1 / (2n)^(2/n)
    Kii = LR > 0 ? 1 / Math.pow(2 * n, 2 / n) : 1.0;
  }

  // Equivalent diameter d in meters
  const d_m = input.d_override !== undefined ? input.d_override : d_selected_raw;

  // Spacing factor for mesh voltage Km (IEEE 80 Eq. 81)
  let Km: number;
  if (input.overrideKm !== undefined) {
    Km = input.overrideKm;
  } else {
    const termA = Math.pow(D, 2) / (16 * h * d_m);
    const termB = Math.pow(D + 2 * h, 2) / (8 * D * d_m);
    const termC = h / (4 * d_m);
    const ln1 = Math.log(Math.max(0.001, termA + termB - termC));
    const ln2 = Math.log(Math.max(0.0001, 8 / (Math.PI * (2 * n - 1))));
    Km = (1 / (2 * Math.PI)) * (ln1 + (Kii / Kh) * ln2);
  }

  // Spacing factor for step voltage Ks (IEEE 80 Eq. 87)
  const termKs1 = 1 / (2 * h);
  const termKs2 = 1 / (D + h);
  const termKs3 = (1 / D) * (1 - Math.pow(0.5, n - 2));
  let Ks = (1 / Math.PI) * (termKs1 + termKs2 + termKs3);
  if (input.overrideKs !== undefined) {
    Ks = input.overrideKs;
  } else if (input.reproductionMode) {
    // Sheet rounded Ks to 0.406
    Ks = Math.round(Ks * 1000) / 1000;
  }

  // Effective buried conductor lengths
  // For mesh voltage Lm (IEEE 80 Eq. 88-89):
  // Lm = Lc + [1.55 + 1.22 * (Leb / sqrt(L^2 + B^2))] * LR
  const diag = Math.sqrt(Math.pow(L, 2) + Math.pow(B, 2));
  const rodFactor = 1.55 + 1.22 * (Math.max(0, input.Leb) / diag);
  const Lm = Lc + rodFactor * LR;

  // For step voltage Ls (IEEE 80 Eq. 90):
  // Ls = 0.75 * Lc + 0.85 * LR
  const Ls = 0.75 * Lc + 0.85 * LR;

  // Mesh voltage Em & Step voltage Es
  const Em = (rho * Km * Ki * IG) / Lm;
  const Es = (rho * Ks * Ki * IG) / Ls;

  // --- STEP 9: Safety Verdict ---
  const touchSafe50 = Em <= Etouch50;
  const touchSafe70 = Em <= Etouch70;
  const stepSafe50 = Es <= Estep50;
  const stepSafe70 = Es <= Estep70;

  const overallSafe50 = touchSafe50 && stepSafe50 && isConductorSafe;
  const overallSafe70 = touchSafe70 && stepSafe70 && isConductorSafe;

  const touchMargin50 = Etouch50 - Em;
  const touchMargin70 = Etouch70 - Em;
  const stepMargin50 = Estep50 - Es;
  const stepMargin70 = Estep70 - Es;

  if (!touchSafe70) {
    reasons.push(
      `Mesh potential Em (${Em.toFixed(1)} V) exceeds tolerable touch voltage Etouch70 (${Etouch70.toFixed(1)} V) by ${Math.abs(touchMargin70).toFixed(1)} V.`
    );
  }
  if (!stepSafe70) {
    reasons.push(
      `Step potential Es (${Es.toFixed(1)} V) exceeds tolerable step voltage Estep70 (${Estep70.toFixed(1)} V) by ${Math.abs(stepMargin70).toFixed(1)} V.`
    );
  }

  const summaryStatus = overallSafe70 ? 'SAFE' : 'NOT_SAFE';

  // --- Auto-Optimization Suggestions (Step 11) ---
  const recommendations: OptimizationRecommendation[] = [];
  if (!overallSafe70 && !input.skipOptimization) {
    // Strategy 1: Add ground rods (e.g. 40 rods x 3m along perimeter)
    const rods40Input: EarthmatInput = {
      ...input,
      Neb: Math.max(40, recommendedPerimeterRods),
      Leb: 3.0,
      skipOptimization: true,
      reproductionMode: false,
      overrideRg: undefined,
      overrideKm: undefined,
      overrideKii: undefined,
    };
    const rods40Result = calculateEarthmat(rods40Input);
    recommendations.push({
      type: 'ADD_RODS',
      description: `Install ${rods40Input.Neb} ground rods of 3.0 m length around perimeter`,
      parameters: { Neb: rods40Input.Neb, Leb: 3.0 },
      result: {
        Rg: rods40Result.step5.Rg,
        Em: rods40Result.step8.Em,
        Es: rods40Result.step8.Es,
        touchMargin70: rods40Result.verdict.touchMargin70,
        isSafe70: rods40Result.verdict.overallSafe70,
      },
    });

    // Strategy 2: Reduce mesh spacing D (e.g. 7m -> 5m)
    const d5Input: EarthmatInput = {
      ...input,
      D: 5.0,
      skipOptimization: true,
      reproductionMode: false,
      overrideRg: undefined,
      overrideKm: undefined,
      overrideKii: undefined,
    };
    const d5Result = calculateEarthmat(d5Input);
    recommendations.push({
      type: 'REDUCE_SPACING',
      description: `Reduce grid mesh spacing from ${input.D} m to 5.0 m`,
      parameters: { D: 5.0 },
      result: {
        Rg: d5Result.step5.Rg,
        Em: d5Result.step8.Em,
        Es: d5Result.step8.Es,
        touchMargin70: d5Result.verdict.touchMargin70,
        isSafe70: d5Result.verdict.overallSafe70,
      },
    });

    // Strategy 3: Combined (D = 5m + 20 rods x 3m)
    const combinedInput: EarthmatInput = {
      ...input,
      D: 5.0,
      Neb: 20,
      Leb: 3.0,
      skipOptimization: true,
      reproductionMode: false,
      overrideRg: undefined,
      overrideKm: undefined,
      overrideKii: undefined,
    };
    const combinedResult = calculateEarthmat(combinedInput);
    recommendations.push({
      type: 'COMBINED',
      description: `Combined optimization: D = 5.0 m mesh spacing + 20 ground rods of 3.0 m length`,
      parameters: { D: 5.0, Neb: 20, Leb: 3.0 },
      result: {
        Rg: combinedResult.step5.Rg,
        Em: combinedResult.step8.Em,
        Es: combinedResult.step8.Es,
        touchMargin70: combinedResult.verdict.touchMargin70,
        isSafe70: combinedResult.verdict.overallSafe70,
      },
    });
  }

  return {
    inputs: input,
    material: mat,
    step2: {
      K0,
      TCAP,
      Akcmil,
      A_req_mm2,
      A_req_mm2_si,
      A_selected_mm2: A_selected_raw,
      d_calc_mm,
      d_selected_mm,
      isConductorSafe,
      corrosionAreaLoss_mm2,
      effectiveArea_mm2,
    },
    step3: {
      Cs,
      Etouch50,
      Estep50,
      Etouch70,
      Estep70,
    },
    step4: {
      nA,
      nB,
      Lc,
      LR,
      LT,
      Lp,
      A_area,
      recommendedPerimeterRods,
    },
    step5: {
      Rg,
      Rg_theoretical,
      term1_invLT,
      term2_denom,
      term2_inner,
      term2,
      isBelowTarget,
    },
    step6: {
      Df,
      tau_s,
      Ig,
      IG,
      baseCurrentUsed_A,
    },
    step7: {
      GPR,
      isGprBelowEtouch50,
      isGprBelowEtouch70,
    },
    step8: {
      na,
      nb,
      nc,
      nd,
      n,
      Ki,
      Kh,
      Kii,
      Km,
      Ks,
      d_m,
      Lm,
      Ls,
      Em,
      Es,
    },
    verdict: {
      touchSafe50,
      touchSafe70,
      stepSafe50,
      stepSafe70,
      overallSafe50,
      overallSafe70,
      touchMargin50,
      touchMargin70,
      stepMargin50,
      stepMargin70,
      summaryStatus,
      reasons,
      warnings,
    },
    recommendations,
  };
}
