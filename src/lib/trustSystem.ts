// Trust Indicator System for SC Forces results
// Maps each computed value to a confidence level based on engine verification status

export type TrustLevel = 'verified' | 'approximate' | 'unverified';

export interface TrustBadge {
  level: TrustLevel;
  label: string;    // Short label (V, A, U)
  source: string;   // IEC/IS reference
  detail: string;   // Hover tooltip text
  tolerance?: string;
}

// Map SC Forces result keys to their trust levels
// Based on scForcesEngine.ts comments and verification status
export const SC_FORCES_TRUST: Record<string, TrustBadge> = {
  // ── VERIFIED ──
  k: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Eq.19',
    detail: 'Peak factor κ — verified against PDF test case',
    tolerance: '±0.01%',
  },
  Fprime: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Eq.19a',
    detail: 'EM force per unit length — verified',
    tolerance: '±0.02%',
  },
  r: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Eq.20',
    detail: 'Force ratio r = F′/(n·m·g) — verified',
    tolerance: '±0.01%',
  },
  Fst: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Clause 7',
    detail: 'Static tension F_st — direct input × g',
  },
  fes: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Eq.22',
    detail: 'Elastic sag — verified against PDF',
    tolerance: '±0.01%',
  },
  T: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Eq.23',
    detail: 'Oscillation period T — verified',
    tolerance: '±0.02%',
  },
  deltam_deg: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Eq.31',
    detail: 'Max swing-out angle δ_m — verified, continuous at boundaries',
    tolerance: '±0.003°',
  },
  psi: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Eq.35',
    detail: 'Stress factor ψ — bisection solver, verified',
    tolerance: '±1e-8',
  },
  Ftd1: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Eq.34',
    detail: 'Tensile force F_td1 (without dropper) — verified',
    tolerance: '±0.1%',
  },
  Ftd: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Eq.40',
    detail: 'Governing tensile force F_td = max(F_td1, F_td2) — verified',
    tolerance: '±0.1%',
  },
  CD: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Eq.36',
    detail: 'Dynamic sag coefficient C_D — verified',
    tolerance: '±0.1%',
  },

  // ── APPROXIMATE ──
  Ffd: {
    level: 'approximate', label: 'A',
    source: 'IEC 60865-1 Eq.43',
    detail: 'Drop force F_fd — reconstructed from garbled PDF, matches to ~0.3%',
    tolerance: '±0.3%',
  },
  v2: {
    level: 'approximate', label: 'A',
    source: 'IEC 60865-1 Annex A.7, Fig-9',
    detail: 'Bundle force factor v₂ — Annex A.7 analytical, verified vs tabulated',
    tolerance: '±0.12%',
  },
  CF: {
    level: 'approximate', label: 'A',
    source: 'IEC 60865-1 Eq.37',
    detail: 'Force coefficient C_F — piecewise formula, small discontinuity at r=0.8',
  },

  // ── UNVERIFIED ──
  v3: {
    level: 'unverified', label: 'U',
    source: 'IEC 60865-1 Fig-10',
    detail: 'Factor v₃ — power-law fit to digitised Fig-10 data, NOT independently verified',
  },
  eta: {
    level: 'unverified', label: 'U',
    source: 'IEC 60865-1 Fig-12',
    detail: 'Factor η — chart interpolation from Fig-12, NOT independently verified',
  },
  Fpi: {
    level: 'approximate', label: 'A',
    source: 'IEC 60865-1 Eq.61',
    detail: 'Pinch force F_pi — depends on v₃ and η (chart-derived)',
  },

  // Derived
  Fmax: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Clause 7.5',
    detail: 'Governing force F_max = max(F_td, F_fd, F_pi) — verified logic',
  },
  amin: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Eq.46-48',
    detail: 'Min clearance a_min — verified displacement calculation',
  },
  clCheck: {
    level: 'verified', label: 'V',
    source: 'IEC 60865-1 Clause 8',
    detail: 'Clearance check — a_min ≥ 0.5 × cl_ph',
  },
};

// ── Stale Data System ──
export interface ModuleTimestamp {
  lastComputed: number;    // Date.now() when last calculated
  inputHash: string;       // Hash of key linked inputs
}

export function computeInputHash(values: Record<string, number | string>): string {
  return Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
}

export function isStale(upstream: ModuleTimestamp, downstream: ModuleTimestamp): boolean {
  return upstream.lastComputed > downstream.lastComputed;
}
