import { ClauseId } from "../clauseRegistry";

export type VerificationTag = "VERIFIED" | "APPROXIMATE" | "UNVERIFIED_CANDIDATE";

export interface TraceableParameter {
  name: string;
  symbol: string;
  value: number | null;      // null = not applicable in this configuration
  applicable: boolean;       // explicit, so UI never has to guess from null alone
  unit: string;
  clauseRef: ClauseId;
  verification: VerificationTag;
  notes?: string;
  evidence?: string;         // e.g. "Matches IEC test case to 3 decimals"
}

export type SCTraceKey =
  | "k" | "Fprime" | "r" | "deltam_deg" | "Ftd" | "Ffd"
  | "v2" | "v3" | "eta" | "Fpi" | "clearance";

export interface GoverningForce {
  symbol: "Ftd" | "Ffd" | "Fpi";
  value: number;
  verification: VerificationTag;
  tiedWith?: ("Ftd" | "Ffd" | "Fpi")[];   // present only when a tie occurred
}

export interface EngineTraceOutput {
  parameters: Record<SCTraceKey, TraceableParameter>;
  governingForce: GoverningForce;
}
