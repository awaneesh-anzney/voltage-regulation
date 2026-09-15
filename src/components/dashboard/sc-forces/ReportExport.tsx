"use client";

import { Download, FileText, FileSpreadsheet, FileJson, AlertTriangle } from "lucide-react";
import type { SCInputs, SCResults } from "@/lib/scForcesEngine";
import type { SCTraceKey } from "@/lib/types/verification";
import { buildEngineTrace } from "@/lib/scForcesEngine";
import { VerificationBadge } from "./VerificationBadge";
import { useMemo } from "react";

interface ReportExportProps {
  inputs: SCInputs;
  results: SCResults;
}

export function ReportExport({ inputs, results }: ReportExportProps) {
  const trace = useMemo(() => buildEngineTrace(inputs, results), [inputs, results]);
  
  const handleExportJSON = () => {
    const exportData = {
      _disclaimer: "Draft data export — not IEC-cited, internal reference IDs only, see clauseRef fields",
      inputs,
      results,
      trace
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `sc_forces_draft_report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportCSV = () => {
    let csv = "# DRAFT DATA EXPORT — NOT IEC-CITED — INTERNAL REVIEW ONLY\n";
    csv += "Parameter,Value\n";
    csv += "--- INPUTS ---\n";
    for (const [key, val] of Object.entries(inputs)) {
      csv += `${key},${val}\n`;
    }
    csv += "--- RESULTS ---\n";
    for (const [key, val] of Object.entries(results)) {
      if (key !== 'warnings' && typeof val !== 'object') {
        csv += `${key},${val}\n`;
      }
    }
    csv += "--- TRACE VERIFICATION STATUS ---\n";
    const TRACE_ORDER: SCTraceKey[] = ["k", "Fprime", "r", "deltam_deg", "Ftd", "Ffd", "v2", "v3", "eta", "Fpi", "clearance"];
    for (const key of TRACE_ORDER) {
      const p = trace.parameters[key];
      if (p) {
        csv += `${p.name} (${p.symbol}),${p.value} ${p.unit} [${p.verification}] [${p.clauseRef}]\n`;
      }
    }
    
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `sc_forces_draft_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  const TRACE_ORDER: SCTraceKey[] = ["k", "Fprime", "r", "deltam_deg", "Ftd", "Ffd", "v2", "v3", "eta", "Fpi", "clearance"];
  const traceItems = TRACE_ORDER.filter(key => trace.parameters[key]).map(key => {
    const p = trace.parameters[key]!;
    return {
      key,
      name: p.name,
      symbol: p.symbol,
      value: p.value === null ? "N/A" : `${parseFloat(p.value.toString()).toFixed(4)} ${p.unit}`,
      verification: p.verification,
      internalRef: p.clauseRef,
      notes: p.notes ?? "",
      applicable: p.applicable ?? true
    };
  });

  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Download className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Export Draft Analysis Report</h2>
          <p className="text-[13px] text-slate-400 mt-1 max-w-xl">
            Generate formal documentation of the short-circuit mechanical forces calculation. 
            Draft status: pending real IEC clause verifications.
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
            <div className="text-[11px] text-slate-400 mt-1">Draft engineering document</div>
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
            position: relative !important;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          
          /* FIX FOR 1-PAGE ONLY PRINTING & LANDSCAPE */
          @page {
            size: A4 portrait;
            margin: 15mm 15mm;
          }
          
          html, body, main, section, div {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }

          /* Prevent breaking inside tables/blocks */
          .pdf-table, .result-block, .disclaimer-block {
            break-inside: avoid;
            page-break-inside: avoid;
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
            font-size: 12px;
          }
          
          .pdf-table th {
            text-align: left;
            font-weight: bold;
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .pdf-trace-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .pdf-trace-table th, .pdf-trace-table td {
            border: 1px solid #000;
            padding: 5px 8px;
            font-size: 11px;
          }
          .pdf-trace-table th {
            text-align: left;
            font-weight: bold;
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .footer-disclaimer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10px;
            color: #4b5563;
            border-top: 1px solid #e5e7eb;
            padding-top: 4px;
          }
        }
      `}} />

      {/* Exact PDF Layout Match Print Area */}
      <div id="report-print-area" className="hidden print:block bg-white text-black font-sans max-w-[850px] mx-auto pb-10">
        
        {/* PAGE 1 */}
        {/* DISCLAIMER BLOCK */}
        <div className="disclaimer-block border-2 border-red-600 bg-red-50 p-4 mb-8">
          <h2 className="text-red-700 font-bold uppercase text-center mb-2">DRAFT ENGINEERING CALCULATION REPORT — FOR INTERNAL REVIEW ONLY</h2>
          <p className="text-sm text-red-900 leading-snug">
            This report presents calculations based on IEC 60865-1 methodology principles as implemented in GridIntel Pro. It is <strong>NOT a certified or IEC-cited calculation report</strong> and <strong>must not be submitted for regulatory approval, stamped by a Professional Engineer, or relied upon as sole justification for structural design</strong> without independent verification.
          </p>
          <p className="text-sm text-red-900 leading-snug mt-2">
            Clause and equation references shown in this report are <strong>internal placeholder identifiers</strong>, not confirmed citations to any specific edition of IEC 60865-1. Formula-level verification status is indicated per parameter below (Verified / Approximate / Unverified). Parameters marked <strong>Unverified</strong> have not been confirmed against a clean copy of the published standard and should be treated with additional engineering margin.
          </p>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-bold uppercase">DRAFT ENGINEERING CALCULATION REPORT</h1>
          <p className="text-sm">Short-Circuit Mechanical Forces — IEC 60865-1 Methodology</p>
          <div className="border-b-2 border-black my-4"></div>
          <p className="text-sm mb-2">Date: {new Date().toLocaleDateString('en-GB')}</p>
          <p className="text-sm text-gray-600">Generated by: GridIntel Pro SC Forces Module</p>
        </div>

        <h2 className="text-lg font-bold mb-4 uppercase">1. INPUT PARAMETERS</h2>
        <div className="break-inside-avoid grid grid-cols-2 gap-8">
          <div>
            <p className="mb-2 text-sm font-semibold">1.1 Basic System Parameters:</p>
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
          </div>
          <div className="space-y-6">
            <div className="break-inside-avoid">
              <p className="mb-2 text-sm font-semibold">1.2 Conductor Details:</p>
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
            </div>

            <div className="break-inside-avoid">
              <p className="mb-2 text-sm font-semibold">1.3 Spacer Details:</p>
              <table className="pdf-table">
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
              <p className="mb-2 text-sm font-semibold">1.4 Material Constants:</p>
              <table className="pdf-table">
                <thead>
                  <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
                </thead>
                <tbody>
                  <tr><td>Young's Modulus (E)</td><td>{inputs.E}</td><td>N/mm²</td></tr>
                  <tr><td>Lowest Value of σ</td><td>{inputs.sigma_fin}</td><td>N/m²</td></tr>
                  <tr><td>Spring Constant (S)</td><td>{inputs.S}</td><td>N/mm</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PAGE 2 */}
        <div className="page-break"></div>

        <h2 className="text-lg font-bold mb-4 uppercase">2. GOVERNING RESULT SUMMARY</h2>
        
        <div className="border border-gray-300 rounded p-4 bg-gray-50 mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-700">Governing Maximum Force (F<sub>max</sub>)</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold font-mono">{(results.Fmax/1000).toFixed(2)} kN</span>
              <VerificationBadge tag={trace.governingForce.verification} applicable={true} />
            </div>
          </div>
          <p className="text-sm text-gray-600 italic">Governing force: {trace.governingForce.symbol}</p>
        </div>

        <table className="pdf-table">
          <thead>
            <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
          </thead>
          <tbody>
            <tr><td>Max Tensile Force during S/C (F<sub>td</sub>)</td><td>{(results.Ftd/1000).toFixed(2)}</td><td>kN</td></tr>
            <tr><td>Drop Force after S/C (F<sub>fd</sub>)</td><td>{(results.Ffd/1000).toFixed(2)}</td><td>kN</td></tr>
            <tr><td>Max Pinch Force during S/C (F<sub>pi</sub>)</td><td>{(results.Fpi/1000).toFixed(2)}</td><td>kN</td></tr>
          </tbody>
        </table>

        <h2 className="text-lg font-bold mb-4 uppercase mt-8">3. Ffd METHOD COMPARISON</h2>
        <div className="border border-gray-300 rounded p-4 mb-6">
          <p className="text-sm text-gray-800 mb-4">
            The drop force (F<sub>fd</sub>) calculation methodology is currently unverified. The GridIntel engine tracks two independent interpretations of the standard. 
            <strong> The most conservative interpretation is utilized in the governing logic.</strong>
          </p>
          <table className="pdf-table">
            <thead>
              <tr><th>Methodology</th><th>Calculated Value</th><th>Status</th><th>Selected</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Method 1 (OCR Reconstruction)</td>
                <td className="font-mono">{((results.Ffd_ocrRecon ?? 0)/1000).toFixed(2)} kN</td>
                <td><VerificationBadge tag="UNVERIFIED_CANDIDATE" applicable={true} /></td>
                <td className="text-center font-bold">{results.ffdMethodSelected === "OCR_Recon" ? "YES" : ""}</td>
              </tr>
              <tr>
                <td>Method 2 (AI Analytical Candidate)</td>
                <td className="font-mono">{((results.Ffd_aiCandidate ?? 0)/1000).toFixed(2)} kN</td>
                <td><VerificationBadge tag="UNVERIFIED_CANDIDATE" applicable={true} /></td>
                <td className="text-center font-bold">{results.ffdMethodSelected === "AI_Candidate" ? "YES" : ""}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-bold mb-4 uppercase mt-8">4. CLEARANCE CHECK</h2>
        <div className="border border-gray-300 rounded p-4 mb-6 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-800">Minimum expected air clearance during SC (a<sub>min</sub>): <span className="font-mono font-bold">{results.amin.toFixed(3)} m</span></p>
            <p className="text-sm text-gray-800 mt-1">Required clearance (a<sub>min,req</sub> = 50% Cl<sub>ph-ph</sub>): <span className="font-mono">{results.amin_req.toFixed(3)} m</span></p>
            <p className="text-sm text-gray-600 italic mt-2">{trace.parameters.clearance?.notes}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xl font-bold ${results.clCheck ? 'text-green-600' : 'text-red-600'}`}>
              {results.clCheck ? "PASS" : "FAIL"}
            </span>
            <VerificationBadge tag={trace.parameters.clearance?.verification ?? "VERIFIED"} applicable={true} />
          </div>
        </div>

        {results.warnings && results.warnings.length > 0 && (
          <div className="mt-8 break-inside-avoid">
            <h2 className="text-lg font-bold mb-4 uppercase text-amber-700">5. WARNINGS & DIAGNOSTICS</h2>
            <div className="space-y-2">
              {results.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {(!results.warnings || results.warnings.length === 0) && (
          <div className="mt-8 break-inside-avoid">
            <h2 className="text-lg font-bold mb-4 uppercase">5. WARNINGS & DIAGNOSTICS</h2>
            <p className="text-sm text-gray-600 italic">No warnings reported by the solver.</p>
          </div>
        )}

        {/* PAGE 3 */}
        <div className="page-break"></div>

        <h2 className="text-lg font-bold mb-4 uppercase">6. FULL EQUATION TRACE SUMMARY</h2>
        <p className="text-[13px] mb-4 text-gray-700">
          Step-by-step intermediate variables as resolved by the computational engine.
          Note: "Internal Reference ID" refers to GridIntel's placeholder registry keys and does not represent real IEC clause numbers.
        </p>
        
        <table className="pdf-trace-table">
          <thead>
            <tr>
              <th>Parameter Name</th>
              <th className="w-16">Symbol</th>
              <th className="text-left w-24">Computed Value</th>
              <th className="w-32">Verification Status</th>
              <th className="w-48">Internal Reference ID</th>
              <th>Notes / Logic</th>
            </tr>
          </thead>
          <tbody>
            {traceItems.map((row) => (
              <tr key={row.key}>
                <td className="font-medium text-gray-900">{row.name}</td>
                <td className="font-mono text-[10px] text-gray-700">{row.symbol}</td>
                <td className="text-left font-mono font-bold text-gray-900">{row.value}</td>
                <td>
                  <VerificationBadge tag={row.verification} applicable={row.applicable} />
                </td>
                <td className="font-mono text-[10px] text-gray-600 break-all">{row.internalRef}</td>
                <td className="text-[10px] text-gray-600">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="footer-disclaimer hidden print:block">
          Draft report — internal review only. Not IEC-cited or PE-stampable. See disclaimer on page 1.
        </div>
      </div>
    </div>
  );
}
