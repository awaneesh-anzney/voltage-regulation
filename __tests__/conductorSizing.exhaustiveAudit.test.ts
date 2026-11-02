import { describe, it, expect } from 'vitest';
import { ConductorSizingEngine, MATERIAL_PROPERTIES } from '../src/lib/conductorSizingEngine';
import { CONDUCTOR_LIBRARY, getConductorTypes, findConductor } from '../src/lib/conductorLibrary';
import { BUSBAR_TUBE_LIBRARY, findBusBar } from '../src/lib/busBarLibrary';

describe('Exhaustive Engineering Audit: Calculations, Design, Units & Values', () => {

  // ═════════════════════════════════════════════════════════════════════
  // 1. HEAT BALANCE PHYSICS & MATHEMATICAL EQUILIBRIUM
  // ═════════════════════════════════════════════════════════════════════
  describe('1. Heat Balance Equilibrium (P_j + P_sol == P_rad + P_conv)', () => {
    it('satisfies exact conservation of energy heat balance for any conductor condition', () => {
      const result = ConductorSizingEngine.calculateAmpacity({
        resistanceAt20C: 0.0000713,
        alphaR: 0.0036,
        diameter: 0.02814,
        ambientTemp: 35,
        maxTemp: 75,
        windSpeed: 0.6,
        solarRadiation: 1045,
        nSubConductors: 2,
        absorptivity: 0.5,
        emissivity: 0.6,
        lambdaEvaluation: 'ambient'
      });

      // P_j = P_rad + P_conv - P_sol
      // Therefore (P_j + P_sol) must identically equal (P_rad + P_conv)
      const heatGain = result.P_j + result.P_sol;
      const heatLoss = result.P_rad + result.P_conv;

      expect(heatGain).toBeCloseTo(heatLoss, 10);
      expect(result.I_max_per_conductor).toBeCloseTo(Math.sqrt(result.P_j / result.effectiveRt), 8);
      expect(result.I_max_total).toBeCloseTo(result.I_max_per_conductor * 2, 8);
    });

    it('handles zero solar condition (Night / Indoor) correctly', () => {
      const result = ConductorSizingEngine.calculateAmpacity({
        resistanceAt20C: 0.0000713,
        alphaR: 0.0036,
        diameter: 0.02814,
        ambientTemp: 30,
        maxTemp: 80,
        windSpeed: 0.6,
        solarRadiation: 0,
        nSubConductors: 1,
      });

      expect(result.P_sol).toBe(0);
      expect(result.P_j).toBeCloseTo(result.P_rad + result.P_conv, 10);
      expect(result.I_max_per_conductor).toBeGreaterThan(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 2. UNIT CONVERSIONS & SCALING INTEGRITY
  // ═════════════════════════════════════════════════════════════════════
  describe('2. Units & Dimensional Integrity', () => {
    it('verifies K factor unit conversion from A.sqrt(s)/m^2 to A.sqrt(s)/mm^2 (10^-6 factor)', () => {
      const mat = MATERIAL_PROPERTIES['AAAC'];
      const theta_b = 80;
      const theta_e = 200;

      const tempRatio = (1 + mat.alpha20 * (theta_e - 20)) / (1 + mat.alpha20 * (theta_b - 20));
      const lnTerm = Math.log(tempRatio);
      
      // Standard formula in SI units: A.s^0.5 / m^2
      const K_SI = Math.sqrt((mat.k20 * mat.c * mat.rho * lnTerm) / mat.alpha20);
      const K_mm2 = K_SI * 1e-6;

      const engineResult = ConductorSizingEngine.calculateSCWithstand({
        shortCircuitCurrent: 50000,
        duration: 1.0,
        area: 470,
        k20: mat.k20,
        c: mat.c,
        rho: mat.rho,
        alpha20: mat.alpha20,
        initialTemp: theta_b,
        finalTemp: theta_e
      });

      expect(engineResult.K_factor).toBeCloseTo(K_mm2, 8);
      // For 1.0s, S_thr = K / sqrt(1) = K
      expect(engineResult.S_thr).toBeCloseTo(engineResult.K_factor, 8);
      // I_sc = S_thr * Area
      expect(engineResult.I_sc_max_per_conductor).toBeCloseTo(engineResult.S_thr * 470, 6);
    });

    it('verifies R_20 extrapolation formula and unit conversion to Ohm/km', () => {
      const r20_ohm_m = 0.0000713;
      const alpha = 0.0036;
      const t_max = 80;

      const r80_ohm_m = ConductorSizingEngine.extrapolateResistance(r20_ohm_m, t_max, alpha);
      const r80_ohm_km = r80_ohm_m * 1000;

      // 7.13e-5 * (1 + 0.0036 * 60) = 8.67008e-5 Ohm/m = 0.0867 Ohm/km
      expect(r80_ohm_m).toBeCloseTo(0.0000867008, 9);
      expect(r80_ohm_km).toBeCloseTo(0.0867008, 6);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 3. SCHEDULE 80 & 80EH TUBE GTP DIMENSIONAL & MECHANICAL AUDIT
  // ═════════════════════════════════════════════════════════════════════
  describe('3. Busbar Tube GTP Mechanical & Electrical Precision (IS 5082)', () => {
    it.each(BUSBAR_TUBE_LIBRARY)('verifies geometric formula Area = pi/4*(OD^2 - ID^2) for $name', (tube) => {
      const innerDiameter = tube.outerDiameter - 2 * tube.wallThickness;
      const calculatedArea = (Math.PI / 4) * (Math.pow(tube.outerDiameter, 2) - Math.pow(innerDiameter, 2));

      // Check within 0.1% tolerance of GTP specified area
      expect(tube.crossSectionArea).toBeCloseTo(calculatedArea, 1);
    });

    it.each(BUSBAR_TUBE_LIBRARY)('verifies section modulus formula Z = I / (OD/2) for $name', (tube) => {
      const radius = tube.outerDiameter / 2;
      const calculatedZ = tube.momentOfInertia / radius;

      // Check within 0.05% of GTP specified section modulus
      expect(tube.sectionModulus).toBeCloseTo(calculatedZ, 1);
    });

    it.each(BUSBAR_TUBE_LIBRARY)('verifies material density rho = weight / (area * 1e-6) ~ 2700 kg/m3 for $name', (tube) => {
      const density = tube.weight / (tube.crossSectionArea * 1e-6);
      expect(density).toBeGreaterThan(2680);
      expect(density).toBeLessThan(2735); // 4" tube weight 7.7 is slightly rounded in catalog
    });

    it.each(BUSBAR_TUBE_LIBRARY)('verifies DC resistance at 20C based on 55% IACS for $name', (tube) => {
      // 55% IACS = 31.9 MS/m -> rho = 0.031348 Ohm.mm^2/m
      const expectedR = 0.031348 / tube.crossSectionArea;
      expect(tube.dcResistanceAt20C).toBeCloseTo(expectedR, 9);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 4. IEC 60865-1 SHORT CIRCUIT DURATION AND LIMIT AUDIT
  // ═════════════════════════════════════════════════════════════════════
  describe('4. Short Circuit Withstand Across All Materials and Durations', () => {
    it('verifies inverse square root duration law: S_thr(1s) / S_thr(3s) == sqrt(3)', () => {
      const base = {
        shortCircuitCurrent: 50000,
        area: 470,
        k20: MATERIAL_PROPERTIES['AAAC'].k20,
        c: MATERIAL_PROPERTIES['AAAC'].c,
        rho: MATERIAL_PROPERTIES['AAAC'].rho,
        alpha20: MATERIAL_PROPERTIES['AAAC'].alpha20,
        initialTemp: 80,
        finalTemp: 200
      };

      const sc1s = ConductorSizingEngine.calculateSCWithstand({ ...base, duration: 1.0 });
      const sc3s = ConductorSizingEngine.calculateSCWithstand({ ...base, duration: 3.0 });

      expect(sc1s.K_factor).toBeCloseTo(sc3s.K_factor, 10);
      expect(sc1s.S_thr / sc3s.S_thr).toBeCloseTo(Math.sqrt(3), 6);
      expect(sc1s.I_sc_max_total / sc3s.I_sc_max_total).toBeCloseTo(Math.sqrt(3), 6);
    });

    it('verifies max permissible duration formula: t_max = ((K * Area) / I_sc)^2', () => {
      const result = ConductorSizingEngine.calculateSCWithstand({
        shortCircuitCurrent: 50000,
        duration: 3.0,
        area: 470,
        nSubConductors: 2,
        k20: MATERIAL_PROPERTIES['AAAC'].k20,
        c: MATERIAL_PROPERTIES['AAAC'].c,
        rho: MATERIAL_PROPERTIES['AAAC'].rho,
        alpha20: MATERIAL_PROPERTIES['AAAC'].alpha20,
        initialTemp: 80,
        finalTemp: 200
      });

      const totalArea = 470 * 2;
      const expectedTMax = Math.pow((result.K_factor * totalArea) / 50000, 2);

      expect(result.maxDurationForTargetSC).toBeCloseTo(expectedTMax, 6);
      expect(result.maxDurationForTargetSC).toBeCloseTo(2.55, 2);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 5. CONDUCTOR LIBRARY PURITY & TYPE COVERAGE
  // ═════════════════════════════════════════════════════════════════════
  describe('5. Conductor Library Integrity', () => {
    it('verifies all flexible conductors have valid physical properties', () => {
      for (const cond of CONDUCTOR_LIBRARY) {
        expect(cond.As).toBeGreaterThan(50);
        expect(cond.ds).toBeGreaterThan(8);
        expect(cond.mc).toBeGreaterThan(0.1);
        expect(cond.E).toBeGreaterThan(40000);
        expect(cond.uts).toBeGreaterThan(10);
        expect(cond.thermalExpCoeff).toBeGreaterThan(0);
      }
    });

    it('contains no rigid busbar tubes in CONDUCTOR_LIBRARY', () => {
      const types = getConductorTypes();
      expect(types).not.toContain('AL_TUBE');
      expect(types.sort()).toEqual(['AAC', 'AAAC', 'ACSR', 'HTLS'].sort());
    });
  });

});

