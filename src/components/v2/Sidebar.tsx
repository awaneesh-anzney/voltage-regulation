"use client";

import { useState } from "react";
import {
  Zap, BarChart3, DollarSign, Shield, Network, ShieldAlert, Activity,
  Cable, Sparkles, FileText, History, Home, Lock, Gauge, Scale, Compass,
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeft, Settings, FolderOpen
} from "lucide-react";

export type ModuleId =
  | "home" | "projects"
  | "fault" | "loadflow" | "losses" | "contingency" | "protection" | "ctsizing" | "earthmat"
  | "conductorsizing" | "sagtension" | "scforces"
  | "ai" | "report" | "history";

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ElementType;
  comingSoon?: boolean;
}

interface NavGroup {
  label: string;
  accent: string;
  emoji: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Electrical",
    accent: "blue",
    emoji: "⚡",
    items: [
      { id: "fault",       label: "Fault Analysis",     icon: ShieldAlert },
      { id: "loadflow",    label: "Load Flow",          icon: Network },
      { id: "losses",      label: "Losses & ROI",       icon: DollarSign },
      { id: "contingency", label: "N-1 Contingency",    icon: Shield },
      { id: "protection",  label: "Protection Coord.",  icon: ShieldAlert },
      { id: "ctsizing",    label: "CT Sizing",          icon: Gauge },
      { id: "earthmat",    label: "Earthmat Design",    icon: Compass },
    ],
  },
  {
    label: "Mechanical",
    accent: "teal",
    emoji: "🏗️",
    items: [
      { id: "conductorsizing", label: "Conductor Sizing", icon: Scale },
      { id: "sagtension",      label: "Sag-Tension",      icon: Cable },
      { id: "scforces",        label: "SC Forces",        icon: Activity },
    ],
  },
  {
    label: "Output",
    accent: "purple",
    emoji: "📊",
    items: [
      { id: "ai",      label: "AI Insights",  icon: Sparkles },
      { id: "report",  label: "Report",       icon: FileText },
      { id: "history", label: "History",       icon: History },
    ],
  },
];

interface SidebarProps {
  activeModule: ModuleId;
  onModuleChange: (id: ModuleId) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ activeModule, onModuleChange, collapsed, onToggle }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Electrical: true,
    Mechanical: true,
    Output: true,
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const accentMap: Record<string, string> = {
    blue: "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    teal: "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400",
    purple: "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  };

  const hoverAccentMap: Record<string, string> = {
    blue: "hover:bg-blue-500/5 hover:text-blue-700 dark:hover:text-blue-300",
    teal: "hover:bg-teal-500/5 hover:text-teal-700 dark:hover:text-teal-300",
    purple: "hover:bg-purple-500/5 hover:text-purple-700 dark:hover:text-purple-300",
  };

  const groupHeaderColorMap: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-500",
    teal: "text-teal-600 dark:text-teal-500",
    purple: "text-purple-600 dark:text-purple-500",
  };

  return (
    <div
      className={`h-full flex flex-col border-r border-border bg-background transition-all duration-300 ${
        collapsed ? "w-[64px]" : "w-[240px]"
      }`}
    >

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 no-scrollbar">
        {/* Home & Projects */}
        <div className="pt-2 space-y-1">
          <button
            onClick={() => onModuleChange("home")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
              activeModule === "home"
                ? "border-l-2 border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground border-l-2 border-transparent"
            }`}
          >
          <Home className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Home</span>}
          </button>
          <button
            onClick={() => onModuleChange("projects")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
              activeModule === "projects"
                ? "border-l-2 border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground border-l-2 border-transparent"
            }`}
          >
          <FolderOpen className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Projects & Cases</span>}
          </button>
        </div>

        {/* Grouped Navigation */}
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mt-3">
            {/* Group Header */}
            {!collapsed ? (
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${groupHeaderColorMap[group.accent]} hover:opacity-80 transition-opacity cursor-pointer`}
              >
                <span className="text-[12px]">{group.emoji}</span>
                <span className="flex-1 text-left">{group.label}</span>
                {expandedGroups[group.label]
                  ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />
                  : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                }
              </button>
            ) : (
              <div className="h-px bg-white/[0.06] mx-2 my-2" />
            )}

            {/* Group Items */}
            {(collapsed || expandedGroups[group.label]) && (
              <div className="space-y-0.5 mt-0.5">
                {group.items.map((item) => {
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => !item.comingSoon && onModuleChange(item.id)}
                      disabled={item.comingSoon}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                        item.comingSoon
                          ? "text-muted-foreground/80 cursor-not-allowed opacity-50"
                          : isActive
                            ? `border-l-2 ${accentMap[group.accent]}`
                            : `border-l-2 border-transparent text-muted-foreground ${hoverAccentMap[group.accent]} cursor-pointer`
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.comingSoon && (
                            <span className="text-[8px] font-bold text-muted-foreground bg-accent/60 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Soon
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Profile Area */}
      <div className="border-t border-border p-3 shrink-0 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">AK</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold text-foreground truncate">A. Khan</span>
              <span className="text-[10px] text-muted-foreground truncate">Lead Engineer</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">AK</span>
            </div>
          </div>
        )}
        
        {!collapsed && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer">
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {collapsed && (
        <div className="p-2 flex justify-center pb-4">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
            title="Expand sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
