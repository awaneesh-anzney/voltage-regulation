"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Cable, Settings2, BarChart3, LineChart, ArrowRight,
  AlertTriangle, CheckCircle2, XCircle, Wind, Thermometer,
  ChevronDown, ChevronRight, Ruler, Settings
} from "lucide-react";
import { computeSagTension, getDefaultSagTensionInputs } from "@/lib/sagTensionEngine";
import type { SagTensionInputs, SagTensionResults, SagTableRow } from "@/lib/sagTensionEngine";
import { CONDUCTOR_LIBRARY, getConductorTypes, getConductorsByType } from "@/lib/conductorLibrary";
import type { ConductorSpec } from "@/lib/conductorLibrary";

interface SagTensionTabProps {
  onFeedToSCForces?: (data: { fst_kg: number; span_m: number; conductorName: string }) => void;
}

type SubTab = "input" | "results" | "profile" | "sweep";

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "input",   label: "Parameters",    icon: Settings2 },
  { id: "results", label: "Results",        icon: BarChart3 },
  { id: "profile", label: "Sag Profile",    icon: Cable },
  { id: "sweep",   label: "Temp Sweep",     icon: LineChart },
];

// ─── Reusable UI Components ───

function Field({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-slate-400" dangerouslySetInnerHTML={{ __html: label }} />
      {children}
      {unit && (
        <span className="inline-flex items-center self-start mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_6px_rgba(34,211,238,0.08)]">
          {unit}
        </span>
      )}
    </div>
  );
}

function NumberInput({ value, onChange, step, min, disabled }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number; disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);
  if (!isFocused && localValue !== String(value)) setLocalValue(String(value));
  return (
    <input
      type="number" value={isFocused ? localValue : value} step={step} min={min} disabled={disabled}
      onFocus={() => { setIsFocused(true); setLocalValue(String(value)); }}
      onChange={(e) => { const raw = e.target.value; setLocalValue(raw); const p = parseFloat(raw); if (!isNaN(p)) onChange(p); }}
      onBlur={() => { setIsFocused(false); const p = parseFloat(localValue); if (isNaN(p)) setLocalValue(String(value)); else { onChange(p); setLocalValue(String(p)); } }}
      className="w-full bg-[#0a0f18] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
    />
  );
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0a0f18] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none cursor-pointer appearance-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px',
      }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SectionCard({ title, icon: Icon, accentColor, children }: { title: string; icon: React.ElementType; accentColor?: string; children: React.ReactNode }) {
  const color = accentColor || "blue";
  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 relative overflow-hidden group hover:border-white/[0.1] transition-all">
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-${color}-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 text-${color}-400`} />
        <h3 className="text-[13px] font-semibold text-white uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function KpiCard({ label, value, sub, status, highlight }: {
  label: string; value: string; sub: string;
  status?: "ok" | "warn" | "danger" | "info"; highlight?: boolean;
}) {
  const colorMap = { ok: "text-emerald-400", warn: "text-amber-400", danger: "text-red-400", info: "text-blue-400" };
  const color = status ? colorMap[status] : "text-blue-400";
  return (
    <div className={`bg-[#111827] border rounded-xl p-4 relative overflow-hidden group hover:border-white/[0.1] transition-all ${
      highlight ? "border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.08)]" : "border-white/[0.06]"
    }`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent ${
        status === 'danger' ? 'via-red-500' : status === 'warn' ? 'via-amber-500' : status === 'ok' ? 'via-emerald-500' : 'via-blue-500'
      } to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="text-[11px] font-medium text-slate-500 mb-1.5">{label}</div>
      <div className={`font-mono text-[22px] font-semibold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-600 mt-1 font-mono">{sub}</div>
    </div>
  );
}

// ─── Input Panel ───

