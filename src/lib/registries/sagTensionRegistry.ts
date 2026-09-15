export const SAG_TENSION_REGISTRY = {
  standardFlag:           "IS802_STANDARD_FLAG",
  basicWindSpeed:         "IS802_VBASIC_NOT_ASSESSED",
  riskCoefficient:        "IS802_K1_NOT_ASSESSED",
  terrainFactor:          "IS802_K2_NOT_ASSESSED",       // P2 note: cites same table (Table 3) as basicWindSpeed - flag for expert review
  designWindSpeed:        "IS802_VDESIGN_NOT_ASSESSED",
  designWindPressure:     "IS802_PDESIGN_NOT_ASSESSED",
  gustFactorConductor:    "IS802_GUSTCOND_NOT_ASSESSED",
  gustFactorInsulator:    "IS802_GUSTINSUL_NOT_ASSESSED",
  dragCoefficientConductor: "IS802_DRAGCOND_NOT_ASSESSED",
  dragCoefficientInsulator: "IS802_DRAGINSUL_NOT_ASSESSED",
  conductorWindLoad:        "IS802_WINDLOADCOND_NOT_ASSESSED",
  insulatorWindForce:       "IS802_WINDFORCEINSUL_NOT_ASSESSED",
  windPressureTable:        "IS802_WINDPRESSURE_TABLE_DATA_UNAUDITED",
  riskCoeffTable:           "IS802_RISKCOEFF_TABLE_DATA_UNAUDITED",
  gustResponseTable:        "IS802_GUSTRESPONSE_TABLE_DATA_UNAUDITED",
} as const;

export type SagTensionClauseId = (typeof SAG_TENSION_REGISTRY)[keyof typeof SAG_TENSION_REGISTRY];

export interface TableAuditMetadata {
  refId: string;
  tableName: string;
  lastAuditedDate: string | null;   // null = never audited
  auditedBy: string | null;
  auditNotes: string | null;
}

export const TABLE_AUDIT_STATUS: Record<
  "windPressureTable" | "riskCoeffTable" | "gustResponseTable",
  TableAuditMetadata
> = {
  windPressureTable: {
    refId: SAG_TENSION_REGISTRY.windPressureTable,
    tableName: "IS 802 Table 4 — Wind Pressure Coefficients",
    lastAuditedDate: null,
    auditedBy: null,
    auditNotes: null,
  },
  riskCoeffTable: {
    refId: SAG_TENSION_REGISTRY.riskCoeffTable,
    tableName: "IS 802 Table 2 — Risk Coefficient K1",
    lastAuditedDate: null,
    auditedBy: null,
    auditNotes: null,
  },
  gustResponseTable: {
    refId: SAG_TENSION_REGISTRY.gustResponseTable,
    tableName: "IS 802 Tables 6 & 7 — Gust Response Factors",
    lastAuditedDate: null,
    auditedBy: null,
    auditNotes: null,
  },
};
