"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bus, Branch, runNewtonRaphsonLoadFlow, LoadFlowResult } from '@/lib/loadFlowSolver';
import { Zap, Play, Plus, Trash, Network, Info } from 'lucide-react';

const INITIAL_BUSES: Bus[] = [
  { id: 1, name: "Bus 1 (Slack)", type: "Slack", v: 1.05, theta: 0, pGen: 0, qGen: 0, pLoad: 0, qLoad: 0, baseKv: 220 },
  { id: 2, name: "Bus 2 (PV Gen)", type: "PV", v: 1.04, theta: 0, pGen: 200, qGen: 0, pLoad: 0, qLoad: 0, baseKv: 220 },
  { id: 3, name: "Bus 3 (PQ Load)", type: "PQ", v: 1.0, theta: 0, pGen: 0, qGen: 0, pLoad: 250, qLoad: 100, baseKv: 220 }
];

const INITIAL_BRANCHES: Branch[] = [
  { id: 1, fromBus: 1, toBus: 2, r: 0.02, x: 0.06, b: 0.0 },
  { id: 2, fromBus: 1, toBus: 3, r: 0.08, x: 0.24, b: 0.0 },
  { id: 3, fromBus: 2, toBus: 3, r: 0.06, x: 0.18, b: 0.0 }
];

