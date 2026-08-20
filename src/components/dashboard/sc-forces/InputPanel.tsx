"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Zap, Ruler, Cable, Settings, Layers } from "lucide-react";
import { autoFillSCForcesFields } from "@/lib/ceaClearances";
import type { SCInputs } from "@/lib/scForcesEngine";
import { CONDUCTOR_LIBRARY, getConductorTypes, getConductorsByType } from "@/lib/conductorLibrary";
import type { ConductorSpec } from "@/lib/conductorLibrary";

interface InputPanelProps {
  inputs: SCInputs;
  updateInput: <K extends keyof SCInputs>(key: K, value: SCInputs[K]) => void;
  updateInputs: (partial: Partial<SCInputs>) => void;
}

// Reusable field component
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

  // Sync from parent when not focused (e.g. reset or external update)
  if (!isFocused && localValue !== String(value)) {
    setLocalValue(String(value));
  }

  return (
    <input
      type="number"
      value={isFocused ? localValue : value}
      step={step}
      min={min}
      disabled={disabled}
      onFocus={() => {
        setIsFocused(true);
        setLocalValue(String(value));
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setLocalValue(raw);
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
          onChange(parsed);
        }
      }}
      onBlur={() => {
        setIsFocused(false);
        const parsed = parseFloat(localValue);
        if (isNaN(parsed)) {
          setLocalValue(String(value)); // revert to last valid value
        } else {
          onChange(parsed);
          setLocalValue(String(parsed));
        }
      }}
      className="w-full bg-[#0a0f18] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
    />
  );
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0a0f18] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none cursor-pointer appearance-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        paddingRight: '28px',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 relative overflow-hidden group hover:border-white/[0.1] transition-all">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-blue-400" />
        <h3 className="text-[13px] font-semibold text-white uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

