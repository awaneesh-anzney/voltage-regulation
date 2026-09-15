import { VerificationTag } from "@/lib/types/verification";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, HelpCircle } from "lucide-react";

const BADGE_CONFIG: Record<VerificationTag, { label: string; classes: string; Icon: React.ElementType }> = {
  VERIFIED: {
    label: "Verified",
    classes: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    Icon: CheckCircle2,
  },
  APPROXIMATE: {
    label: "Approximate",
    classes: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    Icon: AlertTriangle,
  },
  UNVERIFIED_CANDIDATE: {
    label: "Unverified",
    classes: "bg-red-500/10 border-red-500/20 text-red-400",
    Icon: XCircle,
  },
  NOT_YET_ASSESSED: {
    label: "Not Yet Assessed",
    classes: "bg-slate-500/10 border-slate-500/20 text-slate-400",
    Icon: HelpCircle,
  },
};

export function VerificationBadge({ tag, applicable = true }: { tag: VerificationTag; applicable?: boolean }) {
  if (!applicable) {
    return (
      <div title="Not applicable in this configuration" aria-label="Not applicable"
        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border bg-slate-500/10 border-slate-500/20 text-slate-400">
        <MinusCircle className="w-3 h-3" />
        N/A
      </div>
    );
  }
  const { label, classes, Icon } = BADGE_CONFIG[tag];
  return (
    <div title={label} aria-label={label}
      className={`flex items-center shrink-0 whitespace-nowrap gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${classes}`}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}
