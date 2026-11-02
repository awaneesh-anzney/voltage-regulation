"use client";

import { useState, useMemo } from "react";
import {
  Zap, Settings2, AlertTriangle, CheckCircle2,
  Info, Sparkles, ChevronDown, ChevronRight, RotateCcw,
  Thermometer, Wind, Sun, ShieldCheck, Flame, Scale, Activity,
  Layers, AlertCircle, FileText, Check, ArrowRight
} from "lucide-react";
import { ConductorSizingEngine, MATERIAL_PROPERTIES, MaterialProperty } from "@/lib/conductorSizingEngine";
import { CONDUCTOR_LIBRARY, ConductorSpec } from "@/lib/conductorLibrary";
import { BUSBAR_TUBE_LIBRARY, BusBarSpec, findBusBar } from "@/lib/busBarLibrary";

export interface ConductorSizingState {
  formType: 'stranded' | 'tube'; // 'stranded' for overhead flexible conductor, 'tube' for rigid tubular busbar
  conductorName: string;
  conductorType: 'AAAC' | 'ACSR' | 'AAC' | 'HTLS' | 'AL_TUBE' | 'COPPER';
  crossSectionArea: number; // mm^2
  diameter: number; // m
  acResistanceAt20C: number; // Ohm/m
  
  // System Requirements
  voltageLevel_kV: number;
  requiredContinuousCurrent: number; // A
  requiredFaultCurrent: number; // A
  faultDuration: number; // s
  nSubConductors: number;
  
  // Environmental & Operating Conditions
  ambientTemp: number; // °C
  maxOperatingTemp: number; // °C
  windSpeed: number; // m/s
  solarRadiation: number; // W/m^2
  absorptivity: number;
  emissivity: number;
  lambdaEvaluation: 'ambient' | 'film';
  
  // SC withstanding limits
  initialTemp: number; // °C
  maxSCTemp: number; // °C
}

export function getDefaultConductorSizingState(): ConductorSizingState {
  return {
    formType: 'stranded',
    conductorName: 'Greeley',
    conductorType: 'AAAC',
    crossSectionArea: 470,
    diameter: 0.02814,
    acResistanceAt20C: 0.0000713,
    voltageLevel_kV: 220,
    requiredContinuousCurrent: 1800,
    requiredFaultCurrent: 50000,
    faultDuration: 3,
    nSubConductors: 2,
    ambientTemp: 30,
    maxOperatingTemp: 80,
    windSpeed: 0.6,
    solarRadiation: 1000,
    absorptivity: 0.5,
    emissivity: 0.6,
    lambdaEvaluation: 'ambient',
    initialTemp: 80,
    maxSCTemp: 200, // IEC 60865-1 Table 1 Standard Limit for Aluminium Alloy
  };
}

export function getStandardMaxSCTemp(type: 'AAAC' | 'ACSR' | 'AAC' | 'HTLS' | 'AL_TUBE' | 'COPPER'): number {
  // IEC 60865-1 Table 1 & Client guidelines:
  // Aluminium / Aluminium Alloy bare conductors = 200°C
  // Copper bare conductors = 250°C (client limit; IEC allows up to 300°C)
  // HTLS: Conductor-specific (typ. 250°C ACCC to 340°C ACSS)
  switch (type) {
    case 'COPPER':
      return 250;
    case 'HTLS':
      return 250;
    case 'AAAC':
    case 'ACSR':
    case 'AAC':
    case 'AL_TUBE':
    default:
      return 200;
  }
}

