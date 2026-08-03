"use client";

import { useState, useMemo } from "react";
import { computeSCForces } from "@/lib/scForcesEngine";
import type { SCInputs, SCResults } from "@/lib/scForcesEngine";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface WhatIfPanelProps {
  baseInputs: SCInputs;
  baseResults: SCResults;
}

export function WhatIfPanel({ baseInputs, baseResults }: WhatIfPanelProps) {
  const [ik3, setIk3] = useState(baseInputs.ik3);
  const [lspan, setLspan] = useState(baseInputs.lspan);
  const [aph, setAph] = useState(baseInputs.aph);
  const [nc, setNc] = useState(baseInputs.nc);

  const whatIfInputs: SCInputs = { ...baseInputs, ik3, lspan, aph, nc };
  const whatIfResults = useMemo(() => computeSCForces(whatIfInputs), [whatIfInputs]);

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sliders Panel */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 space-y-6">
          <h3 className="text-[13px] font-semibold text-white uppercase tracking-wider mb-2">Parametric Modifiers</h3>
          
          <div>
            <div className="flex justify-between text-[12px] text-slate-300 mb-2">
              <span>Short Circuit Current (I<sub>k3</sub>)</span>
              <span className="font-mono text-white">{(ik3 / 1000).toFixed(1)} kA</span>
            </div>
            <input 
              type="range" min="20000" max="100000" step="1000" 
              value={ik3} onChange={e => setIk3(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-[12px] text-slate-300 mb-2">
              <span>Span Length (l)</span>
              <span className="font-mono text-white">{lspan} m</span>
            </div>
            <input 
              type="range" min="30" max="120" step="1" 
              value={lspan} onChange={e => setLspan(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-[12px] text-slate-300 mb-2">
              <span>Phase Spacing (a<sub>ph</sub>)</span>
              <span className="font-mono text-white">{aph.toFixed(1)} m</span>
            </div>
            <input 
              type="range" min="3" max="12" step="0.5" 
              value={aph} onChange={e => setAph(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-[12px] text-slate-300 mb-2">
              <span>Bundle Sub-conductors (n<sub>c</sub>)</span>
              <span className="font-mono text-white">{nc}</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setNc(n)}
                  className={`flex-1 py-1.5 text-[12px] font-medium rounded-lg border transition-all ${
                    nc === n ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-transparent border-white/10 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  {n === 1 ? 'Single' : n === 2 ? 'Twin' : n === 3 ? 'Tri' : 'Quad'}
                </button>
              ))}
            </div>
          </div>
          
          <button onClick={() => {
            setIk3(baseInputs.ik3);
            setLspan(baseInputs.lspan);
            setAph(baseInputs.aph);
            setNc(baseInputs.nc);
          }} className="w-full py-2 text-[12px] text-slate-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all">
            Reset to Base Parameters
          </button>
        </div>

        {/* Results Panel */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 flex flex-col">
          <h3 className="text-[13px] font-semibold text-white uppercase tracking-wider mb-4">Live Results Comparison</h3>
          
          <div className="space-y-4 flex-1">
            <ResultRow label="Max Tensile Force (Ftd)" base={baseResults.Ftd} whatIf={whatIfResults.Ftd} unit="kN" />
            <ResultRow label="Drop Force (Ffd)" base={baseResults.Ffd} whatIf={whatIfResults.Ffd} unit="kN" />
            <ResultRow 
              label="Pinch Force (Fpi)" 
              base={baseResults.Fpi} 
              whatIf={whatIfResults.Fpi} 
              unit="kN" 
            />
            
            <div className="pt-4 border-t border-white/[0.06]" />
            <ResultRow label="Governing Force" base={baseResults.Fmax} whatIf={whatIfResults.Fmax} unit="kN" highlight />
            
            <div className="pt-4 border-t border-white/[0.06]" />
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-slate-400">Clearance Status</span>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-500">Base</span>
                  <StatusBadge ok={baseResults.clCheck} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-500">What-If</span>
                  <StatusBadge ok={whatIfResults.clCheck} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ label, base, whatIf, unit, highlight }: { label: string, base: number, whatIf: number, unit: string, highlight?: boolean }) {
  const diff = whatIf - base;
  const pct = base > 0 ? (diff / base) * 100 : 0;
  const color = highlight ? "text-white font-semibold" : "text-white";
  
  return (
    <div className="flex justify-between items-center text-[13px]">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-4 font-mono">
        <div className="flex flex-col items-end w-20">
          <span className="text-[10px] text-slate-500 font-sans">Base</span>
          <span className="text-slate-300">{(base / 1000).toFixed(1)}</span>
        </div>
        <div className="flex flex-col items-end w-24">
          <span className="text-[10px] text-slate-500 font-sans">What-If</span>
          <div className="flex items-center gap-2">
            {Math.abs(diff) > 1 && (
              <span className={`text-[10px] ${diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {diff > 0 ? '+' : ''}{pct.toFixed(0)}%
              </span>
            )}
            <span className={color}>{(whatIf / 1000).toFixed(1)} {unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
      ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
    }`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {ok ? 'PASS' : 'FAIL'}
    </div>
  );
}
