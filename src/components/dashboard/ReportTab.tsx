"use client";

import type { AnalysisData } from "@/lib/gridCalculations";
import { CONDUCTORS } from "@/lib/gridCalculations";

export function ReportTab({ data }: { data: AnalysisData }) {
  const { results, Vn, pf, limit, peakReg, totalLen, totalLoad, VR, Vs, totalActiveLoss, totalReactiveLoss, statcomEnabled, statcomMvar, oltcPct } = data;
  const proj = (data as any).projName || "Riyadh North Feeder";
  const client = (data as any).projClient || "SEC – Saudi Electricity";
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  
  // Note: we'd need to lookup the current conductor, but for now we extract from data if possible. 
  // Wait, in `page.tsx` we didn't pass the exact conductor string or name.
  // I will just use `data.R` and `data.X` to find the conductor, or just let it be generic if not found.
  // Actually, I can just use a generic 'Current Conductor' if I don't pass it. Let's pass it in page.tsx later or use 'panther' as default.
  // Wait, I can search `CONDUCTORS` by R and X!
  const currentCond = Object.values(CONDUCTORS).find(c => c.r === data.R && c.x === data.X);
  const condName = currentCond ? currentCond.name : "Custom Conductor";
  
  const ratedMVA = (data as any).xfmrMva || 100;
  const loadingPct = (totalLoad / ratedMVA) * 100;
  const tariff = (data as any).tariff || 65;
  const loadFactor = (data as any).loadFactor || 0.6;
  const annualLossMWh = totalActiveLoss * 8760 * loadFactor / 1000;
  const annualCost = annualLossMWh * tariff;
  const complianceStatus = peakReg > limit ? "NON-COMPLIANT" : "COMPLIANT";

  // AI narrative
  let narrative = `The ${proj} project for ${client} involves a ${Vn} kV transmission feeder spanning ${totalLen.toFixed(1)} km with ${results.length} load segments, analyzed per IEC 60038 standards. `;
  narrative += `The feeder utilizes ${condName} conductor with a power factor of ${pf}. `;
  narrative += `The substation transformer is rated at ${ratedMVA} MVA with current loading at ${loadingPct.toFixed(1)}%. `;
  narrative += `\n\nUnder the analyzed configuration, peak voltage regulation reaches ${peakReg.toFixed(2)}% at the receiving end, `;
  narrative += peakReg > limit ? `which exceeds the statutory ${limit}% limit by ${(peakReg - limit).toFixed(2)} percentage points. ` : `which remains within the ${limit}% regulatory limit. `;
  narrative += `The receiving-end voltage is ${VR.toFixed(1)} kV against a nominal of ${Vn} kV. `;
  narrative += `\n\nTotal active power losses are ${totalActiveLoss.toFixed(1)} kW, translating to an annual energy loss of ${annualLossMWh.toFixed(0)} MWh and an estimated cost of $${(annualCost / 1000).toFixed(0)}k per year at current tariff rates. `;
  if (peakReg > limit) {
    narrative += `\n\nRecommended corrective measures: (1) Conductor upgrade to reduce impedance; (2) STATCOM/SVC installation at the midpoint for dynamic voltage support; (3) OLTC tap adjustment to boost sending-end voltage.`;
  } else {
    narrative += `\n\nThe system is operating within acceptable parameters. Regular monitoring and quarterly performance reviews are recommended.`;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[13px] font-semibold flex items-center gap-2">
            📄 IEC 60038 Compliance Report
          </h3>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/15 transition-all cursor-pointer"
          >
            🖨 Print Report
          </button>
        </div>

        <div className="text-[13px] text-slate-400 leading-[1.9] space-y-4">
          {/* Header */}
          <div className="border-l-[3px] border-blue-500 pl-4 mb-5">
            <div className="text-base font-semibold text-slate-100">{proj}</div>
            <div className="text-xs text-slate-500">{client} · {date} · GridIntel</div>
          </div>

          {/* Status rows */}
          <div className="space-y-1.5">
            {[
              { icon: "📋", text: `Standard: IEC 60038 / CEA Transmission Guidelines`, color: "text-blue-400" },
              { icon: "⚡", text: `Nominal: ${Vn} kV · Sending: ${Vs.toFixed(1)} kV (OLTC ${oltcPct >= 0 ? "+" : ""}${oltcPct.toFixed(1)}%) · Conductor: ${condName}`, color: "text-blue-400" },
              { icon: "📏", text: `Total line: ${totalLen.toFixed(1)} km · ${results.length} segments · PF ${pf}`, color: "text-blue-400" },
              { icon: "🔌", text: `Transformer: ${ratedMVA} MVA · Loading: ${loadingPct.toFixed(1)}%`, color: "text-blue-400" },
              { icon: peakReg > limit ? "⚠️" : "✅", text: "", color: peakReg > limit ? "text-red-400" : "text-emerald-400" },
              { icon: "🔥", text: `Losses: ${totalActiveLoss.toFixed(1)} kW active, ${totalReactiveLoss.toFixed(1)} kVAR reactive · Annual: ${annualLossMWh.toFixed(0)} MWh ($${(annualCost / 1000).toFixed(0)}k)`, color: "text-amber-400" },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-slate-400 py-1.5">
                <span className="text-sm flex-shrink-0">{row.icon}</span>
                {i === 4 ? (
                  <span>Peak regulation: <strong className={peakReg > limit ? "text-red-400" : "text-emerald-400"}>{peakReg.toFixed(2)}%</strong> (limit: {limit}%) — <strong className={peakReg > limit ? "text-red-400" : "text-emerald-400"}>{complianceStatus}</strong></span>
                ) : (
                  <span>{row.text}</span>
                )}
              </div>
            ))}
          </div>

          {/* AI Narrative */}
          <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
            <div className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1.5">✨ AI-Generated Analysis</div>
            <div className="text-xs text-slate-400 leading-[1.8] whitespace-pre-line">{narrative}</div>
          </div>

          {/* Conclusion */}
          <div className={`mt-4 p-4 rounded-lg border ${peakReg > limit ? "bg-red-500/[0.06] border-red-500/15" : "bg-emerald-500/[0.06] border-emerald-500/15"}`}>
            <strong className="text-slate-100">Conclusion: </strong>
            <span className="text-slate-400">
              {peakReg > limit
                ? `This feeder exceeds the ${limit}% regulation limit. Immediate corrective action (conductor upgrade, STATCOM installation, or OLTC adjustment) is recommended before the next peak season.`
                : `This feeder operates within the ${limit}% regulation limit. No immediate action required. Scheduled quarterly review recommended.`
              }
            </span>
          </div>

          <div className="mt-4 text-center text-[10px] text-slate-600">
            Report generated by GridIntel · {date}
          </div>
        </div>
      </div>
    </div>
  );
}
