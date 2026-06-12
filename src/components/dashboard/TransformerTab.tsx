"use client";

import type { AnalysisData } from "@/lib/gridCalculations";
import { findOptimalTap, calculateRegulation } from "@/lib/gridCalculations";
import { useMemo } from "react";

function GaugeSVG({ loadingPct }: { loadingPct: number }) {
  const cx = 100, cy = 95, r = 70;
  const clampedPct = Math.min(loadingPct, 160);
  const needleAngle = -180 + (clampedPct / 160) * 180;
  const rad = (needleAngle * Math.PI) / 180;
  const nx = cx + (r - 5) * Math.cos(rad);
  const ny = cy + (r - 5) * Math.sin(rad);
  const needleColor = loadingPct > 120 ? "#ef4444" : loadingPct > 100 ? "#f59e0b" : "#10b981";

  const zones = [
    { start: 0, end: (100 / 160) * 180, color: "#10b981" },
    { start: (100 / 160) * 180, end: (120 / 160) * 180, color: "#f59e0b" },
    { start: (120 / 160) * 180, end: (140 / 160) * 180, color: "#ef4444" },
    { start: (140 / 160) * 180, end: 180, color: "#7f1d1d" },
  ];

  return (
    <svg viewBox="0 0 200 120" className="w-[200px] h-[120px]">
      {zones.map((z, i) => {
        const s = { x: cx + r * Math.cos((-180 + z.start) * Math.PI / 180), y: cy + r * Math.sin((-180 + z.start) * Math.PI / 180) };
        const e = { x: cx + r * Math.cos((-180 + z.end) * Math.PI / 180), y: cy + r * Math.sin((-180 + z.end) * Math.PI / 180) };
        const largeArc = (z.end - z.start) > 180 ? 1 : 0;
        return <path key={i} d={`M${s.x},${s.y} A${r},${r} 0 ${largeArc},1 ${e.x},${e.y}`} fill="none" stroke={z.color} strokeWidth="8" opacity="0.3" strokeLinecap="round" />;
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={needleColor} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#1e293b" stroke={needleColor} strokeWidth="2" />
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="16" fontWeight="700" fill={needleColor} fontFamily="var(--font-geist-mono)">{loadingPct.toFixed(1)}%</text>
      <text x={cx} y={cy + 35} textAnchor="middle" fontSize="9" fill="#64748b">Loading</text>
    </svg>
  );
}

export function TransformerTab({ data }: { data: AnalysisData }) {
  const ratedMVA = 100;
  const totalLoad = data.segs.reduce((a, b) => a + b.mva, 0);
  const loadingPct = (totalLoad / ratedMVA) * 100;

  // Simplified IEC 60076-7 hot-spot
  const ambientTemp = (data as any).ambientTemp || 35;
  const ratedHotspot = 78;
  const hotspot = ambientTemp + (ratedHotspot - ambientTemp) * Math.pow(loadingPct / 100, 1.6);
  const agingRate = Math.pow(2, (hotspot - 98) / 6);

  const loadColor = loadingPct > 120 ? "text-red-400" : loadingPct > 100 ? "text-amber-400" : "text-emerald-400";
  const loadStatus = loadingPct > 140 ? "CRITICAL" : loadingPct > 120 ? "Emergency Overload" : loadingPct > 100 ? "Planned Overload" : "Normal";

  const optimalTap = useMemo(
    () => findOptimalTap(data.segs, data.Vn, data.R, data.X, data.pf, data.limit),
    [data]
  );

  // Tap sensitivity table
  const tapRows = useMemo(() => {
    const rows: { tap: number; vs: number; reg: number; status: "ok" | "warn" | "danger" }[] = [];
    for (let tap = -5; tap <= 7.5; tap += 2.5) {
      const vs = data.Vn * (1 + tap / 100);
      const c = calculateRegulation(data.segs, data.Vn, data.R, data.X, data.pf, data.limit, tap, false, "0", 0);
      const pr = parseFloat(c.results[c.results.length - 1]?.cumReg || "0");
      rows.push({ tap, vs, reg: pr, status: pr > data.limit ? "danger" : pr > data.limit * 0.8 ? "warn" : "ok" });
    }
    return rows;
  }, [data]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Rated Capacity", value: `${ratedMVA} MVA`, sub: "Nameplate", color: "text-slate-100" },
          { label: "Current Loading", value: `${loadingPct.toFixed(1)}%`, sub: loadStatus, color: loadColor },
          { label: "Hot-Spot Temp", value: `${hotspot.toFixed(0)}°C`, sub: "IEC 60076-7", color: hotspot > 120 ? "text-red-400" : hotspot > 98 ? "text-amber-400" : "text-emerald-400" },
          { label: "Life Consumption", value: `${agingRate.toFixed(1)}x`, sub: "relative to normal", color: agingRate > 4 ? "text-red-400" : agingRate > 2 ? "text-amber-400" : "text-emerald-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#111827] border border-white/[0.06] rounded-xl p-4">
            <div className="text-[11px] font-medium text-slate-500 mb-1.5">{kpi.label}</div>
            <div className={`font-mono text-[22px] font-semibold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[10px] text-slate-600 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gauge */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-[13px] font-semibold mb-4">🔋 Loading Gauge</h3>
          <div className="flex items-center justify-center py-2">
            <GaugeSVG loadingPct={loadingPct} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { range: "≤100%", label: "Normal", bg: "bg-emerald-500/10", color: "text-emerald-400", border: "border-emerald-500/15" },
              { range: "≤120%", label: "Planned Overload", bg: "bg-amber-500/10", color: "text-amber-400", border: "border-amber-500/15" },
              { range: "≤140%", label: "Emergency", bg: "bg-red-500/10", color: "text-red-400", border: "border-red-500/15" },
            ].map((z) => (
              <div key={z.label} className={`${z.bg} border ${z.border} rounded-md p-3 text-center`}>
                <div className={`font-mono text-base font-semibold ${z.color}`}>{z.range}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{z.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* OLTC Analysis */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-[13px] font-semibold mb-4">⚙️ OLTC Tap Analysis</h3>
          <div className="space-y-2 mb-4">
            {[
              ["Current Tap Position", "0.00%"],
              ["Sending Voltage", `${data.Vs.toFixed(1)} kV`],
              ["Nominal Voltage", `${data.Vn} kV`],
              ["Tap Steps Available", "-10% to +10% (1.25%)"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-xs text-slate-400">
                <span>{label}</span>
                <span className="font-mono font-semibold text-blue-400">{value}</span>
              </div>
            ))}
          </div>

          {/* AI Recommendation */}
          <div className="bg-blue-500/[0.08] border border-blue-500/15 rounded-lg p-3 mb-4">
            <div className="text-[11px] font-semibold text-blue-400 mb-1.5 flex items-center gap-1.5">✨ AI Recommendation</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              Optimal tap position: <strong className="text-blue-400">{optimalTap >= 0 ? "+" : ""}{optimalTap.toFixed(2)}%</strong>. This minimizes end-of-line voltage deviation while keeping regulation within the {data.limit}% limit.
            </div>
          </div>

          {/* Tap Sensitivity Table */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-2">Tap Position Sensitivity</div>
            <div className="overflow-x-auto green-scrollbar -mx-3 sm:-mx-0">
            <table className="w-full text-[11px] min-w-[400px]">
              <thead>
                <tr className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-2 py-1.5 border-b border-white/[0.06]">Tap</th>
                  <th className="text-left px-2 py-1.5 border-b border-white/[0.06]">Send V (kV)</th>
                  <th className="text-left px-2 py-1.5 border-b border-white/[0.06]">Peak Reg %</th>
                  <th className="text-left px-2 py-1.5 border-b border-white/[0.06]">Status</th>
                </tr>
              </thead>
              <tbody>
                {tapRows.map((row) => (
                  <tr key={row.tap} className="hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 border-b border-white/[0.06] font-mono text-slate-400">{row.tap >= 0 ? "+" : ""}{row.tap.toFixed(1)}%</td>
                    <td className="px-2 py-1.5 border-b border-white/[0.06] font-mono text-slate-400">{row.vs.toFixed(1)}</td>
                    <td className="px-2 py-1.5 border-b border-white/[0.06] font-mono font-semibold text-slate-100">{row.reg.toFixed(2)}%</td>
                    <td className="px-2 py-1.5 border-b border-white/[0.06]">
                      <span className={`inline-flex text-[9px] font-semibold px-2 py-0.5 rounded-full border ${row.status === "ok" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" : row.status === "warn" ? "bg-amber-500/10 text-amber-400 border-amber-500/15" : "bg-red-500/10 text-red-400 border-red-500/15"}`}>
                        {row.status === "ok" ? "OK" : row.status === "warn" ? "Near" : "Over"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
