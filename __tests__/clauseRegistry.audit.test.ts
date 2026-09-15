import { describe, it, expect } from "vitest";
import { CLAUSE_REGISTRY } from "../src/lib/clauseRegistry";
import { FAULT_SOLVER_REGISTRY } from "../src/lib/registries/faultSolverRegistry";
import { SAG_TENSION_REGISTRY } from "../src/lib/registries/sagTensionRegistry";

describe("Clause Registry — placeholder integrity audit", () => {
  it("every clause ID follows the internal placeholder naming convention", () => {
    // Real IEC clause numbers look like "6.2.6" or "Annex A.7" — our placeholders must NOT match that shape
    const realClausePattern = /^\d+(\.\d+)*$|^Annex\s+[A-Z](\.\d+)?$/i;

    const allRegistries = { ...CLAUSE_REGISTRY, ...FAULT_SOLVER_REGISTRY, ...SAG_TENSION_REGISTRY };
    
    const namingPattern = /^(IEC60865|IEC60909|IS802|IS2026|IS5613|CEA)_[A-Z0-9_]+(_STYLE|_UNCONFIRMED|_APPROXIMATE|_NOT_ASSESSED|_FLAG|_TABLE_DATA_UNAUDITED)$/;

    Object.entries(allRegistries).forEach(([key, value]) => {
      expect(value, `${key} looks like a real clause number, not a placeholder`).not.toMatch(realClausePattern);
      expect(value, `${key} should follow naming convention`).toMatch(namingPattern);
    });
  });

  it("Ffd registry entry explicitly signals unconfirmed status in its ID", () => {
    expect(CLAUSE_REGISTRY.Ffd).toContain("UNCONFIRMED");
  });
});
