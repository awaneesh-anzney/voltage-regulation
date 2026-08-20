"use client";

import { useState } from "react";
import { Search, Link2, Pencil, Command, RotateCcw } from "lucide-react";
import type { ModuleId } from "./Sidebar";

// Breadcrumb mapping
const MODULE_BREADCRUMBS: Record<ModuleId, { domain: string; domainEmoji: string; label: string }> = {
  home:        { domain: "", domainEmoji: "", label: "Home" },
  fault:       { domain: "Electrical", domainEmoji: "⚡", label: "Fault Analysis" },
  loadflow:    { domain: "Electrical", domainEmoji: "⚡", label: "Load Flow" },
  losses:      { domain: "Electrical", domainEmoji: "⚡", label: "Losses & ROI" },
  contingency: { domain: "Electrical", domainEmoji: "⚡", label: "N-1 Contingency" },
  protection:  { domain: "Electrical", domainEmoji: "⚡", label: "Protection Coordination" },
  ctsizing:    { domain: "Electrical", domainEmoji: "⚡", label: "CT Sizing" },
  sagtension:  { domain: "Mechanical", domainEmoji: "🏗️", label: "Sag-Tension" },
  scforces:    { domain: "Mechanical", domainEmoji: "🏗️", label: "SC Forces" },
  ai:          { domain: "Output", domainEmoji: "📊", label: "AI Insights" },
  report:      { domain: "Output", domainEmoji: "📊", label: "Report" },
  history:     { domain: "Output", domainEmoji: "📊", label: "History" },
};

interface TopBarProps {
  activeModule: ModuleId;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  systemVoltage_kV: number;
  baseMVA: number;
  activeLinksCount: number;
  onCommandPalette?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function TopBar({
  activeModule, projectName, onProjectNameChange,
  systemVoltage_kV, baseMVA, activeLinksCount, onCommandPalette,
  canUndo, canRedo, onUndo, onRedo,
}: TopBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName);

  const bc = MODULE_BREADCRUMBS[activeModule];

  const handleSave = () => {
    onProjectNameChange(editValue.trim() || projectName);
    setIsEditing(false);
  };

  return (
    <div className="h-14 flex items-center border-b border-white/[0.06] bg-[#0c1220]/80 backdrop-blur-xl px-5 gap-4 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px] min-w-0">
        {bc.domain ? (
          <>
            <span className="text-slate-500">{bc.domainEmoji} {bc.domain}</span>
            <span className="text-slate-600 mx-0.5">/</span>
            <span className="text-white font-medium truncate">{bc.label}</span>
          </>
        ) : (
          <span className="text-white font-medium">{bc.label}</span>
        )}
      </div>

      {/* Project Name (Center) */}
      <div className="flex-1 flex justify-center">
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditValue(projectName); setIsEditing(false); } }}
            autoFocus
            className="bg-white/[0.05] border border-blue-500/30 rounded-lg px-3 py-1 text-[13px] text-white font-medium text-center focus:outline-none focus:ring-1 focus:ring-blue-500/30 w-72"
          />
        ) : (
          <button
            onClick={() => { setEditValue(projectName); setIsEditing(true); }}
            className="flex items-center gap-1.5 text-[13px] text-slate-300 hover:text-white transition-colors cursor-pointer group"
          >
            <span className="font-medium">{projectName}</span>
            <Pencil className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
          </button>
        )}
      </div>

      {/* Right: Global State Pills */}
      <div className="flex items-center gap-2">
        {/* System Voltage */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold">
          {systemVoltage_kV} kV
        </div>

        {/* Base MVA */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-semibold">
          {baseMVA} MVA
        </div>

        {/* Active Links */}
        {activeLinksCount > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[11px] font-semibold">
            <Link2 className="w-3 h-3" />
            {activeLinksCount} Link{activeLinksCount > 1 ? "s" : ""} Active
          </div>
        )}

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" />
          </button>
        </div>

        {/* Command Palette Trigger */}
        <button onClick={onCommandPalette} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer text-[11px]">
          <Command className="w-3 h-3" />
          <span className="font-medium">K</span>
        </button>
      </div>
    </div>
  );
}
