"use client";

import { useState, useMemo } from "react";
import {
  ShieldAlert, Settings2, AlertTriangle, CheckCircle2, XCircle,
  Layers, Compass, Activity, ArrowRight, Sparkles, Check, RotateCcw,
  Sliders, Info, HelpCircle, Eye, EyeOff, ShieldCheck, Zap
} from "lucide-react";
import {
  calculateEarthmat,
  EarthmatInput,
  EarthmatResult,
  MATERIAL_DB,
  MaterialProperties,
} from "@/lib/earthmatEngine";

export function getDefaultEarthmatInputs(): EarthmatInput {
  return {
    Vs: 33.0,
    Isc: 25.76,
    IF: 6.814,
    I_3I0: 6.814,
    tc: 0.5,
    ts: 0.5,
    tf: 0.5,
    L: 70.0,
    B: 70.0,
    rho: 400.0,
    rho_s: 2500.0,
    Hs: 0.102,
    Ta: 40.0,
    materialKey: "CCS_30", // Matches the 8-page PDF sheet default
    conductorShape: "flat",
    conductorWidth: 16.0,
    conductorThickness: 4.0,
    conductorDiameter: 10.0,
    h: 0.5,
    D: 7.0,
    Neb: 20,
    Leb: 0.0, // Sheet baseline has 0m
    Sf: 0.6,
    X_over_R: 15,
    Cp: 1.0,
    reproductionMode: false,
  };
}

