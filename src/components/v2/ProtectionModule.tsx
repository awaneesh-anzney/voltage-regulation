"use client";

import { useState, useMemo } from "react";
import { ShieldAlert, Settings2, Link2, GitCompare, ArrowRight } from "lucide-react";
import { calculateProtection } from "@/lib/protectionEngine";
import type { ProtectionInputs, RelaySettings, IEC_CURVE_TYPE } from "@/lib/protectionEngine";

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

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0a0f18] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] font-mono text-white focus:outline-none focus:border-blue-500/30 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
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
    rose: "text-rose-400 border-rose-500/30",
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

function RelayConfig({ title, relay, onChange, accent }: { title: string, relay: RelaySettings, onChange: (r: RelaySettings) => void, accent: string }) {
  return (
    <Section title={title} accent={accent}>
      <SelectField
        label="IEC Curve Type"
        value={relay.curveType}
        options={[
          { value: 'SI', label: 'Standard Inverse' },
          { value: 'VI', label: 'Very Inverse' },
          { value: 'EI', label: 'Extremely Inverse' }
        ]}
        onChange={v => onChange({ ...relay, curveType: v as IEC_CURVE_TYPE })}
      />
      <InputField label="Plug Setting Multiplier (PSM)" value={relay.psm} unit="A" onChange={v => onChange({ ...relay, psm: v })} step={50} />
      <InputField label="Time Multiplier Setting (TMS)" value={relay.tms} unit="" onChange={v => onChange({ ...relay, tms: v })} step={0.05} />
    </Section>
  );
}

// ─── Right Inspector Panel ───
export function ProtectionInspector({ inputs, onUpdate, hasLinkedFault }: {
  inputs: ProtectionInputs;
  onUpdate: (partial: Partial<ProtectionInputs>) => void;
  hasLinkedFault?: boolean;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-blue-400" />
          Protection Parameters
        </h3>
        <p className="text-[10px] text-slate-600 mt-0.5">IEC 60255 IDMT Curves</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <Section title="System Fault" accent="rose">
          <InputField label="Fault Current (I_f)" value={inputs.faultCurrentA} unit="A" onChange={v => onUpdate({ faultCurrentA: v })} linked={hasLinkedFault} linkSource="Fault Analysis" step={100} />
        </Section>
        <RelayConfig title="Upstream Relay (Backup)" relay={inputs.upstreamRelay} onChange={r => onUpdate({ upstreamRelay: r })} accent="blue" />
        <RelayConfig title="Downstream Relay (Primary)" relay={inputs.downstreamRelay} onChange={r => onUpdate({ downstreamRelay: r })} accent="teal" />
      </div>
    </div>
  );
}

