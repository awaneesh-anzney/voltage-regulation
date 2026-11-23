import { describe, it, expect } from 'vitest';
import {
  calculateEarthmat,
  EarthmatInput,
  calculateDf,
  calculateEquivalentDiameter,
  MATERIAL_DB,
} from '../src/lib/earthmatEngine';

describe('Earthmat Engine - Technical Audit & Physics Reconciliation', () => {
  const baseInput: EarthmatInput = {
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
    materialKey: 'CCS_30',
    conductorShape: 'flat',
    conductorWidth: 16.0,
    conductorThickness: 4.0,
    h: 0.5,
    D: 7.0,
    Neb: 20,
    Leb: 0.0,
    Sf: 0.6,
    baseFaultCurrent_A: 3180.0, // Sheet's 1908 A grid current baseline
    Df_override: 1.0,
    Cp: 1.0,
  };

  it('Audit Discrepancy #1: Sverak formula Rg is 2.776 Ω (Sheet showed 3.028 Ω, +9.1% error)', () => {
    const result = calculateEarthmat({ ...baseInput, reproductionMode: false });
    expect(result.step5.Rg).toBeCloseTo(2.776, 2);
    expect(result.step5.Rg_theoretical).toBeCloseTo(2.776, 2);

    // With Rg = 2.776 Ω and IG = 1908 A, GPR should be 1908 * 2.7757 = 5296 V (not 5777 V)
    const gprRigorous = 1908 * result.step5.Rg;
    expect(gprRigorous).toBeCloseTo(5296, 0);
  });

  it('Audit Discrepancy #2: Kii effect and rod presence on Km formula', () => {
    // When Leb = 0, rigorous IEEE 80 Eq. 85 says Kii = 1.0
    const resultRigorous = calculateEarthmat({ ...baseInput, reproductionMode: false });
    expect(resultRigorous.step8.Kii).toBe(1.0);

    // Because the second term in Km has ln(8 / (pi * (2n - 1))) which is negative,
    // Kii = 1.0 makes this negative term larger, resulting in Km ≈ 0.788
    expect(resultRigorous.step8.Km).toBeCloseTo(0.788, 3);

    // Whereas the sheet mistakenly used Kii = 0.5701 (rods formula), which made Km = 0.906 (+15% higher)
    const resultWithRodsKii = calculateEarthmat({
      ...baseInput,
      overrideKii: 0.5701,
      reproductionMode: true,
    });
    expect(resultWithRodsKii.step8.Km).toBeCloseTo(0.906, 3);
  });

  it('Audit Discrepancy #3: Zinc-coated steel / GI flat material requires larger area due to Tm = 419°C', () => {
    // If the 16x4 mm GI flat is evaluated using true Zinc-Coated Steel properties (Tm = 419°C):
    const giResult = calculateEarthmat({
      ...baseInput,
      materialKey: 'ZINC_COATED_STEEL',
      reproductionMode: false,
    });

    // Required area jumps to ~70.7 mm² (with 0.5067 factor)
    expect(giResult.step2.A_req_mm2).toBeGreaterThan(64);
    // 64 mm² selected flat strip fails thermal withstand check!
    expect(giResult.step2.isConductorSafe).toBe(false);
    expect(giResult.verdict.warnings.some((w) => w.includes('FAILS'))).toBe(true);
  });

  it('Audit Discrepancy #4: Conductor sizing with 3-phase fault Isc = 25.76 kA', () => {
    // If client specified Isc = 25.76 kA as sizing basis:
    const scSizingResult = calculateEarthmat({
      ...baseInput,
      IF: 25.76, // Sizing on full Isc
    });

    // Required area is proportional to IF: 35.24 * (25.76 / 6.814) ≈ 133 to 137 mm²
    expect(scSizingResult.step2.A_req_mm2).toBeGreaterThan(130);
    // 16x4 (64 mm²) is inadequate; would require at least 25x6 mm (150 mm²) or 32x6 mm
    expect(scSizingResult.step2.isConductorSafe).toBe(false);
  });

  it('Audit Discrepancy #5: Decrement factor Df calculation from X/R = 15 and tf = 0.5 s', () => {
    // tau = (X/R) / (2 * pi * f) = 15 / (2 * pi * 50) = 0.047746 s
    // Df = sqrt(1 + (tau / tf) * (1 - exp(-tf / tau)))
    const dfCalc = calculateDf(15, 0.5, 50);
    expect(dfCalc).toBeGreaterThan(1.0);
    expect(dfCalc).toBeLessThan(1.1); // typically ~1.046 for X/R=15, tf=0.5s
  });

  it('Audit Discrepancy #6: Equivalent circular diameter for 16x4 mm flat strip is 9.03 mm', () => {
    const deq = calculateEquivalentDiameter(16, 4);
    expect(deq * 1000).toBeCloseTo(9.027, 2);
  });

  it('Audit Mitigation: Adding perimeter ground rods reduces Em (requires >= 70 rods of 3m to be safe alone)', () => {
    // 40 rods of 3m reduces Em from 1020.6V down to ~908V (significant reduction, but still slightly above 840.67V)
    const rods40Result = calculateEarthmat({
      ...baseInput,
      Neb: 40,
      Leb: 3.0,
      reproductionMode: false,
    });
    expect(rods40Result.step4.LR).toBe(120);
    expect(rods40Result.step8.Em).toBeCloseTo(908, 0);
    expect(rods40Result.step8.Em).toBeLessThan(1020.6);

    // With 75 rods of 3m (or combined spacing), Em drops below 840.67 V to achieve full safety:
    const rods75Result = calculateEarthmat({
      ...baseInput,
      Neb: 75,
      Leb: 3.0,
      reproductionMode: false,
    });
    expect(rods75Result.step8.Em).toBeLessThan(rods75Result.step3.Etouch70);
    expect(rods75Result.verdict.touchSafe70).toBe(true);
  });

  it('Audit Mitigation: Reducing mesh spacing D from 7m to 5m achieves safe touch voltage without rods', () => {
    // With d = 0.01m and Kii = 0.5701 override (matching user Python sensitivity table 5.B):
    const spacingWithKii = calculateEarthmat({
      ...baseInput,
      D: 5.0,
      d_override: 0.01,
      overrideKii: 0.5701,
      reproductionMode: true,
    });
    // Matches user Python sweep table: D = 5m -> Em ≈ 797–801 V vs Etouch70 = 840.67 V
    expect(spacingWithKii.step8.Em).toBeCloseTo(800.8, 1);
    expect(spacingWithKii.verdict.touchSafe70).toBe(true);

    // With actual 16x4mm strip equivalent diameter (d_eq = 9.03mm):
    const spacingWithStrip = calculateEarthmat({
      ...baseInput,
      D: 5.0,
      overrideKii: 0.5701,
      reproductionMode: true,
    });
    expect(spacingWithStrip.step8.Em).toBeCloseTo(818, 0);
    expect(spacingWithStrip.verdict.touchSafe70).toBe(true);

    // In rigorous IEEE 80 mode (Kii = 1.0 for no rods):
    const spacingRigorous = calculateEarthmat({
      ...baseInput,
      D: 5.0,
      reproductionMode: false,
    });
    expect(spacingRigorous.step8.Em).toBeLessThan(spacingRigorous.step3.Etouch70);
    expect(spacingRigorous.verdict.touchSafe70).toBe(true);
  });
});
