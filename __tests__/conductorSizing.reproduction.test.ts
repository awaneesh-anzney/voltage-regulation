import { describe, it, expect } from 'vitest';
import { ConductorSizingEngine, MATERIAL_PROPERTIES } from '../src/lib/conductorSizingEngine';

describe('Conductor Sizing Engine - Reproduction and Physics Baselines', () => {
  it('should match document intermediate powers with printed overrides in reproduction mode', () => {
    const reproResult = ConductorSizingEngine.calculateAmpacity({
      acResistanceAtOperatingTemp: 0.0000713,
      diameter: 0.02814,
      ambientTemp: 30,
      maxTemp: 80,
      windSpeed: 0.6,
      solarRadiation: 1000,
      nSubConductors: 2,
      reproductionOverridePsol: 14.07,
      reproductionOverridePrad: 21.349,
      reproductionOverridePconv: 70.462
    });

    expect(reproResult.P_sol).toBeCloseTo(14.07, 2);
    expect(reproResult.P_rad).toBeCloseTo(21.349, 2);
    expect(reproResult.P_conv).toBeCloseTo(70.462, 2);
    // Note: With printed R_T = 0.0000713 used directly, arithmetic gives 1044.19 A
    expect(reproResult.I_max_per_conductor).toBeCloseTo(1044.19, 1);
  });

  it('should compute physics using the sheet\'s printed formulas (film-temp lambda, 273.15 K offset)', () => {
    const physResult = ConductorSizingEngine.calculateAmpacity({
      acResistanceAtOperatingTemp: 0.0000713,
      diameter: 0.02814,
      ambientTemp: 30,
      maxTemp: 80,
      windSpeed: 0.6,
      solarRadiation: 1000,
      nSubConductors: 2,
      absorptivity: 0.5,
      emissivity: 0.6,
      // default kelvinOffset is 273.15
    });

    expect(physResult.P_sol).toBeCloseTo(14.07, 2);
    expect(physResult.P_rad).toBeCloseTo(21.378, 2); // 21.378 with 273.15K offset
    expect(physResult.Re).toBeCloseTo(922.08, 1);   // 922.08 with 273.15K offset
    expect(physResult.Nu).toBeCloseTo(17.35, 2);
    
    // Correction #3: Air thermal conductivity evaluated at ambient temp (30°C) → lambda ≈ 0.02636 W/m.K
    // P_conv = Nu × lambda × π × ΔT ≈ 17.35 × 0.02636 × π × 50 ≈ 71.9 W/m
    expect(physResult.P_conv).toBeCloseTo(71.9, 0);
  });

  it('should match document P_rad = 21.349 and Re = 922.83 when kelvinOffset is set to 273', () => {
    const physResultOffset273 = ConductorSizingEngine.calculateAmpacity({
      acResistanceAtOperatingTemp: 0.0000713,
      diameter: 0.02814,
      ambientTemp: 30,
      maxTemp: 80,
      windSpeed: 0.6,
      solarRadiation: 1000,
      nSubConductors: 2,
      absorptivity: 0.5,
      emissivity: 0.6,
      kelvinOffset: 273 // Document integer convention
    });

    expect(physResultOffset273.P_rad).toBeCloseTo(21.349, 2); // Exact match with document 21.349
    expect(physResultOffset273.Re).toBeCloseTo(922.83, 1);   // Exact match with document 922.83
    expect(physResultOffset273.Nu).toBeCloseTo(17.35, 2);
  });

  it('should match document P_conv when overriding lambdaAir to 0.02585 and kelvinOffset to 273', () => {
    const physResultLambdaOverride = ConductorSizingEngine.calculateAmpacity({
      acResistanceAtOperatingTemp: 0.0000713,
      diameter: 0.02814,
      ambientTemp: 30,
      maxTemp: 80,
      windSpeed: 0.6,
      solarRadiation: 1000,
      nSubConductors: 2,
      absorptivity: 0.5,
      emissivity: 0.6,
      lambdaAir: 0.02585,
      kelvinOffset: 273
    });

    expect(physResultLambdaOverride.Re).toBeCloseTo(922.83, 1);
    expect(physResultLambdaOverride.Nu).toBeCloseTo(17.35, 2);
    // 17.35295 * 0.02585 * pi * 50 = 70.462
    expect(physResultLambdaOverride.P_conv).toBeCloseTo(70.46, 2);
  });
  
  it('should calculate SC Withstand with printed material properties (yielding baseline K=116.44, S_thr=67.23)', () => {
    const scResult = ConductorSizingEngine.calculateSCWithstand({
      shortCircuitCurrent: 50000,
      duration: 3,
      area: 470,
      nSubConductors: 2,
      k20: MATERIAL_PROPERTIES['AAAC'].k20, // 34.8e6 (printed input)
      c: MATERIAL_PROPERTIES['AAAC'].c,
      rho: MATERIAL_PROPERTIES['AAAC'].rho,
      alpha20: MATERIAL_PROPERTIES['AAAC'].alpha20, // 0.0036 (printed input)
      initialTemp: 80,
      finalTemp: 340
    });
    
    // Pure arithmetic from printed inputs:
    expect(scResult.K_factor).toBeCloseTo(116.44, 2);
    expect(scResult.S_thr).toBeCloseTo(67.23, 2); // 116.44 / sqrt(3) = 67.23
    
    // Total withstand current: 67.227 * 470 * 2 ≈ 63.2 kA (> 50 kA required, PASS)
    expect(scResult.I_sc_max_total).toBeGreaterThan(63190);
    expect(scResult.I_sc_max_total).toBeLessThan(63200);
    expect(scResult.isSuitable).toBe(true);
  });
});
