"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, ShieldAlert, Network, DollarSign, Shield, Cable, Activity,
  Sparkles, FileText, History, Home, Play, FileDown, Zap, Command
} from "lucide-react";
import type { ModuleId } from "@/components/v2/Sidebar";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  category: "navigate" | "action";
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: ModuleId) => void;
  onRunCalculation?: () => void;
}

export function CommandPalette({ isOpen, onClose, onNavigate, onRunCalculation }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: "home", label: "Home Dashboard", description: "Go to overview", icon: Home, category: "navigate", action: () => { onNavigate("home"); onClose(); } },
    { id: "fault", label: "Fault Analysis", description: "IEC 60909 short-circuit currents", icon: ShieldAlert, category: "navigate", action: () => { onNavigate("fault"); onClose(); } },
    { id: "loadflow", label: "Load Flow", description: "Newton-Raphson meshed network", icon: Network, category: "navigate", action: () => { onNavigate("loadflow"); onClose(); } },
    { id: "losses", label: "Losses & ROI", description: "Technical loss analysis", icon: DollarSign, category: "navigate", action: () => { onNavigate("losses"); onClose(); } },
    { id: "contingency", label: "N-1 Contingency", description: "Single outage reliability", icon: Shield, category: "navigate", action: () => { onNavigate("contingency"); onClose(); } },
    { id: "sagtension", label: "Sag-Tension", description: "IS 802 catenary calculation", icon: Cable, category: "navigate", action: () => { onNavigate("sagtension"); onClose(); } },
    { id: "scforces", label: "SC Forces", description: "IEC 60865-1 mechanical forces", icon: Activity, category: "navigate", action: () => { onNavigate("scforces"); onClose(); } },
    { id: "ai", label: "AI Insights", description: "AI-powered recommendations", icon: Sparkles, category: "navigate", action: () => { onNavigate("ai"); onClose(); } },
    { id: "report", label: "Report", description: "Engineering report generation", icon: FileText, category: "navigate", action: () => { onNavigate("report"); onClose(); } },
    { id: "history", label: "History", description: "Revision tracking", icon: History, category: "navigate", action: () => { onNavigate("history"); onClose(); } },
    // Actions
    { id: "run", label: "Run Calculation", description: "Execute active module", icon: Play, category: "action", action: () => { onRunCalculation?.(); onClose(); } },
    { id: "export", label: "Export Report", description: "Generate PDF report", icon: FileDown, category: "action", action: () => { onClose(); } },
  ], [onNavigate, onClose, onRunCalculation]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  }, [query, commands]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  const navigateItems = filtered.filter(c => c.category === "navigate");
  const actionItems = filtered.filter(c => c.category === "action");

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-[560px] bg-[#111827] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
          <Search className="w-4.5 h-4.5 text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-slate-600 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] text-slate-500 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-2 no-scrollbar">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-slate-600">No results for &ldquo;{query}&rdquo;</div>
          )}

          {navigateItems.length > 0 && (
            <>
              <div className="px-4 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Navigate</div>
              {navigateItems.map((item) => {
                const idx = filtered.indexOf(item);
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all cursor-pointer ${
                      idx === selectedIndex ? "bg-blue-500/10 text-white" : "text-slate-400 hover:bg-white/[0.03]"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${idx === selectedIndex ? "text-blue-400" : "text-slate-600"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{item.label}</div>
                      <div className="text-[11px] text-slate-600 truncate">{item.description}</div>
                    </div>
                    {idx === selectedIndex && (
                      <span className="text-[10px] text-slate-600 font-mono">↵</span>
                    )}
                  </button>
                );
              })}
            </>
          )}

          {actionItems.length > 0 && (
            <>
              <div className="px-4 py-1 mt-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Actions</div>
              {actionItems.map((item) => {
                const idx = filtered.indexOf(item);
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all cursor-pointer ${
                      idx === selectedIndex ? "bg-blue-500/10 text-white" : "text-slate-400 hover:bg-white/[0.03]"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${idx === selectedIndex ? "text-teal-400" : "text-slate-600"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{item.label}</div>
                      <div className="text-[11px] text-slate-600 truncate">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.06] text-[10px] text-slate-600">
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] font-mono">↑↓</kbd> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] font-mono">↵</kbd> Select</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] font-mono">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
