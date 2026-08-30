"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ShieldAlert, Settings2, ChevronDown, ChevronRight, Zap,
  AlertTriangle, CheckCircle2, ArrowRight, BookOpen, Link2,
  BarChart3, FileText
} from "lucide-react";
import { calculateFaults } from "@/lib/faultSolver";
import type { FaultInput, FaultResults } from "@/lib/faultSolver";
import { CONDUCTOR_DATABASE, STANDARD_VOLTAGES } from "@/lib/constants";

// ─── Smart Number Input (focus-managed) ───
function InputField({ label, value, unit, onChange, step, disabled, iecRef }: {
  label: string; value: number; unit?: string;
  onChange: (v: number) => void; step?: number; disabled?: boolean;
  iecRef?: { clause: string; desc: string };
}) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);
  if (!isFocused && localValue !== String(value)) setLocalValue(String(value));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
        {iecRef && (
          <div className="group relative cursor-help flex items-center">
            <BookOpen className="w-3 h-3 text-emerald-500/70" />
            <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 text-[10px] leading-tight">
              <span className="font-bold text-emerald-400 block mb-0.5">{iecRef.clause}</span>
              <span className="text-slate-300">{iecRef.desc}</span>
            </div>
          </div>
        )}
      </div>
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
          className="w-full flex-1 min-w-0 bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground font-mono
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
    teal: "text-teal-400 bg-teal-500/8 border-teal-500/15",
  };
  return (
    <div className="border-b border-white/[0.04] last:border-0">
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer hover:bg-accent/30 ${accentColors[accent] || accentColors.blue}`}>
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
  const [isCalculating, setIsCalculating] = useState(false);

  // Sync selected conductor when inputs values change externally
  useEffect(() => {
    let matched = "Custom";
    for (const name of Object.keys(CONDUCTOR_DATABASE)) {
      const c = CONDUCTOR_DATABASE[name];
      if (Math.abs(c.resistance - inputs.lineRPerKm) < 0.0001 && Math.abs(c.reactance - inputs.lineXPerKm) < 0.0001) {
        matched = name;
        break;
      }
    }
    setSelectedConductor(matched);
  }, [inputs.lineRPerKm, inputs.lineXPerKm]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
          <Settings2 className="w-4 h-4 text-blue-400" />
          Fault Analysis Parameters
        </h3>
        <p className="text-[10px] text-muted-foreground/80 mt-0.5">IEC 60909 Standard</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* System & Source Section */}
        <Section title="System & Grid Source" accent="blue" defaultOpen>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">System Voltage</label>
            <select
              value={inputs.voltageKv}
              onChange={(e) => {
                const kv = parseFloat(e.target.value);
                const suggestedC = kv <= 1.0 ? 1.05 : 1.10;
                onUpdate({ voltageKv: kv, cFactor: suggestedC });
              }}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-blue-500/30 cursor-pointer"
            >
              {STANDARD_VOLTAGES.map(v => <option key={v} value={v}>{v} kV</option>)}
            </select>
          </div>
          <InputField label="Source MVA (S_sc'')" value={inputs.sourceMva} unit="MVA" onChange={(v) => onUpdate({ sourceMva: v })} />
          <InputField label="Voltage Factor c" value={inputs.cFactor} unit="" onChange={(v) => onUpdate({ cFactor: v })} step={0.01}
            iecRef={{ clause: "IEC 60909-0 Cl. 2.4", desc: "Voltage factor for calculation of short-circuit currents" }} />
          
          <div className="space-y-1 mt-3">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Grounding Type</label>
            <select
              value={inputs.sourceGroundingType ?? "solid"}
              onChange={(e) => {
                const gType = e.target.value as any;
                let rMult = 2.0;
                let xMult = 2.0;
                if (gType === "resistance") {
                  rMult = 15.0;
                  xMult = 2.0;
                } else if (gType === "reactance") {
                  rMult = 2.0;
                  xMult = 10.0;
                } else if (gType === "isolated") {
                  rMult = 1000.0;
                  xMult = 1000.0;
                }
                onUpdate({
                  sourceGroundingType: gType,
                  sourceR0Mult: rMult,
                  sourceX0Mult: xMult
                });
              }}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-blue-500/30 cursor-pointer"
            >
              <option value="solid">Solidly Grounded</option>
              <option value="resistance">Low Resistance</option>
              <option value="reactance">Low Reactance</option>
              <option value="isolated">Isolated / Ungrounded</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <InputField
              label="Source R0 Mult"
              value={inputs.sourceR0Mult ?? 2.0}
              unit="R0/R1"
              onChange={(v) => onUpdate({ sourceR0Mult: v })}
              step={0.1}
            />
            <InputField
              label="Source X0 Mult"
              value={inputs.sourceX0Mult ?? 2.0}
              unit="X0/X1"
              onChange={(v) => onUpdate({ sourceX0Mult: v })}
              step={0.1}
            />
          </div>
        </Section>

        {/* Transformer Block Section */}
        <Section title="Transformer Block" accent="amber" defaultOpen={inputs.includeTransformer ?? false}>
          <div className="flex items-center justify-between py-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Include Series Xfmr</label>
            <input
              type="checkbox"
              checked={inputs.includeTransformer ?? false}
              onChange={(e) => onUpdate({ includeTransformer: e.target.checked })}
              className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500 bg-card cursor-pointer"
            />
          </div>
          {inputs.includeTransformer && (
            <div className="space-y-3 pt-2">
              <InputField
                label="Xfmr Rating"
                value={inputs.transformerMva ?? 100}
                unit="MVA"
                onChange={(v) => onUpdate({ transformerMva: v })}
              />
              <InputField
                label="Xfmr Impedance (%Z)"
                value={inputs.transformerReactancePct ?? 12.5}
                unit="%"
                onChange={(v) => onUpdate({ transformerReactancePct: v })}
                step={0.1}
              />
            </div>
          )}
        </Section>

        {/* Overhead Line Section */}
        <Section title="Overhead Line & Fault" accent="teal">
          <InputField label="Line Length" value={inputs.lineLengthKm} unit="km" onChange={(v) => onUpdate({ lineLengthKm: v, faultLocationKm: Math.min(inputs.faultLocationKm ?? v, v) })} />
          
          <div className="space-y-1.5 py-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Fault Location</label>
              <span className="font-mono text-xs text-foreground font-semibold">{(inputs.faultLocationKm ?? inputs.lineLengthKm).toFixed(1)} km</span>
            </div>
            <input
              type="range"
              min="0"
              max={inputs.lineLengthKm}
              step="0.1"
              value={inputs.faultLocationKm ?? inputs.lineLengthKm}
              onChange={(e) => onUpdate({ faultLocationKm: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-card border border-border rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>0.0 km (Bus)</span>
              <span>{inputs.lineLengthKm.toFixed(1)} km (End)</span>
            </div>
          </div>

          <div className="space-y-1 mt-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Conductor Spec</label>
            <select
              value={selectedConductor}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedConductor(val);
                if (val !== "Custom") {
                  const spec = CONDUCTOR_DATABASE[val];
                  onUpdate({
                    lineRPerKm: spec.resistance,
                    lineXPerKm: spec.reactance
                  });
                }
              }}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-teal-500/30 cursor-pointer"
            >
              {conductorNames.map(n => <option key={n} value={n}>{n} ({CONDUCTOR_DATABASE[n].sizeSqmm} mm²)</option>)}
              <option value="Custom">Custom Specifications</option>
            </select>
          </div>
          <InputField label="Resistance R" value={inputs.lineRPerKm} unit="Ω/km" onChange={(v) => { onUpdate({ lineRPerKm: v }); setSelectedConductor("Custom"); }} step={0.0001} />
          <InputField label="Reactance X" value={inputs.lineXPerKm} unit="Ω/km" onChange={(v) => { onUpdate({ lineXPerKm: v }); setSelectedConductor("Custom"); }} step={0.0001} />
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            <InputField label="Line R0 Mult" value={inputs.zeroSeqRMultiplier} unit="×" onChange={(v) => onUpdate({ zeroSeqRMultiplier: v })} step={0.1} />
            <InputField label="Line X0 Mult" value={inputs.zeroSeqXMultiplier} unit="×" onChange={(v) => onUpdate({ zeroSeqXMultiplier: v })} step={0.1} />
          </div>
        </Section>

        {/* Fault Settings Section */}
        <Section title="Fault Settings" accent="purple">
          <InputField label="Fault Duration (T_k)" value={inputs.tk1 ?? 1.0} unit="s" onChange={(v) => onUpdate({ tk1: v })} step={0.1}
            iecRef={{ clause: "IEC 60909-0 Cl. 4.5", desc: "Short-circuit duration for calculation of thermal equivalent current" }} />
        </Section>
      </div>

      <div className="p-3 border-t border-border shrink-0">
        <button onClick={() => {
            setIsCalculating(true);
            setTimeout(() => {
              onCalculate();
              setIsCalculating(false);
            }, 300);
          }}
          disabled={isCalculating}
          className="w-full py-3 rounded-xl text-[13px] font-bold text-foreground bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer hover:-translate-y-px active:translate-y-0 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
          {isCalculating ? (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {isCalculating ? "Calculating..." : "Calculate Fault Levels"}
        </button>
      </div>
    </div>
  );
}

// ─── Real-World Fault KPI Card (Initial, Peak, Breaking, Thermal) ───
function FaultKPI({ label, ik, ip, ib, ith, mva, color, bgBorder }: {
  label: string;
  ik: number;
  ip: number;
  ib: number;
  ith: number;
  mva: number;
  color: string;
  bgBorder: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-white/[0.1] transition-all flex flex-col justify-between relative overflow-hidden group">
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${bgBorder}`} />
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-3 pl-1">{label}</div>
        <div className="space-y-2 font-mono text-[12px]">
          <div className="flex items-center justify-between border-b border-white/[0.03] pb-1">
            <span className="text-[10px] text-muted-foreground">Initial (I_k'')</span>
            <span className={`font-bold ${color}`}>{ik.toFixed(3)} kA</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/[0.03] pb-1">
            <span className="text-[10px] text-muted-foreground">Peak (i_p)</span>
            <span className="font-semibold text-foreground">{ip.toFixed(3)} kA</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/[0.03] pb-1">
            <span className="text-[10px] text-muted-foreground">Breaking (I_b)</span>
            <span className="text-slate-300">{ib.toFixed(3)} kA</span>
          </div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] text-muted-foreground">Thermal (I_th)</span>
            <span className="font-semibold text-amber-400">{ith.toFixed(3)} kA</span>
          </div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground font-mono mt-3 pl-1 border-t border-white/[0.04] pt-2 flex justify-between">
        <span>Fault Power:</span>
        <span className="font-bold text-foreground/90">{mva.toFixed(1)} MVA</span>
      </div>
    </div>
  );
}

