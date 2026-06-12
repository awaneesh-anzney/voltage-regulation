"use client";

import { useMemo } from "react";
import type { AnalysisData } from "@/lib/gridCalculations";
import { CONDUCTORS } from "@/lib/gridCalculations";

// === Reusable sub-components ===

function KpiCard({ label, value, sub, status }: { label: string; value: string; sub: string; status?: "ok" | "warn" | "danger" }) {
  const color = status === "danger" ? "text-red-400" : status === "warn" ? "text-amber-400" : status === "ok" ? "text-emerald-400" : "text-slate-100";
  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4 relative overflow-hidden group hover:border-white/[0.1] transition-all">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="text-[11px] font-medium text-slate-500 mb-1.5">{label}</div>
      <div className={`font-mono text-[22px] font-semibold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-600 mt-1 font-mono">{sub}</div>
    </div>
  );
}

function StatusPill({ status }: { status: "ok" | "warn" | "danger" }) {
  const styles = {
    ok: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
    warn: "bg-amber-500/10 text-amber-400 border-amber-500/15",
    danger: "bg-red-500/10 text-red-400 border-red-500/15",
  };
  const labels = { ok: "✓ Within", warn: "⚠ Near", danger: "✗ Exceeded" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// === Voltage Profile SVG ===
function VoltageProfileChart({ data }: { data: AnalysisData }) {
  const { results, limit, Vs } = data;
  const W = 420, H = 190, padL = 42, padR = 20, padT = 20, padB = 40;
  const pts = [{ label: "Send", cum: 0, V: Vs }, ...results.map((r) => ({ label: r.label, cum: parseFloat(r.cumReg), V: parseFloat(r.Vcurrent) }))];
  const maxReg = Math.max(limit * 1.4, Math.max(...pts.map((p) => p.cum)) * 1.2, 0.1);
  const n = pts.length;
  const xStep = (W - padL - padR) / (n - 1);
  const yScale = (v: number) => (H - padT - padB) * (1 - v / maxReg) + padT;
  const limitY = yScale(limit);
  const lineColor = pts[pts.length - 1].cum > limit ? "#ef4444" : pts[pts.length - 1].cum > limit * 0.8 ? "#f59e0b" : "#10b981";

  const areaPath = `M${padL},${H - padB} ${pts.map((p, i) => `L${padL + i * xStep},${yScale(p.cum)}`).join(" ")} L${padL + (n - 1) * xStep},${H - padB} Z`;
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${padL + i * xStep},${yScale(p.cum)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[190px]">
      {/* Grid */}
      <rect x={padL} y={padT} width={W - padL - padR} height={H - padT - padB} fill="rgba(255,255,255,0.01)" rx="4" />
      {[0, limit / 2, limit].map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={yScale(v)} y2={yScale(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          <text x={padL - 6} y={yScale(v) + 3} textAnchor="end" fontSize="9" fill="#64748b" fontFamily="var(--font-geist-mono)">{v.toFixed(1)}%</text>
        </g>
      ))}
      {/* Limit line */}
      <line x1={padL} x2={W - padR} y1={limitY} y2={limitY} stroke="#f59e0b" strokeWidth="1" strokeDasharray="6,4" opacity="0.7" />
      <text x={W - padR} y={limitY - 6} textAnchor="end" fontSize="10" fontWeight="600" fill="#f59e0b" fontFamily="var(--font-geist-mono)">Limit {limit}%</text>
      {/* Area */}
      <path d={areaPath} fill={lineColor} opacity="0.06" />
      {/* Line */}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Points */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={padL + i * xStep} cy={yScale(p.cum)} r="5" fill={lineColor} stroke="#111827" strokeWidth="2" />
          <text x={padL + i * xStep} y={yScale(p.cum) - 12} textAnchor="middle" fontSize="10" fontWeight="600" fill={lineColor} fontFamily="var(--font-geist-mono)">{p.cum.toFixed(1)}%</text>
          <text x={padL + i * xStep} y={H - padB + 16} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="var(--font-geist-mono)">{p.label}</text>
        </g>
      ))}
      <text x={padL + (W - padL - padR) / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#475569">Cumulative regulation by segment</text>
    </svg>
  );
}

// === SLD Diagram ===
function SLDDiagram({ data }: { data: AnalysisData }) {
  const { results, Vs, limit, statcomEnabled, statcomBus, statcomMvar } = data;
  const W = 520, H = 200;
  const n = results.length;
  const startX = 70, endX = W - 40;
  const busY = 85;
  const spacing = (endX - startX) / (n + 1);
  const conductor = "panther";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[200px]">
      {/* Grid source */}
      <rect x="18" y={busY - 22} width="32" height="44" rx="4" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
      <text x="34" y={busY + 4} textAnchor="middle" fontSize="9" fontWeight="600" fill="#3b82f6">GRID</text>
      <text x="34" y={busY + 36} textAnchor="middle" fontSize="8" fill="#64748b">{Vs.toFixed(1)} kV</text>

      {/* Transformer */}
      <line x1="50" y1={busY} x2={startX - 12} y2={busY} stroke="#3b82f6" strokeWidth="2" />
      <circle cx={startX - 4} cy={busY} r="10" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
      <circle cx={startX + 8} cy={busY} r="10" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
      <text x={startX + 2} y={busY - 18} textAnchor="middle" fontSize="8" fontWeight="600" fill="#94a3b8">XFMR</text>
      <text x={startX + 2} y={busY + 30} textAnchor="middle" fontSize="7" fill="#64748b">OLTC: 0.0%</text>

      {/* Buses */}
      {results.map((r, i) => {
        const bx = startX + (i + 1) * spacing;
        const prevX = i === 0 ? startX + 18 : startX + i * spacing;
        const regPct = parseFloat(r.cumReg);
        const nodeColor = regPct > limit ? "#ef4444" : regPct > limit * 0.8 ? "#f59e0b" : "#10b981";
        const loadPct = Math.min(parseFloat(r.I) / (CONDUCTORS[conductor]?.ampacity || 400), 1);
        const lineWidth = 1.5 + loadPct * 3;

        return (
          <g key={i}>
            <line x1={prevX} y1={busY} x2={bx} y2={busY} stroke={nodeColor} strokeWidth={lineWidth} opacity="0.7" />
            <circle cx={bx} cy={busY} r="8" fill={nodeColor} opacity="0.15" stroke={nodeColor} strokeWidth="1.5" className="cursor-pointer" />
            <text x={bx} y={busY + 4} textAnchor="middle" fontSize="8" fontWeight="600" fill={nodeColor}>{r.label}</text>
            <text x={bx} y={busY - 18} textAnchor="middle" fontSize="9" fontWeight="500" fill={nodeColor} fontFamily="var(--font-geist-mono)">{r.Vcurrent} kV</text>
            {/* Load arrow */}
            <line x1={bx} y1={busY + 12} x2={bx} y2={busY + 40} stroke="#64748b" strokeWidth="1" strokeDasharray="3,2" />
            <polygon points={`${bx - 4},${busY + 36} ${bx + 4},${busY + 36} ${bx},${busY + 42}`} fill="#64748b" />
            <text x={bx} y={busY + 56} textAnchor="middle" fontSize="8" fill="#64748b">{r.mva} MVA</text>
            {/* STATCOM */}
            {statcomEnabled && i === parseInt(statcomBus) && (
              <g>
                <line x1={bx} y1={busY - 12} x2={bx} y2={busY - 40} stroke="#a78bfa" strokeWidth="1.5" />
                <polygon points={`${bx - 8},${busY - 40} ${bx + 8},${busY - 40} ${bx},${busY - 52}`} fill="none" stroke="#a78bfa" strokeWidth="1.5" />
                <text x={bx} y={busY - 56} textAnchor="middle" fontSize="7" fontWeight="600" fill="#a78bfa">STATCOM</text>
                <text x={bx} y={busY - 66} textAnchor="middle" fontSize="7" fill="#a78bfa">+{statcomMvar} MVAR</text>
              </g>
            )}
          </g>
        );
      })}

      {/* End Load */}
      <rect x={endX - 15} y={busY - 10} width="30" height="20" rx="3" fill="none" stroke="#64748b" strokeWidth="1" />
      <text x={endX} y={busY + 4} textAnchor="middle" fontSize="8" fill="#64748b">LOAD</text>
    </svg>
  );
}

// === Main Export ===
export function AnalyzerTab({ data, dataWithStatcom }: { data: AnalysisData; dataWithStatcom: AnalysisData }) {
  const { results, peakReg, limit, Vn, totalLen, totalLoad, VR, Vs, totalActiveLoss, totalReactiveLoss } = data;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Peak Regulation" value={`${peakReg.toFixed(2)}%`} sub={`Limit: ${limit}%`} status={peakReg > limit ? "danger" : peakReg > limit * 0.8 ? "warn" : "ok"} />
        <KpiCard label="Total Length" value={`${totalLen.toFixed(0)} km`} sub={`${results.length} segments`} />
        <KpiCard label="Receiving Voltage" value={`${VR.toFixed(1)} kV`} sub={`Send: ${Vs.toFixed(1)} kV`} status={peakReg > limit ? "danger" : "ok"} />
        <KpiCard label="Total Load" value={`${totalLoad.toFixed(0)} MVA`} sub={`PF ${data.pf}`} />
        <KpiCard label="Total Losses" value={`${totalActiveLoss.toFixed(1)} kW`} sub={`${totalReactiveLoss.toFixed(1)} kVAR`} status={totalActiveLoss > totalLoad * 10 ? "warn" : "ok"} />
      </div>

      {/* SLD + Voltage Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-3 sm:p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold flex items-center gap-2">
              <span className="text-slate-500 text-base">⚡</span> Single-Line Diagram
            </h3>
            <span className="text-[11px] text-slate-500 hidden sm:inline">Interactive · Hover for details</span>
          </div>
          <div className="min-w-[480px]">
            <SLDDiagram data={data} />
          </div>
        </div>
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-3 sm:p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold flex items-center gap-2">
              <span className="text-slate-500 text-base">📈</span> Voltage Profile
            </h3>
            <span className="text-[11px] text-slate-500">Limit: {limit}%</span>
          </div>
          <div className="min-w-[400px]">
            <VoltageProfileChart data={data} />
          </div>
        </div>
      </div>

      {/* STATCOM Before/After */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-3 sm:p-5">
        <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2">
          <span className="text-purple-400">◆</span> STATCOM Impact Comparison
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_40px_1fr] items-stretch gap-3 sm:gap-0">
          {/* Before */}
          <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.06]">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Without STATCOM</div>
            {[
              ["Peak Regulation", `${data.peakReg.toFixed(2)}%`, data.peakReg > limit ? "text-red-400" : "text-emerald-400"],
              ["Receiving Voltage", `${data.VR.toFixed(1)} kV`, "text-slate-100"],
              ["Active Losses", `${data.totalActiveLoss.toFixed(1)} kW`, "text-slate-100"],
            ].map(([label, value, color]) => (
              <div key={label} className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>{label}</span>
                <span className={`font-mono font-semibold ${color}`}>{value}</span>
              </div>
            ))}
            <div className="mt-2">
              <StatusPill status={data.peakReg > limit ? "danger" : "ok"} />
            </div>
          </div>
          {/* Arrow */}
          <div className="hidden sm:flex items-center justify-center text-slate-600">→</div>
          <div className="flex sm:hidden items-center justify-center text-slate-600 py-1">↓</div>
          {/* After */}
          <div className="bg-emerald-500/[0.06] rounded-lg p-4 border border-emerald-500/20">
            <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-3">With STATCOM (+{dataWithStatcom.statcomMvar} MVAR at {dataWithStatcom.results[parseInt(dataWithStatcom.statcomBus)]?.label})</div>
            {[
              ["Peak Regulation", `${dataWithStatcom.peakReg.toFixed(2)}%`, "text-emerald-400"],
              ["Receiving Voltage", `${dataWithStatcom.VR.toFixed(1)} kV`, "text-slate-100"],
              ["Active Losses", `${dataWithStatcom.totalActiveLoss.toFixed(1)} kW`, "text-slate-100"],
            ].map(([label, value, color]) => (
              <div key={label} className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>{label}</span>
                <span className={`font-mono font-semibold ${color}`}>{value}</span>
              </div>
            ))}
            <div className="mt-2">
              <StatusPill status={dataWithStatcom.peakReg > limit ? "danger" : "ok"} />
            </div>
          </div>
        </div>
      </div>

      {/* Segment Table */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-3 sm:p-5">
        <h3 className="text-[13px] font-semibold mb-4 flex items-center gap-2">
          <span className="text-slate-500">📋</span> Segment-by-Segment Results
        </h3>
        <div className="overflow-x-auto -mx-3 sm:-mx-0">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">Seg</th>
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">Distance</th>
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">Load</th>
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">Current (A)</th>
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">R Drop (kV)</th>
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">X Drop (kV)</th>
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">Cum. Reg (%)</th>
              <th className="text-left px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.label} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-3 py-2.5 border-b border-white/[0.06] font-semibold text-slate-100">{r.label}</td>
                <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono text-slate-400">{r.km} km</td>
                <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono text-slate-400">{r.mva} MVA</td>
                <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono text-slate-400">{r.I} A</td>
                <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono text-slate-400">{r.Rdrop} kV</td>
                <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono text-slate-400">{r.Xdrop} kV</td>
                <td className="px-3 py-2.5 border-b border-white/[0.06] font-mono font-semibold text-slate-100">{r.cumReg}%</td>
                <td className="px-3 py-2.5 border-b border-white/[0.06]"><StatusPill status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
