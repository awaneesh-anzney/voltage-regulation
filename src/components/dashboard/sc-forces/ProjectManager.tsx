"use client";

import { useState } from "react";
import {
  FolderPlus, FolderOpen, Play, Trash2, Upload, ChevronLeft,
  CheckCircle2, XCircle, Clock, FlaskConical, Plus, MoreVertical,
  Beaker
} from "lucide-react";
import type { SCInputs, SCResults } from "@/lib/scForcesEngine";
import type { Project, TestCase } from "@/lib/projectStore";
import {
  createProject,
  createTestCase,
  addTestCaseToProject,
  deleteTestCaseFromProject,
  deleteProject as removeProject,
} from "@/lib/projectStore";

interface ProjectManagerProps {
  inputs: SCInputs;
  results: SCResults;
  onLoadTestCase: (inputs: SCInputs) => void;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

export function ProjectManager({
  inputs,
  results,
  onLoadTestCase,
  projects,
  setProjects,
}: ProjectManagerProps) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewTestCase, setShowNewTestCase] = useState(false);
  const [newTestCaseName, setNewTestCaseName] = useState("");
  const [expandedTestCase, setExpandedTestCase] = useState<string | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  // --- Handlers ---
  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const proj = createProject(newProjectName.trim());
    setProjects((prev) => [proj, ...prev]);
    setNewProjectName("");
    setShowNewProject(false);
    setActiveProjectId(proj.id);
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => removeProject(prev, id));
    if (activeProjectId === id) setActiveProjectId(null);
  };

  const handleSaveTestCase = () => {
    if (!activeProjectId || !newTestCaseName.trim()) return;
    const tc = createTestCase(newTestCaseName.trim(), inputs, results);
    setProjects((prev) => addTestCaseToProject(prev, activeProjectId, tc));
    setNewTestCaseName("");
    setShowNewTestCase(false);
  };

  const handleDeleteTestCase = (tcId: string) => {
    if (!activeProjectId) return;
    setProjects((prev) =>
      deleteTestCaseFromProject(prev, activeProjectId, tcId)
    );
  };

  const handleLoadTestCase = (tc: TestCase) => {
    onLoadTestCase(tc.inputs);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  // ═══════════════════════════════════════════════════════════════
  // PROJECT DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════
  if (activeProject) {
    const passCount = activeProject.testCases.filter((tc) => tc.status === "pass").length;
    const failCount = activeProject.testCases.filter((tc) => tc.status === "fail").length;

    return (
      <div className="space-y-5">
        {/* Back button + project header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveProjectId(null)}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-400" />
              {activeProject.name}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Created {formatDate(activeProject.createdAt)} · {activeProject.testCases.length} test case(s)
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            {passCount} Passed
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/8 border border-red-500/20 text-red-400">
            <XCircle className="w-3 h-3" />
            {failCount} Failed
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-500/8 border border-slate-500/20 text-slate-400">
            <FlaskConical className="w-3 h-3" />
            {activeProject.testCases.length} Total
          </div>
        </div>

        {/* Save new test case */}
        {showNewTestCase ? (
          <div className="bg-[#111827] border border-blue-500/20 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-white">Save Current Calculation as Test Case</p>
            <p className="text-[11px] text-slate-400">
              This will snapshot your current input parameters and computed results.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Test case name (e.g., Base Case 63kA)"
                value={newTestCaseName}
                onChange={(e) => setNewTestCaseName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTestCase()}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/40"
                autoFocus
              />
              <button
                onClick={handleSaveTestCase}
                disabled={!newTestCaseName.trim()}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={() => { setShowNewTestCase(false); setNewTestCaseName(""); }}
                className="px-3 py-2 rounded-lg border border-white/[0.08] text-slate-400 text-sm hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
            {/* Quick preview of what will be saved */}
            <div className="flex gap-4 text-[10px] text-slate-500 pt-1">
              <span>Ik3: {inputs.ik3} A</span>
              <span>Vsys: {inputs.vsys} V</span>
              <span>Ftd: {(results.Ftd / 1000).toFixed(1)} kN</span>
              <span>Clearance: {results.clCheck ? "OK" : "FAIL"}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewTestCase(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors cursor-pointer w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Save Current as Test Case
          </button>
        )}

        {/* Test case history */}
        {activeProject.testCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-white/[0.06] flex items-center justify-center mb-4">
              <Beaker className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400">No test cases yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Configure your parameters in the &quot;Parameters&quot; tab, then come back here and save a test case.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Test Case History</h3>
            {activeProject.testCases.map((tc) => (
              <div
                key={tc.id}
                className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.1] transition-colors"
              >
                {/* Test case header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedTestCase(expandedTestCase === tc.id ? null : tc.id)}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${tc.status === "pass" ? "bg-emerald-400" : "bg-red-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{tc.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(tc.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] shrink-0">
                    <span className="text-slate-400">
                      F<sub>max</sub> = <span className="text-white font-mono font-bold">{(tc.results.Fmax / 1000).toFixed(1)}</span> kN
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      tc.status === "pass"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {tc.status === "pass" ? "PASS" : "FAIL"}
                    </span>
                    <MoreVertical className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedTestCase === tc.id && (
                  <div className="border-t border-white/[0.06] px-4 py-3 bg-white/[0.01]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] mb-3">
                      <div>
                        <span className="text-slate-500">Short Circuit Current</span>
                        <p className="text-white font-mono">{tc.inputs.ik3} A</p>
                      </div>
                      <div>
                        <span className="text-slate-500">System Voltage</span>
                        <p className="text-white font-mono">{tc.inputs.vsys} V</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Span Length</span>
                        <p className="text-white font-mono">{tc.inputs.lspan} m</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Phase Spacing</span>
                        <p className="text-white font-mono">{tc.inputs.aph} m</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Tensile Force (F<sub>td</sub>)</span>
                        <p className="text-white font-mono">{(tc.results.Ftd / 1000).toFixed(2)} kN</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Drop Force (F<sub>fd</sub>)</span>
                        <p className="text-white font-mono">{(tc.results.Ffd / 1000).toFixed(2)} kN</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Pinch Force (F<sub>pi</sub>)</span>
                        <p className="text-white font-mono">{(tc.results.Fpi / 1000).toFixed(2)} kN</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Min Clearance (a<sub>min</sub>)</span>
                        <p className="text-white font-mono">{tc.results.amin.toFixed(3)} m</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadTestCase(tc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-medium hover:bg-blue-500/20 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Load Inputs
                      </button>
                      <button
                        onClick={() => handleDeleteTestCase(tc.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PROJECT LIST VIEW
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Projects</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Organize test cases by project. Data is session-only (demo mode).
          </p>
        </div>
        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* New project form */}
      {showNewProject && (
        <div className="bg-[#111827] border border-blue-500/20 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Create New Project</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Project name (e.g., Delhi 400kV Substation)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/40"
              autoFocus
            />
            <button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Create
            </button>
            <button
              onClick={() => { setShowNewProject(false); setNewProjectName(""); }}
              className="px-3 py-2 rounded-lg border border-white/[0.08] text-slate-400 text-sm hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 && !showNewProject ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-800/50 border border-white/[0.06] flex items-center justify-center mb-5">
            <FolderOpen className="w-10 h-10 text-slate-600" />
          </div>
          <p className="text-base font-medium text-slate-300">No projects yet</p>
          <p className="text-[12px] text-slate-500 mt-1.5 max-w-sm">
            Create a project to start organizing your SC force test cases. Each project can hold multiple test scenarios.
          </p>
          <button
            onClick={() => setShowNewProject(true)}
            className="mt-5 flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const passCount = proj.testCases.filter((tc) => tc.status === "pass").length;
            const failCount = proj.testCases.filter((tc) => tc.status === "fail").length;
            const latest = proj.testCases[0];

            return (
              <div
                key={proj.id}
                className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-all group cursor-pointer"
                onClick={() => setActiveProjectId(proj.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <FolderOpen className="w-4.5 h-4.5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{proj.name}</p>
                      <p className="text-[10px] text-slate-500">{formatDate(proj.createdAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id); }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[10px] mb-3">
                  <span className="text-slate-500">{proj.testCases.length} test case(s)</span>
                  {passCount > 0 && (
                    <span className="text-emerald-400">✓ {passCount}</span>
                  )}
                  {failCount > 0 && (
                    <span className="text-red-400">✕ {failCount}</span>
                  )}
                </div>

                {latest && (
                  <div className="border-t border-white/[0.04] pt-2 text-[10px] text-slate-500">
                    Latest: <span className="text-slate-300">{latest.name}</span>
                    {" · "}
                    F<sub>max</sub> = {(latest.results.Fmax / 1000).toFixed(1)} kN
                    {" · "}
                    <span className={latest.status === "pass" ? "text-emerald-400" : "text-red-400"}>
                      {latest.status.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
