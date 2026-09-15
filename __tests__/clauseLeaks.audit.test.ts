import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") walk(p, out);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const SCOPE_DIRS = [
  "src/lib/scForcesEngine.ts",
  "src/lib/clauseRegistry.ts",
  "src/lib/scValidation.ts",
  "src/lib/types/scForcesTypes.ts",
  "src/components/dashboard/sc-forces/",   // SCForcesInspector, EquationTrace, etc.
  "src/components/v2/SCForcesModule.tsx",  // touched via ClauseId type change
  "src/components/v2/FaultModule.tsx",     // touched via ClauseId type change
  "src/lib/faultSolver.ts",
  "src/lib/registries/faultSolverRegistry.ts",
  "src/lib/registries/sagTensionRegistry.ts",
  "src/components/v2/SagTensionModule.tsx",
];

const ALLOWLISTED_FILES = [
  "scForcesEngine.ts",   // computation engine — developer-only comments, never rendered to UI.
                          // These references are intentionally kept as breadcrumbs for Step 6b
                          // (real clause binding) once a clean IEC standard copy is available.
  "ReportExport.tsx",    // Parked PDF generation feature (Step 5 deferred), contains legacy text.
  "V2ChartPanel.tsx",    // Contains developer comments describing the digitised chart references.
  "faultSolver.ts",      // computation engine — developer-only comments, never rendered to UI.
  "FaultModule.tsx",     // Different module domain (IEC 60909). Parked as tech debt for separate audit.
];

const REGISTRY_DEFINITION_FILES = [
  "clauseRegistry.ts",
  "faultSolverRegistry.ts",
  "sagTensionRegistry.ts",
];

describe("No real-looking IEC clause/equation citations leaked into source", () => {
  it("rejects real clause/equation/annex/figure/table patterns outside the registry", () => {
    const allFiles = walk(path.join(process.cwd(), "src"));
    const files = allFiles.filter((f) =>
      SCOPE_DIRS.some((scoped) => f.replace(/\\/g, "/").includes(scoped))
    );
    const bad: { file: string; line: number; text: string }[] = [];

    const patterns: RegExp[] = [
      /\bcl\.?\s*\d+(\.\d+)*\b/i,
      /\bclause\s+\d+(\.\d+)*\b/i,
      /\beq\.?\s*\d+(\.\d+)*\b/i,
      /\bequation\s+\d+(\.\d+)*\b/i,
      /\bfig\.?\s*\d+\b/i,
      /\btable\s+\d+\b/i,
      /\bannex\s+[a-z](\.\d+)?\b/i,
    ];

    for (const file of files) {
      if (REGISTRY_DEFINITION_FILES.some((f) => file.endsWith(f))) continue;
      if (ALLOWLISTED_FILES.some((allowed) => file.endsWith(allowed))) continue;
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (patterns.some((re) => re.test(line))) {
          bad.push({ file, line: idx + 1, text: line.trim() });
        }
      });
    }

    expect(
      bad,
      `Real-looking citations found — replace with CLAUSE_REGISTRY placeholders or clarify as "unconfirmed":\n` +
        bad.map((b) => `${b.file}:${b.line}  ${b.text}`).join("\n")
    ).toEqual([]);
  });
});
