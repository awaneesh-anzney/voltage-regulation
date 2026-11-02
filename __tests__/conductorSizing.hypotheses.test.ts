/**
 * Client reference sheet (220 kV, AAAC Greeley 470 mm², twin bundle, 1800 A / 50 kA 3 s)
 *
 * IMPORTANT — how to read this file:
 *   [ARITHMETIC]  = pure algebra on printed numbers. Always true.
 *   [HYPOTHESIS]  = a candidate explanation that reproduces a printed number.
 *                   A fit is NOT proof of cause. Several hypotheses can fit the same number.
 *                   Do not promote any of these to engine defaults until the client confirms.
 *
 * Expected values were computed independently (scripts/verify_conductor_sheet.py), not copied from the engine.
 * Section C needs the optional `kelvinOffset` param (see patch note in the chat); on an engine
 * without it, those two tests FAIL with P_rad = 21.378 / Re = 922.08 — that failure is the signal.
 */
import { describe, it, expect } from 'vitest';
import { ConductorSizingEngine } from '../src/lib/conductorSizingEngine';

const PRINTED = { Psol: 14.07, Prad: 21.349, Pconv: 70.462, Rt: 0.0000713 };
const PJ = PRINTED.Prad + PRINTED.Pconv - PRINTED.Psol; // 77.741

const baseAmp = {
  diameter: 0.02814,
  ambientTemp: 30,
  maxTemp: 80,
  windSpeed: 0.6,
  solarRadiation: 1000,
  nSubConductors: 2,
  absorptivity: 0.5,
  emissivity: 0.6,
};

const baseSC = {
  shortCircuitCurrent: 50000,
  duration: 3,
  area: 470,
  nSubConductors: 2,
  k20: 34.8e6,
  c: 910,
  rho: 2700,
  alpha20: 0.0036,
  initialTemp: 80,
  finalTemp: 340,
};

const ampWithR = (R: number) =>
  ConductorSizingEngine.calculateAmpacity({
    ...baseAmp,
    acResistanceAtOperatingTemp: R,
    reproductionOverridePsol: PRINTED.Psol,
    reproductionOverridePrad: PRINTED.Prad,
    reproductionOverridePconv: PRINTED.Pconv,
  });

const K = (over: Partial<typeof baseSC>) =>
  ConductorSizingEngine.calculateSCWithstand({ ...baseSC, ...over }).K_factor;

describe('A. Ampacity — printed numbers', () => {
  it('[ARITHMETIC] printed P values + printed R_T give ~1044.19 A, not 942 A', () => {
    expect(PJ).toBeCloseTo(77.741, 3);
    expect(ampWithR(PRINTED.Rt).I_max_per_conductor).toBeCloseTo(1044.19, 1);
  });

  it('[ARITHMETIC] 942 A needs R ≈ 8.7609e-5 Ω/m = 1.2287 × printed R_T', () => {
    const Rneeded = PJ / 942 ** 2;
    expect(Rneeded).toBeCloseTo(8.7609e-5, 9);
    expect(Rneeded / PRINTED.Rt).toBeCloseTo(1.2287, 3);
  });

  it("[ARITHMETIC] the sheet's OWN printed alpha (3.6E-3) corrected to 80°C gives ~946.9 A, not 942", () => {
    const R80 = PRINTED.Rt * (1 + 0.0036 * 60);
    expect(ampWithR(R80).I_max_per_conductor).toBeCloseTo(946.92, 1);
  });

  it('[HYPOTHESIS] R_T is the 20°C value and alpha ≈ 0.00381 was used -> 942.05 A (alpha is back-solved)', () => {
    const R80 = PRINTED.Rt * (1 + 0.00381 * 60);
    const r = ampWithR(R80);
    expect(r.I_max_per_conductor).toBeCloseTo(942.05, 1);
    expect(Math.round(r.I_max_total)).toBe(1884);
  });
});