function InputPanel({ inputs, updateInput, updateInputs }: {
  inputs: SagTensionInputs;
  updateInput: <K extends keyof SagTensionInputs>(key: K, value: SagTensionInputs[K]) => void;
  updateInputs: (partial: Partial<SagTensionInputs>) => void;
}) {
  const [selectedType, setSelectedType] = useState<string>(
    CONDUCTOR_LIBRARY.find(c => c.name === 'Moose')?.type || 'ACSR'
  );
  const [selectedName, setSelectedName] = useState('Moose');
  const [isCustom, setIsCustom] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const conductorTypes = getConductorTypes();
  const conductorsForType = getConductorsByType(selectedType);

  const applyConductor = (c: ConductorSpec) => {
    updateInputs({
      conductorName: `${c.type} ${c.name}`,
      area_mm2: c.As,
      diameter_mm: c.ds,
      weight_kg_m: c.mc,
      elasticModulus_N_mm2: c.E,
      uts_kN: c.uts,
      thermalExpCoeff: c.thermalExpCoeff,
      finalModulus_N_mm2: c.finalModulus || 0,
    });
  };

  const handleTypeChange = (type: string) => {
    if (type === 'Custom') { setIsCustom(true); return; }
    setIsCustom(false);
    setSelectedType(type);
    const first = getConductorsByType(type)[0];
    if (first) { setSelectedName(first.name); applyConductor(first); }
  };

  const handleNameChange = (name: string) => {
    setSelectedName(name);
    const cond = CONDUCTOR_LIBRARY.find(c => c.name === name && c.type === selectedType);
    if (cond) applyConductor(cond);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Conductor */}
        <SectionCard title="Conductor" icon={Cable}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Conductor type">
              <SelectInput value={isCustom ? 'Custom' : selectedType} onChange={handleTypeChange}
                options={[...conductorTypes.map(t => ({ value: t, label: t })), { value: 'Custom', label: 'Custom' }]} />
            </Field>
            <Field label="Conductor name">
              {isCustom ? (
                <input type="text" value={inputs.conductorName} onChange={e => updateInput('conductorName', e.target.value)}
                  className="w-full bg-[#0a0f18] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none" />
              ) : (
                <SelectInput value={selectedName} onChange={handleNameChange}
                  options={conductorsForType.map(c => ({ value: c.name, label: c.name }))} />
              )}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Area A" unit="mm²">
              <NumberInput value={inputs.area_mm2} onChange={v => updateInput('area_mm2', v)} disabled={!isCustom} />
            </Field>
            <Field label="Diameter d" unit="mm">
              <NumberInput value={inputs.diameter_mm} onChange={v => updateInput('diameter_mm', v)} disabled={!isCustom} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight w" unit="kg/m">
              <NumberInput value={inputs.weight_kg_m} onChange={v => updateInput('weight_kg_m', v)} step={0.001} disabled={!isCustom} />
            </Field>
            <Field label="UTS" unit="kN">
              <NumberInput value={inputs.uts_kN} onChange={v => updateInput('uts_kN', v)} step={0.1} disabled={!isCustom} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Elastic modulus E" unit="N/mm²">
              <NumberInput value={inputs.elasticModulus_N_mm2} onChange={v => updateInput('elasticModulus_N_mm2', v)} step={1000} disabled={!isCustom} />
            </Field>
            <Field label="Thermal exp. α" unit="/°C">
              <input type="text" value={inputs.thermalExpCoeff.toExponential(2)} disabled={!isCustom}
                onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateInput('thermalExpCoeff', v); }}
                className="w-full bg-[#0a0f18] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed" />
            </Field>
          </div>
        </SectionCard>

        {/* Span & Structure */}
        <SectionCard title="Span & Structure" icon={Ruler}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Span length" unit="m">
              <NumberInput value={inputs.span_m} onChange={v => updateInput('span_m', v)} step={10} min={10} />
            </Field>
            <Field label="Ruling span (0 = same)" unit="m">
              <NumberInput value={inputs.rulingSpan_m} onChange={v => updateInput('rulingSpan_m', v)} step={10} min={0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Level difference" unit="m">
              <NumberInput value={inputs.levelDiff_m} onChange={v => updateInput('levelDiff_m', v)} step={0.5} />
            </Field>
            <Field label="Tower attachment height" unit="m">
              <NumberInput value={inputs.towerHeight_m} onChange={v => updateInput('towerHeight_m', v)} step={1} min={5} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Insulator length" unit="m">
              <NumberInput value={inputs.insulatorLength_m} onChange={v => updateInput('insulatorLength_m', v)} step={0.5} min={0} />
            </Field>
            <Field label="Min ground clearance" unit="m">
              <NumberInput value={inputs.minGroundClearance_m} onChange={v => updateInput('minGroundClearance_m', v)} step={0.5} min={1} />
            </Field>
          </div>
        </SectionCard>

        {/* Loading Conditions */}
        <SectionCard title="Loading & Wind" icon={Wind}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Wind pressure q" unit="Pa">
              <NumberInput value={inputs.windPressure_Pa} onChange={v => updateInput('windPressure_Pa', v)} step={10} min={0} />
            </Field>
            <Field label="Drag coefficient C<sub>d</sub>">
              <NumberInput value={inputs.dragCoeff} onChange={v => updateInput('dragCoeff', v)} step={0.1} min={0.5} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ice thickness" unit="mm">
              <NumberInput value={inputs.iceFactor} onChange={v => updateInput('iceFactor', v)} step={1} min={0} />
            </Field>
            <Field label="Safety factor (on UTS)">
              <NumberInput value={inputs.safetyFactor} onChange={v => updateInput('safetyFactor', v)} step={0.5} min={1} />
            </Field>
          </div>
          {/* IS 802 Wind Zone quick-select */}
          <div className="mt-1">
            <label className="text-[11px] font-medium text-slate-400 mb-1 block">IS 802 Wind Zone Quick-Select</label>
            <div className="flex gap-2">
              {[
                { label: 'Zone I', pa: 295 }, { label: 'Zone II', pa: 365 },
                { label: 'Zone III', pa: 445 }, { label: 'Zone IV', pa: 590 },
                { label: 'Zone V', pa: 735 }, { label: 'Zone VI', pa: 1075 },
              ].map(z => (
                <button key={z.label} onClick={() => updateInput('windPressure_Pa', z.pa)}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md border transition-all cursor-pointer ${
                    inputs.windPressure_Pa === z.pa
                      ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                      : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-white hover:border-white/10"
                  }`}>
                  {z.label}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Stringing */}
        <SectionCard title="Stringing Conditions" icon={Thermometer}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reference temperature" unit="°C">
              <NumberInput value={inputs.refTemp_C} onChange={v => updateInput('refTemp_C', v)} step={1} />
            </Field>
            <Field label="Initial tension" unit="% UTS">
              <NumberInput value={inputs.initialTension_pctUTS} onChange={v => updateInput('initialTension_pctUTS', v)} step={1} min={5} />
            </Field>
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1 block">Temperature cases (°C)</label>
            <div className="flex flex-wrap gap-1.5">
              {inputs.tempCases_C.map((t, i) => (
                <div key={i} className="flex items-center gap-0.5 bg-[#0a0f18] border border-white/[0.1] rounded-md px-2 py-1">
                  <input type="number" value={t} step={1}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) {
                        const newCases = [...inputs.tempCases_C];
                        newCases[i] = v;
                        updateInput('tempCases_C', newCases);
                      }
                    }}
                    className="w-12 bg-transparent text-xs text-white font-mono focus:outline-none text-center" />
                  <button onClick={() => updateInput('tempCases_C', inputs.tempCases_C.filter((_, j) => j !== i))}
                    className="text-slate-600 hover:text-red-400 text-xs cursor-pointer">×</button>
                </div>
              ))}
              <button onClick={() => updateInput('tempCases_C', [...inputs.tempCases_C, 50].sort((a, b) => a - b))}
                className="px-2 py-1 text-[10px] font-medium text-slate-500 border border-dashed border-white/[0.08] rounded-md hover:border-blue-500 hover:text-blue-400 transition-all cursor-pointer">
                + Add
              </button>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Advanced */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center gap-2 px-5 py-3 text-[12px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer">
          <Settings className="w-3.5 h-3.5" /> Advanced Options
          {showAdvanced ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
        </button>
        {showAdvanced && (
          <div className="px-5 pb-4 border-t border-white/[0.04]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
              <Field label="Final modulus (0 = use E)" unit="N/mm²">
                <NumberInput value={inputs.finalModulus_N_mm2} onChange={v => updateInput('finalModulus_N_mm2', v)} />
              </Field>
              <Field label="Gravity g" unit="m/s²">
                <div className="text-sm text-slate-500 font-mono py-2">9.807 (const)</div>
              </Field>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Results Panel ───

function ResultsPanel({ inputs, results, onFeedToSCForces }: {
  inputs: SagTensionInputs; results: SagTensionResults;
  onFeedToSCForces?: (data: { fst_kg: number; span_m: number; conductorName: string }) => void;
}) {
  const noWindRows = results.sagTable.filter(r => r.condition === 'No Wind');

  return (
    <div className="space-y-5">
      {/* Info Banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500/8 border border-teal-500/20 text-teal-300 text-[13px]">
        <Cable className="w-4 h-4" />
        <strong>{inputs.conductorName} · {inputs.span_m} m span · {inputs.refTemp_C}°C ref</strong>
        <span className="text-teal-400/60 ml-1">— IS 802 / IEC 60826</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="Static Tension F_st" value={`${results.staticTension_kg.toFixed(0)} kg`}
          sub={`${results.staticTension_kN.toFixed(1)} kN — for SC Forces`} status="info" highlight />
        <KpiCard label="Max Sag" value={`${results.maxSag_m.toFixed(2)} m`}
          sub={`at ${results.maxSag_temp_C}°C no-wind`} status={results.clearance_check ? "ok" : "danger"} />
        <KpiCard label="Min Clearance" value={`${results.minClearance_m.toFixed(2)} m`}
          sub={`Req: ${inputs.minGroundClearance_m.toFixed(2)} m`} status={results.clearance_check ? "ok" : "danger"} />
        <KpiCard label="Max Tension" value={`${results.maxTension_kg.toFixed(0)} kg`}
          sub={`at ${results.maxTension_temp_C}°C`} status={results.uts_check ? "ok" : "danger"} />
        <KpiCard label="UTS Check" value={results.uts_check ? "PASS" : "FAIL"}
          sub={`SF = ${inputs.safetyFactor}`} status={results.uts_check ? "ok" : "danger"} />
        <KpiCard label="Clearance Check" value={results.clearance_check ? "PASS" : "FAIL"}
          sub={results.clearance_check ? "All temps OK" : "VIOLATED"} status={results.clearance_check ? "ok" : "danger"} highlight />
      </div>

      {/* Feed to SC Forces */}
      {onFeedToSCForces && (
        <button onClick={() => onFeedToSCForces({
          fst_kg: results.staticTension_kg,
          span_m: inputs.span_m,
          conductorName: inputs.conductorName,
        })}
          className="w-full flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg py-3 hover:from-teal-400 hover:to-blue-400 shadow-[0_2px_10px_rgba(20,184,166,0.2)] hover:shadow-[0_4px_16px_rgba(20,184,166,0.35)] transition-all cursor-pointer hover:-translate-y-px active:translate-y-0">
          <ArrowRight className="w-4 h-4" />
          Use F_st = {results.staticTension_kg.toFixed(0)} kg in SC Forces →
        </button>
      )}

      {/* Sag-Tension Table (No Wind) */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.04] bg-slate-900/30">
          <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider">Sag-Tension Table (No Wind)</h3>
        </div>
        <div className="overflow-x-auto green-scrollbar">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-white/[0.06] text-slate-500 font-semibold">
                <th className="px-4 py-2.5">Temp (°C)</th>
                <th className="px-4 py-2.5 text-right">Tension (kg)</th>
                <th className="px-4 py-2.5 text-right">% UTS</th>
                <th className="px-4 py-2.5 text-right">Sag (m)</th>
                <th className="px-4 py-2.5 text-right">Parabolic (m)</th>
                <th className="px-4 py-2.5 text-right">Clearance (m)</th>
                <th className="px-4 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {noWindRows.map((row, i) => (
                <tr key={i} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                  row.temperature_C === inputs.refTemp_C ? 'bg-blue-500/5' : ''
                }`}>
                  <td className="px-4 py-2.5 font-mono font-medium">
                    {row.temperature_C}°C
                    {row.temperature_C === inputs.refTemp_C && (
                      <span className="ml-1 text-[9px] text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded">REF</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-white">{row.tension_kg.toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{row.tension_pctUTS.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right font-mono text-white">{row.sag_m.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-500">{row.sag_parabolic_m.toFixed(2)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono ${row.clearance_ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {row.clearance_m.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {row.clearance_ok
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400 inline" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wind Loading Table */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.04] bg-slate-900/30">
          <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider">Full Wind Condition</h3>
        </div>
        <div className="overflow-x-auto green-scrollbar">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-white/[0.06] text-slate-500 font-semibold">
                <th className="px-4 py-2.5">Temp (°C)</th>
                <th className="px-4 py-2.5 text-right">Tension (kg)</th>
                <th className="px-4 py-2.5 text-right">Vert Sag (m)</th>
                <th className="px-4 py-2.5 text-right">Blowout (m)</th>
                <th className="px-4 py-2.5 text-right">Swing Angle (°)</th>
                <th className="px-4 py-2.5 text-right">Clearance (m)</th>
              </tr>
            </thead>
            <tbody>
              {results.sagTable.filter(r => r.condition === 'Full Wind').map((row, i) => (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 font-mono font-medium">{row.temperature_C}°C</td>
                  <td className="px-4 py-2.5 text-right font-mono text-white">{row.tension_kg.toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{row.sag_m.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-amber-400">{row.blowout_m.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{row.swingAngle_deg.toFixed(1)}°</td>
                  <td className={`px-4 py-2.5 text-right font-mono ${row.clearance_ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {row.clearance_m.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wind & Validation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider mb-3">Loading Summary</h3>
          <div className="space-y-2 text-[13px] text-slate-400">
            <div className="flex justify-between"><span>Self weight</span><span className="font-mono text-white">{(inputs.weight_kg_m * 9.807).toFixed(2)} N/m</span></div>
            <div className="flex justify-between"><span>Wind force</span><span className="font-mono text-white">{results.windForce_N_m.toFixed(2)} N/m</span></div>
            <div className="flex justify-between"><span>Combined load</span><span className="font-mono text-white">{results.totalCombinedLoad_N_m.toFixed(2)} N/m</span></div>
            <div className="flex justify-between"><span>Catenary vs Parabolic max diff</span><span className="font-mono text-white">{results.catenary_vs_parabolic_pct.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span>Ruling span</span><span className="font-mono text-white">{results.rulingSpan_m.toFixed(0)} m</span></div>
          </div>
        </div>
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider mb-3">Engineering Summary</h3>
          <div className="text-[13px] text-slate-300 leading-relaxed space-y-2">
            <p>
              <strong className="text-white">{inputs.conductorName}</strong> strung at <strong className="text-white">{inputs.initialTension_pctUTS}% UTS</strong> at {inputs.refTemp_C}°C
              over a <strong className="text-white">{inputs.span_m} m</strong> span.
            </p>
            <p>
              Maximum sag is <strong className="text-white">{results.maxSag_m.toFixed(2)} m</strong> at {results.maxSag_temp_C}°C.
              {results.clearance_check
                ? ` Ground clearance is maintained at all temperatures (min: ${results.minClearance_m.toFixed(2)} m > ${inputs.minGroundClearance_m} m required).`
                : <span className="text-red-400"> Ground clearance is VIOLATED at {results.minClearance_temp_C}°C ({results.minClearance_m.toFixed(2)} m &lt; {inputs.minGroundClearance_m} m required).</span>
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Catenary Profile SVG ───

function CatenaryProfile({ inputs, results }: { inputs: SagTensionInputs; results: SagTensionResults }) {
  const span = inputs.span_m;
  const effectiveH = inputs.towerHeight_m - inputs.insulatorLength_m;
  const noWindRows = results.sagTable.filter(r => r.condition === 'No Wind');

  // SVG dimensions
  const svgW = 800, svgH = 400;
  const padL = 60, padR = 40, padT = 30, padB = 50;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  // Scale
  const xScale = (x: number) => padL + (x / span) * plotW;
  const maxY = effectiveH + 5;
  const yScale = (y: number) => padT + (1 - y / maxY) * plotH;

  // Ground clearance line
  const groundY = yScale(0);
  const clearanceLineY = yScale(inputs.minGroundClearance_m);

  // Tower shapes
  const towerW = 10;
  const leftTowerX = xScale(0);
  const rightTowerX = xScale(span);
  const towerTopY = yScale(effectiveH);
  const towerBotY = yScale(0);

  // Catenary curves for key temperatures
  const temps = [
    { temp: noWindRows[0]?.temperature_C ?? -5, color: '#3b82f6', label: `${noWindRows[0]?.temperature_C ?? -5}°C` },
    { temp: inputs.refTemp_C, color: '#10b981', label: `${inputs.refTemp_C}°C (ref)` },
    { temp: noWindRows[noWindRows.length - 1]?.temperature_C ?? 100, color: '#ef4444', label: `${noWindRows[noWindRows.length - 1]?.temperature_C ?? 100}°C` },
  ];

  const curvePaths = temps.map(tc => {
    const row = noWindRows.find(r => r.temperature_C === tc.temp);
    if (!row) return { ...tc, path: '' };
    const T_N = row.tension_kg * 9.807;
    const w = inputs.weight_kg_m * 9.807;
    const points: string[] = [];
    const nPts = 100;
    for (let i = 0; i <= nPts; i++) {
      const x = (i / nPts) * span;
      const xFromMid = x - span / 2;
      const sagAtX = (T_N / w) * (Math.cosh((w * xFromMid) / T_N) - Math.cosh((w * span) / (2 * T_N)));
      const y = effectiveH + sagAtX; // sagAtX is negative
      points.push(`${xScale(x).toFixed(1)},${yScale(y).toFixed(1)}`);
    }
    return { ...tc, path: `M ${points.join(' L ')}` };
  });

  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider mb-4">Catenary Profile</h3>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" style={{ maxHeight: '400px' }}>
        {/* Grid lines */}
        {[0, effectiveH / 4, effectiveH / 2, (3 * effectiveH) / 4, effectiveH].map((h, i) => (
          <g key={i}>
            <line x1={padL} y1={yScale(h)} x2={svgW - padR} y2={yScale(h)} stroke="#1e293b" strokeWidth={0.5} />
            <text x={padL - 5} y={yScale(h) + 3} textAnchor="end" fill="#64748b" fontSize={9} fontFamily="monospace">{h.toFixed(0)}m</text>
          </g>
        ))}

        {/* Ground line */}
        <line x1={padL} y1={groundY} x2={svgW - padR} y2={groundY} stroke="#475569" strokeWidth={1.5} />
        <text x={svgW - padR + 5} y={groundY + 3} fill="#64748b" fontSize={9} fontFamily="monospace">Ground</text>

        {/* Min clearance line */}
        <line x1={padL} y1={clearanceLineY} x2={svgW - padR} y2={clearanceLineY} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="6,4" />
        <text x={svgW - padR + 5} y={clearanceLineY + 3} fill="#ef4444" fontSize={8} fontFamily="monospace">Min CL</text>

        {/* Towers */}
        {[leftTowerX, rightTowerX].map((tx, i) => (
          <g key={`tower-${i}`}>
            <rect x={tx - towerW / 2} y={towerTopY} width={towerW} height={towerBotY - towerTopY} fill="#334155" stroke="#475569" strokeWidth={1} rx={2} />
            <circle cx={tx} cy={towerTopY} r={3} fill="#3b82f6" stroke="#1e3a5f" strokeWidth={1.5} />
          </g>
        ))}

        {/* Catenary curves */}
        {curvePaths.map((cp, i) => cp.path && (
          <path key={i} d={cp.path} fill="none" stroke={cp.color} strokeWidth={2} opacity={0.9} />
        ))}

        {/* Legend */}
        {curvePaths.map((cp, i) => (
          <g key={`leg-${i}`} transform={`translate(${padL + 15}, ${padT + 10 + i * 16})`}>
            <line x1={0} y1={0} x2={18} y2={0} stroke={cp.color} strokeWidth={2} />
            <text x={22} y={4} fill="#e2e8f0" fontSize={10} fontFamily="monospace">{cp.label}</text>
          </g>
        ))}

        {/* X axis labels */}
        {[0, span / 4, span / 2, (3 * span) / 4, span].map((x, i) => (
          <text key={i} x={xScale(x)} y={svgH - 15} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">{x.toFixed(0)}m</text>
        ))}
        <text x={svgW / 2} y={svgH - 2} textAnchor="middle" fill="#94a3b8" fontSize={10}>Span Distance (m)</text>
      </svg>
    </div>
  );
}

// ─── Temperature Sweep Chart ───

function TemperatureSweepChart({ results }: { results: SagTensionResults }) {
  const noWindRows = results.sagTable.filter(r => r.condition === 'No Wind');
  if (noWindRows.length < 2) return null;

  const svgW = 800, svgH = 350;
  const padL = 65, padR = 65, padT = 30, padB = 50;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const temps = noWindRows.map(r => r.temperature_C);
  const minT = Math.min(...temps), maxT = Math.max(...temps);
  const sags = noWindRows.map(r => r.sag_m);
  const tensions = noWindRows.map(r => r.tension_kg);
  const maxSag = Math.max(...sags) * 1.1;
  const minSag = 0;
  const maxTens = Math.max(...tensions) * 1.1;
  const minTens = Math.min(...tensions) * 0.9;

  const xScale = (t: number) => padL + ((t - minT) / (maxT - minT)) * plotW;
  const ySagScale = (s: number) => padT + (1 - (s - minSag) / (maxSag - minSag)) * plotH;
  const yTenScale = (t: number) => padT + (1 - (t - minTens) / (maxTens - minTens)) * plotH;

  const sagPath = noWindRows.map((r, i) => `${i === 0 ? 'M' : 'L'} ${xScale(r.temperature_C).toFixed(1)},${ySagScale(r.sag_m).toFixed(1)}`).join(' ');
  const tenPath = noWindRows.map((r, i) => `${i === 0 ? 'M' : 'L'} ${xScale(r.temperature_C).toFixed(1)},${yTenScale(r.tension_kg).toFixed(1)}`).join(' ');

  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider mb-4">Temperature Sweep — Sag & Tension vs Temperature</h3>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" style={{ maxHeight: '350px' }}>
        {/* Grid */}
        {[0, 1, 2, 3, 4].map(i => {
          const y = padT + (i / 4) * plotH;
          return <line key={i} x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#1e293b" strokeWidth={0.5} />;
        })}

        {/* Sag curve (left axis) */}
        <path d={sagPath} fill="none" stroke="#f59e0b" strokeWidth={2.5} />
        {noWindRows.map((r, i) => (
          <circle key={`s-${i}`} cx={xScale(r.temperature_C)} cy={ySagScale(r.sag_m)} r={4} fill="#f59e0b" stroke="#0a0f18" strokeWidth={2} />
        ))}

        {/* Tension curve (right axis) */}
        <path d={tenPath} fill="none" stroke="#3b82f6" strokeWidth={2.5} />
        {noWindRows.map((r, i) => (
          <circle key={`t-${i}`} cx={xScale(r.temperature_C)} cy={yTenScale(r.tension_kg)} r={4} fill="#3b82f6" stroke="#0a0f18" strokeWidth={2} />
        ))}

        {/* Left Y axis labels (Sag) */}
        {[0, 1, 2, 3, 4].map(i => {
          const val = minSag + (1 - i / 4) * (maxSag - minSag);
          return <text key={i} x={padL - 5} y={padT + (i / 4) * plotH + 3} textAnchor="end" fill="#f59e0b" fontSize={9} fontFamily="monospace">{val.toFixed(1)}m</text>;
        })}
        <text x={10} y={svgH / 2} textAnchor="middle" fill="#f59e0b" fontSize={10} transform={`rotate(-90, 10, ${svgH / 2})`}>Sag (m)</text>

        {/* Right Y axis labels (Tension) */}
        {[0, 1, 2, 3, 4].map(i => {
          const val = minTens + (1 - i / 4) * (maxTens - minTens);
          return <text key={i} x={svgW - padR + 5} y={padT + (i / 4) * plotH + 3} textAnchor="start" fill="#3b82f6" fontSize={9} fontFamily="monospace">{val.toFixed(0)}kg</text>;
        })}
        <text x={svgW - 10} y={svgH / 2} textAnchor="middle" fill="#3b82f6" fontSize={10} transform={`rotate(90, ${svgW - 10}, ${svgH / 2})`}>Tension (kg)</text>

        {/* X axis */}
        {temps.map((t, i) => (
          <text key={i} x={xScale(t)} y={svgH - 15} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">{t}°C</text>
        ))}
        <text x={svgW / 2} y={svgH - 2} textAnchor="middle" fill="#94a3b8" fontSize={10}>Temperature (°C)</text>

        {/* Legend */}
        <g transform={`translate(${padL + 15}, ${padT + 10})`}>
          <line x1={0} y1={0} x2={18} y2={0} stroke="#f59e0b" strokeWidth={2.5} />
          <text x={22} y={4} fill="#e2e8f0" fontSize={10} fontFamily="monospace">Sag</text>
        </g>
        <g transform={`translate(${padL + 15}, ${padT + 26})`}>
          <line x1={0} y1={0} x2={18} y2={0} stroke="#3b82f6" strokeWidth={2.5} />
          <text x={22} y={4} fill="#e2e8f0" fontSize={10} fontFamily="monospace">Tension</text>
        </g>
      </svg>
    </div>
  );
}

// ─── Main Tab Component ───

export function SagTensionTab({ onFeedToSCForces }: SagTensionTabProps) {
  const [inputs, setInputs] = useState<SagTensionInputs>(getDefaultSagTensionInputs());
  const [activeTab, setActiveTab] = useState<SubTab>("results");

  const results: SagTensionResults = useMemo(() => computeSagTension(inputs), [inputs]);

  const updateInput = useCallback(<K extends keyof SagTensionInputs>(key: K, value: SagTensionInputs[K]) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateInputs = useCallback((partial: Partial<SagTensionInputs>) => {
    setInputs(prev => ({ ...prev, ...partial }));
  }, []);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Cable className="w-5 h-5 text-teal-500" />
            Conductor Sag-Tension Analysis
          </h1>
          <p className="text-[13px] text-slate-400 mt-1.5 max-w-2xl">
            IS 802 / IEC 60826 compliant sag-tension calculation. Computes catenary sag, temperature-based tension changes, wind loading, and ground clearance. Feeds static tension (F<sub>st</sub>) into SC Forces module.
          </p>
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

      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-[#111827] p-1 rounded-xl border border-white/[0.06] w-full overflow-x-auto no-scrollbar">
        {SUB_TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center whitespace-nowrap shrink-0 gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
              activeTab === t.id
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Quick status bar */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full border ${
          results.clearance_check
            ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/8 border-red-500/20 text-red-400"
        }`}>
          {results.clearance_check ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          Clearance {results.clearance_check ? "OK" : "FAIL"}
        </div>
        <div className="text-slate-500">
          F_st={results.staticTension_kg.toFixed(0)}kg · Sag={results.maxSag_m.toFixed(1)}m · Clr={results.minClearance_m.toFixed(1)}m
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-1">
        {activeTab === "input" && <InputPanel inputs={inputs} updateInput={updateInput} updateInputs={updateInputs} />}
        {activeTab === "results" && <ResultsPanel inputs={inputs} results={results} onFeedToSCForces={onFeedToSCForces} />}
        {activeTab === "profile" && <CatenaryProfile inputs={inputs} results={results} />}
        {activeTab === "sweep" && <TemperatureSweepChart results={results} />}
      </div>
    </div>
  );
}
