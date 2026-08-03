"use client";

import type { SCInputs, SCResults } from "@/lib/scForcesEngine";
import { V2ChartPanel } from "./V2ChartPanel";

interface GraphsPanelProps {
  inputs: SCInputs;
  results: SCResults;
}

export function GraphsPanel({ inputs, results }: GraphsPanelProps) {
  const { aph, as } = inputs;
  const { fed, delta_eff_deg, bh, amin, amin_req, Fst, phi, psi, Tres, Tk1_eff } = results;

  // 1. Conductor Swing Diagram (SVG)
  const maxSwingY = fed + 0.5; // padding
  const swingPoints = [];
  const minAngle = -20;
  const maxAngle = 120;
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const angle = minAngle + (i * (maxAngle - minAngle)) / steps;
    const rad = (angle * Math.PI) / 180;
    const x = fed * Math.sin(rad);
    const y = fed * Math.cos(rad); // downward is positive in SVG
    swingPoints.push({ angle, x, y });
  }

  // Scale functions for SVG (100% width/height viewport)
  // Let's use a fixed viewBox 400x200
  const vW = 400;
  const vH = 200;
  const cx = vW / 2;
  const cy = 20; // top anchor
  const scale = 150 / fed; // scale fed to fit in ~150px height

  const swingPath = swingPoints.map((p, i) => {
    const px = cx + p.x * scale;
    const py = cy + p.y * scale;
    return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
  }).join(' ');

  const effRad = (delta_eff_deg * Math.PI) / 180;
  const effPx = cx + (fed * Math.sin(effRad)) * scale;
  const effPy = cy + (fed * Math.cos(effRad)) * scale;

  // 2. Clearance Envelope (SVG)
  const staticClearance = aph - as;
  const cVW = 300;
  const cVH = 200;
  const maxC = Math.max(staticClearance, amin_req) * 1.2;
  const cScale = (cVH - 40) / maxC;
  
  const barStaticH = staticClearance * cScale;
  const barDynH = amin * cScale;
  const reqY = cVH - 20 - amin_req * cScale;

  // 3. Force Timeline (SVG)
  const tVW = 600;
  const tVH = 200;
  const tSteps = 50;
  const forcePoints = [];
  let maxForceVis = Fst;
  for (let i = 0; i <= tSteps; i++) {
    const t = (i * Tk1_eff) / tSteps;
    const ang = (delta_eff_deg * Math.PI / 180) * (1 - Math.cos(2 * Math.PI * t / Tres));
    const force = Fst * (1 + phi * psi * Math.sin(ang)); // approx visualization
    if (force > maxForceVis) maxForceVis = force;
    forcePoints.push({ t, force });
  }
  
  const tScaleX = (tVW - 40) / Tk1_eff;
  const tScaleY = (tVH - 40) / (maxForceVis * 1.1);

  const forcePath = forcePoints.map((p, i) => {
    const px = 30 + p.t * tScaleX;
    const py = tVH - 20 - p.force * tScaleY;
    return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
  }).join(' ');
  const forceArea = `${forcePath} L ${30 + Tk1_eff * tScaleX} ${tVH - 20} L 30 ${tVH - 20} Z`;

  return (
    <div className="space-y-4">
      {/* IEC Fig.9 — Interactive v2 Chart */}
      <V2ChartPanel inputs={inputs} results={results} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Swing Diagram */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider mb-4">Conductor Swing Diagram</h3>
          <div className="w-full relative bg-[#0a0f18] rounded-lg border border-white/[0.05] overflow-hidden">
            <svg viewBox={`0 0 ${vW} ${vH}`} className="w-full h-auto text-[10px] font-mono fill-slate-400">
              {/* Grid lines */}
              <line x1={cx} y1={cy} x2={cx} y2={vH} stroke="#ffffff" strokeOpacity="0.1" strokeDasharray="4 4" />
              <line x1={0} y1={cy} x2={vW} y2={cy} stroke="#ffffff" strokeOpacity="0.1" />
              {/* Origin anchor */}
              <circle cx={cx} cy={cy} r={3} fill="#ffffff" />
              <text x={cx + 8} y={cy + 4}>Support</text>
              
              {/* Swing Path */}
              <path d={swingPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.5" />
              
              {/* Effective Swing Position */}
              <line x1={cx} y1={cy} x2={effPx} y2={effPy} stroke="#10b981" strokeWidth="1.5" />
              <circle cx={effPx} cy={effPy} r={4} fill="#10b981" />
              
              {/* Static Position */}
              <line x1={cx} y1={cy} x2={cx} y2={cy + fed * scale} stroke="#64748b" strokeWidth="1.5" strokeDasharray="2 2" />
              <circle cx={cx} cy={cy + fed * scale} r={4} fill="#64748b" />
              
              {/* Labels */}
              <text x={effPx + 8} y={effPy + 4} fill="#10b981">δ = {delta_eff_deg.toFixed(1)}°</text>
              <text x={cx + 8} y={cy + fed * scale + 4} fill="#64748b">Static (fed={fed.toFixed(2)}m)</text>
            </svg>
          </div>
        </div>

        {/* Clearance Envelope */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider mb-4">Phase Clearance</h3>
          <div className="w-full relative bg-[#0a0f18] rounded-lg border border-white/[0.05] overflow-hidden">
            <svg viewBox={`0 0 ${cVW} ${cVH}`} className="w-full h-auto text-[10px] font-mono fill-slate-400">
              {/* Axis */}
              <line x1={40} y1={cVH - 20} x2={cVW - 10} y2={cVH - 20} stroke="#ffffff" strokeOpacity="0.2" />
              
              {/* Static Bar */}
              <rect x={80} y={cVH - 20 - barStaticH} width={50} height={barStaticH} fill="#3b82f6" fillOpacity="0.8" rx={2} />
              <text x={105} y={cVH - 25 - barStaticH} textAnchor="middle">{staticClearance.toFixed(2)}m</text>
              <text x={105} y={cVH - 5} textAnchor="middle">Static</text>

              {/* Dynamic Bar */}
              <rect x={170} y={cVH - 20 - barDynH} width={50} height={barDynH} fill={amin >= amin_req ? "#10b981" : "#ef4444"} fillOpacity="0.8" rx={2} />
              <text x={195} y={cVH - 25 - barDynH} textAnchor="middle">{amin.toFixed(2)}m</text>
              <text x={195} y={cVH - 5} textAnchor="middle">At δ</text>

              {/* Requirement Line */}
              <line x1={30} y1={reqY} x2={cVW - 10} y2={reqY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
              <text x={35} y={reqY - 5} fill="#ef4444" fontSize="9">Req: {amin_req.toFixed(2)}m</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Force Timeline */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider mb-4">Force Timeline During Fault (Approximate Envelope)</h3>
        <div className="w-full relative bg-[#0a0f18] rounded-lg border border-white/[0.05] overflow-hidden">
          <svg viewBox={`0 0 ${tVW} ${tVH}`} className="w-full h-auto text-[10px] font-mono fill-slate-400">
            {/* Axis */}
            <line x1={30} y1={tVH - 20} x2={tVW - 10} y2={tVH - 20} stroke="#ffffff" strokeOpacity="0.2" />
            <line x1={30} y1={10} x2={30} y2={tVH - 20} stroke="#ffffff" strokeOpacity="0.2" />
            
            {/* Y Labels */}
            <text x={25} y={15} textAnchor="end">kN</text>
            <text x={25} y={tVH - 20} textAnchor="end">0</text>
            <text x={25} y={tVH - 20 - (maxForceVis/2) * tScaleY} textAnchor="end">{((maxForceVis/2)/1000).toFixed(0)}</text>
            <text x={25} y={tVH - 20 - maxForceVis * tScaleY} textAnchor="end">{(maxForceVis/1000).toFixed(0)}</text>

            {/* X Labels */}
            <text x={30} y={tVH - 5} textAnchor="middle">0s</text>
            <text x={30 + (Tk1_eff/2)*tScaleX} y={tVH - 5} textAnchor="middle">{(Tk1_eff/2).toFixed(2)}s</text>
            <text x={30 + Tk1_eff*tScaleX} y={tVH - 5} textAnchor="middle">{Tk1_eff.toFixed(2)}s</text>

            {/* Force Area & Line */}
            <path d={forceArea} fill="#ef4444" fillOpacity="0.1" />
            <path d={forcePath} fill="none" stroke="#ef4444" strokeWidth="2" />
            
            {/* Static Force Line */}
            <line x1={30} y1={tVH - 20 - Fst * tScaleY} x2={tVW - 10} y2={tVH - 20 - Fst * tScaleY} stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" />
            <text x={tVW - 15} y={tVH - 25 - Fst * tScaleY} fill="#3b82f6" textAnchor="end">Fst</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
