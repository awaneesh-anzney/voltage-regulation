"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ShieldAlert, Settings2, BarChart3, FileText, LineChart,
  SlidersHorizontal, Download, AlertTriangle, CheckCircle2, XCircle
} from "lucide-react";
import { computeSCForces, getDefaultInputs } from "@/lib/scForcesEngine";
import type { SCInputs, SCResults } from "@/lib/scForcesEngine";
import { InputPanel } from "./sc-forces/InputPanel";
import { ResultsDashboard } from "./sc-forces/ResultsDashboard";
import { EquationTrace } from "./sc-forces/EquationTrace";
import { GraphsPanel } from "./sc-forces/GraphsPanel";
import { WhatIfPanel } from "./sc-forces/WhatIfPanel";
import { ReportExport } from "./sc-forces/ReportExport";
import { ValidationPanel } from "./sc-forces/ValidationPanel";

type SubTab = "input" | "results" | "trace" | "visual" | "whatif" | "report";

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "input",   label: "Parameters",    icon: Settings2 },
  { id: "results", label: "Results",       icon: BarChart3 },
  { id: "trace",   label: "Equation Trace",icon: FileText },
  { id: "visual",  label: "Visualisation", icon: LineChart },
  { id: "whatif",  label: "What-If",       icon: SlidersHorizontal },
  { id: "report",  label: "Report",        icon: Download },
];

export function SCForcesTab() {
  const [inputs, setInputs] = useState<SCInputs>(getDefaultInputs());
  const [activeTab, setActiveTab] = useState<SubTab>("results");

  // Reactive computation — runs whenever inputs change
  const results: SCResults = useMemo(() => computeSCForces(inputs), [inputs]);

  // Input updater — merges partial updates into inputs
  const updateInput = useCallback(<K extends keyof SCInputs>(key: K, value: SCInputs[K]) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateInputs = useCallback((partial: Partial<SCInputs>) => {
    setInputs(prev => ({ ...prev, ...partial }));
  }, []);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-500" />
            Short-Circuit Mechanical Forces
          </h1>
          <p className="text-[13px] text-slate-400 mt-1.5 max-w-2xl">
            IEC 60865-1 / IEC 61936-1 compliant analysis for flexible conductors. Structural consequence analysis of fault currents on transmission line spans.
          </p>
        </div>
      </div>

      {/* Warnings from engine */}
      {results.warnings.length > 0 && (
        <div className="space-y-1.5">
          {results.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-[#111827] p-1 rounded-xl border border-white/[0.06] w-full overflow-x-auto no-scrollbar">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center whitespace-nowrap shrink-0 gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
              activeTab === t.id
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Quick status bar */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full border ${
          results.clCheck
            ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/8 border-red-500/20 text-red-400"
        }`}>
          {results.clCheck ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          Clearance {results.clCheck ? "OK" : "FAIL"}
        </div>
        <div className="text-slate-500">
          Ftd={( results.Ftd / 1000).toFixed(1)} · Ffd={(results.Ffd / 1000).toFixed(1)} · Fpi={(results.Fpi / 1000).toFixed(1)} kN
        </div>
        <div className="text-slate-500">
          Governing: <span className="text-white font-medium">{(results.Fmax / 1000).toFixed(1)} kN</span>
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-1">
        {activeTab === "input" && (
          <div className="space-y-4">
            <InputPanel inputs={inputs} updateInput={updateInput} updateInputs={updateInputs} />
            <ValidationPanel inputs={inputs} results={results} />
          </div>
        )}
        {activeTab === "results" && <ResultsDashboard inputs={inputs} results={results} />}
        {activeTab === "trace" && <EquationTrace results={results} />}
        {activeTab === "visual" && <GraphsPanel inputs={inputs} results={results} />}
        {activeTab === "whatif" && <WhatIfPanel baseInputs={inputs} baseResults={results} />}
        {activeTab === "report" && <ReportExport inputs={inputs} results={results} />}
      </div>
    </div>
  );
}
