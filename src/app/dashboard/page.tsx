"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Zap, BarChart3, DollarSign, Shield, Sparkles, FileText,
  AlertTriangle, Menu, X as XIcon, History, Network, ShieldAlert
} from "lucide-react";
import { getDemoAnalysisData, CONDUCTORS, calculateRegulation, findOptimalTap, runOptimizer } from "@/lib/gridCalculations";
import type { AnalysisData, OptimalConfig, SegmentResult } from "@/lib/gridCalculations";
import { AnalyzerTab } from "@/components/dashboard/AnalyzerTab";
import { TransformerTab } from "@/components/dashboard/TransformerTab";
import { LossesTab } from "@/components/dashboard/LossesTab";
import { ContingencyTab } from "@/components/dashboard/ContingencyTab";
import { AIInsightsTab } from "@/components/dashboard/AIInsightsTab";
import { ReportTab } from "@/components/dashboard/ReportTab";
import { Sidebar, Segment } from "@/components/dashboard/Sidebar";
import { HistoryTab } from "@/components/dashboard/HistoryTab";
import { LoadFlowAnalyzer } from "@/components/calculator/LoadFlowAnalyzer";
import { FaultAnalyzer } from "@/components/calculator/FaultAnalyzer";
import { PrintableReport } from "@/components/calculator/PrintableReport";
import { CalculatorProvider } from "@/context/CalculatorContext";

export interface HistoryItem {
  id: string;
  timestamp: string;
  name: string;
  client: string;
  voltage: string;
  conductor: string;
  resistance: string;
  reactance: string;
  pf: string;
  limit: string;
  xfmrMva: string;
  xfmrZ: string;
  oltcTap: number;
  statcomEnable: string;
  statcomBus: string;
  statcomMvar: number;
  tariff: string;
  loadFactor: string;
  co2Factor: string;
  statcomCost: string;
  segments: Segment[];
  peakReg: number;
  totalLoss: number;
}

const TABS = [
  { id: "analyzer", label: "Analyzer", icon: BarChart3 },
  { id: "transformer", label: "Transformer", icon: Zap },
  { id: "losses", label: "Losses & ROI", icon: DollarSign },
  { id: "contingency", label: "N-1 Contingency", icon: Shield },
  { id: "loadflow", label: "Meshed Load Flow", icon: Network },
  { id: "fault", label: "Fault Analysis", icon: ShieldAlert },
  { id: "ai", label: "AI Insights", icon: Sparkles },
  { id: "report", label: "Report", icon: FileText },
  { id: "history", label: "History", icon: History },
] as const;

