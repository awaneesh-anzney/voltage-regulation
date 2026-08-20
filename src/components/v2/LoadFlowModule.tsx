"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Network, Settings2, ChevronDown, ChevronRight, Play, Plus, Trash2,
  CheckCircle2, XCircle, BarChart3, AlertTriangle, Zap, ArrowRightLeft
} from "lucide-react";
import { runNewtonRaphsonLoadFlow } from "@/lib/loadFlowSolver";
import type { Bus, Branch, LoadFlowResult } from "@/lib/loadFlowSolver";

// ─── Smart Input ───
function InputField({ label, value, unit, onChange, step }: {
  label: string; value: number; unit?: string;
  onChange: (v: number) => void; step?: number;
}) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);
  if (!isFocused && localValue !== String(value)) setLocalValue(String(value));

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={isFocused ? localValue : value}
          step={step}
          onFocus={() => { setIsFocused(true); setLocalValue(String(value)); }}
          onChange={(e) => { setLocalValue(e.target.value); const p = parseFloat(e.target.value); if (!isNaN(p)) onChange(p); }}
          onBlur={() => { setIsFocused(false); const p = parseFloat(localValue); if (isNaN(p)) setLocalValue(String(value)); else { onChange(p); setLocalValue(String(p)); } }}
          className="flex-1 bg-[#0a0f18] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white font-mono focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 transition-all"
        />
        {unit && <span className="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/15 text-[10px] text-cyan-400 font-semibold shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

function Section({ title, accent, defaultOpen, children }: {
  title: string; accent: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const accentColors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/8 border-blue-500/15",
    amber: "text-amber-400 bg-amber-500/8 border-amber-500/15",
    purple: "text-purple-400 bg-purple-500/8 border-purple-500/15",
    teal: "text-teal-400 bg-teal-500/8 border-teal-500/15",
  };
  return (
    <div className="border-b border-white/[0.04] last:border-0">
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer hover:bg-white/[0.02] ${accentColors[accent] || accentColors.blue}`}>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>{title}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Default 3-bus system ───
function getDefaultBuses(): Bus[] {
  return [
    { id: 0, name: "Grid (Slack)", type: "Slack", v: 1.05, theta: 0, pGen: 0, qGen: 0, pLoad: 0, qLoad: 0, baseKv: 220 },
    { id: 1, name: "Gen Bus", type: "PV", v: 1.02, theta: 0, pGen: 50, qGen: 0, pLoad: 20, qLoad: 10, baseKv: 220 },
    { id: 2, name: "Load Bus", type: "PQ", v: 1.0, theta: 0, pGen: 0, qGen: 0, pLoad: 100, qLoad: 40, baseKv: 220 },
  ];
}
function getDefaultBranches(): Branch[] {
  return [
    { id: 0, fromBus: 0, toBus: 1, r: 0.02, x: 0.06, b: 0.03 },
    { id: 1, fromBus: 0, toBus: 2, r: 0.04, x: 0.12, b: 0.02 },
    { id: 2, fromBus: 1, toBus: 2, r: 0.03, x: 0.08, b: 0.02 },
  ];
}

// ─── Inspector ───
export function LoadFlowInspector({ buses, branches, onUpdateBus, onUpdateBranch, onAddBus, onAddBranch, onRemoveBus, onRemoveBranch, onSolve, baseMva, onBaseMvaChange }: {
  buses: Bus[]; branches: Branch[];
  onUpdateBus: (idx: number, partial: Partial<Bus>) => void;
  onUpdateBranch: (idx: number, partial: Partial<Branch>) => void;
  onAddBus: () => void; onAddBranch: () => void;
  onRemoveBus: (idx: number) => void; onRemoveBranch: (idx: number) => void;
  onSolve: () => void;
  baseMva: number; onBaseMvaChange: (v: number) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5">
          <Settings2 className="w-4 h-4 text-blue-400" />
          Load Flow Parameters
        </h3>
        <p className="text-[10px] text-slate-600 mt-0.5">Newton-Raphson Method</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <Section title="System" accent="blue" defaultOpen>
          <InputField label="Base MVA" value={baseMva} unit="MVA" onChange={onBaseMvaChange} />
        </Section>

        <Section title={`Buses (${buses.length})`} accent="amber" defaultOpen>
          {buses.map((bus, i) => (
            <div key={i} className="bg-[#0a0f18] rounded-xl p-3 border border-white/[0.04] space-y-2">
              <div className="flex items-center justify-between">
                <input value={bus.name} onChange={(e) => onUpdateBus(i, { name: e.target.value })}
                  className="bg-transparent text-[12px] text-white font-semibold focus:outline-none flex-1 min-w-0" />
                <div className="flex items-center gap-1.5">
                  <select value={bus.type} onChange={(e) => onUpdateBus(i, { type: e.target.value as Bus["type"] })}
                    className="bg-[#111827] border border-white/[0.06] rounded-md px-1.5 py-0.5 text-[10px] text-slate-300 cursor-pointer">
                    <option value="Slack">Slack</option><option value="PV">PV</option><option value="PQ">PQ</option>
                  </select>
                  {buses.length > 2 && (
                    <button onClick={() => onRemoveBus(i)} className="p-1 rounded-md hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InputField label="V (p.u.)" value={bus.v} onChange={(v) => onUpdateBus(i, { v })} step={0.01} />
                <InputField label="Base kV" value={bus.baseKv} onChange={(v) => onUpdateBus(i, { baseKv: v })} />
                <InputField label="P_Gen" value={bus.pGen} unit="MW" onChange={(v) => onUpdateBus(i, { pGen: v })} />
                <InputField label="Q_Gen" value={bus.qGen} unit="MVAr" onChange={(v) => onUpdateBus(i, { qGen: v })} />
                <InputField label="P_Load" value={bus.pLoad} unit="MW" onChange={(v) => onUpdateBus(i, { pLoad: v })} />
                <InputField label="Q_Load" value={bus.qLoad} unit="MVAr" onChange={(v) => onUpdateBus(i, { qLoad: v })} />
              </div>
            </div>
          ))}
          <button onClick={onAddBus}
            className="w-full py-2 rounded-lg border border-dashed border-white/[0.1] text-[11px] text-slate-500 hover:text-white hover:border-blue-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5">
            <Plus className="w-3 h-3" /> Add Bus
          </button>
        </Section>

        <Section title={`Branches (${branches.length})`} accent="teal" defaultOpen={false}>
          {branches.map((br, i) => (
            <div key={i} className="bg-[#0a0f18] rounded-xl p-3 border border-white/[0.04] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  {buses[br.fromBus]?.name || `Bus ${br.fromBus}`} → {buses[br.toBus]?.name || `Bus ${br.toBus}`}
                </span>
                {branches.length > 1 && (
                  <button onClick={() => onRemoveBranch(i)} className="p-1 rounded-md hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-600">From</label>
                  <select value={br.fromBus} onChange={(e) => onUpdateBranch(i, { fromBus: parseInt(e.target.value) })}
                    className="w-full bg-[#111827] border border-white/[0.06] rounded-md px-2 py-1 text-[11px] text-white cursor-pointer">
                    {buses.map((b, bi) => <option key={bi} value={bi}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-600">To</label>
                  <select value={br.toBus} onChange={(e) => onUpdateBranch(i, { toBus: parseInt(e.target.value) })}
                    className="w-full bg-[#111827] border border-white/[0.06] rounded-md px-2 py-1 text-[11px] text-white cursor-pointer">
                    {buses.map((b, bi) => <option key={bi} value={bi}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <InputField label="R (p.u.)" value={br.r} onChange={(v) => onUpdateBranch(i, { r: v })} step={0.001} />
                <InputField label="X (p.u.)" value={br.x} onChange={(v) => onUpdateBranch(i, { x: v })} step={0.001} />
                <InputField label="B (p.u.)" value={br.b} onChange={(v) => onUpdateBranch(i, { b: v })} step={0.001} />
              </div>
            </div>
          ))}
          <button onClick={onAddBranch}
            className="w-full py-2 rounded-lg border border-dashed border-white/[0.1] text-[11px] text-slate-500 hover:text-white hover:border-teal-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5">
            <Plus className="w-3 h-3" /> Add Branch
          </button>
        </Section>
      </div>

      <div className="p-3 border-t border-white/[0.06] shrink-0">
        <button onClick={onSolve}
          className="w-full py-3 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer hover:-translate-y-px active:translate-y-0 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
          <Play className="w-4 h-4" />
          Solve Load Flow
        </button>
      </div>
    </div>
  );
}

// ─── KPI Card ───
function KPICard({ label, value, unit, color, sub }: { label: string; value: string; unit?: string; color: string; sub?: string }) {
  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.1] transition-all">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{label}</div>
      <div className={`text-[22px] font-mono font-bold mt-1 ${color}`}>
        {value}{unit && <span className="text-[13px] text-slate-500 ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Canvas ───
export function LoadFlowCanvas({ buses, branches, result }: {
  buses: Bus[]; branches: Branch[]; result: LoadFlowResult | null;
}) {
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-500" />
          Meshed Load Flow Analysis
        </h1>
        <p className="text-[13px] text-slate-400 mt-1.5 max-w-2xl">
          Newton-Raphson power flow solution for meshed transmission networks. Computes bus voltages, branch flows, and system losses.
        </p>
      </div>

      {/* Info Strip */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/[0.06] border border-blue-500/15 text-[12px] text-slate-300">
        <Network className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="font-mono">{buses.length} Buses · {branches.length} Branches</span>
      </div>

      {!result && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Network className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-[13px]">Configure network and click <span className="text-blue-400 font-semibold">Solve Load Flow</span></p>
          </div>
        </div>
      )}

      {result && (
        <>
          {/* Convergence KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard label="Status" value={result.converged ? "Converged" : "Failed"} color={result.converged ? "text-emerald-400" : "text-red-400"} sub={`${result.iterations} iterations`} />
            <KPICard label="Max Mismatch" value={result.maxMismatch.toFixed(6)} unit="p.u." color="text-blue-400" />
            <KPICard label="Total Losses" value={result.branches.reduce((a, b) => a + b.losses, 0).toFixed(3)} unit="MW" color="text-amber-400" />
            <KPICard label="Slack Generation" value={`${result.buses.find(b => b.type === 'Slack')?.pGen.toFixed(1) || '—'}`} unit="MW" color="text-purple-400" sub={`Q = ${result.buses.find(b => b.type === 'Slack')?.qGen.toFixed(1) || '—'} MVAr`} />
          </div>

          {/* Bus Results Table */}
          <div className="bg-[#111827] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.04]">
              <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Bus Voltages & Power</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#0a0f18]">
                    {["Bus", "Type", "V (p.u.)", "θ (°)", "P_Gen (MW)", "Q_Gen (MVAr)", "P_Load (MW)", "Q_Load (MVAr)"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.buses.map((bus, i) => {
                    const vOk = bus.v >= 0.95 && bus.v <= 1.05;
                    return (
                      <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 font-medium text-white">{bus.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                            bus.type === 'Slack' ? 'bg-purple-500/15 text-purple-400' :
                            bus.type === 'PV' ? 'bg-emerald-500/15 text-emerald-400' :
                            'bg-blue-500/15 text-blue-400'
                          }`}>{bus.type}</span>
                        </td>
                        <td className={`px-4 py-2.5 font-mono font-semibold ${vOk ? 'text-emerald-400' : 'text-red-400'}`}>{bus.v}</td>
                        <td className="px-4 py-2.5 font-mono text-white">{bus.theta}</td>
                        <td className="px-4 py-2.5 font-mono text-white">{bus.pGen}</td>
                        <td className="px-4 py-2.5 font-mono text-white">{bus.qGen}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">{bus.pLoad}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">{bus.qLoad}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Branch Flows Table */}
          <div className="bg-[#111827] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.04]">
              <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Branch Power Flows</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#0a0f18]">
                    {["Branch", "P_from (MW)", "Q_from (MVAr)", "P_to (MW)", "Q_to (MVAr)", "Losses (MW)"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.branches.map((br, i) => (
                    <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-medium text-white flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                        {result.buses[br.fromBus]?.name || br.fromBus} → {result.buses[br.toBus]?.name || br.toBus}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-white">{br.pFromTo}</td>
                      <td className="px-4 py-2.5 font-mono text-white">{br.qFromTo}</td>
                      <td className="px-4 py-2.5 font-mono text-white">{br.pToFrom}</td>
                      <td className="px-4 py-2.5 font-mono text-white">{br.qToFrom}</td>
                      <td className={`px-4 py-2.5 font-mono font-semibold ${br.losses > 1 ? 'text-red-400' : 'text-amber-400'}`}>{br.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { getDefaultBuses, getDefaultBranches };
