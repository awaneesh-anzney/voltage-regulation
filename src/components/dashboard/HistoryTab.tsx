"use client";

import { HistoryItem } from "@/app/dashboard/page";
import { Play, Trash2, FolderOpen, RefreshCw, BarChart, Zap, Layers, Sparkles } from "lucide-react";

interface HistoryTabProps {
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  currentActiveReg: number;
  currentActiveLoss: number;
}

export function HistoryTab({
  history,
  onRestore,
  onDelete,
  onClearAll,
  currentActiveReg,
  currentActiveLoss,
}: HistoryTabProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl bg-white/[0.02] border border-white/[0.05]">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
          <FolderOpen className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">No Saved Scenarios</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Save your current calculations by clicking the <span className="text-blue-400 font-medium">Save Scenario</span> button at the bottom of the sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-400 animate-spin-slow" />
            Calculation History
          </h2>
          <p className="text-xs text-slate-400">
            Compare, manage, and restore previously saved system configurations.
          </p>
        </div>
        <button
          onClick={onClearAll}
          className="text-xs font-medium text-red-400 hover:text-red-300 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-all cursor-pointer"
        >
          Clear All History
        </button>
      </div>

      {/* SCENARIO GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {history.map((item) => {
          // Compare with current active
          const regDiff = currentActiveReg - item.peakReg;
          const lossDiff = currentActiveLoss - item.totalLoss;

          // Determine status color
          const limitNum = parseFloat(item.limit) || 5;
          const isCompliant = item.peakReg <= limitNum;

          return (
            <div
              key={item.id}
              className="bg-[#0f1520]/80 border border-white/[0.06] rounded-xl p-5 space-y-4 hover:border-blue-500/30 hover:bg-[#0f1520] transition-all flex flex-col justify-between group shadow-lg"
            >
              {/* Title & Timestamp */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors text-[15px]">
                      {item.name || "Untitled Scenario"}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Client: <span className="text-slate-300">{item.client || "Generic Client"}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.05]">
                    {item.timestamp}
                  </span>
                </div>

                {/* Technical Parameters Summary Table */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-white/[0.02] border border-white/[0.04] p-2 rounded-lg text-center">
                    <div className="text-[10px] text-slate-500 font-medium">Voltage</div>
                    <div className="text-xs font-semibold text-slate-200 mt-0.5">{item.voltage} kV</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.04] p-2 rounded-lg text-center">
                    <div className="text-[10px] text-slate-500 font-medium">Conductor</div>
                    <div className="text-xs font-semibold text-slate-200 mt-0.5 capitalize">{item.conductor}</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.04] p-2 rounded-lg text-center">
                    <div className="text-[10px] text-slate-500 font-medium">Segments</div>
                    <div className="text-xs font-semibold text-slate-200 mt-0.5">{item.segments.length} Segs</div>
                  </div>
                </div>

                {/* Regulation & Losses Output Panel */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {/* Peak Regulation Result */}
                  <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                      <BarChart className="w-3 h-3 text-cyan-400" /> Peak Reg.
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className={`text-base font-bold font-mono ${isCompliant ? "text-emerald-400" : "text-red-400"}`}>
                        {item.peakReg.toFixed(2)}%
                      </span>
                      <span className="text-[9px] text-slate-500">(Limit: {item.limit}%)</span>
                    </div>
                  </div>

                  {/* Losses Result */}
                  <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400" /> Active Losses
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-base font-bold font-mono text-amber-400">
                        {item.totalLoss.toFixed(1)} kW
                      </span>
                    </div>
                  </div>
                </div>

                {/* STATCOM status info */}
                {item.statcomEnable === "on" && (
                  <div className="mt-2.5 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/25 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[10px] text-purple-300">
                      STATCOM Active: {item.statcomMvar} MVAR at Bus S{parseInt(item.statcomBus) + 1}
                    </span>
                  </div>
                )}

                {/* Scenario comparison panel vs Active */}
                <div className="mt-3.5 border-t border-dashed border-white/[0.06] pt-3.5 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Comparison vs Active Configuration
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Regulation Delta:</span>
                    <span className={`font-mono font-semibold ${regDiff === 0 ? "text-slate-400" : regDiff > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {regDiff === 0 ? "0.00%" : `${regDiff > 0 ? "-" : "+"}${Math.abs(regDiff).toFixed(2)}%`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Losses Delta:</span>
                    <span className={`font-mono font-semibold ${lossDiff === 0 ? "text-slate-400" : lossDiff > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {lossDiff === 0 ? "0.0 kW" : `${lossDiff > 0 ? "-" : "+"}${Math.abs(lossDiff).toFixed(1)} kW`}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD ACTIONS */}
              <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/[0.04]">
                <button
                  onClick={() => onRestore(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg py-2 transition-all cursor-pointer hover:shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
                >
                  <Play className="w-3.5 h-3.5" /> Restore Scenario
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 rounded-lg p-2 transition-all cursor-pointer"
                  title="Delete from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
