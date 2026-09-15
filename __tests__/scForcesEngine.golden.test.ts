import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { computeSCForces, getDefaultInputs } from "../src/lib/scForcesEngine";
import type { GoldenCase } from "../fixtures/goldenCase.types";

const goldenCases: GoldenCase[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "fixtures/golden-cases.json"), "utf8")
);

// Per-key absolute tolerance — magnitude-aware, not a blanket decimal-place rule
const TOL_ABS: Record<string, number> = {
  r: 1e-4,
  deltam_deg: 1e-2,      // 0.01 deg
  v2: 1e-4,
  v3: 1e-4,
  eta: 1e-4,
  Ftd: 1,                // 1 N absolute, meaningful for kN-scale forces
  Fpi: 1,
  amin: 1e-4,            // 0.1 mm
};

function expectClose(actual: number, expected: number, key: string, caseName: string) {
  const tol = TOL_ABS[key] ?? 1e-6;
  expect(Math.abs(actual - expected), `${key} mismatch in ${caseName}: expected ${expected}, got ${actual}`).toBeLessThanOrEqual(tol);
}

describe("SC Forces — golden regression", () => {
  goldenCases.forEach((c) => {
    const label = `${c.validationStatus === "EXTERNAL_PDF_MATCH" ? "[PDF-VALIDATED] " : "[regression] "}${c.name}`;

    it(label, () => {
      const inputs = { ...getDefaultInputs(), ...c.inputOverrides };
      const result = computeSCForces(inputs);

      Object.entries(c.expected).forEach(([key, expectedValue]) => {
        if (expectedValue === null) return;

        // Ffd is quarantined everywhere except the explicit DISABLED-guarantee case
        if (key === "Ffd" && c.name !== "ffd_disabled") return;

        const actual = (result as any)[key];
        if (typeof expectedValue === "number") {
          expectClose(actual, expectedValue, key, c.name);
        } else {
          expect(actual, `${key} mismatch in ${c.name}`).toEqual(expectedValue);
        }
      });
    });
  });

  it("engine never throws on any golden fixture (fixtures are curated-valid by design)", () => {
    goldenCases.forEach((c) => {
      const inputs = { ...getDefaultInputs(), ...c.inputOverrides };
      expect(() => computeSCForces(inputs), `${c.name} should not throw`).not.toThrow();
    });
  });

  // Real enforcement — hard fails the suite if someone smuggles an Ffd numeric assertion in
  it("Ffd remains hard-quarantined from correctness assertions", () => {
    const violations = goldenCases.filter(
      (c) => c.name !== "ffd_disabled" && typeof c.expected.Ffd === "number"
    );
    if (violations.length > 0) {
      throw new Error(
        `Ffd quarantine violated in: ${violations.map((c) => c.name).join(", ")}. ` +
        `Ffd formulas are UNVERIFIED_CANDIDATE — do not assert on them outside the DISABLED-guarantee case.`
      );
    }
  });
});
