"use client";

import { useState, useMemo } from "react";
import type { SCInputs, SCResults } from "@/lib/scForcesEngine";

interface V2ChartPanelProps {
  inputs: SCInputs;
  results: SCResults;
}

// ────────────────────────────────────────────────────────────
// IEC 60865-1 Fig.9 — Digitised reference data
// v2 (bundle force factor) vs v1 (bundle parameter) for k values
// ────────────────────────────────────────────────────────────
const FIG9_CURVES = [
  {
    k: 1.0, color: "#94a3b8",
    points: [
      { v1: 0, v2: 1.13 }, { v1: 1, v2: 1.00 }, { v1: 2, v2: 1.00 },
      { v1: 3, v2: 0.97 }, { v1: 4, v2: 1.00 }, { v1: 5, v2: 1.00 },
      { v1: 6, v2: 0.97 }, { v1: 7, v2: 0.95 }, { v1: 8, v2: 0.95 },
    ],
  },
  {
    k: 1.2, color: "#cbd5e1",
    points: [
      { v1: 0, v2: 1.15 }, { v1: 1, v2: 1.00 }, { v1: 2, v2: 1.20 },
      { v1: 3, v2: 1.00 }, { v1: 4, v2: 1.13 }, { v1: 5, v2: 1.00 },
      { v1: 6, v2: 1.05 }, { v1: 7, v2: 1.00 }, { v1: 8, v2: 1.00 },
    ],
  },
  {
    k: 1.4, color: "#f472b6",
    points: [
      { v1: 0, v2: 1.30 }, { v1: 1, v2: 1.30 }, { v1: 2, v2: 1.35 },
      { v1: 3, v2: 1.32 }, { v1: 4, v2: 1.30 }, { v1: 5, v2: 1.30 },
      { v1: 6, v2: 1.22 }, { v1: 7, v2: 1.15 }, { v1: 8, v2: 1.10 },
    ],
  },
  {
    k: 1.6, color: "#fb923c",
    points: [
      { v1: 0, v2: 1.45 }, { v1: 1, v2: 1.50 }, { v1: 2, v2: 1.57 },
      { v1: 3, v2: 1.55 }, { v1: 4, v2: 1.53 }, { v1: 5, v2: 1.50 },
      { v1: 6, v2: 1.42 }, { v1: 7, v2: 1.33 }, { v1: 8, v2: 1.22 },
    ],
  },
  {
    k: 1.8, color: "#4ade80",
    points: [
      { v1: 0, v2: 1.60 }, { v1: 1, v2: 1.75 }, { v1: 2, v2: 1.80 },
      { v1: 3, v2: 1.80 }, { v1: 4, v2: 1.75 }, { v1: 5, v2: 1.72 },
      { v1: 6, v2: 1.60 }, { v1: 7, v2: 1.42 }, { v1: 8, v2: 1.22 },
    ],
  },
  {
    k: 2.0, color: "#60a5fa",
    points: [
      { v1: 0, v2: 1.95 }, { v1: 1, v2: 2.05 }, { v1: 2, v2: 2.10 },
      { v1: 3, v2: 2.08 }, { v1: 4, v2: 2.04 }, { v1: 5, v2: 1.98 },
      { v1: 6, v2: 1.92 }, { v1: 7, v2: 1.86 }, { v1: 8, v2: 1.80 },
    ],
  },
];

// ────────────────────────────────────────────────────────────
// Interpolation utilities
// ────────────────────────────────────────────────────────────

/** Linear interpolation along a single k-curve for a given v1 */
function interpCurve(points: { v1: number; v2: number }[], v1: number): number {
  if (v1 <= points[0].v1) return points[0].v2;
  if (v1 >= points[points.length - 1].v1) return points[points.length - 1].v2;
  for (let i = 0; i < points.length - 1; i++) {
    if (v1 >= points[i].v1 && v1 <= points[i + 1].v1) {
      const t = (v1 - points[i].v1) / (points[i + 1].v1 - points[i].v1);
      return points[i].v2 + t * (points[i + 1].v2 - points[i].v2);
    }
  }
  return points[points.length - 1].v2;
}

/** Bilinear interpolation — returns v2 for any (k, v1) pair */
function interpolateV2(k: number, v1: number): number {
  const curves = FIG9_CURVES;
  if (k <= curves[0].k) return interpCurve(curves[0].points, v1);
  if (k >= curves[curves.length - 1].k) return interpCurve(curves[curves.length - 1].points, v1);
  for (let i = 0; i < curves.length - 1; i++) {
    if (k >= curves[i].k && k <= curves[i + 1].k) {
      const lo = interpCurve(curves[i].points, v1);
      const hi = interpCurve(curves[i + 1].points, v1);
      const t = (k - curves[i].k) / (curves[i + 1].k - curves[i].k);
      return lo + t * (hi - lo);
    }
  }
  return interpCurve(curves[curves.length - 1].points, v1);
}