export function InputPanel({ inputs, updateInput, updateInputs }: InputPanelProps) {
  const [selectedType, setSelectedType] = useState<string>(
    CONDUCTOR_LIBRARY.find(c => c.name === 'Bull')?.type || 'AAC'
  );
  const [selectedName, setSelectedName] = useState('Bull');
  const [isCustom, setIsCustom] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const conductorTypes = getConductorTypes();
  const conductorsForType = getConductorsByType(selectedType);

  const handleTypeChange = (type: string) => {
    if (type === 'Custom') {
      setIsCustom(true);
      return;
    }
    setIsCustom(false);
    setSelectedType(type);
    const first = getConductorsByType(type)[0];
    if (first) {
      setSelectedName(first.name);
      applyConductor(first);
    }
  };

  const handleNameChange = (name: string) => {
    setSelectedName(name);
    const cond = CONDUCTOR_LIBRARY.find(c => c.name === name && c.type === selectedType);
    if (cond) applyConductor(cond);
  };

  const applyConductor = (c: ConductorSpec) => {
    updateInputs({
      conductorName: `${c.type} ${c.name}`,
      As: c.As,
      ds: c.ds,
      mc: c.mc,
      E: c.E,
      sigma_fin: c.sigma_fin,
      cth: c.cth,
    });
  };

  return (
    <div className="space-y-4">
      {/* 2x2 Grid of input cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1 — System */}
        <SectionCard title="System" icon={Zap}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Short circuit current I<sub>k3</sub>" unit="A">
              <NumberInput value={inputs.ik3} onChange={v => updateInput('ik3', v)} step={1000} min={0} />
            </Field>
            <Field label="System X/R ratio">
              <NumberInput value={inputs.xr} onChange={v => updateInput('xr', v)} step={1} min={1} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="System voltage" unit="V">
              <SelectInput
                value={String(inputs.vsys)}
                onChange={v => {
                  const kv = parseFloat(v) / 1000;
                  const { phaseToPhaseClearanceM, suggestedPhaseSpacingM } = autoFillSCForcesFields(kv);
                  updateInputs({
                    vsys: parseFloat(v),
                    clph: phaseToPhaseClearanceM,
                    aph: suggestedPhaseSpacingM,
                  });
                }}
                options={[
                  { value: '132000', label: '132 kV' },
                  { value: '220000', label: '220 kV' },
                  { value: '400000', label: '400 kV' },
                  { value: '765000', label: '765 kV' },
                ]}
              />
            </Field>
            <Field label="System frequency" unit="Hz">
              <SelectInput
                value={String(inputs.freq)}
                onChange={v => updateInput('freq', parseFloat(v))}
                options={[
                  { value: '50', label: '50 Hz' },
                  { value: '60', label: '60 Hz' },
                ]}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phase spacing a<sub>ph</sub>" unit="m">
              <NumberInput value={inputs.aph} onChange={v => updateInput('aph', v)} step={0.5} min={0} />
            </Field>
            <Field label="Phase-phase clearance" unit="m">
              <NumberInput value={inputs.clph} onChange={v => updateInput('clph', v)} step={0.1} min={0} />
            </Field>
          </div>
        </SectionCard>

        {/* Card 2 — Span */}
        <SectionCard title="Span & Structure" icon={Ruler}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Span between supports l" unit="m">
              <NumberInput value={inputs.lspan} onChange={v => updateInput('lspan', v)} step={1} min={1} />
            </Field>
            <Field label="Insulator string length l<sub>i</sub>" unit="m">
              <NumberInput value={inputs.li} onChange={v => updateInput('li', v)} step={0.1} min={0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Girder width D<sub>g</sub>" unit="m">
              <NumberInput value={inputs.dg} onChange={v => updateInput('dg', v)} step={0.1} min={0} />
            </Field>
            <Field label="Stringing height H" unit="m">
              <NumberInput value={inputs.H} onChange={v => updateInput('H', v)} step={0.1} min={0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Static tension F<sub>st</sub>" unit="kg">
              <NumberInput value={inputs.fst_kg} onChange={v => updateInput('fst_kg', v)} step={10} min={0} />
            </Field>
            <Field label="SC duration T<sub>k1</sub>" unit="s">
              <NumberInput value={inputs.tk1} onChange={v => updateInput('tk1', v)} step={0.1} min={0.01} />
            </Field>
          </div>
        </SectionCard>

        {/* Card 3 — Conductor */}
        <SectionCard title="Conductor" icon={Cable}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Conductor type">
              <SelectInput
                value={isCustom ? 'Custom' : selectedType}
                onChange={handleTypeChange}
                options={[
                  ...conductorTypes.map(t => ({ value: t, label: t })),
                  { value: 'Custom', label: 'Custom' },
                ]}
              />
            </Field>
            <Field label="Conductor name">
              {isCustom ? (
                <input
                  type="text"
                  value={inputs.conductorName}
                  onChange={e => updateInput('conductorName', e.target.value)}
                  className="w-full bg-[#0a0f18] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <SelectInput
                  value={selectedName}
                  onChange={handleNameChange}
                  options={conductorsForType.map(c => ({ value: c.name, label: c.name }))}
                />
              )}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sub-conductors n<sub>c</sub>">
              <SelectInput
                value={String(inputs.nc)}
                onChange={v => updateInput('nc', parseInt(v))}
                options={[
                  { value: '1', label: 'Single' },
                  { value: '2', label: 'Twin (2)' },
                  { value: '3', label: 'Triple (3)' },
                  { value: '4', label: 'Quad (4)' },
                  { value: '6', label: 'Hexa (6)' },
                  { value: '8', label: 'Octa (8)' },
                ]}
              />
            </Field>
            <Field label="Sub-conductor spacing a<sub>s</sub>" unit="m">
              <NumberInput value={inputs.as} onChange={v => updateInput('as', v)} step={0.01} min={0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cross-section area A<sub>s</sub>" unit="mm²">
              <NumberInput value={inputs.As} onChange={v => updateInput('As', v)} step={1} min={0} disabled={!isCustom} />
            </Field>
            <Field label="Diameter d<sub>s</sub>" unit="mm">
              <NumberInput value={inputs.ds} onChange={v => updateInput('ds', v)} step={0.01} min={0} disabled={!isCustom} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mass m<sub>c</sub>" unit="kg/m">
              <NumberInput value={inputs.mc} onChange={v => updateInput('mc', v)} step={0.01} min={0} disabled={!isCustom} />
            </Field>
            <Field label="Young&apos;s modulus E" unit="N/mm²">
              <NumberInput value={inputs.E} onChange={v => updateInput('E', v)} step={100} min={0} disabled={!isCustom} />
            </Field>
          </div>
        </SectionCard>

        {/* Card 4 — Spacer & Dropper */}
        <SectionCard title="Spacer & Dropper" icon={Layers}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Spacer span l<sub>s</sub>" unit="m">
              <NumberInput value={inputs.ls} onChange={v => updateInput('ls', v)} step={0.5} min={0.1} />
            </Field>
            <Field label="Spacer mass m<sub>s</sub>" unit="kg">
              <NumberInput value={inputs.ms} onChange={v => updateInput('ms', v)} step={0.1} min={0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Additional dropper mass m<sub>d</sub>" unit="kg">
              <NumberInput value={inputs.md} onChange={v => updateInput('md', v)} step={1} min={0} />
            </Field>
            <Field label="Dropper height h" unit="m">
              <NumberInput value={inputs.h_drop} onChange={v => updateInput('h_drop', v)} step={0.5} min={0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dropper width w" unit="m">
              <NumberInput value={inputs.w_drop} onChange={v => updateInput('w_drop', v)} step={0.1} min={0} />
            </Field>
            <Field label="Dropper plane">
              <SelectInput
                value={inputs.dropperPlane}
                onChange={v => updateInput('dropperPlane', v as 'perpendicular' | 'parallel')}
                options={[
                  { value: 'perpendicular', label: 'Perpendicular' },
                  { value: 'parallel', label: 'Parallel' },
                ]}
              />
            </Field>
          </div>
          <Field label="Spring constant S" unit="N/mm">
            <NumberInput value={inputs.S} onChange={v => updateInput('S', v)} step={10} min={0} />
          </Field>
        </SectionCard>
      </div>

      {/* Advanced Options — collapsible */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center gap-2 px-5 py-3 text-[12px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          Advanced Options
          {showAdvanced ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
        </button>
        {showAdvanced && (
          <div className="px-5 pb-4 border-t border-white/[0.04]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
              <Field label="Lowest σ<sub>fin</sub>" unit="N/m²">
                <NumberInput value={inputs.sigma_fin} onChange={v => updateInput('sigma_fin', v)} />
              </Field>
              <Field label="Thermal coeff c<sub>th</sub>" unit="m⁴/A²s">
                <input
                  type="text"
                  value={inputs.cth.toExponential(2)}
                  onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateInput('cth', v); }}
                  className="w-full bg-[#0a0f18] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </Field>
              <Field label="Gravity g" unit="m/s²">
                <div className="text-sm text-slate-500 font-mono py-2">9.807 (const)</div>
              </Field>
              <Field label="μ₀/2π" unit="H/m">
                <div className="text-sm text-slate-500 font-mono py-2">2×10⁻⁷ (const)</div>
              </Field>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
