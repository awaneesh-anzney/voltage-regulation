import type { VerificationTag } from "./types/verification";

export interface AmpacityParams {
  /**
   * Resistance at operating temperature (R_T in Ohm/m).
   * If omitted, will be automatically calculated from `resistanceAt20C` and `alphaR` (or material alpha).
   */
  acResistanceAtOperatingTemp?: number;
  
  /** Base resistance at 20°C in Ohm/m (e.g. 0.0000713) */
  resistanceAt20C?: number;

  /** Temperature coefficient of resistance per °C (default: 0.0036 for AAAC or from material) */
  alphaR?: number;

  diameter: number; // m (e.g. 0.02814)
  ambientTemp: number; // T1 in °C
  maxTemp: number; // T2 in °C
  windSpeed: number; // m/s
  solarRadiation: number; // W/m^2
  absorptivity?: number; // alpha_s, default 0.5
  emissivity?: number; // epsilon, default 0.6
  nSubConductors?: number; // e.g. 2 for twin bundle
  
  /**
   * Air thermal conductivity evaluation temperature:
   * - 'ambient': Evaluates lambda at T_ambient (client / conservative convention)
   * - 'film': Evaluates lambda at (T_ambient + T_max)/2 (IEC 61597 standard convention)
   * Default: 'ambient'
   */
  lambdaEvaluation?: 'ambient' | 'film';
  lambdaAir?: number; // Optional explicit override for thermal conductivity of air (W/m.K)
  kelvinOffset?: number; // Kelvin offset, default 273.15 (document uses integer 273)
  
  // Reproduction mode: override values to reproduce printed reference documents
  reproductionOverridePsol?: number;
  reproductionOverridePrad?: number;
  reproductionOverridePconv?: number;
}

export interface AmpacityResult {
  P_sol: number;
  P_rad: number;
  P_conv: number;
  P_j: number;
  I_max_per_conductor: number;
  I_max_total: number;
  effectiveRt: number; // The actual R_T used in calculation (Ohm/m)
  verification: VerificationTag;
  Re: number;
  Nu: number;
}

export interface SCWithstandParams {
  shortCircuitCurrent: number; // Target fault current in A (e.g. 50000)
  duration: number; // seconds (e.g. 1 or 3)
  area: number; // mm^2 (e.g. 470)
  nSubConductors?: number; // e.g. 2
  
  // Material properties (IEC 60865-1 / IEC 865-1)
  k20: number; // Specific conductivity @ 20°C in S/m (e.g. 34800000)
  c: number; // Specific thermal capacity in J/(kg.K) (e.g. 910)
  rho: number; // Specific mass/density in kg/m^3 (e.g. 2700)
  alpha20: number; // Temperature coefficient (e.g. 0.0036)
  
  initialTemp: number; // Pre-fault temp, theta_b (e.g. 80°C)
  finalTemp: number; // Max allowed SC temp, theta_e (e.g. 200°C for Al alloy)
}

export interface SCWithstandResult {
  K_factor: number; // A.sqrt(s)/mm^2
  S_thr: number; // Thermal withstand current density A/mm^2
  I_sc_max_per_conductor: number; // A
  I_sc_max_total: number; // A
  isSuitable: boolean;
  maxDurationForTargetSC?: number; // Maximum permissible fault duration (sec) before exceeding finalTemp
  verification: VerificationTag;
  error?: string; // Descriptive error if inputs are physically invalid (e.g. finalTemp <= initialTemp)
}

export interface MaterialProperty {
  k20: number; // S/m
  c: number; // J/(kg.K)
  rho: number; // kg/m^3
  alpha20: number; // /°C
  thetaEMax?: number; // °C, max short-circuit temperature (IEC 60865-1 Table 1)
  thetaEMaxSource: string;
  label: string;
  materialType: 'ALUMINIUM' | 'AL_ALLOY' | 'COPPER' | 'HTLS_COMPOSITE';
}

/**
 * Material Thermal Properties Registry based on conductor & busbar material type.
 * Sources:
 * - IEC 60865-1:2011 Table 1 (θe limits: Al bare = 200°C, Cu bare = 300°C)
 * - IS 5082:1998 / GTP Schedule 80 & 80EH (Alloy 6101 T6: 55% IACS, α20 = 0.00364)
 */
