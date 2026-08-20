"use client";

import { useState } from "react";
import type { TrustBadge, TrustLevel } from "@/lib/trustSystem";
import { AlertTriangle, RefreshCw, CheckCircle2, HelpCircle, XCircle } from "lucide-react";

// ─── Trust Badge ───
const BADGE_CONFIG: Record<TrustLevel, { bg: string; text: string; border: string; icon: React.ElementType; fullLabel: string }> = {
  verified:    { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/25", icon: CheckCircle2, fullLabel: "Verified" },
  approximate: { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/25",   icon: HelpCircle,   fullLabel: "Approximate" },
  unverified:  { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/25",     icon: XCircle,      fullLabel: "Unverified" },
};

export function TrustIndicator({ badge, value, unit }: { badge?: TrustBadge; value: string; unit?: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!badge) {
    return (
      <span className="font-mono text-white">
        {value}{unit && <span className="text-slate-500 ml-1">{unit}</span>}
      </span>
    );
  }

  const config = BADGE_CONFIG[badge.level];
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-1.5 relative">
      <span className="font-mono text-white">
        {value}{unit && <span className="text-slate-500 ml-1">{unit}</span>}
      </span>
      <span
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border cursor-help ${config.bg} ${config.text} ${config.border}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Icon className="w-2.5 h-2.5" />
        {badge.label}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[#1a2235] border border-white/[0.1] rounded-xl shadow-xl z-50 pointer-events-none">
          <div className={`text-[11px] font-bold ${config.text} mb-1`}>
            {config.fullLabel}
            {badge.tolerance && <span className="text-slate-500 font-normal ml-1">{badge.tolerance}</span>}
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed">{badge.detail}</div>
          <div className="text-[10px] text-slate-600 mt-1.5 font-mono">📎 {badge.source}</div>
        </div>
      )}
    </span>
  );
}

// ─── Stale Data Warning Banner ───
export function StaleWarning({ message, onRecalculate, onDismiss }: {
  message: string;
  onRecalculate: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 animate-in slide-in-from-top-2 duration-300">
      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-amber-300">⚠️ Stale Results</div>
        <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{message}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRecalculate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/25 hover:bg-amber-500/25 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          Recalculate
        </button>
        <button
          onClick={onDismiss}
          className="px-2 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── IEC Reference Link (contextual) ───
export function IECRef({ clause, description }: { clause: string; description: string }) {
  const [showTip, setShowTip] = useState(false);

  return (
    <span className="relative inline-flex">
      <span
        className="text-[10px] text-slate-600 hover:text-blue-400 cursor-help transition-colors inline-flex items-center gap-0.5"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        📎 {clause}
      </span>
      {showTip && (
        <span className="absolute bottom-full left-0 mb-1 px-2.5 py-1.5 bg-[#1a2235] border border-white/[0.1] rounded-lg shadow-xl text-[10px] text-slate-300 whitespace-nowrap z-50 pointer-events-none">
          {description}
        </span>
      )}
    </span>
  );
}
