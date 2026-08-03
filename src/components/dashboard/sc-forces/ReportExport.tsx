"use client";

import { Download, FileText, FileSpreadsheet, FileJson } from "lucide-react";
import type { SCInputs, SCResults } from "@/lib/scForcesEngine";

interface ReportExportProps {
  inputs: SCInputs;
  results: SCResults;
}

export function ReportExport({ inputs, results }: ReportExportProps) {
  
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ inputs, results }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `sc_forces_report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportCSV = () => {
    let csv = "Parameter,Value\n";
    csv += "--- INPUTS ---\n";
    for (const [key, val] of Object.entries(inputs)) {
      csv += `${key},${val}\n`;
    }
    csv += "--- RESULTS ---\n";
    for (const [key, val] of Object.entries(results)) {
      if (key !== 'warnings') {
        csv += `${key},${val}\n`;
      }
    }
    
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `sc_forces_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handlePrint = () => {
    window.print();
  };

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
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Download className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Export Analysis Report</h2>
          <p className="text-[13px] text-slate-400 mt-1 max-w-xl">
            Generate formal documentation of the IEC 60865-1 short-circuit mechanical forces calculation. 
            This matches the exact structure of the formal engineering document.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PDF Export */}
        <button 
          onClick={handlePrint}
          className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-center">
            <div className="text-[13px] font-semibold text-white">PDF Report</div>
            <div className="text-[11px] text-slate-400 mt-1">Formal engineering document</div>
          </div>
        </button>

        {/* CSV Export */}
        <button 
          onClick={handleExportCSV}
          className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="text-center">
            <div className="text-[13px] font-semibold text-white">CSV Export</div>
            <div className="text-[11px] text-slate-400 mt-1">Spreadsheet compatible data</div>
          </div>
        </button>

        {/* JSON Export */}
        <button 
          onClick={handleExportJSON}
          className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileJson className="w-5 h-5" />
          </div>
          <div className="text-center">
            <div className="text-[13px] font-semibold text-white">JSON Dump</div>
            <div className="text-[11px] text-slate-400 mt-1">Full state for automation</div>
          </div>
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
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          
          /* FIX FOR 1-PAGE ONLY PRINTING */
          html, body, main, section, div {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
          }

          #report-print-area {
             position: absolute !important;
             left: 0;
             top: 0;
          }
          
          @page {
            size: A4;
            margin: 20mm 20mm;
          }
          
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          
          .pdf-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .pdf-table th, .pdf-table td {
            border: 1px solid #000;
            padding: 6px 12px;
            font-size: 13px;
          }
          
          .pdf-table th {
            text-align: left;
            font-weight: bold;
          }
          
          .pdf-table tr td:nth-child(2) {
            text-align: right;
            width: 120px;
          }
          
          .pdf-table tr td:nth-child(3) {
            width: 60px;
          }
          
          .pdf-trace-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .pdf-trace-table th, .pdf-trace-table td {
            border: 1px solid #000;
            padding: 4px 8px;
            font-size: 11px;
          }
          .pdf-trace-table th {
            text-align: left;
            font-weight: bold;
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .calc-block {
            margin-bottom: 16px;
            font-size: 13px;
          }
          .calc-title {
            font-weight: bold;
            margin-bottom: 8px;
          }
          .calc-eq {
            margin-bottom: 4px;
            padding-left: 16px;
            font-family: monospace;
          }
        }
      `}} />

      {/* Exact PDF Layout Match Print Area */}
      <div id="report-print-area" className="hidden print:block bg-white text-black font-sans max-w-[800px] mx-auto">
        
        {/* PAGE 1 */}
        <div className="text-center mb-10">
          <p className="text-sm">Short Circuit Forces Calculation</p>
          <p className="text-sm">As per IEC 60865-1 & IEC 61936-1</p>
          <div className="border-b-2 border-black my-4"></div>
          <h1 className="text-xl font-bold mt-6 mb-4 uppercase">SHORT CIRCUIT FORCES CALCULATION REPORT</h1>
          <p className="text-sm mb-12">Date: {new Date().toLocaleDateString('en-GB')}</p>
        </div>

        <h2 className="text-lg font-bold mb-4 uppercase">1. INPUT PARAMETERS</h2>
        
        <p className="mb-2 text-sm">1.1 Basic System Parameters:</p>
        <table className="pdf-table">
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

        <p className="mb-2 text-sm">1.2 Conductor Details:</p>
        <table className="pdf-table">
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

        {/* PAGE 2 */}
        <div className="page-break"></div>
        <div className="text-center mb-8 border-b border-black pb-2">
          <p className="text-[11px]">Short Circuit Forces Calculation<br/>As per IEC 60865-1 & IEC 61936-1</p>
        </div>

        <p className="mb-2 text-sm">1.3 Spacer Details:</p>
        <table className="pdf-table">
          <thead>
            <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
          </thead>
          <tbody>
            <tr><td>Spacer Span (l<sub>s</sub>)</td><td>{inputs.ls}</td><td>m</td></tr>
            <tr><td>Spacer Mass (m<sub>s</sub>)</td><td>{inputs.ms}</td><td>kg</td></tr>
          </tbody>
        </table>

        <p className="mb-2 text-sm">1.4 Dropper Details:</p>
        <table className="pdf-table">
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

        <p className="mb-2 text-sm">1.5 Material Constants:</p>
        <table className="pdf-table">
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
        <table className="pdf-table">
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

        {/* PAGE 3 */}
        <div className="page-break"></div>
        <div className="text-center mb-8 border-b border-black pb-2">
          <p className="text-[11px]">Short Circuit Forces Calculation<br/>As per IEC 60865-1 & IEC 61936-1</p>
        </div>

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
          <p className="calc-eq">lv := mean[sqrt(h^2 + w^2), (h + w)] = mean[sqrt({inputs.h_drop}^2 + {inputs.w_drop}^2), ({inputs.h_drop} + {inputs.w_drop})] = {lv.toFixed(3)} m</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">Conductor mass per unit length:</p>
          <p className="calc-eq">m'c = m<sub>c</sub> + (ns x m<sub>s</sub>)/(n<sub>c</sub> x lc) + m<sub>d</sub>/(n<sub>c</sub> x lc)</p>
          <p className="calc-eq">m'c = {mpc.toFixed(3)} kg/m</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">Static tensile force:</p>
          <p className="calc-eq">F<sub>st</sub> = Static Tension per Phase (kg) x 9.807</p>
          <p className="calc-eq">F<sub>st</sub> = {inputs.fst_kg} x 9.807 = {Fst.toFixed(2)} N</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">Factor for peak SC:</p>
          <p className="calc-eq">k := 1.02 + 0.98 * exp(-3/XoverR) = 1.02 + 0.98 * exp(-3/{inputs.xr}) = {k.toFixed(3)}</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">Load parameter r:</p>
          <p className="calc-eq">r = F'/(n<sub>c</sub> x m'c x g) = {Fprime.toFixed(3)}/({inputs.nc} x {mpc.toFixed(3)} x 9.807) = {r.toFixed(3)}</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">Electromagnetic force during SC per unit length of main conductors:</p>
          <p className="calc-eq">F' = (mu0/2pi) x 0.75 x (Ik3^2/a<sub>ph</sub>) x (lc/l) = {Fprime.toFixed(3)} N/m ( Eq. 19(a) , [1] )</p>
        </div>

        {/* PAGE 4 */}
        <div className="page-break"></div>
        <div className="text-center mb-8 border-b border-black pb-2">
          <p className="text-[11px]">Short Circuit Forces Calculation<br/>As per IEC 60865-1 & IEC 61936-1</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">The direction of resulting force::</p>
          <p className="calc-eq">delta_1 = atan(r) = {delta1_deg.toFixed(3)}deg</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">The equivalent static conductor sag at midspan ::</p>
          <p className="calc-eq">fes = (n<sub>c</sub> * m'c * g * l^2)/(8 * F<sub>st</sub>) = {fes.toFixed(3)} m (Eq. 22 , [1] )</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">The period of conductor Oscillation ::</p>
          <p className="calc-eq">T = 2pi x sqrt(0.8 * fes/g) = {T.toFixed(4)} s (Eq. 23 , [1] )</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">The period of conductor Oscillation during SC ::</p>
          <p className="calc-eq">Tres = {Tres.toFixed(3)} s (Eq. 24 , [1] )</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">The stiffness norms is given by ::</p>
          <p className="calc-eq">N = 1/(S * l) + 1/(n<sub>c</sub> * Eeff * A<sub>s</sub>) = {N.toExponential(3)} 1/N (Eq. 25 , [1] )</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">The stress factors on main conductor is given by ::</p>
          <p className="calc-eq">zeta = (n<sub>c</sub> * m'c * g * l)^2 / (24 * N * F<sub>st</sub>^3) = {zeta.toFixed(5)} (Eq. 28 , [1] )</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">Maximum swing-out angle calculation (considering span without dropper) ::</p>
          <p className="calc-eq">deltam = {deltam_deg.toFixed(3)}deg (Eq. 31 , [1] )</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">Calculating Psi:</p>
          <p className="calc-eq">As per Figure-7, IEC 865-1: zeta = {zeta.toFixed(3)}</p>
          <p className="calc-eq">phi = {phi.toFixed(3)}</p>
          <p className="calc-eq">ψ = {psi.toFixed(3)} (Eq. 33 / Fig. 7 , [1] )</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">Ftd1 = Fst(1 + phi * ψ):</p>
          <p className="calc-eq">Ftd1 = {Fst.toFixed(3)} x (1 + {phi.toFixed(3)} x {psi.toFixed(3)}) = {Ftd1.toFixed(0)} N</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">The elastic expansion is given by::</p>
          <p className="calc-eq">epsilonela = N * (Ftd1 - F<sub>st</sub>) = {epsilonela.toExponential(4)} (Eq. 34 , [1] )</p>
        </div>

        {/* PAGE 5 */}
        <div className="page-break"></div>
        <div className="text-center mb-8 border-b border-black pb-2">
          <p className="text-[11px]">Short Circuit Forces Calculation<br/>As per IEC 60865-1 & IEC 61936-1</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">The dynamic sag is given by:</p>
          <p className="calc-eq">fed = CF x CD x fes = {CF.toFixed(3)} x {CD.toFixed(3)} x {fes.toFixed(3)} = {fed.toFixed(3)} m (Eq. 38 , [1] )</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">Angle of Swing with limiting effect of droppers ::</p>
          <p className="calc-eq">delta1 = {delta_eff_deg.toFixed(3)}deg</p>
          <p className="calc-eq">delta = {delta_eff_deg.toFixed(3)}deg</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">New load parameter with dropper's effect:</p>
          <p className="calc-eq">phi1 = {phi1.toFixed(3)}</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">Calculating Psi1:</p>
          <p className="calc-eq">ψ_1 = {psi1.toFixed(3)}</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">The Tensile force during SC caused by swing out (taking effect of droppers on swing out angle) is given by::</p>
          <p className="calc-eq">Ftd2 = F<sub>st</sub> x (1 + phi1 x ψ1) = {Ftd2.toFixed(0)} N</p>
          <p className="calc-eq">Ftd = max(Ftd1,Ftd2) = {Ftd.toFixed(0)} N = {(Ftd/9.807).toFixed(0)} kg (Eq. 42 , [1] )</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">ii) The tensile force after the short circuit caused by drop (drop force):</p>
          <p className="calc-eq">Ffd = {Ffd.toFixed(0)} N = {(Ffd/9.807).toFixed(0)} kg (Eq. 43 , [1] )</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">Horizontal span dispalcement bh and minimum air clearance amin:</p>
          <p className="calc-eq">bh = {bh.toFixed(3)} m (Eq. 47 , [1] )</p>
        </div>

        <div className="calc-block">
          <p className="calc-title">The distance between the midpoints of the two main conductors during a line to line two phase short circuit is given in the worst case by::</p>
          <p className="calc-eq">amin = a<sub>ph</sub> - 2 x bh - a<sub>s</sub> = {amin.toFixed(3)} m (Eq. 48 , [1] )</p>
          <p className="calc-eq">clearancecheck = if(amin &gt;= amin.req, "OK", "FAIL") = "{results.clCheck ? "OK" : "FAIL"}"</p>
        </div>

        {/* PAGE 6 (Final) */}
        <div className="page-break"></div>
        <div className="text-center mb-8 border-b border-black pb-2">
          <p className="text-[11px]">Short Circuit Forces Calculation<br/>As per IEC 60865-1 & IEC 61936-1</p>
        </div>

        <h2 className="text-lg font-bold mb-4 uppercase mt-8">4. RESULTS SUMMARY</h2>
        <table className="pdf-table">
          <thead>
            <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
          </thead>
          <tbody>
            <tr><td>Max Tensile Force during S/C (F<sub>td</sub>)</td><td>{(Ftd/9.807).toFixed(2)}</td><td>kg</td></tr>
            <tr><td>Drop Force after S/C (F<sub>fd</sub>)</td><td>{(Ffd/9.807).toFixed(2)}</td><td>kg</td></tr>
            <tr><td>Max Pinch Force during S/C (F<sub>pi</sub>)</td><td>{(Fpi/9.807).toFixed(2)}</td><td>kg</td></tr>
            <tr><td className="font-bold">Max Force during Short Circuit</td><td className="font-bold">{(Fmax/9.807).toFixed(2)}</td><td className="font-bold">kg</td></tr>
            <tr><td>Maximum Horizontal Displacement (b<sub>h</sub>)</td><td>{bh.toFixed(2)}</td><td>m</td></tr>
            <tr><td>Minimum Air Clearance (a<sub>min</sub>)</td><td>{amin.toFixed(2)}</td><td>m</td></tr>
            <tr><td className="font-bold">Clearance Check</td><td className="font-bold">{results.clCheck ? "OK" : "FAIL"}</td><td>-</td></tr>
            <tr><td>Sub-conductor Clashing</td><td>{Fpi > 0 ? "YES" : "NO"}</td><td>-</td></tr>
          </tbody>
        </table>

        <h2 className="text-lg font-bold mb-4 uppercase mt-12">5. CONCLUSION</h2>
        <ul className="list-disc pl-6 text-[13px] leading-relaxed">
          <li>The minimum air clearance is <strong>{results.clCheck ? "acceptable" : "NOT acceptable"}</strong> for swing during short circuit.</li>
          {Fpi > 0 ? (
            <li>Sub-conductors <strong>will clash</strong> during short circuit. Pinch force has been accounted for.</li>
          ) : (
            <li>Sub-conductors <strong>will not clash</strong> during short circuit.</li>
          )}
        </ul>

        <div className="mt-12 text-[12px] italic">
          <p className="font-bold mb-1">References:</p>
          <p>1. IEC 60865-1: Short Circuit Currents - Calculation of Effects</p>
          <p>2. IEC 61936-1: Power Installations exceeding 1 kV AC</p>
        </div>

        {/* PAGE 7 (Full Equation Trace Table) */}
        <div className="page-break"></div>
        <div className="text-center mb-8 border-b border-black pb-2">
          <p className="text-[11px]">Short Circuit Forces Calculation<br/>As per IEC 60865-1 & IEC 61936-1</p>
        </div>
        
        <h2 className="text-lg font-bold mb-4 uppercase mt-8">6. FULL EQUATION TRACE SUMMARY</h2>
        <p className="text-[13px] mb-4">Step-by-step intermediate variables and formulae.</p>
        
        <table className="pdf-trace-table">
          <thead>
            <tr>
              <th className="w-8 text-center">#</th>
              <th>Parameter</th>
              <th>Formula</th>
              <th className="text-right">Computed Value</th>
              <th className="w-20">IEC Ref.</th>
            </tr>
          </thead>
          <tbody>
            {calculationSteps.map((row) => (
              <tr key={row.num}>
                <td className="text-center text-gray-700">{row.num}</td>
                <td className="font-medium">{row.param}</td>
                <td className="font-mono text-[10px]" dangerouslySetInnerHTML={{ __html: row.html }} />
                <td className="text-right font-mono font-bold">{row.val}</td>
                <td className="text-[10px] text-gray-700">{row.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
