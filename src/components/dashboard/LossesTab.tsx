"use client";

import type { AnalysisData } from "@/lib/gridCalculations";

export function LossesTab({ data, dataWithStatcom }: { data: AnalysisData; dataWithStatcom: AnalysisData }) {
  const tariff = (data as any).tariff || 65; // $/MWh
  const loadFactor = (data as any).loadFactor || 0.6;
  const co2Factor = (data as any).co2Factor || 0.82; // kg CO₂/kWh
  const statcomCostM = (data as any).statcomCost || 8.5;

  const annualHours = 8760 * loadFactor;
  const annualEnergyLoss = data.totalActiveLoss * annualHours / 1000;
  const annualCost = annualEnergyLoss * tariff;
  const annualCO2 = annualEnergyLoss * co2Factor;

  // STATCOM savings
  const savedKW = data.totalActiveLoss - dataWithStatcom.totalActiveLoss;
  const savedMWh = savedKW * annualHours / 1000;
  const savedCost = savedMWh * tariff;
  const savedCO2 = savedMWh * co2Factor;
  const payback = savedCost > 0 ? (statcomCostM * 1e6) / savedCost : Infinity;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active Losses (I²R)", value: `${data.totalActiveLoss.toFixed(1)} kW`, color: "text-amber-400" },
          { label: "Reactive Losses (I²X)", value: `${data.totalReactiveLoss.toFixed(1)} kVAR`, color: "text-purple-400" },
          { label: "Annual Cost", value: `$${(annualCost / 1000).toFixed(0)}k`, color: "text-red-400" },
          { label: "Annual CO₂ (tonnes)", value: `${annualCO2.toFixed(0)} t`, color: "text-slate-300" },
        ].map((card) => (
          <div key={card.label} className="bg-[#111827] border border-white/[0.06] rounded-xl p-4 text-center">
            <div className={`font-mono text-xl font-semibold ${card.color}`}>{card.value}</div>
            <div className="text-[10px] text-slate-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Per-Segment Table */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-3 sm:p-5">
        <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2">
          📋 Per-Segment Loss Breakdown
        </h3>
        <div className="overflow-x-auto green-scrollbar -mx-3 sm:-mx-0">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {["Segment", "Distance", "Current (A)", "I²R Loss (kW)", "I²X Loss (kVAR)", "Annual Energy (MWh)", "Annual Cost ($)"].map((h) => (
                <th key={h} className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.results.map((r) => {
              const segLoss = parseFloat(r.activeLoss);
              const segEnergy = segLoss * annualHours / 1000;
              const segCost = segEnergy * tariff;
              return (
                <tr key={r.label} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5 border-b border-white/[0.06] font-semibold text-slate-100">{r.label}</td>
                  <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono text-slate-400">{r.km} km</td>
                  <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono text-slate-400">{r.I} A</td>
                  <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono text-amber-400">{r.activeLoss} kW</td>
                  <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono text-purple-400">{r.reactiveLoss} kVAR</td>
                  <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono text-slate-400">{segEnergy.toFixed(1)}</td>
                  <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono text-slate-400">${segCost.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* STATCOM ROI */}
      <div className="bg-gradient-to-br from-emerald-500/[0.06] to-cyan-500/[0.06] border border-emerald-500/15 rounded-xl p-5">
        <h3 className="text-[13px] font-semibold text-emerald-400 mb-4 flex items-center gap-2">📈 STATCOM ROI Analysis</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "STATCOM Investment", value: `$${statcomCostM.toFixed(1)}M`, color: "text-emerald-400" },
            { label: "Annual Savings", value: `$${(savedCost / 1000).toFixed(0)}k/yr`, color: "text-emerald-400" },
            { label: "CO₂ Saved", value: `${savedCO2.toFixed(0)} t/yr`, color: "text-emerald-400" },
            { label: "Simple Payback", value: `${payback.toFixed(1)} yrs`, color: "text-emerald-400" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className={`font-mono text-lg font-semibold ${item.color}`}>{item.value}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Carbon Impact */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-[13px] font-semibold mb-4">🌿 Carbon Impact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: annualEnergyLoss.toFixed(0), label: "MWh lost / year", color: "text-slate-100" },
            { value: annualCO2.toFixed(0), label: "Tonnes CO₂ / year", color: "text-amber-400" },
            { value: (annualCO2 * 10).toFixed(0), label: "Trees equivalent / year", color: "text-emerald-400" },
          ].map((item) => (
            <div key={item.label} className="text-center p-4 bg-white/[0.02] rounded-md">
              <div className={`font-mono text-2xl font-semibold ${item.color}`}>{item.value}</div>
              <div className="text-[10px] text-slate-500 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          Based on grid emission factor of {co2Factor} kg CO₂/kWh and load factor of {loadFactor}. Reducing losses through conductor upgrades or reactive compensation directly reduces carbon emissions.
        </p>
      </div>
    </div>
  );
}
