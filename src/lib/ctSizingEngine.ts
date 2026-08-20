export interface CTSizingInputs {
  systemVoltageKv: number;
  faultCurrentA: number;
  xrRatio: number;
  ctPrimaryA: number;
  ctSecondaryA: number;
  ctResistanceOhm: number;
  leadLengthM: number;
  leadCrossSectionSqmm: number;
  relayBurdenVa: number;
}

export interface CTSizingResults {
  ctRatio: number;
  secondaryFaultCurrentA: number;
  dimensioningFactorK: number;
  leadResistanceOhm: number;
  relayResistanceOhm: number;
  totalBurdenOhm: number;
  requiredVkpV: number;
  estimatedActualVkpV: number;
  isAdequate: boolean;
  alfRequired: number;
}

export function calculateCTSizing(inputs: CTSizingInputs): CTSizingResults {
  const { faultCurrentA, xrRatio, ctPrimaryA, ctSecondaryA, ctResistanceOhm, leadLengthM, leadCrossSectionSqmm, relayBurdenVa } = inputs;

  const ctRatio = ctPrimaryA / ctSecondaryA;
  const secondaryFaultCurrentA = faultCurrentA / ctRatio;

  // Dimensioning factor K (simplified transient factor)
  // K = 1 + (X/R)
  const dimensioningFactorK = 1 + xrRatio;

  // Lead resistance = ρ * L / A
  // ρ for copper = 0.0175 ohm.mm²/m. Length is multiplied by 2 for return path.
  const leadResistanceOhm = (0.0175 * 2 * leadLengthM) / leadCrossSectionSqmm;

  // Relay burden resistance = VA / I^2 (where I is rated secondary current)
  const relayResistanceOhm = relayBurdenVa / (ctSecondaryA * ctSecondaryA);

  const totalBurdenOhm = ctResistanceOhm + leadResistanceOhm + relayResistanceOhm;

  // Required Knee Point Voltage
  const requiredVkpV = dimensioningFactorK * secondaryFaultCurrentA * totalBurdenOhm;

  // Estimate Actual Knee Point Voltage based on typical class PS core sizing
  // (Assuming typical actual Vkp provided by manufacturer is around 40 * Is * Rct as a rough baseline for a standard 5P20 / PS class CT)
  // Let's create a dummy actual Vkp for UI demonstration purposes that scales with the primary but allows failure if X/R is too high.
  const estimatedActualVkpV = (ctPrimaryA / 10) * ctSecondaryA * (ctResistanceOhm + 0.5) * 5; 

  const isAdequate = estimatedActualVkpV >= requiredVkpV;

  // Accuracy Limit Factor Required
  const alfRequired = dimensioningFactorK * (faultCurrentA / ctPrimaryA);

  return {
    ctRatio,
    secondaryFaultCurrentA,
    dimensioningFactorK,
    leadResistanceOhm,
    relayResistanceOhm,
    totalBurdenOhm,
    requiredVkpV,
    estimatedActualVkpV,
    isAdequate,
    alfRequired
  };
}

export function getDefaultCTSizingInputs(): CTSizingInputs {
  return {
    systemVoltageKv: 220,
    faultCurrentA: 40000,
    xrRatio: 15,
    ctPrimaryA: 800,
    ctSecondaryA: 1,
    ctResistanceOhm: 3.5,
    leadLengthM: 150,
    leadCrossSectionSqmm: 2.5,
    relayBurdenVa: 1.0
  };
}
