"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Cable, Settings2, BarChart3, TrendingUp, ChevronDown, ChevronRight,
  Link2, Zap, AlertTriangle, CheckCircle2, XCircle, ArrowRight, Thermometer,
  FileText
} from "lucide-react";
import { computeSagTension, getDefaultSagTensionInputs } from "@/lib/sagTensionEngine";
import type { SagTensionInputs, SagTensionResults, SagTableRow } from "@/lib/sagTensionEngine";
import { CONDUCTOR_LIBRARY, getConductorTypes, getConductorsByType } from "@/lib/conductorLibrary";
import { getClearanceSpec } from "@/lib/ceaClearances";

function InputField({ label, value, unit, onChange, disabled, step }: {
  label: string; value: number | string; unit?: string;
  onChange: (v: number | string) => void; disabled?: boolean; step?: number;
}) {
  const isNumber = typeof value === 'number';
  const [localValue, setLocalValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  if (!isFocused && localValue !== String(value)) {
    setLocalValue(String(value));
  }

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type={isNumber ? 'number' : 'text'}
          step={step}
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
          className="w-full flex-1 min-w-0 bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground font-mono
            focus:outline-none focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/20
            disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        />
        {unit && (
          <span className="px-2 py-1 rounded-md bg-teal-500/10 border border-teal-500/15 text-[10px] text-teal-400 font-semibold shrink-0">
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
    teal: "text-teal-400 bg-teal-500/8 border-teal-500/15",
    amber: "text-amber-400 bg-amber-500/8 border-amber-500/15",
    blue: "text-blue-400 bg-blue-500/8 border-blue-500/15",
    slate: "text-muted-foreground bg-slate-500/8 border-slate-500/15",
  };
  return (
    <div className="border-b border-white/[0.04] last:border-0">
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer hover:bg-accent/30 ${accentColors[accent] || accentColors.slate}`}>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>{title}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Right Inspector ───
export function SagTensionInspector({ inputs, onUpdateInputs, results }: {
  inputs: SagTensionInputs;
  onUpdateInputs: (partial: Partial<SagTensionInputs>) => void;
  results: SagTensionResults;
}) {
  const conductorTypes = getConductorTypes();

  const currentType = useMemo(() => {
    const firstPart = inputs.conductorName.split(' ')[0];
    if (conductorTypes.includes(firstPart)) {
      return firstPart;
    }
    return 'ACSR';
  }, [inputs.conductorName, conductorTypes]);

  const currentName = useMemo(() => {
    const parts = inputs.conductorName.split(' ');
    if (conductorTypes.includes(parts[0])) {
      return parts.slice(1).join(' ') || 'Custom';
    }
    return inputs.conductorName || 'Custom';
  }, [inputs.conductorName, conductorTypes]);

  const isCustom = useMemo(() => {
    return !CONDUCTOR_LIBRARY.some(c => `${c.type} ${c.name}` === inputs.conductorName);
  }, [inputs.conductorName]);

  const conductorsForType = getConductorsByType(currentType);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
            <Settings2 className="w-4 h-4 text-teal-400" />
            Sag-Tension Parameters
          </h3>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Standard</span>
          <select
            value={inputs.standard || 'IS802'}
            onChange={(e) => onUpdateInputs({ standard: e.target.value as any })}
            className="bg-card border border-border rounded px-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-teal-500/30 cursor-pointer"
          >
            <option value="IS802">IS 802:2015 (India)</option>
            <option value="IEC60826">IEC 60826 (International)</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Conductor specifications */}
        <Section title="Conductor" accent="teal" defaultOpen>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Type</label>
              <select
                value={currentType}
                onChange={(e) => {
                  const type = e.target.value;
                  const first = getConductorsByType(type)[0];
                  if (first) {
                    onUpdateInputs({
                      conductorName: `${first.type} ${first.name}`,
                      area_mm2: first.As, diameter_mm: first.ds,
                      weight_kg_m: first.mc, uts_kN: first.uts,
                      elasticModulus_N_mm2: first.E,
                      thermalExpCoeff: first.thermalExpCoeff,
                      finalModulus_N_mm2: first.finalModulus || 0,
                    });
                  }
                }}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-teal-500/30 cursor-pointer"
              >
                {conductorTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Name</label>
              <select
                value={isCustom ? "Custom" : currentName}
                onChange={(e) => {
                  const name = e.target.value;
                  const c = CONDUCTOR_LIBRARY.find(x => x.name === name && x.type === currentType);
                  if (c) {
                    onUpdateInputs({
                      conductorName: `${c.type} ${c.name}`,
                      area_mm2: c.As, diameter_mm: c.ds,
                      weight_kg_m: c.mc, uts_kN: c.uts,
                      elasticModulus_N_mm2: c.E,
                      thermalExpCoeff: c.thermalExpCoeff,
                      finalModulus_N_mm2: c.finalModulus || 0,
                    });
                  } else {
                    onUpdateInputs({ conductorName: `${currentType} Custom` });
                  }
                }}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-teal-500/30 cursor-pointer"
              >
                {conductorsForType.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                <option value="Custom">Custom...</option>
              </select>
            </div>
          </div>
          {isCustom && (
            <InputField label="Custom Name" value={currentName} onChange={(v) => onUpdateInputs({ conductorName: `${currentType} ${v}` })} />
          )}
          <InputField label="Area" value={inputs.area_mm2} unit="mm²" onChange={(v) => onUpdateInputs({ area_mm2: v as number })} disabled={!isCustom} />
          <InputField label="Diameter" value={inputs.diameter_mm} unit="mm" onChange={(v) => onUpdateInputs({ diameter_mm: v as number })} disabled={!isCustom} />
          <InputField label="Weight" value={inputs.weight_kg_m} unit="kg/m" onChange={(v) => onUpdateInputs({ weight_kg_m: v as number })} disabled={!isCustom} />
          <InputField label="UTS" value={inputs.uts_kN} unit="kN" onChange={(v) => onUpdateInputs({ uts_kN: v as number })} disabled={!isCustom} />
          <InputField label="Elastic Modulus E" value={inputs.elasticModulus_N_mm2} unit="N/mm²" onChange={(v) => onUpdateInputs({ elasticModulus_N_mm2: v as number })} disabled={!isCustom} />
          <InputField label="Thermal Exp. α" value={inputs.thermalExpCoeff} unit="/°C" onChange={(v) => onUpdateInputs({ thermalExpCoeff: v as number })} disabled={!isCustom} />
        </Section>

        {/* Span geometry */}
        <Section title="Span Geometry" accent="amber">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">System Voltage</label>
            <select
              value={inputs.systemVoltageKv || 400}
              onChange={(e) => {
                const kv = parseInt(e.target.value);
                const spec = getClearanceSpec(kv).spec;
                onUpdateInputs({
                  systemVoltageKv: kv,
                  minGroundClearance_m: spec.groundClearanceM
                });
              }}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-amber-500/30 cursor-pointer"
            >
              <option value={765}>765 kV</option>
              <option value={400}>400 kV</option>
              <option value={220}>220 kV</option>
              <option value={132}>132 kV</option>
              <option value={33}>33 kV</option>
            </select>
          </div>
          <InputField label="Span Length" value={inputs.span_m} unit="m" onChange={(v) => onUpdateInputs({ span_m: v as number })} />
          <InputField label="Ruling Span (0=same)" value={inputs.rulingSpan_m} unit="m" onChange={(v) => onUpdateInputs({ rulingSpan_m: v as number })} />
          <InputField label="Level Difference" value={inputs.levelDiff_m} unit="m" onChange={(v) => onUpdateInputs({ levelDiff_m: v as number })} />
          <InputField label="Tower Height" value={inputs.towerHeight_m} unit="m" onChange={(v) => onUpdateInputs({ towerHeight_m: v as number })} />
          <InputField label="Insulator Length" value={inputs.insulatorLength_m} unit="m" onChange={(v) => onUpdateInputs({ insulatorLength_m: v as number })} />
          <InputField label="Min Ground Clearance" value={inputs.minGroundClearance_m} unit="m" onChange={(v) => onUpdateInputs({ minGroundClearance_m: v as number })} />
        </Section>

        {/* Dynamic Loading Section */}
        <Section title="Loading & Wind" accent="blue">
          {(inputs.standard || 'IS802') === 'IS802' ? (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Wind Zone (IS 802)</label>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3, 4, 5, 6].map((z) => {
                    const zoneRoman = z === 1 ? "I" : z === 2 ? "II" : z === 3 ? "III" : z === 4 ? "IV" : z === 5 ? "V" : "VI";
                    return (
                      <button
                        key={z}
                        onClick={() => onUpdateInputs({ windZone: z })}
                        className={`py-1.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                          (inputs.windZone || 4) === z
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : "bg-accent/50 text-muted-foreground border border-border hover:text-foreground"
                        }`}
                      >
                        Zone {zoneRoman}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Terrain Cat.</label>
                  <select
                    value={inputs.terrainCategory || 2}
                    onChange={(e) => onUpdateInputs({ terrainCategory: parseInt(e.target.value) as any })}
                    className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[12px] text-foreground focus:outline-none focus:border-blue-500/30 cursor-pointer"
                  >
                    <option value={1}>Category 1 (Open)</option>
                    <option value={2}>Category 2 (Normal)</option>
                    <option value={3}>Category 3 (Dense)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Reliability</label>
                  <select
                    value={inputs.reliabilityLevel || 1}
                    onChange={(e) => onUpdateInputs({ reliabilityLevel: parseInt(e.target.value) as any })}
                    className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[12px] text-foreground focus:outline-none focus:border-blue-500/30 cursor-pointer"
                  >
                    <option value={1}>Level 1 (≤400kV)</option>
                    <option value={2}>Level 2 (&gt;400kV)</option>
                    <option value={3}>Level 3 (Special)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <InputField
                  label="Cond. Gust Factor Gc"
                  value={inputs.conductorGustFactor !== undefined && inputs.conductorGustFactor !== 0 ? inputs.conductorGustFactor : parseFloat((results.trace?.conductorGustFactor ?? 1.65).toFixed(2))}
                  unit=""
                  onChange={(v) => onUpdateInputs({ conductorGustFactor: v as number })}
                  step={0.05}
                />
                <InputField
                  label="Ins. Gust Factor Gi"
                  value={inputs.insulatorGustFactor !== undefined && inputs.insulatorGustFactor !== 0 ? inputs.insulatorGustFactor : parseFloat((results.trace?.insulatorGustFactor ?? 2.10).toFixed(2))}
                  unit=""
                  onChange={(v) => onUpdateInputs({ insulatorGustFactor: v as number })}
                  step={0.05}
                />
              </div>
            </>
          ) : (
            <InputField
              label="Wind Pressure"
              value={inputs.windPressure_Pa}
              unit="Pa"
              onChange={(v) => onUpdateInputs({ windPressure_Pa: v as number })}
            />
          )}

          <InputField label="Ice Thickness" value={inputs.iceFactor} unit="mm" onChange={(v) => onUpdateInputs({ iceFactor: v as number })} />
        </Section>

        {/* Drag coefficients and insulator parameters */}
        <Section title="Drag & Insulator Details" accent="slate" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="Drag Coeff (Cond)"
              value={inputs.dragCoeff_conductor ?? 1.0}
              unit=""
              onChange={(v) => onUpdateInputs({ dragCoeff_conductor: v as number })}
              step={0.05}
            />
            <InputField
              label="Drag Coeff (Ins)"
              value={inputs.dragCoeff_insulator ?? 1.2}
              unit=""
              onChange={(v) => onUpdateInputs({ dragCoeff_insulator: v as number })}
              step={0.05}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <InputField
              label="Insulator Weight"
              value={inputs.insulatorWeight_kg ?? 100}
              unit="kg"
              onChange={(v) => onUpdateInputs({ insulatorWeight_kg: v as number })}
            />
            <InputField
              label="Insulator Area"
              value={inputs.insulatorArea_m2 ?? 0.5}
              unit="m²"
              onChange={(v) => onUpdateInputs({ insulatorArea_m2: v as number })}
              step={0.05}
            />
          </div>
        </Section>

        {/* Stringing limits */}
        <Section title="Stringing State" accent="slate" defaultOpen={false}>
          <InputField label="Reference Temp" value={inputs.refTemp_C} unit="°C" onChange={(v) => onUpdateInputs({ refTemp_C: v as number })} />
          <InputField label="Initial Tension" value={inputs.initialTension_pctUTS} unit="% UTS" onChange={(v) => onUpdateInputs({ initialTension_pctUTS: v as number })} />
          <InputField label="Safety Factor" value={inputs.safetyFactor} unit="" onChange={(v) => onUpdateInputs({ safetyFactor: v as number })} />
        </Section>
      </div>
    </div>
  );
}

// ─── KPI Card ───
function KPI({ label, value, unit, status, sublabel }: {
  label: string; value: string; unit: string; status?: "pass" | "fail" | "warn"; sublabel?: string;
}) {
  const statusColors = {
    pass: "border-emerald-500/20 bg-emerald-500/5",
    fail: "border-red-500/20 bg-red-500/5",
    warn: "border-amber-500/20 bg-amber-500/5",
  };
  return (
    <div className={`rounded-xl border p-4 ${status ? statusColors[status] : "border-border bg-card"}`}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[22px] font-mono font-bold text-foreground">{value}</span>
        <span className="text-[11px] text-muted-foreground font-mono">{unit}</span>
      </div>
      {sublabel && <div className="text-[10px] text-muted-foreground/80 mt-0.5 font-mono">{sublabel}</div>}
      {status && (
        <div className={`flex items-center gap-1 mt-2 text-[10px] font-semibold ${
          status === "pass" ? "text-emerald-400" : status === "fail" ? "text-red-400" : "text-amber-400"
        }`}>
          {status === "pass" ? <CheckCircle2 className="w-3 h-3" /> : status === "fail" ? <XCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          {status === "pass" ? "Pass" : status === "fail" ? "Fail" : "Warning"}
        </div>
      )}
    </div>
  );
}

// ─── Equation Trace Component ───
export function SagTensionEquationTrace({ results }: { results: SagTensionResults }) {
  const { trace } = results;
  if (!trace) return null;

  const rows = [
    { num: 1, param: "Design Standard Selected", html: "Standard", val: trace.standard === "IS802" ? "IS 802:2015 (India)" : "IEC 60826", ref: "-" },
  ];

  if (trace.standard === "IS802") {
    rows.push(
      { num: 2, param: "Basic Wind Speed", html: "V<sub>b</sub>", val: `${trace.vBasic} m/s`, ref: "IS 802 Table 3" },
      { num: 3, param: "Reliability Factor (Risk Coefficient)", html: "K₁", val: trace.k1.toFixed(2), ref: "IS 802 Table 2" },
      { num: 4, param: "Terrain Category Factor", html: "K₂", val: trace.k2.toFixed(2), ref: "IS 802 Table 3" },
      { num: 5, param: "Design Wind Speed", html: "V<sub>d</sub> = V<sub>b</sub> × K₁ × K₂", val: `${trace.vDesign.toFixed(2)} m/s`, ref: "Clause 8.3" },
      { num: 6, param: "Design Wind Pressure", html: "P<sub>d</sub> = 0.6 × V<sub>d</sub>²", val: `${trace.pDesign.toFixed(1)} N/m²`, ref: "Table 4 / Clause 8.4" },
      { num: 7, param: "Conductor Gust Response Factor", html: "G<sub>c</sub>", val: trace.conductorGustFactor.toFixed(2), ref: "Table 7" },
      { num: 8, param: "Insulator Gust Factor", html: "G<sub>i</sub>", val: trace.insulatorGustFactor.toFixed(2), ref: "Table 6" }
    );
  } else {
    rows.push(
      { num: 2, param: "Design Wind Pressure (Direct)", html: "P<sub>d</sub>", val: `${trace.pDesign.toFixed(1)} N/m²`, ref: "Manual Input" }
    );
  }

  const offset = trace.standard === "IS802" ? 7 : 1;

  rows.push(
    { num: 2 + offset, param: "Conductor Drag Coefficient", html: "C<sub>dc</sub>", val: trace.dragCoeffConductor.toFixed(2), ref: "Clause 9.3.1" },
    { num: 3 + offset, param: "Insulator Drag Coefficient", html: "C<sub>di</sub>", val: trace.dragCoeffInsulator.toFixed(2), ref: "Clause 9.3.1" },
    { num: 4 + offset, param: "Effective Conductor Wind Pressure", html: "P<sub>cond</sub> = P<sub>d</sub> × G<sub>c</sub>", val: `${trace.effectiveWindPressurePa.toFixed(1)} N/m²`, ref: "-" },
    { num: 5 + offset, param: "Conductor Wind Load per Meter", html: "w<sub>wind\_cond</sub> = C<sub>dc</sub> × P<sub>cond</sub> × d<sub>cond</sub>", val: `${trace.wWindCond.toFixed(3)} N/m`, ref: "Clause 9.3" },
    { num: 6 + offset, param: "Insulator Wind Force (per string)", html: "F<sub>wind\_ins</sub> = C<sub>di</sub> × (P<sub>d</sub> × G<sub>i</sub>) × A<sub>ins</sub>", val: `${trace.fWindIns.toFixed(1)} N`, ref: "Clause 9.3" },
    { num: 7 + offset, param: "Insulator Swing Angle", html: "θ<sub>swing\_ins</sub> = atan[ (F<sub>wind\_ins</sub> + 0.5·w<sub>wind</sub>·L) / ... ]", val: `${trace.insulatorSwingAngleDeg.toFixed(2)}°`, ref: "Vector physics" },
    { num: 8 + offset, param: "Insulator Vertical Drop under swing", html: "y<sub>drop</sub> = L<sub>ins</sub> × cos(θ<sub>swing\_ins</sub>)", val: `${trace.insulatorVerticalDropM.toFixed(3)} m`, ref: "Geometry" }
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mt-4 animate-in fade-in duration-300">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">IS 802 / IEC 60826 — Mechanical Wind Force & Swing Trace</h3>
        <p className="text-[11px] text-muted-foreground mt-1">Detailed step-by-step intermediate variables and design coefficients.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] text-left">
          <thead className="bg-accent/50 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium w-12">#</th>
              <th className="px-5 py-3 font-medium">Parameter</th>
              <th className="px-5 py-3 font-medium">Formula</th>
              <th className="px-5 py-3 font-medium">Computed Value</th>
              <th className="px-5 py-3 font-medium">Standard Reference</th>
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
type CanvasTab = "results" | "profile" | "sweep" | "trace";

export function SagTensionCanvas({ inputs, results, onFeedToSCForces }: {
  inputs: SagTensionInputs; results: SagTensionResults;
  onFeedToSCForces?: (data: { fst_kg: number; span_m: number; conductorName: string }) => void;
}) {
  const [tab, setTab] = useState<CanvasTab>("results");

  // Catenary points for SVG
  const catenaryPoints = useMemo(() => {
    const N = 60;
    const w = inputs.weight_kg_m * 9.807;
    const T = results.staticTension_kg * 9.807;
    const L = inputs.span_m;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * L;
      const xc = x - L / 2;
      const y = (T / w) * (Math.cosh((w * xc) / T) - Math.cosh((w * L) / (2 * T)));
      pts.push({ x, y: -y }); // flip for SVG
    }
    return pts;
  }, [inputs, results]);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Cable className="w-5 h-5 text-teal-500" />
            Sag-Tension Analysis
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            IS 802 / IEC 60826 catenary sag-tension with change-of-state equation
          </p>
        </div>
        {onFeedToSCForces && (
          <button onClick={() => onFeedToSCForces({
            fst_kg: results.staticTension_kg, span_m: inputs.span_m, conductorName: inputs.conductorName
          })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 transition-all cursor-pointer">
            Use F_st in SC Forces <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Info Strip */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500/[0.06] border border-teal-500/15 text-[12px] text-foreground/90">
        <Cable className="w-4 h-4 text-teal-400 shrink-0" />
        <span className="font-mono">
          {inputs.conductorName} · {inputs.span_m}m span · {inputs.systemVoltageKv || 400}kV · Standard: {inputs.standard || 'IS802'} · Wind: {results.trace?.pDesign ?? inputs.windPressure_Pa} Pa · Ref: {inputs.refTemp_C}°C @ {inputs.initialTension_pctUTS}% UTS
        </span>
      </div>

      {/* Warnings */}
      {results.warnings.length > 0 && (
        <div className="space-y-1.5 animate-in slide-in-from-top-1">
          {results.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 text-amber-300 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI label="Static Tension F_st" value={results.staticTension_kg.toFixed(0)} unit="kg"
          sublabel={`${results.staticTension_kN.toFixed(1)} kN`} />
        <KPI label="Max Sag" value={results.maxSag_m.toFixed(2)} unit="m"
          sublabel={`at ${results.maxSag_temp_C}°C`} />
        <KPI label="Min Clearance" value={results.minClearance_m.toFixed(2)} unit="m"
          sublabel={`at ${results.minClearance_temp_C}°C`}
          status={results.clearance_check ? "pass" : "fail"} />
        <KPI label="Max Tension" value={results.maxTension_kg.toFixed(0)} unit="kg"
          sublabel={`at ${results.maxTension_temp_C}°C`}
          status={results.uts_check ? "pass" : "fail"} />
        <KPI label="UTS Check" value={results.uts_check ? "PASS" : "FAIL"} unit=""
          sublabel={`SF = ${inputs.safetyFactor}`}
          status={results.uts_check ? "pass" : "fail"} />
        <KPI label="Cat vs Para" value={results.catenary_vs_parabolic_pct.toFixed(2)} unit="%"
          sublabel="max difference" />
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex gap-1 bg-card p-1 rounded-xl border border-border overflow-x-auto no-scrollbar">
        {[
          { id: "results" as const, label: "Sag-Tension Table", icon: BarChart3 },
          { id: "profile" as const, label: "Catenary Profile", icon: Cable },
          { id: "sweep" as const, label: "Temperature Sweep", icon: Thermometer },
          { id: "trace" as const, label: "Equation Trace", icon: FileText },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer whitespace-nowrap ${
              tab === t.id ? "bg-white/[0.08] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/90 hover:bg-accent/50"
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {tab === "results" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-card text-muted-foreground font-bold border-b border-border">
                  {["Temp (°C)", "Condition", "Tension (kg)", "% UTS", "Vertical Sag (m)", "Clearance (m)", "Blowout (m)", "Swing Angle", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.sagTable.map((row, i) => (
                  <tr key={i} className={`border-t border-white/[0.04] ${row.condition === "Full Wind" ? "bg-blue-500/[0.03]" : ""}`}>
                    <td className="px-4 py-2.5 font-mono text-foreground font-semibold">{row.temperature_C}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.condition}</td>
                    <td className="px-4 py-2.5 font-mono text-foreground">{row.tension_kg.toFixed(1)}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{row.tension_pctUTS.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 font-mono text-amber-300">{row.sag_m.toFixed(3)}</td>
                    <td className="px-4 py-2.5 font-mono text-foreground">{row.clearance_m.toFixed(2)}</td>
                    <td className="px-4 py-2.5 font-mono text-cyan-400">{row.blowout_m.toFixed(2)}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-300">{row.swingAngle_deg.toFixed(1)}°</td>
                    <td className="px-4 py-2.5">
                      {row.clearance_ok
                        ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />OK</span>
                        : <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" />FAIL</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catenary Profile SVG */}
      {tab === "profile" && (
        <div className="bg-card rounded-2xl border border-border p-6 animate-in fade-in duration-300">
          <svg viewBox={`-20 -20 ${inputs.span_m + 40} ${(results.maxSag_m * 1.8) + 60}`} className="w-full" style={{ minHeight: 300 }}>
            <defs>
              <linearGradient id="sagGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Ground line */}
            <line x1="-10" y1={results.maxSag_m * 1.6} x2={inputs.span_m + 10} y2={results.maxSag_m * 1.6}
              stroke="#334155" strokeWidth="1" strokeDasharray="6,4" />
            <text x={inputs.span_m / 2} y={results.maxSag_m * 1.6 + 15}
              textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">Ground Level</text>

            {/* Tower left */}
            <rect x="-6" y="-10" width="12" height={results.maxSag_m * 1.6 + 10} rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            {/* Tower right */}
            <rect x={inputs.span_m - 6} y="-10" width="12" height={results.maxSag_m * 1.6 + 10} rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />

            {/* Catenary curve */}
            <path
              d={`M ${catenaryPoints[0].x} ${catenaryPoints[0].y} ${catenaryPoints.map(p => `L ${p.x} ${p.y}`).join(' ')}`}
              fill="none" stroke="#14b8a6" strokeWidth="2.5" />

            {/* Mid-span sag annotation */}
            <line x1={inputs.span_m / 2} y1={0} x2={inputs.span_m / 2} y2={results.maxSag_m}
              stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" />
            <text x={inputs.span_m / 2 + 8} y={results.maxSag_m / 2}
              fill="#f59e0b" fontSize="10" fontFamily="monospace">
              {results.sagTable[0]?.sag_m.toFixed(2)}m
            </text>

            {/* Span label */}
            <text x={inputs.span_m / 2} y={-12}
              textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
              Span: {inputs.span_m}m
            </text>
          </svg>
        </div>
      )}

      {/* Temperature Sweep Chart */}
      {tab === "sweep" && (() => {
        const noWindRows = results.sagTable.filter(r => r.condition === "No Wind");
        if (noWindRows.length === 0) return <div className="text-muted-foreground text-sm">No data</div>;
        const maxSag = Math.max(...noWindRows.map(r => r.sag_m));
        const maxTen = Math.max(...noWindRows.map(r => r.tension_kg));
        const W = 700, H = 300, PL = 60, PR = 60, PT = 20, PB = 40;

        return (
          <div className="bg-card rounded-2xl border border-border p-6 animate-in fade-in duration-300">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 280 }}>
              {/* Axes */}
              <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="#334155" strokeWidth="1" />
              <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="#334155" strokeWidth="1" />

              {/* Labels */}
              <text x={PL - 10} y={PT - 5} fill="#f59e0b" fontSize="9" textAnchor="end" fontFamily="monospace">Sag (m)</text>
              <text x={W - PR + 10} y={PT - 5} fill="#3b82f6" fontSize="9" textAnchor="start" fontFamily="monospace">Tension (kg)</text>
              <text x={(W) / 2} y={H - 5} fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">Temperature (°C)</text>

              {/* Plot area */}
              {noWindRows.map((row, i) => {
                const x = PL + ((row.temperature_C - noWindRows[0].temperature_C) / (noWindRows[noWindRows.length - 1].temperature_C - noWindRows[0].temperature_C || 1)) * (W - PL - PR);
                const ySag = PT + (1 - row.sag_m / (maxSag * 1.2)) * (H - PT - PB);
                const yTen = PT + (1 - row.tension_kg / (maxTen * 1.2)) * (H - PT - PB);

                return (
                  <g key={i}>
                    {/* Sag point */}
                    <circle cx={x} cy={ySag} r="4" fill="#f59e0b" />
                    {/* Tension point */}
                    <circle cx={x} cy={yTen} r="4" fill="#3b82f6" />
                    {/* Temp label */}
                    <text x={x} y={H - PB + 15} fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="monospace">{row.temperature_C}°</text>
                    {/* Connect to prev */}
                    {i > 0 && (() => {
                      const prev = noWindRows[i - 1];
                      const px = PL + ((prev.temperature_C - noWindRows[0].temperature_C) / (noWindRows[noWindRows.length - 1].temperature_C - noWindRows[0].temperature_C || 1)) * (W - PL - PR);
                      const pySag = PT + (1 - prev.sag_m / (maxSag * 1.2)) * (H - PT - PB);
                      const pyTen = PT + (1 - prev.tension_kg / (maxTen * 1.2)) * (H - PT - PB);
                      return (
                        <>
                          <line x1={px} y1={pySag} x2={x} y2={ySag} stroke="#f59e0b" strokeWidth="2" opacity="0.6" />
                          <line x1={px} y1={pyTen} x2={x} y2={yTen} stroke="#3b82f6" strokeWidth="2" opacity="0.6" />
                        </>
                      );
                    })()}
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })()}

      {/* Dynamic Equation Trace Tab */}
      {tab === "trace" && (
        <SagTensionEquationTrace results={results} />
      )}
    </div>
  );
}
