"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Zap, Shield, Activity, Compass,
  ArrowRight, CheckCircle2,
  AlertTriangle, Sun, Moon
} from "lucide-react";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function StartPage() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  // ─── Live Sandbox State ───
  const [sandboxTab, setSandboxTab] = useState<"fault" | "sag" | "ground">("fault");

  // Fault Demo State
  const [faultMva, setFaultMva] = useState(1000);
  const [faultKv, setFaultKv] = useState(220);
  const [faultXr, setFaultXr] = useState(14);

  // Sag Demo State
  const [sagSpan, setSagSpan] = useState(250);
  const [sagTemp, setSagTemp] = useState(75);
  const [sagTension, setSagTension] = useState(25);

  // Ground Demo State
  const [groundRho, setGroundRho] = useState(2500);
  const [groundFaultCurrent, setGroundFaultCurrent] = useState(15);
  const [groundDuration, setGroundDuration] = useState(0.5);

  // Fault computations
  const ik = faultMva / (Math.sqrt(3) * faultKv);
  const kappa = 1.02 + 0.98 * Math.exp(-3 / faultXr);
  const ip = kappa * Math.sqrt(2) * ik;
  const zth = (faultKv * faultKv) / faultMva;

  // Sag computations
  const weightPerM = 0.0196; // kN/m (Moose ACSR)
  const tempCorrection = 1 + (sagTemp - 25) * 0.0035;
  const effectiveTension = Math.max(sagTension / tempCorrection, 5.0);
  const sag = (weightPerM * sagSpan * sagSpan) / (8 * effectiveTension);
  const towerHeight = 13.04;
  const clearance = Math.max(0, towerHeight - sag);
  const ceaLimit = 7.0;
  const clearanceMargin = clearance - ceaLimit;

  // Ground computations (IEEE 80 70kg)
  const cs = 1 - (0.09 * (1 - 100 / groundRho)) / (2 * 0.1 + 0.09);
  const eTouch70 = Math.round((1000 + 1.5 * cs * groundRho) * (0.157 / Math.sqrt(groundDuration)));
  const eStep70 = Math.round((1000 + 6.0 * cs * groundRho) * (0.157 / Math.sqrt(groundDuration)));
  const em = Math.round(groundFaultCurrent * 32.5 * Math.pow(groundDuration, 0.1));

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* ───────────────────────────────────────────────────────────
           HEADER NAVIGATION
           ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-[1240px] mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Zap className="w-4.5 h-4.5 fill-current" />
              </div>
              <span>GridIntel</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              v2.0 Beta
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#overview" className="hover:text-foreground transition-colors">Overview</a>
            <a href="#modules" className="hover:text-foreground transition-colors">Modules</a>
            <a href="#playground" className="hover:text-foreground transition-colors">Live Solver</a>
            <a href="#how" className="hover:text-foreground transition-colors">Test Guide</a>
            <a href="#guidelines" className="hover:text-foreground transition-colors">Verification</a>
          </nav>

          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            <Link
              href="/v2"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 transition-all hover:-translate-y-0.5"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────
           HERO SECTION
           ─────────────────────────────────────────────────────────── */}
      <section id="overview" className="max-w-[1240px] mx-auto px-6 py-12 lg:py-18">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Substation & Transmission Analysis Suite
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]">
              Check the grid <br />
              <span className="bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
                before you build it.
              </span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              Fault levels, electrodynamic short-circuit forces, sag-tension, conductor sizing, and grounding design unified in one browser workspace. Set up a 220 kV study and identify design limits instantly.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono bg-accent/60 border border-border text-foreground">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                IEC 60909 & 60865
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono bg-accent/60 border border-border text-foreground">
                <Compass className="w-3.5 h-3.5 text-teal-500" />
                IEEE Std 80 & CBIP 223
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono bg-accent/60 border border-border text-foreground">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Real-time &lt; 15ms Solvers
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/v2"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
              >
                <span>Launch GridIntel v2</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold border border-border bg-card hover:bg-accent transition-colors"
              >
                <span>How to Test</span>
              </a>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
              Runs 100% in your browser. Zero cloud telemetry. No installation or sign-up needed.
            </p>
          </div>

          {/* Interactive SLD Vector Graphic */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span>220 kV Base Substation Model</span>
                </div>
                <span className="text-xs font-mono text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                  ⚡ 1000 MVA Infeed Active
                </span>
              </div>

              {/* Single Line Diagram SVG */}
              <div className="relative">
                <svg viewBox="0 0 520 300" className="w-full h-auto" role="img" aria-label="220 kV Substation Diagram">
                  <defs>
                    <linearGradient id="mainBusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="50%" stopColor="#14B8A6" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>

                  {/* Grid Infeed (Bay 0) */}
                  <g transform="translate(65, 36)">
                    <circle cx="0" cy="0" r="18" className="fill-background stroke-blue-500 stroke-2" />
                    <path d="M-8 0 Q -4 -6 0 0 T 8 0" fill="none" className="stroke-blue-500 stroke-2" />
                    <text x="26" y="-3" textAnchor="start" className="text-[11px] font-sans fill-foreground font-semibold">Grid Infeed</text>
                    <text x="26" y="11" textAnchor="start" className="text-[9.5px] font-mono fill-muted-foreground">1000 MVA Infeed</text>
                  </g>

                  {/* Line down to circuit breaker */}
                  <line x1="65" y1="54" x2="65" y2="68" className="stroke-border stroke-2" />
                  <rect x="57" y="68" width="16" height="16" rx="2" className="fill-background stroke-teal-500 stroke-2" />
                  <line x1="61" y1="76" x2="69" y2="76" className="stroke-teal-500 stroke-2" />
                  <line x1="65" y1="84" x2="65" y2="110" className="stroke-border stroke-2" />

                  {/* Main Busbar */}
                  <line x1="20" y1="110" x2="500" y2="110" stroke="url(#mainBusGrad)" strokeWidth="5" strokeLinecap="round" />
                  <text x="200" y="98" textAnchor="middle" className="text-[11px] font-sans font-bold fill-blue-500">220 kV MAIN BUSBAR</text>
                  <text x="495" y="98" textAnchor="end" className="text-[10px] font-mono fill-teal-500">1.0 p.u. (220.0 kV)</text>

                  {/* Bay 1: Fault Point */}
                  <line x1="145" y1="110" x2="145" y2="145" className="stroke-border stroke-2" />
                  <g transform="translate(145, 155)">
                    <circle cx="0" cy="0" r="10" className="fill-amber-500/20 stroke-amber-500 stroke-2" />
                    <path d="M-2 -6 L3 0 L-1 0 L2 6 L-3 0 L0 0 Z" className="fill-amber-500" />
                    <rect x="-50" y="14" width="100" height="34" rx="6" className="fill-background stroke-amber-500/60 stroke-1" />
                    <text x="0" y="28" textAnchor="middle" className="text-[10px] font-mono font-bold fill-amber-500">Ik&quot; = 45.2 kA</text>
                    <text x="0" y="41" textAnchor="middle" className="text-[8.5px] font-mono fill-muted-foreground">ip = 115.3 kA</text>
                  </g>

                  {/* Bay 2: Transformer (labels stacked neatly below 33kV bus to avoid horizontal collision) */}
                  <line x1="275" y1="110" x2="275" y2="138" className="stroke-border stroke-2" />
                  <g transform="translate(275, 160)">
                    <circle cx="0" cy="-8" r="14" className="fill-background stroke-blue-500 stroke-2" />
                    <circle cx="0" cy="8" r="14" fill="none" className="stroke-blue-500 stroke-2" />
                  </g>
                  <line x1="275" y1="182" x2="275" y2="206" className="stroke-border stroke-2" />
                  <line x1="235" y1="206" x2="315" y2="206" className="stroke-blue-500 stroke-[3.5] stroke-linecap-round" />
                  <text x="275" y="222" textAnchor="middle" className="text-[10.5px] font-sans font-semibold fill-foreground">220/33 kV Trafo · 100 MVA</text>
                  <text x="275" y="235" textAnchor="middle" className="text-[9px] font-mono fill-muted-foreground">Z = 12.5% · 33 kV Aux Bus</text>

                  {/* Bay 3: Transmission Span & Catenary */}
                  <line x1="420" y1="110" x2="420" y2="140" className="stroke-border stroke-2" />
                  <g transform="translate(420, 140)">
                    <line x1="-30" y1="0" x2="30" y2="0" className="stroke-border stroke-2" />
                    <path d="M-30 0 Q 0 16 30 0" fill="none" className="stroke-teal-500 stroke-[1.8]" />
                    <text x="0" y="28" textAnchor="middle" className="text-[10px] font-sans font-semibold fill-foreground">Moose ACSR (54/7)</text>
                    <text x="0" y="41" textAnchor="middle" className="text-[8.5px] font-mono fill-teal-500">Max Sag: 5.42 m</text>
                  </g>

                  {/* Ground Plane */}
                  <g transform="translate(20, 262)">
                    <line x1="0" y1="0" x2="480" y2="0" className="stroke-border stroke-dasharray-[4_4] stroke-1" />
                    <text x="0" y="14" className="text-[9.5px] font-mono font-semibold fill-muted-foreground">SUBSTATION GROUNDING MESH (IEEE 80 / CBIP 223)</text>
                    <text x="0" y="26" className="text-[9px] font-mono fill-teal-500">Rg = 0.42 Ω · Touch V: 485 V &lt; 748 V (SAFE)</text>
                  </g>
                </svg>
              </div>

              {/* Telemetry Strip */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border text-center">
                <div className="p-2.5 rounded-lg bg-accent/40 border border-border">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">3-Phase Fault</div>
                  <div className="font-mono font-bold text-amber-500 text-sm mt-0.5">45.2 kA</div>
                </div>
                <div className="p-2.5 rounded-lg bg-accent/40 border border-border">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">SC Force (Fm)</div>
                  <div className="font-mono font-bold text-blue-500 text-sm mt-0.5">12.4 kN/m</div>
                </div>
                <div className="p-2.5 rounded-lg bg-accent/40 border border-border">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">CEA Clearance</div>
                  <div className="font-mono font-bold text-teal-500 text-sm mt-0.5">7.62 m</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
           MODULES CAPABILITIES GRID
           ─────────────────────────────────────────────────────────── */}
      <section id="modules" className="border-t border-border bg-card/40 py-16">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-blue-500 font-semibold block mb-2">
              Capabilities & Engines
            </span>
            <h2 className="text-3xl font-bold tracking-tight">What you can analyse</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              High-precision electrical, mechanical, and earthing calculations in one synchronized workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Electrical Column */}
            <div className="p-6 rounded-2xl border border-border bg-card flex flex-col space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b-2 border-blue-500">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <h3 className="font-bold text-lg">Electrical Systems</h3>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-border bg-background hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">Fault Analysis</span>
                    <span className="text-[11px] font-mono text-muted-foreground">IEC 60909</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">3-Phase, 1-Phase SLG, L-L faults, peak withstand (ip), and switchgear capacity check.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-background hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">Meshed Load Flow</span>
                    <span className="text-[11px] font-mono text-muted-foreground">Newton-Raphson</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Transmission network power flow, bus voltages, line thermal loading, and active/reactive losses.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-background hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">Earthmat & Grounding</span>
                    <span className="text-[11px] font-mono text-muted-foreground">IEEE 80 / CBIP 223</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Ground grid resistance, Ground Potential Rise (GPR), and allowable touch/step potentials.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-background hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">CT Sizing</span>
                    <span className="text-[11px] font-mono text-muted-foreground">IS 2705 / IEC 61869</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Knee-point voltage (Vk), secondary burden, and saturation verification under fault levels.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-background hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">Protection Coordination</span>
                    <span className="text-[11px] font-mono text-muted-foreground">IDMT / TCC</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Overcurrent & earth-fault grading margins, relay trip curve overlays, and TMS settings.</p>
                </div>
              </div>
            </div>

            {/* Mechanical Column */}
            <div className="p-6 rounded-2xl border border-border bg-card flex flex-col space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b-2 border-teal-500">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center font-bold">
                  🏗️
                </div>
                <h3 className="font-bold text-lg">Mechanical & Physical</h3>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-border bg-background hover:border-teal-500 transition-colors">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">Conductor Sizing</span>
                    <span className="text-[11px] font-mono text-muted-foreground">IEEE 738</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Continuous ampacity steady-state heat balance under solar/wind, plus short-circuit thermal limit.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-background hover:border-teal-500 transition-colors">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">Sag-Tension & Clearances</span>
                    <span className="text-[11px] font-mono text-muted-foreground">Catenary Engine</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Maximum sag across design temperatures (-5°C to 85°C) with CEA statutory clearance margins.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-background hover:border-teal-500 transition-colors">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">Short-Circuit Forces</span>
                    <span className="text-[11px] font-mono text-muted-foreground">IEC 60865 / IEEE 605</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Peak electrodynamic forces on bundle conductors, inter-subconductor pinch, and structure withstand.</p>
                </div>
              </div>
            </div>

            {/* Output Column */}
            <div className="p-6 rounded-2xl border border-border bg-card flex flex-col space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b-2 border-purple-500">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                  📊
                </div>
                <h3 className="font-bold text-lg">Output & Intelligence</h3>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-border bg-background hover:border-purple-500 transition-colors">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">AI Engineering Insights</span>
                    <span className="text-[11px] font-mono text-muted-foreground">Heuristic AI</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Automated scans flagging thermal bottlenecks, underrated switchgear, and safety clearance deficits.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-background hover:border-purple-500 transition-colors">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">Engineering Report</span>
                    <span className="text-[11px] font-mono text-muted-foreground">Audit-Grade</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">One-click calculation reports with step-by-step formula traces, standards clauses, and PDF export.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-background hover:border-purple-500 transition-colors">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-sm">Case Manager & History</span>
                    <span className="text-[11px] font-mono text-muted-foreground">State Tree</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Snapshot branching, multi-case comparison, and undo/redo state preservation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
           INTERACTIVE LIVE SOLVER PLAYGROUND
           ─────────────────────────────────────────────────────────── */}
      <section id="playground" className="border-t border-border py-16">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="mb-8">
            <span className="text-xs font-mono uppercase tracking-wider text-blue-500 font-semibold block mb-2">
              Interactive Preview
            </span>
            <h2 className="text-3xl font-bold tracking-tight">Try calculations live right now</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Adjust sliders below to test responsive calculation updates in real time.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="flex border-b border-border bg-muted/30">
              <button
                onClick={() => setSandboxTab("fault")}
                className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  sandboxTab === "fault" ? "border-blue-500 text-blue-500 bg-card" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                3-Phase Fault Level (IEC 60909)
              </button>
              <button
                onClick={() => setSandboxTab("sag")}
                className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  sandboxTab === "sag" ? "border-teal-500 text-teal-500 bg-card" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Sag-Tension Estimator
              </button>
              <button
                onClick={() => setSandboxTab("ground")}
                className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  sandboxTab === "ground" ? "border-amber-500 text-amber-500 bg-card" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Grounding Touch Voltage (IEEE 80)
              </button>
            </div>

            <div className="p-8">
              {sandboxTab === "fault" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>Short-Circuit Infeed Capacity (Ssc)</span>
                        <span className="font-mono font-bold text-blue-500">{faultMva.toLocaleString()} MVA</span>
                      </div>
                      <input
                        type="range"
                        min={200}
                        max={10000}
                        step={100}
                        value={faultMva}
                        onChange={(e) => setFaultMva(Number(e.target.value))}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>System Voltage (VLL)</span>
                        <span className="font-mono font-bold text-blue-500">{faultKv} kV</span>
                      </div>
                      <input
                        type="range"
                        min={33}
                        max={400}
                        step={1}
                        value={faultKv}
                        onChange={(e) => setFaultKv(Number(e.target.value))}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>System X/R Ratio</span>
                        <span className="font-mono font-bold text-blue-500">{faultXr.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={30}
                        step={1}
                        value={faultXr}
                        onChange={(e) => setFaultXr(Number(e.target.value))}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-6 rounded-xl border border-border bg-background space-y-4">
                    <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-border">
                      <span className="text-xs text-muted-foreground">Symmetrical Fault Current (Ik&quot;)</span>
                      <span className="font-mono font-bold text-lg">{ik.toFixed(2)} kA</span>
                    </div>
                    <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-border">
                      <span className="text-xs text-muted-foreground">Peak Withstand Current (ip)</span>
                      <span className="font-mono font-bold text-lg text-blue-500">{ip.toFixed(2)} kA</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">Thevenin Source Impedance (Zth)</span>
                      <span className="font-mono font-bold text-sm">{zth.toFixed(2)} Ω</span>
                    </div>
                    <div className="pt-2">
                      {ik <= 40 ? (
                        <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-mono font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>PASS · Within standard 40 kA breaker rating</span>
                        </div>
                      ) : ik <= 50 ? (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-semibold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>ELEVATED · Requires 50 kA Rated Circuit Breaker</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono font-semibold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>EXCEEDS LIMIT · Fault level exceeds 50 kA switchgear</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {sandboxTab === "sag" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>Span Length (L)</span>
                        <span className="font-mono font-bold text-teal-500">{sagSpan} m</span>
                      </div>
                      <input
                        type="range"
                        min={100}
                        max={500}
                        step={10}
                        value={sagSpan}
                        onChange={(e) => setSagSpan(Number(e.target.value))}
                        className="w-full accent-teal-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>Conductor Operating Temp</span>
                        <span className="font-mono font-bold text-teal-500">{sagTemp} °C</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={85}
                        step={5}
                        value={sagTemp}
                        onChange={(e) => setSagTemp(Number(e.target.value))}
                        className="w-full accent-teal-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>Stringing Tension</span>
                        <span className="font-mono font-bold text-teal-500">{sagTension} kN</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={50}
                        step={1}
                        value={sagTension}
                        onChange={(e) => setSagTension(Number(e.target.value))}
                        className="w-full accent-teal-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-6 rounded-xl border border-border bg-background space-y-4">
                    <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-border">
                      <span className="text-xs text-muted-foreground">Mid-Span Maximum Sag</span>
                      <span className="font-mono font-bold text-lg text-teal-500">{sag.toFixed(2)} m</span>
                    </div>
                    <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-border">
                      <span className="text-xs text-muted-foreground">Ground Clearance</span>
                      <span className="font-mono font-bold text-lg">{clearance.toFixed(2)} m</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">Statutory CEA 220 kV Minimum</span>
                      <span className="font-mono font-bold text-sm">7.00 m</span>
                    </div>
                    <div className="pt-2">
                      {clearanceMargin >= 0 ? (
                        <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-mono font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>SAFE · Clearance margin +{clearanceMargin.toFixed(2)} m above CEA</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono font-semibold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>VIOLATION · Clearance deficit {Math.abs(clearanceMargin).toFixed(2)} m below CEA</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {sandboxTab === "ground" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>Surface Soil Resistivity (ρs)</span>
                        <span className="font-mono font-bold text-amber-500">{groundRho} Ω·m</span>
                      </div>
                      <input
                        type="range"
                        min={500}
                        max={5000}
                        step={250}
                        value={groundRho}
                        onChange={(e) => setGroundRho(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>Fault Current to Ground (IG)</span>
                        <span className="font-mono font-bold text-amber-500">{groundFaultCurrent} kA</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={40}
                        step={1}
                        value={groundFaultCurrent}
                        onChange={(e) => setGroundFaultCurrent(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span>Fault Clearing Duration (ts)</span>
                        <span className="font-mono font-bold text-amber-500">{groundDuration.toFixed(2)} s</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        value={groundDuration}
                        onChange={(e) => setGroundDuration(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-6 rounded-xl border border-border bg-background space-y-4">
                    <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-border">
                      <span className="text-xs text-muted-foreground">Allowable Touch Voltage (70kg Body)</span>
                      <span className="font-mono font-bold text-lg text-teal-500">{eTouch70} V</span>
                    </div>
                    <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-border">
                      <span className="text-xs text-muted-foreground">Calculated Mesh Voltage (Em)</span>
                      <span className="font-mono font-bold text-lg">{em} V</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">Allowable Step Voltage (70kg Body)</span>
                      <span className="font-mono font-bold text-sm">{eStep70} V</span>
                    </div>
                    <div className="pt-2">
                      {em <= eTouch70 ? (
                        <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-mono font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>COMPLIANT · Mesh V ({em}V) &lt; Safe Touch Limit ({eTouch70}V)</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono font-semibold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>HAZARD · Mesh Voltage exceeds IEEE 80 allowable touch threshold</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
           HOW TO TEST IN 15 MINUTES
           ─────────────────────────────────────────────────────────── */}
      <section id="how" className="border-t border-border bg-card/40 py-16">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-blue-500 font-semibold block mb-2">
              Evaluation Workflow
            </span>
            <h2 className="text-3xl font-bold tracking-tight">How to test it</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Fifteen minutes is enough for an engineer to review and validate results against real projects.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-wider">Step 01</span>
              <h3 className="text-lg font-bold">Start with the Sample Case</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Launch the workspace. The app automatically loads a 220 kV, 1000 MVA base substation. Check the interactive Single Line Diagram and trust warnings.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <span className="text-xs font-mono font-bold text-teal-500 uppercase tracking-wider">Step 02</span>
              <h3 className="text-lg font-bold">Run Your Own Project Case</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Open any module (Fault Analysis, Sag-Tension, Earthmat Design). Enter parameters from a known design and inspect the instant calculation results.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <span className="text-xs font-mono font-bold text-purple-500 uppercase tracking-wider">Step 03</span>
              <h3 className="text-lg font-bold">Generate a Report</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Navigate to <b>Report</b> in the Output menu. Click <b>Generate Report</b> to inspect equation traces, standards citations, and export a clean PDF.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
           BEFORE YOU START & CTA
           ─────────────────────────────────────────────────────────── */}
      <section id="guidelines" className="border-t border-border py-16">
        <div className="max-w-[1240px] mx-auto px-6 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <h3 className="font-bold text-lg text-teal-600 dark:text-teal-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                What we need from reviewers
              </h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                  <span>Results that differ from your hand calculations or commercial software (ETAP / CYME).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                  <span>Inputs that are unclear, missing standard units, or need clearer tooltips.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                  <span>Unusual boundary conditions, extreme spans, or atypical conductor configurations.</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <h3 className="font-bold text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                What to keep in mind
              </h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                  <span>This is a test release (v2.0 Beta); algorithms remain subject to formal review.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                  <span>Verify results independently before using them in final construction designs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                  <span>100% in-browser execution: your design parameters never leave your local machine.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA Banner */}
          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-900/20 via-background to-teal-900/20 p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to verify your grid?</h2>
              <p className="text-muted-foreground text-sm max-w-lg">
                Open GridIntel v2 in your browser right now and start with the pre-configured 220 kV study.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <Link
                href="/v2"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
              >
                <span>Launch GridIntel v2</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
           FOOTER
           ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 text-xs text-muted-foreground">
        <div className="max-w-[1240px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-foreground">GridIntel v2.0</span>
            <span>· Evaluation release. Results do not replace professional engineering review.</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/v2" className="hover:text-foreground">v2 Workspace &rarr;</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
