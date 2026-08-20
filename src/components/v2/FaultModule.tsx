"use client";

import { useState, useMemo } from "react";
import {
  ShieldAlert, Settings2, ChevronDown, ChevronRight, Zap,
  AlertTriangle, CheckCircle2, ArrowRight, BookOpen, Link2
} from "lucide-react";
import { calculateFaults } from "@/lib/faultSolver";
import type { FaultInput, FaultResults } from "@/lib/faultSolver";
import { CONDUCTOR_DATABASE, STANDARD_VOLTAGES } from "@/lib/constants";

// ─── Smart Number Input (focus-managed) ───
function InputField({ label, value, unit, onChange, step, disabled }: {
  label: string; value: number; unit?: string;
  onChange: (v: number) => void; step?: number; disabled?: boolean;
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
          disabled={disabled}
          onFocus={() => { setIsFocused(true); setLocalValue(String(value)); }}
          onChange={(e) => {
            setLocalValue(e.target.value);
            const p = parseFloat(e.target.value);
            if (!isNaN(p)) onChange(p);
          }}
          onBlur={() => {
            setIsFocused(false);
            const p = parseFloat(localValue);
            if (isNaN(p)) setLocalValue(String(value));
            else { onChange(p); setLocalValue(String(p)); }
          }}
          className="flex-1 bg-[#0a0f18] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white font-mono
            focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20
            disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        />
        {unit && (
          <span className="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/15 text-[10px] text-cyan-400 font-semibold shrink-0">
            {unit}
          </span>
        )}
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

// ─── Right Inspector ───
export function FaultInspector({ inputs, onUpdate, onCalculate }: {
  inputs: FaultInput;
  onUpdate: (partial: Partial<FaultInput>) => void;
  onCalculate: () => void;
}) {
  const conductorNames = Object.keys(CONDUCTOR_DATABASE);
  const [selectedConductor, setSelectedConductor] = useState("Zebra");

  const handleConductorChange = (name: string) => {
    setSelectedConductor(name);
    if (name !== "Custom") {
      const c = CONDUCTOR_DATABASE[name];
      if (c) {
        onUpdate({ lineRPerKm: c.resistance, lineXPerKm: c.reactance });
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5">
          <Settings2 className="w-4 h-4 text-blue-400" />
          Fault Analysis Parameters
        </h3>
        <p className="text-[10px] text-slate-600 mt-0.5">IEC 60909</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <Section title="System" accent="blue" defaultOpen>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">System Voltage</label>
            <select
              value={inputs.voltageKv}
              onChange={(e) => onUpdate({ voltageKv: parseFloat(e.target.value) })}
              className="w-full bg-[#0a0f18] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-blue-500/30 cursor-pointer"
            >
              {STANDARD_VOLTAGES.map(v => <option key={v} value={v}>{v} kV</option>)}
            </select>
          </div>
          <InputField label="Source MVA (S_sc'')" value={inputs.sourceMva} unit="MVA" onChange={(v) => onUpdate({ sourceMva: v })} />
          <InputField label="Line Length" value={inputs.lineLengthKm} unit="km" onChange={(v) => onUpdate({ lineLengthKm: v })} step={1} />
          <InputField label="IEC Voltage Factor (c)" value={inputs.cFactor} unit="" onChange={(v) => onUpdate({ cFactor: v })} step={0.05} />
        </Section>

        <Section title="Conductor" accent="amber">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Conductor Template</label>
            <select
              value={selectedConductor}
              onChange={(e) => handleConductorChange(e.target.value)}
              className="w-full bg-[#0a0f18] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-amber-500/30 cursor-pointer"
            >
              {conductorNames.map(n => <option key={n} value={n}>{n} ({CONDUCTOR_DATABASE[n].sizeSqmm} mm²)</option>)}
              <option value="Custom">Custom Specifications</option>
            </select>
          </div>
          <InputField label="Resistance R" value={inputs.lineRPerKm} unit="Ω/km" onChange={(v) => { onUpdate({ lineRPerKm: v }); setSelectedConductor("Custom"); }} step={0.0001} />
          <InputField label="Reactance X" value={inputs.lineXPerKm} unit="Ω/km" onChange={(v) => { onUpdate({ lineXPerKm: v }); setSelectedConductor("Custom"); }} step={0.0001} />
        </Section>

        <Section title="Zero Sequence" accent="purple" defaultOpen={false}>
          <InputField label="R Multiplier" value={inputs.zeroSeqRMultiplier} unit="×" onChange={(v) => onUpdate({ zeroSeqRMultiplier: v })} step={0.1} />
          <InputField label="X Multiplier" value={inputs.zeroSeqXMultiplier} unit="×" onChange={(v) => onUpdate({ zeroSeqXMultiplier: v })} step={0.1} />
        </Section>
      </div>

      <div className="p-3 border-t border-white/[0.06] shrink-0">
        <button onClick={onCalculate}
          className="w-full py-3 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer hover:-translate-y-px active:translate-y-0 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" />
          Calculate Fault Levels
        </button>
      </div>
    </div>
  );
}

// ─── KPI Card ───
function FaultKPI({ label, current, mva, color }: { label: string; current: string; mva: string; color: string }) {
  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.1] transition-all">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{label}</div>
      <div className={`text-[24px] font-mono font-bold mt-1 ${color}`}>{current}</div>
      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{mva}</div>
    </div>
  );
}

// ─── Center Canvas ───
export function FaultCanvas({ inputs, results, onFeedToSCForces }: {
  inputs: FaultInput;
  results: FaultResults | null;
  onFeedToSCForces?: (data: { ik3_A: number; xr_ratio: number; voltage_kV: number }) => void;
}) {
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-blue-500" />
          Fault Analysis — IEC 60909
        </h1>
        <p className="text-[13px] text-slate-400 mt-1.5 max-w-2xl">
          Short-circuit current calculation with sequence impedance networks. Computes 3-phase, SLG, LL, and LLG fault levels.
        </p>
      </div>

      {/* Info Strip */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/[0.06] border border-blue-500/15 text-[12px] text-slate-300">
        <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="font-mono">
          {inputs.voltageKv} kV · {inputs.sourceMva} MVA · {inputs.lineLengthKm} km · R={inputs.lineRPerKm} Ω/km · X={inputs.lineXPerKm} Ω/km · c={inputs.cFactor}
        </span>
      </div>

      {!results && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-[13px]">Configure parameters and click <span className="text-blue-400 font-semibold">Calculate Fault Levels</span> to see results</p>
          </div>
        </div>
      )}

      {results && (
        <>
          {/* Feed to SC Forces */}
          {onFeedToSCForces && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/[0.06] to-indigo-500/[0.06] border border-blue-500/20">
              <div>
                <div className="text-[13px] font-semibold text-white flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-400" />
                  Feed to SC Forces
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  I<sub>k3</sub> = {(results.i3Phase * 1000).toFixed(0)} A · X/R = {(results.zTotalPositive.x / Math.max(results.zTotalPositive.r, 0.0001)).toFixed(1)}
                </div>
              </div>
              <button
                onClick={() => onFeedToSCForces({
                  ik3_A: results.i3Phase * 1000,
                  xr_ratio: results.zTotalPositive.x / Math.max(results.zTotalPositive.r, 0.0001),
                  voltage_kV: inputs.voltageKv,
                })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold text-blue-300 bg-blue-500/15 border border-blue-500/25 hover:bg-blue-500/25 transition-all cursor-pointer"
              >
                Apply to SC Forces <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Fault Current KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <FaultKPI label="3-Phase Symmetrical" current={`${results.i3Phase.toFixed(3)} kA`} mva={`${results.mva3Phase.toFixed(1)} MVA`} color="text-emerald-400" />
            <FaultKPI label="Line-to-Ground (SLG)" current={`${results.iLineToGround.toFixed(3)} kA`} mva={`${results.mvaLineToGround.toFixed(1)} MVA`} color="text-blue-400" />
            <FaultKPI label="Line-to-Line (LL)" current={`${results.iLineToLine.toFixed(3)} kA`} mva={`${results.mvaLineToLine.toFixed(1)} MVA`} color="text-amber-400" />
            <FaultKPI label="LL-to-Ground (LLG)" current={`${results.iLineToLineToGround.toFixed(3)} kA`} mva={`${results.mvaLineToLineToGround.toFixed(1)} MVA`} color="text-purple-400" />
          </div>

          {/* Impedance Table */}
          <div className="bg-[#111827] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.04]">
              <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Sequence Impedance Matrix</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#0a0f18]">
                    {["Component", "R (Ω)", "X (Ω)", "|Z| (Ω)"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Source Impedance (Z_Q)", z: results.zSource, highlight: false },
                    { name: "Line +ve Sequence (Z_L1)", z: results.zLinePositive, highlight: false },
                    { name: "Line Zero Sequence (Z_L0)", z: results.zLineZero, highlight: false },
                    { name: "Total +ve Sequence (Z₁)", z: results.zTotalPositive, highlight: true },
                    { name: "Total Zero Sequence (Z₀)", z: results.zTotalZero, highlight: true },
                  ].map((row, i) => (
                    <tr key={i} className={`border-t border-white/[0.04] ${row.highlight ? "bg-emerald-500/[0.03]" : ""}`}>
                      <td className={`px-5 py-2.5 ${row.highlight ? "font-semibold text-emerald-400" : "text-slate-300"}`}>{row.name}</td>
                      <td className="px-5 py-2.5 font-mono text-white">{row.z.r.toFixed(4)}</td>
                      <td className="px-5 py-2.5 font-mono text-white">{row.z.x.toFixed(4)}</td>
                      <td className={`px-5 py-2.5 font-mono font-semibold ${row.highlight ? "text-emerald-400" : "text-blue-400"}`}>{row.z.mag.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* IEC Compliance */}
          <div className="bg-[#111827] rounded-2xl border border-white/[0.06] p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">IEC 60909 Compliance Notes</h3>
            </div>
            <div className="space-y-2">
              {results.clauses.map((clause, i) => (
                <div key={i} className="px-3 py-2 bg-[#0a0f18] rounded-lg border border-white/[0.04] text-[11px] text-slate-300 leading-relaxed">
                  {clause}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
