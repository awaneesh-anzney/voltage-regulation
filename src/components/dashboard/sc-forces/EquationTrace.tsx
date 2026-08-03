"use client";

import type { SCResults } from "@/lib/scForcesEngine";

interface EquationTraceProps {
  results: SCResults;
}

export function EquationTrace({ results }: EquationTraceProps) {
  const {
    lc, ns, lv, mpc, Fst, k, Fprime, r, delta1_deg, fes, T, Tres, N, zeta,
    ratio, deltaend_deg, deltam_deg, phi, psi, Ftd1, epsilonela, epsilonth,
    CD, CF, fed, delta1_dropper_deg, delta_eff_deg, phi1, psi1, Ftd2, Ftd,
    Ffd, bh, amin, Fpi, Fmax
  } = results;

  const rows = [
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
    { num: 19, param: "Dynamic factor", html: "ψ", val: `${psi.toFixed(3)}`, ref: "Eq. 33/Fig.7" },
    { num: 20, param: "Tensile force (no dropper)", html: "F<sub>td1</sub> = F<sub>st</sub>·(1+φ·ψ)", val: `${(Ftd1/1000).toFixed(3)} kN`, ref: "Eq. 42a" },
    { num: 21, param: "Elastic expansion", html: "ε<sub>ela</sub> = N·(F<sub>td1</sub>−F<sub>st</sub>)", val: `${epsilonela.toExponential(3)}`, ref: "Eq. 34" },
    { num: 22, param: "Thermal expansion", html: "ε<sub>th</sub>", val: `${epsilonth.toExponential(3)}`, ref: "Eq. 35" },
    { num: 23, param: "CD factor", html: "C<sub>D</sub>", val: `${CD.toFixed(3)}`, ref: "Eq. 36" },
    { num: 24, param: "CF factor", html: "C<sub>F</sub>", val: `${CF.toFixed(3)}`, ref: "Eq. 37" },
    { num: 25, param: "Dynamic sag", html: "f<sub>ed</sub> = C<sub>F</sub>·C<sub>D</sub>·f<sub>es</sub>", val: `${fed.toFixed(3)} m`, ref: "Eq. 38" },
    { num: 26, param: "Dropper-limited swing angle", html: "δ<sub>dropper</sub>", val: `${delta1_dropper_deg.toFixed(3)}°`, ref: "Eq. 39" },
    { num: 27, param: "Effective swing angle", html: "δ = min(δ<sub>dropper</sub>, δ<sub>m</sub>)", val: `${delta_eff_deg.toFixed(3)}°`, ref: "-" },
    { num: 28, param: "Modified load parameter", html: "φ₁", val: `${phi1.toFixed(3)}`, ref: "Eq. 41" },
    { num: 29, param: "Modified dynamic factor", html: "ψ₁", val: `${psi1.toFixed(3)}`, ref: "Fig. 7" },
    { num: 30, param: "Tensile force (with dropper)", html: "F<sub>td2</sub> = F<sub>st</sub>·(1+φ₁·ψ₁)", val: `${(Ftd2/1000).toFixed(3)} kN`, ref: "Eq. 42" },
    { num: 31, param: "Design tensile force", html: "F<sub>td</sub> = max(F<sub>td1</sub>, F<sub>td2</sub>)", val: `${(Ftd/1000).toFixed(3)} kN`, ref: "-" },
    { num: 32, param: "Drop force", html: "F<sub>fd</sub>", val: `${(Ffd/1000).toFixed(3)} kN`, ref: "Eq. 43" },
    { num: 33, param: "Horizontal displacement", html: "b<sub>h</sub>", val: `${bh.toFixed(3)} m`, ref: "Eq. 46" },
    { num: 34, param: "Min air clearance", html: "a<sub>min</sub>", val: `${amin.toFixed(3)} m`, ref: "Eq. 48" },
    { num: 35, param: "Pinch force", html: "F<sub>pi</sub>", val: `${(Fpi/1000).toFixed(3)} kN`, ref: "Eq. 62" },
    { num: 36, param: "Max design force", html: "max(F<sub>td</sub>, F<sub>fd</sub>, F<sub>pi</sub>)", val: `${(Fmax/1000).toFixed(3)} kN`, ref: "-" },
  ];

  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.04]">
        <h3 className="text-[13px] font-semibold text-white uppercase tracking-wider">IEC 60865-1 — Full Equation Trace</h3>
        <p className="text-[11px] text-slate-400 mt-1">Step-by-step intermediate variables and formulae.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] text-left">
          <thead className="bg-slate-900/50 text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">Parameter</th>
              <th className="px-5 py-3 font-medium">Formula</th>
              <th className="px-5 py-3 font-medium">Computed Value</th>
              <th className="px-5 py-3 font-medium">IEC Ref.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((row) => (
              <tr key={row.num} className="hover:bg-white/[0.02]">
                <td className="px-5 py-2.5 text-slate-500 font-mono">{row.num}</td>
                <td className="px-5 py-2.5 text-slate-300">{row.param}</td>
                <td className="px-5 py-2.5">
                  <div className="bg-[#0a0f18] px-2 py-1 rounded border border-white/[0.05] inline-block font-mono text-[11px] text-blue-300" dangerouslySetInnerHTML={{ __html: row.html }} />
                </td>
                <td className="px-5 py-2.5 text-white font-mono">{row.val}</td>
                <td className="px-5 py-2.5 text-slate-400">{row.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
