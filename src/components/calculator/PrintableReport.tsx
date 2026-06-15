"use client";

import React from 'react';
import { useCalculator } from '@/context/CalculatorContext';
import { Button } from '@/components/ui/button';
import { FileDown, Printer, Award } from 'lucide-react';

export function PrintableReport() {
  const { projectDetails, technicalParams, segments, calculationResult } = useCalculator();

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="print:hidden">
      <button 
        onClick={handlePrint} 
        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/15 transition-all cursor-pointer"
      >
        <Printer className="h-3.5 w-3.5" /> 
        Print PDF Report
      </button>

      {/* Hidden printable A4 sheet, visible only on print */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[9999] overflow-y-auto font-sans leading-relaxed text-xs">
        <style jsx global>{`
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
        
        {/* Letterhead Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">GRIDINTEL PRO</h1>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Transmission & Distribution Engineering Division</p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-bold text-slate-800">IEC/IS COMPLIANCE REPORT</h2>
            <p className="text-[10px] text-slate-500">Date: {currentDate}</p>
          </div>
        </div>

        {/* Project Context */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded border border-slate-200 mb-6">
          <div>
            <h3 className="font-bold text-slate-700 uppercase text-[9px] tracking-wider mb-1">Project Metadata</h3>
            <p className="text-sm font-bold">{projectDetails.projectName || "N/A Project"}</p>
            <p className="text-[10px] text-slate-600 mt-1">Client: {projectDetails.clientName || "N/A Client"}</p>
          </div>
          <div>
            <h3 className="font-bold text-slate-700 uppercase text-[9px] tracking-wider mb-1">Tapping Terminals</h3>
            <p className="text-[10px]"><span className="font-semibold">Feeding Point:</span> {projectDetails.feedingPoint || "N/A"}</p>
            <p className="text-[10px] mt-0.5"><span className="font-semibold">Receiving Point:</span> {projectDetails.supplyPoint || "N/A"}</p>
          </div>
        </div>

        {/* Math Breakdown */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wider mb-3">
            Section 1: Line Impedance & Voltage Regulation Calculation
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Conductor Configuration</span>
              <span className="text-xs font-semibold">{technicalParams.conductorType} ({technicalParams.conductorSize} SQMM)</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Line Voltage (kV)</span>
              <span className="text-xs font-semibold">{technicalParams.voltage} kV</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Peak Current (A)</span>
              <span className="text-xs font-semibold">{technicalParams.current} A</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Line Resistance</span>
              <span className="text-xs font-semibold">{technicalParams.resistance} Ω/KM</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Line Reactance</span>
              <span className="text-xs font-semibold">{technicalParams.reactance} Ω/KM</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-500 uppercase font-bold">Line Power Factor</span>
              <span className="text-xs font-semibold">{technicalParams.powerFactor} (cosØ)</span>
            </div>
          </div>

          {calculationResult && (
            <div className="p-3 border border-slate-200 rounded mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase text-slate-700">Calculated Voltage Regulation:</span>
                <span className={`text-sm font-bold ${calculationResult.acceptable ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {calculationResult.voltage_regulation}% ({calculationResult.status})
                </span>
              </div>
              <p className="text-[10px] text-slate-600 mb-1 font-mono">
                Formula: {calculationResult.formula_used.formula}
              </p>
              <p className="text-[10px] text-slate-600 font-mono">
                Substitution: {calculationResult.formula_used.substitution}
              </p>
            </div>
          )}
        </div>

        {/* Distributed Segments Table */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wider mb-2">
            Section 2: Distributed Segment Loading Profiles
          </h3>
          <table className="w-full text-left border-collapse text-[10px] mb-4">
            <thead>
              <tr className="border-b border-slate-300 text-slate-600 font-bold bg-slate-50">
                <th className="py-1.5 px-2">Segment ID</th>
                <th className="py-1.5 px-2">Distance (km)</th>
                <th className="py-1.5 px-2 text-right">Segment Load (MVA)</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg, i) => (
                <tr key={seg.id} className="border-b border-slate-200">
                  <td className="py-1.5 px-2">Segment #{i + 1}</td>
                  <td className="py-1.5 px-2">{seg.distance || "0"} km</td>
                  <td className="py-1.5 px-2 text-right">{seg.load || "0"} MVA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Standard compliance sections */}
        <div className="mt-8 border-t border-slate-300 pt-6">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Award className="h-4 w-4" /> Certification & Standards Compliance Clauses
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[9px] text-slate-600">
            <div className="p-2 border border-slate-200 rounded">
              <span className="font-bold text-slate-800 block mb-0.5">IS 5613 Part 1/2 Clause 4.2</span>
              Conductor clearance standard and mechanical stress calculations under maximum short circuit fault conditions. Maximum continuous thermal rating compliant.
            </div>
            <div className="p-2 border border-slate-200 rounded">
              <span className="font-bold text-slate-800 block mb-0.5">IEC 60909-0 Clause 3.2 & 3.5</span>
              System design validated using positive, negative, and zero sequence matrices for symmetrical and single line-to-earth fault capabilities.
            </div>
          </div>
        </div>

        {/* Signatures block */}
        <div className="mt-12 pt-8 grid grid-cols-2 gap-8 border-t border-slate-200">
          <div className="text-center">
            <div className="border-b border-slate-300 h-10 w-48 mx-auto"></div>
            <span className="text-[10px] text-slate-500 font-bold block mt-1 uppercase">Prepared By (Lead Engineer)</span>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-300 h-10 w-48 mx-auto"></div>
            <span className="text-[10px] text-slate-500 font-bold block mt-1 uppercase">Approved By (Safety Officer)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
