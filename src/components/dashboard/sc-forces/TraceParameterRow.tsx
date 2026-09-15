import { TraceableParameter } from "@/lib/types/verification";
import { VerificationBadge } from "./VerificationBadge";
import { formatClauseDisplay } from "@/lib/clauseRegistry";

export function TraceParameterRow({ param }: { param: TraceableParameter }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-white/[0.04] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-foreground font-medium">{param.name}</div>
        <div className="text-[10px] text-muted-foreground font-mono">{param.symbol} · {formatClauseDisplay(param.clauseRef)}</div>
        {param.notes && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{param.notes}</div>}
        {param.evidence && <div className="text-[10px] text-emerald-400/70 mt-0.5">✓ {param.evidence}</div>}
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="font-mono text-[13px] text-foreground">
          {param.value === null ? "—" : `${param.value.toFixed(4)} ${param.unit}`}
        </span>
        <VerificationBadge tag={param.verification} applicable={param.applicable} />
      </div>
    </div>
  );
}
