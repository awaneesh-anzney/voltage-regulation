"use client";

import { useState, useMemo } from "react";
import {
  Zap, BarChart3, DollarSign, Shield, Sparkles, FileText,
  AlertTriangle
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

const TABS = [
  { id: "analyzer", label: "Analyzer", icon: BarChart3 },
  { id: "transformer", label: "Transformer", icon: Zap },
  { id: "losses", label: "Losses & ROI", icon: DollarSign },
  { id: "contingency", label: "N-1 Contingency", icon: Shield },
  { id: "ai", label: "AI Insights", icon: Sparkles },
  { id: "report", label: "Report", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("analyzer");

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
      <header className="flex items-center justify-between px-5 h-[52px] min-h-[52px] bg-[#0f1520]/85 backdrop-blur-xl border-b border-white/[0.06] z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            GridIntel
          </span>

        </div>

        {/* TABS */}
        <nav className="flex gap-0.5 bg-white/[0.03] rounded-lg p-[3px]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[7px] text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-blue-500/12 text-white border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.08)]"
                    : "text-slate-500 hover:text-slate-400 hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* ALERTS */}
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {alertCount} alerts
          </div>
        )}
        {alertCount === 0 && <div />}
      </header>

      {/* DASHBOARD CORE LAYOUT: SIDEBAR + TABS CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR INPUT CONTROLS */}
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
          onRunAnalysis={() => {}} // Calculations are automatic, but button callback is provided
        />

        {/* MAIN TAB CONTENT */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-5">
          {activeTab === "analyzer" && <AnalyzerTab data={data} dataWithStatcom={dataWithStatcom} />}
          {activeTab === "transformer" && <TransformerTab data={data} />}
          {activeTab === "losses" && <LossesTab data={data} dataWithStatcom={dataWithStatcom} />}
          {activeTab === "contingency" && <ContingencyTab data={data} />}
          {activeTab === "ai" && <AIInsightsTab data={data} optimalConfig={optimalConfig} />}
          {activeTab === "report" && <ReportTab data={data} />}
        </main>
      </div>
    </div>
  );
}
