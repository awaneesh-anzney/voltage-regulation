"use client";

import { Plus, X, Play, Sparkles } from "lucide-react";

export interface Segment {
  id: number;
  km: string;
  mva: string;
  df: string;
}

interface SidebarProps {
  projName: string;
  setProjName: (v: string) => void;
  projClient: string;
  setProjClient: (v: string) => void;
  voltage: string;
  setVoltage: (v: string) => void;
  conductor: string;
  setConductor: (v: string) => void;
  resistance: string;
  setResistance: (v: string) => void;
  reactance: string;
  setReactance: (v: string) => void;
  pf: string;
  setPf: (v: string) => void;
  limit: string;
  setLimit: (v: string) => void;
  xfmrMva: string;
  setXfmrMva: (v: string) => void;
  xfmrZ: string;
  setXfmrZ: (v: string) => void;
  ambientTemp: string;
  setAmbientTemp: (v: string) => void;
  oltcTap: number;
  setOltcTap: (v: number) => void;
  statcomEnable: string;
  setStatcomEnable: (v: string) => void;
  statcomBus: string;
  setStatcomBus: (v: string) => void;
  statcomMvar: number;
  setStatcomMvar: (v: number) => void;
  tariff: string;
  setTariff: (v: string) => void;
  loadFactor: string;
  setLoadFactor: (v: string) => void;
  co2Factor: string;
  setCo2Factor: (v: string) => void;
  statcomCost: string;
  setStatcomCost: (v: string) => void;
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  onRunAnalysis?: () => void;
  onOptimize?: () => void;
}

const VOLTAGES = ["11", "33", "66", "132", "220", "400", "765"];
const CONDUCTORS_LIST = [
  { value: "rabbit", label: "Rabbit (50 mm²)" },
  { value: "dog", label: "Dog (100 mm²)" },
  { value: "panther", label: "Panther (200 mm²)" },
  { value: "zebra", label: "Zebra (400 mm²)" },
  { value: "moose", label: "Moose (600 mm²)" },
];

const CONDUCTOR_PARAMS: Record<string, { r: number; x: number }> = {
  rabbit: { r: 0.641, x: 0.391 },
  dog: { r: 0.320, x: 0.380 },
  panther: { r: 0.161, x: 0.360 },
  zebra: { r: 0.080, x: 0.350 },
  moose: { r: 0.054, x: 0.343 },
};

