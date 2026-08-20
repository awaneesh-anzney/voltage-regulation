"use client";

import { useState, useMemo } from "react";
import { ShieldAlert, Settings2, Link2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { calculateCTSizing } from "@/lib/ctSizingEngine";
import type { CTSizingInputs, CTSizingResults } from "@/lib/ctSizingEngine";
import { TrustIndicator } from "@/components/v2/TrustWidgets";

// ─── Shared Components ───
function InputField({ label, value, unit, onChange, linked, linkSource, step = 1 }: {
  label: string; value: number; unit?: string;
  onChange: (v: number) => void; linked?: boolean; linkSource?: string; step?: number;
}) {
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
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 border border-white/10 rounded-md text-[10px] text-teal-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Linked from {linkSource}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step={step}
          value={isFocused ? localValue : value}
          onFocus={() => { setIsFocused(true); setLocalValue(String(value)); }}
          onChange={(e) => {
            setLocalValue(e.target.value);
            const parsed = parseFloat(e.target.value);
            if (!isNaN(parsed)) onChange(parsed);
          }}
          onBlur={() => { setIsFocused(false); setLocalValue(String(value)); }}
          className="flex-1 min-w-0 bg-[#0a0f18] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] font-mono text-white focus:outline-none focus:border-blue-500/30 transition-colors"
        />
        {unit && <span className="text-[11px] font-semibold text-slate-500 px-2 py-1 bg-white/[0.03] rounded-md">{unit}</span>}
      </div>
    </div>
  );
}

