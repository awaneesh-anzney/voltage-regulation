import { describe, it, expect } from 'vitest';
import { ConductorSizingEngine, MATERIAL_PROPERTIES } from '../src/lib/conductorSizingEngine';
import { BUSBAR_TUBE_LIBRARY, findBusBar } from '../src/lib/busBarLibrary';
import { CONDUCTOR_LIBRARY } from '../src/lib/conductorLibrary';

describe('Conductor Sizing Engine — Real-World Engineering & Standards Verification', () => {

  describe('1. Resistance Extrapolation (R_20 to Operating Temperature)', () => {
    it('extrapolates DC resistance using material alpha (R_80 = R_20 * (1 + alpha * 60))', () => {
      const r20 = 0.0000713;
      const alpha = 0.0036;
      const r80 = ConductorSizingEngine.extrapolateResistance(r20, 80, alpha);
      
      // 0.0000713 * (1 + 0.0036 * 60) = 0.0000867008
      expect(r80).toBeCloseTo(0.0000867, 7);
    });

    it('calculates ampacity accepting resistanceAt20C and internal extrapolation', () => {
      const res = ConductorSizingEngine.calculateAmpacity({
        resistanceAt20C: 0.0000713,
        alphaR: 0.0036,
        diameter: 0.02814,
        ambientTemp: 30,
        maxTemp: 80,
        windSpeed: 0.6,
        solarRadiation: 1000,
        nSubConductors: 2,
        lambdaEvaluation: 'ambient'
      });

      expect(res.effectiveRt).toBeCloseTo(0.0000867, 7);
      expect(res.I_max_per_conductor).toBeGreaterThan(900);
      expect(res.I_max_total).toBeGreaterThan(1800);
    });
  });

  describe('2. IEC 60865-1 Short Circuit Temperature Limits (θe = 200°C for Al Alloy)', () => {
    const greeleyTwinSC = {
      shortCircuitCurrent: 50000,
      area: 470,
      nSubConductors: 2,
      k20: MATERIAL_PROPERTIES['AAAC'].k20, // 34.8 MS/m
      c: MATERIAL_PROPERTIES['AAAC'].c,
      rho: MATERIAL_PROPERTIES['AAAC'].rho,
      alpha20: MATERIAL_PROPERTIES['AAAC'].alpha20, // 0.0036
      initialTemp: 80,
      finalTemp: 200 // IEC 60865-1 Table 1 bare Al limit
    };

    it('calculates SC withstand at 3.0 s: gives K ≈ 84.97 and I_sc ≈ 46.11 kA (< 50 kA)', () => {
      const res = ConductorSizingEngine.calculateSCWithstand({
        ...greeleyTwinSC,
        duration: 3.0
      });

      expect(res.K_factor).toBeCloseTo(84.97, 2);
      expect(res.S_thr).toBeCloseTo(49.06, 2);
      expect(res.I_sc_max_total).toBeCloseTo(46115, -1);
      expect(res.isSuitable).toBe(false);
      
      // Maximum permissible duration for 50 kA is ~2.55 seconds
      expect(res.maxDurationForTargetSC).toBeCloseTo(2.55, 2);
    });

    it('calculates SC withstand at 1.0 s utility standard duration: gives 79.87 kA >> 50 kA (Passes)', () => {
      const res = ConductorSizingEngine.calculateSCWithstand({
        ...greeleyTwinSC,
        duration: 1.0
      });

      expect(res.K_factor).toBeCloseTo(84.97, 2);
      expect(res.S_thr).toBeCloseTo(84.97, 2);
      expect(res.I_sc_max_total).toBeCloseTo(79872, -1);
      expect(res.isSuitable).toBe(true);
    });
  });

  describe('3. Validation Against Non-Physical Inputs (Prevent NaN)', () => {
    it('returns a clean error result when finalTemp <= initialTemp instead of NaN', () => {
      const res = ConductorSizingEngine.calculateSCWithstand({
        shortCircuitCurrent: 50000,
        duration: 1.0,
        area: 470,
        nSubConductors: 2,
        k20: 34.8e6,
        c: 910,
        rho: 2700,
        alpha20: 0.0036,
        initialTemp: 80,
        finalTemp: 80 // Equal temperatures!
      });

      expect(res.isSuitable).toBe(false);
      expect(res.K_factor).toBe(0);
      expect(res.error).toBeDefined();
      expect(res.error).toContain('must be strictly greater than');
      expect(Number.isNaN(res.K_factor)).toBe(false);
    });

    it('returns a clean error result when duration <= 0', () => {
      const res = ConductorSizingEngine.calculateSCWithstand({
        shortCircuitCurrent: 50000,
        duration: 0,
        area: 470,
        nSubConductors: 2,
        k20: 34.8e6,
        c: 910,
        rho: 2700,
        alpha20: 0.0036,
        initialTemp: 80,
        finalTemp: 200
      });

      expect(res.isSuitable).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('4. Rigid Aluminium Tubular Busbar Library (Schedule 80 & 80EH)', () => {
    it('verifies all 4 tube sizes exist with verified GTP specifications', () => {
      expect(BUSBAR_TUBE_LIBRARY).toHaveLength(4);
      
      const tube3 = findBusBar('3" IPS AL Tube (EH Type)');
      expect(tube3).toBeDefined();
      expect(tube3!.outerDiameter).toBe(88.90);
      expect(tube3!.crossSectionArea).toBe(1945.76);
      expect(tube3!.alpha20).toBe(0.00364);
      expect(tube3!.conductivityIACS).toBe(55);
      expect(tube3!.dcResistanceAt20C).toBeCloseTo(0.031348 / 1945.76, 8);

      const tube45 = findBusBar('4.5" IPS AL Tube (EH Type)');
      expect(tube45).toBeDefined();
      expect(tube45!.outerDiameter).toBe(120.0);
      expect(tube45!.wallThickness).toBe(12.0);
      expect(tube45!.crossSectionArea).toBe(4071.50);
      expect(tube45!.momentOfInertia).toBe(6011958.58);
      expect(tube45!.sectionModulus).toBe(100199.31);
    });

    it('calculates SC withstand of 3" IPS AL Tube at 3.0 s: easily exceeds 50 kA', () => {
      const tube3 = findBusBar('3" IPS AL Tube (EH Type)')!;
      const mat = MATERIAL_PROPERTIES['AL_TUBE'];

      const res = ConductorSizingEngine.calculateSCWithstand({
        shortCircuitCurrent: 50000,
        duration: 3.0,
        area: tube3.crossSectionArea,
        nSubConductors: 1,
        k20: mat.k20, // 31.9 MS/m (55% IACS)
        c: mat.c,
        rho: mat.rho,
        alpha20: mat.alpha20, // 0.00364
        initialTemp: 80,
        finalTemp: 200
      });

      // 3" tube has cross-sectional area 1945.76 mm²
      // K ≈ 81.39 -> S_thr = 46.99 A/mm² -> I_sc = 1945.76 * 46.99 ≈ 91.4 kA
      expect(res.I_sc_max_total).toBeGreaterThan(90000);
      expect(res.isSuitable).toBe(true);
    });
  });

  describe('5. Copper Material Sizing', () => {
    it('supports Copper with 250°C client limit and high withstand', () => {
      const cuMat = MATERIAL_PROPERTIES['COPPER'];
      expect(cuMat.thetaEMax).toBe(250);
      expect(cuMat.k20).toBe(58.0e6);

      const res = ConductorSizingEngine.calculateSCWithstand({
        shortCircuitCurrent: 50000,
        duration: 1.0,
        area: 400,
        nSubConductors: 1,
        k20: cuMat.k20,
        c: cuMat.c,
        rho: cuMat.rho,
        alpha20: cuMat.alpha20,
        initialTemp: 80,
        finalTemp: cuMat.thetaEMax!
      });

      // Copper K factor with 250°C client limit (148.79 A.sqrt(s)/mm²)
      expect(res.K_factor).toBeCloseTo(148.79, 1);
      expect(res.isSuitable).toBe(true);
    });
  });

  describe('6. Library Segregation Integrity', () => {
    it('ensures CONDUCTOR_LIBRARY contains only flexible stranded conductors (no rigid tubes)', () => {
      const types = CONDUCTOR_LIBRARY.map(c => c.type);
      expect(types).not.toContain('AL_TUBE');
      for (const t of types) {
        expect(['AAC', 'AAAC', 'ACSR', 'HTLS']).toContain(t);
      }
    });
  });
});
