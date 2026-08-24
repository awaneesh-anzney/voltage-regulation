"use client";

import { useState, useRef } from "react";
import { Search, Link2, Pencil, Command, RotateCcw, Zap, Sun, Moon, FilePlus, Save, FolderOpen, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState as useReactState } from "react";
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
  onNewCase?: () => void;
  onSaveCase?: () => void;
  onLoadCase?: (file: File) => void;
}

export function TopBar({
  activeModule, projectName, onProjectNameChange,
  systemVoltage_kV, baseMVA, activeLinksCount, onCommandPalette,
  canUndo, canRedo, onUndo, onRedo,
  onNewCase, onSaveCase, onLoadCase,
}: TopBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useReactState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close file menu on click outside
  useEffect(() => {
    if (!fileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [fileMenuOpen]);

  const bc = MODULE_BREADCRUMBS[activeModule];

  const handleSave = () => {
    onProjectNameChange(editValue.trim() || projectName);
    setIsEditing(false);
  };

  return (
    <div className="h-14 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-5 gap-4 shrink-0">
      
      {/* Left: Logo & Breadcrumb */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-foreground fill-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-foreground tracking-tight">GridIntel</span>
            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase tracking-widest">v2.0</span>
          </div>
        </div>

        <div className="w-px h-4 bg-border hidden sm:block" />

        {/* File Actions Dropdown */}
        <div className="relative" ref={fileMenuRef}>
          <button
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <span>File</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {fileMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-popover border border-border rounded-xl shadow-xl shadow-black/20 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                onClick={() => { onNewCase?.(); setFileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <FilePlus className="w-4 h-4 text-blue-400" />
                <span>New Case</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">Ctrl+N</span>
              </button>
              <button
                onClick={() => { onSaveCase?.(); setFileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save Case</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">Ctrl+S</span>
              </button>
              <div className="h-px bg-border mx-3 my-1" />
              <button
                onClick={() => { fileInputRef.current?.click(); setFileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>Load Case</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">Ctrl+O</span>
              </button>
            </div>
          )}

          {/* Hidden file input for Load Case */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onLoadCase?.(file);
                e.target.value = ""; // Reset for re-upload
              }
            }}
          />
        </div>

        <div className="w-px h-4 bg-border hidden sm:block" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px] min-w-0 font-medium">
          {bc.domain ? (
            <>
              <span className="text-muted-foreground">{bc.label === 'Home' ? 'Home' : bc.domain}</span>
              <span className="text-muted-foreground/50 mx-0.5">/</span>
              <span className="text-foreground truncate">{bc.label}</span>
            </>
          ) : (
            <span className="text-foreground">{bc.label}</span>
          )}
        </div>
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
            className="bg-accent/80 border border-blue-500/30 rounded-lg px-3 py-1 text-[13px] text-foreground font-medium text-center focus:outline-none focus:ring-1 focus:ring-blue-500/30 w-72"
          />
        ) : (
          <button
            onClick={() => { setEditValue(projectName); setIsEditing(true); }}
            className="flex items-center gap-1.5 text-[13px] text-foreground/90 hover:text-foreground transition-colors cursor-pointer group"
          >
            <span className="font-medium">{projectName}</span>
            <Pencil className="w-3 h-3 text-muted-foreground/80 group-hover:text-blue-400 transition-colors" />
          </button>
        )}
      </div>

      {/* Right: Global State Pills & Actions */}
      <div className="flex items-center gap-3">
        {/* State Pills */}
        <div className="flex items-center gap-2 mr-2">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 text-[11px] font-bold tracking-wider font-mono">
            {systemVoltage_kV} kV
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[11px] font-bold tracking-wider font-mono">
            {baseMVA} MVA
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-[11px] font-bold tracking-wider">
            <Link2 className="w-3 h-3" />
            {activeLinksCount} Link{activeLinksCount !== 1 ? 's' : ''} Active
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" />
          </button>
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCommandPalette}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Command className="w-3 h-3" />
            <span className="text-[10px] font-bold font-mono">K</span>
          </button>
          
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle Theme"
          >
            {mounted && theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