// ─── Equation Trace Component ───
export function FaultEquationTrace({ results }: { results: FaultResults }) {
  const { trace } = results;
  if (!trace) return null;

  const rows = [
    { num: 1, param: "System Voltage (line-to-line)", html: "V<sub>n</sub>", val: `${trace.voltageKv.toFixed(1)} kV`, ref: "-" },
    { num: 2, param: "Source short-circuit capacity", html: "S''<sub>sc</sub>", val: `${trace.sourceMva.toFixed(1)} MVA`, ref: "-" },
    { num: 3, param: "IEC Voltage Factor", html: "c", val: `${trace.cFactor.toFixed(2)}`, ref: "IEC 60909 Table 1" },
    { num: 4, param: "Source Pos. Seq. Impedance magnitude", html: "|Z<sub>Q</sub>| = c × V<sub>n</sub>² / S''<sub>sc</sub>", val: `${trace.zSourcePos.mag.toFixed(4)} Ω`, ref: "IEC 60909 Cl. 3.2" },
    { num: 5, param: "Source Pos. Seq. Resistance", html: "R<sub>Q</sub> = 0.1 × X<sub>Q</sub>", val: `${trace.zSourcePos.r.toFixed(4)} Ω`, ref: "Assumed X/R = 10" },
    { num: 6, param: "Source Pos. Seq. Reactance", html: "X<sub>Q</sub> = |Z<sub>Q</sub>| / √1.01", val: `${trace.zSourcePos.x.toFixed(4)} Ω`, ref: "Assumed X/R = 10" },
    { num: 7, param: "Source Zero Seq. Impedance R", html: "R<sub>Q0</sub> = R<sub>Q</sub> × mult<sub>R</sub>", val: `${trace.zSourceZero.r.toFixed(4)} Ω`, ref: "Grounding config" },
    { num: 8, param: "Source Zero Seq. Impedance X", html: "X<sub>Q0</sub> = X<sub>Q</sub> × mult<sub>X</sub>", val: `${trace.zSourceZero.x.toFixed(4)} Ω`, ref: "Grounding config" },
  ];

  if (trace.includeTransformer && trace.zTransPos) {
    rows.push(
      { num: 9, param: "Xfmr Pos. Seq. Impedance magnitude", html: "|Z<sub>T</sub>| = (%Z / 100) × V<sub>n</sub>² / S<sub>T</sub>", val: `${trace.zTransPos.mag.toFixed(4)} Ω`, ref: "IS 2026 / IEC 60076" },
      { num: 10, param: "Xfmr Pos. Seq. Resistance", html: "R<sub>T</sub> = 0.05 × X<sub>T</sub>", val: `${trace.zTransPos.r.toFixed(4)} Ω`, ref: "Assumed X/R = 20" },
      { num: 11, param: "Xfmr Pos. Seq. Reactance", html: "X<sub>T</sub> = |Z<sub>T</sub>| / √1.0025", val: `${trace.zTransPos.x.toFixed(4)} Ω`, ref: "Assumed X/R = 20" }
    );
  }

  const offset = trace.includeTransformer ? 3 : 0;

  rows.push(
    { num: 9 + offset, param: "Line Pos. Seq. Impedance R", html: "R<sub>L1</sub> = R' × L<sub>fault</sub>", val: `${trace.zLinePos.r.toFixed(4)} Ω`, ref: `L = ${trace.faultLocationKm.toFixed(2)} km` },
    { num: 10 + offset, param: "Line Pos. Seq. Impedance X", html: "X<sub>L1</sub> = X' × L<sub>fault</sub>", val: `${trace.zLinePos.x.toFixed(4)} Ω`, ref: `L = ${trace.faultLocationKm.toFixed(2)} km` },
    { num: 11 + offset, param: "Line Zero Seq. Impedance R", html: "R<sub>L0</sub> = R<sub>L1</sub> × mult<sub>R_line</sub>", val: `${trace.zLineZero.r.toFixed(4)} Ω`, ref: "-" },
    { num: 12 + offset, param: "Line Zero Seq. Impedance X", html: "X<sub>L0</sub> = X<sub>L1</sub> × mult<sub>X_line</sub>", val: `${trace.zLineZero.x.toFixed(4)} Ω`, ref: "-" },
    { num: 13 + offset, param: "Total Pos. Seq. Resistance at fault", html: "R₁ = R<sub>Q</sub> + R<sub>T</sub> + R<sub>L1</sub>", val: `${trace.zTotalPos.r.toFixed(4)} Ω`, ref: "Series sum" },
    { num: 14 + offset, param: "Total Pos. Seq. Reactance at fault", html: "X₁ = X<sub>Q</sub> + X<sub>T</sub> + X<sub>L1</sub>", val: `${trace.zTotalPos.x.toFixed(4)} Ω`, ref: "Series sum" },
    { num: 15 + offset, param: "Total Zero Seq. Resistance at fault", html: "R₀ = R<sub>Q0</sub> + R<sub>T0</sub> + R<sub>L0</sub>", val: `${trace.zTotalZero.r.toFixed(4)} Ω`, ref: "Series sum" },
    { num: 16 + offset, param: "Total Zero Seq. Reactance at fault", html: "X₀ = X<sub>Q0</sub> + X<sub>T0</sub> + X<sub>L0</sub>", val: `${trace.zTotalZero.x.toFixed(4)} Ω`, ref: "Series sum" },
    { num: 17 + offset, param: "Peak short-circuit factor (3-phase)", html: "κ = 1.02 + 0.98 · e<sup>-3 / (X₁/R₁)</sup>", val: `${trace.kappa3ph.toFixed(4)}`, ref: "IEC 60909 Cl. 4.3" },
    { num: 18 + offset, param: "DC decay time constant (3-phase)", html: "τ = X₁ / (2π · f · R₁)", val: `${(trace.tau3ph * 1000).toFixed(1)} ms`, ref: "f = 50 Hz" },
    { num: 19 + offset, param: "Thermal equivalent factor m", html: "m = (τ / T<sub>k</sub>) · (1 - e<sup>-2·T<sub>k</sub>/τ</sup>)", val: `${trace.m3ph.toFixed(4)}`, ref: "IEC 60909 Cl. 4.5" }
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">IEC 60909 — Fault Impedance & Factor Trace</h3>
        <p className="text-[11px] text-muted-foreground mt-1">Step-by-step trace of intermediate variables used in calculation.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] text-left">
          <thead className="bg-accent/50 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium w-12">#</th>
              <th className="px-5 py-3 font-medium">Parameter</th>
              <th className="px-5 py-3 font-medium">Formula</th>
              <th className="px-5 py-3 font-medium">Computed Value</th>
              <th className="px-5 py-3 font-medium">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((row) => (
              <tr key={row.num} className="hover:bg-white/[0.02]">
                <td className="px-5 py-2.5 text-slate-500 font-mono">{row.num}</td>
                <td className="px-5 py-2.5 text-muted-foreground">{row.param}</td>
                <td className="px-5 py-2.5">
                  <div className="bg-background px-2 py-1 rounded border border-border inline-block font-mono text-[11px] text-blue-300" dangerouslySetInnerHTML={{ __html: row.html }} />
                </td>
                <td className="px-5 py-2.5 text-foreground font-mono">{row.val}</td>
                <td className="px-5 py-2.5 text-muted-foreground">{row.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Center Canvas ───
type CanvasTab = "results" | "trace";

const CANVAS_TABS: { id: CanvasTab; label: string; icon: React.ElementType }[] = [
  { id: "results", label: "Results Dashboard", icon: BarChart3 },
  { id: "trace",   label: "Equation Trace",   icon: FileText },
];

export function FaultCanvas({ inputs, results, onFeedToSCForces }: {
  inputs: FaultInput;
  results: FaultResults | null;
  onFeedToSCForces?: (data: { ik3_A: number; xr_ratio: number; voltage_kV: number }) => void;
}) {
  const [tab, setTab] = useState<CanvasTab>("results");

  // Validate inputs for warning highlights
  const validationError = useMemo(() => {
    if (inputs.sourceMva <= 0) return "Source MVA must be greater than 0.";
    if (inputs.lineLengthKm < 0) return "Line length cannot be negative.";
    if ((inputs.faultLocationKm ?? 0) < 0) return "Fault location cannot be negative.";
    if ((inputs.faultLocationKm ?? 0) > inputs.lineLengthKm) return "Fault location cannot exceed line length.";
    if (inputs.lineRPerKm < 0 || inputs.lineXPerKm < 0) return "Resistance and Reactance values must be positive.";
    if (inputs.cFactor <= 0) return "Voltage Factor c must be greater than 0.";
    if (inputs.includeTransformer && (inputs.transformerMva ?? 0) <= 0) return "Transformer rating must be greater than 0.";
    if (inputs.includeTransformer && (inputs.transformerReactancePct ?? 0) <= 0) return "Transformer impedance %Z must be greater than 0.";
    return null;
  }, [inputs]);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-blue-500" />
          Fault Analysis — IEC 60909
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1.5 max-w-2xl">
          Short-circuit current calculation with sequence impedance networks. Computes initial, peak, breaking, and thermal equivalent currents.
        </p>
      </div>

      {/* Input validation banners */}
      {validationError && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/[0.06] border border-red-500/15 text-[12px] text-red-300">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{validationError} Click Calculate to clear errors or modify values.</span>
        </div>
      )}

      {/* Info Strip */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/[0.06] border border-blue-500/15 text-[12px] text-foreground/90">
        <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="font-mono">
          {inputs.voltageKv} kV · {inputs.sourceMva} MVA · Ground: {inputs.sourceGroundingType ?? "solid"} · Fault Location: {(inputs.faultLocationKm ?? inputs.lineLengthKm).toFixed(1)} km · c={inputs.cFactor}
        </span>
      </div>

      {!results && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-muted-foreground text-[13px]">Configure parameters and click <span className="text-blue-400 font-semibold">Calculate Fault Levels</span> to see results</p>
          </div>
        </div>
      )}

      {results && !validationError && (
        <>
          {/* Feed to SC Forces */}
          {onFeedToSCForces && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/[0.06] to-indigo-500/[0.06] border border-blue-500/20 animate-in fade-in duration-300">
              <div>
                <div className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-400" />
                  Feed to SC Forces Module
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  Initial I''<sub>k3</sub> = {(results.i3Phase * 1000).toFixed(0)} A · Peak i<sub>p</sub> = {(results.ip3Phase * 1000).toFixed(0)} A · X/R = {(results.zTotalPositive.x / Math.max(results.zTotalPositive.r, 0.0001)).toFixed(1)}
                </div>
              </div>
              <button
                onClick={() => onFeedToSCForces({
                  ik3_A: results.i3Phase * 1000,
                  xr_ratio: results.zTotalPositive.x / Math.max(results.zTotalPositive.r, 0.0001),
                  voltage_kV: inputs.voltageKv,
                })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold text-blue-300 bg-blue-500/15 border border-blue-500/25 hover:bg-blue-500/25 transition-all cursor-pointer animate-pulse"
              >
                Apply to SC Forces <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Sub-tab Navigation */}
          <div className="flex gap-1 bg-card p-1 rounded-xl border border-border w-full overflow-x-auto no-scrollbar">
            {CANVAS_TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                  tab === t.id
                    ? "bg-white/[0.08] text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/90 hover:bg-accent/50"
                }`}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          {tab === "results" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Fault Current KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <FaultKPI
                  label="3-Phase Symmetrical"
                  ik={results.i3Phase}
                  ip={results.ip3Phase}
                  ib={results.ib3Phase}
                  ith={results.ith3Phase}
                  mva={results.mva3Phase}
                  color="text-emerald-400"
                  bgBorder="from-emerald-500 to-teal-500"
                />
                <FaultKPI
                  label="Line-to-Ground (SLG)"
                  ik={results.iLineToGround}
                  ip={results.ipLineToGround}
                  ib={results.ibLineToGround}
                  ith={results.ithLineToGround}
                  mva={results.mvaLineToGround}
                  color="text-blue-400"
                  bgBorder="from-blue-500 to-cyan-500"
                />
                <FaultKPI
                  label="Line-to-Line (LL)"
                  ik={results.iLineToLine}
                  ip={results.ipLineToLine}
                  ib={results.ibLineToLine}
                  ith={results.ithLineToLine}
                  mva={results.mvaLineToLine}
                  color="text-amber-400"
                  bgBorder="from-amber-500 to-yellow-500"
                />
                <FaultKPI
                  label="LL-to-Ground (LLG)"
                  ik={results.iLineToLineToGround}
                  ip={results.ipLineToLineToGround}
                  ib={results.ibLineToLineToGround}
                  ith={results.ithLineToLineToGround}
                  mva={results.mvaLineToLineToGround}
                  color="text-purple-400"
                  bgBorder="from-purple-500 to-indigo-500"
                />
              </div>

              {/* Impedance Table */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.04]">
                  <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Sequence Impedance Matrix</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-card text-muted-foreground font-bold">
                        {["Component", "R (Ω)", "X (Ω)", "|Z| (Ω)"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-wider">{h}</th>
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
                          <td className={`px-5 py-2.5 ${row.highlight ? "font-semibold text-emerald-400" : "text-foreground/90"}`}>{row.name}</td>
                          <td className="px-5 py-2.5 font-mono text-foreground">{row.z.r.toFixed(4)}</td>
                          <td className="px-5 py-2.5 font-mono text-foreground">{row.z.x.toFixed(4)}</td>
                          <td className={`px-5 py-2.5 font-mono font-semibold ${row.highlight ? "text-emerald-400" : "text-blue-400"}`}>{row.z.mag.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* IEC Compliance */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">IEC 60909 Compliance Notes</h3>
                </div>
                <div className="space-y-2">
                  {results.clauses.map((clause, i) => (
                    <div key={i} className="px-3 py-2 bg-card rounded-lg border border-white/[0.04] text-[11px] text-foreground/90 leading-relaxed">
                      {clause}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "trace" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <FaultEquationTrace results={results} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