// ─── Shared Input Field ───
function InputField({
  label, value, unit, onChange, step = 1, min, max, tooltip
}: {
  label: string;
  value: number;
  unit?: string;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  tooltip?: string;
}) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  if (!isFocused && localValue !== String(value)) {
    setLocalValue(String(value));
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          {label}
        </label>
        {tooltip && (
          <span className="text-[10px] text-muted-foreground/70" title={tooltip}>
            <HelpCircle className="w-3 h-3 inline opacity-60" />
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
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
          className="flex-1 min-w-0 bg-card border border-border rounded-lg px-3 py-2 text-[13px] font-mono text-foreground focus:outline-none focus:border-blue-500/40 transition-colors"
        />
        {unit && <span className="text-[11px] font-semibold text-muted-foreground px-2 py-1 bg-accent/50 rounded-md shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

function Section({
  title, accent, defaultOpen = true, children
}: {
  title: string; accent: "blue" | "amber" | "teal" | "purple"; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accentColors = {
    blue: "text-blue-400 bg-blue-500",
    amber: "text-amber-400 bg-amber-500",
    teal: "text-teal-400 bg-teal-500",
    purple: "text-purple-400 bg-purple-500",
  };

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className={`w-1 h-3 rounded-full ${accentColors[accent].split(" ")[1]} opacity-70`} />
          <span className={`text-[11px] font-bold uppercase tracking-wider ${accentColors[accent].split(" ")[0]}`}>
            {title}
          </span>
        </div>
        <span className="text-xs text-muted-foreground/60">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-3.5">{children}</div>}
    </div>
  );
}

// ─── KPI Card ───
function KPI({
  label, value, unit, status, sublabel, margin
}: {
  label: string; value: string; unit: string; status?: "pass" | "fail" | "warn"; sublabel?: string; margin?: string;
}) {
  const statusColors = {
    pass: "border-emerald-500/30 bg-emerald-500/5",
    fail: "border-red-500/30 bg-red-500/5",
    warn: "border-amber-500/30 bg-amber-500/5",
  };

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${status ? statusColors[status] : "border-border bg-card"}`}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold flex items-center justify-between">
        <span>{label}</span>
        {status && (
          <span className={`flex items-center gap-1 text-[10px] font-semibold ${
            status === "pass" ? "text-emerald-400" : status === "fail" ? "text-red-400" : "text-amber-400"
          }`}>
            {status === "pass" ? <CheckCircle2 className="w-3.5 h-3.5" /> : status === "fail" ? <XCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {status === "pass" ? "Safe" : status === "fail" ? "Not Safe" : "Warning"}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[22px] font-mono font-bold text-foreground tracking-tight">{value}</span>
        <span className="text-[11px] text-muted-foreground font-mono">{unit}</span>
      </div>
      {sublabel && <div className="text-[10px] text-muted-foreground/80 mt-1 font-mono truncate">{sublabel}</div>}
      {margin && <div className={`text-[10px] font-mono mt-1 ${status === 'fail' ? 'text-red-400 font-semibold' : 'text-emerald-400 font-medium'}`}>{margin}</div>}
    </div>
  );
}

// ─── 2D Switchyard SVG Visualizer ───
function Earthmat2DVisualizer({
  inputs, results
}: {
  inputs: EarthmatInput; results: EarthmatResult;
}) {
  const L = inputs.L;
  const B = inputs.B;
  const D = inputs.D;
  const nA = results.step4.nA;
  const nB = results.step4.nB;
  const Neb = inputs.Neb;
  const Leb = inputs.Leb;

  // SVG dimensions
  const svgWidth = 420;
  const svgHeight = 260;
  const pad = 40;

  // Scale grid into viewport
  const maxDim = Math.max(L, B);
  const scale = (Math.min(svgWidth - 2 * pad, svgHeight - 2 * pad)) / maxDim;
  const gridW = L * scale;
  const gridH = B * scale;
  const startX = (svgWidth - gridW) / 2;
  const startY = (svgHeight - gridH) / 2;

  // Compute conductor line positions
  const xLines: number[] = [];
  for (let i = 0; i < nA; i++) {
    const x = startX + (i * (gridW / (nA - 1 || 1)));
    xLines.push(x);
  }
  const yLines: number[] = [];
  for (let j = 0; j < nB; j++) {
    const y = startY + (j * (gridH / (nB - 1 || 1)));
    yLines.push(y);
  }

  // Generate ground rod positions along perimeter and corners
  const rodPoints: { x: number; y: number }[] = [];
  if (Neb > 0) {
    // 4 corners always have rods
    rodPoints.push({ x: startX, y: startY });
    rodPoints.push({ x: startX + gridW, y: startY });
    rodPoints.push({ x: startX + gridW, y: startY + gridH });
    rodPoints.push({ x: startX, y: startY + gridH });

    // Distribute remaining rods along perimeter
    const remaining = Math.max(0, Neb - 4);
    if (remaining > 0) {
      const perSide = Math.ceil(remaining / 4);
      for (let s = 1; s <= perSide && rodPoints.length < Neb; s++) {
        const frac = s / (perSide + 1);
        rodPoints.push({ x: startX + gridW * frac, y: startY });
        rodPoints.push({ x: startX + gridW, y: startY + gridH * frac });
        rodPoints.push({ x: startX + gridW * (1 - frac), y: startY + gridH });
        rodPoints.push({ x: startX, y: startY + gridH * (1 - frac) });
      }
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-blue-400" />
          <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">
            2D Switchyard Earthmat Layout ({L}m × {B}m, Mesh D={D}m)
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-blue-400 inline-block" /> Conductor Grid ({results.step4.Lc}m)
          </span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full inline-block ${Leb > 0 ? "bg-emerald-400" : "bg-red-400"}`} />
            Rods ({Neb} × {Leb}m)
          </span>
        </div>
      </div>

      <div className="w-full flex justify-center items-center py-2 bg-accent/10 rounded-xl border border-border/50">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[520px] h-auto select-none">
          <defs>
            <filter id="rodGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="gridFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Substation Surface Layer / Footprint */}
          <rect
            x={startX}
            y={startY}
            width={gridW}
            height={gridH}
            fill="url(#gridFill)"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="none"
            rx="4"
          />

          {/* Vertical Grid Conductors (Lengthwise) */}
          {xLines.map((x, i) => (
            <line
              key={`x-${i}`}
              x1={x}
              y1={startY}
              x2={x}
              y2={startY + gridH}
              stroke="#60a5fa"
              strokeWidth={i === 0 || i === xLines.length - 1 ? "1.5" : "0.75"}
              strokeOpacity={i === 0 || i === xLines.length - 1 ? 0.9 : 0.6}
            />
          ))}

          {/* Horizontal Grid Conductors (Breadthwise) */}
          {yLines.map((y, j) => (
            <line
              key={`y-${j}`}
              x1={startX}
              y1={y}
              x2={startX + gridW}
              y2={y}
              stroke="#60a5fa"
              strokeWidth={j === 0 || j === yLines.length - 1 ? "1.5" : "0.75"}
              strokeOpacity={j === 0 || j === yLines.length - 1 ? 0.9 : 0.6}
            />
          ))}

          {/* Ground Rod Electrodes */}
          {rodPoints.slice(0, Neb).map((pt, k) => (
            <g key={`rod-${k}`} filter="url(#rodGlow)">
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill={Leb > 0 ? "#10b981" : "#ef4444"}
                stroke="#ffffff"
                strokeWidth="1.2"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="8"
                fill={Leb > 0 ? "#10b981" : "#ef4444"}
                fillOpacity="0.25"
              />
            </g>
          ))}

          {/* Dimension Callouts */}
          <text x={startX + gridW / 2} y={startY - 12} textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">
            Length L = {L} m ({nA} conductors @ {D}m)
          </text>
          <text
            x={startX - 14}
            y={startY + gridH / 2}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="11"
            fontFamily="monospace"
            transform={`rotate(-90 ${startX - 14} ${startY + gridH / 2})`}
          >
            Breadth B = {B} m ({nB} conductors)
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-border text-[11px] font-mono text-muted-foreground">
        <div>Total Length (LT): <span className="text-foreground font-semibold">{results.step4.LT} m</span></div>
        <div>Grid Conductor (Lc): <span className="text-foreground font-semibold">{results.step4.Lc} m</span></div>
        <div>Ground Rods (LR): <span className="text-foreground font-semibold">{results.step4.LR} m</span></div>
        <div>Perimeter (Lp): <span className="text-foreground font-semibold">{results.step4.Lp} m</span></div>
      </div>
    </div>
  );
}

// ─── Center Canvas Main Module ───
export function EarthmatCanvas({
  inputs,
  onApplyOptimization
}: {
  inputs: EarthmatInput;
  onApplyOptimization?: (partial: Partial<EarthmatInput>) => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "steps" | "materials" | "mitigations">("overview");
  const [weightKg, setWeightKg] = useState<50 | 70>(70);

  const results = useMemo(() => calculateEarthmat(inputs), [inputs]);
  const verdict = results.verdict;

  const isTouchSafe = weightKg === 70 ? verdict.touchSafe70 : verdict.touchSafe50;
  const isStepSafe = weightKg === 70 ? verdict.stepSafe70 : verdict.stepSafe50;
  const touchLimit = weightKg === 70 ? results.step3.Etouch70 : results.step3.Etouch50;
  const stepLimit = weightKg === 70 ? results.step3.Estep70 : results.step3.Estep50;
  const touchMargin = touchLimit - results.step8.Em;
  const stepMargin = stepLimit - results.step8.Es;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto pb-24">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-500" />
            Switchyard Earthmat & Grounding Design
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            AC Substation Grounding Design & Safety Verification as per ANSI/IEEE Std 80-2000 & CBIP Publication 223
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl self-start sm:self-auto">
          <span className="text-[11px] text-muted-foreground font-semibold px-2">Body Weight:</span>
          <button
            onClick={() => setWeightKg(50)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
              weightKg === 50 ? "bg-blue-500 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            50 kg (k=0.116)
          </button>
          <button
            onClick={() => setWeightKg(70)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
              weightKg === 70 ? "bg-blue-500 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            70 kg (k=0.157)
          </button>
        </div>
      </div>

      {/* Top Level KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Mesh Touch Potential (Em)"
          value={`${results.step8.Em.toFixed(1)}`}
          unit="V"
          status={isTouchSafe ? "pass" : "fail"}
          sublabel={`Tolerable Etouch = ${touchLimit.toFixed(1)} V`}
          margin={touchMargin >= 0 ? `+${touchMargin.toFixed(1)} V margin` : `${touchMargin.toFixed(1)} V (Exceeded!)`}
        />
        <KPI
          label="Step Potential (Es)"
          value={`${results.step8.Es.toFixed(1)}`}
          unit="V"
          status={isStepSafe ? "pass" : "fail"}
          sublabel={`Tolerable Estep = ${stepLimit.toFixed(1)} V`}
          margin={`+${stepMargin.toFixed(1)} V margin`}
        />
        <KPI
          label="Grid Resistance (Rg)"
          value={`${results.step5.Rg.toFixed(3)}`}
          unit="Ω"
          status={results.step5.isBelowTarget ? "pass" : "warn"}
          sublabel={results.step5.isBelowTarget ? "≤ 1.0 Ω guideline" : "Target ≤ 1.0 Ω (Informational)"}
          margin={`Theoretical: ${results.step5.Rg_theoretical.toFixed(3)} Ω`}
        />
        <KPI
          label="Conductor Thermal Sizing"
          value={`${results.step2.A_selected_mm2}`}
          unit="mm²"
          status={results.step2.isConductorSafe ? "pass" : "fail"}
          sublabel={`Req. A_req = ${results.step2.A_req_mm2.toFixed(1)} mm²`}
          margin={results.step2.isConductorSafe ? "Withstands short circuit" : "Conductor fails thermal check!"}
        />
      </div>

      {/* Active Warnings or Auto-Optimization Banner */}
      {!verdict.overallSafe70 && results.recommendations && results.recommendations.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-red-400 font-bold text-[14px]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Safety Check Failed: Attainable Touch Potential Exceeds Tolerable Limit!</span>
            </div>
            <span className="text-[11px] font-mono font-bold bg-red-500/20 text-red-300 px-2.5 py-1 rounded-md">
              IEEE 80 Clause 16 Action Required
            </span>
          </div>

          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Mesh voltage (<span className="text-foreground font-mono font-bold">{results.step8.Em.toFixed(1)} V</span>) exceeds
            tolerable limit (<span className="text-foreground font-mono font-bold">{results.step3.Etouch70.toFixed(1)} V</span>).
            Select a verified auto-optimization strategy below to instantly bring the grid into safety compliance:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {results.recommendations.map((rec, i) => (
              <div
                key={i}
                className="bg-card/80 border border-border hover:border-blue-500/40 rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-colors"
              >
                <div>
                  <div className="text-[11px] font-bold text-foreground flex items-center justify-between mb-1">
                    <span>Option {i + 1}: {rec.type.replace("_", " ")}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Em ≈ {rec.result.Em.toFixed(0)} V</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{rec.description}</p>
                </div>

                <button
                  onClick={() => onApplyOptimization && onApplyOptimization(rec.parameters)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-[11px] font-bold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Mitigation</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-border space-x-6 text-[13px] font-medium">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "overview" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Grid Layout & Visualizer</span>
        </button>
        <button
          onClick={() => setActiveTab("steps")}
          className={`pb-3 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "steps" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Step-by-Step IEEE 80 Breakdown</span>
        </button>
        <button
          onClick={() => setActiveTab("materials")}
          className={`pb-3 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "materials" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Conductor & Materials DB</span>
        </button>
      </div>

      {/* Tab 1: 2D Visualizer & Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <Earthmat2DVisualizer inputs={inputs} results={results} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Ground Potential Rise & Fault Currents
              </h3>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between py-1.5 border-b border-border font-mono">
                  <span className="text-muted-foreground">Ground Potential Rise (GPR):</span>
                  <span className="text-foreground font-bold">{results.step7.GPR.toFixed(1)} V</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border font-mono">
                  <span className="text-muted-foreground">Symmetrical Grid Current (Ig):</span>
                  <span className="text-foreground">{results.step6.Ig.toFixed(1)} A</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border font-mono">
                  <span className="text-muted-foreground">Maximum Grid Current (IG):</span>
                  <span className="text-foreground font-bold">{results.step6.IG.toFixed(1)} A</span>
                </div>
                <div className="flex justify-between py-1.5 font-mono">
                  <span className="text-muted-foreground">Decrement Factor (Df):</span>
                  <span className="text-foreground">{results.step6.Df.toFixed(3)} (X/R = {inputs.X_over_R})</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                Geometric & Mesh Weighting Factors
              </h3>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between py-1.5 border-b border-border font-mono">
                  <span className="text-muted-foreground">Geometry Factor (n):</span>
                  <span className="text-foreground font-bold">{results.step8.n.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border font-mono">
                  <span className="text-muted-foreground">Geometry Correction (Ki):</span>
                  <span className="text-foreground">{results.step8.Ki.toFixed(3)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border font-mono">
                  <span className="text-muted-foreground">Mesh Spacing Factor (Km):</span>
                  <span className="text-foreground font-bold">{results.step8.Km.toFixed(4)}</span>
                </div>
                <div className="flex justify-between py-1.5 font-mono">
                  <span className="text-muted-foreground">Step Spacing Factor (Ks):</span>
                  <span className="text-foreground font-bold">{results.step8.Ks.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Step-by-Step IEEE 80 Breakdown */}
      {activeTab === "steps" && (
        <div className="space-y-4">
          {[
            {
              num: 2,
              title: "Conductor Thermal Sizing (IEEE 80 Eq. 41)",
              details: [
                `Inferred zero-resistance temp constant K0 = ${results.step2.K0.toFixed(2)} °C`,
                `Thermal capacity per volume TCAP = ${results.step2.TCAP.toFixed(2)} J/(cm³·°C)`,
                `Calculated required area: ${results.step2.Akcmil.toFixed(2)} kcmil (${results.step2.A_req_mm2.toFixed(2)} mm²)`,
                `Selected conductor area: ${results.step2.A_selected_mm2} mm² (${results.step2.isConductorSafe ? "SAFE" : "INADEQUATE"})`,
              ],
            },
            {
              num: 3,
              title: "Tolerable Touch & Step Potentials (IEEE 80 Eq. 27)",
              details: [
                `Surface reflection derating factor Cs = ${results.step3.Cs.toFixed(3)} (Hs = ${inputs.Hs}m, ρ = ${inputs.rho} Ω·m, ρs = ${inputs.rho_s} Ω·m)`,
                `50 kg person: Etouch50 = ${results.step3.Etouch50.toFixed(1)} V, Estep50 = ${results.step3.Estep50.toFixed(1)} V`,
                `70 kg person: Etouch70 = ${results.step3.Etouch70.toFixed(1)} V, Estep70 = ${results.step3.Estep70.toFixed(1)} V`,
              ],
            },
            {
              num: 4,
              title: "Initial Switchyard Grid Geometry",
              details: [
                `Grid Dimensions: L = ${inputs.L} m, B = ${inputs.B} m (Area A = ${results.step4.A_area} m²)`,
                `Conductors: nA = ${results.step4.nA} lengthwise, nB = ${results.step4.nB} breadthwise at D = ${inputs.D} m spacing`,
                `Horizontal grid length Lc = ${results.step4.Lc} m, Ground rods length LR = ${results.step4.LR} m`,
                `Total buried conductor length LT = ${results.step4.LT} m`,
              ],
            },
            {
              num: 5,
              title: "Grid Resistance Determination (Sverak's Formula, IEEE 80 Eq. 52)",
              details: [
                `Term 1 (1/LT) = ${(1 / results.step4.LT).toFixed(6)}`,
                `Term 2 (1/√(20A) * [1 + 1/(1 + h√(20/A))]) = ${results.step5.term2.toFixed(6)}`,
                `Theoretical Sverak Rg = ${results.step5.Rg_theoretical.toFixed(3)} Ω`,
                inputs.reproductionMode && inputs.overrideRg ? `Active (Sheet override) Rg = ${results.step5.Rg.toFixed(3)} Ω` : `Active Rg = ${results.step5.Rg.toFixed(3)} Ω`,
              ],
            },
            {
              num: 6,
              title: "Maximum Grid Current (IG)",
              details: [
                `Division factor Sf = ${inputs.Sf}, Base fault current = ${results.step6.baseCurrentUsed_A} A`,
                `Symmetrical grid current Ig = ${results.step6.Ig.toFixed(1)} A`,
                `Decrement factor Df = ${results.step6.Df.toFixed(3)} (X/R = ${inputs.X_over_R}, tf = ${inputs.tf}s)`,
                `Maximum grid current IG = Cp × Df × Ig = ${results.step6.IG.toFixed(1)} A`,
              ],
            },
            {
              num: 8,
              title: "Mesh (Em) and Step (Es) Potentials (IEEE 80 Eq. 81 & 87)",
              details: [
                `Depth factor Kh = ${results.step8.Kh.toFixed(3)}, Inner conductor factor Kii = ${results.step8.Kii.toFixed(4)}`,
                `Spacing factor for mesh Km = ${results.step8.Km.toFixed(4)}, Step spacing factor Ks = ${results.step8.Ks.toFixed(4)}`,
                `Effective length for mesh Lm = ${results.step8.Lm.toFixed(1)} m, for step Ls = ${results.step8.Ls.toFixed(1)} m`,
                `Mesh Potential Em = (ρ × Km × Ki × IG) / Lm = ${results.step8.Em.toFixed(1)} V`,
                `Step Potential Es = (ρ × Ks × Ki × IG) / Ls = ${results.step8.Es.toFixed(1)} V`,
              ],
            },
          ].map((s) => (
            <div key={s.num} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-[11px] font-mono">
                  {s.num}
                </span>
                <h4 className="text-[13px] font-bold text-foreground">{s.title}</h4>
              </div>
              <ul className="space-y-1.5 pl-7 text-[12px] font-mono text-muted-foreground">
                {s.details.map((d, idx) => (
                  <li key={idx} className="list-disc">{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Materials Database */}
      {activeTab === "materials" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-[13px] font-bold text-foreground">IEEE Std 80-2000 Table 1 — Conductor Materials</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Physical constants and thermal parameters for earthing grid sizing</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] text-left">
              <thead className="bg-accent/30 text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Material</th>
                  <th className="p-3">αr (1/°C)</th>
                  <th className="p-3">ρr (µΩ·cm)</th>
                  <th className="p-3">Tm (°C)</th>
                  <th className="p-3">K0 (°C)</th>
                  <th className="p-3">TCAP (J/cm³·°C)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {Object.entries(MATERIAL_DB).map(([key, mat]) => {
                  const isSelected = key === inputs.materialKey;
                  return (
                    <tr key={key} className={isSelected ? "bg-blue-500/10 text-foreground font-bold" : "text-muted-foreground hover:bg-accent/20"}>
                      <td className="p-3 flex items-center gap-1.5">
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        <span>{mat.name}</span>
                      </td>
                      <td className="p-3">{mat.alpha_r}</td>
                      <td className="p-3">{mat.rho_r}</td>
                      <td className="p-3">{mat.Tm}</td>
                      <td className="p-3">{mat.K0}</td>
                      <td className="p-3">{mat.TCAP}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Right Inspector Panel ───
export function EarthmatInspector({
  inputs,
  onUpdate
}: {
  inputs: EarthmatInput;
  onUpdate: (partial: Partial<EarthmatInput>) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
            <Settings2 className="w-4 h-4 text-blue-400" />
            Earthmat Parameters
          </h3>
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">IEEE Std 80-2000 & CBIP 223</p>
        </div>

        {/* Quick Reset to Sheet Baseline */}
        <button
          onClick={() => onUpdate(getDefaultEarthmatInputs())}
          title="Reset to 230kV PDF Sheet Default"
          className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Section 1: System Data */}
        <Section title="System & Fault Current" accent="blue">
          <InputField label="System Nominal Voltage" value={inputs.Vs} unit="kV" onChange={v => onUpdate({ Vs: v })} step={11} />
          <InputField label="Symmetrical Fault (Isc)" value={inputs.Isc} unit="kA" onChange={v => onUpdate({ Isc: v })} step={1} />
          <InputField label="Ground Fault for Sizing (IF)" value={inputs.IF} unit="kA" onChange={v => onUpdate({ IF: v })} step={0.5} />
          <InputField label="Fault Duration for Sizing (tc)" value={inputs.tc} unit="s" onChange={v => onUpdate({ tc: v })} step={0.1} />
          <InputField label="Shock Duration (ts)" value={inputs.ts} unit="s" onChange={v => onUpdate({ ts: v })} step={0.1} />
          <InputField label="Ambient Temperature (Ta)" value={inputs.Ta} unit="°C" onChange={v => onUpdate({ Ta: v })} step={5} />
        </Section>

        {/* Section 2: Switchyard & Soil */}
        <Section title="Switchyard & Soil Data" accent="teal">
          <InputField label="Switchyard Length (L)" value={inputs.L} unit="m" onChange={v => onUpdate({ L: v })} step={5} />
          <InputField label="Switchyard Breadth (B)" value={inputs.B} unit="m" onChange={v => onUpdate({ B: v })} step={5} />
          <InputField label="Soil Resistivity (ρ)" value={inputs.rho} unit="Ω·m" onChange={v => onUpdate({ rho: v })} step={20} />
          <InputField label="Crushed Rock Resistivity (ρs)" value={inputs.rho_s} unit="Ω·m" onChange={v => onUpdate({ rho_s: v })} step={100} />
          <InputField label="Crushed Rock Thickness (Hs)" value={inputs.Hs} unit="m" onChange={v => onUpdate({ Hs: v })} step={0.02} />
        </Section>

        {/* Section 3: Conductor & Material */}
        <Section title="Conductor & Material" accent="amber">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Conductor Material
            </label>
            <select
              value={inputs.materialKey}
              onChange={e => onUpdate({ materialKey: e.target.value as keyof typeof MATERIAL_DB })}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[12px] font-mono text-foreground focus:outline-none focus:border-blue-500/40 transition-colors"
            >
              {Object.entries(MATERIAL_DB).map(([k, m]) => (
                <option key={k} value={k}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Conductor Shape
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ conductorShape: 'flat' })}
                className={`py-1.5 px-3 text-[11px] font-bold rounded-lg border transition-colors ${
                  inputs.conductorShape === 'flat' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-card border-border text-muted-foreground'
                }`}
              >
                Flat Strip
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ conductorShape: 'round' })}
                className={`py-1.5 px-3 text-[11px] font-bold rounded-lg border transition-colors ${
                  inputs.conductorShape === 'round' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-card border-border text-muted-foreground'
                }`}
              >
                Round Rod
              </button>
            </div>
          </div>

          {inputs.conductorShape === 'flat' ? (
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Width" value={inputs.conductorWidth || 16} unit="mm" onChange={v => onUpdate({ conductorWidth: v })} step={1} />
              <InputField label="Thickness" value={inputs.conductorThickness || 4} unit="mm" onChange={v => onUpdate({ conductorThickness: v })} step={0.5} />
            </div>
          ) : (
            <InputField label="Diameter" value={inputs.conductorDiameter || 10} unit="mm" onChange={v => onUpdate({ conductorDiameter: v })} step={1} />
          )}

          <InputField label="Burial Depth (h)" value={inputs.h} unit="m" onChange={v => onUpdate({ h: v })} step={0.1} />
          <InputField label="Mesh Spacing (D)" value={inputs.D} unit="m" onChange={v => onUpdate({ D: v })} step={0.5} />
        </Section>

        {/* Section 4: Ground Rods */}
        <Section title="Earth Bore Rods" accent="purple">
          <InputField label="Number of Rods (Neb)" value={inputs.Neb} unit="Nos" onChange={v => onUpdate({ Neb: v })} step={4} />
          <InputField label="Rod Length (Leb)" value={inputs.Leb} unit="m" onChange={v => onUpdate({ Leb: v })} step={1} />
          <InputField label="Division Factor (Sf)" value={inputs.Sf} unit="" onChange={v => onUpdate({ Sf: v })} step={0.05} min={0.1} max={1.0} />
          <InputField label="X/R Ratio (for Df)" value={inputs.X_over_R || 15} unit="" onChange={v => onUpdate({ X_over_R: v })} step={1} />
        </Section>
      </div>
    </div>
  );
}
