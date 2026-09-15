import { useMemo } from "react";
import { buildEngineTrace } from "@/lib/scForcesEngine";
import { TraceParameterRow } from "./TraceParameterRow";
import { VerificationBadge } from "./VerificationBadge";
import type { SCInputs, SCResults } from "@/lib/scForcesEngine";
import type { SCTraceKey } from "@/lib/types/verification";

// Explicit, stable render order — independent of object insertion order
const TRACE_ORDER: SCTraceKey[] = [
  "k", "Fprime", "r", "deltam_deg", "Ftd", "Ffd", "Ffd_ocrRecon", "Ffd_aiCandidate",
  "v2", "v3", "eta", "Fpi", "clearance",
];

export function EquationTrace({ inputs, results }: { inputs: SCInputs; results: SCResults }) {
  const trace = useMemo(() => buildEngineTrace(inputs, results), [inputs, results]);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Governing Design Force</div>
          <div className="text-lg font-bold text-foreground mt-1">
            {trace.governingForce.symbol} = {(trace.governingForce.value / 1000).toFixed(2)} kN
            {trace.governingForce.tiedWith && (
              <span className="text-[11px] text-muted-foreground font-normal ml-2">
                (tied with {trace.governingForce.tiedWith.filter(t => t !== trace.governingForce.symbol).join(", ")})
              </span>
            )}
          </div>
        </div>
        <VerificationBadge tag={trace.governingForce.verification} />
      </div>

      {trace.governingForce.verification === "UNVERIFIED_CANDIDATE" && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 text-red-300 text-[11px] leading-relaxed">
          ⚠️ The governing design force is based on an unverified formula. Use additional engineering
          margin or independently verify before finalizing structural design.
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.04] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Full Calculation Trace
        </div>
        {TRACE_ORDER.filter(key => trace.parameters[key]).map((key) => (
          <TraceParameterRow key={key} param={trace.parameters[key]} />
        ))}
      </div>

      {results.solverDiagnostics && Object.entries(results.solverDiagnostics).some(([, d]) => d && !d.converged) && (
        <div className="bg-card border border-amber-500/20 rounded-xl p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2">Solver Convergence Notes</div>
          {Object.entries(results.solverDiagnostics)
            .filter(([, d]) => d && !d.converged)
            .map(([key, d]) => (
              <div key={key} className="text-[11px] text-amber-300/80">[{key}] {d!.statusMessage}</div>
            ))}
        </div>
      )}
    </div>
  );
}
