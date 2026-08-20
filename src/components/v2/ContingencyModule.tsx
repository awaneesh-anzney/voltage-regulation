"use client";

import { useState, useMemo } from "react";
import {
  Shield, Play, CheckCircle2, XCircle, AlertTriangle, ArrowRightLeft
} from "lucide-react";
import { runNewtonRaphsonLoadFlow } from "@/lib/loadFlowSolver";
import type { Bus, Branch, LoadFlowResult } from "@/lib/loadFlowSolver";

interface ContingencyCase {
  outageType: "branch";
  outageIndex: number;
  label: string;
  result: LoadFlowResult | null;
  minV: number;
  maxV: number;
  totalLosses: number;
  pass: boolean;
}

export function ContingencyCanvas({ buses, branches, baseMva }: {
  buses: Bus[]; branches: Branch[]; baseMva: number;
}) {
  const [cases, setCases] = useState<ContingencyCase[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runContingency = () => {
    setIsRunning(true);
    const results: ContingencyCase[] = [];

    // Base case
    const baseResult = runNewtonRaphsonLoadFlow([...buses.map(b => ({ ...b }))], [...branches.map(b => ({ ...b }))], baseMva);

    // N-1: remove each branch one at a time
    for (let i = 0; i < branches.length; i++) {
      const reducedBranches = branches.filter((_, idx) => idx !== i);
      const busCopy = buses.map(b => ({ ...b, theta: 0 })); // Reset angles
      // Re-id branches
      const reBranched = reducedBranches.map((b, idx) => ({ ...b, id: idx }));

      let result: LoadFlowResult | null = null;
      try {
        result = runNewtonRaphsonLoadFlow(busCopy, reBranched, baseMva);
      } catch {
        result = null;
      }

      const fromName = buses[branches[i].fromBus]?.name || `Bus ${branches[i].fromBus}`;
      const toName = buses[branches[i].toBus]?.name || `Bus ${branches[i].toBus}`;

      const minV = result ? Math.min(...result.buses.map(b => b.v)) : 0;
      const maxV = result ? Math.max(...result.buses.map(b => b.v)) : 0;
      const totalLosses = result ? result.branches.reduce((a, b) => a + b.losses, 0) : 0;
      const pass = result !== null && result.converged && minV >= 0.90 && maxV <= 1.10;

      results.push({
        outageType: "branch",
        outageIndex: i,
        label: `Outage: ${fromName} — ${toName}`,
        result,
        minV,
        maxV,
        totalLosses,
        pass,
      });
    }

    setCases(results);
    setIsRunning(false);
  };

  const passCount = cases.filter(c => c.pass).length;
  const failCount = cases.filter(c => !c.pass).length;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          N-1 Contingency Analysis
        </h1>
        <p className="text-[13px] text-slate-400 mt-1.5 max-w-2xl">
          Single outage reliability assessment. Simulates removal of each branch and checks if the remaining network can sustain load within voltage limits (±10% p.u.).
        </p>
      </div>

      {/* Info + Run */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/15">
        <div className="text-[12px] text-slate-300 font-mono">
          {buses.length} Buses · {branches.length} Branches · {branches.length} Contingency Cases
        </div>
        <button onClick={runContingency}
          disabled={isRunning || branches.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20">
          <Play className="w-3.5 h-3.5" />
          {isRunning ? "Running..." : "Run N-1 Analysis"}
        </button>
      </div>

      {cases.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Shield className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-[13px]">Configure network in <span className="text-blue-400 font-semibold">Load Flow</span> module, then click <span className="text-blue-400 font-semibold">Run N-1 Analysis</span></p>
          </div>
        </div>
      )}

      {cases.length > 0 && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Cases</div>
              <div className="text-[24px] font-mono font-bold mt-1 text-white">{cases.length}</div>
            </div>
            <div className="bg-[#111827] border border-emerald-500/15 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">N-1 Secure</div>
              <div className="text-[24px] font-mono font-bold mt-1 text-emerald-400">{passCount}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{((passCount / cases.length) * 100).toFixed(0)}% pass rate</div>
            </div>
            <div className="bg-[#111827] border border-red-500/15 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Violations</div>
              <div className={`text-[24px] font-mono font-bold mt-1 ${failCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{failCount}</div>
              {failCount > 0 && <div className="text-[11px] text-red-400/70 mt-0.5">Requires attention</div>}
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-[#111827] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.04]">
              <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Contingency Results</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#0a0f18]">
                    {["Outage", "Converged", "Min V (p.u.)", "Max V (p.u.)", "Losses (MW)", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c, i) => (
                    <tr key={i} className={`border-t border-white/[0.04] hover:bg-white/[0.02] ${!c.pass ? 'bg-red-500/[0.03]' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-white flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                        {c.label}
                      </td>
                      <td className="px-4 py-2.5">
                        {c.result?.converged ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </td>
                      <td className={`px-4 py-2.5 font-mono font-semibold ${c.minV < 0.90 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {c.minV.toFixed(4)}
                      </td>
                      <td className={`px-4 py-2.5 font-mono font-semibold ${c.maxV > 1.10 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {c.maxV.toFixed(4)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-amber-400">{c.totalLosses.toFixed(3)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          c.pass ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                        }`}>
                          {c.pass ? 'N-1 SECURE' : 'VIOLATION'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