export function LoadFlowAnalyzer() {
  const [buses, setBuses] = useState<Bus[]>(INITIAL_BUSES);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [baseMva, setBaseMva] = useState<number>(100);
  const [tolerance, setTolerance] = useState<number>(0.0001);
  const [maxIter, setMaxIter] = useState<number>(20);
  const [results, setResults] = useState<LoadFlowResult | null>(null);

  const handleAddBus = () => {
    const nextId = buses.length > 0 ? Math.max(...buses.map(b => b.id)) + 1 : 1;
    setBuses([...buses, {
      id: nextId,
      name: `Bus ${nextId}`,
      type: "PQ",
      v: 1.0,
      theta: 0,
      pGen: 0,
      qGen: 0,
      pLoad: 50,
      qLoad: 20,
      baseKv: 220
    }]);
  };

  const handleRemoveBus = (id: number) => {
    setBuses(buses.filter(b => b.id !== id));
    setBranches(branches.filter(br => br.fromBus !== id && br.toBus !== id));
  };

  const handleUpdateBus = (id: number, key: keyof Bus, value: any) => {
    setBuses(buses.map(b => b.id === id ? { ...b, [key]: value } : b));
  };

  const handleAddBranch = () => {
    const nextId = branches.length > 0 ? Math.max(...branches.map(br => br.id)) + 1 : 1;
    if (buses.length < 2) return;
    setBranches([...branches, {
      id: nextId,
      fromBus: buses[0].id,
      toBus: buses[1].id,
      r: 0.05,
      x: 0.15,
      b: 0.0
    }]);
  };

  const handleRemoveBranch = (id: number) => {
    setBranches(branches.filter(br => br.id !== id));
  };

  const handleUpdateBranch = (id: number, key: keyof Branch, value: any) => {
    setBranches(branches.map(br => br.id === id ? { ...br, [key]: value } : br));
  };

  const handleSolve = () => {
    try {
      const solved = runNewtonRaphsonLoadFlow(buses, branches, baseMva, maxIter, tolerance);
      setResults(solved);
    } catch (err: any) {
      alert(err.message || "Convergence failed. Please check parameters.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[#0f1520]/80 border border-white/[0.06] rounded-xl shadow-lg p-6 backdrop-blur-sm overflow-hidden flex flex-col">
          <div className="flex flex-row items-center justify-between mb-6 border-b border-white/[0.04] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Network className="h-4 w-4 text-blue-400" />
              </div>
              <h2 className="text-[13px] font-bold text-slate-200 tracking-wider uppercase">
                Buses Configurator
              </h2>
            </div>
            <button onClick={handleAddBus} className="whitespace-nowrap shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-[0_0_10px_rgba(37,99,235,0.2)]">
              <Plus className="h-3.5 w-3.5" /> Add Bus
            </button>
          </div>
          <div className="overflow-x-auto green-scrollbar flex-1">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2 px-1">Bus ID</th>
                  <th className="py-2 px-2">Name</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2">V (p.u.) / angle</th>
                  <th className="py-2 px-2">Gen (MW)</th>
                  <th className="py-2 px-2">Load (MW / MVAR)</th>
                  <th className="py-2 px-2">Base (kV)</th>
                  <th className="py-2 px-1 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {buses.map(bus => (
                  <tr key={bus.id} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                    <td className="py-2 px-1 font-mono text-blue-400">#{bus.id}</td>
                    <td className="py-2 px-2">
                      <input
                        value={bus.name}
                        onChange={(e) => handleUpdateBus(bus.id, 'name', e.target.value)}
                        className="h-7 w-28 bg-slate-900/50 border border-slate-800/80 rounded px-2 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={bus.type}
                        onChange={(e) => handleUpdateBus(bus.id, 'type', e.target.value)}
                        className="h-7 bg-slate-900/50 border border-slate-800/80 rounded px-1 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all"
                      >
                        <option value="Slack">Slack</option>
                        <option value="PV">PV Gen</option>
                        <option value="PQ">PQ Load</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={bus.v}
                        disabled={bus.type === 'PQ'}
                        onChange={(e) => handleUpdateBus(bus.id, 'v', parseFloat(e.target.value) || 0)}
                        className="h-7 w-16 bg-slate-900/50 border border-slate-800/80 rounded px-2 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all disabled:opacity-50"
                        placeholder="V p.u."
                      />
                      {bus.type === 'Slack' && <span className="text-slate-500">0°</span>}
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        value={bus.pGen}
                        disabled={bus.type === 'PQ'}
                        onChange={(e) => handleUpdateBus(bus.id, 'pGen', parseFloat(e.target.value) || 0)}
                        className="h-7 w-16 bg-slate-900/50 border border-slate-800/80 rounded px-2 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all disabled:opacity-50"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={bus.pLoad}
                          onChange={(e) => handleUpdateBus(bus.id, 'pLoad', parseFloat(e.target.value) || 0)}
                          className="h-7 w-16 bg-slate-900/50 border border-slate-800/80 rounded px-2 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all"
                          placeholder="P Load"
                        />
                        <input
                          type="number"
                          value={bus.qLoad}
                          onChange={(e) => handleUpdateBus(bus.id, 'qLoad', parseFloat(e.target.value) || 0)}
                          className="h-7 w-16 bg-slate-900/50 border border-slate-800/80 rounded px-2 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all"
                          placeholder="Q Load"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        value={bus.baseKv}
                        onChange={(e) => handleUpdateBus(bus.id, 'baseKv', parseFloat(e.target.value) || 0)}
                        className="h-7 w-16 bg-slate-900/50 border border-slate-800/80 rounded px-2 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all"
                      />
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button onClick={() => handleRemoveBus(bus.id)} className="text-red-500 hover:text-red-400">
                        <Trash className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Settings */}
        <div className="bg-[#0f1520]/80 border border-white/[0.06] rounded-xl shadow-lg p-6 backdrop-blur-sm flex flex-col">
          <div className="flex items-center gap-2.5 mb-6 border-b border-white/[0.04] pb-4">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Zap className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="text-[13px] font-bold text-slate-200 tracking-wider uppercase">
              Solver Parameters
            </h2>
          </div>
          <div className="space-y-5 text-xs flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">System MVA Base</label>
                <input
                  type="number"
                  value={baseMva}
                  onChange={(e) => setBaseMva(parseFloat(e.target.value) || 100)}
                  className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Convergence Tol</label>
                <input
                  type="number"
                  step="0.00001"
                  value={tolerance}
                  onChange={(e) => setTolerance(parseFloat(e.target.value) || 0.0001)}
                  className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Max Iterations</label>
              <input
                type="number"
                value={maxIter}
                onChange={(e) => setMaxIter(parseInt(e.target.value) || 20)}
                className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
              />
            </div>
            <div className="pt-2 mt-auto">
              <button onClick={handleSolve} className="w-full h-[42px] bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold uppercase tracking-wider text-[12px] rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center border border-blue-400/20 cursor-pointer">
                <Play className="h-4 w-4 mr-2 text-blue-100" /> Solve Power Flow
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Branches Configurator */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[#0f1520]/80 border border-white/[0.06] rounded-xl shadow-lg p-6 backdrop-blur-sm overflow-hidden flex flex-col">
          <div className="flex flex-row items-center justify-between mb-6 border-b border-white/[0.04] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Network className="h-4 w-4 text-blue-400" />
              </div>
              <h2 className="text-[13px] font-bold text-slate-200 tracking-wider uppercase">
                Transmission Lines / Branches Configurator
              </h2>
            </div>
            <button onClick={handleAddBranch} className="whitespace-nowrap shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-[0_0_10px_rgba(37,99,235,0.2)]">
              <Plus className="h-3.5 w-3.5" /> Add Line
            </button>
          </div>
          <div className="overflow-x-auto green-scrollbar flex-1">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2 px-1">ID</th>
                  <th className="py-2 px-2">From Bus</th>
                  <th className="py-2 px-2">To Bus</th>
                  <th className="py-2 px-2">Resistance R (p.u.)</th>
                  <th className="py-2 px-2">Reactance X (p.u.)</th>
                  <th className="py-2 px-2">Susceptance B (p.u.)</th>
                  <th className="py-2 px-1 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(br => (
                  <tr key={br.id} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                    <td className="py-2 px-1 font-mono text-blue-400">Line {br.id}</td>
                    <td className="py-2 px-2">
                      <select
                        value={br.fromBus}
                        onChange={(e) => handleUpdateBranch(br.id, 'fromBus', parseInt(e.target.value))}
                        className="h-7 bg-slate-900/50 border border-slate-800/80 rounded px-1 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all"
                      >
                        {buses.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={br.toBus}
                        onChange={(e) => handleUpdateBranch(br.id, 'toBus', parseInt(e.target.value))}
                        className="h-7 bg-slate-900/50 border border-slate-800/80 rounded px-1 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all"
                      >
                        {buses.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.001"
                        value={br.r}
                        onChange={(e) => handleUpdateBranch(br.id, 'r', parseFloat(e.target.value) || 0)}
                        className="h-7 w-24 bg-slate-900/50 border border-slate-800/80 rounded px-2 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.001"
                        value={br.x}
                        onChange={(e) => handleUpdateBranch(br.id, 'x', parseFloat(e.target.value) || 0)}
                        className="h-7 w-24 bg-slate-900/50 border border-slate-800/80 rounded px-2 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.001"
                        value={br.b}
                        onChange={(e) => handleUpdateBranch(br.id, 'b', parseFloat(e.target.value) || 0)}
                        className="h-7 w-24 bg-slate-900/50 border border-slate-800/80 rounded px-2 text-xs text-white focus:border-blue-500/50 focus:outline-none transition-all"
                      />
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button onClick={() => handleRemoveBranch(br.id)} className="text-red-500 hover:text-red-400">
                        <Trash className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Informative card */}
        <div className="bg-[#0f1520]/80 border border-white/[0.06] rounded-xl shadow-lg p-6 backdrop-blur-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-purple-400" /> 
            <h2 className="text-[12px] font-bold text-slate-200 uppercase tracking-wider">Mesh Analysis Guidance</h2>
          </div>
          <div className="space-y-4 leading-relaxed flex-1 text-slate-400 text-xs">
            <p>
              <strong className="text-slate-300 font-semibold">Newton-Raphson Method</strong> converges quadratically for transmission grids.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                <span><strong className="text-slate-300 font-semibold">Slack Bus</strong>: Defines the reference voltage magnitude and angle (0°).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                <span><strong className="text-slate-300 font-semibold">PV Bus (Gen)</strong>: Controls active power generation and voltage magnitude.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                <span><strong className="text-slate-300 font-semibold">PQ Bus (Load)</strong>: Pulls fixed active (P) and reactive (Q) load.</span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-purple-500/5 rounded-lg border border-purple-500/10 space-y-1.5">
              <span className="block text-[10px] text-purple-300 italic">All system parameters are automatically converted to per-unit (p.u.) for calculations based on System MVA Base.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div className="bg-[#0f1520]/80 border border-white/[0.06] rounded-xl shadow-lg p-6 backdrop-blur-sm overflow-hidden flex flex-col mt-6">
          <div className="flex items-center justify-between mb-6 border-b border-white/[0.04] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <Zap className="h-4 w-4 text-green-400" />
              </div>
              <h2 className="text-[13px] font-bold text-slate-200 tracking-wider uppercase">
                Calculation Output Summary
              </h2>
            </div>
            <div className={`text-[11px] px-3 py-1.5 rounded-lg font-bold border ${results.converged ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {results.converged ? `CONVERGED IN ${results.iterations} ITERATIONS` : 'DIVERGED'}
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Bus Voltage Profiles</h4>
              <div className="overflow-x-auto green-scrollbar">
                <table className="w-full text-left border-collapse text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2">Bus Name</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Voltage Magnitude (p.u.)</th>
                      <th className="py-2">Voltage (kV)</th>
                      <th className="py-2">Angle (deg)</th>
                      <th className="py-2 text-right">Generation (MW / MVAR)</th>
                      <th className="py-2 text-right">Load (MW / MVAR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.buses.map(bus => (
                      <tr key={bus.id} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                        <td className="py-2 font-semibold text-white">{bus.name}</td>
                        <td className="py-2"><span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-bold uppercase">{bus.type}</span></td>
                        <td className="py-2 font-mono text-emerald-400 font-semibold">{bus.v.toFixed(4)} p.u.</td>
                        <td className="py-2 font-mono text-slate-300">{(bus.v * bus.baseKv).toFixed(2)} kV</td>
                        <td className="py-2 font-mono text-blue-400 font-semibold">{bus.theta.toFixed(2)}°</td>
                        <td className="py-2 text-right font-mono text-green-400">{bus.pGen} MW / {bus.qGen} MVAR</td>
                        <td className="py-2 text-right font-mono text-slate-400">{bus.pLoad} MW / {bus.qLoad} MVAR</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Line Power Flows & Active Losses</h4>
              <div className="overflow-x-auto green-scrollbar">
                <table className="w-full text-left border-collapse text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2">Line ID</th>
                      <th className="py-2">From Bus</th>
                      <th className="py-2">To Bus</th>
                      <th className="py-2 text-right">Power Sent (MW / MVAR)</th>
                      <th className="py-2 text-right">Power Received (MW / MVAR)</th>
                      <th className="py-2 text-right text-amber-500">Active Losses (MW)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.branches.map(br => (
                      <tr key={br.id} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                        <td className="py-2 font-semibold text-white">Line {br.id}</td>
                        <td className="py-2 text-slate-300">Bus {br.fromBus}</td>
                        <td className="py-2 text-slate-300">Bus {br.toBus}</td>
                        <td className="py-2 text-right font-mono text-emerald-400">{br.pFromTo} MW / {br.qFromTo} MVAR</td>
                        <td className="py-2 text-right font-mono text-slate-400">{-br.pToFrom} MW / {-br.qToFrom} MVAR</td>
                        <td className="py-2 text-right font-mono text-amber-400 font-bold">{br.losses} MW</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
