"use client";

import type { AnalysisData, OptimalConfig } from "@/lib/gridCalculations";
import { CONDUCTORS, findOptimalTap } from "@/lib/gridCalculations";
import { useMemo } from "react";

interface AIRec {
  cat: string;
  text: string;
}

function generateRecs(data: AnalysisData): AIRec[] {
  const { results, peakReg, limit, Vn, pf } = data;
  const recs: AIRec[] = [];
  const lastSeg = results[results.length - 1];
  const condName = CONDUCTORS["panther"].name;
  const ratedMVA = 100;
  const totalLoad = data.segs.reduce((a, b) => a + b.mva, 0);
  const loadingPct = (totalLoad / ratedMVA) * 100;
  const tariff = 65;
  const loadFactor = 0.6;

  if (peakReg > limit) {
    recs.push({ cat: "CONDUCTOR", text: `Regulation at ${lastSeg.label} (${peakReg.toFixed(2)}%) exceeds the ${limit}% limit. Upgrade from ${condName} to Zebra (400 mm²) to reduce losses by ~38% and bring regulation within compliance.` });
  } else if (peakReg > limit * 0.8) {
    recs.push({ cat: "CONDUCTOR", text: `Regulation at ${lastSeg.label} (${peakReg.toFixed(2)}%) is at ${(peakReg / limit * 100).toFixed(0)}% of the ${limit}% limit. Plan a capacity review before next peak season.` });
  }

  if (peakReg > limit * 0.6) {
    const midBus = Math.floor(results.length / 2);
    const recMvar = Math.ceil((peakReg - limit * 0.5) * Vn / 10);
    recs.push({ cat: "COMPENSATION", text: `Install STATCOM/SVC at Bus ${results[midBus]?.label || "S2"} with ${recMvar} MVAR injection capacity. This provides dynamic voltage support and can reduce regulation by ~${(peakReg * 0.4).toFixed(1)}%.` });
  }

  const optTap = findOptimalTap(data.segs, Vn, data.R, data.X, pf, limit);
  if (Math.abs(optTap) > 1) {
    recs.push({ cat: "TAP CHANGER", text: `Current OLTC tap (0.0%) is not optimal. Adjust to ${optTap >= 0 ? "+" : ""}${optTap.toFixed(2)}% for best voltage regulation performance.` });
  }

  if (loadingPct > 80) {
    recs.push({ cat: "TRANSFORMER", text: `Transformer loading at ${loadingPct.toFixed(1)}% — approaching rated limit. With 5% annual growth, capacity will be exceeded by ${new Date().getFullYear() + Math.floor((100 - loadingPct) / 5)}.` });
  }

  if (pf < 0.95) {
    recs.push({ cat: "POWER FACTOR", text: `Power factor of ${pf} is below 0.95. Installing switched capacitor banks could reduce reactive losses and improve voltage profile by ~0.3-0.5%.` });
  }

  const annualLossCost = data.totalActiveLoss * 8760 * loadFactor / 1000 * tariff;
  if (annualLossCost > 50000) {
    recs.push({ cat: "ECONOMIC", text: `Annual energy loss cost is $${(annualLossCost / 1000).toFixed(0)}k. Conductor upgrade or reactive compensation could save $${(annualLossCost * 0.35 / 1000).toFixed(0)}k/year with a ${(10 / (annualLossCost * 0.35 / 1e6)).toFixed(1)}-year payback.` });
  }

  recs.push({
    cat: "COMPLIANCE",
    text: peakReg > limit
      ? `⚠ IEC 60038 NON-COMPLIANT: Voltage regulation ${peakReg.toFixed(2)}% exceeds the statutory ${limit}% limit. Corrective action required.`
      : `✓ IEC 60038 COMPLIANT: All segments within the ${limit}% voltage regulation limit. Scheduled quarterly review recommended.`
  });

  return recs;
}

export function AIInsightsTab({ data, optimalConfig }: { data: AnalysisData; optimalConfig: OptimalConfig }) {
  const recs = useMemo(() => generateRecs(data), [data]);
  const improvement = data.peakReg > 0 ? ((data.peakReg - optimalConfig.peakReg) / data.peakReg * 100).toFixed(0) : "0";

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* AI Recommendations */}
      <div className="bg-gradient-to-br from-blue-500/[0.06] to-purple-500/[0.06] border border-blue-500/12 rounded-xl p-5">
        <h3 className="text-[13px] font-semibold text-blue-400 mb-4 flex items-center gap-2">
          ✨ Smart Recommendations
        </h3>
        <div className="space-y-3">
          {recs.map((rec, i) => (
            <div key={i} className="flex gap-3 pb-3 border-b border-blue-500/[0.08] last:border-b-0 last:pb-0">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-wider text-purple-400 mb-0.5">{rec.cat}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{rec.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Optimizer Result */}
      <div className="bg-gradient-to-br from-purple-500/[0.08] to-blue-500/[0.06] border border-purple-500/15 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">🧠 AI Optimizer — Best Configuration</h3>

        {/* Config cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { label: "OLTC TAP", value: `${optimalConfig.tap >= 0 ? "+" : ""}${optimalConfig.tap.toFixed(1)}%` },
            { label: "STATCOM", value: optimalConfig.statcomMvar > 0 ? `+${optimalConfig.statcomMvar} MVAR at S${optimalConfig.statcomBus + 1}` : "Not needed" },
            { label: "CONDUCTOR", value: CONDUCTORS[optimalConfig.conductor]?.name || optimalConfig.conductor },
          ].map((item) => (
            <div key={item.label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">{item.label}</div>
              <div className="font-mono text-sm font-semibold text-purple-400">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Before/After */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_40px_1fr] items-stretch gap-3 sm:gap-0">
          <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.06]">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Current</div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Peak Reg</span>
              <span className={`font-mono font-semibold ${data.peakReg > data.limit ? "text-red-400" : "text-emerald-400"}`}>{data.peakReg.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Losses</span>
              <span className="font-mono font-semibold text-slate-100">{data.totalActiveLoss.toFixed(1)} kW</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center justify-center text-slate-600">→</div>
          <div className="flex sm:hidden items-center justify-center text-slate-600 py-1">↓</div>
          <div className="bg-emerald-500/[0.06] rounded-lg p-4 border border-emerald-500/20">
            <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-3">Optimized ({improvement}% better)</div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Peak Reg</span>
              <span className="font-mono font-semibold text-emerald-400">{optimalConfig.peakReg.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Losses</span>
              <span className="font-mono font-semibold text-slate-100">{optimalConfig.totalLoss.toFixed(1)} kW</span>
            </div>
          </div>
        </div>

        <button className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/15 transition-all cursor-pointer">
          ✓ Apply Optimal Configuration
        </button>
      </div>
    </div>
  );
}
