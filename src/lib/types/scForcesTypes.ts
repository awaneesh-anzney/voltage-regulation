export interface SolverResult<T = number> {
  value: T;
  converged: boolean;
  iterations: number;
  residual: number;
  reasonCode?: "MAX_ITER" | "BRACKET_INVALID" | "DOMAIN_ERROR";
  statusMessage?: string;
}

export interface SolverDiagnostics {
  psi_Ftd1?: SolverResult<number>;
  psi_Ftd2?: SolverResult<number>;
  v2?: SolverResult<number>;
  eta?: SolverResult<number>;
  xi?: SolverResult<number>;
}

export class SCSolverError extends Error {
  constructor(public solverName: string, public diagnostic: SolverResult<number>) {
    super(`SC Forces solver '${solverName}' hard-failed: ${diagnostic.statusMessage ?? diagnostic.reasonCode}`);
    this.name = "SCSolverError";
  }
}

export type FfdMethod = "OCR_Recon" | "AI_Candidate" | "DISABLED";

export interface SCInputs {
  ik3: number;          // Short circuit current (A)
  xr: number;           // X/R ratio
  tk1: number;          // Fault duration (s)
  vsys: number;         // System voltage (V)
  freq: number;         // Frequency (Hz)
  lspan: number;        // Span length (m)
  li: number;           // Insulator length (m)
  dg: number;           // Girder gap (m)
  aph: number;          // Phase spacing (m)
  clph: number;         // Minimum clearance (m)
  H: number;            // Attachment height (m)
  fst_kg: number;       // Static tension (kgf)
  conductorName: string;// Conductor type
  nc: number;           // Sub-conductors
  as: number;           // Sub-conductor spacing (m)
  As: number;           // Cross-sectional area (mm^2)
  ds: number;           // Conductor diameter (mm)
  mc: number;           // Mass of conductor (kg/m)
  E: number;            // Young's modulus (N/mm^2)
  sigma_fin: number;    // Initial stress (N/m^2)
  ls: number;           // Spacer distance (m)
  ms: number;           // Mass of spacer (kg)
  md: number;           // Mass of dropper (kg)
  h_drop: number;       // Dropper height (m)
  w_drop: number;       // Dropper width (m)
  dropperPlane: 'perpendicular' | 'parallel';
  S: number;            // Support stiffness (N/mm)
  cth: number;          // Thermal expansion (1/K)
  ffdMethod?: FfdMethod;
}

export interface SCResults {
  lc: number; amin_req: number; ns: number; lv: number;
  mpc: number; Fst: number; k: number; Fprime: number; r: number; delta1_deg: number;
  fes: number; T: number; Tres: number; Tk1_eff: number; ratio: number;
  Eeff: number; N: number; zeta: number;
  deltaend_deg: number; chi: number; deltam_deg: number;
  phi: number; psi: number; Ftd1: number;
  epsilonela: number; epsilonth: number; CD: number; CF: number; fed: number;
  check1: boolean; delta1_dropper_deg: number; delta_eff_deg: number;
  phi1: number; psi1: number; Ftd2: number;
  Ftd: number; Ffd: number; Fpi: number; Fmax: number;
  Ffd_ocrRecon?: number;
  Ffd_aiCandidate?: number;
  ffdMethodSelected?: FfdMethod;
  ffdTriggered?: boolean;
  ffdGoverns?: boolean;
  bh: number; amin: number; clCheck: boolean;
  clasheff: boolean; v1: number; v2: number | null; v3: number | null;
  Fv: number | null; epsilonst: number | null; epsilonpi: number | null;
  j: number | null; subCondClash: boolean | null;
  eta: number | null; ve2: number | null;
  warnings: string[];
  solverDiagnostics?: SolverDiagnostics;
}
