import { describe, it, expect } from 'vitest';
import {
  calculateEarthmat,
  EarthmatInput,
  calculateDf,
  calculateEquivalentDiameter,
  MATERIAL_DB,
} from '../src/lib/earthmatEngine';

describe('Earthmat Engine - Multi-Condition Stress Testing & IEEE 80 Validation', () => {
  // --------------------------------------------------------------------------
  // Condition 1: IEEE Std 80-2000 Annex B Benchmark (Clause B.1 / B.2)
  // --------------------------------------------------------------------------
  it('Condition 1: IEEE 80-2000 Annex B standard worked example (70m x 70m grid)', () => {
    // Exact benchmark parameters from IEEE 80-2000 Annex B:
    const annexBInput: EarthmatInput = {
      Vs: 115.0,
      Isc: 25.0,
      IF: 3.18, // 3180 A symmetrical grid current
      tc: 0.5,
      ts: 0.5,
      tf: 0.5,
      L: 70.0,
      B: 70.0,
      rho: 400.0,
      rho_s: 2500.0,
      Hs: 0.102,
      Ta: 40.0,
      materialKey: 'CCS_30',
      conductorShape: 'round',
      conductorDiameter: 10.0, // 0.01m conductor
      h: 0.5,
      D: 7.0,
      Neb: 0,
      Leb: 0.0,
      Sf: 0.6,
      baseFaultCurrent_A: 3180.0,
      Df_override: 1.0,
      Cp: 1.0,
      reproductionMode: false,
    };

    const result = calculateEarthmat(annexBInput);

    // IEEE 80 Annex B theoretical grid resistance is approx 2.78 Ω:
    expect(result.step5.Rg_theoretical).toBeCloseTo(2.776, 2);

    // Cs is approx 0.74:
    expect(result.step3.Cs).toBeCloseTo(0.743, 2);

    // Tolerable touch voltages for 50kg and 70kg:
    expect(result.step3.Etouch50).toBeCloseTo(621.0, 0);
    expect(result.step3.Etouch70).toBeCloseTo(840.5, 0);

    // Number of parallel conductors: nA = 11, nB = 11, Lc = 1540m
    expect(result.step4.nA).toBe(11);
    expect(result.step4.Lc).toBe(1540);

    // Grid current IG = 1908 A:
    expect(result.step6.IG).toBe(1908);
  });

  // --------------------------------------------------------------------------
  // Condition 2: EHV 400 kV / 765 kV Large Transmission Substation
  // --------------------------------------------------------------------------
  it('Condition 2: EHV 400 kV Substation (250m x 200m, 50 kA fault for 1.0s)', () => {
    const ehvInput: EarthmatInput = {
      Vs: 400.0,
      Isc: 50.0,
      IF: 50.0,
      I_3I0: 40.0,
      tc: 1.0,
      ts: 0.5,
      tf: 0.5,
      L: 250.0,
      B: 200.0,
      rho: 120.0,
      rho_s: 3000.0,
      Hs: 0.15,
      Ta: 45.0,
      materialKey: 'STEEL_1020',
      conductorShape: 'round',
      conductorDiameter: 32.0, // 32mm MS Rod
      h: 0.8,
      D: 10.0,
      Neb: 80,
      Leb: 3.0,
      Sf: 0.7,
      X_over_R: 20,
      Cp: 1.1,
      reproductionMode: false,
    };

    const result = calculateEarthmat(ehvInput);

    // 1. Grid Area: 250 * 200 = 50,000 m²
    expect(result.step4.A_area).toBe(50000);

    // 2. Large grid resistance should be very low (typically < 0.3 Ω):
    expect(result.step5.Rg).toBeLessThan(0.35);

    // 3. Thermal sizing for 32mm MS rod (area = 804 mm²):
    expect(result.step2.A_selected_mm2).toBeCloseTo(804.2, 0);
    // At 50 kA for 1s, Steel 1020 requires ~400-500 mm² => 804 mm² is safe
    expect(result.step2.isConductorSafe).toBe(true);

    // 4. Step voltage should be completely safe:
    expect(result.verdict.stepSafe70).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Condition 3: Compact 33/11 kV Distribution Substation (Small Area)
  // --------------------------------------------------------------------------
  it('Condition 3: Compact Distribution Substation (30m x 20m, 13.1 kA for 0.5s)', () => {
    const compactInput: EarthmatInput = {
      Vs: 33.0,
      Isc: 13.1,
      IF: 13.1,
      I_3I0: 10.0,
      tc: 0.5,
      ts: 0.5,
      tf: 0.5,
      L: 30.0,
      B: 20.0,
      rho: 150.0,
      rho_s: 2500.0,
      Hs: 0.1,
      Ta: 35.0,
      materialKey: 'COPPER_ANNEALED',
      conductorShape: 'flat',
      conductorWidth: 25.0,
      conductorThickness: 3.0, // 25x3 mm Copper strip (75 mm²)
      h: 0.6,
      D: 5.0,
      Neb: 12,
      Leb: 3.0,
      Sf: 0.5,
      X_over_R: 10,
      reproductionMode: false,
    };

    const result = calculateEarthmat(compactInput);

    // Area: 600 m²
    expect(result.step4.A_area).toBe(600);

    // In a small area, grid resistance is higher (around 2 to 3.5 Ω):
    expect(result.step5.Rg).toBeGreaterThan(1.5);
    expect(result.step5.Rg).toBeLessThan(4.5);

    // Copper sizing: at 13.1 kA for 0.5s, annealed copper needs ~40 mm² => 75 mm² is SAFE
    expect(result.step2.isConductorSafe).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Condition 4: High Resistivity Rocky Terrain (Himalayan / Desert soil)
  // --------------------------------------------------------------------------
  it('Condition 4: High Resistivity Rocky Soil (rho = 2000 Ω·m)', () => {
    const rockyInput: EarthmatInput = {
      Vs: 132.0,
      Isc: 31.5,
      IF: 10.0,
      I_3I0: 10.0,
      tc: 0.5,
      ts: 0.5,
      tf: 0.5,
      L: 80.0,
      B: 80.0,
      rho: 2000.0, // High soil resistivity
      rho_s: 3000.0,
      Hs: 0.15,
      Ta: 35.0,
      materialKey: 'CCS_30',
      conductorShape: 'flat',
      conductorWidth: 25.0,
      conductorThickness: 6.0,
      h: 0.5,
      D: 8.0,
      Neb: 0,
      Leb: 0.0,
      Sf: 0.7,
      reproductionMode: false,
    };

    const result = calculateEarthmat(rockyInput);

    // High soil resistivity causes high Rg (> 8 Ω)
    expect(result.step5.Rg).toBeGreaterThan(8.0);

    // GPR and touch potential will exceed limits => NOT_SAFE
    expect(result.verdict.summaryStatus).toBe('NOT_SAFE');
    expect(result.verdict.touchSafe70).toBe(false);

    // Auto-optimizer should trigger with actionable mitigations:
    expect(result.recommendations).toBeDefined();
    expect(result.recommendations!.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // Condition 5: Very Low Resistivity Soil (Coastal / Marshy ground)
  // --------------------------------------------------------------------------
  it('Condition 5: Low Resistivity Coastal Soil (rho = 15 Ω·m)', () => {
    const coastalInput: EarthmatInput = {
      Vs: 66.0,
      Isc: 25.0,
      IF: 15.0,
      tc: 0.5,
      ts: 0.5,
      tf: 0.5,
      L: 70.0,
      B: 70.0,
      rho: 15.0, // Saline / coastal soil
      rho_s: 2500.0,
      Hs: 0.102,
      Ta: 30.0,
      materialKey: 'COPPER_ANNEALED',
      conductorShape: 'round',
      conductorDiameter: 16.0,
      h: 0.5,
      D: 7.0,
      Neb: 20,
      Leb: 3.0,
      Sf: 0.6,
      reproductionMode: false,
    };

    const result = calculateEarthmat(coastalInput);

    // Grid resistance will be extremely low (< 0.15 Ω):
    expect(result.step5.Rg).toBeLessThan(0.15);

    // Touch and Step potentials are tiny, well within safety margins:
    expect(result.verdict.touchSafe50).toBe(true);
    expect(result.verdict.touchSafe70).toBe(true);
    expect(result.verdict.stepSafe50).toBe(true);
    expect(result.verdict.stepSafe70).toBe(true);
    expect(result.verdict.overallSafe70).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Condition 6: No Crushed Rock Layer (Hs = 0, Native Soil Surface)
  // --------------------------------------------------------------------------
  it('Condition 6: No Crushed Rock Layer (Hs = 0, Cs = 1.0)', () => {
    const unpavedInput: EarthmatInput = {
      Vs: 33.0,
      Isc: 20.0,
      IF: 10.0,
      tc: 0.5,
      ts: 0.5,
      tf: 0.5,
      L: 60.0,
      B: 60.0,
      rho: 300.0,
      rho_s: 300.0,
      Hs: 0.0, // No gravel surfacing
      Ta: 40.0,
      materialKey: 'CCS_30',
      conductorShape: 'round',
      conductorDiameter: 12.0,
      h: 0.5,
      D: 6.0,
      Neb: 16,
      Leb: 3.0,
      Sf: 0.6,
      reproductionMode: false,
    };

    const result = calculateEarthmat(unpavedInput);

    // When Hs = 0, Cs must be exactly 1.0:
    expect(result.step3.Cs).toBe(1.0);

    // Without high-resistivity gravel (rho_s = 2500), tolerable touch potential is much lower:
    // Etouch70 = (1000 + 1.5 * 1.0 * 300) * 0.157 / sqrt(0.5) = 1450 * 0.222 = 321.9 V
    expect(result.step3.Etouch70).toBeCloseTo(321.9, 0);

    // Engine should emit a warning about unpaved surface:
    expect(result.verdict.warnings.some((w) => w.includes('Hs is 0'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Condition 7: Thick Gravel Surfacing (Hs = 0.25m, High Resistivity)
  // --------------------------------------------------------------------------
  it('Condition 7: Thick Crushed Rock Layer (Hs = 0.25m, rho_s = 4000 Ω·m)', () => {
    const thickGravelInput: EarthmatInput = {
      Vs: 132.0,
      Isc: 31.5,
      IF: 10.0,
      tc: 0.5,
      ts: 0.5,
      tf: 0.5,
      L: 70.0,
      B: 70.0,
      rho: 400.0,
      rho_s: 4000.0,
      Hs: 0.25, // 250mm thick gravel
      Ta: 40.0,
      materialKey: 'CCS_30',
      conductorShape: 'flat',
      conductorWidth: 25.0,
      conductorThickness: 6.0,
      h: 0.5,
      D: 7.0,
      Neb: 20,
      Leb: 3.0,
      Sf: 0.6,
      reproductionMode: false,
    };

    const result = calculateEarthmat(thickGravelInput);

    // With thicker gravel, Cs improves (closer to 1.0) and Etouch increases significantly:
    // 2 * Hs + 0.09 = 2 * 0.25 + 0.09 = 0.59
    // Cs = 1 - 0.09 * (1 - 400/4000) / 0.59 = 1 - 0.081 / 0.59 = 0.8627
    expect(result.step3.Cs).toBeCloseTo(0.863, 2);

    // Etouch70 = (1000 + 1.5 * 0.863 * 4000) * 0.222 = (1000 + 5178) * 0.222 ≈ 1371 V
    expect(result.step3.Etouch70).toBeGreaterThan(1300);
  });

  // --------------------------------------------------------------------------
  // Condition 8: High Aspect Ratio Rectangular Substation (150m x 50m, 3:1)
  // --------------------------------------------------------------------------
  it('Condition 8: High Aspect Ratio Rectangular Grid (150m x 50m, Aspect Ratio 3:1)', () => {
    const rectInput: EarthmatInput = {
      Vs: 220.0,
      Isc: 40.0,
      IF: 15.0,
      tc: 0.5,
      ts: 0.5,
      tf: 0.5,
      L: 150.0,
      B: 50.0,
      rho: 200.0,
      rho_s: 2500.0,
      Hs: 0.102,
      Ta: 40.0,
      materialKey: 'CCS_30',
      conductorShape: 'flat',
      conductorWidth: 25.0,
      conductorThickness: 6.0,
      h: 0.6,
      D: 5.0,
      Neb: 30,
      Leb: 3.0,
      Sf: 0.6,
      reproductionMode: false,
    };

    const result = calculateEarthmat(rectInput);

    // nA = 150/5 + 1 = 31, nB = 50/5 + 1 = 11
    expect(result.step4.nA).toBe(31);
    expect(result.step4.nB).toBe(11);

    // Lc = (31 * 50) + (11 * 150) = 1550 + 1650 = 3200 m
    expect(result.step4.Lc).toBe(3200);

    // Lp = 2 * (150 + 50) = 400 m
    expect(result.step4.Lp).toBe(400);

    // Geometric factor nb for rectangular grid:
    // nb = sqrt(Lp / (4 * sqrt(A))) = sqrt(400 / (4 * sqrt(7500))) = sqrt(400 / 346.41) = sqrt(1.1547) ≈ 1.074
    expect(result.step8.nb).toBeGreaterThan(1.0);
    expect(result.step8.nb).toBeCloseTo(1.075, 2);
  });

  // --------------------------------------------------------------------------
  // Condition 9: Thermal Sizing of All Table 1 Materials
  // --------------------------------------------------------------------------
  it('Condition 9: Thermal sizing comparison across all IEEE 80 Table 1 materials', () => {
    const testCurrent = 20.0; // 20 kA
    const testDuration = 1.0; // 1.0 second

    const materials: (keyof typeof MATERIAL_DB)[] = [
      'COPPER_ANNEALED',
      'COPPER_HARD',
      'CCS_40',
      'CCS_30',
      'STEEL_1020',
      'ZINC_COATED_STEEL',
      'STAINLESS_STEEL_304',
    ];

    const areas: Record<string, number> = {};

    materials.forEach((matKey) => {
      const res = calculateEarthmat({
        Vs: 132.0,
        Isc: 20.0,
        IF: testCurrent,
        tc: testDuration,
        ts: 0.5,
        tf: 0.5,
        L: 70.0,
        B: 70.0,
        rho: 100.0,
        rho_s: 2500.0,
        Hs: 0.1,
        Ta: 40.0,
        materialKey: matKey,
        conductorShape: 'round',
        conductorDiameter: 25.0,
        h: 0.5,
        D: 7.0,
        Neb: 0,
        Leb: 0.0,
        Sf: 0.6,
        reproductionMode: false,
      });

      areas[matKey] = res.step2.A_req_mm2;
    });

    // 1. Annealed Copper requires the lowest cross section (~90-110 mm²):
    expect(areas.COPPER_ANNEALED).toBeLessThan(120);

    // 2. Copper-clad steel requires more area than pure copper:
    expect(areas.CCS_30).toBeGreaterThan(areas.COPPER_ANNEALED);

    // 3. Steel 1020 requires ~180-220 mm²:
    expect(areas.STEEL_1020).toBeGreaterThan(areas.CCS_30);

    // 4. Zinc-coated steel has lowest Tm (419°C), so it requires the largest area (~293 mm²):
    expect(areas.ZINC_COATED_STEEL).toBeGreaterThan(areas.STEEL_1020);
    expect(areas.ZINC_COATED_STEEL).toBeGreaterThan(280);
    expect(areas.ZINC_COATED_STEEL).toBeCloseTo(293.4, 0);
  });

  // --------------------------------------------------------------------------
  // Condition 10: Fault Duration Sensitivity (tc = 0.1s to 3.0s)
  // --------------------------------------------------------------------------
  it('Condition 10: Fault duration scaling obeys sqrt(tc)', () => {
    const calcForDuration = (tc: number) => {
      return calculateEarthmat({
        Vs: 132.0,
        Isc: 20.0,
        IF: 20.0,
        tc,
        ts: 0.5,
        tf: 0.5,
        L: 70.0,
        B: 70.0,
        rho: 100.0,
        rho_s: 2500.0,
        Hs: 0.1,
        Ta: 40.0,
        materialKey: 'CCS_30',
        conductorShape: 'round',
        conductorDiameter: 20.0,
        h: 0.5,
        D: 7.0,
        Neb: 0,
        Leb: 0.0,
        Sf: 0.6,
        reproductionMode: false,
      }).step2.A_req_mm2;
    };

    const a025 = calcForDuration(0.25);
    const a100 = calcForDuration(1.0);

    // Sizing formula has sqrt(tc) in numerator of A_req:
    // Ratio of A_req(1.0s) / A_req(0.25s) should be sqrt(1.0 / 0.25) = 2.0
    const ratio = a100 / a025;
    expect(ratio).toBeCloseTo(2.0, 2);
  });

  // --------------------------------------------------------------------------
  // Condition 11: Decrement Factor Df Monotonicity & Range
  // --------------------------------------------------------------------------
  it('Condition 11: Decrement factor Df increases monotonically with X/R and remains >= 1.0', () => {
    const df_5 = calculateDf(5, 0.5, 50);
    const df_15 = calculateDf(15, 0.5, 50);
    const df_30 = calculateDf(30, 0.5, 50);
    const df_50 = calculateDf(50, 0.5, 50);

    expect(df_5).toBeGreaterThanOrEqual(1.0);
    expect(df_15).toBeGreaterThan(df_5);
    expect(df_30).toBeGreaterThan(df_15);
    expect(df_50).toBeGreaterThan(df_30);
  });

  // --------------------------------------------------------------------------
  // Condition 12: Extreme Edge & Boundary Safeguards (Zero, Negative, Clamped)
  // --------------------------------------------------------------------------
  it('Condition 12: Robustness against boundary & edge conditions (no NaN or crash)', () => {
    // Calling with extreme zero / clamped parameters
    const boundaryResult = calculateEarthmat({
      Vs: 0,
      Isc: 0,
      IF: 0,
      tc: 0,
      ts: 0,
      tf: 0,
      L: 0,
      B: 0,
      rho: 0,
      rho_s: 0,
      Hs: 0,
      Ta: 0,
      materialKey: 'COPPER_ANNEALED',
      conductorShape: 'round',
      conductorDiameter: 0,
      h: 0,
      D: 0,
      Neb: 0,
      Leb: 0,
      Sf: 0,
    });

    // Should not crash, and outputs must be finite valid numbers:
    expect(Number.isFinite(boundaryResult.step5.Rg)).toBe(true);
    expect(Number.isFinite(boundaryResult.step8.Em)).toBe(true);
    expect(Number.isFinite(boundaryResult.step8.Es)).toBe(true);
    expect(Number.isFinite(boundaryResult.step3.Etouch70)).toBe(true);
    expect(boundaryResult.verdict.summaryStatus).toBeDefined();
  });
});
