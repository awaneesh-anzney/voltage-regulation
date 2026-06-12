"use client";

import type { AnalysisData } from "@/lib/gridCalculations";
import { CONDUCTORS, calculateRegulation } from "@/lib/gridCalculations";

export function ContingencyTab({ data }: { data: AnalysisData }) {
  const { results, Vn, limit, segs } = data;
  const currentCondEntry = Object.entries(CONDUCTORS).find(([k, c]) => c.r === data.R && c.x === data.X);
  const currentCondKey = currentCondEntry ? currentCondEntry[0] : "panther";
  const conductorKeys = Object.keys(CONDUCTORS);
  const currentCondIdx = conductorKeys.indexOf(currentCondKey);

  const contingencyCards = results.map((seg, i) => {
    const extraLoad = segs[i].mva;
    const regImpact = parseFloat((parseFloat(results[results.length - 1]?.cumReg || "0") + (extraLoad / Vn) * 2).toFixed(2));
    const status: "ok" | "warn" | "danger" = regImpact > limit ? "danger" : regImpact > limit * 0.8 ? "warn" : "ok";
    return { label: seg.label, regImpact, status };
  });

  const upgrades = [
    { name: `Current: ${CONDUCTORS[currentCondKey]?.name || "Custom"}`, reg: `${data.peakReg.toFixed(2)}%`, loss: "Baseline", impact: "—", idx: 0 },
  ];

  for (let i = currentCondIdx + 1; i < conductorKeys.length; i++) {
    const cKey = conductorKeys[i];
    const cond = CONDUCTORS[cKey];
    
    // Calculate new results with this conductor
    const calc = calculateRegulation(
      data.segs, data.Vn, cond.r, cond.x, data.pf, data.limit, 
      data.oltcPct, data.statcomEnabled, data.statcomBus, data.statcomMvar
    );
    
    const newPeakReg = parseFloat(calc.results[calc.results.length - 1]?.cumReg || "0");
    let lossRedPct = 0;
    if (data.totalActiveLoss > 0) {
      lossRedPct = ((data.totalActiveLoss - calc.totalActiveLoss) / data.totalActiveLoss) * 100;
    }
    
    const impact = lossRedPct > 45 ? "Very High" : lossRedPct > 20 ? "High" : "Moderate";
    
    upgrades.push({
      name: cond.name,
      reg: `${newPeakReg.toFixed(2)}%`,
      loss: `~${lossRedPct.toFixed(0)}% reduction`,
      impact: impact,
      idx: i - currentCondIdx + 1 // To ensure different colors in JSX
    });
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* N-1 Scenarios */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold flex items-center gap-2">⚠️ N-1 Contingency Scenarios</h3>
          <span className="text-[11px] text-slate-500">What if one segment trips?</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {contingencyCards.map((card) => {
            const colors = {
              ok: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
              warn: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/15" },
              danger: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/15" },
            }[card.status];
            return (
              <div key={card.label} className="bg-[#111827] border border-white/[0.06] rounded-lg p-4 hover:border-white/[0.1] transition-all">
                <div className="text-xs font-semibold text-slate-100 mb-1.5 flex items-center gap-1.5">
                  <span className={card.status === "danger" ? "text-red-400" : "text-slate-500"}>⚡</span>
                  {card.label} Trips
                </div>
                <div className={`font-mono text-xl font-semibold ${colors.text} mb-1`}>{card.regImpact.toFixed(2)}%</div>
                <div className="text-[10px] text-slate-500 mb-2">Peak regulation impact</div>
                <span className={`inline-flex text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {card.status === "ok" ? "✓ Stable" : card.status === "warn" ? "⚠ Monitor" : "✗ Critical"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conductor Upgrade Scenarios */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-3 sm:p-5">
        <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2">⬆️ Conductor Upgrade Scenarios</h3>
        <div className="overflow-x-auto -mx-3 sm:-mx-0">
        <table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">Upgrade Option</th>
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">Peak Regulation</th>
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">Loss Reduction</th>
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">Estimated Impact</th>
            </tr>
          </thead>
          <tbody>
            {upgrades.map((u) => (
              <tr key={u.name} className="hover:bg-white/[0.02] transition-colors">
                <td className={`px-3 py-2.5 border-b border-white/[0.06] ${u.idx === 0 ? "font-semibold text-slate-100" : "text-slate-400"}`}>{u.name}</td>
                <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono font-semibold text-slate-100">{u.reg}</td>
                <td className="px-3 py-2.5 border-b border-white/[0.06] text-slate-400">{u.loss}</td>
                <td className="px-3 py-2.5 border-b border-white/[0.06]">
                  <span className={`inline-flex text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${u.idx === 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" : u.idx === 1 ? "bg-amber-500/10 text-amber-400 border-amber-500/15" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"}`}>
                    {u.impact}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
