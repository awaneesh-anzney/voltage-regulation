"use client";

import { useState } from "react";
import { Download, FileText, FileSpreadsheet, FileJson, Activity, ShieldAlert, Cable, Database } from "lucide-react";
import type { SCInputs, SCResults } from "@/lib/scForcesEngine";
import type { FaultInput, FaultResults } from "@/lib/faultSolver";
import type { SagTensionInputs, SagTensionResults } from "@/lib/sagTensionEngine";

interface ReportModuleProps {
  project: any;
  scResults: SCResults | null;
  faultResults: FaultResults | null;
  sagResults: SagTensionResults | null;
}

export function ReportModule({ project, scResults, faultResults, sagResults }: ReportModuleProps) {
  const [activeReport, setActiveReport] = useState<"dashboard" | "scforces" | "fault" | "sagtension">("dashboard");

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `gridintel_project_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handlePrintSCForces = () => {
    if (scResults) {
      setActiveReport("scforces");
      setTimeout(() => {
        window.print();
      }, 500);
    } else {
      alert("No SC Forces results available to print.");
    }
  };

  const handlePrintFault = () => {
    if (faultResults) {
      setActiveReport("fault");
      setTimeout(() => {
        window.print();
      }, 500);
    } else {
      alert("No Fault Analysis results available to print.");
    }
  };

  const handlePrintSagTension = () => {
    if (sagResults) {
      setActiveReport("sagtension");
      setTimeout(() => {
        window.print();
      }, 500);
    } else {
      alert("No Sag-Tension results available to print.");
    }
  };

  if (activeReport === "scforces" && scResults) {
    return <SCForcesReportTemplate inputs={project.scInputs} results={scResults} onBack={() => setActiveReport("dashboard")} />;
  }
  if (activeReport === "fault" && faultResults) {
    return <FaultReportTemplate inputs={project.faultInputs} results={faultResults} onBack={() => setActiveReport("dashboard")} />;
  }
  if (activeReport === "sagtension" && sagResults) {
    return <SagTensionReportTemplate inputs={project.sagInputs} results={sagResults} onBack={() => setActiveReport("dashboard")} />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-20 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-500" />
          Report Builder & Export
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1.5 max-w-2xl">
          Generate formal engineering documents for individual modules or export the complete project database.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Project Dump */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Project Database Dump</h3>
              <p className="text-[11px] text-muted-foreground">JSON Format</p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground/80 flex-1 mb-6">
            Export all parameters, history states, and module configurations across the entire GridIntel project. Useful for automation or transferring states.
          </p>
          <button 
            onClick={handleExportJSON}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-bold text-[13px] hover:bg-blue-600 transition-colors cursor-pointer"
          >
            <FileJson className="w-4 h-4" />
            Download Full Project JSON
          </button>
        </div>

        {/* SC Forces Report */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">SC Forces (IEC 60865-1)</h3>
              <p className="text-[11px] text-muted-foreground">A4 PDF Report</p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground/80 flex-1 mb-6">
            Generate a formal 7-page engineering document detailing short-circuit mechanical forces, air clearances, and full equation tracing.
          </p>
          <button 
            onClick={handlePrintSCForces}
            disabled={!scResults}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-[13px] hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            {scResults ? "Generate & Print PDF" : "Missing Calculations"}
          </button>
        </div>

        {/* Fault Analysis Report */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Fault Analysis (IEC 60909)</h3>
                <p className="text-[11px] text-muted-foreground">A4 PDF Report</p>
              </div>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground/80 flex-1 mb-6">
            Detailed symmetrical and asymmetrical fault current calculations, sequence networks, and equipment ratings.
          </p>
          <button 
            onClick={handlePrintFault}
            disabled={!faultResults}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-[13px] hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            {faultResults ? "Generate & Print PDF" : "Missing Calculations"}
          </button>
        </div>

        {/* Sag-Tension Report */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
                <Cable className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Sag-Tension Profile</h3>
                <p className="text-[11px] text-muted-foreground">A4 PDF Report</p>
              </div>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground/80 flex-1 mb-6">
            Stringing charts, tension profiles under various weather conditions (wind, ice), and safety clearances.
          </p>
          <button 
            onClick={handlePrintSagTension}
            disabled={!sagResults}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 text-white font-bold text-[13px] hover:bg-teal-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            {sagResults ? "Generate & Print PDF" : "Missing Calculations"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SC Forces PDF Print Template ───
// This component re-uses the V1 print styles but is integrated into V2.

function SCForcesReportTemplate({ inputs, results, onBack }: { inputs: SCInputs, results: SCResults, onBack: () => void }) {
  const {
    lc, ns, lv, mpc, Fst, k, Fprime, r, delta1_deg, fes, T, Tres, N, zeta,
    ratio, deltaend_deg, deltam_deg, phi, psi, Ftd1, epsilonela, epsilonth,
    CD, CF, fed, delta1_dropper_deg, delta_eff_deg, phi1, psi1, Ftd2, Ftd,
    Ffd, bh, amin, Fpi, Fmax
  } = results;

  const calculationSteps = [
    { num: 1, param: "Effective conductor length", html: "l<sub>c</sub> = l − 2l<sub>i</sub> − D<sub>g</sub>", val: `${lc.toFixed(3)} m`, ref: "Eq. 1" },
    { num: 2, param: "Number of spacers", html: "n<sub>s</sub> = l<sub>c</sub>/l<sub>s</sub>", val: `${ns}`, ref: "-" },
    { num: 3, param: "Dropper cord length", html: "l<sub>v</sub> = mean(√(h²+w²), h+w)", val: `${lv.toFixed(3)} m`, ref: "-" },
    { num: 4, param: "Conductor mass/unit length", html: "m'<sub>c</sub> = m<sub>c</sub> + ...", val: `${mpc.toFixed(3)} kg/m`, ref: "Eq. 5" },
    { num: 5, param: "Static tensile force", html: "F<sub>st</sub> = F<sub>st,kg</sub> × g", val: `${(Fst/1000).toFixed(3)} kN`, ref: "-" },
    { num: 6, param: "Peak SC factor", html: "k = 1.02+0.98·e<sup>-3/(X/R)</sup>", val: `${k.toFixed(3)}`, ref: "IEC 60909" },
    { num: 7, param: "EM force/unit length", html: "F' = (μ₀/2π)·0.75·(I²/a)·(l<sub>c</sub>/l)", val: `${Fprime.toFixed(3)} N/m`, ref: "Eq. 19a" },
    { num: 8, param: "Load parameter", html: "r = F'/(n<sub>c</sub>·m'<sub>c</sub>·g)", val: `${r.toFixed(3)}`, ref: "Eq. 21" },
    { num: 9, param: "Direction of resultant", html: "δ₁ = atan(r)", val: `${delta1_deg.toFixed(3)}°`, ref: "-" },
    { num: 10, param: "Equivalent static sag", html: "f<sub>es</sub> = (n<sub>c</sub>·m'<sub>c</sub>·g·l²)/(8·F<sub>st</sub>)", val: `${fes.toFixed(3)} m`, ref: "Eq. 22" },
    { num: 11, param: "Period of oscillation", html: "T = 2π·√(0.8·f<sub>es</sub>/g)", val: `${T.toFixed(3)} s`, ref: "Eq. 23" },
    { num: 12, param: "Period during SC", html: "T<sub>res</sub> = T / [⁴√(1+r²) × ...]", val: `${Tres.toFixed(3)} s`, ref: "Eq. 24" },
    { num: 13, param: "Stiffness norm", html: "N = 1/(S·l) + 1/(n<sub>c</sub>·E<sub>eff</sub>·A<sub>s</sub>)", val: `${N.toExponential(3)} 1/N`, ref: "Eq. 25" },
    { num: 14, param: "Stress factor", html: "ζ = (n<sub>c</sub>·m'<sub>c</sub>·g·l)²/(24·N·F<sub>st</sub>³)", val: `${zeta.toFixed(3)}`, ref: "Eq. 28" },
    { num: 15, param: "T<sub>k1</sub>/T<sub>res</sub> ratio", html: "ratio = T<sub>k1,eff</sub> / T<sub>res</sub>", val: `${ratio.toFixed(3)}`, ref: "-" },
    { num: 16, param: "Swing angle at end", html: "δ<sub>end</sub>", val: `${deltaend_deg.toFixed(3)}°`, ref: "Eq. 29" },
    { num: 17, param: "Max swing angle", html: "δ<sub>m</sub>", val: `${deltam_deg.toFixed(3)}°`, ref: "Eq. 31" },
    { num: 18, param: "Load parameter (no dropper)", html: "φ", val: `${phi.toFixed(3)}`, ref: "Eq. 32" },
    { num: 19, param: "Dynamic factor", html: "ψ", val: `${psi.toFixed(3)}`, ref: "Eq. 33" },
    { num: 20, param: "Tensile force (no dropper)", html: "F<sub>td1</sub> = F<sub>st</sub>·(1+φ·ψ)", val: `${(Ftd1/1000).toFixed(3)} kN`, ref: "Eq. 42a" },
    { num: 21, param: "Elastic expansion", html: "ε<sub>ela</sub> = N·(F<sub>td1</sub>−F<sub>st</sub>)", val: `${epsilonela.toExponential(3)}`, ref: "Eq. 34" },
    { num: 22, param: "Thermal expansion", html: "ε<sub>th</sub>", val: `${epsilonth.toExponential(3)}`, ref: "Eq. 35" },
    { num: 23, param: "CD factor", html: "C<sub>D</sub>", val: `${CD.toFixed(3)}`, ref: "Eq. 36" },
    { num: 24, param: "CF factor", html: "C<sub>F</sub>", val: `${CF.toFixed(3)}`, ref: "Eq. 37" },
    { num: 25, param: "Dynamic sag", html: "f<sub>ed</sub> = C<sub>F</sub>·C<sub>D</sub>·f<sub>es</sub>", val: `${fed.toFixed(3)} m`, ref: "Eq. 38" },
    { num: 26, param: "Dropper-limited swing angle", html: "δ<sub>dropper</sub>", val: `${delta1_dropper_deg.toFixed(3)}°`, ref: "Eq. 39" },
    { num: 27, param: "Effective swing angle", html: "δ = min(δ<sub>dropper</sub>, δ<sub>m</sub>)", val: `${delta_eff_deg.toFixed(3)}°`, ref: "-" },
    { num: 28, param: "Modified load parameter", html: "φ₁", val: `${phi1.toFixed(3)}`, ref: "Eq. 41" },
    { num: 29, param: "Modified dynamic factor", html: "ψ₁", val: `${psi1.toFixed(3)}`, ref: "Eq. 42" },
    { num: 30, param: "Tensile force (with dropper)", html: "F<sub>td2</sub> = F<sub>st</sub>·(1+φ₁·ψ₁)", val: `${(Ftd2/1000).toFixed(3)} kN`, ref: "Eq. 42" },
    { num: 31, param: "Design tensile force", html: "F<sub>td</sub> = max(F<sub>td1</sub>, F<sub>td2</sub>)", val: `${(Ftd/1000).toFixed(3)} kN`, ref: "-" },
    { num: 32, param: "Drop force", html: "F<sub>fd</sub>", val: `${(Ffd/1000).toFixed(3)} kN`, ref: "Eq. 43" },
    { num: 33, param: "Horizontal displacement", html: "b<sub>h</sub>", val: `${bh.toFixed(3)} m`, ref: "Eq. 46" },
    { num: 34, param: "Min air clearance", html: "a<sub>min</sub>", val: `${amin.toFixed(3)} m`, ref: "Eq. 48" },
    { num: 35, param: "Pinch force", html: "F<sub>pi</sub>", val: `${(Fpi/1000).toFixed(3)} kN`, ref: "Eq. 62" },
    { num: 36, param: "Max design force", html: "max(F<sub>td</sub>, F<sub>fd</sub>, F<sub>pi</sub>)", val: `${(Fmax/1000).toFixed(3)} kN`, ref: "-" },
  ];

  return (
    <div className="w-full h-full relative">
      {/* Non-print toolbar */}
      <div className="absolute top-4 right-4 flex items-center gap-3 print:hidden z-10">
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-card border border-border text-[12px] font-bold text-foreground hover:bg-accent transition-colors">
          Back to Dashboard
        </button>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-emerald-500 text-[12px] font-bold text-white hover:bg-emerald-600 transition-colors">
          Print PDF Again
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #report-print-area, #report-print-area * {
            visibility: visible;
          }
          #report-print-area {
            position: relative !important;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          html, body, main, section, div {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          @page {
            size: A4 landscape;
            margin: 12mm 15mm;
          }
          /* Prevent breaking inside content blocks */
          .pdf-table, .calc-block, .result-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          /* Allow natural flow — no forced page-breaks */
          .pdf-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          .pdf-table th, .pdf-table td {
            border: 1px solid #000;
            padding: 5px 10px;
            font-size: 12px;
          }
          .pdf-table th {
            text-align: left;
            font-weight: bold;
          }
          .pdf-table tr td:nth-child(2) {
            text-align: left;
            width: 120px;
          }
          .pdf-table tr td:nth-child(3) {
            width: 60px;
          }
          .pdf-trace-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            break-inside: auto;
          }
          .pdf-trace-table thead {
            display: table-header-group;
          }
          .pdf-trace-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .pdf-trace-table th, .pdf-trace-table td {
            border: 1px solid #000;
            padding: 3px 6px;
            font-size: 10px;
          }
          .pdf-trace-table th {
            text-align: left;
            font-weight: bold;
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .calc-block {
            margin-bottom: 12px;
            font-size: 12px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .calc-title {
            font-weight: bold;
            margin-bottom: 6px;
          }
          .calc-eq {
            margin-bottom: 3px;
            padding-left: 16px;
            font-family: monospace;
          }
          /* Orphan/widow protection */
          p, li, .calc-block {
            orphans: 3;
            widows: 3;
          }
        }
      `}} />

      {/* PDF Layout — Landscape A4 optimized */}
      <div className="bg-card p-12 max-w-[1100px] mx-auto min-h-screen border-x border-b border-border shadow-sm print:border-none print:shadow-none print:max-w-none print:p-0">
        <div id="report-print-area" className="bg-white text-black font-sans w-full max-w-[1100px] mx-auto print:max-w-none">
          
          {/* TITLE */}
          <div className="text-center mb-8 pt-8 print:pt-0">
            <p className="text-sm">Short Circuit Forces Calculation</p>
            <p className="text-sm">As per IEC 60865-1 & IEC 61936-1</p>
            <div className="border-b-2 border-black my-4"></div>
            <h1 className="text-xl font-bold mt-6 mb-4 uppercase">SHORT CIRCUIT FORCES CALCULATION REPORT</h1>
            <p className="text-sm mb-8">Date: {new Date().toLocaleDateString('en-GB')}</p>
          </div>

          <h2 className="text-lg font-bold mb-4 uppercase">1. INPUT PARAMETERS</h2>
          
          {/* Input tables in linear layout for robust printing */}
          <div className="space-y-6">
            <div className="break-inside-avoid">
              <p className="mb-2 text-sm font-semibold">1.1 Basic System Parameters:</p>
              <table className="pdf-table" style={{ maxWidth: '70%' }}>
                <thead>
                  <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
                </thead>
                <tbody>
                  <tr><td>Short Circuit Current (I<sub>k3</sub>)</td><td>{inputs.ik3}</td><td>A</td></tr>
                  <tr><td>System X/R Ratio</td><td>{inputs.xr}</td><td>-</td></tr>
                  <tr><td>Duration for SC (T<sub>k1</sub>)</td><td>{inputs.tk1}</td><td>s</td></tr>
                  <tr><td>System Voltage (Vsys)</td><td>{inputs.vsys}</td><td>V</td></tr>
                  <tr><td>System Frequency (f)</td><td>{inputs.freq || 50}</td><td>Hz</td></tr>
                  <tr><td>Distance between Support (l)</td><td>{inputs.lspan}</td><td>m</td></tr>
                  <tr><td>Insulator String Length (l<sub>i</sub>)</td><td>{inputs.li}</td><td>m</td></tr>
                  <tr><td>Girder Width (D<sub>g</sub>)</td><td>{inputs.dg}</td><td>m</td></tr>
                  <tr><td>Phase Spacing (a<sub>ph</sub>)</td><td>{inputs.aph}</td><td>m</td></tr>
                  <tr><td>Min. Phase to Phase Clearance (Cl<sub>ph-ph</sub>)</td><td>{inputs.clph}</td><td>m</td></tr>
                  <tr><td>Stringing Height (H)</td><td>{inputs.H}</td><td>m</td></tr>
                  <tr><td>Static Tension per Phase (F<sub>st</sub>)</td><td>{inputs.fst_kg}</td><td>kg</td></tr>
                </tbody>
              </table>
            </div>

            <div className="break-inside-avoid">
              <p className="mb-2 text-sm font-semibold">1.2 Conductor Details:</p>
              <table className="pdf-table" style={{ maxWidth: '70%' }}>
                <thead>
                  <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
                </thead>
                <tbody>
                  <tr><td>Conductor Designation</td><td>{inputs.conductorName || 'AAC BULL'}</td><td>-</td></tr>
                  <tr><td>Number of Sub-conductor (n<sub>c</sub>)</td><td>{inputs.nc}</td><td>-</td></tr>
                  <tr><td>Distance between Sub-conductors (a<sub>s</sub>)</td><td>{inputs.as}</td><td>m</td></tr>
                  <tr><td>Area of Sub-conductor (A<sub>s</sub>)</td><td>{inputs.As}</td><td>mm²</td></tr>
                  <tr><td>Diameter of Sub-conductor (d<sub>s</sub>)</td><td>{inputs.ds}</td><td>mm</td></tr>
                  <tr><td>Mass of Sub-conductor (m<sub>c</sub>)</td><td>{inputs.mc}</td><td>kg/m</td></tr>
                </tbody>
              </table>
            </div>

            <div className="break-inside-avoid">
              <p className="mb-2 text-sm font-semibold">1.3 Spacer Details:</p>
              <table className="pdf-table" style={{ maxWidth: '70%' }}>
                <thead>
                  <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
                </thead>
                <tbody>
                  <tr><td>Spacer Span (l<sub>s</sub>)</td><td>{inputs.ls}</td><td>m</td></tr>
                  <tr><td>Spacer Mass (m<sub>s</sub>)</td><td>{inputs.ms}</td><td>kg</td></tr>
                </tbody>
              </table>
            </div>

            <div className="break-inside-avoid">
              <p className="mb-2 text-sm font-semibold">1.4 Dropper Details:</p>
              <table className="pdf-table" style={{ maxWidth: '70%' }}>
                <thead>
                  <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
                </thead>
                <tbody>
                  <tr><td>Additional Mass per Phase (m<sub>d</sub>)</td><td>{inputs.md}</td><td>kg</td></tr>
                  <tr><td>Height Difference (h)</td><td>{inputs.h_drop}</td><td>m</td></tr>
                  <tr><td>Width of Dropper (w)</td><td>{inputs.w_drop}</td><td>m</td></tr>
                  <tr><td>Dropper Plane</td><td>{inputs.dropperPlane === 'perpendicular' ? 'Perpendicular' : 'Parallel'}</td><td>-</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="mb-2 text-sm font-semibold mt-6">1.5 Material Constants:</p>
          <table className="pdf-table" style={{ maxWidth: '50%' }}>
            <thead>
              <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
            </thead>
            <tbody>
              <tr><td>Young's Modulus (E<sub>kg</sub>)</td><td>{(inputs.E / 9.807 * 10).toFixed(0)}</td><td>kg/cm²</td></tr>
              <tr><td>Young's Modulus (E)</td><td>{inputs.E}</td><td>N/mm²</td></tr>
              <tr><td>Lowest Value of σ</td><td>{inputs.sigma_fin}</td><td>N/m²</td></tr>
              <tr><td>Spring Constant (S)</td><td>{inputs.S}</td><td>N/mm</td></tr>
            </tbody>
          </table>

          <h2 className="text-lg font-bold mb-4 uppercase mt-8">2. IEC 60865-1 CHART VALUES</h2>
          <table className="pdf-table" style={{ maxWidth: '60%' }}>
            <thead>
              <tr><th>Parameter</th><th>Value</th><th>Reference</th></tr>
            </thead>
            <tbody>
              <tr><td>ψ - Dynamic Factor</td><td>{psi.toFixed(3)}</td><td>IEC Fig-7</td></tr>
              <tr><td>ψ<sub>1</sub> - Modified Dynamic Factor</td><td>{psi1.toFixed(3)}</td><td>IEC Fig-7</td></tr>
              <tr><td>v<sub>2</sub> - Bundle Factor</td><td>{inputs.nc > 1 ? 1.808 : 1.000}</td><td>IEC Fig-9</td></tr>
              <tr><td>v<sub>3</sub> - Phase Factor</td><td>{inputs.nc > 1 ? 0.219 : 0.000}</td><td>IEC Fig-10</td></tr>
              <tr><td>ξ - Clash Factor</td><td>1.000</td><td>IEC Fig-11</td></tr>
              <tr><td>η - Non-clash Factor</td><td>0.441</td><td>IEC Fig-12</td></tr>
            </tbody>
          </table>

          <h2 className="text-lg font-bold mb-4 uppercase mt-8">3. CALCULATIONS</h2>

          {/* Calculation blocks — two-column for landscape */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-0 print:grid-cols-2">
            <div>
              <div className="calc-block">
                <p className="calc-title">Length of Conductor:</p>
                <p className="calc-eq">lc = l - 2 * li - Dg = {inputs.lspan} - 2 x {inputs.li} - {inputs.dg} = {lc.toFixed(3)} m</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Min. Clearance during SC:</p>
                <p className="calc-eq">amin.req = 50% Cl<sub>ph-ph</sub> = {(inputs.clph * 0.5).toFixed(2)} m ( Clause - 5.4.3 , [2] )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Number of Spacer:</p>
                <p className="calc-eq">ns = lc / l<sub>s</sub> = {lc.toFixed(3)} / {inputs.ls} = {ns}</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Cord length of the dropper:</p>
                <p className="calc-eq">lv = mean[sqrt(h² + w²), (h + w)] = {lv.toFixed(3)} m</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Conductor mass per unit length:</p>
                <p className="calc-eq">m'c = m<sub>c</sub> + (ns × m<sub>s</sub>)/(n<sub>c</sub> × lc) + m<sub>d</sub>/(n<sub>c</sub> × lc)</p>
                <p className="calc-eq">m'c = {mpc.toFixed(3)} kg/m</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Static tensile force:</p>
                <p className="calc-eq">F<sub>st</sub> = {inputs.fst_kg} × 9.807 = {Fst.toFixed(2)} N</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Factor for peak SC:</p>
                <p className="calc-eq">k = 1.02 + 0.98 × exp(-3/{inputs.xr}) = {k.toFixed(3)}</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">EM force per unit length:</p>
                <p className="calc-eq">F' = (μ₀/2π) × 0.75 × (I²/a<sub>ph</sub>) × (lc/l) = {Fprime.toFixed(3)} N/m ( Eq. 19a )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Load parameter r:</p>
                <p className="calc-eq">r = F'/(n<sub>c</sub> × m'c × g) = {r.toFixed(3)}</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Direction of resulting force:</p>
                <p className="calc-eq">δ₁ = atan(r) = {delta1_deg.toFixed(3)}°</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Equivalent static conductor sag:</p>
                <p className="calc-eq">fes = (n<sub>c</sub> × m'c × g × l²)/(8 × F<sub>st</sub>) = {fes.toFixed(3)} m ( Eq. 22 )</p>
              </div>
            </div>

            <div>
              <div className="calc-block">
                <p className="calc-title">Period of conductor oscillation:</p>
                <p className="calc-eq">T = 2π × √(0.8 × fes/g) = {T.toFixed(4)} s ( Eq. 23 )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Period during SC:</p>
                <p className="calc-eq">Tres = {Tres.toFixed(3)} s ( Eq. 24 )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Stiffness norm:</p>
                <p className="calc-eq">N = {N.toExponential(3)} 1/N ( Eq. 25 )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Stress factor:</p>
                <p className="calc-eq">ζ = {zeta.toFixed(5)} ( Eq. 28 )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Max swing-out angle:</p>
                <p className="calc-eq">δm = {deltam_deg.toFixed(3)}° ( Eq. 31 )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Dynamic factor ψ:</p>
                <p className="calc-eq">ζ = {zeta.toFixed(3)}, φ = {phi.toFixed(3)}, ψ = {psi.toFixed(3)} ( Fig. 7 )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Ftd1 = Fst(1 + φ × ψ):</p>
                <p className="calc-eq">Ftd1 = {Fst.toFixed(3)} × (1 + {phi.toFixed(3)} × {psi.toFixed(3)}) = {Ftd1.toFixed(0)} N</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Elastic expansion:</p>
                <p className="calc-eq">εela = N × (Ftd1 − F<sub>st</sub>) = {epsilonela.toExponential(4)} ( Eq. 34 )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Dynamic sag:</p>
                <p className="calc-eq">fed = CF × CD × fes = {CF.toFixed(3)} × {CD.toFixed(3)} × {fes.toFixed(3)} = {fed.toFixed(3)} m ( Eq. 38 )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Dropper-limited swing:</p>
                <p className="calc-eq">δ = min(δ<sub>dropper</sub>, δ<sub>m</sub>) = {delta_eff_deg.toFixed(3)}°</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Tensile force with dropper effect:</p>
                <p className="calc-eq">φ₁ = {phi1.toFixed(3)}, ψ₁ = {psi1.toFixed(3)}</p>
                <p className="calc-eq">Ftd2 = F<sub>st</sub> × (1 + φ₁ × ψ₁) = {Ftd2.toFixed(0)} N</p>
                <p className="calc-eq">Ftd = max(Ftd1, Ftd2) = {Ftd.toFixed(0)} N = {(Ftd/9.807).toFixed(0)} kg ( Eq. 42 )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Drop force after SC:</p>
                <p className="calc-eq">Ffd = {Ffd.toFixed(0)} N = {(Ffd/9.807).toFixed(0)} kg ( Eq. 43 )</p>
              </div>

              <div className="calc-block">
                <p className="calc-title">Horizontal displacement & min clearance:</p>
                <p className="calc-eq">bh = {bh.toFixed(3)} m ( Eq. 47 )</p>
                <p className="calc-eq">amin = a<sub>ph</sub> − 2×bh − a<sub>s</sub> = {amin.toFixed(3)} m ( Eq. 48 )</p>
                <p className="calc-eq">Check: {results.clCheck ? "OK ✓" : "FAIL ✗"}</p>
              </div>
            </div>
          </div>

          {/* RESULTS SUMMARY */}
          <h2 className="text-lg font-bold mb-4 uppercase mt-8">4. RESULTS SUMMARY</h2>
          <table className="pdf-table" style={{ maxWidth: '70%' }}>
            <thead>
              <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
            </thead>
            <tbody>
              <tr><td>Max Tensile Force during S/C (F<sub>td</sub>)</td><td>{(Ftd/9.807).toFixed(2)}</td><td>kg</td></tr>
              <tr><td>Drop Force after S/C (F<sub>fd</sub>)</td><td>{(Ffd/9.807).toFixed(2)}</td><td>kg</td></tr>
              <tr><td>Max Pinch Force during S/C (F<sub>pi</sub>)</td><td>{(Fpi/9.807).toFixed(2)}</td><td>kg</td></tr>
              <tr className="font-bold"><td>Max Force during Short Circuit</td><td>{(Fmax/9.807).toFixed(2)}</td><td>kg</td></tr>
              <tr><td>Maximum Horizontal Displacement (b<sub>h</sub>)</td><td>{bh.toFixed(2)}</td><td>m</td></tr>
              <tr><td>Minimum Air Clearance (a<sub>min</sub>)</td><td>{amin.toFixed(2)}</td><td>m</td></tr>
              <tr className="font-bold"><td>Clearance Check</td><td>{results.clCheck ? "OK" : "FAIL"}</td><td>-</td></tr>
              <tr><td>Sub-conductor Clashing</td><td>{Fpi > 0 ? "YES" : "NO"}</td><td>-</td></tr>
            </tbody>
          </table>

          <h2 className="text-lg font-bold mb-4 uppercase mt-8">5. CONCLUSION</h2>
          <ul className="list-disc pl-6 text-[13px] leading-relaxed">
            <li>The minimum air clearance is <strong>{results.clCheck ? "acceptable" : "NOT acceptable"}</strong> for swing during short circuit.</li>
            {Fpi > 0 ? (
              <li>Sub-conductors <strong>will clash</strong> during short circuit. Pinch force has been accounted for.</li>
            ) : (
              <li>Sub-conductors <strong>will not clash</strong> during short circuit.</li>
            )}
          </ul>

          <div className="mt-8 text-[12px] italic">
            <p className="font-bold mb-1">References:</p>
            <p>1. IEC 60865-1: Short Circuit Currents - Calculation of Effects</p>
            <p>2. IEC 61936-1: Power Installations exceeding 1 kV AC</p>
          </div>

          {/* FULL EQUATION TRACE — separate section */}
          <div style={{ breakBefore: 'page', pageBreakBefore: 'always' }}></div>
          <div className="text-center mb-6 border-b border-black pb-2 mt-8 print:mt-0">
            <p className="text-[11px]">Short Circuit Forces Calculation<br/>As per IEC 60865-1 & IEC 61936-1</p>
          </div>
          
          <h2 className="text-lg font-bold mb-4 uppercase">6. FULL EQUATION TRACE SUMMARY</h2>
          <p className="text-[13px] mb-4">Step-by-step intermediate variables and formulae.</p>
          
          <table className="pdf-trace-table">
            <thead>
              <tr>
                <th className="w-8 text-center">#</th>
                <th>Parameter</th>
                <th>Formula</th>
                <th className="text-left">Computed Value</th>
                <th className="w-20">IEC Ref.</th>
              </tr>
            </thead>
            <tbody>
              {calculationSteps.map((row) => (
                <tr key={row.num}>
                  <td className="text-center text-gray-700">{row.num}</td>
                  <td className="font-medium">{row.param}</td>
                  <td className="font-mono text-[10px]" dangerouslySetInnerHTML={{ __html: row.html }} />
                  <td className="text-left font-mono font-bold">{row.val}</td>
                  <td className="text-[10px] text-gray-700">{row.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FaultReportTemplate({ inputs, results, onBack }: { inputs: FaultInput, results: FaultResults, onBack: () => void }) {
  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 right-4 flex items-center gap-3 print:hidden z-10">
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-card border border-border text-[12px] font-bold text-foreground hover:bg-accent transition-colors cursor-pointer">
          Back to Dashboard
        </button>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-amber-500 text-[12px] font-bold text-white hover:bg-amber-600 transition-colors cursor-pointer">
          Print PDF Again
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area {
            position: relative !important;
            left: 0; top: 0; width: 100%;
            background: white !important; color: black !important;
          }
          html, body, main, section, div {
            height: auto !important; min-height: auto !important; max-height: none !important; overflow: visible !important;
          }
          @page { size: A4 portrait; margin: 12mm 15mm; }
          .pdf-table, .calc-block { break-inside: avoid; page-break-inside: avoid; }
          .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .pdf-table th, .pdf-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 11px; }
          .pdf-table th { background: #f0f0f0; font-weight: bold; }
        }
      `}} />

      <div id="report-print-area" className="w-full bg-white text-black min-h-screen font-sans text-[13px] leading-tight print:block hidden p-4">
        <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight m-0 p-0 leading-none">Fault Analysis Report</h1>
            <p className="text-[11px] font-bold mt-1 text-gray-600">Calculated as per IEC 60909 Standard</p>
          </div>
          <div className="text-right text-[10px] uppercase font-bold text-gray-500">
            GridIntel Substation Design <br/> {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="calc-block">
            <h2 className="text-lg font-bold mb-3 uppercase border-b border-gray-300">1. System Inputs</h2>
            <table className="pdf-table">
              <tbody>
                <tr><td>System Voltage (U_n)</td><td className="font-mono">{inputs.voltageKv.toFixed(2)} kV</td></tr>
                <tr><td>Source Fault Level</td><td className="font-mono">{inputs.sourceMva.toFixed(2)} MVA</td></tr>
                <tr><td>Line Length</td><td className="font-mono">{inputs.lineLengthKm.toFixed(2)} km</td></tr>
                <tr><td>Positive Seq R1</td><td className="font-mono">{inputs.lineRPerKm.toFixed(4)} Ω/km</td></tr>
                <tr><td>Positive Seq X1</td><td className="font-mono">{inputs.lineXPerKm.toFixed(4)} Ω/km</td></tr>
                <tr><td>Zero Seq R0 Multiplier</td><td className="font-mono">{inputs.zeroSeqRMultiplier.toFixed(2)}×</td></tr>
                <tr><td>Zero Seq X0 Multiplier</td><td className="font-mono">{inputs.zeroSeqXMultiplier.toFixed(2)}×</td></tr>
              </tbody>
            </table>
          </div>

          <div className="calc-block">
            <h2 className="text-lg font-bold mb-3 uppercase border-b border-gray-300">2. Fault Currents</h2>
            <table className="pdf-table">
              <tbody>
                <tr><td>3-Phase Fault (I_k3)</td><td className="font-mono font-bold">{results.i3Phase.toFixed(2)} kA</td></tr>
                <tr><td>Single Line to Ground (I_k1)</td><td className="font-mono font-bold">{results.iLineToGround.toFixed(2)} kA</td></tr>
                <tr><td>Line to Line (I_k2)</td><td className="font-mono">{results.iLineToLine.toFixed(2)} kA</td></tr>
                <tr><td>Line to Line to Ground</td><td className="font-mono">{results.iLineToLineToGround.toFixed(2)} kA</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 calc-block">
           <h2 className="text-lg font-bold mb-3 uppercase border-b border-gray-300">3. Sequence Impedances (Ω)</h2>
           <table className="pdf-table">
              <thead>
                <tr>
                  <th>Sequence Component</th>
                  <th>Resistance (R)</th>
                  <th>Reactance (X)</th>
                  <th>Impedance (|Z|)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Source (Positive/Negative)</td>
                  <td className="font-mono">{results.zSource.r.toFixed(4)}</td>
                  <td className="font-mono">{results.zSource.x.toFixed(4)}</td>
                  <td className="font-mono">{results.zSource.mag.toFixed(4)}</td>
                </tr>
                <tr>
                  <td>Line (Positive/Negative)</td>
                  <td className="font-mono">{results.zLinePositive.r.toFixed(4)}</td>
                  <td className="font-mono">{results.zLinePositive.x.toFixed(4)}</td>
                  <td className="font-mono">{results.zLinePositive.mag.toFixed(4)}</td>
                </tr>
                <tr>
                  <td>Line (Zero Seq)</td>
                  <td className="font-mono">{results.zLineZero.r.toFixed(4)}</td>
                  <td className="font-mono">{results.zLineZero.x.toFixed(4)}</td>
                  <td className="font-mono">{results.zLineZero.mag.toFixed(4)}</td>
                </tr>
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}

function SagTensionReportTemplate({ inputs, results, onBack }: { inputs: SagTensionInputs, results: SagTensionResults, onBack: () => void }) {
  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 right-4 flex items-center gap-3 print:hidden z-10">
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-card border border-border text-[12px] font-bold text-foreground hover:bg-accent transition-colors cursor-pointer">
          Back to Dashboard
        </button>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-teal-500 text-[12px] font-bold text-white hover:bg-teal-600 transition-colors cursor-pointer">
          Print PDF Again
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area {
            position: relative !important;
            left: 0; top: 0; width: 100%;
            background: white !important; color: black !important;
          }
          html, body, main, section, div {
            height: auto !important; min-height: auto !important; max-height: none !important; overflow: visible !important;
          }
          @page { size: A4 landscape; margin: 12mm 15mm; }
          .pdf-table, .calc-block { break-inside: avoid; page-break-inside: avoid; }
          .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .pdf-table th, .pdf-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 11px; }
          .pdf-table th { background: #f0f0f0; font-weight: bold; }
        }
      `}} />

      <div id="report-print-area" className="w-full bg-white text-black min-h-screen font-sans text-[13px] leading-tight print:block hidden p-4">
        <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight m-0 p-0 leading-none">Sag-Tension Profile Report</h1>
            <p className="text-[11px] font-bold mt-1 text-gray-600">Calculated as per IS 802 / IEC 60826</p>
          </div>
          <div className="text-right text-[10px] uppercase font-bold text-gray-500">
            GridIntel Substation Design <br/> {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="calc-block">
            <h2 className="text-lg font-bold mb-3 uppercase border-b border-gray-300">1. Stringing Conditions</h2>
            <table className="pdf-table">
              <tbody>
                <tr><td>Conductor Name</td><td className="font-mono font-bold">{inputs.conductorName}</td></tr>
                <tr><td>Span Length (L)</td><td className="font-mono">{inputs.span_m.toFixed(2)} m</td></tr>
                <tr><td>Reference Temp</td><td className="font-mono">{inputs.refTemp_C.toFixed(2)} °C</td></tr>
                <tr><td>Initial Tension (% UTS)</td><td className="font-mono">{inputs.initialTension_pctUTS.toFixed(2)} %</td></tr>
                <tr><td>Safety Factor</td><td className="font-mono">{inputs.safetyFactor.toFixed(2)}</td></tr>
                <tr><td>Weight (w)</td><td className="font-mono">{inputs.weight_kg_m.toFixed(3)} kg/m</td></tr>
                <tr><td>Cross-section (A)</td><td className="font-mono">{inputs.area_mm2.toFixed(2)} mm²</td></tr>
                <tr><td>Modulus (E)</td><td className="font-mono">{inputs.elasticModulus_N_mm2.toFixed(0)} N/mm²</td></tr>
                <tr><td>Alpha (α)</td><td className="font-mono">{inputs.thermalExpCoeff.toExponential(2)} /°C</td></tr>
              </tbody>
            </table>
          </div>

          <div className="calc-block">
            <h2 className="text-lg font-bold mb-3 uppercase border-b border-gray-300">2. Sag-Tension Results</h2>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Zone Condition</th>
                  <th>Temp (°C)</th>
                  <th>Tension (kg)</th>
                  <th>Sag (m)</th>
                </tr>
              </thead>
              <tbody>
                {results.sagTable.map((z, i) => (
                  <tr key={i}>
                    <td>{z.condition}</td>
                    <td className="font-mono">{z.temperature_C}</td>
                    <td className="font-mono">{z.tension_kg.toFixed(2)}</td>
                    <td className="font-mono font-bold">{z.sag_m.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-4 p-3 border border-black bg-gray-50">
              <div className="font-bold">Maximum Design Sag: <span className="font-mono text-lg">{results.maxSag_m.toFixed(3)} m</span></div>
              <div className="text-[10px] text-gray-700 mt-1">This defines the minimum tower height/clearance.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