export const MATERIAL_PROPERTIES: Record<string, MaterialProperty> = {
  'AAC': {
    k20: 35.4e6,
    c: 910,
    rho: 2700,
    alpha20: 0.00403,
    thetaEMax: 200,
    thetaEMaxSource: 'IEC 60865-1:2011 Table 1 (Bare Aluminium)',
    label: 'All Aluminium Conductor (AAC)',
    materialType: 'ALUMINIUM'
  },
  'AAAC': {
    k20: 34.8e6,
    c: 910,
    rho: 2700,
    alpha20: 0.0036,
    thetaEMax: 200,
    thetaEMaxSource: 'IEC 60865-1:2011 Table 1 (Aluminium Alloy)',
    label: 'All Aluminium Alloy Conductor (AAAC - Greeley)',
    materialType: 'AL_ALLOY'
  },
  'ACSR': {
    k20: 35.4e6,
    c: 910,
    rho: 2700,
    alpha20: 0.00403,
    thetaEMax: 200,
    thetaEMaxSource: 'IEC 60865-1:2011 Table 1 (Al strands govern annealing)',
    label: 'Aluminium Conductor Steel Reinforced (ACSR)',
    materialType: 'ALUMINIUM'
  },
  'HTLS': {
    k20: 34.8e6,
    c: 910,
    rho: 2700,
    alpha20: 0.0036,
    thetaEMax: undefined, // Must be specified from manufacturer datasheet
    thetaEMaxSource: 'Manufacturer Datasheet Required (typ. 250°C ACCC / 340°C ACSS)',
    label: 'High Temperature Low Sag (HTLS)',
    materialType: 'HTLS_COMPOSITE'
  },
  'AL_TUBE': {
    k20: 31.9e6, // 55% IACS (0.55 * 58e6)
    c: 910,
    rho: 2700,
    alpha20: 0.00364, // IS 5082:1998 GTP
    thetaEMax: 200,
    thetaEMaxSource: 'IEC 60865-1:2011 Table 1 / IS 5082:1998 (Al Alloy 6101 T6)',
    label: 'Aluminium Alloy 6101 T6 Tube (Schedule 80/80EH)',
    materialType: 'AL_ALLOY'
  },
  'COPPER': {
    k20: 58.0e6, // 100% IACS
    c: 390,
    rho: 8900,
    alpha20: 0.00393,
    thetaEMax: 250, // Client specified (IEC allows up to 300°C)
    thetaEMaxSource: 'Client Specification (IEC 60865-1 allows 300°C)',
    label: 'Electrolytic Tough Pitch Copper (Cu)',
    materialType: 'COPPER'
  }
};

export class ConductorSizingEngine {

  /**
   * Extrapolates DC/AC resistance from 20°C base to target operating temperature.
   * R_T = R_20 * (1 + alpha20 * (T - 20))
   */
  static extrapolateResistance(r20: number, targetTemp: number, alpha20: number = 0.0036): number {
    return r20 * (1 + alpha20 * (targetTemp - 20));
  }

  /**
   * Part 1.1: Continuous Thermal (Ampacity) Check - Heat Balance
   * P_j + P_sol = P_rad + P_conv
   * Solves for I_max.
   */
  static calculateAmpacity(params: AmpacityParams): AmpacityResult {
    const { 
      diameter: D, 
      ambientTemp: T1, 
      maxTemp: T2,
      windSpeed: V,
      solarRadiation: Qs,
      absorptivity = 0.5,
      emissivity = 0.6,
      nSubConductors = 1,
      kelvinOffset = 273.15,
      lambdaEvaluation = 'ambient'
    } = params;

    // Determine effective resistance at operating temperature (R_T)
    let Rt: number;
    if (params.acResistanceAtOperatingTemp !== undefined) {
      Rt = params.acResistanceAtOperatingTemp;
    } else if (params.resistanceAt20C !== undefined) {
      const alpha = params.alphaR ?? 0.0036;
      Rt = this.extrapolateResistance(params.resistanceAt20C, T2, alpha);
    } else {
      Rt = 0.0000713; // default fallback
    }

    // 1. Solar Heat Gain (P_sol)
    const P_sol = params.reproductionOverridePsol ?? (absorptivity * Qs * D);

    // 2. Radiation Heat Loss (P_rad)
    const sigma_B = 5.67e-8;
    const P_rad = params.reproductionOverridePrad ?? (
      emissivity * sigma_B * Math.PI * D * (Math.pow(T2 + kelvinOffset, 4) - Math.pow(T1 + kelvinOffset, 4))
    );

    // 3. Convection Heat Loss (P_conv)
    let P_conv = params.reproductionOverridePconv;
    let Re = 0;
    let Nu = 0;

    const T_film = (T1 + T2) / 2;
    const T_film_K = T_film + kelvinOffset;

    // Thermal conductivity of air: evaluated at ambient temp (per client rule) or film temp (IEC 61597)
    const T_lambda = lambdaEvaluation === 'film' ? T_film : T1;
    const lambda_f = params.lambdaAir ?? (0.0242 + 7.2e-5 * T_lambda);

    // Document's printed formula for Re: 1.644e9 * V * D * (T_film_K)^-1.78
    Re = 1.644e9 * V * D * Math.pow(T_film_K, -1.78);
    Nu = 0.65 * Math.pow(Re, 0.2) + 0.23 * Math.pow(Re, 0.61);

    if (P_conv === undefined) {
      P_conv = Nu * lambda_f * Math.PI * (T2 - T1);
    }

    // 4. Solve for Joule Heating & Current
    const P_j = P_rad + P_conv - P_sol;
    
    // I = sqrt(P_j / R_t)
    const I_max_per_conductor = P_j > 0 && Rt > 0 ? Math.sqrt(P_j / Rt) : 0;
    const I_max_total = I_max_per_conductor * nSubConductors;

    return {
      P_sol,
      P_rad,
      P_conv,
      P_j,
      effectiveRt: Rt,
      I_max_per_conductor,
      I_max_total,
      verification: 'NOT_YET_ASSESSED',
      Re,
      Nu
    };
  }

