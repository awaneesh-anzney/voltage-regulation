"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ShieldAlert, Settings2, BarChart3, FileText, LineChart,
  SlidersHorizontal, Download, AlertTriangle, CheckCircle2, XCircle,
  FolderOpen, Zap, Cable, X as XIcon, Link2, ChevronDown, ChevronRight
} from "lucide-react";
import { computeSCForces, getDefaultInputs } from "@/lib/scForcesEngine";
import type { SCInputs, SCResults } from "@/lib/scForcesEngine";
import { CONDUCTOR_LIBRARY, getConductorTypes, getConductorsByType } from "@/lib/conductorLibrary";
import type { ConductorSpec } from "@/lib/conductorLibrary";
import { SC_FORCES_TRUST } from "@/lib/trustSystem";
import { TrustIndicator, IECRef } from "@/components/v2/TrustWidgets";
import { autoFillSCForcesFields } from "@/lib/ceaClearances";
import { ResultsDashboard } from "@/components/dashboard/sc-forces/ResultsDashboard";
import { EquationTrace } from "@/components/dashboard/sc-forces/EquationTrace";
import { GraphsPanel } from "@/components/dashboard/sc-forces/GraphsPanel";
import { WhatIfPanel } from "@/components/dashboard/sc-forces/WhatIfPanel";
import { ReportExport } from "@/components/dashboard/sc-forces/ReportExport";

