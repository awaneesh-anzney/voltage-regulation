"use client";

import {
  ShieldAlert, Cable, Activity, Sparkles, FileText, History,
  Network, DollarSign, Shield, Home, ChevronDown, Zap,
  AlertTriangle, CheckCircle2, TrendingUp, ArrowRight,
  BarChart3, Clock, Play, FileDown, SlidersHorizontal
} from "lucide-react";

// ─── KPI Card ───
function BentoCard({ title, children, className, span }: {
  title: string; children: React.ReactNode; className?: string;
  span?: string;
}) {
  return (
    <div className={`bg-[#111827] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden group
      hover:border-white/[0.1] transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.04)] ${span || ""} ${className || ""}`}>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ─── Mini SLD (Single Line Diagram) ───
function MiniSLD() {
  return (
    <svg viewBox="0 0 400 200" className="w-full h-full" style={{ minHeight: '180px' }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Connection Lines */}
      <line x1="80" y1="100" x2="200" y2="60" stroke="url(#lineGrad)" strokeWidth="2" filter="url(#glow)" strokeDasharray="6,4">
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite" />
      </line>
      <line x1="200" y1="60" x2="320" y2="100" stroke="url(#lineGrad)" strokeWidth="2" filter="url(#glow)" strokeDasharray="6,4">
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite" />
      </line>
      <line x1="80" y1="100" x2="200" y2="140" stroke="url(#lineGrad)" strokeWidth="2" filter="url(#glow)" strokeDasharray="6,4">
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite" />
      </line>
      <line x1="200" y1="140" x2="320" y2="100" stroke="url(#lineGrad)" strokeWidth="2" filter="url(#glow)" strokeDasharray="6,4">
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite" />
      </line>

      {/* Nodes */}
      {[
        { x: 80, y: 100, label: "Grid", color: "#3b82f6" },
        { x: 200, y: 60, label: "220kV Bus", color: "#14b8a6" },
        { x: 200, y: 140, label: "Transformer", color: "#f59e0b" },
        { x: 320, y: 100, label: "Load", color: "#10b981" },
      ].map((node, i) => (
        <g key={i}>
          <circle cx={node.x} cy={node.y} r="18" fill={node.color} opacity="0.15" />
          <circle cx={node.x} cy={node.y} r="8" fill={node.color} filter="url(#glow)" />
          <circle cx={node.x} cy={node.y} r="4" fill="white" />
          <text x={node.x} y={node.y + 30} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">{node.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Radial Gauge ───
function RadialGauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(1, value / max);
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct * 0.75); // 270° arc

  return (
    <div className="flex flex-col items-center">
      <svg width="90" height="90" viewBox="0 0 90 90" className="transform -rotate-[135deg]">
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#1e293b" strokeWidth="6"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeLinecap="round" />
        <circle cx="45" cy="45" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={dashOffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="text-[10px] text-slate-500 mt-1">{label}</div>
    </div>
  );
}

// ─── Main Bento Home ───
export function BentoHome() {
  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-[13px] text-slate-500 mt-1">Complete power system analysis at a glance</p>
      </div>

      {/* Row 1: SLD + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* SLD Hero Card */}
        <BentoCard title="Single Line Diagram" span="lg:col-span-2 lg:row-span-2">
          <MiniSLD />
          <div className="text-[11px] text-slate-600 mt-2 font-mono">3 buses · 2 transformers · 1 line</div>
        </BentoCard>

        {/* Fault Level */}
        <BentoCard title="Fault Level">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[28px] font-mono font-bold text-blue-400">45.2</div>
              <div className="text-[11px] text-slate-500 font-mono">kA (3-phase)</div>
            </div>
            <RadialGauge value={45.2} max={100} label="45% cap" color="#3b82f6" />
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Within equipment rating</span>
          </div>
        </BentoCard>

        {/* SC Forces */}
        <BentoCard title="SC Forces Status">
          <div className="text-[32px] font-mono font-bold text-emerald-400">PASS</div>
          <div className="text-[12px] text-slate-500 mt-1 font-mono">F_max = 42.1 kN</div>
          <div className="mt-3 space-y-1.5">
            {[
              { label: "F_st", pct: 30, color: "#3b82f6" },
              { label: "F_td", pct: 55, color: "#10b981" },
              { label: "F_fd", pct: 100, color: "#ef4444" },
            ].map((bar) => (
              <div key={bar.label} className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 font-mono w-6">{bar.label}</span>
                <div className="flex-1 h-1.5 bg-[#0a0f18] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${bar.pct}%`, background: bar.color }} />
                </div>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sag-Tension */}
        <BentoCard title="Sag-Tension Summary">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 mb-0.5">Max Sag</div>
              <div className="text-[22px] font-mono font-bold text-amber-400">8.52 m</div>
              <div className="text-[10px] text-slate-600 font-mono">at 75°C no-wind</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-0.5">Clearance</div>
              <div className="text-[22px] font-mono font-bold text-emerald-400">17.98 m</div>
              <div className="text-[10px] text-slate-600 font-mono">min req: 8.84 m</div>
            </div>
          </div>
          {/* Mini catenary */}
          <svg viewBox="0 0 200 50" className="w-full mt-3">
            <line x1="10" y1="10" x2="190" y2="10" stroke="#1e293b" strokeWidth="0.5" />
            <rect x="6" y="5" width="8" height="40" rx="2" fill="#334155" />
            <rect x="186" y="5" width="8" height="40" rx="2" fill="#334155" />
            <path d="M 10 10 Q 100 45, 190 10" fill="none" stroke="#f59e0b" strokeWidth="2" />
            <line x1="10" y1="42" x2="190" y2="42" stroke="#475569" strokeWidth="0.5" strokeDasharray="4,3" />
            <text x="100" y="48" textAnchor="middle" fill="#64748b" fontSize="6" fontFamily="monospace">ground</text>
          </svg>
        </BentoCard>

        {/* Quick Actions */}
        <BentoCard title="Quick Actions">
          <div className="space-y-2">
            {[
              { label: "Run Full Analysis", icon: Play, gradient: "from-blue-500 to-indigo-500" },
              { label: "Generate Report", icon: FileDown, gradient: "from-slate-600 to-slate-700" },
              { label: "Compare Scenarios", icon: SlidersHorizontal, gradient: "from-teal-600 to-cyan-600" },
            ].map((action) => (
              <button key={action.label}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white bg-gradient-to-r ${action.gradient} hover:brightness-110 transition-all cursor-pointer hover:-translate-y-px active:translate-y-0 shadow-md`}
              >
                <action.icon className="w-3.5 h-3.5" />
                {action.label}
              </button>
            ))}
          </div>
        </BentoCard>

        {/* Recent Activity */}
        <BentoCard title="Recent Activity">
          <div className="space-y-3">
            {[
              { text: "SC Forces calculated", time: "2h ago", icon: Activity, color: "text-teal-400" },
              { text: "Fault Analysis updated", time: "5h ago", icon: ShieldAlert, color: "text-blue-400" },
              { text: "Sag-Tension saved", time: "1d ago", icon: Cable, color: "text-amber-400" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`mt-0.5 ${item.color}`}><item.icon className="w-3.5 h-3.5" /></div>
                <div className="flex-1">
                  <div className="text-[12px] text-slate-300">{item.text}</div>
                  <div className="text-[10px] text-slate-600 font-mono">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>

      {/* Row 3: Warnings */}
      <BentoCard title="⚠️ Warnings & Alerts" className="border-amber-500/15">
        <div className="space-y-2">
          {[
            "Clearance violated at 75°C in Sag-Tension — increase tower height or reduce span",
            "Fault current approaching 50kA threshold — verify equipment rating",
          ].map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-amber-300/80">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      </BentoCard>
    </div>
  );
}
