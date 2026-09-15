import { SCInputs } from "./types/scForcesTypes";

export interface ValidationError {
  field: keyof SCInputs | string;
  message: string;
  severity: "FATAL" | "WARNING";
}

export class SCInputValidationError extends Error {
  constructor(public errors: ValidationError[]) {
    super("SC Forces input validation failed: " + errors.filter(e => e.severity === "FATAL").map(e => e.message).join("; "));
    this.name = "SCInputValidationError";
  }
}

const isFiniteNumber = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

export function validateSCInputs(inp: SCInputs): { errors: ValidationError[], hasFatal: boolean } {
  const errors: ValidationError[] = [];
  const fatal = (field: ValidationError["field"], message: string) => errors.push({ field, message, severity: "FATAL" });
  const warn = (field: ValidationError["field"], message: string) => errors.push({ field, message, severity: "WARNING" });

  // --- 0) Finite checks first — catches NaN/Infinity before anything else runs ---
  const numericFields: (keyof SCInputs)[] = [
    "ik3", "xr", "tk1", "vsys", "freq", "lspan", "li", "dg", "aph", "clph",
    "H", "fst_kg", "nc", "as", "As", "ds", "mc", "E", "sigma_fin",
    "ls", "ms", "md", "h_drop", "w_drop", "S", "cth",
  ];
  for (const f of numericFields) {
    if (!isFiniteNumber(inp[f])) fatal(f, `Must be a finite number (got ${String(inp[f])}).`);
  }
  if (errors.some(e => e.severity === "FATAL")) return { errors, hasFatal: true }; // stop here — rest of checks assume finite values

  // --- 1) Geometry ---
  if (inp.lspan <= 0) fatal("lspan", "Span length must be > 0.");
  if (inp.li < 0) fatal("li", "Insulator length cannot be negative.");
  if (inp.dg < 0) fatal("dg", "Girder gap cannot be negative.");
  const lc = inp.lspan - 2 * inp.li - inp.dg;
  if (lc <= 0) fatal("lspan/li/dg", `Effective span lc (${lc.toFixed(3)}m) must be > 0.`);
  if (inp.aph <= 0) fatal("aph", "Phase spacing must be > 0.");
  if (inp.clph <= 0) warn("clph", "Required clearance <= 0; clearance check may be meaningless.");
  if (inp.H <= 0) warn("H", "Attachment height should normally be > 0.");

  // --- 2) Electrical ---
  if (inp.ik3 <= 0) fatal("ik3", "Short-circuit current ik3 must be > 0.");
  if (inp.xr <= 0) fatal("xr", "X/R ratio must be > 0 (used in exp(-3/xr)).");
  else if (inp.xr < 0.5) warn("xr", "X/R ratio unusually low (<0.5) — verify intentional.");
  if (inp.tk1 <= 0) fatal("tk1", "Fault duration tk1 must be > 0.");
  if (inp.freq !== 50 && inp.freq !== 60) warn("freq", "Frequency is not 50/60 Hz — confirm.");
  if (inp.vsys <= 0) warn("vsys", "System voltage should be > 0 (informational field).");

  // --- 3) Conductor / Bundle ---
  if (!Number.isInteger(inp.nc) || inp.nc < 1) fatal("nc", "nc must be an integer >= 1.");
  if (inp.As <= 0) fatal("As", "Cross-sectional area As must be > 0.");
  if (inp.ds <= 0) fatal("ds", "Conductor diameter ds must be > 0.");
  if (inp.mc <= 0) fatal("mc", "Mass per unit length mc must be > 0.");
  if (inp.E <= 0) fatal("E", "Young's modulus E must be > 0.");
  if (inp.sigma_fin <= 0) fatal("sigma_fin", "Final stress limit sigma_fin must be > 0.");
  if (inp.cth < 0) warn("cth", "Thermal expansion constant is negative — unusual.");

  if (inp.nc > 1) {
    if (inp.as <= 0) fatal("as", "Bundle spacing 'as' must be > 0 when nc > 1.");
    else if (inp.as <= inp.ds * 1e-3) warn("as", "'as' <= conductor diameter — check units (as in m, ds in mm); pre-fault clash implied.");
    if (inp.ls <= 0) fatal("ls", "Spacer span ls must be > 0 when nc > 1.");
  } else if (inp.as > 0) {
    warn("as", "nc = 1: bundle spacing 'as' is ignored.");
  }

  // --- 4) Mechanical / Support ---
  if (inp.fst_kg <= 0) fatal("fst_kg", "Static tension must be > 0 (denominator in sag calc).");
  if (inp.S <= 0) fatal("S", "Support stiffness S must be > 0 (denominator in N calc).");

  // --- 5) Spacer / Dropper ---
  if (inp.ms < 0) warn("ms", "Spacer mass cannot be negative.");
  if (inp.md < 0) warn("md", "Dropper mass cannot be negative.");
  if (inp.h_drop < 0 || inp.w_drop < 0) warn("h_drop/w_drop", "Dropper geometry cannot be negative.");

  // --- 6) Enum validation ---
  if (inp.dropperPlane !== "perpendicular" && inp.dropperPlane !== "parallel") {
    fatal("dropperPlane", `Invalid value '${inp.dropperPlane}' — must be 'perpendicular' or 'parallel'.`);
  }

  if (inp.ffdMethod !== undefined &&
      inp.ffdMethod !== "OCR_Recon" &&
      inp.ffdMethod !== "AI_Candidate" &&
      inp.ffdMethod !== "DISABLED") {
    fatal("ffdMethod", `Invalid value '${inp.ffdMethod}' — must be 'OCR_Recon', 'AI_Candidate', or 'DISABLED'.`);
  }

  return { errors, hasFatal: errors.some(e => e.severity === "FATAL") };
}
