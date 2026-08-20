"use client";

import { useState } from "react";
import {
  Zap, BarChart3, DollarSign, Shield, Network, ShieldAlert, Activity,
  Cable, Sparkles, FileText, History, Home, Lock, Gauge,
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeft, Settings
} from "lucide-react";

export type ModuleId =
  | "home"
  | "fault" | "loadflow" | "losses" | "contingency" | "protection" | "ctsizing"
  | "sagtension" | "scforces"
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
    ],
  },
  {
    label: "Mechanical",
    accent: "teal",
    emoji: "🏗️",
    items: [
      { id: "sagtension", label: "Sag-Tension",   icon: Cable },
      { id: "scforces",   label: "SC Forces",     icon: Activity },
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
    blue: "border-blue-500 bg-blue-500/10 text-blue-400",
    teal: "border-teal-500 bg-teal-500/10 text-teal-400",
    purple: "border-purple-500 bg-purple-500/10 text-purple-400",
  };

  const hoverAccentMap: Record<string, string> = {
    blue: "hover:bg-blue-500/5 hover:text-blue-300",
    teal: "hover:bg-teal-500/5 hover:text-teal-300",
    purple: "hover:bg-purple-500/5 hover:text-purple-300",
  };

  return (
    <div
      className={`h-full flex flex-col border-r border-white/[0.06] bg-[#0c1220] transition-all duration-300 ${
        collapsed ? "w-[52px]" : "w-[240px]"
      }`}
    >
      {/* Logo & Toggle */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 h-14 border-b border-white/[0.06] shrink-0`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-[15px] font-bold text-white tracking-tight">GridIntel</span>
              <span className="text-[9px] font-bold text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded-md uppercase tracking-widest">v2</span>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="w-4 h-4 shrink-0" /> : <PanelLeftClose className="w-4 h-4 shrink-0" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 no-scrollbar">
        {/* Home */}
        <button
          onClick={() => onModuleChange("home")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
            activeModule === "home"
              ? "border-l-2 border-blue-500 bg-blue-500/10 text-white"
              : "text-slate-400 hover:bg-white/[0.04] hover:text-white border-l-2 border-transparent"
          }`}
        >
          <Home className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Home</span>}
        </button>

        {/* Grouped Navigation */}
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mt-3">
            {/* Group Header */}
            {!collapsed ? (
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <span>{group.emoji}</span>
                <span className="flex-1 text-left">{group.label}</span>
                {expandedGroups[group.label]
                  ? <ChevronDown className="w-3 h-3" />
                  : <ChevronRight className="w-3 h-3" />
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
                          ? "text-slate-600 cursor-not-allowed opacity-50"
                          : isActive
                            ? `border-l-2 ${accentMap[group.accent]}`
                            : `border-l-2 border-transparent text-slate-400 ${hoverAccentMap[group.accent]} cursor-pointer`
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.comingSoon && (
                            <span className="text-[8px] font-bold text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded uppercase tracking-wider">
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

      {/* Bottom */}
      <div className="border-t border-white/[0.06] p-2 shrink-0">
        <button className="w-full flex items-center justify-center gap-2.5 p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer">
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-[12px] flex-1 text-left">Settings</span>}
        </button>
      </div>
    </div>
  );
}
