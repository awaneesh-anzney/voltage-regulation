"use client";

import { CheckCircle2, XCircle, AlertTriangle, TrendingUp, ArrowDown, Grip, Shield } from "lucide-react";
import type { SCInputs, SCResults } from "@/lib/scForcesEngine";

const G = 9.807;

interface ResultsDashboardProps {
  inputs: SCInputs;
  results: SCResults;
}

function KpiCard({ label, value, sub, status, highlight }: {
  label: string; value: string; sub: string;
  status?: "ok" | "warn" | "danger" | "info";
  highlight?: boolean;
}) {
  const colorMap = {
    ok: "text-emerald-400", warn: "text-amber-400",
    danger: "text-red-400", info: "text-blue-400",
  };
  const color = status ? colorMap[status] : "text-blue-400";
  return (
    <div className={`bg-[#111827] border rounded-xl p-4 relative overflow-hidden group hover:border-white/[0.1] transition-all ${
      highlight ? "border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.08)]" : "border-white/[0.06]"
    }`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent ${
        status === 'danger' ? 'via-red-500' : status === 'warn' ? 'via-amber-500' : status === 'ok' ? 'via-emerald-500' : 'via-blue-500'
      } to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="text-[11px] font-medium text-slate-500 mb-1.5">{label}</div>
      <div className={`font-mono text-[22px] font-semibold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-600 mt-1 font-mono">{sub}</div>
    </div>
  );
}

function ForceBar({ label, sublabel, value, maxValue, color }: {
  label: string; sublabel: string; value: number; maxValue: number; color: string;
}) {
  const pct = Math.min(100, (value / Math.max(maxValue, 1)) * 100);
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-1">
        <span className="text-slate-400" dangerouslySetInnerHTML={{ __html: sublabel }} />
        <span className="text-white font-medium font-mono">{(value / 1000).toFixed(1)} kN</span>
      </div>
      <div className="bg-[#0a0f18] rounded-md overflow-hidden h-2">
        <div
          className="h-2 rounded-md transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function ResultRow({ label, value, badge }: { label: string; value: string; badge?: { text: string; ok: boolean } }) {
  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-2.5 text-[13px] text-slate-400" dangerouslySetInnerHTML={{ __html: label }} />
      <td className="px-4 py-2.5 text-right">
        {badge ? (
          <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${
            badge.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>{badge.text}</span>
        ) : (
          <span className="text-[13px] text-white font-medium font-mono">{value}</span>
        )}
      </td>
    </tr>
  );
}

export function ResultsDashboard({ inputs, results }: ResultsDashboardProps) {
  const { Ftd, Ffd, Fpi, Fmax, Fst, bh, amin, amin_req, clCheck,
    k, r, fes, fed, deltam_deg, delta_eff_deg, psi, Tres } = results;

  const maxForce = Math.max(Ffd, 1);
  const governing = Fmax === Ffd ? "Drop Force" : Fmax === Fpi ? "Pinch Force" : "Tensile Force";

  return (
    <div className="space-y-5">
      {/* Info Banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/8 border border-blue-500/20 text-blue-300 text-[13px]">
        <Shield className="w-4 h-4" />
        <strong>{inputs.conductorName} bundle · {(inputs.vsys / 1000).toFixed(0)} kV · {(inputs.ik3 / 1000).toFixed(0)} kA · {inputs.lspan} m span</strong>
        <span className="text-blue-400/60 ml-1">— IEC 60865-1 / IEC 61936-1</span>
      </div>

      {/* 7 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard
          label="Tensile Force (Ftd)"
          value={`${(Ftd / 1000).toFixed(1)} kN`}
          sub={`${Math.round(Ftd / G).toLocaleString()} kg`}
          status="warn"
        />
        <KpiCard
          label="Drop Force (Ffd)"
          value={`${(Ffd / 1000).toFixed(1)} kN`}
          sub={`${Math.round(Ffd / G).toLocaleString()} kg`}
          status={Ffd === Fmax ? "danger" : "info"}
        />
        <KpiCard
          label="Pinch Force (Fpi)"
          value={`${(Fpi / 1000).toFixed(1)} kN`}
          sub={`${Math.round(Fpi / G).toLocaleString()} kg`}
          status="info"
        />
        <KpiCard
          label="Max Design Force"
          value={`${(Fmax / 1000).toFixed(1)} kN`}
          sub={`${Math.round(Fmax / G).toLocaleString()} kg · ${governing}`}
          status="danger"
          highlight
        />
        <KpiCard
          label="Max Swing Angle δm"
          value={`${deltam_deg.toFixed(1)}°`}
          sub={`Effective: ${delta_eff_deg.toFixed(1)}°`}
          status={deltam_deg > 90 ? "warn" : "ok"}
        />
        <KpiCard
          label="Min Clearance"
          value={`${amin.toFixed(2)} m`}
          sub={`Required: ${amin_req.toFixed(2)} m`}
          status={clCheck ? "ok" : "danger"}
        />
        <KpiCard
          label="Safety Status"
          value={clCheck ? "PASS" : "FAIL"}
          sub={clCheck ? "Clearance adequate" : "Clearance violated"}
          status={clCheck ? "ok" : "danger"}
          highlight
        />
      </div>

      {/* Two-column: Clearance & Intermediate values */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Clearance & Displacement */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04] bg-slate-900/30">
            <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider">Clearance & Displacement</h3>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-white/[0.04]">
              <ResultRow label="Max horizontal displacement b<sub>h</sub>" value={`${bh.toFixed(2)} m`} />
              <ResultRow label="Min air clearance a<sub>min</sub>" value={`${amin.toFixed(2)} m`} />
              <ResultRow label="Required clearance (50% of C<sub>lph-ph</sub>)" value={`${amin_req.toFixed(2)} m`} />
              <ResultRow label="Clearance check" value="" badge={{ text: clCheck ? "OK" : "FAIL", ok: clCheck }} />
              <ResultRow label="Sub-conductor clashing" value="" badge={{
                text: results.subCondClash === null ? (inputs.nc === 1 ? "N/A" : "NO") : results.subCondClash ? "YES" : "NO",
                ok: !(results.subCondClash === true)
              }} />
            </tbody>
          </table>
        </div>

        {/* Key Intermediate Values */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04] bg-slate-900/30">
            <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider">Key Intermediate Values</h3>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-white/[0.04]">
              <ResultRow label="k (peak SC factor)" value={k.toFixed(3)} />
              <ResultRow label="Load parameter r" value={r.toFixed(3)} />
              <ResultRow label="Equiv. static sag f<sub>es</sub>" value={`${fes.toFixed(2)} m`} />
              <ResultRow label="Dynamic sag f<sub>ed</sub>" value={`${fed.toFixed(2)} m`} />
              <ResultRow label="Max swing angle δ<sub>m</sub>" value={`${deltam_deg.toFixed(1)}°`} />
              <ResultRow label="Effective swing angle δ" value={`${delta_eff_deg.toFixed(1)}°`} />
              <ResultRow label="ψ (dynamic factor)" value={psi.toFixed(3)} />
              <ResultRow label="T<sub>res</sub> (oscillation period SC)" value={`${Tres.toFixed(2)} s`} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Force Comparison Bar Chart */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider mb-4">Force Comparison</h3>
        <div className="space-y-3">
          <ForceBar label="Fst" sublabel="Static tension F<sub>st</sub>" value={Fst} maxValue={maxForce} color="#3b82f6" />
          <ForceBar label="Ftd" sublabel="Tensile force during SC F<sub>td</sub>" value={Ftd} maxValue={maxForce} color="#10b981" />
          <ForceBar label="Fpi" sublabel="Pinch force F<sub>pi</sub>" value={Fpi} maxValue={maxForce} color="#f59e0b" />
          <ForceBar label="Ffd" sublabel="Drop force F<sub>fd</sub>" value={Ffd} maxValue={maxForce} color="#ef4444" />
        </div>
      </div>

      {/* Engineering Summary */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-[12px] font-semibold text-white uppercase tracking-wider mb-3">Engineering Summary</h3>
        <div className="text-[13px] text-slate-300 leading-relaxed space-y-2">
          <p>
            The conductor {clCheck ? "remains mechanically safe" : <span className="text-red-400 font-semibold">violates clearance requirements</span>} under the specified {(inputs.ik3 / 1000).toFixed(0)} kA three-phase short circuit
            with a {inputs.lspan} m span ({inputs.conductorName}, {inputs.nc === 1 ? "single" : `${inputs.nc}-bundle`}).
          </p>
          <p>
            Maximum governing load is the <strong className="text-white">{governing.toLowerCase()}</strong> at <strong className="text-white">{(Fmax / 1000).toFixed(1)} kN</strong> ({Math.round(Fmax / G).toLocaleString()} kg).
            {r > 0.6 && deltam_deg > 70 ? " The high load parameter (r=" + r.toFixed(2) + ") and large swing angle (δm=" + deltam_deg.toFixed(1) + "°) trigger the post-fault gravitational drop force formula." : ""}
          </p>
          <p>
            {clCheck
              ? `Minimum air clearance satisfies IEC 60865-1 (amin=${amin.toFixed(2)} m > ${amin_req.toFixed(2)} m required, margin ${((amin/amin_req - 1) * 100).toFixed(0)}%).`
              : `Minimum air clearance FAILS IEC 60865-1 (amin=${amin.toFixed(2)} m < ${amin_req.toFixed(2)} m required). Increase phase spacing, reduce current, or increase conductor tension.`
            }
            {results.subCondClash === true
              ? " Sub-conductors clash during short circuit — review bundle spacing."
              : inputs.nc > 1 ? ` No sub-conductor clashing detected (j=${results.j?.toFixed(3) ?? 'N/A'}).` : ""
            }
          </p>
        </div>
      </div>
    </div>
  );
}
