/**
 * CEA Safety Clearances — Schedule-2
 * Source: "General Guidelines for 765/400/220/132/33kV substations and
 * switchyard of Thermal/Hydro Power Projects" — Clause 4.1(i)
 *
 * All values converted from mm (source table) to metres.
 *
 * NOTE ON FOOTNOTES (from the source table):
 *   Phase-to-phase has TWO values for 765kV and 400kV:
 *     (1) conductor-conductor configuration
 *     (2)/(3) rod-structure / rod-conductor configuration
 *   Phase-to-earth has TWO values for 765kV:
 *     (4) conductor-structure configuration
 *     (2) rod-structure configuration
 *   220kV, 132kV, 33kV have a single value each (no configuration split
 *   given in the source table).
 *
 * For SC Forces (conductor swing, a_min clearance check), the
 * CONDUCTOR-based value is the physically relevant one — that's what
 * `recommended` below points to. The alternate (rod-based) value is kept
 * for reference / other use-cases (e.g. equipment clearance checks).
 */

export interface ClearanceSpec {
  systemVoltageKv: number;
  label: string;

  /** Phase-to-phase clearance (m) */
  phaseToPhase: {
    conductorConductor: number;      // primary / recommended for SC Forces
    rodStructure?: number;           // alternate config, if given in source
  };

  /** Phase-to-earth clearance (m) */
  phaseToEarth: {
    conductorStructure: number;      // primary / recommended for SC Forces
    rodStructure?: number;           // alternate config, if given in source
  };

  /** Safety working clearance / sectional clearance (m) */
  safetyWorkingClearanceM: number;

  /** Ground clearance — elevation of live conductor above plinth level (m) */
  groundClearanceM: number;

  /** Height of insulator's bottom from ground (m) */
  insulatorHeightFromGroundM: number;
}

export const CEA_CLEARANCES: ClearanceSpec[] = [
  {
    systemVoltageKv: 765,
    label: "765 kV",
    phaseToPhase: { conductorConductor: 7.6, rodStructure: 9.4 },
    phaseToEarth: { conductorStructure: 4.9, rodStructure: 6.4 },
    safetyWorkingClearanceM: 10.3,
    groundClearanceM: 14.0,
    insulatorHeightFromGroundM: 2.44,
  },
  {
    systemVoltageKv: 400,
    label: "400 kV",
    phaseToPhase: { conductorConductor: 4.0, rodStructure: 4.2 },
    phaseToEarth: { conductorStructure: 3.5 },
    safetyWorkingClearanceM: 6.5,
    groundClearanceM: 8.0,
    insulatorHeightFromGroundM: 2.44,
  },
  {
    systemVoltageKv: 220,
    label: "220 kV",
    phaseToPhase: { conductorConductor: 2.1 },
    phaseToEarth: { conductorStructure: 2.1 },
    safetyWorkingClearanceM: 5.0,
    groundClearanceM: 5.5,
    insulatorHeightFromGroundM: 2.44,
  },
  {
    systemVoltageKv: 132,
    label: "132 kV",
    phaseToPhase: { conductorConductor: 1.3 },
    phaseToEarth: { conductorStructure: 1.3 },
    safetyWorkingClearanceM: 3.8,
    groundClearanceM: 4.8,
    insulatorHeightFromGroundM: 2.44,
  },
  {
    systemVoltageKv: 33,
    label: "33 kV",
    phaseToPhase: { conductorConductor: 0.32 },
    phaseToEarth: { conductorStructure: 0.32 },
    safetyWorkingClearanceM: 3.0,
    groundClearanceM: 3.7,
    insulatorHeightFromGroundM: 2.44,
  },
];

/**
 * Look up the CEA clearance spec for a given system voltage (kV).
 * Falls back to the nearest listed voltage if an exact match isn't found
 * (e.g. a user enters 110kV or 66kV, which aren't in the CEA table) and
 * flags that fallback so the UI can warn the engineer to confirm manually.
 */
export function getClearanceSpec(systemVoltageKv: number): {
  spec: ClearanceSpec;
  exactMatch: boolean;
} {
  const exact = CEA_CLEARANCES.find((c) => c.systemVoltageKv === systemVoltageKv);
  if (exact) return { spec: exact, exactMatch: true };

  // Fallback: nearest voltage by absolute difference
  const nearest = CEA_CLEARANCES.reduce((best, c) =>
    Math.abs(c.systemVoltageKv - systemVoltageKv) <
    Math.abs(best.systemVoltageKv - systemVoltageKv)
      ? c
      : best
  );
  return { spec: nearest, exactMatch: false };
}

/**
 * Convenience helper for auto-filling the two SC Forces input fields shown
 * in the screenshot ("Phase spacing a_ph" and "Phase-phase clearance").
 *
 * - phaseToPhaseClearanceM: taken directly from the CEA table (regulatory
 *   minimum) — recommend making this field read-only / "recommended value"
 *   once auto-filled, since it's a standard, not a design choice.
 * - suggestedPhaseSpacingM: NOT a CEA-mandated number — phase spacing is an
 *   engineering/design choice (tower geometry). This returns the CEA
 *   clearance value AS A STARTING SUGGESTION (spacing should be >= this),
 *   but the field must stay user-editable.
 */
export function autoFillSCForcesFields(systemVoltageKv: number) {
  const { spec, exactMatch } = getClearanceSpec(systemVoltageKv);
  return {
    phaseToPhaseClearanceM: spec.phaseToPhase.conductorConductor,
    suggestedPhaseSpacingM: spec.phaseToPhase.conductorConductor, // starting point only — editable
    exactMatch,
    sourceLabel: spec.label,
  };
}