function Section({ title, accent, defaultOpen = true, children }: {
  title: string; accent: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accentColors: Record<string, string> = {
    blue: "text-blue-400 border-blue-500/30",
    amber: "text-amber-400 border-amber-500/30",
    teal: "text-teal-400 border-teal-500/30",
    purple: "text-purple-400 border-purple-500/30",
  };

  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-1 h-3 rounded-full border border-white/10 ${accentColors[accent].replace("text-", "bg-").replace("border-", "")} opacity-50`} />
          <span className={`text-[11px] font-bold uppercase tracking-wider ${accentColors[accent].split(" ")[0]}`}>
            {title}
          </span>
        </div>
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Right Inspector Panel ───
export function CTSizingInspector({ inputs, onUpdate, hasLinkedFault }: {
  inputs: CTSizingInputs;
  onUpdate: (partial: Partial<CTSizingInputs>) => void;
  hasLinkedFault?: boolean;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5">
          <Settings2 className="w-4 h-4 text-blue-400" />
          CT Sizing Parameters
        </h3>
        <p className="text-[10px] text-slate-600 mt-0.5">IS 2705 / IEC 61869-2</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <Section title="System Data" accent="blue">
          <InputField label="System Voltage" value={inputs.systemVoltageKv} unit="kV" onChange={v => onUpdate({ systemVoltageKv: v })} linked={hasLinkedFault} linkSource="Fault Analysis" />
          <InputField label="Fault Current (I_f)" value={inputs.faultCurrentA} unit="A" onChange={v => onUpdate({ faultCurrentA: v })} linked={hasLinkedFault} linkSource="Fault Analysis" />
          <InputField label="X/R Ratio" value={inputs.xrRatio} unit="" onChange={v => onUpdate({ xrRatio: v })} linked={hasLinkedFault} linkSource="Fault Analysis" step={0.1} />
        </Section>

        <Section title="CT Specs" accent="amber">
          <InputField label="Primary Current" value={inputs.ctPrimaryA} unit="A" onChange={v => onUpdate({ ctPrimaryA: v })} step={100} />
          <InputField label="Secondary Current" value={inputs.ctSecondaryA} unit="A" onChange={v => onUpdate({ ctSecondaryA: v })} step={1} />
          <InputField label="Secondary Resistance R_ct" value={inputs.ctResistanceOhm} unit="Ω" onChange={v => onUpdate({ ctResistanceOhm: v })} step={0.1} />
        </Section>

        <Section title="Burden Data" accent="teal">
          <InputField label="Lead Length" value={inputs.leadLengthM} unit="m" onChange={v => onUpdate({ leadLengthM: v })} step={10} />
          <InputField label="Lead Cross Section" value={inputs.leadCrossSectionSqmm} unit="mm²" onChange={v => onUpdate({ leadCrossSectionSqmm: v })} step={0.5} />
          <InputField label="Relay Burden" value={inputs.relayBurdenVa} unit="VA" onChange={v => onUpdate({ relayBurdenVa: v })} step={0.5} />
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
    <div className={`rounded-xl border p-4 ${status ? statusColors[status] : "border-white/[0.06] bg-[#111827]"}`}>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[22px] font-mono font-bold text-white">{value}</span>
        <span className="text-[11px] text-slate-500 font-mono">{unit}</span>
      </div>
      {sublabel && <div className="text-[10px] text-slate-600 mt-0.5 font-mono">{sublabel}</div>}
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

// ─── Center Canvas ───
export function CTSizingCanvas({ inputs }: { inputs: CTSizingInputs }) {
  const results = useMemo(() => calculateCTSizing(inputs), [inputs]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-500" />
            CT Sizing Analysis
          </h1>
          <p className="text-[13px] text-slate-400 mt-1.5">
            Class PS protection CT dimensioning and Knee Point Voltage verification
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Req. Knee Point Voltage" value={results.requiredVkpV.toFixed(1)} unit="V" sublabel="Vkp ≥ K × Is × (Rct + Rl + Rb)" />
        <KPI label="Est. Actual Knee Point" value={results.estimatedActualVkpV.toFixed(1)} unit="V" status={results.isAdequate ? 'pass' : 'fail'} sublabel="Based on standard core sizing" />
        <KPI label="Total Burden" value={results.totalBurdenOhm.toFixed(3)} unit="Ω" sublabel="CT + Lead + Relay" />
        <KPI label="Dimensioning Factor" value={results.dimensioningFactorK.toFixed(2)} unit="K" sublabel={`1 + X/R (${inputs.xrRatio})`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 bg-[#0a0f18] border border-white/[0.06] rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <ShieldAlert className="w-32 h-32 text-blue-500" />
          </div>
          <h3 className="text-[13px] font-bold text-white mb-4">Calculation Breakdown</h3>
          <div className="space-y-3 relative z-10">
            <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
              <span className="text-[12px] text-slate-400">Secondary Fault Current (I_s)</span>
              <span className="text-[13px] text-white font-mono">{results.secondaryFaultCurrentA.toFixed(1)} A</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
              <span className="text-[12px] text-slate-400">Lead Resistance (R_l)</span>
              <span className="text-[13px] text-white font-mono">{results.leadResistanceOhm.toFixed(3)} Ω</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
              <span className="text-[12px] text-slate-400">Relay Resistance (R_b)</span>
              <span className="text-[13px] text-white font-mono">{results.relayResistanceOhm.toFixed(3)} Ω</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[12px] text-slate-400">Required ALF</span>
              <span className="text-[13px] text-white font-mono">{results.alfRequired.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#0a0f18] border border-white/[0.06] rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
           {results.isAdequate ? (
             <div className="text-center">
               <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                 <CheckCircle2 className="w-8 h-8 text-emerald-400" />
               </div>
               <h3 className="text-lg font-bold text-white">CT Design Pass</h3>
               <p className="text-[13px] text-slate-400 mt-2 max-w-[250px]">The estimated actual knee point voltage is sufficient to prevent saturation during maximum fault current.</p>
             </div>
           ) : (
             <div className="text-center">
               <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                 <XCircle className="w-8 h-8 text-red-400" />
               </div>
               <h3 className="text-lg font-bold text-white">CT Saturation Risk</h3>
               <p className="text-[13px] text-slate-400 mt-2 max-w-[250px]">The required knee point voltage exceeds the estimated capability. Increase CT core size, reduce lead length, or lower burden.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