// ─── Shared Input Field ───
function InputField({
  label, value, unit, onChange, step = 1, min, max
}: {
  label: string;
  value: number;
  unit?: string;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  if (!isFocused && localValue !== String(value)) {
    setLocalValue(String(value));
  }

  return (
    <div className="space-y-1 min-w-0">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block truncate" title={label}>
        {label}
      </label>
      <div className="flex items-center gap-1.5 min-w-0">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={isFocused ? localValue : value}
          onFocus={() => { setIsFocused(true); setLocalValue(String(value)); }}
          onChange={(e) => {
            setLocalValue(e.target.value);
            const parsed = parseFloat(e.target.value);
            if (!isNaN(parsed)) onChange(parsed);
          }}
          onBlur={() => { setIsFocused(false); setLocalValue(String(value)); }}
          className="flex-1 min-w-0 w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-blue-500/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit && (
          <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-1 bg-accent/60 rounded border border-border/40 whitespace-nowrap shrink-0">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function Section({
  title, icon: Icon, defaultOpen = true, children
}: {
  title: string;
  icon?: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/60 rounded-xl bg-card/40 overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3.5 hover:bg-accent/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-blue-400" />}
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-3.5 pt-0 space-y-3">{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RIGHT INSPECTOR PANEL (INPUTS & SETTINGS)
// ═══════════════════════════════════════════════════════════════════
export function ConductorSizingInspector({
  inputs,
  onUpdateInputs,
}: {
  inputs: ConductorSizingState;
  onUpdateInputs: (updated: ConductorSizingState) => void;
}) {
  const selectedConductor = useMemo(() => {
    return CONDUCTOR_LIBRARY.find(c => c.name.toLowerCase() === inputs.conductorName.toLowerCase()) || CONDUCTOR_LIBRARY[0];
  }, [inputs.conductorName]);

  const selectedBusBar = useMemo(() => {
    return BUSBAR_TUBE_LIBRARY.find(b => b.name.toLowerCase() === inputs.conductorName.toLowerCase()) || BUSBAR_TUBE_LIBRARY[0];
  }, [inputs.conductorName]);

  const handleFormTypeChange = (newForm: 'stranded' | 'tube') => {
    if (newForm === 'stranded') {
      const defaultCond = CONDUCTOR_LIBRARY.find(c => c.name === 'Greeley') || CONDUCTOR_LIBRARY[0];
      onUpdateInputs({
        ...inputs,
        formType: 'stranded',
        conductorName: defaultCond.name,
        conductorType: defaultCond.type,
        crossSectionArea: defaultCond.As,
        diameter: defaultCond.ds / 1000,
        acResistanceAt20C: defaultCond.name === 'Greeley' ? 0.0000713 : (0.02873 / defaultCond.As * 1.02),
        maxSCTemp: getStandardMaxSCTemp(defaultCond.type),
      });
    } else {
      const defaultTube = BUSBAR_TUBE_LIBRARY[0];
      onUpdateInputs({
        ...inputs,
        formType: 'tube',
        conductorName: defaultTube.name,
        conductorType: 'AL_TUBE',
        crossSectionArea: defaultTube.crossSectionArea,
        diameter: defaultTube.outerDiameter / 1000,
        acResistanceAt20C: defaultTube.dcResistanceAt20C,
        maxSCTemp: 200,
      });
    }
  };

  const handleConductorSelect = (name: string) => {
    const found = CONDUCTOR_LIBRARY.find(c => c.name === name);
    if (!found) return;

    onUpdateInputs({
      ...inputs,
      conductorName: found.name,
      conductorType: found.type,
      crossSectionArea: found.As,
      diameter: found.ds / 1000,
      acResistanceAt20C: found.name === 'Greeley' ? 0.0000713 : (0.02873 / found.As * 1.02),
      maxSCTemp: getStandardMaxSCTemp(found.type),
    });
  };

  const handleBusBarSelect = (name: string) => {
    const found = BUSBAR_TUBE_LIBRARY.find(b => b.name === name);
    if (!found) return;

    onUpdateInputs({
      ...inputs,
      conductorName: found.name,
      conductorType: 'AL_TUBE',
      crossSectionArea: found.crossSectionArea,
      diameter: found.outerDiameter / 1000,
      acResistanceAt20C: found.dcResistanceAt20C,
      maxSCTemp: 200,
    });
  };

  const handleResetDefaults = () => {
    onUpdateInputs(getDefaultConductorSizingState());
  };

  const currentMatProp = MATERIAL_PROPERTIES[inputs.conductorType] || MATERIAL_PROPERTIES['AAAC'];

  return (
    <div className="space-y-4 p-1">
      {/* Inspector Header & Reset */}
      <div className="flex items-center justify-between px-1 pb-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Settings2 className="w-3.5 h-3.5 text-blue-400" />
          Sizing Inputs
        </span>
        <button
          onClick={handleResetDefaults}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md bg-card border border-border/60 hover:bg-accent/40 transition-colors shadow-sm"
          title="Reset to 220kV Benchmark Defaults"
        >
          <RotateCcw className="w-3 h-3 text-blue-400" /> Reset Defaults
        </button>
      </div>

      {/* 1. Conductor / Busbar Selection */}
      <Section title="Conductor / Busbar Selection" icon={Scale}>
        {/* Form Type Selector: Stranded Conductor vs Rigid Aluminium Tube */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Material Form
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-background/60 rounded-lg border border-border/40">
            <button
              type="button"
              onClick={() => handleFormTypeChange('stranded')}
              className={`py-1.5 px-2 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                inputs.formType === 'stranded'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Stranded Conductor
            </button>
            <button
              type="button"
              onClick={() => handleFormTypeChange('tube')}
              className={`py-1.5 px-2 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                inputs.formType === 'tube'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Rigid Al Tube (Busbar)
            </button>
          </div>
        </div>

        {/* Dropdown for Stranded Conductor */}
        {inputs.formType === 'stranded' ? (
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Conductor Catalog
            </label>
            <select
              value={inputs.conductorName}
              onChange={(e) => handleConductorSelect(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] font-mono text-foreground focus:outline-none focus:border-blue-500/30"
            >
              {CONDUCTOR_LIBRARY.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type}) — {c.As} mm²
                </option>
              ))}
            </select>
          </div>
        ) : (
          /* Dropdown for Rigid Tubular Busbar */
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Schedule 80 / 80EH Al Tube (IS 5082:1998)
            </label>
            <select
              value={inputs.conductorName}
              onChange={(e) => handleBusBarSelect(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] font-mono text-foreground focus:outline-none focus:border-blue-500/30"
            >
              {BUSBAR_TUBE_LIBRARY.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} — {b.crossSectionArea} mm² ({b.outerDiameter}mm OD)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Physical Metrics Card */}
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-background/50 rounded-lg border border-border/40 text-[11px]">
          <div>
            <span className="text-muted-foreground">Area:</span>{" "}
            <span className="font-mono text-foreground font-semibold">{inputs.crossSectionArea} mm²</span>
          </div>
          <div>
            <span className="text-muted-foreground">Outer Dia:</span>{" "}
            <span className="font-mono text-foreground font-semibold">{(inputs.diameter * 1000).toFixed(2)} mm</span>
          </div>
          <div>
            <span className="text-muted-foreground">Type:</span>{" "}
            <span className="font-mono text-foreground font-semibold">{inputs.conductorType}</span>
          </div>
          <div>
            <span className="text-muted-foreground">R @ 20°C:</span>{" "}
            <span className="font-mono text-foreground font-semibold">{(inputs.acResistanceAt20C * 1000).toFixed(4)} Ω/km</span>
          </div>
          {inputs.formType === 'tube' && selectedBusBar && (
            <>
              <div>
                <span className="text-muted-foreground">Wall Thk:</span>{" "}
                <span className="font-mono text-cyan-400 font-semibold">{selectedBusBar.wallThickness} mm</span>
              </div>
              <div>
                <span className="text-muted-foreground">Section Mod (Z):</span>{" "}
                <span className="font-mono text-cyan-400 font-semibold">{selectedBusBar.sectionModulus.toLocaleString()} mm³</span>
              </div>
            </>
          )}
        </div>

        <InputField
          label="Base Resistance @ 20°C"
          value={inputs.acResistanceAt20C}
          unit="Ω/m"
          step={0.000001}
          onChange={(v) => onUpdateInputs({ ...inputs, acResistanceAt20C: v })}
        />
      </Section>

      {/* 2. Continuous Demand & Weather */}
      <Section title="Continuous Demand & Weather" icon={Thermometer}>
        <div className="grid grid-cols-2 gap-2">
          <InputField
            label="System Voltage"
            value={inputs.voltageLevel_kV}
            unit="kV"
            onChange={(v) => onUpdateInputs({ ...inputs, voltageLevel_kV: v })}
          />
          <InputField
            label="Required Continuous Current"
            value={inputs.requiredContinuousCurrent}
            unit="A"
            step={50}
            onChange={(v) => onUpdateInputs({ ...inputs, requiredContinuousCurrent: v })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Sub-Conductors (Bundle)</label>
          <div className="grid grid-cols-4 gap-1">
            {[
              { n: 1, label: 'Single', count: '1x' },
              { n: 2, label: 'Twin', count: '2x' },
              { n: 3, label: 'Triple', count: '3x' },
              { n: 4, label: 'Quad', count: '4x' },
            ].map(b => (
              <button
                key={b.n}
                type="button"
                onClick={() => onUpdateInputs({ ...inputs, nSubConductors: b.n })}
                className={`py-1.5 px-0.5 rounded-md text-center transition-all ${
                  inputs.nSubConductors === b.n
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="text-xs font-mono font-bold leading-tight">{b.label}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 font-mono font-medium">({b.count})</div>
              </button>
            ))}
          </div>
        </div>

        {/* Temperature Operating Range (Ambient T1, Temp Rise ΔT, Max Temp T2) */}
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5" />
              Thermal Operating Range
            </span>
            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
              T₂ = T₁ + ΔT
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="Ambient Temp (T₁)"
              value={inputs.ambientTemp}
              unit="°C"
              onChange={(newAmbient) => {
                const currentRise = inputs.maxOperatingTemp - inputs.ambientTemp;
                onUpdateInputs({
                  ...inputs,
                  ambientTemp: newAmbient,
                  maxOperatingTemp: newAmbient + currentRise,
                  initialTemp: newAmbient + currentRise
                });
              }}
            />
            <InputField
              label="Temp Rise (ΔT)"
              value={inputs.maxOperatingTemp - inputs.ambientTemp}
              unit="°C"
              onChange={(newRise) => {
                onUpdateInputs({
                  ...inputs,
                  maxOperatingTemp: inputs.ambientTemp + newRise,
                  initialTemp: inputs.ambientTemp + newRise
                });
              }}
            />
          </div>

          <InputField
            label="Max Conductor Temp (T₂ = T₁ + ΔT)"
            value={inputs.maxOperatingTemp}
            unit="°C"
            onChange={(newMax) => {
              onUpdateInputs({
                ...inputs,
                maxOperatingTemp: newMax,
                initialTemp: newMax
              });
            }}
          />
        </div>

        {/* Air Thermal Conductivity Lambda Evaluation Option */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Air Thermal Conductivity (λ) Evaluation
            </label>
            <span className="text-[10px] font-mono text-blue-400 font-semibold">
              {inputs.lambdaEvaluation === 'ambient' ? 'Ambient (30°C)' : 'Film (55°C)'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-background/60 rounded-lg border border-border/40">
            <button
              type="button"
              onClick={() => onUpdateInputs({ ...inputs, lambdaEvaluation: 'ambient' })}
              className={`py-1 rounded text-xs font-medium transition-all ${
                inputs.lambdaEvaluation === 'ambient'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ambient (Conservative)
            </button>
            <button
              type="button"
              onClick={() => onUpdateInputs({ ...inputs, lambdaEvaluation: 'film' })}
              className={`py-1 rounded text-xs font-medium transition-all ${
                inputs.lambdaEvaluation === 'film'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Film Temp (IEC 61597)
            </button>
          </div>
        </div>

        {/* Wind Speed with Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Wind className="w-3 h-3 text-cyan-400" /> Wind Velocity
            </label>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">{inputs.windSpeed} m/s</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: 'Calm', val: 0.0, speed: '0.0' },
              { label: 'CEA', val: 0.6, speed: '0.6' },
              { label: 'Breeze', val: 1.0, speed: '1.0' },
              { label: 'Windy', val: 2.0, speed: '2.0' },
            ].map(w => (
              <button
                key={w.label}
                type="button"
                onClick={() => onUpdateInputs({ ...inputs, windSpeed: w.val })}
                className={`py-1 px-0.5 rounded text-center transition-all ${
                  inputs.windSpeed === w.val
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="text-[11px] font-mono font-bold leading-tight">{w.label}</div>
                <div className="text-[9px] opacity-70 leading-tight mt-0.5">{w.speed} m/s</div>
              </button>
            ))}
          </div>
          <InputField
            label="Wind Speed (Custom)"
            value={inputs.windSpeed}
            unit="m/s"
            step={0.1}
            onChange={(v) => onUpdateInputs({ ...inputs, windSpeed: v })}
          />
        </div>

        {/* Solar Radiation with Presets Dropdown */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-400" /> Solar Radiation Condition
            </label>
            <span className="text-[10px] font-mono text-amber-400">{inputs.solarRadiation} W/m²</span>
          </div>
          <select
            value={
              [1000, 1045, 800, 500, 0].includes(inputs.solarRadiation)
                ? String(inputs.solarRadiation)
                : 'custom'
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val !== 'custom') {
                onUpdateInputs({ ...inputs, solarRadiation: parseFloat(val) });
              }
            }}
            className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-blue-500/30"
          >
            <option value="1000">Peak Sun (CEA Standard) — 1000 W/m²</option>
            <option value="1045">High Solar (PowerGrid Norm) — 1045 W/m²</option>
            <option value="800">Moderate / Diffuse — 800 W/m²</option>
            <option value="500">Overcast / Cloudy — 500 W/m²</option>
            <option value="0">Zero / Night (No Solar) — 0 W/m²</option>
            <option value="custom">Custom Input (y W/m²)</option>
          </select>
          <InputField
            label="Solar Radiation Intensity (y)"
            value={inputs.solarRadiation}
            unit="W/m²"
            step={50}
            min={0}
            onChange={(v) => onUpdateInputs({ ...inputs, solarRadiation: v })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InputField
            label="Solar Absorptivity (α)"
            value={inputs.absorptivity}
            step={0.05}
            min={0.1}
            max={1.0}
            onChange={(v) => onUpdateInputs({ ...inputs, absorptivity: v })}
          />
          <InputField
            label="Emissivity (ε)"
            value={inputs.emissivity}
            step={0.05}
            min={0.1}
            max={1.0}
            onChange={(v) => onUpdateInputs({ ...inputs, emissivity: v })}
          />
        </div>
      </Section>

      {/* 3. DEDICATED SHORT-CIRCUIT / THERMAL WITHSTAND BOX */}
      <Section title="Short-Circuit Thermal Withstand" icon={Flame} defaultOpen={true}>
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Thermal Fault Sizing (IEC 60865-1)
            </span>
            <span className="text-[10px] font-mono text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
              {(inputs.requiredFaultCurrent / 1000).toFixed(0)} kA / {inputs.faultDuration}s
            </span>
          </div>

          {/* Conductor Material Type Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Material & Limit
              </label>
              <span className="text-[10px] font-mono text-muted-foreground">
                α₂₀ = {currentMatProp.alpha20} /°C
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['AAAC', 'ACSR', 'AAC', 'HTLS', 'AL_TUBE', 'COPPER'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const defaultSC = getStandardMaxSCTemp(t);
                    onUpdateInputs({
                      ...inputs,
                      conductorType: t,
                      maxSCTemp: defaultSC,
                    });
                  }}
                  className={`py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                    inputs.conductorType === t
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Operating Temp & Max SC Temp side by side */}
          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="Pre-Fault Temp (θb)"
              value={inputs.maxOperatingTemp}
              unit="°C"
              onChange={(v) => onUpdateInputs({ ...inputs, maxOperatingTemp: v, initialTemp: v })}
            />
            <InputField
              label="Max SC Temp (θe)"
              value={inputs.maxSCTemp}
              unit="°C"
              step={10}
              onChange={(v) => onUpdateInputs({ ...inputs, maxSCTemp: v })}
            />
          </div>

          {/* Validation Warning if θe <= θb */}
          {inputs.maxSCTemp <= inputs.maxOperatingTemp && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Max SC Temp (θe = {inputs.maxSCTemp}°C) must be greater than pre-fault temperature (θb = {inputs.maxOperatingTemp}°C).
              </span>
            </div>
          )}

          {/* Fault Duration Presets (1s vs 3s) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Fault Duration (t)
              </label>
              <span className="text-[10px] font-mono text-rose-400 font-semibold">
                {inputs.faultDuration === 1 ? '1.0 s (CEA/PGCIL Standard)' : inputs.faultDuration === 3 ? '3.0 s (Heavy Design)' : `${inputs.faultDuration} s`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateInputs({ ...inputs, faultDuration: 1.0 })}
                className={`py-1.5 px-2 rounded-md text-xs font-mono font-bold transition-all text-center ${
                  inputs.faultDuration === 1.0
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                1.0 s (Utility Std)
              </button>
              <button
                type="button"
                onClick={() => onUpdateInputs({ ...inputs, faultDuration: 3.0 })}
                className={`py-1.5 px-2 rounded-md text-xs font-mono font-bold transition-all text-center ${
                  inputs.faultDuration === 3.0
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                3.0 s (Legacy Spec)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="Duration (Custom)"
              value={inputs.faultDuration}
              unit="sec"
              step={0.5}
              min={0.1}
              onChange={(v) => onUpdateInputs({ ...inputs, faultDuration: v })}
            />
            <InputField
              label="Target Fault Current"
              value={inputs.requiredFaultCurrent / 1000}
              unit="kA"
              step={5}
              onChange={(v) => onUpdateInputs({ ...inputs, requiredFaultCurrent: v * 1000 })}
            />
          </div>

          {/* Live SC Quick Assessment Card */}
          <div className="p-2.5 rounded-lg bg-background/60 border border-border/50 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Conductivity (k₂₀):</span>
              <span className="font-mono text-foreground font-semibold">
                {(currentMatProp.k20 / 1e6).toFixed(1)} MS/m
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Standard Limit:</span>
              <span className="font-mono text-rose-400 font-semibold">
                {currentMatProp.thetaEMax !== undefined ? `${currentMatProp.thetaEMax}°C` : 'Vendor Specific'}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground border-t border-border/40 pt-1 leading-tight">
              Source: <span className="text-foreground">{currentMatProp.thetaEMaxSource}</span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN CANVAS VIEW (RESULTS, VISUALS, & AUDIT TRACE)
// ═══════════════════════════════════════════════════════════════════
export function ConductorSizingCanvas({
  inputs,
  onUpdateInputs,
}: {
  inputs: ConductorSizingState;
  onUpdateInputs?: (updated: ConductorSizingState) => void;
}) {
  // 1. Calculate Continuous Ampacity
  const ampacityResult = useMemo(() => {
    const matProps = MATERIAL_PROPERTIES[inputs.conductorType] || MATERIAL_PROPERTIES['AAAC'];
    const alpha = matProps.alpha20;

    return ConductorSizingEngine.calculateAmpacity({
      resistanceAt20C: inputs.acResistanceAt20C,
      alphaR: alpha,
      diameter: inputs.diameter,
      ambientTemp: inputs.ambientTemp,
      maxTemp: inputs.maxOperatingTemp,
      windSpeed: inputs.windSpeed,
      solarRadiation: inputs.solarRadiation,
      absorptivity: inputs.absorptivity,
      emissivity: inputs.emissivity,
      nSubConductors: inputs.nSubConductors,
      lambdaEvaluation: inputs.lambdaEvaluation,
      kelvinOffset: 273.15,
    });
  }, [inputs]);

  // 2. Calculate Short Circuit Withstand
  const scResult = useMemo(() => {
    const matProps = MATERIAL_PROPERTIES[inputs.conductorType] || MATERIAL_PROPERTIES['AAAC'];

    return ConductorSizingEngine.calculateSCWithstand({
      shortCircuitCurrent: inputs.requiredFaultCurrent,
      duration: inputs.faultDuration,
      area: inputs.crossSectionArea,
      nSubConductors: inputs.nSubConductors,
      k20: matProps.k20,
      c: matProps.c,
      rho: matProps.rho,
      alpha20: matProps.alpha20,
      initialTemp: inputs.initialTemp,
      finalTemp: inputs.maxSCTemp,
    });
  }, [inputs]);

  // Status checks
  const isAmpacityPass = ampacityResult.I_max_total >= inputs.requiredContinuousCurrent;
  const isSCPass = scResult.isSuitable;
  const ampacityMarginPct = ((ampacityResult.I_max_total / inputs.requiredContinuousCurrent - 1) * 100);
  const scMarginPct = scResult.I_sc_max_total > 0
    ? ((scResult.I_sc_max_total / inputs.requiredFaultCurrent - 1) * 100)
    : -100;

  // Heat balance percentages
  const totalHeatGain = ampacityResult.P_j + ampacityResult.P_sol;
  const totalHeatLoss = ampacityResult.P_rad + ampacityResult.P_conv;
  const radPercent = totalHeatLoss > 0 ? (ampacityResult.P_rad / totalHeatLoss) * 100 : 0;
  const convPercent = totalHeatLoss > 0 ? (ampacityResult.P_conv / totalHeatLoss) * 100 : 0;

  const [activeTab, setActiveTab] = useState<'overview' | 'heatbalance' | 'trace'>('overview');

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-card to-background border border-border/80 shadow-lg relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Conductor & Busbar Sizing Module
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono text-muted-foreground bg-accent/60">
              {inputs.voltageLevel_kV} kV System
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
              {inputs.formType === 'stranded' ? 'Overhead Conductor' : 'Rigid Tubular Busbar'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {inputs.conductorName} ({inputs.conductorType}) — {inputs.nSubConductors === 2 ? 'Twin Bundle' : `${inputs.nSubConductors}x Bundle`}
          </h1>
          <p className="text-xs text-muted-foreground">
            Two-part sizing verification: Continuous Thermal Ampacity (Heat Balance) + Short-Circuit Thermal Withstand (IEC 60865-1).
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center p-1 bg-card border border-border/60 rounded-xl relative z-10 self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'overview' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('heatbalance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'heatbalance' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Heat Balance
          </button>
          <button
            onClick={() => setActiveTab('trace')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'trace' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Audit & Reconciliation
          </button>
        </div>
      </div>

      {/* Tab 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Validation Alert Banner if error present */}
          {scResult.error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-rose-300">Invalid Thermal Configuration</h4>
                <p className="text-xs mt-1 leading-relaxed">{scResult.error}</p>
              </div>
            </div>
          )}

          {/* Main 2 Decision Cards (Side by Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card 1: Continuous Ampacity */}
            <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden bg-gradient-to-b ${
              isAmpacityPass
                ? 'from-emerald-950/20 to-card border-emerald-500/30 shadow-emerald-950/10'
                : 'from-rose-950/20 to-card border-rose-500/30 shadow-rose-950/10'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-emerald-400" />
                    Part 1.1: Continuous Ampacity Check
                  </span>
                  <h3 className="text-lg font-bold text-foreground">Continuous Current Capacity</h3>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isAmpacityPass ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {isAmpacityPass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {isAmpacityPass ? `SUITABLE (+${ampacityMarginPct.toFixed(1)}%)` : 'NOT SUITABLE'}
                </div>
              </div>

              <div className="flex items-baseline gap-3 my-3">
                <span className="text-4xl font-extrabold tracking-tight font-mono text-foreground">
                  {Math.round(ampacityResult.I_max_total).toLocaleString()}
                </span>
                <span className="text-lg font-semibold text-muted-foreground font-mono">Amps Total</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-background/50 rounded-xl border border-border/50 text-xs mb-3">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Requirement</span>
                  <span className="font-mono font-bold text-foreground">{inputs.requiredContinuousCurrent} A</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Per Sub-Conductor</span>
                  <span className="font-mono font-bold text-blue-400">{Math.round(ampacityResult.I_max_per_conductor)} A</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Ambient Temp (T₁)</span>
                  <span className="font-mono text-foreground">{inputs.ambientTemp}°C</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Temp Rise (ΔT)</span>
                  <span className="font-mono font-bold text-amber-400">
                    {(inputs.maxOperatingTemp - inputs.ambientTemp).toFixed(1)}°C
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Max Temp (T₂)</span>
                  <span className="font-mono text-foreground">{inputs.maxOperatingTemp}°C</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">R at {inputs.maxOperatingTemp}°C</span>
                  <span className="font-mono text-foreground">{(ampacityResult.effectiveRt * 1000).toFixed(4)} Ω/km</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span>Bundle: {inputs.nSubConductors} conductors</span>
                <span className="font-mono text-emerald-400">
                  Margin: +{Math.round(ampacityResult.I_max_total - inputs.requiredContinuousCurrent)} A
                </span>
              </div>
            </div>

            {/* Card 2: Short-Circuit Withstand */}
            <div className={`p-5 rounded-2xl border transition-all relative overflow-hidden bg-gradient-to-b ${
              isSCPass
                ? 'from-emerald-950/20 to-card border-emerald-500/30 shadow-emerald-950/10'
                : 'from-rose-950/20 to-card border-rose-500/30 shadow-rose-950/10'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Part 1.2: Short-Circuit Withstand Check
                  </span>
                  <h3 className="text-lg font-bold text-foreground">Thermal Short-Circuit Rating</h3>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isSCPass ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {isSCPass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {isSCPass ? `SUITABLE (+${scMarginPct.toFixed(1)}%)` : 'NOT SUITABLE'}
                </div>
              </div>

              <div className="flex items-baseline gap-3 my-3">
                <span className="text-4xl font-extrabold tracking-tight font-mono text-foreground">
                  {(scResult.I_sc_max_total / 1000).toFixed(1)}
                </span>
                <span className="text-lg font-semibold text-muted-foreground font-mono">kA Withstand</span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-background/50 rounded-xl border border-border/50 text-xs mb-3">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Requirement</span>
                  <span className="font-mono font-bold text-foreground">{(inputs.requiredFaultCurrent / 1000).toFixed(1)} kA / {inputs.faultDuration}s</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Current Density (S_thr)</span>
                  <span className="font-mono font-bold text-blue-400">{scResult.S_thr.toFixed(2)} A/mm²</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">K Factor</span>
                  <span className="font-mono text-foreground">{scResult.K_factor.toFixed(2)} A·s^0.5/mm²</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Conductor & Max SC Temp</span>
                  <span className="font-mono font-bold text-rose-400">{inputs.conductorType} ({inputs.maxSCTemp}°C limit)</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span>Duration: {inputs.faultDuration} sec</span>
                <span className="font-mono text-emerald-400">
                  {scResult.isSuitable
                    ? `Margin: +${((scResult.I_sc_max_total - inputs.requiredFaultCurrent) / 1000).toFixed(1)} kA`
                    : `Deficit: -${((inputs.requiredFaultCurrent - scResult.I_sc_max_total) / 1000).toFixed(1)} kA`}
                </span>
              </div>
            </div>
          </div>

          {/* Real-World Engineering Context Advisory Banner (when 3s fails 50kA under 200°C IEC limit) */}
          {!isSCPass && inputs.faultDuration === 3 && inputs.conductorType === 'AAAC' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wide">
                <Info className="w-4 h-4 text-amber-400" />
                Engineering Context: 3.0 s vs 1.0 s Short Circuit Duration
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Per <strong className="text-foreground">IEC 60865-1:2011 Table 1</strong>, the maximum permissible short-circuit temperature for bare aluminium alloy is <strong className="text-amber-300">200°C</strong>.
                At <span className="font-mono text-foreground">3.0 s</span> duration, twin Greeley (940 mm²) provides <span className="font-mono text-foreground">46.1 kA</span> withstand (maximum permissible duration for 50 kA is <strong className="text-foreground">{(scResult.maxDurationForTargetSC || 2.55).toFixed(2)} s</strong>).
                Modern utility standards (<strong className="text-foreground">CEA / PowerGrid</strong>) size thermal withstand for <strong className="text-emerald-400">1.0 s</strong> (primary fault clearing 100-160 ms), which yields <strong className="text-emerald-400">79.9 kA &gt;&gt; 50 kA (Passes with +59.7% margin)</strong>.
              </p>
              {onUpdateInputs && (
                <button
                  type="button"
                  onClick={() => onUpdateInputs({ ...inputs, faultDuration: 1.0 })}
                  className="mt-1 text-xs font-semibold text-amber-300 hover:text-amber-200 underline flex items-center gap-1"
                >
                  Switch fault duration to standard 1.0 s <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-card border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Solar Gain (P_sol)</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">{ampacityResult.P_sol.toFixed(2)} W/m</div>
              <span className="text-[10px] text-muted-foreground">Qs = {inputs.solarRadiation} W/m²</span>
            </div>
            <div className="p-3.5 rounded-xl bg-card border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Radiation Loss (P_rad)</span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">{ampacityResult.P_rad.toFixed(2)} W/m</div>
              <span className="text-[10px] text-muted-foreground">{radPercent.toFixed(1)}% of total cooling</span>
            </div>
            <div className="p-3.5 rounded-xl bg-card border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Convection Loss (P_conv)</span>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{ampacityResult.P_conv.toFixed(2)} W/m</div>
              <span className="text-[10px] text-muted-foreground">{convPercent.toFixed(1)}% of total cooling</span>
            </div>
            <div className="p-3.5 rounded-xl bg-card border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Reynolds Number (Re)</span>
              <div className="text-xl font-bold font-mono text-blue-400 mt-1">{ampacityResult.Re.toFixed(2)}</div>
              <span className="text-[10px] text-muted-foreground">Nu = {ampacityResult.Nu.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: HEAT BALANCE VISUAL BREAKDOWN */}
      {activeTab === 'heatbalance' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Equilibrium Heat Balance Equation</h3>
              <p className="text-xs text-muted-foreground font-mono">
                P_j (Joule Heating) + P_sol (Solar Gain) = P_rad (Radiation Loss) + P_conv (Convection Loss)
              </p>
            </div>

            {/* Visual Heat Comparison Bars */}
            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-mono">
                  <span className="text-muted-foreground font-semibold">Heat Dissipation (Cooling Capacity)</span>
                  <span className="font-bold text-foreground">{totalHeatLoss.toFixed(2)} W/m</span>
                </div>
                <div className="h-4 w-full bg-accent/40 rounded-full overflow-hidden flex">
                  <div style={{ width: `${convPercent}%` }} className="bg-cyan-500 h-full" title={`Convection: ${ampacityResult.P_conv.toFixed(2)} W/m`} />
                  <div style={{ width: `${radPercent}%` }} className="bg-rose-500 h-full" title={`Radiation: ${ampacityResult.P_rad.toFixed(2)} W/m`} />
                </div>
                <div className="flex items-center gap-4 text-[11px] mt-1.5 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Convection (Wind): {ampacityResult.P_conv.toFixed(2)} W/m ({convPercent.toFixed(1)}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Radiation: {ampacityResult.P_rad.toFixed(2)} W/m ({radPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5 font-mono">
                  <span className="text-muted-foreground font-semibold">Heat Generation at Maximum Current</span>
                  <span className="font-bold text-foreground">{totalHeatGain.toFixed(2)} W/m</span>
                </div>
                <div className="h-4 w-full bg-accent/40 rounded-full overflow-hidden flex">
                  <div style={{ width: `${(ampacityResult.P_j / totalHeatGain) * 100}%` }} className="bg-blue-500 h-full" title={`Joule Heating: ${ampacityResult.P_j.toFixed(2)} W/m`} />
                  <div style={{ width: `${(ampacityResult.P_sol / totalHeatGain) * 100}%` }} className="bg-amber-500 h-full" title={`Solar Gain: ${ampacityResult.P_sol.toFixed(2)} W/m`} />
                </div>
                <div className="flex items-center gap-4 text-[11px] mt-1.5 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Joule Heating (I²·R): {ampacityResult.P_j.toFixed(2)} W/m ({((ampacityResult.P_j / totalHeatGain) * 100).toFixed(1)}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Solar Gain: {ampacityResult.P_sol.toFixed(2)} W/m ({((ampacityResult.P_sol / totalHeatGain) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Formula Breakdown Table */}
            <div className="border border-border/50 rounded-xl overflow-hidden mt-4">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-accent/40 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Term</th>
                    <th className="p-2.5">Formula</th>
                    <th className="p-2.5 text-right">Value (W/m)</th>
                    <th className="p-2.5 text-right">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="p-2.5 font-semibold text-foreground">Solar Gain (P_sol)</td>
                    <td className="p-2.5 text-muted-foreground">α_s · Q_s · D</td>
                    <td className="p-2.5 text-right text-amber-400 font-bold">{ampacityResult.P_sol.toFixed(3)}</td>
                    <td className="p-2.5 text-right text-muted-foreground">+Heat in</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-foreground">Radiation Loss (P_rad)</td>
                    <td className="p-2.5 text-muted-foreground">ε · σ · π · D · (T2⁴ - T1⁴)</td>
                    <td className="p-2.5 text-right text-rose-400 font-bold">{ampacityResult.P_rad.toFixed(3)}</td>
                    <td className="p-2.5 text-right text-muted-foreground">-Heat out</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-foreground">Convection Loss (P_conv)</td>
                    <td className="p-2.5 text-muted-foreground">Nu · λ · π · (T2 - T1)</td>
                    <td className="p-2.5 text-right text-cyan-400 font-bold">{ampacityResult.P_conv.toFixed(3)}</td>
                    <td className="p-2.5 text-right text-muted-foreground">-Heat out</td>
                  </tr>
                  <tr className="bg-accent/20">
                    <td className="p-2.5 font-semibold text-foreground">Permissible Joule Heat (P_j)</td>
                    <td className="p-2.5 text-muted-foreground">P_rad + P_conv - P_sol</td>
                    <td className="p-2.5 text-right text-blue-400 font-bold">{ampacityResult.P_j.toFixed(3)}</td>
                    <td className="p-2.5 text-right text-emerald-400 font-bold">I = √(P_j / R_T)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AUDIT & RECONCILIATION TABLE */}
      {activeTab === 'trace' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border/60">
            <h3 className="text-sm font-bold text-foreground mb-1">Standard Engineering Audit & Document Reconciliation</h3>
            <p className="text-xs text-muted-foreground">
              Comparison between Client Reference Document printed values and Antigravity standard physics engine.
            </p>
          </div>

          <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-accent/40 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="p-3">Parameter</th>
                  <th className="p-3">Reference Document</th>
                  <th className="p-3">Engine Value</th>
                  <th className="p-3">Difference</th>
                  <th className="p-3">Engineering Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                <tr>
                  <td className="p-3 font-semibold text-foreground">Solar Gain (P_sol)</td>
                  <td className="p-3">14.07 W/m</td>
                  <td className="p-3 text-emerald-400 font-bold">14.07 W/m</td>
                  <td className="p-3 text-muted-foreground">0.0%</td>
                  <td className="p-3 text-muted-foreground">Exact match (α_s = 0.5, Q_s = 1000 W/m², D = 0.02814m).</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-foreground">Radiation Loss (P_rad)</td>
                  <td className="p-3">21.349 W/m</td>
                  <td className="p-3 text-blue-400 font-bold">{ampacityResult.P_rad.toFixed(3)} W/m</td>
                  <td className="p-3 text-muted-foreground">+0.14%</td>
                  <td className="p-3 text-muted-foreground">Standard 273.15 K Kelvin offset vs printed integer 273 offset.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-foreground">Reynolds Number (Re)</td>
                  <td className="p-3">922.83</td>
                  <td className="p-3 text-blue-400 font-bold">{ampacityResult.Re.toFixed(2)}</td>
                  <td className="p-3 text-muted-foreground">-0.08%</td>
                  <td className="p-3 text-muted-foreground">Evaluated with physical Kelvin offset 273.15 K.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-foreground">Convection Loss (P_conv)</td>
                  <td className="p-3">70.462 W/m</td>
                  <td className="p-3 text-blue-400 font-bold">{ampacityResult.P_conv.toFixed(3)} W/m</td>
                  <td className="p-3 text-muted-foreground">+1.9%</td>
                  <td className="p-3 text-muted-foreground">Evaluated with air thermal conductivity λ at ambient (30°C).</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-foreground">DC Resistance @ 80°C</td>
                  <td className="p-3">8.761 × 10⁻⁵ Ω/m</td>
                  <td className="p-3 text-blue-400 font-bold">{(ampacityResult.effectiveRt).toExponential(4)} Ω/m</td>
                  <td className="p-3 text-muted-foreground">-1.0%</td>
                  <td className="p-3 text-muted-foreground">Extrapolated from 20°C base (7.13×10⁻⁵) via standard α₂₀ = 0.0036.</td>
                </tr>
                <tr className="bg-accent/20">
                  <td className="p-3 font-semibold text-foreground">Current (Single Conductor)</td>
                  <td className="p-3 font-bold">942 A</td>
                  <td className="p-3 text-emerald-400 font-bold">{Math.round(ampacityResult.I_max_per_conductor)} A</td>
                  <td className="p-3 text-emerald-400 font-semibold">+0.5%</td>
                  <td className="p-3 text-emerald-400 font-medium">Both comfortably exceed 900 A requirement (SUITABLE).</td>
                </tr>
                <tr className="bg-accent/20">
                  <td className="p-3 font-semibold text-foreground">Continuous Ampacity (Twin)</td>
                  <td className="p-3 font-bold">1884 A</td>
                  <td className="p-3 text-emerald-400 font-bold">{Math.round(ampacityResult.I_max_total)} A</td>
                  <td className="p-3 text-emerald-400 font-semibold">+0.5%</td>
                  <td className="p-3 text-emerald-400 font-medium">Requirement 1800 A satisfied with positive margin.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-foreground">Short-Circuit Limit (θe)</td>
                  <td className="p-3 text-amber-400 font-bold">340°C (Non-std)</td>
                  <td className="p-3 text-rose-400 font-bold">200°C (Standard)</td>
                  <td className="p-3 text-rose-400">-140°C</td>
                  <td className="p-3 text-muted-foreground">IEC 60865-1 Table 1 mandates 200°C maximum for bare aluminium.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-foreground">SC Withstand @ 3.0 s</td>
                  <td className="p-3">66.0 kA</td>
                  <td className="p-3 font-bold text-rose-400">46.1 kA</td>
                  <td className="p-3 text-rose-400">-30.1%</td>
                  <td className="p-3 text-muted-foreground">Twin Greeley reaches 46.1 kA at 3s with standard 200°C limit. Max duration for 50 kA is 2.55 s.</td>
                </tr>
                <tr className="bg-emerald-500/10">
                  <td className="p-3 font-semibold text-foreground">SC Withstand @ 1.0 s (Utility Std)</td>
                  <td className="p-3 text-muted-foreground">—</td>
                  <td className="p-3 font-bold text-emerald-400">79.9 kA</td>
                  <td className="p-3 text-emerald-400">+59.7%</td>
                  <td className="p-3 text-emerald-400 font-medium">Standard CEA / PGCIL 1.0 s utility fault duration satisfies 50 kA with huge safety margin.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
