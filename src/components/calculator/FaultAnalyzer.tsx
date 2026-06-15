"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateFaults, FaultResults, FaultInput } from '@/lib/faultSolver';
import { CONDUCTOR_DATABASE, STANDARD_VOLTAGES } from '@/lib/constants';
import { Shield, Sparkles, BookOpen, AlertCircle } from 'lucide-react';

export function FaultAnalyzer() {
  const [voltage, setVoltage] = useState<number>(220);
  const [sourceMva, setSourceMva] = useState<number>(1000);
  const [lineLength, setLineLength] = useState<number>(15);
  const [conductorType, setConductorType] = useState<string>("Zebra");
  const [customR, setCustomR] = useState<number>(0.0687);
  const [customX, setCustomX] = useState<number>(0.320);
  const [zeroSeqRMult, setZeroSeqRMult] = useState<number>(3.0);
  const [zeroSeqXMult, setZeroSeqXMult] = useState<number>(3.0);
  const [cFactor, setCFactor] = useState<number>(1.1);

  const [results, setResults] = useState<FaultResults | null>(null);

  const handleConductorChange = (name: string) => {
    setConductorType(name);
    if (name !== "Custom") {
      const cond = CONDUCTOR_DATABASE[name];
      if (cond) {
        setCustomR(cond.resistance);
        setCustomX(cond.reactance);
      }
    }
  };

  const handleCalculate = () => {
    const inputData: FaultInput = {
      voltageKv: voltage,
      sourceMva: sourceMva,
      lineLengthKm: lineLength,
      lineRPerKm: customR,
      lineXPerKm: customX,
      zeroSeqRMultiplier: zeroSeqRMult,
      zeroSeqXMultiplier: zeroSeqXMult,
      cFactor: cFactor
    };
    const res = calculateFaults(inputData);
    setResults(res);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input parameters */}
        <div className="lg:col-span-2 bg-[#0f1520]/80 border border-white/[0.06] rounded-xl shadow-lg p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 mb-6 border-b border-white/[0.04] pb-4">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Shield className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="text-[13px] font-bold text-slate-200 tracking-wider uppercase">
              IEC 60909 Fault Analysis Parameters
            </h2>
          </div>
          
          <div className="space-y-5">
            {/* Grid row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">System Voltage (kV)</label>
                <select
                  value={voltage}
                  onChange={(e) => setVoltage(parseFloat(e.target.value))}
                  className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                >
                  {STANDARD_VOLTAGES.map(v => (
                    <option key={v} value={v} className="bg-slate-900">{v} kV</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Source MVA (S_sc'')</label>
                <input
                  type="number"
                  value={sourceMva}
                  onChange={(e) => setSourceMva(parseFloat(e.target.value) || 0)}
                  className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Line Length (km)</label>
                <input
                  type="number"
                  value={lineLength}
                  onChange={(e) => setLineLength(parseFloat(e.target.value) || 0)}
                  className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                />
              </div>
            </div>

            {/* Grid row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Conductor Template</label>
                <select
                  value={conductorType}
                  onChange={(e) => handleConductorChange(e.target.value)}
                  className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                >
                  {Object.keys(CONDUCTOR_DATABASE).map(name => (
                    <option key={name} value={name} className="bg-slate-900">{name}</option>
                  ))}
                  <option value="Custom" className="bg-slate-900">Custom Specifications</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Resistance R (Ω/km)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={customR}
                  onChange={(e) => {
                    setCustomR(parseFloat(e.target.value) || 0);
                    setConductorType("Custom");
                  }}
                  className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reactance X (Ω/km)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={customX}
                  onChange={(e) => {
                    setCustomX(parseFloat(e.target.value) || 0);
                    setConductorType("Custom");
                  }}
                  className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                />
              </div>
            </div>

            {/* Grid row 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Zero Seq. R Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={zeroSeqRMult}
                  onChange={(e) => setZeroSeqRMult(parseFloat(e.target.value) || 0)}
                  className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Zero Seq. X Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={zeroSeqXMult}
                  onChange={(e) => setZeroSeqXMult(parseFloat(e.target.value) || 0)}
                  className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">IEC Voltage Factor (c)</label>
                <input
                  type="number"
                  step="0.05"
                  value={cFactor}
                  onChange={(e) => setCFactor(parseFloat(e.target.value) || 0)}
                  className="w-full h-[38px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-[13px] text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                />
              </div>
            </div>

            <div className="pt-3">
              <button 
                onClick={handleCalculate} 
                className="w-full h-[42px] bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold uppercase tracking-wider text-[12px] rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center border border-blue-400/20 cursor-pointer"
              >
                <Sparkles className="h-4 w-4 mr-2 text-blue-100" /> Calculate Fault Levels
              </button>
            </div>
          </div>
        </div>

        {/* Informational Guidelines card */}
        <div className="bg-[#0f1520]/80 border border-white/[0.06] rounded-xl shadow-lg p-6 backdrop-blur-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-4 w-4 text-purple-400" /> 
            <h2 className="text-[12px] font-bold text-slate-200 uppercase tracking-wider">IEC 60909 Standards</h2>
          </div>
          <div className="space-y-4 leading-relaxed flex-1 text-slate-400 text-xs">
            <p>
              <strong className="text-slate-300 font-semibold">IEC 60909</strong> specifies calculation methods for short-circuit currents in three-phase AC systems.
            </p>
            <p>
              The calculated currents are essential for selecting safety relay settings, conductor thermal limits, and grounding switch ratings.
            </p>
            <div className="mt-4 p-4 bg-purple-500/5 rounded-lg border border-purple-500/10 space-y-1.5">
              <span className="font-bold text-purple-400 block uppercase text-[10px] tracking-wider mb-2">IEC Guidance Factors:</span>
              <span className="block text-[11px] text-slate-300 flex items-center gap-1">
                <span className="text-purple-400">•</span> 
                EHV/HV System factor c = 1.10
              </span>
              <span className="block text-[11px] text-slate-300 flex items-start gap-1">
                <span className="text-purple-400">•</span> 
                <span>Short-circuit MVA is computed as: S<sub className="text-[8px]">sc</sub> = √3 × V<sub className="text-[8px]">n</sub> × I<sub className="text-[8px]">sc</sub></span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Tables */}
      {results && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-green-500 tracking-wider uppercase">
                Fault Calculations Result Output
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Grid cards for short-circuit currents */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-300">
                <div className="p-3 bg-slate-950/50 rounded border border-slate-850">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">3-Phase Symmetrical</span>
                  <span className="block text-lg font-bold font-mono text-emerald-400 mt-1">{results.i3Phase.toFixed(3)} kA</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{results.mva3Phase.toFixed(1)} MVA</span>
                </div>
                <div className="p-3 bg-slate-950/50 rounded border border-slate-850">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Line-to-Ground (L-G)</span>
                  <span className="block text-lg font-bold font-mono text-emerald-400 mt-1">{results.iLineToGround.toFixed(3)} kA</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{results.mvaLineToGround.toFixed(1)} MVA</span>
                </div>
                <div className="p-3 bg-slate-950/50 rounded border border-slate-850">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Line-to-Line (L-L)</span>
                  <span className="block text-lg font-bold font-mono text-emerald-400 mt-1">{results.iLineToLine.toFixed(3)} kA</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{results.mvaLineToLine.toFixed(1)} MVA</span>
                </div>
                <div className="p-3 bg-slate-950/50 rounded border border-slate-850">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Line-to-Line-to-Ground</span>
                  <span className="block text-lg font-bold font-mono text-emerald-400 mt-1">{results.iLineToLineToGround.toFixed(3)} kA</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{results.mvaLineToLineToGround.toFixed(1)} MVA</span>
                </div>
              </div>

              {/* Impedance Table */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Sequence Impedance Matrix Calculations</h4>
                <div className="overflow-x-auto green-scrollbar">
                  <table className="w-full text-left border-collapse text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="py-2">Component</th>
                        <th className="py-2">Resistance R (Ω)</th>
                        <th className="py-2">Reactance X (Ω)</th>
                        <th className="py-2 text-right">Magnitude |Z| (Ω)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-800/40">
                        <td className="py-2 font-semibold">Equivalent Source Impedance ($Z_Q$)</td>
                        <td className="py-2 font-mono">{results.zSource.r.toFixed(4)} Ω</td>
                        <td className="py-2 font-mono">{results.zSource.x.toFixed(4)} Ω</td>
                        <td className="py-2 text-right font-mono font-semibold text-blue-400">{results.zSource.mag.toFixed(4)} Ω</td>
                      </tr>
                      <tr className="border-b border-slate-800/40">
                        <td className="py-2 font-semibold">Line Impedance (Positive Sequence)</td>
                        <td className="py-2 font-mono">{results.zLinePositive.r.toFixed(4)} Ω</td>
                        <td className="py-2 font-mono">{results.zLinePositive.x.toFixed(4)} Ω</td>
                        <td className="py-2 text-right font-mono font-semibold text-blue-400">{results.zLinePositive.mag.toFixed(4)} Ω</td>
                      </tr>
                      <tr className="border-b border-slate-800/40">
                        <td className="py-2 font-semibold">Line Impedance (Zero Sequence)</td>
                        <td className="py-2 font-mono">{results.zLineZero.r.toFixed(4)} Ω</td>
                        <td className="py-2 font-mono">{results.zLineZero.x.toFixed(4)} Ω</td>
                        <td className="py-2 text-right font-mono font-semibold text-blue-400">{results.zLineZero.mag.toFixed(4)} Ω</td>
                      </tr>
                      <tr className="border-b border-slate-800/40 font-bold bg-slate-950/20">
                        <td className="py-2 text-emerald-400">Total Positive Sequence at Fault ($Z_1$)</td>
                        <td className="py-2 font-mono">{results.zTotalPositive.r.toFixed(4)} Ω</td>
                        <td className="py-2 font-mono">{results.zTotalPositive.x.toFixed(4)} Ω</td>
                        <td className="py-2 text-right font-mono text-emerald-400">{results.zTotalPositive.mag.toFixed(4)} Ω</td>
                      </tr>
                      <tr className="border-b border-slate-800/40 font-bold bg-slate-950/20">
                        <td className="py-2 text-emerald-400">Total Zero Sequence at Fault ($Z_0$)</td>
                        <td className="py-2 font-mono">{results.zTotalZero.r.toFixed(4)} Ω</td>
                        <td className="py-2 font-mono">{results.zTotalZero.x.toFixed(4)} Ω</td>
                        <td className="py-2 text-right font-mono text-emerald-400">{results.zTotalZero.mag.toFixed(4)} Ω</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance block */}
          <Card className="bg-slate-900 border-slate-800 text-xs">
            <CardHeader>
              <CardTitle className="text-xs font-bold text-amber-500 uppercase flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> Engineering Standards Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-400 leading-relaxed">
                Calculations are checked against standard utility audit compliance checklists:
              </p>
              <div className="space-y-2">
                {results.clauses.map((clause, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950/40 rounded border border-slate-850/80 leading-relaxed text-slate-300">
                    {clause}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
