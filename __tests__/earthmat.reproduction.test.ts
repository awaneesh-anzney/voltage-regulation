import { describe, it, expect } from 'vitest';
import {
  calculateEarthmat,
  EarthmatInput,
  calculateDf,
  calculateEquivalentDiameter,
} from '../src/lib/earthmatEngine';

describe('Earthmat Engine - Reproduction Mode (Matches PDF Sheet Exactly)', () => {
  // Baseline input matching the 8-page switchyard grounding sheet
  const sheetInput: EarthmatInput = {
    Vs: 33.0,
    Isc: 25.76,
    IF: 6.814,
    tc: 0.5,
    ts: 0.5,
    tf: 0.5,
    L: 70.0,
    B: 70.0,
    rho: 400.0,
    rho_s: 2500.0,
    Hs: 0.102,
    Ta: 40.0,
    materialKey: 'CCS_30', // Sheet used Copper-clad steel constants (alpha_r=0.00378, rho_r=8.62, Tm=1084)
    conductorShape: 'flat',
    conductorWidth: 16.0,
    conductorThickness: 4.0,
    d_override: 0.009, // Sheet used d = 0.009m in Km/Ks formulas
    h: 0.5,
    D: 7.0,
    Neb: 20,
    Leb: 0.0, // Sheet set length to 0m
    Sf: 0.6,
    Df_override: 1.0, // Sheet assumed Df = 1.0
    Cp: 1.0,
    baseFaultCurrent_A: 3180.0, // Sheet hardcoded 3180 A from IEEE 80 Clause 15 example
    reproductionMode: true,
    overrideRg: 3.028, // Sheet printed 3.028 Ω (vs 2.776 Ω theoretical)
    overrideKii: 0.5701, // Sheet used Kii for grid with rods even though Leb=0
    kcmilToMm2Factor: 0.5, // Sheet used 0.5 conversion
    tcapOverride: 3.85,
  };

  const result = calculateEarthmat(sheetInput);

  it('Step 2: Conductor Sizing matches document intermediate and final values', () => {
    // K0 = 1 / alpha_r - 20 = 244.55 °C
    expect(result.step2.K0).toBeCloseTo(244.55, 2);

    // Akcmil = 70.49 kcmil
    expect(result.step2.Akcmil).toBeCloseTo(70.49, 1);

    // A_req_mm2 with 0.5 factor = 35.24 mm²
    expect(result.step2.A_req_mm2).toBeCloseTo(35.24, 2);

    // Selected conductor: 16 x 4 = 64 mm²
    expect(result.step2.A_selected_mm2).toBe(64);

    // Calculated minimum diameter = 6.698 mm
    expect(result.step2.d_calc_mm).toBeCloseTo(6.698, 2);

    // Selected diameter (equivalent) = 9.03 mm
    expect(result.step2.d_selected_mm).toBeCloseTo(9.03, 1);

    // Conductor thermal sizing passes: 64 > 35.24
    expect(result.step2.isConductorSafe).toBe(true);
  });

  it('Step 2 (SI formula): with TCAP = 3.75 matches SI calculation (36.19 mm²)', () => {
    const siInput: EarthmatInput = {
      ...sheetInput,
      tcapOverride: 3.75,
    };
    const siResult = calculateEarthmat(siInput);
    expect(siResult.step2.A_req_mm2_si).toBeCloseTo(36.19, 1);
  });

  it('Step 3: Tolerable Touch and Step Potentials match document exactly', () => {
    // Cs = 0.743
    expect(result.step3.Cs).toBeCloseTo(0.743, 3);

    // 50 kg person: Etouch50 = 621.13 V, Estep50 = 1992.38 V
    expect(result.step3.Etouch50).toBeCloseTo(621.13, 1);
    expect(result.step3.Estep50).toBeCloseTo(1992.38, 1);

    // 70 kg person: Etouch70 = 840.67 V, Estep70 = 2696.58 V
    expect(result.step3.Etouch70).toBeCloseTo(840.67, 1);
    expect(result.step3.Estep70).toBeCloseTo(2696.58, 1);
  });

  it('Step 4: Grid Layout geometry matches document (nA=11, nB=11, Lc=1540m, LR=0m)', () => {
    expect(result.step4.nA).toBe(11);
    expect(result.step4.nB).toBe(11);
    expect(result.step4.Lc).toBe(1540);
    expect(result.step4.LR).toBe(0);
    expect(result.step4.LT).toBe(1540);
    expect(result.step4.Lp).toBe(280);
    expect(result.step4.A_area).toBe(4900);
  });

  it('Step 5: Grid Resistance reproduces sheet printed value (3.028 Ω) and calculates theoretical (2.776 Ω)', () => {
    // Sheet printed override
    expect(result.step5.Rg).toBe(3.028);

    // Theoretical Sverak formula result
    expect(result.step5.Rg_theoretical).toBeCloseTo(2.776, 2);

    // Grid resistance warning flag triggered (> 1.0 Ω)
    expect(result.step5.isBelowTarget).toBe(false);
  });

  it('Step 6 & 7: Grid Current IG = 1908 A and GPR = 5777 V match document', () => {
    expect(result.step6.Ig).toBe(1908);
    expect(result.step6.IG).toBe(1908);

    // GPR = IG * Rg = 1908 * 3.028 = 5777.42 V (sheet printed 5777 V)
    expect(result.step7.GPR).toBeCloseTo(5777.4, 0);

    // GPR > Etouch
    expect(result.step7.isGprBelowEtouch50).toBe(false);
    expect(result.step7.isGprBelowEtouch70).toBe(false);
  });

  it('Step 8: Geometric Factors match document (n=11, Ki=2.272, Kh=1.225, Kii=0.5701)', () => {
    expect(result.step8.n).toBe(11);
    expect(result.step8.Ki).toBeCloseTo(2.272, 3);
    expect(result.step8.Kh).toBeCloseTo(1.225, 3);
    expect(result.step8.Kii).toBeCloseTo(0.5701, 3);
    expect(result.step8.Km).toBeCloseTo(0.906, 2);
    expect(result.step8.Ks).toBeCloseTo(0.406, 2);
  });

  it('Step 8: Effective lengths and calculated potentials match document (Em=1020.6 V, Es=609.5 V)', () => {
    expect(result.step8.Lm).toBe(1540);
    expect(result.step8.Ls).toBe(1155);

    // Em = 1020.6 V (sheet shows 1020.6 V / 1020.58 V)
    expect(result.step8.Em).toBeCloseTo(1020.6, 0);

    // Es = 609.53 V (sheet shows 609.53 V)
    expect(result.step8.Es).toBeCloseTo(609.53, 1);
  });

  it('Step 9: Safety Verdict accurately catches Touch Unsafe and Step Safe', () => {
    // Touch potential (1020.6 V) exceeds tolerable limit (840.67 V)
    expect(result.verdict.touchSafe70).toBe(false);
    expect(result.verdict.touchMargin70).toBeLessThan(0);

    // Step potential (609.53 V) is well below tolerable limit (2696.58 V)
    expect(result.verdict.stepSafe70).toBe(true);
    expect(result.verdict.stepMargin70).toBeGreaterThan(0);

    // Overall summary status is NOT_SAFE
    expect(result.verdict.summaryStatus).toBe('NOT_SAFE');
    expect(result.verdict.overallSafe70).toBe(false);

    // Reasons array contains informative failure message
    expect(result.verdict.reasons[0]).toContain('exceeds tolerable touch voltage');
  });

  it('Step 11: Auto-optimizer suggests viable mitigations to achieve SAFE design', () => {
    expect(result.recommendations).toBeDefined();
    expect(result.recommendations!.length).toBeGreaterThan(0);

    // Strategy 1: Add ground rods
    const rodsOpt = result.recommendations!.find((r) => r.type === 'ADD_RODS');
    expect(rodsOpt).toBeDefined();

    // Strategy 2: Reduce spacing
    const spacingOpt = result.recommendations!.find((r) => r.type === 'REDUCE_SPACING');
    expect(spacingOpt).toBeDefined();
    expect(spacingOpt!.result.isSafe70).toBe(true);

    // Strategy 3: Combined
    const combinedOpt = result.recommendations!.find((r) => r.type === 'COMBINED');
    expect(combinedOpt).toBeDefined();
    expect(combinedOpt!.result.isSafe70).toBe(true);
  });
});
