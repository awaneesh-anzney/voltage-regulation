"use client";

import { AlertCircle, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { SCInputs, SCResults } from "@/lib/scForcesEngine";

interface ValidationPanelProps {
  inputs: SCInputs;
  results: SCResults | null;
}

export function ValidationPanel({ inputs, results }: ValidationPanelProps) {
  const checks = [
    {
      id: "span",
      name: "Span Geometry",
      condition: inputs.lspan > 2 * inputs.li + inputs.dg,
      message: "Effective span lc > 0",
      error: "Span must be greater than 2*li + dg",
    },
    {
      id: "current",
      name: "Short Circuit Current",
      condition: inputs.ik3 > 0,
      message: "ik3 > 0 A",
      error: "Current must be positive",
    },
    {
      id: "tension",
      name: "Static Tension",
      condition: inputs.fst_kg > 0,
      message: "Fst > 0 kg",
      error: "Tension must be positive",
    },
    {
      id: "phase",
      name: "Phase Spacing",
      condition: inputs.aph > 0,
      message: "aph > 0 m",
      error: "Spacing must be positive",
    },
    {
      id: "clearance",
      name: "Phase Clearance",
      condition: inputs.clph > 0,
      message: "clph > 0 m",
      error: "Clearance must be positive",
    },
  ];

  // Specific bundle checks if nc > 1
  if (inputs.nc > 1) {
    checks.push({
      id: "bundle-spacing",
      name: "Bundle Spacing",
      condition: inputs.as > inputs.ds / 1000,
      message: "as > ds",
      error: "Spacing must exceed diameter",
    });
  }

  const allPassed = checks.every(c => c.condition);

  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {checks.map((check) => (
            <div
              key={check.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border ${
                check.condition
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {check.condition ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {check.condition ? `${check.name}: OK` : check.error}
            </div>
          ))}
        </div>
        
        {!allPassed && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Validation Error:</strong> Fix the input parameters above to ensure accurate calculation.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
