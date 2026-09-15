import fs from "node:fs";
import path from "node:path";
import { computeSCForces, getDefaultInputs } from "../src/lib/scForcesEngine";
import type { GoldenCase } from "../fixtures/goldenCase.types";

const fixturesPath = path.join(__dirname, "../fixtures/golden-cases.json");
const cases: GoldenCase[] = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));

// Ffd deliberately excluded — quarantined, never auto-captured except the DISABLED case
// where Ffd=0 is a design guarantee, not a formula result.
const CORE_VERIFIED_KEYS = [
  "r", "deltam_deg", "v2", "v3", "eta", "Ftd", "amin", "clCheck", "Fpi", "clasheff", "ffdMethodSelected",
] as const;

const updated = cases.map((c) => {
  const inputs = { ...getDefaultInputs(), ...c.inputOverrides };
  const result = computeSCForces(inputs);
  const expected: Record<string, unknown> = {};

  for (const key of CORE_VERIFIED_KEYS) {
    if (key in c.expected) expected[key] = (result as any)[key];
  }
  // Special-case: only the disabled fixture may capture Ffd, and only as the guaranteed 0.
  if (c.name === "ffd_disabled") expected.Ffd = result.Ffd;

  return { ...c, expected };
});

fs.writeFileSync(fixturesPath, JSON.stringify(updated, null, 2));
console.log(`Captured baseline for ${updated.length} cases. REVIEW THE DIFF before committing.`);
