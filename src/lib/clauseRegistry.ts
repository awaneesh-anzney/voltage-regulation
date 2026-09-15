// ⚠️ FROZEN — PHASE 1 STATE (as of Step 6a audit)
// All values below are INTERNAL PLACEHOLDER IDs, not real IEC 60865-1 clause/equation numbers.
// They exist so the codebase has a consistent way to reference "where a formula conceptually
// comes from" without asserting a citation we cannot verify.
//
// DO NOT bind these to real clause numbers without:
//   1. Access to a clean/paid copy of IEC 60865-1 (edition explicitly noted, e.g. :2011 or :2020)
//   2. Cross-checking each formula against the actual clause text (not just OCR/searched TOC)
//   3. Updating the corresponding VerificationTag from UNVERIFIED_CANDIDATE where applicable
//
// This is Step 6b — currently BLOCKED, no target date, pending external standard access.

import { FAULT_SOLVER_REGISTRY } from "./registries/faultSolverRegistry";
import { SAG_TENSION_REGISTRY } from "./registries/sagTensionRegistry";

export const CLAUSE_REGISTRY = {
  k:        "IEC60865_PEAKFACTOR_STYLE",
  Fprime:   "IEC60865_AMPERELAW_STYLE",
  r:        "IEC60865_LOADPARAM_STYLE",
  deltam:   "IEC60865_SWINGANGLE_STYLE",
  Ftd:      "IEC60865_TENSILE_SWING_STYLE",
  Ffd:      "IEC60865_DROPFORCE_UNCONFIRMED",
  v2:       "IEC60865_ANNEXA7_STYLE",
  v3:       "IEC60865_FIG10_STYLE",
  eta:      "IEC60865_FIG12_STYLE",
  Fpi:      "IEC60865_PINCH_STYLE",
  clearance:"IEC60865_CLEARANCE_STYLE",
  
  // SC Forces Inputs
  ik3:      "IEC60865_IK3_UNCONFIRMED",
  ceaClearance: "CEA_SCHEDULE_2_UNCONFIRMED",
  lspan:    "IEC60865_LSPAN_UNCONFIRMED",
  Fst:      "IEC60865_FST_UNCONFIRMED",
  tk1:      "IEC60865_TK1_UNCONFIRMED",

  // Fault Module Inputs
  cFactor:  "IEC60909_CFACTOR_UNCONFIRMED",
  tkFault:  "IEC60909_TK_UNCONFIRMED",
  tMinDelay:"IEC60909_TMINDELAY_UNCONFIRMED",
  motorX:   "IEC60909_MOTORX_UNCONFIRMED",
  iec60909: "IEC60909_GENERAL_UNCONFIRMED",
} as const;

export type ClauseId =
  | (typeof CLAUSE_REGISTRY)[keyof typeof CLAUSE_REGISTRY]
  | (typeof FAULT_SOLVER_REGISTRY)[keyof typeof FAULT_SOLVER_REGISTRY]
  | (typeof SAG_TENSION_REGISTRY)[keyof typeof SAG_TENSION_REGISTRY];

export function formatClauseDisplay(clauseId: ClauseId | string): string {
  // Determine the human-readable standard name from the prefix
  const standardName = clauseId.startsWith("IS802") ? "IS 802:2015"
    : clauseId.startsWith("IEC60909") ? "IEC 60909"
    : clauseId.startsWith("IEC60865") ? "IEC 60865-1"
    : clauseId.startsWith("IS2026") ? "IS 2026"
    : clauseId.startsWith("IS5613") ? "IS 5613"
    : clauseId.startsWith("CEA") ? "CEA Schedule"
    : null;

  // Route by suffix — each suffix maps to a distinct verification status
  if (clauseId.endsWith("_STYLE")) {
    return `${standardName ?? "Standard"} — Standard Principle (clause reference pending verification)`;
  }
  if (clauseId.endsWith("_UNCONFIRMED")) {
    return `${standardName ?? "Standard"} — Citation Unconfirmed`;
  }
  if (clauseId.endsWith("_NOT_ASSESSED")) {
    return `${standardName ?? "Standard"} — Pending Assessment`;
  }
  if (clauseId.endsWith("_APPROXIMATE")) {
    return `${standardName ?? "Standard"} — Approximate Value`;
  }
  if (clauseId.endsWith("_TABLE_DATA_UNAUDITED")) {
    return `${standardName ?? "Standard"} — Lookup Table Data Pending Expert Audit`;
  }
  if (clauseId.endsWith("_FLAG")) {
    return `${standardName ?? "Standard"} — Standard Selected`;
  }

  return clauseId; // Fallback for any legacy or non-registry strings (though typing should prevent this)
}
