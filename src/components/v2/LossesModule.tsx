"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DollarSign, Settings2, ChevronDown, ChevronRight, Play, Plus, Trash2,
  TrendingDown, TrendingUp, Zap, BarChart3, AlertTriangle, IndianRupee
} from "lucide-react";
import {
  calculateRegulation, findOptimalTap, runOptimizer, CONDUCTORS,
  type SegmentInput, type CalculationOutput, type OptimalConfig
} from "@/lib/gridCalculations";

// ─── Smart Input ───
function InputField({ label, value, unit, onChange, step }: {
  label: string; value: number; unit?: string;
  onChange: (v: number) => void; step?: number;
}) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);
  if (!isFocused && localValue !== String(value)) setLocalValue(String(value));

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={isFocused ? localValue : value}
          step={step}
          onFocus={() => { setIsFocused(true); setLocalValue(String(value)); }}
          onChange={(e) => { setLocalValue(e.target.value); const p = parseFloat(e.target.value); if (!isNaN(p)) onChange(p); }}
          onBlur={() => { setIsFocused(false); const p = parseFloat(localValue); if (isNaN(p)) setLocalValue(String(value)); else { onChange(p); setLocalValue(String(p)); } }}
          className="flex-1 bg-[#0a0f18] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white font-mono focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 transition-all"
        />
        {unit && <span className="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/15 text-[10px] text-cyan-400 font-semibold shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

function Section({ title, accent, defaultOpen, children }: {
  title: string; accent: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const accentColors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/8 border-blue-500/15",
    amber: "text-amber-400 bg-amber-500/8 border-amber-500/15",
    green: "text-emerald-400 bg-emerald-500/8 border-emerald-500/15",
  };
  return (
    <div className="border-b border-white/[0.04] last:border-0">
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer hover:bg-white/[0.02] ${accentColors[accent] || accentColors.blue}`}>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>{title}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── State types ───
export interface LossesInputs {
  segments: SegmentInput[];
  voltageKv: number;
  conductor: string;
  powerFactor: number;
  regLimit: number;
  oltcPct: number;
  statcomEnabled: boolean;
  statcomBus: string;
  statcomMvar: number;
  energyRate_Rs_kWh: number;
  operatingHours_yr: number;
}

export function getDefaultLossesInputs(): LossesInputs {
  return {
    segments: [
      { km: 12, mva: 18, df: 1.0, label: "S1" },
      { km: 8, mva: 12, df: 1.0, label: "S2" },
      { km: 5, mva: 6, df: 1.0, label: "S3" },
    ],
    voltageKv: 132,
    conductor: "panther",
    powerFactor: 0.92,
    regLimit: 5,
    oltcPct: 0,
    statcomEnabled: false,
    statcomBus: "0",
    statcomMvar: 0,
    energyRate_Rs_kWh: 5.5,
    operatingHours_yr: 8000,
  };
}

// ─── Inspector ───
export function LossesInspector({ inputs, onUpdate }: {
  inputs: LossesInputs;
  onUpdate: (partial: Partial<LossesInputs>) => void;
}) {
  const conductorKeys = Object.keys(CONDUCTORS);

  const addSegment = () => {
    const segs = [...inputs.segments, { km: 5, mva: 5, df: 1.0, label: `S${inputs.segments.length + 1}` }];
    onUpdate({ segments: segs });
  };
  const removeSegment = (i: number) => {
    const segs = inputs.segments.filter((_, idx) => idx !== i);
    onUpdate({ segments: segs });
  };
  const updateSegment = (i: number, partial: Partial<SegmentInput>) => {
    const segs = inputs.segments.map((s, idx) => idx === i ? { ...s, ...partial } : s);
    onUpdate({ segments: segs });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5">
          <Settings2 className="w-4 h-4 text-amber-400" />
          Losses & ROI Parameters
        </h3>
        <p className="text-[10px] text-slate-600 mt-0.5">Voltage Regulation & Loss Analysis</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <Section title="System" accent="blue" defaultOpen>
          <InputField label="Nominal Voltage" value={inputs.voltageKv} unit="kV" onChange={(v) => onUpdate({ voltageKv: v })} />
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Conductor</label>
            <select value={inputs.conductor} onChange={(e) => onUpdate({ conductor: e.target.value })}
              className="w-full bg-[#0a0f18] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white cursor-pointer">
              {conductorKeys.map(k => <option key={k} value={k}>{CONDUCTORS[k].name}</option>)}
            </select>
          </div>
          <InputField label="Power Factor" value={inputs.powerFactor} onChange={(v) => onUpdate({ powerFactor: v })} step={0.01} />
          <InputField label="Regulation Limit" value={inputs.regLimit} unit="%" onChange={(v) => onUpdate({ regLimit: v })} />
          <InputField label="OLTC Tap %" value={inputs.oltcPct} unit="%" onChange={(v) => onUpdate({ oltcPct: v })} step={1.25} />
        </Section>

        <Section title={`Segments (${inputs.segments.length})`} accent="amber" defaultOpen>
          {inputs.segments.map((seg, i) => (
            <div key={i} className="bg-[#0a0f18] rounded-xl p-3 border border-white/[0.04] space-y-2">
              <div className="flex items-center justify-between">
                <input value={seg.label} onChange={(e) => updateSegment(i, { label: e.target.value })}
                  className="bg-transparent text-[12px] text-white font-semibold focus:outline-none w-16" />
                {inputs.segments.length > 1 && (
                  <button onClick={() => removeSegment(i)} className="p-1 rounded-md hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <InputField label="Length" value={seg.km} unit="km" onChange={(v) => updateSegment(i, { km: v })} />
                <InputField label="Load" value={seg.mva} unit="MVA" onChange={(v) => updateSegment(i, { mva: v })} />
                <InputField label="DF" value={seg.df} onChange={(v) => updateSegment(i, { df: v })} step={0.1} />
              </div>
            </div>
          ))}
          <button onClick={addSegment}
            className="w-full py-2 rounded-lg border border-dashed border-white/[0.1] text-[11px] text-slate-500 hover:text-white hover:border-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5">
            <Plus className="w-3 h-3" /> Add Segment
          </button>
        </Section>

        <Section title="ROI Parameters" accent="green" defaultOpen={false}>
          <InputField label="Energy Rate" value={inputs.energyRate_Rs_kWh} unit="₹/kWh" onChange={(v) => onUpdate({ energyRate_Rs_kWh: v })} step={0.5} />
          <InputField label="Operating Hours" value={inputs.operatingHours_yr} unit="hrs/yr" onChange={(v) => onUpdate({ operatingHours_yr: v })} />
        </Section>
      </div>
    </div>
  );
}

// ─── Canvas ───
export function LossesCanvas({ inputs }: { inputs: LossesInputs }) {
  const cond = CONDUCTORS[inputs.conductor];
  const R = cond?.r ?? 0.161;
  const X = cond?.x ?? 0.360;

  const calcResult = useMemo(() =>
    calculateRegulation(inputs.segments, inputs.voltageKv, R, X, inputs.powerFactor, inputs.regLimit, inputs.oltcPct, inputs.statcomEnabled, inputs.statcomBus, inputs.statcomMvar),
    [inputs, R, X]
  );

  const optTap = useMemo(() => findOptimalTap(inputs.segments, inputs.voltageKv, R, X, inputs.powerFactor, inputs.regLimit), [inputs, R, X]);

  const optConfig = useMemo(() =>
    runOptimizer(inputs.segments, inputs.voltageKv, inputs.powerFactor, inputs.regLimit, inputs.conductor),
    [inputs]
  );

  // ROI calc
  const annualLossEnergy_kWh = calcResult.totalActiveLoss * inputs.operatingHours_yr * 1000;
  const annualLossCost_Rs = annualLossEnergy_kWh * inputs.energyRate_Rs_kWh;
  const annualLossCost_Lakhs = annualLossCost_Rs / 100000;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto pb-20">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-amber-500" />
          Losses & ROI Analysis
        </h1>
        <p className="text-[13px] text-slate-400 mt-1.5 max-w-2xl">
          Technical loss quantification with financial impact assessment. Includes OLTC optimization and STATCOM sizing recommendations.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Voltage Regulation</div>
          <div className={`text-[22px] font-mono font-bold mt-1 ${calcResult.cumulativeReg > inputs.regLimit ? 'text-red-400' : 'text-emerald-400'}`}>
            {calcResult.cumulativeReg.toFixed(2)}<span className="text-[13px] text-slate-500 ml-1">%</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Limit: {inputs.regLimit}%</div>
        </div>
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Active Losses</div>
          <div className="text-[22px] font-mono font-bold mt-1 text-amber-400">{calcResult.totalActiveLoss.toFixed(2)}<span className="text-[13px] text-slate-500 ml-1">MW</span></div>
        </div>
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Reactive Losses</div>
          <div className="text-[22px] font-mono font-bold mt-1 text-blue-400">{calcResult.totalReactiveLoss.toFixed(2)}<span className="text-[13px] text-slate-500 ml-1">MVAr</span></div>
        </div>
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Annual Loss Cost</div>
          <div className="text-[22px] font-mono font-bold mt-1 text-red-400">₹{annualLossCost_Lakhs.toFixed(1)}<span className="text-[13px] text-slate-500 ml-1">L/yr</span></div>
          <div className="text-[10px] text-slate-600 mt-0.5">{annualLossEnergy_kWh.toFixed(0)} kWh/yr</div>
        </div>
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Optimal OLTC Tap</div>
          <div className="text-[22px] font-mono font-bold mt-1 text-purple-400">{optTap > 0 ? '+' : ''}{optTap.toFixed(1)}<span className="text-[13px] text-slate-500 ml-1">%</span></div>
        </div>
      </div>

      {/* Segment Results Table */}
      <div className="bg-[#111827] rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Segment-wise Voltage Profile</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#0a0f18]">
                {["Segment", "Length", "Load", "Current", "V_drop R", "V_drop X", "Reg %", "Cum.Reg", "V_bus", "P_loss", "Status"].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calcResult.results.map((seg, i) => (
                <tr key={i} className={`border-t border-white/[0.04] hover:bg-white/[0.02] ${seg.status === 'danger' ? 'bg-red-500/[0.03]' : seg.status === 'warn' ? 'bg-amber-500/[0.03]' : ''}`}>
                  <td className="px-3 py-2.5 font-medium text-white">{seg.label}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-300">{seg.km} km</td>
                  <td className="px-3 py-2.5 font-mono text-slate-300">{seg.mva} MVA</td>
                  <td className="px-3 py-2.5 font-mono text-white">{seg.I} A</td>
                  <td className="px-3 py-2.5 font-mono text-slate-300">{seg.Rdrop} kV</td>
                  <td className="px-3 py-2.5 font-mono text-slate-300">{seg.Xdrop} kV</td>
                  <td className="px-3 py-2.5 font-mono text-white">{seg.reg}%</td>
                  <td className={`px-3 py-2.5 font-mono font-semibold ${seg.status === 'danger' ? 'text-red-400' : seg.status === 'warn' ? 'text-amber-400' : 'text-emerald-400'}`}>{seg.cumReg}%</td>
                  <td className="px-3 py-2.5 font-mono text-blue-400">{seg.Vcurrent} kV</td>
                  <td className="px-3 py-2.5 font-mono text-amber-400">{seg.activeLoss} MW</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      seg.status === 'danger' ? 'bg-red-500/15 text-red-400' : seg.status === 'warn' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                    }`}>{seg.status === 'danger' ? 'FAIL' : seg.status === 'warn' ? 'WARN' : 'OK'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optimizer Recommendation */}
      <div className="bg-gradient-to-r from-emerald-500/[0.06] to-teal-500/[0.06] border border-emerald-500/20 rounded-2xl p-5">
        <h3 className="text-[13px] font-bold text-white flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Optimizer Recommendation
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Best Conductor</div>
            <div className="text-[14px] font-semibold text-white mt-0.5">{CONDUCTORS[optConfig.conductor]?.name || optConfig.conductor}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">OLTC Tap</div>
            <div className="text-[14px] font-semibold text-purple-400 mt-0.5">{optConfig.tap > 0 ? '+' : ''}{optConfig.tap}%</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Achievable Regulation</div>
            <div className="text-[14px] font-semibold text-emerald-400 mt-0.5">{optConfig.peakReg.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Optimized Losses</div>
            <div className="text-[14px] font-semibold text-amber-400 mt-0.5">{optConfig.totalLoss.toFixed(2)} MW</div>
          </div>
        </div>
      </div>
    </div>
  );
}