export function Sidebar({
  projName, setProjName,
  projClient, setProjClient,
  voltage, setVoltage,
  conductor, setConductor,
  resistance, setResistance,
  reactance, setReactance,
  pf, setPf,
  limit, setLimit,
  xfmrMva, setXfmrMva,
  xfmrZ, setXfmrZ,
  ambientTemp, setAmbientTemp,
  oltcTap, setOltcTap,
  statcomEnable, setStatcomEnable,
  statcomBus, setStatcomBus,
  statcomMvar, setStatcomMvar,
  tariff, setTariff,
  loadFactor, setLoadFactor,
  co2Factor, setCo2Factor,
  statcomCost, setStatcomCost,
  segments, setSegments,
  onRunAnalysis,
  onOptimize,
}: SidebarProps) {

  const handleConductorChange = (val: string) => {
    setConductor(val);
    const params = CONDUCTOR_PARAMS[val];
    if (params) {
      setResistance(String(params.r));
      setReactance(String(params.x));
    }
  };

  const addSegment = () => {
    setSegments((prev) => [...prev, { id: Date.now(), km: "", mva: "", df: "1.0" }]);
  };

  const removeSegment = (id: number) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSegment = (id: number, field: "km" | "mva" | "df", value: string) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  return (
    <aside className="w-[280px] sm:w-[272px] min-w-[272px] h-full max-h-[calc(100vh-52px)] bg-[#0f1520] border-r border-white/[0.06] flex flex-col overflow-y-auto no-scrollbar">
      <div className="p-4 space-y-3.5 flex-1">
        {/* PROJECT */}
        <Section icon="📁" label="Project">
          <Field label="Project name">
            <input value={projName} onChange={(e) => setProjName(e.target.value)} className="sidebar-input" />
          </Field>
          <Field label="Client / Utility">
            <input value={projClient} onChange={(e) => setProjClient(e.target.value)} className="sidebar-input" />
          </Field>
        </Section>

        <Divider />

        {/* SYSTEM PARAMETERS */}
        <Section icon="⚙️" label="System Parameters">
          <Field label="Nominal voltage">
            <select value={voltage} onChange={(e) => setVoltage(e.target.value)} className="sidebar-select">
              {VOLTAGES.map((v) => (
                <option key={v} value={v}>{v} kV</option>
              ))}
            </select>
          </Field>
          <Field label="Conductor type">
            <select value={conductor} onChange={(e) => handleConductorChange(e.target.value)} className="sidebar-select">
              {CONDUCTORS_LIST.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="R (Ω/km)"><input type="number" value={resistance} onChange={(e) => setResistance(e.target.value)} step="0.001" className="sidebar-input font-mono" /></Field>
            <Field label="X (Ω/km)"><input type="number" value={reactance} onChange={(e) => setReactance(e.target.value)} step="0.001" className="sidebar-input font-mono" /></Field>
            <Field label="Power factor"><input type="number" value={pf} onChange={(e) => setPf(e.target.value)} step="0.01" max="1" className="sidebar-input font-mono" /></Field>
            <Field label="Limit (%)"><input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} step="0.5" className="sidebar-input font-mono" /></Field>
          </div>
        </Section>

        <Divider />

        {/* TRANSFORMER */}
        <Section icon="🔌" label="Transformer">
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="Rated MVA"><input type="number" value={xfmrMva} onChange={(e) => setXfmrMva(e.target.value)} className="sidebar-input font-mono" /></Field>
            <Field label="Impedance %"><input type="number" value={xfmrZ} onChange={(e) => setXfmrZ(e.target.value)} step="0.1" className="sidebar-input font-mono" /></Field>
            <Field label="Ambient °C"><input type="number" value={ambientTemp} onChange={(e) => setAmbientTemp(e.target.value)} className="sidebar-input font-mono" /></Field>
          </div>
          {/* OLTC Slider */}
          <div className="mt-1">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-medium text-slate-400">OLTC Tap Position</label>
              <span className="font-mono text-[13px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                {oltcTap >= 0 ? "+" : ""}{oltcTap.toFixed(2)}%
              </span>
            </div>
            <input
              type="range" min="-10" max="10" step="1.25" value={oltcTap}
              onChange={(e) => setOltcTap(parseFloat(e.target.value))}
              className="w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(59,130,246,0.3)] [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-600 mt-1">
              <span>-10%</span><span>0%</span><span>+10%</span>
            </div>
          </div>
        </Section>

        <Divider />

        {/* STATCOM */}
        <Section icon="◆" label="STATCOM / SVC" iconColor="text-purple-400">
          <div className="bg-purple-500/[0.06] border border-purple-500/10 rounded-lg p-2.5 space-y-2">
            <Field label="Enable compensator">
              <select value={statcomEnable} onChange={(e) => setStatcomEnable(e.target.value)} className="sidebar-select">
                <option value="off">Disabled</option>
                <option value="on">Enabled</option>
              </select>
            </Field>
            {statcomEnable === "on" && (
              <>
                <Field label="Place at bus">
                  <select value={statcomBus} onChange={(e) => setStatcomBus(e.target.value)} className="sidebar-select">
                    {segments.map((_, i) => (
                      <option key={i} value={String(i)}>Bus S{i + 1}</option>
                    ))}
                  </select>
                </Field>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-medium text-slate-400">MVAR Injection</label>
                    <span className="font-mono text-[12px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                      {statcomMvar >= 0 ? "+" : ""}{statcomMvar} MVAR
                    </span>
                  </div>
                  <input
                    type="range" min="-30" max="30" step="1" value={statcomMvar}
                    onChange={(e) => setStatcomMvar(parseInt(e.target.value))}
                    className="w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-purple-500 [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>-30 Absorb</span><span>0</span><span>+30 Inject</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Section>

        <Divider />

        {/* LINE SEGMENTS */}
        <Section icon="🛤️" label="Line Segments">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_1fr_26px] gap-1 text-[9px] font-semibold text-slate-600 uppercase tracking-wider px-0.5 mb-1">
            <span>km</span><span>MVA</span><span>Div.F</span><span></span>
          </div>
          {segments.map((seg) => (
            <div key={seg.id} className="grid grid-cols-[1fr_1fr_1fr_26px] gap-1 items-center mb-1.5">
              <input type="number" placeholder="km" value={seg.km} onChange={(e) => updateSegment(seg.id, "km", e.target.value)} step="0.1" className="sidebar-input font-mono !text-[11px] !py-[5px]" />
              <input type="number" placeholder="MVA" value={seg.mva} onChange={(e) => updateSegment(seg.id, "mva", e.target.value)} step="0.1" className="sidebar-input font-mono !text-[11px] !py-[5px]" />
              <input type="number" placeholder="DF" value={seg.df} onChange={(e) => updateSegment(seg.id, "df", e.target.value)} step="0.01" className="sidebar-input font-mono !text-[11px] !py-[5px]" />
              <button onClick={() => removeSegment(seg.id)} className="flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded p-0.5 transition-all cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button onClick={addSegment} className="w-full flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 border border-dashed border-white/[0.08] rounded-md py-1.5 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/[0.05] transition-all cursor-pointer">
            <Plus className="w-3 h-3" /> Add segment
          </button>
        </Section>

        <Divider />

        {/* COST PARAMETERS */}
        <Section icon="💰" label="Cost Parameters">
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="Tariff ($/MWh)"><input type="number" value={tariff} onChange={(e) => setTariff(e.target.value)} className="sidebar-input font-mono" /></Field>
            <Field label="Load factor"><input type="number" value={loadFactor} onChange={(e) => setLoadFactor(e.target.value)} step="0.05" max="1" className="sidebar-input font-mono" /></Field>
            <Field label="CO₂ (kg/kWh)"><input type="number" value={co2Factor} onChange={(e) => setCo2Factor(e.target.value)} step="0.01" className="sidebar-input font-mono" /></Field>
            <Field label="STATCOM cost ($M)"><input type="number" value={statcomCost} onChange={(e) => setStatcomCost(e.target.value)} step="0.1" className="sidebar-input font-mono" /></Field>
          </div>
        </Section>
      </div>

      {/* ACTION BUTTONS — sticky at bottom */}
      <div className="p-4 pt-2 border-t border-white/[0.06] bg-[#0f1520] space-y-1.5">
        <button
          onClick={onRunAnalysis}
          className="w-full flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg py-2.5 hover:from-blue-600 hover:to-blue-700 shadow-[0_2px_10px_rgba(59,130,246,0.25)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.35)] transition-all cursor-pointer hover:-translate-y-px active:translate-y-0"
        >
          <Play className="w-4 h-4" /> Run Analysis
        </button>
        <button
          onClick={onOptimize}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-violet-600 rounded-lg py-2 hover:from-purple-600 hover:to-violet-700 shadow-[0_2px_10px_rgba(167,139,250,0.2)] transition-all cursor-pointer hover:-translate-y-px"
        >
          <Sparkles className="w-3.5 h-3.5" /> AI Optimize
        </button>
      </div>
    </aside>
  );
}

// === Utility sub-components ===

function Section({ icon, label, iconColor, children }: { icon: string; label: string; iconColor?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={`text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5`}>
        <span className={`text-sm ${iconColor || ""}`}>{icon}</span> {label}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 mb-2">
      <label className="text-[11px] font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-white/[0.06] my-0.5" />;
}