// ─── Center Canvas ───
export function ProtectionCanvas({ inputs }: { inputs: ProtectionInputs }) {
  const results = useMemo(() => calculateProtection(inputs), [inputs]);

  // Log-Log Plot logic
  const minI = Math.min(inputs.upstreamRelay.psm, inputs.downstreamRelay.psm) * 0.8;
  const maxI = Math.max(inputs.faultCurrentA * 1.5, inputs.upstreamRelay.psm * 20);
  const minT = 0.01;
  const maxT = 100;

  const w = 600;
  const h = 400;

  const getX = (I: number) => {
    const minLog = Math.log10(minI);
    const maxLog = Math.log10(maxI);
    return ((Math.log10(Math.max(I, minI)) - minLog) / (maxLog - minLog)) * w;
  };

  const getY = (T: number) => {
    const minLog = Math.log10(minT);
    const maxLog = Math.log10(maxT);
    return h - ((Math.log10(Math.max(T, minT)) - minLog) / (maxLog - minLog)) * h;
  };

  const toPath = (points: {currentA: number, timeS: number}[]) => {
    if (points.length === 0) return "";
    return "M " + points.map(p => `${getX(p.currentA)},${getY(p.timeS)}`).join(" L ");
  };

  const upPath = toPath(results.upstream.curvePoints);
  const downPath = toPath(results.downstream.curvePoints);
  const faultX = getX(inputs.faultCurrentA);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-blue-500" />
            Protection Coordination (TCC)
          </h1>
          <p className="text-[13px] text-slate-400 mt-1.5">
            Time-Current Characteristic log-log curves for discrimination margin
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-[#0a0f18] border border-white/[0.06] rounded-xl flex flex-col items-center justify-center">
           <div className="text-[10px] text-teal-400 uppercase tracking-wider font-bold mb-1">Downstream Trip</div>
           <div className="text-[22px] font-mono font-bold text-white">{results.downstream.tripTimeS === Infinity ? "No Trip" : results.downstream.tripTimeS.toFixed(3)} s</div>
        </div>
        <div className="p-4 bg-[#0a0f18] border border-white/[0.06] rounded-xl flex flex-col items-center justify-center">
           <div className="text-[10px] text-blue-400 uppercase tracking-wider font-bold mb-1">Upstream Trip</div>
           <div className="text-[22px] font-mono font-bold text-white">{results.upstream.tripTimeS === Infinity ? "No Trip" : results.upstream.tripTimeS.toFixed(3)} s</div>
        </div>
        <div className={`p-4 border rounded-xl flex flex-col items-center justify-center ${results.isCoordinated ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
           <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Discrimination Margin (Δt)</div>
           <div className="text-[22px] font-mono font-bold text-white">{results.discriminationMarginS.toFixed(3)} s</div>
           <div className={`text-[10px] font-semibold mt-1 ${results.isCoordinated ? 'text-emerald-400' : 'text-red-400'}`}>
             {results.isCoordinated ? 'Coordinated' : 'Risk of miscoordination'}
           </div>
        </div>
      </div>

      {/* TCC Graph */}
      <div className="p-4 bg-[#0a0f18] border border-white/[0.06] rounded-xl">
        <div className="flex gap-4 mb-4 justify-center">
          <div className="flex items-center gap-2"><div className="w-3 h-1 bg-teal-500" /> <span className="text-xs text-slate-400">Downstream (Primary)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-1 bg-blue-500" /> <span className="text-xs text-slate-400">Upstream (Backup)</span></div>
          <div className="flex items-center gap-2"><div className="w-1 h-3 border-l border-dashed border-rose-500" /> <span className="text-xs text-slate-400">Fault Current</span></div>
        </div>

        <div className="relative w-full max-w-[600px] mx-auto aspect-[3/2] bg-[#05080f] border-b border-l border-white/10 p-2">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
             {/* Log-Log grid lines (Simplified for UI) */}
             {[10, 100, 1000, 10000, 100000].filter(x => x > minI && x < maxI).map(x => (
               <g key={`x-${x}`}>
                 <line x1={getX(x)} y1={0} x2={getX(x)} y2={h} stroke="rgba(255,255,255,0.05)" />
                 <text x={getX(x)} y={h + 15} fontSize="10" fill="#64748b" textAnchor="middle">{x}</text>
               </g>
             ))}
             {[0.01, 0.1, 1, 10, 100].filter(y => y > minT && y < maxT).map(y => (
               <g key={`y-${y}`}>
                 <line x1={0} y1={getY(y)} x2={w} y2={getY(y)} stroke="rgba(255,255,255,0.05)" />
                 <text x={-5} y={getY(y) + 3} fontSize="10" fill="#64748b" textAnchor="end">{y}</text>
               </g>
             ))}

             {/* Fault Current Line */}
             {inputs.faultCurrentA > minI && inputs.faultCurrentA < maxI && (
               <line x1={faultX} y1={0} x2={faultX} y2={h} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={2} />
             )}

             {/* Curves */}
             <path d={upPath} fill="none" stroke="#3b82f6" strokeWidth={3} className="drop-shadow-md" />
             <path d={downPath} fill="none" stroke="#14b8a6" strokeWidth={3} className="drop-shadow-md" />
             
             {/* Intersection Points */}
             {inputs.faultCurrentA > minI && inputs.faultCurrentA < maxI && (
               <>
                 {results.upstream.tripTimeS !== Infinity && <circle cx={faultX} cy={getY(results.upstream.tripTimeS)} r={4} fill="#3b82f6" />}
                 {results.downstream.tripTimeS !== Infinity && <circle cx={faultX} cy={getY(results.downstream.tripTimeS)} r={4} fill="#14b8a6" />}
               </>
             )}
          </svg>
        </div>
        <div className="text-center mt-6 text-[11px] text-slate-500 uppercase tracking-widest">Current (A)</div>
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -rotate-90 origin-center text-[11px] text-slate-500 uppercase tracking-widest hidden md:block">Time (s)</div>
      </div>
    </div>
  );
}
