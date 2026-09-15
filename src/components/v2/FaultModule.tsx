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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { CLAUSE_REGISTRY, formatClauseDisplay } from "@/lib/clauseRegistry";
import type { ClauseId } from "@/lib/clauseRegistry";
import { VerificationBadge } from "@/components/dashboard/sc-forces/VerificationBadge";

// ─── Smart Number Input (focus-managed) ───
function InputField({ label, value, unit, onChange, step, disabled, iecRef }: {
  label: string; value: number; unit?: string;
  onChange: (v: number) => void; step?: number; disabled?: boolean;
  iecRef?: { clause: ClauseId; desc: string };
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

  // Debounced live calculation for sliders
  useEffect(() => {
    const timer = setTimeout(() => {
      onCalculate();
    }, 300);
    return () => clearTimeout(timer);
  }, [inputs.faultLocationKm]);

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
            iecRef={{ clause: CLAUSE_REGISTRY.cFactor, desc: "Voltage factor for calculation of short-circuit currents" }} />
          
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
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Winding Config (Vector Group)</label>
                <select
                  value={inputs.transformerVectorGroup ?? "Dyn"}
                  onChange={(e) => onUpdate({ transformerVectorGroup: e.target.value as any })}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-blue-500/30 cursor-pointer"
                >
                  <option value="Dyn">Dyn (Delta-Wye Grounded) - Source Z0 Blocked</option>
                  <option value="YNyn">YNyn (Wye Grounded-Wye Grounded) - Source Z0 Passes</option>
                  <option value="Yy">Yy (Ungrounded Wye-Wye) - Source Z0 Blocked</option>
                  <option value="YNy">YNy (Wye Grounded-Ungrounded Wye) - Source Z0 Blocked</option>
                </select>
              </div>
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
            iecRef={{ clause: CLAUSE_REGISTRY.tkFault, desc: "Short-circuit duration for calculation of thermal equivalent current" }} />
          
          <div className="space-y-1 mt-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Fault Location Type</label>
            <select
              value={inputs.faultType ?? "far-from-generator"}
              onChange={(e) => onUpdate({ faultType: e.target.value as any })}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-blue-500/30 cursor-pointer"
            >
              <option value="far-from-generator">Far-from-Generator (No Symmetrical Decay)</option>
              <option value="near-to-generator">Near-to-Generator (With Symmetrical Decay)</option>
            </select>
          </div>

          {inputs.faultType === "near-to-generator" && (
            <div className="space-y-3 pt-2">
              <InputField
                label="Gen. Rated Current (I_rG)"
                value={inputs.generatorRatedCurrentKa ?? 2.0}
                unit="kA"
                onChange={(v) => onUpdate({ generatorRatedCurrentKa: v })}
                step={0.1}
              />
              <InputField
                label="Breaker Contact Delay (t_min)"
                value={inputs.breakerDelayS ?? 0.05}
                unit="s"
                onChange={(v) => onUpdate({ breakerDelayS: v })}
                step={0.01}
                iecRef={{ clause: CLAUSE_REGISTRY.tMinDelay, desc: "Breaker contact separation time delay for breaking current calculation" }}
              />
            </div>
          )}
        </Section>

        {/* Motor Contribution Section */}
        <Section title="Motor Contribution" accent="amber" defaultOpen={inputs.motorContribution?.includeMotor ?? false}>
          <div className="flex items-center justify-between py-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Include Motor Load</label>
            <input
              type="checkbox"
              checked={inputs.motorContribution?.includeMotor ?? false}
              onChange={(e) => onUpdate({
                motorContribution: {
                  includeMotor: e.target.checked,
                  totalMotorMva: inputs.motorContribution?.totalMotorMva ?? 10,
                  motorXdPercent: inputs.motorContribution?.motorXdPercent ?? 20,
                  motorXRRatio: inputs.motorContribution?.motorXRRatio ?? 10,
                }
              })}
              className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500 bg-card cursor-pointer"
            />
          </div>
          {inputs.motorContribution?.includeMotor && (
            <div className="space-y-3 pt-2">
              <InputField
                label="Total Motor MVA"
                value={inputs.motorContribution?.totalMotorMva ?? 10}
                unit="MVA"
                onChange={(v) => onUpdate({
                  motorContribution: { ...inputs.motorContribution!, totalMotorMva: v }
                })}
                step={1}
              />
              <InputField
                label="Subtransient Reactance (Xd'')"
                value={inputs.motorContribution?.motorXdPercent ?? 20}
                unit="%"
                onChange={(v) => onUpdate({
                  motorContribution: { ...inputs.motorContribution!, motorXdPercent: v }
                })}
                step={0.5}
                iecRef={{ clause: CLAUSE_REGISTRY.motorX, desc: "Subtransient reactance of asynchronous motors. Typical range: 16.7% - 25%" }}
              />
              <InputField
                label="Motor X/R Ratio"
                value={inputs.motorContribution?.motorXRRatio ?? 10}
                unit="X/R"
                onChange={(v) => onUpdate({
                  motorContribution: { ...inputs.motorContribution!, motorXRRatio: v }
                })}
                step={0.5}
                iecRef={{ clause: CLAUSE_REGISTRY.iec60909, desc: "IEC 60909 default range — verify against nameplate if available" }}
              />
              <div className="px-2 py-1.5 bg-amber-500/[0.06] border border-amber-500/15 rounded-lg text-[10px] text-amber-300/90 leading-relaxed">
                <span className="font-bold">Note:</span> K<sub>M</sub>=1.0 assumed. Motor q-factor decay not yet implemented — breaking current is conservatively overestimated.
              </div>
            </div>
          )}
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
function FaultKPI({ label, ik, ip, ib, ith, mva, color, bgBorder, voltageKv }: {
  label: string;
  ik: number;
  ip: number;
  ib: number;
  ith: number;
  mva: number;
  color: string;
  bgBorder: string;
  voltageKv: number;
}) {
  // Voltage-class-based sanity ranges (indicative, not IEC-defined)
  const getSanityRange = (kv: number): { min: number; max: number; label: string } => {
    if (kv <= 1.0) return { min: 10, max: 65, label: "LV (≤1kV)" };
    if (kv <= 36) return { min: 5, max: 40, label: "MV (1-36kV)" };
    return { min: 10, max: 63, label: `HV (>${36}kV)` };
  };
  const range = getSanityRange(voltageKv);
  const inRange = ik >= range.min * 0.1 && ik <= range.max * 1.5; // generous band

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-white/[0.1] transition-all flex flex-col justify-between relative overflow-hidden group">
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${bgBorder}`} />
      <div>
        <div className="flex items-center justify-between mb-3 pl-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{label}</div>
          {/* Sanity badge (Fix #4 — honest disclaimer) */}
          {ik > 0 && (
            <div className="group/badge relative">
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                inRange
                  ? "text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/20"
                  : "text-amber-400 bg-amber-500/[0.08] border-amber-500/20"
              }`}>
                {inRange ? "✓ ~Typical Range" : "⚠ Review"}
              </span>
              <div className="absolute right-0 bottom-full mb-1 hidden group-hover/badge:block w-52 p-2 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 text-[10px] leading-tight">
                <span className="font-bold text-slate-200 block mb-0.5">Indicative range, not an IEC-defined threshold.</span>
                <span className="text-slate-400">{range.label}: {range.min}–{range.max} kA is a rough ballpark for I_k'' at this voltage class.</span>
              </div>
            </div>
          )}
        </div>
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

