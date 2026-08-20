"use client";

import { useState } from "react";
import {
  History, RotateCcw, Clock, ChevronDown, ChevronRight,
  Zap, Cable, ShieldAlert, Settings, ArrowRight, Link2
} from "lucide-react";
import type { HistoryEntry } from "@/lib/useHistoryState";

// Icon mapping for commit descriptions
function getCommitIcon(desc: string): React.ElementType {
  if (desc.includes("Fault") || desc.includes("fault")) return ShieldAlert;
  if (desc.includes("SC Forces") || desc.includes("sc")) return Zap;
  if (desc.includes("Sag") || desc.includes("sag") || desc.includes("Tension")) return Cable;
  if (desc.includes("Link") || desc.includes("Feed") || desc.includes("feed")) return Link2;
  return Settings;
}

function getCommitColor(desc: string): string {
  if (desc.includes("Fault") || desc.includes("fault")) return "text-blue-400";
  if (desc.includes("SC Forces") || desc.includes("sc")) return "text-emerald-400";
  if (desc.includes("Sag") || desc.includes("sag") || desc.includes("Tension")) return "text-amber-400";
  if (desc.includes("Link") || desc.includes("Feed") || desc.includes("feed")) return "text-teal-400";
  return "text-slate-400";
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3600_000)}h ago`;
}

interface HistoryModuleProps<T> {
  history: HistoryEntry<T>[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRevertTo: (index: number) => void;
}

export function HistoryModule<T>({
  history, currentIndex, canUndo, canRedo, onUndo, onRedo, onRevertTo
}: HistoryModuleProps<T>) {
  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-blue-500" />
          Revision History
        </h1>
        <p className="text-[13px] text-slate-400 mt-1.5 max-w-2xl">
          Complete history of all parameter changes across modules. Navigate back to any point in time.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold bg-[#111827] border border-white/[0.06] hover:bg-white/[0.05] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-white"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Undo
          <kbd className="ml-1 px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-slate-500 font-mono">Ctrl+Z</kbd>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold bg-[#111827] border border-white/[0.06] hover:bg-white/[0.05] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-white"
        >
          <RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" />
          Redo
          <kbd className="ml-1 px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-slate-500 font-mono">Ctrl+Shift+Z</kbd>
        </button>
        <div className="ml-auto text-[11px] text-slate-600 font-mono">
          {history.length} revision{history.length !== 1 ? "s" : ""} · Position {currentIndex + 1}/{history.length}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
          <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Timeline</h3>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <Clock className="w-3 h-3" />
            Most recent first
          </div>
        </div>

        <div className="divide-y divide-white/[0.03] max-h-[600px] overflow-y-auto no-scrollbar">
          {[...history].reverse().map((entry, reverseIdx) => {
            const realIdx = history.length - 1 - reverseIdx;
            const isCurrent = realIdx === currentIndex;
            const isFuture = realIdx > currentIndex;
            const Icon = getCommitIcon(entry.description);
            const color = getCommitColor(entry.description);

            return (
              <div
                key={reverseIdx}
                className={`flex items-start gap-3 px-5 py-3.5 transition-all ${
                  isCurrent
                    ? "bg-blue-500/[0.06] border-l-2 border-l-blue-500"
                    : isFuture
                    ? "opacity-40 border-l-2 border-l-transparent"
                    : "border-l-2 border-l-transparent hover:bg-white/[0.02]"
                }`}
              >
                {/* Timeline dot */}
                <div className="pt-0.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isCurrent ? "bg-blue-500/20 border border-blue-500/30" : "bg-white/[0.04] border border-white/[0.06]"
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-blue-400" : color}`} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-medium truncate ${
                      isCurrent ? "text-white" : isFuture ? "text-slate-600" : "text-slate-300"
                    }`}>
                      {entry.description}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-[9px] font-bold text-blue-400 uppercase tracking-wider shrink-0">
                        Current
                      </span>
                    )}
                    {isFuture && (
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-500/10 text-[9px] font-bold text-slate-600 uppercase tracking-wider shrink-0">
                        Redo
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                    {formatTime(entry.timestamp)} · {timeAgo(entry.timestamp)}
                  </div>
                </div>

                {/* Revert button */}
                {!isCurrent && (
                  <button
                    onClick={() => onRevertTo(realIdx)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer shrink-0"
                  >
                    Restore
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