// ─── Input Field Component ───
function InputField({ label, value, unit, onChange, linked, linkSource, disabled, iecRef }: {
  label: string; value: number | string; unit?: string;
  onChange: (v: number | string) => void; linked?: boolean; linkSource?: string; disabled?: boolean;
  iecRef?: { clause: string; desc: string };
}) {
  const isNumber = typeof value === 'number';
  const [localValue, setLocalValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  if (!isFocused && localValue !== String(value)) {
    setLocalValue(String(value));
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</label>
        {linked && (
          <div className="group relative">
            <Link2 className="w-3 h-3 text-teal-400" />
            {linkSource && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 border border-white/10 rounded-md text-[10px] text-teal-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Linked from {linkSource}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type={isNumber ? 'number' : 'text'}
          value={isFocused ? localValue : value}
          disabled={disabled}
          onFocus={() => {
            setIsFocused(true);
            setLocalValue(String(value));
          }}
          onChange={(e) => {
            if (!isNumber) {
              onChange(e.target.value);
              return;
            }
            const raw = e.target.value;
            setLocalValue(raw);
            const parsed = parseFloat(raw);
            if (!isNaN(parsed)) onChange(parsed);
          }}
          onBlur={() => {
            setIsFocused(false);
            if (!isNumber) return;
            const parsed = parseFloat(localValue);
            if (isNaN(parsed)) {
              setLocalValue(String(value));
            } else {
              onChange(parsed);
              setLocalValue(String(parsed));
            }
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
      {iecRef && (
        <div className="pt-0.5">
          <IECRef clause={iecRef.clause} description={iecRef.desc} />
        </div>
      )}
    </div>
  );
}

function SelectField({ label, value, options, unit, onChange, linked, linkSource, disabled, iecRef }: {
  label: string; value: string; options: { value: string; label: string }[]; unit?: string;
  onChange: (v: string) => void; linked?: boolean; linkSource?: string; disabled?: boolean;
  iecRef?: { clause: string; desc: string };
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</label>
        {linked && (
          <div className="group relative">
            <Link2 className="w-3 h-3 text-teal-400" />
            {linkSource && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 border border-white/10 rounded-md text-[10px] text-teal-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Linked from {linkSource}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 min-w-0 bg-[#0a0f18] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] font-mono text-white focus:outline-none focus:border-blue-500/30 transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {unit && <span className="text-[11px] font-semibold text-slate-500 px-2 py-1 bg-white/[0.03] rounded-md">{unit}</span>}
      </div>
      {iecRef && <IECRef clause={iecRef.clause} description={iecRef.desc} />}
    </div>
  );
}

// ─── Section Wrapper ───
function Section({ title, accent, defaultOpen, children }: {
  title: string; accent: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const accentColors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/8 border-blue-500/15",
    teal: "text-teal-400 bg-teal-500/8 border-teal-500/15",
    amber: "text-amber-400 bg-amber-500/8 border-amber-500/15",
    purple: "text-purple-400 bg-purple-500/8 border-purple-500/15",
    slate: "text-slate-400 bg-slate-500/8 border-slate-500/15",
  };
  return (
    <div className="border-b border-white/[0.04] last:border-0">
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer hover:bg-white/[0.02] ${accentColors[accent] || accentColors.slate}`}>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>{title}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Right Inspector Panel ───
export function SCForcesInspector({ inputs, onUpdate, onUpdateInputs, onCalculate, hasLinkedFault, hasLinkedSag }: {
  inputs: SCInputs;
  onUpdate: <K extends keyof SCInputs>(key: K, val: SCInputs[K]) => void;
  onUpdateInputs: (partial: Partial<SCInputs>) => void;
  onCalculate: () => void;
  hasLinkedFault?: boolean;
  hasLinkedSag?: boolean;
}) {
  const conductorTypes = getConductorTypes();

  // Extract type from "AAC Wasp" or fallback to AAC
  const currentType = inputs.conductorName.split(' ')[0] || 'AAC';
  const conductorsForType = getConductorsByType(currentType);
  const currentName = inputs.conductorName.split(' ').slice(1).join(' ') || inputs.conductorName;
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5">
          <Settings2 className="w-4 h-4 text-blue-400" />
          SC Forces Parameters
        </h3>
        <p className="text-[10px] text-slate-600 mt-0.5">IEC 60865-1 / IEC 61936-1</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <Section title="System" accent="blue" defaultOpen>
          <InputField label="Short-Circuit Current I_k3" value={inputs.ik3} unit="A"
            onChange={(v) => onUpdate("ik3", v as number)} linked={hasLinkedFault} linkSource="Fault Analysis"
            iecRef={{ clause: "IEC 60865-1 Cl. 4.2", desc: "Initial symmetrical short-circuit current" }} />
          <InputField label="X/R Ratio" value={inputs.xr} unit=""
            onChange={(v) => onUpdate("xr", v as number)} linked={hasLinkedFault} linkSource="Fault Analysis" />
          <SelectField label="System Voltage" value={String(inputs.vsys)} unit="V"
            options={[
              { value: '132000', label: '132 kV' },
              { value: '220000', label: '220 kV' },
              { value: '400000', label: '400 kV' },
              { value: '765000', label: '765 kV' },
            ]}
            onChange={(v) => {
              const kv = parseFloat(v) / 1000;
              const { phaseToPhaseClearanceM, suggestedPhaseSpacingM } = autoFillSCForcesFields(kv);
              onUpdateInputs({
                vsys: parseFloat(v),
                clph: phaseToPhaseClearanceM,
                aph: suggestedPhaseSpacingM,
              });
            }} />
          <SelectField label="Frequency" value={String(inputs.freq)} unit="Hz"
            options={[
              { value: '50', label: '50 Hz' },
              { value: '60', label: '60 Hz' },
            ]}
            onChange={(v) => onUpdate("freq", parseFloat(v))} />
          <InputField label="Phase Spacing a_ph" value={inputs.aph} unit="m" onChange={(v) => onUpdate("aph", v as number)} />
          <InputField label="Clearance c_l,ph" value={inputs.clph} unit="m" onChange={(v) => onUpdate("clph", v as number)}
            iecRef={{ clause: "CEA Schedule-2", desc: "Phase-to-phase minimum safety clearance" }} />
        </Section>

        <Section title="Conductor" accent="teal">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Type</label>
              <select
                value={currentType}
                onChange={(e) => {
                  const type = e.target.value;
                  const first = getConductorsByType(type)[0];
                  if (first) {
                    onUpdateInputs({
                      conductorName: `${first.type} ${first.name}`,
                      As: first.As, ds: first.ds, mc: first.mc,
                      E: first.E, sigma_fin: first.sigma_fin, cth: first.cth,
                    });
                  }
                }}
                className="w-full bg-[#0a0f18] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-teal-500/30 cursor-pointer"
              >
                {conductorTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Name</label>
              <select
                value={currentName}
                onChange={(e) => {
                  const name = e.target.value;
                  const c = CONDUCTOR_LIBRARY.find(x => x.name === name && x.type === currentType);
                  if (c) {
                    onUpdateInputs({
                      conductorName: `${c.type} ${c.name}`,
                      As: c.As, ds: c.ds, mc: c.mc,
                      E: c.E, sigma_fin: c.sigma_fin, cth: c.cth,
                    });
                  } else {
                    onUpdate("conductorName", name); // For custom names
                  }
                }}
                className="w-full bg-[#0a0f18] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-teal-500/30 cursor-pointer"
              >
                {conductorsForType.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                <option value="Custom">Custom...</option>
              </select>
            </div>
          </div>
          {currentName === "Custom" && (
            <InputField label="Custom Name" value={inputs.conductorName} onChange={(v) => onUpdate("conductorName", v as string)} />
          )}
          <SelectField label="Sub-conductors n_c" value={String(inputs.nc)} unit=""
            options={[
              { value: '1', label: 'Single' },
              { value: '2', label: 'Twin (2)' },
              { value: '3', label: 'Triple (3)' },
              { value: '4', label: 'Quad (4)' },
              { value: '6', label: 'Hexa (6)' },
              { value: '8', label: 'Octa (8)' },
            ]}
            onChange={(v) => onUpdate("nc", parseInt(v))} />
          <InputField label="Bundle Spacing a_s" value={inputs.as} unit="m" onChange={(v) => onUpdate("as", v as number)} />
          <InputField label="Cross-section A_s" value={inputs.As} unit="mm²" onChange={(v) => onUpdate("As", v as number)} />
          <InputField label="Diameter d_s" value={inputs.ds} unit="mm" onChange={(v) => onUpdate("ds", v as number)} />
          <InputField label="Mass m_c" value={inputs.mc} unit="kg/m" onChange={(v) => onUpdate("mc", v as number)} />
          <InputField label="Young's Modulus E" value={inputs.E} unit="N/mm²" onChange={(v) => onUpdate("E", v as number)} />
        </Section>

        <Section title="Span & Structure" accent="amber">
          <InputField label="Span Length l" value={inputs.lspan} unit="m" onChange={(v) => onUpdate("lspan", v as number)}
            iecRef={{ clause: "IEC 60865-1 Cl. 7.1", desc: "Span length between supports" }} />
          <InputField label="Insulator Length l_i" value={inputs.li} unit="m" onChange={(v) => onUpdate("li", v as number)} />
          <InputField label="Girder Width D_g" value={inputs.dg} unit="m" onChange={(v) => onUpdate("dg", v as number)} />
          <InputField label="Stringing Height H" value={inputs.H} unit="m" onChange={(v) => onUpdate("H", v as number)} />
          <InputField label="Static Tension F_st" value={inputs.fst_kg} unit="kg"
            onChange={(v) => onUpdate("fst_kg", v as number)} linked={hasLinkedSag} linkSource="Sag-Tension"
            iecRef={{ clause: "IEC 60865-1 Cl. 7.2", desc: "Static tensile force in the conductor" }} />
          <InputField label="SC Duration T_k1" value={inputs.tk1} unit="s"
            onChange={(v) => onUpdate("tk1", v as number)}
            iecRef={{ clause: "IEC 60865-1 Cl. 7.3.2", desc: "Duration of the short-circuit current" }} />
        </Section>

        <Section title="Spacer & Dropper" accent="purple" defaultOpen={false}>
          <InputField label="Spacer Span l_s" value={inputs.ls} unit="m" onChange={(v) => onUpdate("ls", v as number)} />
          <InputField label="Spacer Mass m_s" value={inputs.ms} unit="kg" onChange={(v) => onUpdate("ms", v as number)} />
          <InputField label="Dropper Mass m_d" value={inputs.md} unit="g" onChange={(v) => onUpdate("md", v as number)} />
          <InputField label="Dropper Height h_drop" value={inputs.h_drop} unit="m" onChange={(v) => onUpdate("h_drop", v as number)} />
          <InputField label="Dropper Spacing w_drop" value={inputs.w_drop} unit="m" onChange={(v) => onUpdate("w_drop", v as number)} />
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Dropper Plane</label>
            <div className="flex bg-[#0a0f18] border border-white/[0.06] rounded-lg p-1">
              <button
                onClick={() => onUpdate("dropperPlane", "perpendicular")}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  inputs.dropperPlane === 'perpendicular' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-500 hover:text-white'
                }`}
              >
                Perpendicular
              </button>
              <button
                onClick={() => onUpdate("dropperPlane", "parallel")}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  inputs.dropperPlane === 'parallel' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-500 hover:text-white'
                }`}
              >
                Parallel
              </button>
            </div>
          </div>
        </Section>

        <Section title="Material" accent="slate" defaultOpen={false}>
          <InputField label="σ_fin (final stress)" value={inputs.sigma_fin} unit="Pa" onChange={(v) => onUpdate("sigma_fin", v as number)} />
          <InputField label="Cross-section S" value={inputs.S} unit="mm²" onChange={(v) => onUpdate("S", v as number)} />
          <InputField label="c_th (thermal const)" value={inputs.cth} unit="" onChange={(v) => onUpdate("cth", v as number)} />
        </Section>
      </div>

      {/* Calculate Button */}
      <div className="p-3 border-t border-white/[0.06] shrink-0">
        <button onClick={onCalculate}
          className="w-full py-3 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer hover:-translate-y-px active:translate-y-0 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" />
          Calculate SC Forces
        </button>
      </div>
    </div>
  );
}

// ─── Center Canvas Content ───
type CanvasTab = "results" | "trace" | "visual" | "whatif" | "report";

const CANVAS_TABS: { id: CanvasTab; label: string; icon: React.ElementType }[] = [
  { id: "results", label: "Results",        icon: BarChart3 },
  { id: "trace",   label: "Equation Trace", icon: FileText },
  { id: "visual",  label: "Visualisation",  icon: LineChart },
  { id: "whatif",  label: "What-If",        icon: SlidersHorizontal },
  { id: "report",  label: "Report",         icon: Download },
];

export function SCForcesCanvas({ inputs, results }: { inputs: SCInputs; results: SCResults }) {
  const [tab, setTab] = useState<CanvasTab>("results");

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-blue-500" />
          Short-Circuit Mechanical Forces
        </h1>
        <p className="text-[13px] text-slate-400 mt-1.5 max-w-2xl">
          IEC 60865-1 / IEC 61936-1 compliant analysis for flexible conductors. Structural consequence analysis of fault currents on transmission line spans.
        </p>
      </div>

      {/* Info Strip */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/[0.06] border border-blue-500/15 text-[12px] text-slate-300">
        <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="font-mono">
          {inputs.conductorName} {inputs.nc > 1 ? `${inputs.nc}-bundle` : "single"} · {inputs.vsys / 1000} kV · {(inputs.ik3 / 1000).toFixed(1)} kA · {inputs.lspan} m span
        </span>
      </div>

      {/* Trust Summary Panel */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-4">
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] mb-3">Key Results — Trust Indicators</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { key: "Fmax", label: "F_max", val: (results.Fmax / 1000).toFixed(2), unit: "kN" },
            { key: "Ftd", label: "F_td", val: (results.Ftd / 1000).toFixed(2), unit: "kN" },
            { key: "Ffd", label: "F_fd", val: (results.Ffd / 1000).toFixed(2), unit: "kN" },
            { key: "Fpi", label: "F_pi", val: (results.Fpi / 1000).toFixed(2), unit: "kN" },
            { key: "deltam_deg", label: "δ_m", val: results.deltam_deg.toFixed(1), unit: "°" },
            { key: "psi", label: "ψ", val: results.psi.toFixed(4), unit: "" },
            { key: "k", label: "κ", val: results.k.toFixed(3), unit: "" },
            { key: "CD", label: "C_D", val: results.CD.toFixed(4), unit: "" },
            { key: "amin", label: "a_min", val: results.amin.toFixed(3), unit: "m" },
            { key: "clCheck", label: "Clearance", val: results.clCheck ? "PASS" : "FAIL", unit: "" },
          ].map(item => (
            <div key={item.key} className="bg-[#0a0f18] rounded-xl p-3 border border-white/[0.04]">
              <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-1">{item.label}</div>
              <TrustIndicator
                badge={SC_FORCES_TRUST[item.key]}
                value={item.val}
                unit={item.unit}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {results.warnings.length > 0 && (
        <div className="space-y-1.5">
          {results.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex gap-1 bg-[#111827] p-1 rounded-xl border border-white/[0.06] w-full overflow-x-auto no-scrollbar">
        {CANVAS_TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer whitespace-nowrap ${
              tab === t.id
                ? "bg-white/[0.08] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "results" && <ResultsDashboard inputs={inputs} results={results} />}
      {tab === "trace" && <EquationTrace results={results} />}
      {tab === "visual" && <GraphsPanel inputs={inputs} results={results} />}
      {tab === "whatif" && <WhatIfPanel baseInputs={inputs} baseResults={results} />}
      {tab === "report" && <ReportExport inputs={inputs} results={results} />}
    </div>
  );
}