type TabId = (typeof TABS)[number]["id"];

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<TabId>("analyzer");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sidebar parameters state
  const [projName, setProjName] = useState("Riyadh North Feeder");
  const [projClient, setProjClient] = useState("SEC – Saudi Electricity");
  const [voltage, setVoltage] = useState("132");
  const [conductor, setConductor] = useState("panther");
  const [resistance, setResistance] = useState("0.161");
  const [reactance, setReactance] = useState("0.360");
  const [pf, setPf] = useState("0.92");
  const [limit, setLimit] = useState("5");
  const [xfmrMva, setXfmrMva] = useState("100");
  const [xfmrZ, setXfmrZ] = useState("12.5");
  const [ambientTemp, setAmbientTemp] = useState("35");
  const [oltcTap, setOltcTap] = useState(0);
  const [statcomEnable, setStatcomEnable] = useState("off");
  const [statcomBus, setStatcomBus] = useState("0");
  const [statcomMvar, setStatcomMvar] = useState(0);
  const [tariff, setTariff] = useState("65");
  const [loadFactor, setLoadFactor] = useState("0.6");
  const [co2Factor, setCo2Factor] = useState("0.82");
  const [statcomCost, setStatcomCost] = useState("8.5");

  const [segments, setSegments] = useState<Segment[]>([
    { id: 1, km: "12", mva: "18", df: "1.0" },
    { id: 2, km: "8", mva: "12", df: "1.0" },
    { id: 3, km: "5", mva: "6", df: "1.0" },
  ]);

  // History & Toast states
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("gridintel_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveScenario = () => {
    const newScenario: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      name: projName || "Untitled Scenario",
      client: projClient || "Generic Client",
      voltage,
      conductor,
      resistance,
      reactance,
      pf,
      limit,
      xfmrMva,
      xfmrZ,
      oltcTap,
      statcomEnable,
      statcomBus,
      statcomMvar,
      tariff,
      loadFactor,
      co2Factor,
      statcomCost,
      segments,
      peakReg: data.peakReg,
      totalLoss: data.totalActiveLoss,
    };

    const updated = [newScenario, ...history];
    setHistory(updated);
    localStorage.setItem("gridintel_history", JSON.stringify(updated));
    triggerToast(`Scenario "${newScenario.name}" saved to history!`);
  };

  const handleRestoreScenario = (item: HistoryItem) => {
    setProjName(item.name);
    setProjClient(item.client);
    setVoltage(item.voltage);
    setConductor(item.conductor);
    setResistance(item.resistance);
    setReactance(item.reactance);
    setPf(item.pf);
    setLimit(item.limit);
    setXfmrMva(item.xfmrMva);
    setXfmrZ(item.xfmrZ);
    setOltcTap(item.oltcTap);
    setStatcomEnable(item.statcomEnable);
    setStatcomBus(item.statcomBus);
    setStatcomMvar(item.statcomMvar);
    setTariff(item.tariff);
    setLoadFactor(item.loadFactor);
    setCo2Factor(item.co2Factor);
    setStatcomCost(item.statcomCost);
    setSegments(item.segments);
    triggerToast(`Restored scenario: ${item.name}`);
  };

  const handleDeleteScenario = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem("gridintel_history", JSON.stringify(updated));
    triggerToast("Scenario deleted.");
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all history?")) {
      setHistory([]);
      localStorage.removeItem("gridintel_history");
      triggerToast("All history cleared.");
    }
  };

  // Format segments for engine calculations
  const parsedSegs = useMemo(() => {
    return segments.map((s, idx) => ({
      km: parseFloat(s.km) || 0,
      mva: parseFloat(s.mva) || 0,
      df: parseFloat(s.df) || 1.0,
      label: `S${idx + 1}`
    }));
  }, [segments]);

  const Vn = parseFloat(voltage) || 132;
  const R = parseFloat(resistance) || 0.161;
  const X = parseFloat(reactance) || 0.360;
  const parsedPf = parseFloat(pf) || 0.92;
  const parsedLimit = parseFloat(limit) || 5;

  // Real-time analysis calculations
  const data = useMemo(() => {
    const calc = calculateRegulation(parsedSegs, Vn, R, X, parsedPf, parsedLimit, oltcTap, false, "0", 0);
    const results = calc.results;
    const totalLen = parsedSegs.reduce((a, b) => a + b.km, 0);
    const totalLoad = parsedSegs.reduce((a, b) => a + b.mva, 0);
    const peakReg = parseFloat(results[results.length - 1]?.cumReg || "0");
    const VR = parseFloat(results[results.length - 1]?.Vcurrent || String(Vn));

    return {
      results,
      Vn,
      pf: parsedPf,
      limit: parsedLimit,
      segs: parsedSegs,
      peakReg,
      totalLen,
      totalLoad,
      VR,
      R,
      X,
      oltcPct: oltcTap,
      statcomEnabled: false,
      statcomBus: "0",
      statcomMvar: 0,
      totalActiveLoss: calc.totalActiveLoss,
      totalReactiveLoss: calc.totalReactiveLoss,
      Vs: calc.Vs,
      // Extra details for tabs
      projName,
      projClient,
      tariff: parseFloat(tariff) || 65,
      loadFactor: parseFloat(loadFactor) || 0.6,
      co2Factor: parseFloat(co2Factor) || 0.82,
      statcomCost: parseFloat(statcomCost) || 8.5,
      xfmrMva: parseFloat(xfmrMva) || 100,
      xfmrZ: parseFloat(xfmrZ) || 12.5,
      ambientTemp: parseFloat(ambientTemp) || 35,
    } as any;
  }, [parsedSegs, Vn, R, X, parsedPf, parsedLimit, oltcTap, projName, projClient, tariff, loadFactor, co2Factor, statcomCost, xfmrMva, xfmrZ, ambientTemp]);

  // Real-time calculation with STATCOM enabled
  const dataWithStatcom = useMemo(() => {
    const isStatcom = statcomEnable === "on";
    const calc = calculateRegulation(parsedSegs, Vn, R, X, parsedPf, parsedLimit, oltcTap, isStatcom, statcomBus, statcomMvar);
    const results = calc.results;
    const peakReg = parseFloat(results[results.length - 1]?.cumReg || "0");
    const VR = parseFloat(results[results.length - 1]?.Vcurrent || String(Vn));
    return {
      ...data,
      results,
      peakReg,
      VR,
      statcomEnabled: isStatcom,
      statcomBus,
      statcomMvar,
      totalActiveLoss: calc.totalActiveLoss,
      totalReactiveLoss: calc.totalReactiveLoss,
      Vs: calc.Vs,
    } as any;
  }, [data, parsedSegs, Vn, R, X, parsedPf, parsedLimit, oltcTap, statcomEnable, statcomBus, statcomMvar]);

  // AI Optimal Configuration
  const optimalConfig = useMemo(
    () => runOptimizer(parsedSegs, Vn, parsedPf, parsedLimit, conductor),
    [parsedSegs, Vn, parsedPf, parsedLimit, conductor]
  );

  // Apply AI optimization to state
  const handleOptimize = () => {
    if (!optimalConfig) return;
    setOltcTap(optimalConfig.tap);
    setStatcomEnable(optimalConfig.statcomMvar > 0 ? "on" : "off");
    setStatcomBus(String(optimalConfig.statcomBus));
    setStatcomMvar(optimalConfig.statcomMvar);
    setConductor(optimalConfig.conductor);

    const params = CONDUCTORS[optimalConfig.conductor];
    if (params) {
      setResistance(String(params.r));
      setReactance(String(params.x));
    }
  };

  const alertCount = data.results.filter((r: SegmentResult) => r.status !== "ok").length;

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-slate-100 overflow-hidden">
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-3 sm:px-5 h-[52px] min-h-[52px] bg-[#0f1520]/85 backdrop-blur-xl border-b border-white/[0.06] z-50">
        <div className="flex items-center gap-2.5">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight hidden sm:inline">
            GridIntel
          </span>
        </div>

        {/* TABS - horizontally scrollable on mobile */}
        <nav className="flex gap-0.5 bg-white/[0.03] rounded-lg p-[3px] overflow-x-auto no-scrollbar max-w-[calc(100vw-160px)] sm:max-w-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-[7px] text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${isActive
                    ? "bg-blue-500/12 text-white border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.08)]"
                    : "text-slate-500 hover:text-slate-400 hover:bg-white/[0.04]"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ALERTS */}
        {alertCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {alertCount} alerts
          </div>
        )}
        {alertCount === 0 && <div className="hidden sm:block" />}
      </header>

      {/* DASHBOARD CORE LAYOUT: SIDEBAR + TABS CONTENT */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Mobile sidebar overlay backdrop */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 top-[52px] bg-black/50 z-30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR INPUT CONTROLS */}
        <div
          className={`
            fixed top-[52px] left-0 bottom-0 z-40
            lg:translate-x-0
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <Sidebar
            projName={projName} setProjName={setProjName}
            projClient={projClient} setProjClient={setProjClient}
            voltage={voltage} setVoltage={setVoltage}
            conductor={conductor} setConductor={setConductor}
            resistance={resistance} setResistance={setResistance}
            reactance={reactance} setReactance={setReactance}
            pf={pf} setPf={setPf}
            limit={limit} setLimit={setLimit}
            xfmrMva={xfmrMva} setXfmrMva={setXfmrMva}
            xfmrZ={xfmrZ} setXfmrZ={setXfmrZ}
            ambientTemp={ambientTemp} setAmbientTemp={setAmbientTemp}
            oltcTap={oltcTap} setOltcTap={setOltcTap}
            statcomEnable={statcomEnable} setStatcomEnable={setStatcomEnable}
            statcomBus={statcomBus} setStatcomBus={setStatcomBus}
            statcomMvar={statcomMvar} setStatcomMvar={setStatcomMvar}
            tariff={tariff} setTariff={setTariff}
            loadFactor={loadFactor} setLoadFactor={setLoadFactor}
            co2Factor={co2Factor} setCo2Factor={setCo2Factor}
            statcomCost={statcomCost} setStatcomCost={setStatcomCost}
            segments={segments} setSegments={setSegments}
            onOptimize={handleOptimize}
            onRunAnalysis={() => { }} // Calculations are automatic, but button callback is provided
            onSaveScenario={handleSaveScenario}
          />
        </div>

        {/* MAIN TAB CONTENT */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-5 lg:ml-[272px]">
          {activeTab === "analyzer" && <AnalyzerTab data={data} dataWithStatcom={dataWithStatcom} />}
          {activeTab === "transformer" && <TransformerTab data={data} />}
          {activeTab === "losses" && <LossesTab data={data} dataWithStatcom={dataWithStatcom} />}
          {activeTab === "contingency" && <ContingencyTab data={data} />}
          {activeTab === "loadflow" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f1520]/80 p-4 border border-white/[0.06] rounded-xl shadow-lg">
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Newton-Raphson Load Flow</h2>
                  <p className="text-xs text-slate-400 mt-1">Iterative load flow calculations on meshed power distribution grids.</p>
                </div>
                <PrintableReport />
              </div>
              <LoadFlowAnalyzer />
            </div>
          )}
          {activeTab === "fault" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f1520]/80 p-4 border border-white/[0.06] rounded-xl shadow-lg">
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Short-Circuit Fault Analysis</h2>
                  <p className="text-xs text-slate-400 mt-1">Compute short-circuit levels and sequence impedance values in compliance with IEC 60909.</p>
                </div>
                <PrintableReport />
              </div>
              <FaultAnalyzer />
            </div>
          )}
          {activeTab === "ai" && <AIInsightsTab data={data} optimalConfig={optimalConfig} />}
          {activeTab === "report" && <ReportTab data={data} />}
          {activeTab === "history" && (
            <HistoryTab
              history={history}
              onRestore={handleRestoreScenario}
              onDelete={handleDeleteScenario}
              onClearAll={handleClearHistory}
              currentActiveReg={data.peakReg}
              currentActiveLoss={data.totalActiveLoss}
            />
          )}
        </main>
      </div>


      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#162235] border border-blue-500/30 text-blue-200 px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          {toast}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <CalculatorProvider>
      <DashboardContent />
    </CalculatorProvider>
  );
}