  /**
   * Part 1.2: Short Circuit (Thermal) Withstand Check
   * Implements IEC 60865-1 Thermal Equivalent formulation.
   * Includes rigorous validation against non-physical inputs (e.g. finalTemp <= initialTemp).
   */
  static calculateSCWithstand(params: SCWithstandParams): SCWithstandResult {
    const {
      shortCircuitCurrent, duration, area, nSubConductors = 1,
      k20, c, rho, alpha20, initialTemp, finalTemp
    } = params;

    // Validation 1: Final temperature must be strictly greater than initial temperature
    if (finalTemp <= initialTemp) {
      return {
        K_factor: 0,
        S_thr: 0,
        I_sc_max_per_conductor: 0,
        I_sc_max_total: 0,
        isSuitable: false,
        verification: 'NOT_YET_ASSESSED',
        error: `Max short-circuit temperature (θe = ${finalTemp}°C) must be strictly greater than pre-fault temperature (θb = ${initialTemp}°C).`
      };
    }

    // Validation 2: Duration and area must be positive
    if (duration <= 0 || area <= 0) {
      return {
        K_factor: 0,
        S_thr: 0,
        I_sc_max_per_conductor: 0,
        I_sc_max_total: 0,
        isSuitable: false,
        verification: 'NOT_YET_ASSESSED',
        error: 'Short-circuit duration and conductor cross-sectional area must be positive values.'
      };
    }

    // Logarithmic temperature factor per IEC 60865-1
    const tempRatio = (1 + alpha20 * (finalTemp - 20)) / (1 + alpha20 * (initialTemp - 20));
    if (tempRatio <= 0) {
      return {
        K_factor: 0,
        S_thr: 0,
        I_sc_max_per_conductor: 0,
        I_sc_max_total: 0,
        isSuitable: false,
        verification: 'NOT_YET_ASSESSED',
        error: 'Temperature ratio produces non-physical logarithm. Check initial and final temperatures.'
      };
    }

    const lnTerm = Math.log(tempRatio);

    // K factor calculation (gives result in A.sqrt(s)/m^2)
    const K_m2 = Math.sqrt((k20 * c * rho * lnTerm) / alpha20);
    
    // Convert K to A.sqrt(s)/mm^2
    const K_factor = K_m2 * 1e-6;

    // Thermal current density S_thr = K / sqrt(duration)
    const S_thr = K_factor / Math.sqrt(duration);

    // Total withstand current
    const I_sc_max_per_conductor = S_thr * area;
    const I_sc_max_total = I_sc_max_per_conductor * nSubConductors;

    // Maximum permissible fault duration (t_max) before exceeding finalTemp at the target fault current
    const totalArea = area * nSubConductors;
    const maxDurationForTargetSC = shortCircuitCurrent > 0 && totalArea > 0
      ? Math.pow((K_factor * totalArea) / shortCircuitCurrent, 2)
      : 0;

    return {
      K_factor,
      S_thr,
      I_sc_max_per_conductor,
      I_sc_max_total,
      maxDurationForTargetSC,
      isSuitable: I_sc_max_total >= shortCircuitCurrent,
      verification: 'NOT_YET_ASSESSED'
    };
  }
}
