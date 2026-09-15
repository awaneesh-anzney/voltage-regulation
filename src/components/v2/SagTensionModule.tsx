"use client";

import { useState, useMemo, Fragment } from "react";
import {
  Cable, Settings2, BarChart3, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, XCircle, ArrowRight, Thermometer,
  FileText, Sliders, Printer
} from "lucide-react";
import { computeSagTension, getDefaultSagTensionInputs } from "@/lib/sagTensionEngine";
import type { SagTensionInputs, SagTensionResults } from "@/lib/sagTensionEngine";
import { CONDUCTOR_LIBRARY, getConductorTypes, getConductorsByType } from "@/lib/conductorLibrary";
import { getClearanceSpec } from "@/lib/ceaClearances";
import { SAG_TENSION_REGISTRY, TABLE_AUDIT_STATUS, type SagTensionClauseId } from "@/lib/registries/sagTensionRegistry";
import { formatClauseDisplay } from "@/lib/clauseRegistry";
import { VerificationBadge } from "@/components/dashboard/sc-forces/VerificationBadge";
import type { VerificationTag } from "@/lib/types/verification";

type RowRef =
  | { kind: "standard"; refId: SagTensionClauseId; verification: VerificationTag }
  | { kind: "derived" }
  | { kind: "userInput" }
  | { kind: "physics" };

interface TraceRow {
  num: number;
  param: string;
  html: string;
  val: string;
  rowRef: RowRef;
}

function RowRefCell({ rowRef }: { rowRef: RowRef }) {
  switch (rowRef.kind) {
    case "standard":
      return (
        <div className="flex items-center gap-2">
          <VerificationBadge tag={rowRef.verification} applicable={true} />
          <span className="text-[10px] text-muted-foreground">{formatClauseDisplay(rowRef.refId)}</span>
        </div>
      );
    case "derived":
      return <span className="text-[10px] text-muted-foreground italic">Derived (arithmetic of above)</span>;
    case "userInput":
      return <span className="text-[10px] text-muted-foreground italic">User Input</span>;
    case "physics":
      return <span className="text-[10px] text-muted-foreground italic">General Physics (not standard-specific)</span>;
  }
}

function InputField({ label, value, unit, onChange, disabled, step, placeholder, type }: {
  label: string; value: number | string; unit?: string;
  onChange: (v: number | string) => void; disabled?: boolean; step?: number; placeholder?: string; type?: "text" | "number";
}) {
  const isNumberField = type === 'number' || typeof value === 'number' || (value === "" && unit !== undefined);
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
          type={type || (isNumberField ? 'number' : 'text')}
          step={step}
          value={isFocused ? localValue : value}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => {
            setIsFocused(true);
            setLocalValue(String(value));
          }}
          onChange={(e) => {
            if (!isNumberField) {
              onChange(e.target.value);
              return;
            }
            const raw = e.target.value;
            setLocalValue(raw);
            if (raw === "") {
              onChange("");
              return;
            }
            const parsed = parseFloat(raw);
            if (!isNaN(parsed)) onChange(parsed);
          }}
          onBlur={() => {
            setIsFocused(false);
            if (!isNumberField) return;
            if (localValue === "") return;
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
              <p className="text-[10px] text-muted-foreground/70 italic px-1">Note: Enter 0 to use auto-calculated standard values.</p>
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
          <InputField label="Creep Strain" value={inputs.creepStrain_pct ?? 0} unit="%" onChange={(v) => onUpdateInputs({ creepStrain_pct: v as number })} step={0.01} />
        </Section>

        {/* Broken Wire */}
        <Section title="Broken Wire Analysis" accent="teal" defaultOpen={false}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">Tower Type</label>
            <select
              value={inputs.towerType ?? 'suspension'}
              onChange={(e) => onUpdateInputs({ towerType: e.target.value as any })}
              className="bg-background border border-border rounded-lg px-3 py-2 text-[12px] text-foreground focus:outline-none focus:border-teal-500/30"
            >
              <option value="suspension">Suspension</option>
              <option value="tension">Tension (Angle)</option>
              <option value="deadend">Dead-end</option>
            </select>
          </div>
          <InputField 
            label="Load Factor" 
            value={inputs.brokenWireLoadFactor_pct === undefined ? "" : inputs.brokenWireLoadFactor_pct} 
            unit="%" 
            onChange={(v) => onUpdateInputs({ brokenWireLoadFactor_pct: v === "" || v === undefined ? undefined : Number(v) })} 
            placeholder={inputs.towerType === 'suspension' ? "e.g. 50-60" : inputs.towerType === 'tension' ? "e.g. 60-100" : "100"}
          />
        </Section>
      </div>
    </div>
  );
}

// ─── KPI Card ───
function KPI({ label, value, unit, status, sublabel, children }: {
  label: string; value: string; unit: string; status?: "pass" | "fail" | "warn"; sublabel?: string;
  children?: React.ReactNode;
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
      {children}
    </div>
  );
}

function ClearanceGauge({ clearance_m, required_m }: { clearance_m: number; required_m: number }) {
  const margin = clearance_m - required_m;
  const marginPct = (margin / required_m) * 100;
  const status = margin < 0 ? 'fail' : marginPct < 15 ? 'warn' : 'ok';
  const colors = { fail: '#ef4444', warn: '#f59e0b', ok: '#10b981' };
  const widthPct = Math.max(0, Math.min(100, 50 + marginPct));
  
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative mt-2">
      <div className="h-full rounded-full transition-all" 
           style={{ width: `${widthPct}%`, backgroundColor: colors[status] }} />
    </div>
  );
}