// ────────────────────────────────────────────────────────────
// Chart coordinate system
// ────────────────────────────────────────────────────────────
const VW = 720, VH = 380;
const ML = 58, MR = 15, MT = 20, MB = 42;
const CW = VW - ML - MR, CH = VH - MT - MB;
const V1_MIN = 0, V1_MAX = 8;
const V2_MIN = 0.9, V2_MAX = 2.2;

const toX = (v1: number) => ML + ((v1 - V1_MIN) / (V1_MAX - V1_MIN)) * CW;
const toY = (v2: number) => MT + ((V2_MAX - v2) / (V2_MAX - V2_MIN)) * CH;

const Y_TICKS = [0.9, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2];

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
export function V2ChartPanel({ inputs, results }: V2ChartPanelProps) {
  const engineK = results.k;
  const engineV1 = results.v1;
  const isBundle = inputs.nc > 1;

  // Clamp engine values into slider range
  const kInit = Math.min(2.0, Math.max(1.0, engineK));
  const v1Init = isBundle && isFinite(engineV1) ? Math.min(8, Math.max(0, engineV1)) : 3;

  const [kVal, setKVal] = useState(kInit);
  const [v1Val, setV1Val] = useState(v1Init);

  const v2Interp = useMemo(() => interpolateV2(kVal, v1Val), [kVal, v1Val]);

  // Pre-compute smooth SVG curve paths (static — doesn't depend on sliders)
  const curvePaths = useMemo(() =>
    FIG9_CURVES.map(c => {
      const segs: string[] = [];
      const steps = 160;
      for (let i = 0; i <= steps; i++) {
        const v1 = V1_MIN + (i / steps) * (V1_MAX - V1_MIN);
        const x = toX(v1).toFixed(1);
        const y = toY(interpCurve(c.points, v1)).toFixed(1);
        segs.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
      }
      return { k: c.k, color: c.color, d: segs.join(" ") };
    }), []
  );

  const dotX = toX(v1Val);
  const dotY = toY(v2Interp);
  const labelRight = dotX < ML + CW - 110;

  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 relative overflow-hidden group hover:border-white/[0.1] transition-all">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* ── Header + v2 Readout ── */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider">
            IEC 60865-1 Fig.9 — v₂ Bundle Force Factor
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 max-w-md">
            Interactive chart — drag k and v₁ sliders to read off v₂.
            Curves from digitised IEC Fig.9 reference data.
          </p>
        </div>
        <div className="bg-[#0a0f18] border border-emerald-500/20 rounded-xl px-5 py-3 text-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.06)]">
          <div className="text-[10px] text-emerald-400/70 font-medium tracking-wide">v₂ (read from graph)</div>
          <div className="text-[28px] font-mono font-bold text-emerald-400 leading-tight mt-0.5 tabular-nums">
            {v2Interp.toFixed(4)}
          </div>
          <div className="text-[9px] text-slate-500 mt-1">IEC Fig 9 interpolated</div>
        </div>
      </div>

      {/* ── Sliders ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
        <div>
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-slate-400">
              Peak factor <span className="text-white font-semibold">k</span> (from X/R)
            </span>
            <span className="font-mono text-blue-400 font-medium tabular-nums">{kVal.toFixed(3)}</span>
          </div>
          <input
            type="range" min="1.0" max="2.0" step="0.001" value={kVal}
            onChange={e => setKVal(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="text-[9px] text-slate-600 mt-1 font-mono">
            k = 1.02 + 0.98·exp(−3/XR)
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-slate-400">
              Bundle parameter <span className="text-white font-semibold">v₁</span> (Eq.55)
            </span>
            <span className="font-mono text-blue-400 font-medium tabular-nums">{v1Val.toFixed(3)}</span>
          </div>
          <input
            type="range" min="0" max="8" step="0.01" value={v1Val}
            onChange={e => setV1Val(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="text-[9px] text-slate-600 mt-1 font-mono">
            Engine: v₁ = {isBundle && isFinite(engineV1) ? engineV1.toFixed(3) : "N/A"}, k = {engineK.toFixed(3)}
          </div>
        </div>
      </div>

      {/* ── SVG Chart ── */}
      <div className="w-full bg-[#0a0f18] rounded-lg border border-white/[0.05] overflow-hidden">
        <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto">
          {/* Grid lines */}
          {Array.from({ length: 9 }, (_, i) => i).map(v1 => (
            <line key={`vg${v1}`} x1={toX(v1)} y1={MT} x2={toX(v1)} y2={MT + CH}
              stroke="#fff" strokeOpacity="0.05" />
          ))}
          {Y_TICKS.map(v2 => (
            <line key={`hg${v2}`} x1={ML} y1={toY(v2)} x2={ML + CW} y2={toY(v2)}
              stroke="#fff" strokeOpacity="0.05" />
          ))}

          {/* Axes */}
          <line x1={ML} y1={MT} x2={ML} y2={MT + CH} stroke="#fff" strokeOpacity="0.15" />
          <line x1={ML} y1={MT + CH} x2={ML + CW} y2={MT + CH} stroke="#fff" strokeOpacity="0.15" />

          {/* X-axis labels */}
          {Array.from({ length: 9 }, (_, i) => i).map(v1 => (
            <text key={`xl${v1}`} x={toX(v1)} y={MT + CH + 16}
              textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#64748b">{v1}</text>
          ))}
          <text x={ML + CW / 2} y={MT + CH + 33} textAnchor="middle"
            fontSize="10" fill="#94a3b8" fontWeight="500">
            v₁ (bundle parameter)
          </text>

          {/* Y-axis labels */}
          {Y_TICKS.map(v2 => (
            <text key={`yl${v2}`} x={ML - 6} y={toY(v2) + 3}
              textAnchor="end" fontSize="9" fontFamily="monospace" fill="#64748b">{v2.toFixed(1)}</text>
          ))}
          <text x={14} y={MT + CH / 2} textAnchor="middle"
            fontSize="10" fill="#94a3b8" fontWeight="500"
            transform={`rotate(-90,14,${MT + CH / 2})`}>
            v₂ (bundle force factor)
          </text>

          {/* Curves */}
          {curvePaths.map(c => (
            <path key={c.k} d={c.d}
              fill="none" stroke={c.color} strokeWidth="2" strokeOpacity="0.85" />
          ))}

          {/* Reference dots (red hollow circles) */}
          {FIG9_CURVES.map(c =>
            c.points.map((p, j) => (
              <circle key={`ref${c.k}-${j}`}
                cx={toX(p.v1)} cy={toY(p.v2)} r={3.5}
                fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.55" />
            ))
          )}

          {/* Crosshairs for current point */}
          <line x1={dotX} y1={MT} x2={dotX} y2={MT + CH}
            stroke="#60a5fa" strokeWidth="0.7" opacity="0.2" strokeDasharray="4 3" />
          <line x1={ML} y1={dotY} x2={ML + CW} y2={dotY}
            stroke="#60a5fa" strokeWidth="0.7" opacity="0.2" strokeDasharray="4 3" />

          {/* Blue interpolation dot */}
          <circle cx={dotX} cy={dotY} r={7}
            fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />

          {/* Dot value label */}
          <text
            x={labelRight ? dotX + 13 : dotX - 13}
            y={dotY - 10}
            textAnchor={labelRight ? "start" : "end"}
            fontSize="10" fontFamily="monospace" fontWeight="600" fill="#60a5fa">
            v₂ = {v2Interp.toFixed(4)}
          </text>
        </svg>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 px-1">
        {FIG9_CURVES.map(c => (
          <div key={c.k} className="flex items-center gap-1.5">
            <div className="w-5 h-[3px] rounded-full" style={{ background: c.color }} />
            <span className="text-[10px] text-slate-500 font-mono">k = {c.k.toFixed(1)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-[10px] text-slate-500">your k (interpolated)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-red-500" />
          <span className="text-[10px] text-slate-500">chart reference points</span>
        </div>
      </div>

      {/* ── Info Panel ── */}
      <div className="mt-3 px-4 py-3 rounded-xl bg-slate-800/40 border border-white/[0.04]">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-slate-300">How curves are computed</strong> — Each curve uses
          digitised reference points from the published IEC 60865-1 Fig.9 chart, with
          T<sub>pi</sub> = l<sub>s</sub>/&#8730;(F<sub>st</sub>/(n<sub>c</sub>&#183;m&#8242;<sub>c</sub>)) as
          the sub-conductor half-period. The formula integrates the peak electromagnetic force
          over the DC-offset fault current waveform. Red circles are the digitised reference
          values; the blue dot is your interpolated operating point at
          k&nbsp;=&nbsp;{kVal.toFixed(3)}, v₁&nbsp;=&nbsp;{v1Val.toFixed(3)},
          giving <strong className="text-emerald-400">v₂&nbsp;=&nbsp;{v2Interp.toFixed(4)}</strong>.
          {results.v2 !== null && (
            <span className="text-slate-500">
              {" "}Engine currently uses exactly calculated v₂&nbsp;=&nbsp;{results.v2.toFixed(3)}.
            </span>
          )}
          {!isBundle && (
            <span className="text-amber-400/80">
              {" "}Note: single conductor (n<sub>c</sub>=1) — bundle/pinch forces are not applicable.
            </span>
          )}
        </p>
      </div>

      {/* ── Reset Button ── */}
      <div className="flex justify-end mt-3">
        <button
          onClick={() => { setKVal(kInit); setV1Val(v1Init); }}
          className="px-3 py-1.5 text-[11px] text-slate-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
        >
          Reset to Engine Values (k={engineK.toFixed(3)}, v₁={isBundle && isFinite(engineV1) ? engineV1.toFixed(3) : "N/A"})
        </button>
      </div>
    </div>
  );
}