// ─── Trace Row Type ───
interface TraceRow {
  param: string;
  html: string;
  val: string;
  ref: string;
  tooltip?: string;
  substitution?: string;
}

// ─── Collapsible Trace Group ───
function TraceGroup({ id, title, summary, accent, rows, startNum, defaultOpen = true }: {
  id: string;
  title: string;
  summary: string;
  accent: string;
  rows: TraceRow[];
  startNum: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accentMap: Record<string, string> = {
    blue: "text-blue-400 border-blue-500/20 bg-blue-500/[0.04]",
    amber: "text-amber-400 border-amber-500/20 bg-amber-500/[0.04]",
    teal: "text-teal-400 border-teal-500/20 bg-teal-500/[0.04]",
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.04]",
    purple: "text-purple-400 border-purple-500/20 bg-purple-500/[0.04]",
    rose: "text-rose-400 border-rose-500/20 bg-rose-500/[0.04]",
  };

  return (
    <div className="border-b border-white/[0.04] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer hover:bg-white/[0.02] ${accentMap[accent] || accentMap.blue}`}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span>{title}</span>
        </div>
        <span className="font-mono text-[10px] opacity-70 normal-case tracking-normal">{summary}</span>
      </button>
      {open && (
        <table className="w-full text-[12px] text-left">
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((row, i) => (
              <tr key={`${id}-${i}`} className="hover:bg-white/[0.02] group/row">
                <td className="px-5 py-2.5 text-slate-500 font-mono w-12">{startNum + i}</td>
                <td className="px-5 py-2.5 text-muted-foreground min-w-[180px]">{row.param}</td>
                <td className="px-5 py-2.5 min-w-[220px]">
                  <div className="bg-background px-2 py-1 rounded border border-border inline-block font-mono text-[11px] text-blue-300" dangerouslySetInnerHTML={{ __html: row.html }} />
                  {/* Numeric substitution reveal on hover */}
                  {row.substitution && (
                    <div className="max-h-0 overflow-hidden group-hover/row:max-h-6 transition-all duration-300 ease-in-out">
                      <div className="font-mono text-[10px] text-slate-500 mt-1 pl-0.5">
                        {row.substitution}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-5 py-2.5 text-foreground font-mono">{row.val}</td>
                {/* Hover tooltip on reference */}
                <td className="px-5 py-2.5">
                  {row.tooltip ? (
                    <div className="group/ref relative cursor-help">
                      <span className="text-muted-foreground">{row.ref}</span>
                      <div className="absolute right-0 bottom-full mb-1 hidden group-hover/ref:block w-56 p-2 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 text-[10px] leading-tight">
                        <span className="text-slate-300">{row.tooltip}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{row.ref}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Equation Trace Component (Phase 2 — Grouped, Tooltips, Substitutions) ───
export function FaultEquationTrace({ results, inputs }: { results: FaultResults; inputs: FaultInput }) {
  const { trace } = results;
  if (!trace) return null;

  const includeMotor = trace.includeMotor;
  const rT = trace.zTransPos?.r ?? 0;
  const xT = trace.zTransPos?.x ?? 0;
  const tMva = trace.transformerMva ?? 0;
  const tPct = trace.transformerReactancePct ?? 0;

  // ─── Group 1: Source Impedance ───
  const sourceRows: TraceRow[] = [
    {
      param: "System Voltage (line-to-line)",
      html: "V<sub>n</sub>",
      val: `${trace.voltageKv.toFixed(1)} kV`,
      ref: "-",
      tooltip: "Nominal line-to-line system voltage used for all impedance base calculations."
    },
    {
      param: "Source short-circuit capacity",
      html: "S''<sub>sc</sub>",
      val: `${trace.sourceMva.toFixed(1)} MVA`,
      ref: "-",
      tooltip: "Network short-circuit capacity at the point of common coupling (PCC)."
    },
    {
      param: "IEC Voltage Factor",
      html: "c",
      val: `${trace.cFactor.toFixed(2)}`,
      ref: "IEC 60909 Table 1",
      tooltip: "Voltage factor c accounts for voltage variations and tap positions. c_max=1.1 for MV/HV, 1.05 for LV."
    },
    {
      param: "Source Pos. Seq. Impedance magnitude",
      html: "|Z<sub>Q</sub>| = c × V<sub>n</sub>² / S''<sub>sc</sub>",
      val: `${trace.zSourcePos.mag.toFixed(4)} Ω`,
      ref: "IEC 60909 Cl. 3.2",
      tooltip: "This impedance represents the equivalent grid source seen at the fault point, adjusted by voltage factor c per Table 1.",
      substitution: `${trace.cFactor.toFixed(2)} × ${trace.voltageKv.toFixed(1)}² / ${trace.sourceMva.toFixed(1)} = ${trace.zSourcePos.mag.toFixed(4)} Ω`
    },
    {
      param: "Source Pos. Seq. Resistance",
      html: "R<sub>Q</sub> = 0.1 × X<sub>Q</sub>",
      val: `${trace.zSourcePos.r.toFixed(4)} Ω`,
      ref: "Assumed X/R = 10",
      tooltip: "R_Q derived from X/R ratio assumption. For utility grid sources, X/R≈10 is typical per IEC guidance.",
      substitution: `0.1 × ${trace.zSourcePos.x.toFixed(4)} = ${trace.zSourcePos.r.toFixed(4)} Ω`
    },
    {
      param: "Source Pos. Seq. Reactance",
      html: "X<sub>Q</sub> = |Z<sub>Q</sub>| / √1.01",
      val: `${trace.zSourcePos.x.toFixed(4)} Ω`,
      ref: "Assumed X/R = 10",
      tooltip: "X_Q extracted from |Z_Q| using Pythagorean relationship: |Z|² = R² + X², with R=0.1X."
    },
    {
      param: "Source Zero Seq. Impedance R",
      html: "R<sub>Q0</sub> = R<sub>Q</sub> × mult<sub>R</sub>",
      val: `${trace.zSourceZero.r.toFixed(4)} Ω`,
      ref: "Grounding config",
      tooltip: "Zero-sequence resistance depends on grounding type. Multiplier is user-specified based on utility data.",
      substitution: `${trace.zSourcePos.r.toFixed(4)} × mult = ${trace.zSourceZero.r.toFixed(4)} Ω`
    },
    {
      param: "Source Zero Seq. Impedance X",
      html: "X<sub>Q0</sub> = X<sub>Q</sub> × mult<sub>X</sub>",
      val: `${trace.zSourceZero.x.toFixed(4)} Ω`,
      ref: "Grounding config",
      tooltip: "Zero-sequence reactance depends on grounding type. Multiplier is user-specified based on utility data.",
      substitution: `${trace.zSourcePos.x.toFixed(4)} × mult = ${trace.zSourceZero.x.toFixed(4)} Ω`
    },
  ];

  // ─── Group 2: Transformer Impedance (conditional) ───
  const transRows: TraceRow[] = (trace.includeTransformer && trace.zTransPos) ? [
    {
      param: "Xfmr Pos. Seq. Impedance magnitude",
      html: "|Z<sub>T</sub>| = (%Z / 100) × V<sub>n</sub>² / S<sub>T</sub>",
      val: `${trace.zTransPos.mag.toFixed(4)} Ω`,
      ref: "IS 2026 / IEC 60076",
      tooltip: "Transformer short-circuit impedance from nameplate %Z, converted to ohms at system voltage.",
      substitution: `(${tPct.toFixed(1)} / 100) × ${trace.voltageKv.toFixed(1)}² / ${tMva.toFixed(1)} = ${trace.zTransPos.mag.toFixed(4)} Ω`
    },
    {
      param: "Xfmr Pos. Seq. Resistance",
      html: "R<sub>T</sub> = 0.05 × X<sub>T</sub>",
      val: `${rT.toFixed(4)} Ω`,
      ref: "Assumed X/R = 20",
      tooltip: "Power transformer R/X ratio is typically very low. X/R=20 is a conservative assumption.",
      substitution: `0.05 × ${xT.toFixed(4)} = ${rT.toFixed(4)} Ω`
    },
    {
      param: "Xfmr Pos. Seq. Reactance",
      html: "X<sub>T</sub> = |Z<sub>T</sub>| / √1.0025",
      val: `${xT.toFixed(4)} Ω`,
      ref: "Assumed X/R = 20",
      tooltip: "X_T extracted from |Z_T| using Pythagorean relationship with R_T = 0.05 × X_T."
    },
    {
      param: "Xfmr Winding Vector Group",
      html: "Vector Group",
      val: `${trace.transformerVectorGroup ?? "Dyn"} (${(trace.transformerVectorGroup === "Dyn" || trace.transformerVectorGroup === "Yy" || trace.transformerVectorGroup === "YNy") ? "Source Z0 Blocked" : "Source Z0 Passes"})`,
      ref: "-",
      tooltip: "Dyn/Yy/YNy windings block zero-sequence current transfer from the grid side. Only YNyn passes Z0."
    },
  ] : [];

  // ─── Group 3: Motor Contribution (conditional) — Fix #2 ───
  const motorRows: TraceRow[] = (includeMotor && trace.zMotorPos) ? [
    {
      param: "Motor Pos. Seq. Impedance magnitude",
      html: "|Z<sub>M</sub>| = K<sub>M</sub> × (Xd'' / 100) × V<sub>n</sub>² / MVA<sub>M</sub>",
      val: `${trace.zMotorPos.mag.toFixed(4)} Ω`,
      ref: "IEC 60909 Cl. 3.9",
      tooltip: "Motor subtransient impedance. K_M=1.0 assumed (conservative). Real K_M depends on motor power factor.",
      substitution: `1.0 × (${(trace.motorXdPercent ?? 20).toFixed(1)} / 100) × ${trace.voltageKv.toFixed(1)}² / ${(trace.motorMva ?? 10).toFixed(1)} = ${trace.zMotorPos.mag.toFixed(4)} Ω`
    },
    {
      param: "Motor Pos. Seq. Resistance",
      html: "R<sub>M</sub> = X<sub>M</sub> / (X/R)<sub>M</sub>",
      val: `${trace.zMotorPos.r.toFixed(4)} Ω`,
      ref: `X/R = ${trace.motorXRRatio ?? 10}`,
      tooltip: "Motor R derived from nameplate or assumed X/R ratio. Verify against actual motor data if available.",
      substitution: `${trace.zMotorPos.x.toFixed(4)} / ${trace.motorXRRatio ?? 10} = ${trace.zMotorPos.r.toFixed(4)} Ω`
    },
    {
      param: "Motor Pos. Seq. Reactance",
      html: "X<sub>M</sub> = |Z<sub>M</sub>| / √(1 + 1/(X/R)²)",
      val: `${trace.zMotorPos.x.toFixed(4)} Ω`,
      ref: `Xd'' = ${trace.motorXdPercent ?? 20}%`,
      tooltip: "Motor reactance extracted from |Z_M| using the assumed X/R ratio."
    },
    {
      param: "Motor Zero Seq. Contribution",
      html: "Z<sub>M0</sub>",
      val: "Excluded",
      ref: "No zero-seq path",
      tooltip: "Motors are typically delta-connected or ungrounded star — no zero-sequence return path exists."
    },
  ] : [];

  // ─── Group 4: Line Impedance ───
  const lineRows: TraceRow[] = [
    {
      param: "Line Pos. Seq. Impedance R",
      html: "R<sub>L1</sub> = R' × L<sub>fault</sub>",
      val: `${trace.zLinePos.r.toFixed(4)} Ω`,
      ref: `L = ${trace.faultLocationKm.toFixed(2)} km`,
      tooltip: "Positive-sequence line resistance = per-km resistance × fault distance."
    },
    {
      param: "Line Pos. Seq. Impedance X",
      html: "X<sub>L1</sub> = X' × L<sub>fault</sub>",
      val: `${trace.zLinePos.x.toFixed(4)} Ω`,
      ref: `L = ${trace.faultLocationKm.toFixed(2)} km`,
      tooltip: "Positive-sequence line reactance = per-km reactance × fault distance."
    },
    {
      param: "Line Zero Seq. Impedance R",
      html: "R<sub>L0</sub> = R<sub>L1</sub> × mult<sub>R_line</sub>",
      val: `${trace.zLineZero.r.toFixed(4)} Ω`,
      ref: "-",
      tooltip: "Zero-sequence line R uses multiplier (typically 3.0× for overhead lines with earth return).",
      substitution: `${trace.zLinePos.r.toFixed(4)} × mult = ${trace.zLineZero.r.toFixed(4)} Ω`
    },
    {
      param: "Line Zero Seq. Impedance X",
      html: "X<sub>L0</sub> = X<sub>L1</sub> × mult<sub>X_line</sub>",
      val: `${trace.zLineZero.x.toFixed(4)} Ω`,
      ref: "-",
      tooltip: "Zero-sequence line X uses multiplier (typically 3.0× for overhead lines with earth return).",
      substitution: `${trace.zLinePos.x.toFixed(4)} × mult = ${trace.zLineZero.x.toFixed(4)} Ω`
    },
  ];

  // ─── Group 5: Total Impedance at Fault ───
  // Fix #3: Motor-aware total impedance formula
  const seriesR = trace.zSourcePos.r + rT + trace.zLinePos.r;
  const seriesX = trace.zSourcePos.x + xT + trace.zLinePos.x;
  const totalPosRFormula = includeMotor
    ? "Z₁<sub>R</sub> = (R<sub>Q</sub>+R<sub>T</sub>+R<sub>L1</sub>) ∥ Z<sub>M</sub>"
    : "R₁ = R<sub>Q</sub> + R<sub>T</sub> + R<sub>L1</sub>";
  const totalPosXFormula = includeMotor
    ? "Z₁<sub>X</sub> = (X<sub>Q</sub>+X<sub>T</sub>+X<sub>L1</sub>) ∥ Z<sub>M</sub>"
    : "X₁ = X<sub>Q</sub> + X<sub>T</sub> + X<sub>L1</sub>";
  const totalPosSub = includeMotor && trace.zMotorPos
    ? `(${seriesR.toFixed(4)} + j${seriesX.toFixed(4)}) ∥ ${trace.zMotorPos.mag.toFixed(4)} = ${trace.zTotalPos.r.toFixed(4)} + j${trace.zTotalPos.x.toFixed(4)} Ω`
    : `${trace.zSourcePos.r.toFixed(4)} + ${rT.toFixed(4)} + ${trace.zLinePos.r.toFixed(4)} = ${trace.zTotalPos.r.toFixed(4)} Ω`;

  const totalRows: TraceRow[] = [
    {
      param: "Total Pos. Seq. Resistance at fault",
      html: totalPosRFormula,
      val: `${trace.zTotalPos.r.toFixed(4)} Ω`,
      ref: includeMotor ? "Parallel combination" : "Series sum",
      tooltip: includeMotor
        ? "Z1 is the parallel combination of the grid-series path and motor impedance. Motor adds a parallel current source."
        : "Z1 positive-sequence total = series sum of source + transformer + line impedances.",
      substitution: totalPosSub
    },
    {
      param: "Total Pos. Seq. Reactance at fault",
      html: totalPosXFormula,
      val: `${trace.zTotalPos.x.toFixed(4)} Ω`,
      ref: includeMotor ? "Parallel combination" : "Series sum",
      tooltip: includeMotor
        ? "Reactance component of parallel combination. Complex arithmetic preserves accurate phase angles."
        : "X1 positive-sequence total = series sum of source + transformer + line reactances."
    },
    {
      param: "Total Zero Seq. Resistance at fault",
      html: "R₀ = R<sub>Q0</sub> + R<sub>T0</sub> + R<sub>L0</sub>",
      val: `${trace.zTotalZero.r.toFixed(4)} Ω`,
      ref: "Series sum",
      tooltip: "Zero-sequence impedance is always series (motor excluded). Delta/Yy windings block grid Z0 transfer."
    },
    {
      param: "Total Zero Seq. Reactance at fault",
      html: "X₀ = X<sub>Q0</sub> + X<sub>T0</sub> + X<sub>L0</sub>",
      val: `${trace.zTotalZero.x.toFixed(4)} Ω`,
      ref: "Series sum",
      tooltip: "Zero-sequence reactance is always series. Motor is excluded (no zero-seq return path)."
    },
  ];

  // ─── Group 6: Dynamic Factors ───
  // Fix #1: Thermal formula text updated to κ-based IEC Annex A formula
  const factorRows: TraceRow[] = [
    {
      param: "Peak short-circuit factor (3-phase)",
      html: "κ = 1.02 + 0.98 · e<sup>-3 / (X₁/R₁)</sup>",
      val: `${trace.kappa3ph.toFixed(4)}`,
      ref: "IEC 60909 Cl. 4.3",
      tooltip: "Peak factor κ determines the crest value of the first current half-wave after fault inception.",
      substitution: `1.02 + 0.98 × e^(-3 / ${(trace.zTotalPos.x / Math.max(trace.zTotalPos.r, 0.0001)).toFixed(2)}) = ${trace.kappa3ph.toFixed(4)}`
    },
    {
      param: "DC decay time constant (3-phase)",
      html: "τ = X₁ / (2π · f · R₁)",
      val: `${(trace.tau3ph * 1000).toFixed(1)} ms`,
      ref: "f = 50 Hz",
      tooltip: "Time constant of the decaying DC component in the short-circuit current.",
      substitution: `${trace.zTotalPos.x.toFixed(4)} / (2π × 50 × ${trace.zTotalPos.r.toFixed(4)}) = ${(trace.tau3ph * 1000).toFixed(1)} ms`
    },
    {
      param: "Thermal equivalent factor m",
      html: "m = [e<sup>4f·T<sub>k</sub>·ln(κ-1)</sup> - 1] / [2f·T<sub>k</sub>·ln(κ-1)]",
      val: `${trace.m3ph.toFixed(4)}`,
      ref: "IEC 60909 Annex A.3",
      tooltip: "DC component thermal factor from IEC 60909-0 Annex A. Uses exact κ-based logarithmic formula, not the simplified τ approximation.",
      substitution: `κ = ${trace.kappa3ph.toFixed(4)}, Tk = ${trace.tk1.toFixed(1)}s → m = ${trace.m3ph.toFixed(4)}`
    },
  ];

  // Near-to-generator rows (appended to factors)
  if (trace.faultType === "near-to-generator") {
    factorRows.push(
      {
        param: "Symmetrical Breaking Current factor μ",
        html: "μ factor (t<sub>min</sub>)",
        val: `${(results.ib3Phase / results.i3Phase).toFixed(4)}`,
        ref: "IEC 60909 Cl. 4.4",
        tooltip: "μ factor accounts for AC decay of generator short-circuit current. Depends on Ik''/IrG ratio and breaker delay."
      },
      {
        param: "Breaker delay time",
        html: "t<sub>min</sub>",
        val: `${(trace.breakerDelayS ?? 0.05).toFixed(3)} s`,
        ref: "-",
        tooltip: "Minimum time from fault inception to breaker contact separation."
      },
      {
        param: "Generator rating",
        html: "I<sub>rG</sub>",
        val: `${(trace.generatorRatedCurrentKa ?? 2.0).toFixed(2)} kA`,
        ref: "-",
        tooltip: "Rated current of the nearest generator, used for Ik''/IrG ratio in μ-factor calculation."
      }
    );
  }

  // ─── Build groups array ───
  let runningNum = 1;
  const groups: { id: string; title: string; summary: string; accent: string; rows: TraceRow[]; startNum: number }[] = [];

  groups.push({ id: "source", title: "Source Impedance", summary: `|Z_Q| = ${trace.zSourcePos.mag.toFixed(4)} Ω`, accent: "blue", rows: sourceRows, startNum: runningNum });
  runningNum += sourceRows.length;

  if (transRows.length > 0) {
    groups.push({ id: "trans", title: "Transformer Impedance", summary: `|Z_T| = ${trace.zTransPos!.mag.toFixed(4)} Ω`, accent: "amber", rows: transRows, startNum: runningNum });
    runningNum += transRows.length;
  }

  if (motorRows.length > 0) {
    groups.push({ id: "motor", title: "Motor Contribution (+ve/-ve Seq Only)", summary: `|Z_M| = ${trace.zMotorPos!.mag.toFixed(4)} Ω`, accent: "rose", rows: motorRows, startNum: runningNum });
    runningNum += motorRows.length;
  }

  groups.push({ id: "line", title: "Line Impedance", summary: `|Z_L1| = ${trace.zLinePos.mag.toFixed(4)} Ω`, accent: "teal", rows: lineRows, startNum: runningNum });
  runningNum += lineRows.length;

  groups.push({ id: "total", title: "Total Impedance at Fault", summary: `|Z₁| = ${trace.zTotalPos.mag.toFixed(4)} Ω`, accent: "emerald", rows: totalRows, startNum: runningNum });
  runningNum += totalRows.length;

  groups.push({ id: "factors", title: "Dynamic Factors (κ, τ, m" + (trace.faultType === "near-to-generator" ? ", μ" : "") + ")", summary: `κ = ${trace.kappa3ph.toFixed(4)}`, accent: "purple", rows: factorRows, startNum: runningNum });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">IEC 60909 — Fault Impedance & Factor Trace</h3>
        <p className="text-[11px] text-muted-foreground mt-1">Step-by-step trace with grouped sections. <span className="text-slate-500">Hover rows for numeric substitutions and reference tooltips.</span></p>
      </div>
      {/* Table header */}
      <table className="w-full text-[12px] text-left">
        <thead className="bg-accent/50 text-muted-foreground">
          <tr>
            <th className="px-5 py-2.5 font-medium w-12">#</th>
            <th className="px-5 py-2.5 font-medium">Parameter</th>
            <th className="px-5 py-2.5 font-medium">Formula</th>
            <th className="px-5 py-2.5 font-medium">Computed Value</th>
            <th className="px-5 py-2.5 font-medium">Reference</th>
          </tr>
        </thead>
      </table>
      {/* Grouped rows */}
      <div>
        {groups.map((g) => (
          <TraceGroup key={g.id} {...g} />
        ))}
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

function FaultDistanceChart({ inputs }: { inputs: FaultInput }) {
  const chartData = useMemo(() => {
    const data = [];
    const maxDist = inputs.lineLengthKm || 1;
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const dist = (i / steps) * maxDist;
      
      const testInputs: FaultInput = {
        ...inputs,
        faultLocationKm: dist,
      };
      
      const results = calculateFaults(testInputs);
      
      data.push({
        distance: dist.toFixed(1),
        distValue: dist,
        i3Phase: parseFloat(results.i3Phase.toFixed(2)),
        iSLG: parseFloat(results.iLineToGround.toFixed(2)),
        iLL: parseFloat(results.iLineToLine.toFixed(2)),
        iLLG: parseFloat(results.iLineToLineToGround.toFixed(2)),
      });
    }
    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify({ ...inputs, faultLocationKm: undefined })]);

  const currentDist = (inputs.faultLocationKm ?? inputs.lineLengthKm).toFixed(1);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-blue-400" />
        <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Fault Current vs Distance</h3>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis dataKey="distance" stroke="#94a3b8" fontSize={11} tickMargin={10} minTickGap={20} />
            <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val: number | string) => `${val} kA`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              formatter={(value: any) => [`${value} kA`, undefined]}
              labelFormatter={(label: any) => `Distance: ${label} km`}
            />
            
            <ReferenceLine 
              x={currentDist} 
              stroke="#ef4444" 
              strokeDasharray="4 4" 
              label={{ position: "insideTopRight", value: "Current Fault Loc", fill: "#ef4444", fontSize: 10, offset: 10 }}
              strokeWidth={2}
            />
            
            <Line type="monotone" dataKey="i3Phase" name="3-Phase" stroke="#34d399" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="iSLG" name="SLG" stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="iLL" name="L-L" stroke="#fbbf24" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="iLLG" name="LLG" stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
                  voltageKv={inputs.voltageKv}
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
                  voltageKv={inputs.voltageKv}
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
                  voltageKv={inputs.voltageKv}
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
                  voltageKv={inputs.voltageKv}
                />
              </div>

              {/* Fault Distance Chart */}
              <FaultDistanceChart inputs={inputs} />

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
                        ...(results.trace.includeMotor && results.trace.zMotorPos ? [{ name: "Motor Impedance (Z_M) — +ve seq only", z: results.trace.zMotorPos, highlight: false }] : []),
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
                  <div className="px-3 py-2 bg-card rounded-lg border border-white/[0.04] text-[11px] text-foreground/90 leading-relaxed">
                    <span className="font-semibold text-amber-400">Note on Breaking Current (I_b):</span> {
                      inputs.faultType === "near-to-generator"
                        ? "Breaking current includes μ-factor decay for near-to-generator conditions (IEC 60909 Cl. 4.4)."
                        : "Symmetrical breaking current is calculated under the assumption of a far-from-generator short circuit (I_b = I_k''), neglecting generator/motor AC decay components."
                    }
                  </div>
                  {results.clauseReferences.map((c) => (
                    <div key={c.refId} className="px-3 py-2 bg-card rounded-lg border border-white/[0.04] text-[11px] text-foreground/90 leading-relaxed flex items-center gap-2">
                      <span>{c.label}</span>
                      <VerificationBadge tag={c.verification} applicable={true} />
                      <span className="text-[10px] text-muted-foreground">({formatClauseDisplay(c.refId)})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "trace" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <FaultEquationTrace results={results} inputs={inputs} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