// ─── Equation Trace Component ───
export function SagTensionEquationTrace({ results, inputs, selectedTemp, onSelectedTempChange }: { 
  results: SagTensionResults; inputs: SagTensionInputs;
  selectedTemp: number; onSelectedTempChange: (t: number) => void;
}) {
  const { trace } = results;
  if (!trace) return null;

  const [trackView, setTrackView] = useState<'initial' | 'final'>('final');
  const tempCases = Array.from(new Set(trace.perTempTraces?.map(t => t.temperature_C) || []));
  const currentTemp = tempCases.includes(selectedTemp) ? selectedTemp : (tempCases[0] ?? 32);
  
  const currentTraces = trace.perTempTraces?.filter(t => t.temperature_C === currentTemp) || [];

  const rows: TraceRow[] = [
    { num: 1, param: "Design Standard Selected", html: "Standard", val: trace.standard === "IS802" ? "IS 802:2015 (India)" : "IEC 60826", rowRef: { kind: "userInput" } },
  ];

  if (trace.standard === "IS802") {
    rows.push(
      { num: 2, param: "Basic Wind Speed", html: "V<sub>b</sub>", val: `${trace.vBasic} m/s`, rowRef: { kind: "standard", refId: SAG_TENSION_REGISTRY.basicWindSpeed, verification: "NOT_YET_ASSESSED" } },
      { num: 3, param: "Reliability Factor (Risk Coefficient)", html: "K₁", val: trace.k1.toFixed(2), rowRef: { kind: "standard", refId: SAG_TENSION_REGISTRY.riskCoefficient, verification: "NOT_YET_ASSESSED" } },
      { num: 4, param: "Terrain Category Factor", html: "K₂", val: trace.k2.toFixed(2), rowRef: { kind: "standard", refId: SAG_TENSION_REGISTRY.terrainFactor, verification: "NOT_YET_ASSESSED" } },
      { num: 5, param: "Design Wind Speed", html: "V<sub>d</sub> = V<sub>b</sub> × K₁ × K₂", val: `${trace.vDesign.toFixed(2)} m/s`, rowRef: { kind: "standard", refId: SAG_TENSION_REGISTRY.designWindSpeed, verification: "NOT_YET_ASSESSED" } },
      { num: 6, param: "Design Wind Pressure", html: "P<sub>d</sub> = 0.6 × V<sub>d</sub>²", val: `${trace.pDesign.toFixed(1)} N/m²`, rowRef: { kind: "standard", refId: SAG_TENSION_REGISTRY.designWindPressure, verification: "NOT_YET_ASSESSED" } },
      { num: 7, param: "Conductor Gust Response Factor", html: "G<sub>c</sub>", val: trace.conductorGustFactor.toFixed(2), rowRef: { kind: "standard", refId: SAG_TENSION_REGISTRY.gustFactorConductor, verification: "NOT_YET_ASSESSED" } },
      { num: 8, param: "Insulator Gust Factor", html: "G<sub>i</sub>", val: trace.insulatorGustFactor.toFixed(2), rowRef: { kind: "standard", refId: SAG_TENSION_REGISTRY.gustFactorInsulator, verification: "NOT_YET_ASSESSED" } }
    );
  } else {
    rows.push(
      { num: 2, param: "Design Wind Pressure (Direct)", html: "P<sub>d</sub>", val: `${trace.pDesign.toFixed(1)} N/m²`, rowRef: { kind: "userInput" } }
    );
  }

  const offset = trace.standard === "IS802" ? 7 : 1;

  rows.push(
    { num: 2 + offset, param: "Conductor Drag Coefficient", html: "C<sub>dc</sub>", val: trace.dragCoeffConductor.toFixed(2), rowRef: { kind: "standard", refId: SAG_TENSION_REGISTRY.dragCoefficientConductor, verification: "NOT_YET_ASSESSED" } },
    { num: 3 + offset, param: "Insulator Drag Coefficient", html: "C<sub>di</sub>", val: trace.dragCoeffInsulator.toFixed(2), rowRef: { kind: "standard", refId: SAG_TENSION_REGISTRY.dragCoefficientInsulator, verification: "NOT_YET_ASSESSED" } },
    { num: 4 + offset, param: "Effective Conductor Wind Pressure", html: "P<sub>cond</sub> = P<sub>d</sub> × G<sub>c</sub>", val: `${trace.effectiveWindPressurePa.toFixed(1)} N/m²`, rowRef: { kind: "derived" } },
    { num: 5 + offset, param: "Conductor Wind Load per Meter", html: "w<sub>wind_cond</sub> = C<sub>dc</sub> × P<sub>cond</sub> × d<sub>cond</sub>", val: `${trace.wWindCond.toFixed(3)} N/m`, rowRef: { kind: "standard", refId: SAG_TENSION_REGISTRY.conductorWindLoad, verification: "NOT_YET_ASSESSED" } },
    { num: 6 + offset, param: "Insulator Wind Force (per string)", html: "F<sub>wind_ins</sub> = C<sub>di</sub> × (P<sub>d</sub> × G<sub>i</sub>) × A<sub>ins</sub>", val: `${trace.fWindIns.toFixed(1)} N`, rowRef: { kind: "standard", refId: SAG_TENSION_REGISTRY.insulatorWindForce, verification: "NOT_YET_ASSESSED" } },
    { num: 7 + offset, param: "Insulator Swing Angle", html: "θ<sub>swing_ins</sub> = atan[ (F<sub>wind_ins</sub> + 0.5·w<sub>wind</sub>·L) / ... ]", val: `${trace.insulatorSwingAngleDeg.toFixed(2)}°`, rowRef: { kind: "physics" } },
    { num: 8 + offset, param: "Bare Conductor Self Weight", html: "w<sub>self</sub> = m × g", val: `${trace.wSelf_N_m.toFixed(3)} N/m`, rowRef: { kind: "physics" } },
    { num: 9 + offset, param: "Combined Load", html: "w<sub>comb</sub> = √(w<sub>self</sub>² + w<sub>wind_cond</sub>²)", val: `${trace.wCombined_N_m.toFixed(3)} N/m`, rowRef: { kind: "physics" } }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-card border border-border rounded-xl overflow-hidden mt-4">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">IS 802 / IEC 60826 — Mechanical Wind Force & Swing Trace</h3>
          <p className="text-[11px] text-muted-foreground mt-1">Detailed step-by-step intermediate variables and design coefficients.</p>
          
          {trace.standard === "IS802" && 
            (TABLE_AUDIT_STATUS.windPressureTable.lastAuditedDate === null || 
             TABLE_AUDIT_STATUS.riskCoeffTable.lastAuditedDate === null || 
             TABLE_AUDIT_STATUS.gustResponseTable.lastAuditedDate === null) && (
            <div className="text-[10px] text-amber-500 flex items-center gap-1 mt-2">
              <AlertTriangle className="w-3 h-3" />
              Lookup table values pending domain-expert audit against IS 802 physical copy
            </div>
          )}
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
                  <td className="px-5 py-2.5 font-mono font-bold text-foreground">{row.val}</td>
                  <td className="px-5 py-2.5"><RowRefCell rowRef={row.rowRef} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {currentTraces.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mt-4">
          <div className="px-5 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" /> Change-of-State Numeric Trace
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">Detailed substitution steps for tension and clearance calculations.</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {/* Initial/Final Toggle */}
              <div className="flex bg-background rounded-lg border border-border p-0.5">
                <button onClick={() => setTrackView('initial')} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${trackView === 'initial' ? 'bg-blue-500/20 text-blue-300' : 'text-muted-foreground hover:text-foreground'}`}>Initial (As-strung)</button>
                <button onClick={() => setTrackView('final')} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${trackView === 'final' ? 'bg-emerald-500/20 text-emerald-300' : 'text-muted-foreground hover:text-foreground'}`}>Final (Post-creep)</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Temp:</span>
                <select
                  value={currentTemp}
                  onChange={(e) => onSelectedTempChange(parseFloat(e.target.value))}
                  className="bg-background border border-border rounded-lg px-3 py-1.5 text-[12px] text-foreground focus:outline-none focus:border-teal-500/30"
                >
                  {tempCases.map(t => <option key={t} value={t}>{t}°C</option>)}
                </select>
              </div>
            </div>
          </div>
          
          <div className="p-5 space-y-8">
            {currentTraces.map((t, idx) => {
              const tr = trackView === 'initial' ? t.initial : t.final;
              return (
              <div key={idx} className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                    {t.condition} — {trackView === 'initial' ? 'Initial' : 'Final'}
                  </span>
                  <div className="h-px bg-border flex-1" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Math Trace */}
                  <div className="space-y-2 bg-background/50 border border-border rounded-lg p-4 shadow-inner">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Change of State Equation</div>
                    <div className="font-mono text-[11px] text-slate-300 space-y-2">
                      <p>T₂ - [w₂²·L²·AE] / 24T₂² = T₁ - [w₁²·L²·AE] / 24T₁² + AE·α·Δt</p>
                      <p className="text-muted-foreground">where T₁ = {tr.T1_N.toFixed(0)} N, w₁ = {tr.w1_N_m.toFixed(2)} N/m, w₂ = {tr.w2_N_m.toFixed(2)} N/m, Δt = {tr.deltaT_C.toFixed(1)}°C{trackView === 'final' && (inputs.creepStrain_pct ?? 0) > 0 ? ' (incl. creep offset)' : ''}</p>
                      <div className="h-px bg-white/5 my-2" />
                      <p>T₂ - [{tr.w2_N_m.toFixed(2)}² × {tr.L_m.toFixed(0)}² × {tr.K_AE_N.toExponential(2)}] / 24T₂² = C₁</p>
                      <p className="text-emerald-400/70 ml-4">↳ C₁ = {tr.T1_N.toFixed(0)} - {tr.w1L2K_term_N.toFixed(0)} + {tr.alphaExpansion_term_N.toFixed(0)} = <span className="text-emerald-400 font-bold">{tr.C1_value_N.toFixed(0)}</span></p>
                      <p>T₂ - {(tr.w2_N_m*tr.w2_N_m*tr.L_m*tr.L_m*tr.K_AE_N / 24).toExponential(2)} / T₂² = {tr.C1_value_N.toFixed(0)}</p>
                      <p className="text-teal-400 font-bold mt-2">⇒ T₂ = {tr.T2_result_N.toFixed(1)} N  ({(tr.T2_result_N/9.807).toFixed(1)} kg)</p>
                    </div>
                  </div>

                  {/* Clearance Trace */}
                  <div className="space-y-2 bg-background/50 border border-border rounded-lg p-4 shadow-inner">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Clearance Verification</div>
                    <div className="font-mono text-[11px] text-slate-300 space-y-2">
                      <p>Clearance = TowerHt - InsDrop - VertSag</p>
                      <div className="h-px bg-white/5 my-2" />
                      <p>Tower Height: <span className="float-right">{inputs.towerHeight_m.toFixed(2)} m</span></p>
                      <p>Insulator Drop: <span className="float-right">-{tr.insulatorDrop_m.toFixed(2)} m</span></p>
                      <p>Vertical Sag: <span className="float-right">-{tr.verticalSag_m.toFixed(2)} m</span></p>
                      <div className="h-px bg-white/5 my-2" />
                      <p className="font-bold flex items-center justify-between">
                        <span>Clearance: {tr.clearance_m.toFixed(2)} m</span>
                        <span className={tr.clearance_ok ? "text-emerald-400" : "text-red-400"}>
                          (Req: ≥{inputs.minGroundClearance_m.toFixed(2)}m) → {tr.clearance_ok ? "PASS" : "FAIL"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
            
            <div className="bg-background/50 border border-border rounded-lg p-4 shadow-inner">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Max Tension UTS Check</div>
              <div className="font-mono text-[11px] text-slate-300 space-y-2">
                <p className="flex items-center justify-between">
                  <span>Initial-Track Max = {results.initial_maxTension_kg.toFixed(0)} kg</span>
                  <span className={results.initial_uts_check ? "text-emerald-400" : "text-red-400"}>
                    ≤ {(inputs.uts_kN * 1000 / 9.807 / inputs.safetyFactor).toFixed(0)} kg → {results.initial_uts_check ? "PASS" : "FAIL"}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Final-Track Max = {results.maxTension_kg.toFixed(0)} kg</span>
                  <span className={results.uts_check ? "text-emerald-400" : "text-red-400"}>
                    ≤ (UTS {(inputs.uts_kN * 1000 / 9.807).toFixed(0)} kg / SF {inputs.safetyFactor}) = {(inputs.uts_kN * 1000 / 9.807 / inputs.safetyFactor).toFixed(0)} kg → {results.uts_check ? "PASS" : "FAIL"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Center Canvas ───
type CanvasTab = "results" | "profile" | "sweep" | "trace" | "what-if" | "report" | "broken-wire";

export function SagTensionCanvas({ inputs, results, onFeedToSCForces }: {
  inputs: SagTensionInputs; results: SagTensionResults;
  onFeedToSCForces?: (data: { fst_kg: number; span_m: number; conductorName: string }) => void;
}) {
  const [tab, setTab] = useState<CanvasTab>("results");
  const [selectedTemp, setSelectedTemp] = useState<number>(results.sagTable[0]?.temperature_C ?? 32);

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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
        <KPI label="Static Tension F_st" value={results.staticTension_kg.toFixed(0)} unit="kg"
          sublabel={`${results.staticTension_kN.toFixed(1)} kN`} />
        <KPI label="Max Sag" value={results.maxSag_m.toFixed(2)} unit="m"
          sublabel={`at ${results.maxSag_temp_C}°C`} />
        <KPI label="Min Clearance" value={results.minClearance_m.toFixed(2)} unit="m"
          sublabel={`at ${results.minClearance_temp_C}°C`}
          status={results.clearance_check ? "pass" : "fail"}>
          <ClearanceGauge clearance_m={results.minClearance_m} required_m={inputs.minGroundClearance_m} />
        </KPI>
        <KPI label="Max Tension (Initial)" value={results.initial_maxTension_kg.toFixed(0)} unit="kg"
          sublabel={`at ${results.initial_maxTension_temp_C}°C`}
          status={results.initial_uts_check ? "pass" : "fail"} />
        <KPI label="Max Tension (Final)" value={results.maxTension_kg.toFixed(0)} unit="kg"
          sublabel={`at ${results.maxTension_temp_C}°C`}
          status={results.uts_check ? "pass" : "fail"} />
        <KPI label="UTS Check" value={(results.uts_check && results.initial_uts_check) ? "PASS" : "FAIL"} unit=""
          sublabel={(!results.initial_uts_check && !results.uts_check) ? 'Both tracks failed' : !results.initial_uts_check ? 'Initial track failed' : !results.uts_check ? 'Final track failed' : `SF = ${inputs.safetyFactor}`}
          status={(results.uts_check && results.initial_uts_check) ? "pass" : "fail"} />
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
          { id: "broken-wire" as const, label: "Broken Wire", icon: AlertTriangle },
          { id: "what-if" as const, label: "What-If Analysis", icon: Sliders },
          { id: "report" as const, label: "Report", icon: Printer },
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
                    <td className="px-4 py-2.5 font-mono text-foreground">
                      {row.clearance_m.toFixed(2)}
                      <div className="w-16 mt-0.5">
                        <ClearanceGauge clearance_m={row.clearance_m} required_m={inputs.minGroundClearance_m} />
                      </div>
                    </td>
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

      {/* Catenary Profile SVG & Blowout Plan View */}
      {tab === "profile" && (
        <SagTensionProfile inputs={inputs} results={results} selectedTemp={selectedTemp} onSelectedTempChange={setSelectedTemp} />
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
        <SagTensionEquationTrace results={results} inputs={inputs} selectedTemp={selectedTemp} onSelectedTempChange={setSelectedTemp} />
      )}

      {/* Broken Wire Tab */}
      {tab === "broken-wire" && (
        <SagTensionBrokenWire inputs={inputs} results={results} />
      )}

      {/* What-If Analysis Tab */}
      {tab === "what-if" && (
        <SagTensionWhatIf inputs={inputs} />
      )}

      {/* Report Generation Tab */}
      {tab === "report" && (
        <SagTensionReport inputs={inputs} results={results} />
      )}
    </div>
  );
}

function WhatIfChartSVG({ data, param, theme = "dark" }: { data: {x: number, sag: number, tension: number}[]; param: string; theme?: "dark" | "light" }) {
  if (data.length === 0) return <div className="text-muted-foreground text-sm">No data</div>;
  const maxSag = Math.max(...data.map(d => d.sag));
  const maxTen = Math.max(...data.map(d => d.tension));
  const W = 700, H = 300, PL = 60, PR = 60, PT = 20, PB = 40;
  
  const axesColor = theme === "dark" ? "#334155" : "#d1d5db"; // slate-700 or gray-300
  const textColor = theme === "dark" ? "#94a3b8" : "#4b5563"; // slate-400 or gray-600
  const sagColor = theme === "dark" ? "#f59e0b" : "#d97706"; // amber-500 or amber-600
  const tenColor = theme === "dark" ? "#3b82f6" : "#2563eb"; // blue-500 or blue-600
  const labelColor = theme === "dark" ? "#64748b" : "#6b7280"; // slate-500 or gray-500

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 280 }}>
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke={axesColor} strokeWidth="1" />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={axesColor} strokeWidth="1" />
      <text x={PL - 10} y={PT - 5} fill={sagColor} fontSize="9" textAnchor="end" fontFamily="monospace">Max Sag (m)</text>
      <text x={W - PR + 10} y={PT - 5} fill={tenColor} fontSize="9" textAnchor="start" fontFamily="monospace">Max Tension (kg)</text>
      <text x={(W) / 2} y={H - 5} fill={textColor} fontSize="9" textAnchor="middle" fontFamily="monospace">
        {param === "span_m" ? "Span Length (m)" : param === "windZone" ? "Wind Zone" : "Temperature (°C)"}
      </text>

      {data.map((d, i) => {
        const x = PL + ((d.x - data[0].x) / (data[data.length - 1].x - data[0].x || 1)) * (W - PL - PR);
        const ySag = PT + (1 - d.sag / (maxSag * 1.2)) * (H - PT - PB);
        const yTen = PT + (1 - d.tension / (maxTen * 1.2)) * (H - PT - PB);
        return (
          <g key={i}>
            <circle cx={x} cy={ySag} r="4" fill={sagColor} />
            <circle cx={x} cy={yTen} r="4" fill={tenColor} />
            <text x={x} y={H - PB + 15} fill={labelColor} fontSize="8" textAnchor="middle" fontFamily="monospace">{d.x}</text>
            {i > 0 && (() => {
              const prev = data[i - 1];
              const px = PL + ((prev.x - data[0].x) / (data[data.length - 1].x - data[0].x || 1)) * (W - PL - PR);
              const pySag = PT + (1 - prev.sag / (maxSag * 1.2)) * (H - PT - PB);
              const pyTen = PT + (1 - prev.tension / (maxTen * 1.2)) * (H - PT - PB);
              return (
                <>
                  <line x1={px} y1={pySag} x2={x} y2={ySag} stroke={sagColor} strokeWidth="2" opacity="0.6" />
                  <line x1={px} y1={pyTen} x2={x} y2={yTen} stroke={tenColor} strokeWidth="2" opacity="0.6" />
                </>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}

// ─── What-If Component ───
export function generateWhatIfData(inputs: SagTensionInputs, param: "span_m" | "windZone" | "temperature", sweepPoints = 5) {
  const data = [];
  if (param === "span_m") {
    const min = Math.max(50, inputs.span_m - 150);
    const max = inputs.span_m + 150;
    const step = (max - min) / (sweepPoints - 1);
    for (let i = 0; i < sweepPoints; i++) {
      const val = min + i * step;
      const res = computeSagTension({ ...inputs, span_m: val, rulingSpan_m: 0 });
      data.push({ x: val, sag: res.maxSag_m, tension: res.maxTension_kg });
    }
  } else if (param === "windZone") {
    for (let i = 1; i <= 6; i++) {
      const res = computeSagTension({ ...inputs, windZone: i, standard: 'IS802' });
      data.push({ x: i, sag: res.maxSag_m, tension: res.maxTension_kg });
    }
  } else if (param === "temperature") {
    const temps = [0, 15, 32, 45, 60, 75, 85, 100];
    for (const t of temps) {
      const res = computeSagTension({ ...inputs, tempCases_C: [t] });
      data.push({ x: t, sag: res.maxSag_m, tension: res.maxTension_kg });
    }
  }
  return data;
}

function SagTensionWhatIf({ inputs }: { inputs: SagTensionInputs }) {
  const [param, setParam] = useState<"span_m" | "windZone" | "temperature">("span_m");
  const chartData = useMemo(() => generateWhatIfData(inputs, param), [inputs, param]);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden animate-in fade-in duration-300 p-6 space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-teal-400" /> What-If Parameter Sweep
        </h3>
        <select
          value={param}
          onChange={(e) => setParam(e.target.value as any)}
          className="bg-background border border-border rounded-lg px-3 py-1.5 text-[12px] text-foreground focus:outline-none focus:border-teal-500/30"
        >
          <option value="span_m">Sweep Span Length</option>
          <option value="windZone">Sweep IS 802 Wind Zone (Assumes IS 802)</option>
          <option value="temperature">Sweep Single Temperature</option>
        </select>
      </div>
      <WhatIfChartSVG data={chartData} param={param} theme="dark" />
    </div>
  );
}

// ─── Report Component ───
function SagTensionReport({ inputs, results }: { inputs: SagTensionInputs; results: SagTensionResults }) {
  const spanData = useMemo(() => generateWhatIfData(inputs, "span_m"), [inputs]);
  const windData = useMemo(() => generateWhatIfData(inputs, "windZone"), [inputs]);
  const tempData = useMemo(() => generateWhatIfData(inputs, "temperature"), [inputs]);

  return (
    <div className="bg-white text-black rounded-xl p-8 max-w-4xl mx-auto space-y-6 shadow-sm">
      <div className="border-b-2 border-black pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">Sag-Tension Report</h1>
          <p className="text-sm text-gray-500 mt-1">Generated by Advanced Engine</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">Standard: {inputs.standard === 'IS802' ? 'IS 802:2015' : 'IEC 60826'}</p>
          <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3">Conductor Specifications</h2>
          <table className="w-full text-xs">
            <tbody>
              <tr><td className="py-1 text-gray-600">Name</td><td className="font-bold text-right">{inputs.conductorName}</td></tr>
              <tr><td className="py-1 text-gray-600">Area</td><td className="font-bold text-right">{inputs.area_mm2} mm²</td></tr>
              <tr><td className="py-1 text-gray-600">Diameter</td><td className="font-bold text-right">{inputs.diameter_mm} mm</td></tr>
              <tr><td className="py-1 text-gray-600">Weight</td><td className="font-bold text-right">{inputs.weight_kg_m} kg/m</td></tr>
              <tr><td className="py-1 text-gray-600">UTS</td><td className="font-bold text-right">{inputs.uts_kN} kN</td></tr>
              <tr><td className="py-1 text-gray-600">Modulus (E)</td><td className="font-bold text-right">{inputs.elasticModulus_N_mm2} N/mm²</td></tr>
              <tr><td className="py-1 text-gray-600">Thermal Exp. (α)</td><td className="font-bold text-right">{inputs.thermalExpCoeff} /°C</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3">Loading & Geometry</h2>
          <table className="w-full text-xs">
            <tbody>
              <tr><td className="py-1 text-gray-600">Span Length</td><td className="font-bold text-right">{inputs.span_m} m</td></tr>
              <tr><td className="py-1 text-gray-600">Ruling Span</td><td className="font-bold text-right">{inputs.rulingSpan_m || inputs.span_m} m</td></tr>
              <tr><td className="py-1 text-gray-600">System Voltage</td><td className="font-bold text-right">{inputs.systemVoltageKv} kV</td></tr>
              <tr><td className="py-1 text-gray-600">Design Wind Pressure</td><td className="font-bold text-right">{results.trace?.pDesign?.toFixed(1) || inputs.windPressure_Pa} Pa</td></tr>
              <tr><td className="py-1 text-gray-600">Max Vertical Sag</td><td className="font-bold text-right text-amber-600">{results.maxSag_m.toFixed(2)} m</td></tr>
              <tr><td className="py-1 text-gray-600">Max Tension</td><td className="font-bold text-right text-blue-600">{results.maxTension_kg.toFixed(0)} kg</td></tr>
              <tr><td className="py-1 text-gray-600">Clearance Status</td><td className="font-bold text-right">{results.clearance_check ? "PASSED" : "FAILED"}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3">Computed States Table</h2>
        <table className="w-full text-xs text-left border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2">Temp</th>
              <th className="px-3 py-2">Condition</th>
              <th className="px-3 py-2">Tension (kg)</th>
              <th className="px-3 py-2">% UTS</th>
              <th className="px-3 py-2">Sag (m)</th>
              <th className="px-3 py-2">Blowout (m)</th>
              <th className="px-3 py-2">Clearance (m)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {results.sagTable.map((r, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-mono">{r.temperature_C}°C</td>
                <td className="px-3 py-2">{r.condition}</td>
                <td className="px-3 py-2 font-mono">{r.tension_kg.toFixed(1)}</td>
                <td className="px-3 py-2 font-mono">{r.tension_pctUTS.toFixed(1)}%</td>
                <td className="px-3 py-2 font-mono">{r.sag_m.toFixed(2)}</td>
                <td className="px-3 py-2 font-mono">{r.blowout_m.toFixed(2)}</td>
                <td className="px-3 py-2 font-mono">{r.clearance_m.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3">What-If Scenarios</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 p-2 rounded-lg">
            <h3 className="text-[10px] font-bold text-center text-gray-500 uppercase tracking-wider mb-2">Sweep Span Length</h3>
            <WhatIfChartSVG data={spanData} param="span_m" theme="light" />
          </div>
          <div className="border border-gray-200 p-2 rounded-lg">
            <h3 className="text-[10px] font-bold text-center text-gray-500 uppercase tracking-wider mb-2">Sweep Wind Zone</h3>
            <WhatIfChartSVG data={windData} param="windZone" theme="light" />
          </div>
          <div className="border border-gray-200 p-2 rounded-lg">
            <h3 className="text-[10px] font-bold text-center text-gray-500 uppercase tracking-wider mb-2">Sweep Temperature</h3>
            <WhatIfChartSVG data={tempData} param="temperature" theme="light" />
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3">Equation Trace Summary (Governing Cases)</h2>
        <div className="space-y-4">
          {[
            Math.min(...inputs.tempCases_C),
            inputs.refTemp_C,
            Math.max(...inputs.tempCases_C)
          ].map((temp, tempIdx) => {
            const traces = results.trace?.perTempTraces?.filter(t => t.temperature_C === temp && (
              t.condition === 'No Wind' || t.condition === 'Full Wind' || 
              t.condition === 'Ice Only' || t.condition === 'Ice & Wind'
            )) || [];
            if (traces.length === 0) return null;
            return (
              <div key={tempIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200 font-bold text-xs">
                  {temp}°C {temp === Math.min(...inputs.tempCases_C) ? '(Coldest)' : temp === inputs.refTemp_C ? '(Reference)' : '(Hottest)'}
                </div>
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-2 py-1">Condition</th>
                      <th className="px-2 py-1">State</th>
                      <th className="px-2 py-1">T₁ (N)</th>
                      <th className="px-2 py-1">w₁ (N/m)</th>
                      <th className="px-2 py-1">w₂ (N/m)</th>
                      <th className="px-2 py-1">Δt (°C)</th>
                      <th className="px-2 py-1">C₁ (N)</th>
                      <th className="px-2 py-1">T₂ (N)</th>
                      <th className="px-2 py-1">T₂ (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {traces.map((t, idx) => (
                      <Fragment key={idx}>
                        {/* Initial Track */}
                        <tr className="hover:bg-gray-50">
                          <td className="px-2 py-1 font-medium">{t.condition}</td>
                          <td className="px-2 py-1 text-blue-600">Initial</td>
                          <td className="px-2 py-1 font-mono">{t.initial.T1_N.toFixed(0)}</td>
                          <td className="px-2 py-1 font-mono">{t.initial.w1_N_m.toFixed(2)}</td>
                          <td className="px-2 py-1 font-mono">{t.initial.w2_N_m.toFixed(2)}</td>
                          <td className="px-2 py-1 font-mono">{t.initial.deltaT_C.toFixed(1)}</td>
                          <td className="px-2 py-1 font-mono">{t.initial.C1_value_N.toFixed(0)}</td>
                          <td className="px-2 py-1 font-mono font-bold">{t.initial.T2_result_N.toFixed(1)}</td>
                          <td className="px-2 py-1 font-mono text-blue-600">{(t.initial.T2_result_N/9.807).toFixed(1)}</td>
                        </tr>
                        {/* Final Track */}
                        <tr className="bg-gray-50/50 hover:bg-gray-50">
                          <td className="px-2 py-1 font-medium text-gray-500">↳</td>
                          <td className="px-2 py-1 text-emerald-600">Final</td>
                          <td className="px-2 py-1 font-mono text-gray-500">{t.final.T1_N.toFixed(0)}</td>
                          <td className="px-2 py-1 font-mono text-gray-500">{t.final.w1_N_m.toFixed(2)}</td>
                          <td className="px-2 py-1 font-mono text-gray-500">{t.final.w2_N_m.toFixed(2)}</td>
                          <td className="px-2 py-1 font-mono text-gray-500">{t.final.deltaT_C.toFixed(1)}</td>
                          <td className="px-2 py-1 font-mono text-gray-500">{t.final.C1_value_N.toFixed(0)}</td>
                          <td className="px-2 py-1 font-mono font-bold">{t.final.T2_result_N.toFixed(1)}</td>
                          <td className="px-2 py-1 font-mono text-emerald-600">{(t.final.T2_result_N/9.807).toFixed(1)}</td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 flex justify-between items-center no-print">
        <p className="text-xs text-gray-400 italic">Press Ctrl+P to print or save as PDF.</p>
        <button onClick={() => window.print()} className="px-4 py-2 bg-black text-white text-xs font-bold rounded hover:bg-gray-800 transition-colors">
          Print Report
        </button>
      </div>
    </div>
  );
}

// ─── Profile and Blowout Components ───
function SagTensionProfile({ inputs, results, selectedTemp, onSelectedTempChange }: { 
  inputs: SagTensionInputs; results: SagTensionResults;
  selectedTemp: number; onSelectedTempChange: (t: number) => void;
}) {
  const [viewMode, setViewMode] = useState<"side" | "top">("side");

  return (
    <div className="bg-card rounded-2xl border border-border p-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
        <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Cable className="w-4 h-4 text-teal-400" />
          {viewMode === "side" ? "Multi-Temperature Catenary Overlay" : "Wind Blowout Plan-View"}
        </h3>
        <div className="flex bg-background rounded-lg border border-border p-1">
          <button onClick={() => setViewMode("side")} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === "side" ? "bg-teal-500/20 text-teal-300" : "text-muted-foreground hover:text-foreground"}`}>Side View</button>
          <button onClick={() => setViewMode("top")} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === "top" ? "bg-teal-500/20 text-teal-300" : "text-muted-foreground hover:text-foreground"}`}>Top-Down View</button>
        </div>
      </div>
      
      {viewMode === "side" ? <SideViewProfile inputs={inputs} results={results} /> : <TopDownBlowoutView inputs={inputs} results={results} selectedTemp={selectedTemp} onSelectedTempChange={onSelectedTempChange} />}
    </div>
  );
}

function SideViewProfile({ inputs, results }: { inputs: SagTensionInputs; results: SagTensionResults }) {
  const noWindTraces = results.trace?.perTempTraces?.filter(
    t => t.condition === 'No Wind' || t.condition === 'Ice Only'
  ) || [];

  const coldestTemp = Math.min(...inputs.tempCases_C);
  const hottestTemp = Math.max(...inputs.tempCases_C);

  const overlayTemps = [
    { temp: coldestTemp, color: '#3b82f6', label: `${coldestTemp}°C (Coldest)` },
    { temp: inputs.refTemp_C, color: '#10b981', label: `${inputs.refTemp_C}°C (Ref)` },
    { temp: hottestTemp, color: '#ef4444', label: `${hottestTemp}°C (Hottest)` },
  ];

  const L = inputs.span_m;
  const N = 60;
  
  const curves = overlayTemps.map(oc => {
    const row = noWindTraces.find(t => t.temperature_C === oc.temp);
    if (!row) return { ...oc, path: '' };
    const T = row.final.T2_result_N;
    const w = row.final.w2_N_m;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * L;
      const xc = x - L / 2;
      const y = (T / w) * (Math.cosh((w * xc) / T) - Math.cosh((w * L) / (2 * T)));
      pts.push({ x, y: -y });
    }
    return { ...oc, path: `M ${pts[0].x} ${pts[0].y} ${pts.map(p => `L ${p.x} ${p.y}`).join(' ')}` };
  });

  const clearanceLineY = results.maxSag_m * 1.6 - inputs.minGroundClearance_m;
  const topBound = Math.min(-20, clearanceLineY - 20);
  const viewHeight = (results.maxSag_m * 1.6 + 40) - topBound;

  return (
    <svg viewBox={`-20 ${topBound} ${inputs.span_m + 40} ${viewHeight}`} className="w-full" style={{ minHeight: 300 }}>
      {/* Ground line */}
      <line x1="-10" y1={results.maxSag_m * 1.6} x2={inputs.span_m + 10} y2={results.maxSag_m * 1.6}
        stroke="#334155" strokeWidth="1" strokeDasharray="6,4" />
      <text x={inputs.span_m / 2} y={results.maxSag_m * 1.6 + 15}
        textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">Ground Level</text>

      {/* Danger Zone */}
      <rect x="-10" y={clearanceLineY} width={inputs.span_m + 20} height={inputs.minGroundClearance_m} fill="#ef4444" fillOpacity="0.05" />
      <line x1="-10" y1={clearanceLineY} x2={inputs.span_m + 10} y2={clearanceLineY} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,2" />

      {/* Towers */}
      <rect x="-6" y="-10" width="12" height={results.maxSag_m * 1.6 + 10} rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <rect x={inputs.span_m - 6} y="-10" width="12" height={results.maxSag_m * 1.6 + 10} rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />

      {/* Curves */}
      {curves.map((c, i) => (
        <path key={i} d={c.path} fill="none" stroke={c.color} strokeWidth="2.5" opacity={0.8} />
      ))}

      {/* Legend */}
      <g transform={`translate(10, 10)`}>
        <rect x="0" y="0" width="110" height="60" fill="#0f172a" fillOpacity="0.8" rx="4" stroke="#334155" strokeWidth="1" />
        {overlayTemps.map((oc, i) => (
          <g key={i} transform={`translate(10, ${15 + i * 15})`}>
            <line x1="0" y1="0" x2="15" y2="0" stroke={oc.color} strokeWidth="2.5" />
            <text x="22" y="3" fill="#cbd5e1" fontSize="9" fontFamily="monospace">{oc.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function TopDownBlowoutView({ inputs, results, selectedTemp, onSelectedTempChange }: { 
  inputs: SagTensionInputs; results: SagTensionResults;
  selectedTemp: number; onSelectedTempChange: (t: number) => void;
}) {
  const tempCases = inputs.tempCases_C;
  const currentTemp = tempCases.includes(selectedTemp) ? selectedTemp : (tempCases[0] ?? 32);

  const row = results.sagTable.find(r => r.condition === 'Full Wind' && r.temperature_C === currentTemp);
  const maxBlowout = row?.blowout_m ?? 0;
  const swingAngle = row?.swingAngle_deg ?? 0;

  const insulatorHorizontalDeflection_m = inputs.insulatorLength_m * Math.sin(swingAngle * Math.PI / 180);
  const conductorBlowout_m = maxBlowout - insulatorHorizontalDeflection_m;

  const L = inputs.span_m;
  const exaggeration = 4; // Vertical exaggeration for better visibility
  const pts = Array.from({length: 51}, (_, i) => {
    const x = (i/50) * L;
    const y_cond = (4 * conductorBlowout_m / (L * L)) * x * (L - x);
    const y = (y_cond + insulatorHorizontalDeflection_m) * exaggeration;
    return { x, y };
  });

  const maxBlowoutVis = maxBlowout * exaggeration;
  const insulDefVis = insulatorHorizontalDeflection_m * exaggeration;
  const viewHeight = Math.max(100, maxBlowoutVis + 60);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-muted-foreground/80 italic">Note: Vertical axis is visually exaggerated 4x for clarity</span>
        <select
          value={currentTemp}
          onChange={(e) => onSelectedTempChange(parseFloat(e.target.value))}
          className="bg-background border border-border rounded-lg px-3 py-1.5 text-[12px] text-foreground focus:outline-none focus:border-teal-500/30"
        >
          {tempCases.map(t => <option key={t} value={t}>{t}°C (Full Wind)</option>)}
        </select>
      </div>
      <svg viewBox={`-20 -20 ${L + 40} ${viewHeight}`} className="w-full" style={{ minHeight: 250 }}>
        {/* Baseline / 0 Wind Line */}
        <line x1="0" y1="0" x2={L} y2="0" stroke="#334155" strokeWidth="1" strokeDasharray="4,4" />
        
        {/* Cross-arms (Towers) */}
        <line x1="-15" y1="0" x2="15" y2="0" stroke="#64748b" strokeWidth="4" />
        <line x1={L - 15} y1="0" x2={L + 15} y2="0" stroke="#64748b" strokeWidth="4" />
        
        {/* Insulator Swings (Left & Right) */}
        <line x1="0" y1="0" x2="0" y2={insulDefVis} stroke="#94a3b8" strokeWidth="1.5" />
        <line x1={L} y1="0" x2={L} y2={insulDefVis} stroke="#94a3b8" strokeWidth="1.5" />
        
        {/* Conductor Blowout Curve */}
        <path d={`M 0 ${insulDefVis} ${pts.map(p => `L ${p.x} ${p.y}`).join(' ')}`} fill="none" stroke="#0ea5e9" strokeWidth="2" />
        
        {/* Annotation Max Blowout */}
        <line x1={L/2} y1="0" x2={L/2} y2={maxBlowoutVis} stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,2" />
        <text x={L/2 + 3} y={maxBlowoutVis/2} fill="#f59e0b" fontSize="9" fontFamily="monospace">{maxBlowout.toFixed(2)}m</text>

        {/* Insulator Label */}
        <text x="3" y={insulDefVis/2 + 3} fill="#94a3b8" fontSize="9" fontFamily="monospace">{swingAngle.toFixed(1)}° swing</text>
      </svg>
      <div className="flex justify-center gap-6 mt-2 text-[11px] text-muted-foreground font-mono">
        <span className="flex items-center gap-2"><div className="w-3 h-0.5 bg-[#0ea5e9]"></div> Conductor Blowout: {conductorBlowout_m.toFixed(2)}m</span>
        <span className="flex items-center gap-2"><div className="w-3 h-0.5 bg-[#94a3b8]"></div> Insulator Deflection: {insulatorHorizontalDeflection_m.toFixed(2)}m</span>
      </div>
    </div>
  );
}

// ─── Broken Wire View ───
export function SagTensionBrokenWire({ inputs, results }: { inputs: SagTensionInputs; results: SagTensionResults }) {
  const bw = results.brokenWire;
  
  if (!bw) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center justify-center text-center animate-in fade-in">
        <AlertTriangle className="w-10 h-10 text-amber-500/50 mb-4" />
        <h3 className="text-sm font-semibold text-foreground">Broken Wire Analysis Required</h3>
        <p className="text-[12px] text-muted-foreground max-w-md mt-2">
          Please enter a Load Factor (%) in the Broken Wire Analysis configuration panel to view these results.
        </p>
      </div>
    );
  }

  const isSuspension = bw.towerType === 'suspension';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[12px] text-amber-200">
          <p className="font-semibold mb-1">Unverified Load Factor</p>
          <p>
            The Longitudinal Load Factor applied here ({bw.loadFactorApplied_pct}%) is purely user-defined. 
            IS 802 and other standards recommend specific percentages based on tower geometry, wind zones, and reliability levels. 
            <strong> You must independently verify this factor against your utility's design standard.</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wider mb-4 text-rose-400">Longitudinal Load Summary</h3>
            <div className="space-y-4 font-mono text-[12px] text-slate-300">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Tower Type</span>
                <span className="text-foreground uppercase">{bw.towerType}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Operating Tension (Everyday)</span>
                <span>{bw.operatingTension_kg.toFixed(0)} kg</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Security Load Factor</span>
                <span className="text-amber-400">{bw.loadFactorApplied_pct}%</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2 font-bold text-[14px]">
                <span className="text-rose-400">Unbalanced Longitudinal Load</span>
                <span className="text-rose-400">{bw.longitudinalLoad_kg.toFixed(0)} kg</span>
              </div>
            </div>
          </div>

          {isSuspension && (
            <div>
              <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wider mb-4 text-teal-400">Insulator Swing (Illustrative)</h3>
              <div className="space-y-4 font-mono text-[12px] text-slate-300">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Longitudinal Pull</span>
                  <span>{bw.longitudinalLoad_kg.toFixed(0)} kg</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Vertical Force (Ins + ½ Cond)</span>
                  <span>{((inputs.insulatorWeight_kg ?? 100) + 0.5 * inputs.weight_kg_m * inputs.span_m).toFixed(0)} kg</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2 font-bold text-[14px]">
                  <span className="text-teal-400">Computed Swing Angle</span>
                  <span className="text-teal-400">{bw.insulatorSwingAngle_deg?.toFixed(1)}°</span>
                </div>
                {bw.insulatorSwingWarning && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[11px] leading-relaxed">
                    {bw.insulatorSwingWarning}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center">
           <svg viewBox="0 0 300 200" className="w-full max-w-[250px] overflow-visible">
            {/* Tower Crossarm */}
            <rect x="140" y="20" width="20" height="160" fill="#334155" rx="2" />
            
            {/* Broken Side (Left) */}
            <path d="M 150 100 Q 100 120 50 160" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
            <text x="70" y="150" fill="#ef4444" fontSize="10" fontFamily="monospace">Broken Span</text>
            <text x="70" y="165" fill="#ef4444" fontSize="10" fontFamily="monospace">(0 Tension)</text>
            <circle cx="150" cy="100" r="4" fill="#ef4444" />

            {/* Intact Side (Right) */}
            {isSuspension && bw.insulatorSwingAngle_deg ? (
              <>
                {/* Insulator swing visualization */}
                <line x1="150" y1="100" x2="180" y2="100" stroke="#94a3b8" strokeWidth="3" />
                <circle cx="180" cy="100" r="3" fill="#cbd5e1" />
                <line x1="180" y1="100" x2="280" y2="100" stroke="#cbd5e1" strokeWidth="2" />
                <text x="160" y="90" fill="#94a3b8" fontSize="10" fontFamily="monospace">{bw.insulatorSwingAngle_deg.toFixed(1)}°</text>
                <text x="200" y="90" fill="#f43f5e" fontSize="10" fontFamily="monospace">{bw.longitudinalLoad_kg.toFixed(0)}kg Pull</text>
              </>
            ) : (
              <>
                <line x1="150" y1="100" x2="280" y2="100" stroke="#cbd5e1" strokeWidth="2" />
                <text x="180" y="90" fill="#f43f5e" fontSize="10" fontFamily="monospace">{bw.longitudinalLoad_kg.toFixed(0)}kg Pull</text>
              </>
            )}
          </svg>
          <div className="mt-8 text-[11px] text-muted-foreground text-center">
            Top-down schematic view of unbalanced longitudinal force.
          </div>
        </div>
      </div>
    </div>
  );
}