describe('B. Short circuit — K factor (printed constants vs printed K = 117.65)', () => {
  it('[ARITHMETIC] printed constants give K ≈ 116.44, not 117.65', () => {
    expect(K({})).toBeCloseTo(116.44, 2);
  });

  // Each single tweak below reproduces 117.65. They cannot all be the cause -> fit != proof.
  it('[HYPOTHESIS 1] K20 = 35.53 MS/m', () => {
    expect(K({ k20: 35.53e6 })).toBeCloseTo(117.65, 2);
  });
  it('[HYPOTHESIS 2] c = 929.04 J/kgK', () => {
    expect(K({ c: 929.04 })).toBeCloseTo(117.65, 2);
  });
  it('[HYPOTHESIS 3] rho = 2756.5 kg/m3', () => {
    expect(K({ rho: 2756.5 })).toBeCloseTo(117.65, 2);
  });
  it('[HYPOTHESIS 4] alpha20 = 0.0034027', () => {
    expect(K({ alpha20: 0.0034027 })).toBeCloseTo(117.65, 2);
  });
  it('[HYPOTHESIS 5] theta_e = 347.18 °C', () => {
    expect(K({ finalTemp: 347.18 })).toBeCloseTo(117.65, 2);
  });
  it('[HYPOTHESIS 6] theta_b = 75.99 °C', () => {
    expect(K({ initialTemp: 75.99 })).toBeCloseTo(117.65, 2);
  });
});

describe('C. Radiation / Reynolds — requires `kelvinOffset` engine param', () => {
  const phys = (kelvinOffset: number) =>
    ConductorSizingEngine.calculateAmpacity({
      ...baseAmp,
      acResistanceAtOperatingTemp: PRINTED.Rt,
      lambdaAir: 0.02585,
      kelvinOffset,
    } as any);

  it('[HYPOTHESIS] T(K) = θ + 273 reproduces BOTH P_rad = 21.349 and Re = 922.83 (two independent numbers)', () => {
    const r = phys(273);
    expect(r.P_rad).toBeCloseTo(21.349, 2);
    expect(r.Re).toBeCloseTo(922.83, 2);
    expect(r.Nu).toBeCloseTo(17.353, 2);
    expect(r.P_conv).toBeCloseTo(70.462, 2);
  });

  it('[ARITHMETIC] physically correct T(K) = θ + 273.15 gives P_rad = 21.378, Re = 922.08', () => {
    const r = phys(273.15);
    expect(r.P_rad).toBeCloseTo(21.378, 2);
    expect(r.Re).toBeCloseTo(922.08, 1);
  });
});

describe('D. S_thr = 70.2106 A/mm²', () => {
  it('[ARITHMETIC] printed K / sqrt(3 s) = 67.93, not 70.21', () => {
    expect(117.65 / Math.sqrt(3)).toBeCloseTo(67.925, 2);
  });

  it('[ARITHMETIC] 70.2106 needs T_kr = 2.808 s with K = 117.65 (inverse of the printed number)', () => {
    expect((117.65 / 70.2106) ** 2).toBeCloseTo(2.8079, 3);
  });

  it('[ARITHMETIC] "66 kA target" theory is inconsistent with the sheet: 66000/940 = 70.2128, but the sheet prints 65,998 A = 70.2106 x 940', () => {
    expect(66000 / 940).toBeCloseTo(70.2128, 3);
    expect(70.2106 * 940).toBeCloseTo(65998, 0);
    expect(66000 / 940).not.toBeCloseTo(70.2106, 3);
  });

  it('[HYPOTHESIS] with T_kr = 2.808 s and K20 = 35.53 MS/m, S_thr = 70.21 and I_sc = 65,998 A', () => {
    const r = ConductorSizingEngine.calculateSCWithstand({ ...baseSC, k20: 35.53e6, duration: 2.808 });
    expect(r.S_thr).toBeCloseTo(70.21, 1);
    expect(Math.abs(r.I_sc_max_total - 65998)).toBeLessThan(5);
  });

  it('[ARITHMETIC] at the printed 3 s, printed constants give I_sc ≈ 63.19 kA (still > 50 kA)', () => {
    const r = ConductorSizingEngine.calculateSCWithstand(baseSC);
    expect(r.I_sc_max_total).toBeGreaterThan(63190);
    expect(r.I_sc_max_total).toBeLessThan(63200);
    expect(r.isSuitable).toBe(true);
  });
});
