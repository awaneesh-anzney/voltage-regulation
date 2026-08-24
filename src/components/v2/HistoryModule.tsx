"use client";

import { useState, useMemo } from "react";
import {
  History, RotateCcw, Clock, ChevronDown, ChevronRight,
  Zap, Cable, ShieldAlert, Settings, Link2, Search,
  Trash2, AlertTriangle, Download, Filter, Network,
  DollarSign, Shield, Gauge, Activity, Sparkles, FileText, X
} from "lucide-react";
import type { HistoryEntry } from "@/lib/useHistoryState";

// ─── Module Metadata ───
type ModuleKey = "fault" | "scforces" | "sagtension" | "ctsizing" | "protection" | "loadflow" | "losses" | "initial" | "general";

interface ModuleMeta {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const MODULE_META: Record<ModuleKey, ModuleMeta> = {
  fault:       { label: "Fault Analysis",     icon: ShieldAlert, color: "text-blue-500",    bgColor: "bg-blue-500/10",    borderColor: "border-blue-500/30" },
  scforces:    { label: "SC Forces",          icon: Activity,    color: "text-emerald-500",  bgColor: "bg-emerald-500/10",  borderColor: "border-emerald-500/30" },
  sagtension:  { label: "Sag-Tension",        icon: Cable,       color: "text-amber-500",    bgColor: "bg-amber-500/10",    borderColor: "border-amber-500/30" },
  ctsizing:    { label: "CT Sizing",          icon: Gauge,       color: "text-purple-500",   bgColor: "bg-purple-500/10",   borderColor: "border-purple-500/30" },
  protection:  { label: "Protection",         icon: Shield,      color: "text-red-500",      bgColor: "bg-red-500/10",      borderColor: "border-red-500/30" },
  loadflow:    { label: "Load Flow",          icon: Network,     color: "text-indigo-500",   bgColor: "bg-indigo-500/10",   borderColor: "border-indigo-500/30" },
  losses:      { label: "Losses & ROI",       icon: DollarSign,  color: "text-green-500",    bgColor: "bg-green-500/10",    borderColor: "border-green-500/30" },
  initial:     { label: "System",             icon: Settings,    color: "text-slate-500",    bgColor: "bg-slate-500/10",    borderColor: "border-slate-500/30" },
  general:     { label: "General",            icon: Settings,    color: "text-muted-foreground", bgColor: "bg-accent/50", borderColor: "border-border" },
};

function classifyEntry(desc: string): ModuleKey {
  const d = desc.toLowerCase();
  if (d.includes("initial") || d.includes("cleared") || d.includes("project")) return "initial";
  if (d.includes("fault"))                                    return "fault";
  if (d.includes("sc forces") || d.includes("clearance"))     return "scforces";
  if (d.includes("sag") || d.includes("tension"))             return "sagtension";
  if (d.includes("ct sizing") || d.includes("current transformer")) return "ctsizing";
  if (d.includes("protection") || d.includes("relay"))        return "protection";
  if (d.includes("load flow") || d.includes("bus") || d.includes("branch")) return "loadflow";
  if (d.includes("losses") || d.includes("roi"))              return "losses";
  if (d.includes("link") || d.includes("feed"))               return "scforces"; // links go to SC
  return "general";
}

function getModuleFromDesc(desc: string): string | null {
  const key = classifyEntry(desc);
  if (key === "initial" || key === "general") return null;
  return key === "scforces" ? "scforces" : key;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

function getTimeGroup(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400_000);

  if (d >= today) return "Today";
  if (d >= yesterday) return "Yesterday";
  return formatDate(ts);
}

// ─── Props ───
interface HistoryModuleProps<T> {
  history: HistoryEntry<T>[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRevertTo: (index: number) => void;
  onDeleteEntry?: (index: number) => void;
  onClearHistory?: () => void;
  onNavigate?: (moduleId: any) => void;
}

export function HistoryModule<T>({
  history, currentIndex, canUndo, canRedo,
  onUndo, onRedo, onRevertTo, onDeleteEntry, onClearHistory, onNavigate
}: HistoryModuleProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModule, setFilterModule] = useState<ModuleKey | "all">("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);

  // ─── Computed Stats ───
  const stats = useMemo(() => {
    const moduleCounts: Record<string, number> = {};
    history.forEach(e => {
      const key = classifyEntry(e.description);
      moduleCounts[key] = (moduleCounts[key] || 0) + 1;
    });

    const activeModules = Object.keys(moduleCounts).filter(k => k !== "initial" && k !== "general");

    const oldestTs = history.length > 0 ? history[0].timestamp : Date.now();
    const newestTs = history.length > 0 ? history[history.length - 1].timestamp : Date.now();
    const spanMinutes = Math.max(1, Math.round((newestTs - oldestTs) / 60_000));

    return {
      totalRevisions: history.length,
      undoable: currentIndex,
      redoable: history.length - currentIndex - 1,
      activeModules: activeModules.length,
      moduleCounts,
      spanMinutes,
    };
  }, [history, currentIndex]);

  // ─── Filtered & Grouped History ───
  const filteredHistory = useMemo(() => {
    return history.map((entry, idx) => ({ entry, realIdx: idx })).filter(({ entry }) => {
      const matchSearch = searchQuery === "" ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = filterModule === "all" ||
        classifyEntry(entry.description) === filterModule;
      return matchSearch && matchFilter;
    });
  }, [history, searchQuery, filterModule]);

  // Group by time
  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof filteredHistory }[] = [];
    const reversed = [...filteredHistory].reverse();
    let currentGroup = "";
    for (const item of reversed) {
      const groupLabel = getTimeGroup(item.entry.timestamp);
      if (groupLabel !== currentGroup) {
        currentGroup = groupLabel;
        groups.push({ label: groupLabel, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    }
    return groups;
  }, [filteredHistory]);

  // ─── Export ───
  const handleExport = () => {
    const exportData = history.map((e, i) => ({
      index: i,
      description: e.description,
      timestamp: new Date(e.timestamp).toISOString(),
      isCurrent: i === currentIndex,
      module: classifyEntry(e.description),
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gridintel-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Active filter modules for quick filter buttons
  const activeFilterModules = useMemo(() => {
    const keys = new Set<ModuleKey>();
    history.forEach(e => {
      const k = classifyEntry(e.description);
      if (k !== "initial" && k !== "general") keys.add(k);
    });
    return Array.from(keys);
  }, [history]);

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            Revision History
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5 max-w-2xl">
            Track, search, restore or delete any parameter change across all modules.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total</div>
          <div className="text-xl font-bold text-foreground">{stats.totalRevisions}</div>
          <div className="text-[10px] text-muted-foreground">revisions</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Undoable</div>
          <div className="text-xl font-bold text-blue-500">{stats.undoable}</div>
          <div className="text-[10px] text-muted-foreground">steps back</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Redoable</div>
          <div className="text-xl font-bold text-emerald-500">{stats.redoable}</div>
          <div className="text-[10px] text-muted-foreground">steps forward</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Modules</div>
          <div className="text-xl font-bold text-purple-500">{stats.activeModules}</div>
          <div className="text-[10px] text-muted-foreground">touched</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold bg-card border border-border hover:bg-accent/80 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Undo
          <kbd className="ml-1 px-1.5 py-0.5 bg-accent/60 rounded text-[9px] text-muted-foreground font-mono">Ctrl+Z</kbd>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold bg-card border border-border hover:bg-accent/80 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" />
          Redo
          <kbd className="ml-1 px-1.5 py-0.5 bg-accent/60 rounded text-[9px] text-muted-foreground font-mono">Ctrl+Shift+Z</kbd>
        </button>

        <div className="flex-1" />

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold bg-card border border-border hover:bg-accent/80 transition-all cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <Download className="w-3.5 h-3.5" />
          Export JSON
        </button>

        {onClearHistory && (
          showClearConfirm ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[11px] font-medium text-red-500">Clear all?</span>
              <button
                onClick={() => { onClearHistory(); setShowClearConfirm(false); }}
                className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 transition-colors cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-0.5 rounded-md bg-accent border border-border text-[10px] font-bold text-foreground hover:bg-accent/80 transition-colors cursor-pointer"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={history.length <= 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold bg-card border border-red-500/20 hover:bg-red-500/10 transition-all cursor-pointer text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history... (e.g. &quot;fault&quot;, &quot;sag-tension&quot;)"
            className="w-full bg-card border border-border rounded-xl pl-10 pr-8 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/30"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Module Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterModule("all")}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              filterModule === "all"
                ? "bg-blue-500/15 border-blue-500/30 text-blue-500"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {activeFilterModules.map(key => {
            const meta = MODULE_META[key];
            const isActive = filterModule === key;
            return (
              <button
                key={key}
                onClick={() => setFilterModule(isActive ? "all" : key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                  isActive
                    ? `${meta.bgColor} ${meta.borderColor} ${meta.color}`
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <meta.icon className="w-3 h-3" />
                {meta.label}
                <span className="text-[9px] opacity-60 ml-0.5">
                  {stats.moduleCounts[key] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-[13px] font-medium text-muted-foreground">No matching entries found</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Try a different search or filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.label} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Group Header */}
              <div className="px-5 py-2.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <h3 className="text-[12px] font-bold text-foreground/80 uppercase tracking-wider">{group.label}</h3>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {group.items.length} change{group.items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Entries */}
              <div className="divide-y divide-border/50">
                {group.items.map(({ entry, realIdx }) => {
                  const isCurrent = realIdx === currentIndex;
                  const isFuture = realIdx > currentIndex;
                  const moduleKey = classifyEntry(entry.description);
                  const meta = MODULE_META[moduleKey];
                  const Icon = meta.icon;

                  return (
                    <div
                      key={realIdx}
                      className={`group flex items-start gap-3 px-5 py-3.5 transition-all ${
                        isCurrent
                          ? "bg-blue-500/[0.06] border-l-2 border-l-blue-500"
                          : isFuture
                          ? "opacity-40 border-l-2 border-l-transparent"
                          : "border-l-2 border-l-transparent hover:bg-accent/30"
                      }`}
                    >
                      {/* Icon */}
                      <div className="pt-0.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isCurrent ? "bg-blue-500/20 border border-blue-500/30" : `${meta.bgColor} border ${meta.borderColor}`
                        }`}>
                          <Icon className={`w-4 h-4 ${isCurrent ? "text-blue-500" : meta.color}`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[13px] font-medium truncate ${
                            isCurrent ? "text-foreground" : isFuture ? "text-muted-foreground/80" : "text-foreground/90"
                          }`}>
                            {entry.description}
                          </span>

                          {/* Module badge */}
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0 ${meta.bgColor} ${meta.color}`}>
                            {meta.label}
                          </span>

                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-[9px] font-bold text-blue-500 uppercase tracking-wider shrink-0">
                              Current
                            </span>
                          )}
                          {isFuture && (
                            <span className="px-1.5 py-0.5 rounded-md bg-accent text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider shrink-0">
                              Redo
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
                          {formatTime(entry.timestamp)} · {timeAgo(entry.timestamp)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isCurrent && (
                          <button
                            onClick={() => {
                              onRevertTo(realIdx);
                              if (onNavigate) {
                                const mod = getModuleFromDesc(entry.description);
                                if (mod) onNavigate(mod);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-foreground bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all cursor-pointer"
                          >
                            Restore
                          </button>
                        )}
                        {!isCurrent && onDeleteEntry && (
                          deleteConfirmIdx === realIdx ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { onDeleteEntry(realIdx); setDeleteConfirmIdx(null); }}
                                className="px-2 py-1 rounded-md bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirmIdx(null)}
                                className="px-2 py-1 rounded-md bg-accent border border-border text-[10px] font-bold text-foreground cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmIdx(realIdx)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                              title="Delete this entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-[10px] text-muted-foreground/50 font-mono pt-4">
        History engine · Max {20} revisions · Persisted to localStorage
      </div>
    </div>
  );
}
