export const FAULT_SOLVER_REGISTRY = {
  cFactorDefault:       "IEC60909_CFACTOR_UNCONFIRMED",
  motorXRatio:          "IEC60909_MOTORXR_UNCONFIRMED",
  kmFactor:             "IEC60909_KMFACTOR_APPROXIMATE",
  qFactor:              "IEC60909_QFACTOR_APPROXIMATE",
  kappaPeakFactor:      "IEC60909_KAPPA_NOT_ASSESSED",
  threePhaseSC:         "IEC60909_3PH_NOT_ASSESSED",
  lineToEarthSC:        "IEC60909_LG_NOT_ASSESSED",
  lineToLineSC:         "IEC60909_LL_NOT_ASSESSED",
  motorContribution:    "IEC60909_MOTORCONTRIB_NOT_ASSESSED",
  transformerWithstand: "IS2026_TXWITHSTAND_NOT_ASSESSED",
  towerClearance:       "IS5613_TOWERCLEARANCE_NOT_ASSESSED",
} as const;

export type FaultSolverClauseId = (typeof FAULT_SOLVER_REGISTRY)[keyof typeof FAULT_SOLVER_REGISTRY];
