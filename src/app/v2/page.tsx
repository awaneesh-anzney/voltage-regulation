"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/v2/Sidebar";
import { TopBar } from "@/components/v2/TopBar";
import { BentoHome } from "@/components/v2/BentoHome";
import { SCForcesInspector, SCForcesCanvas } from "@/components/v2/SCForcesModule";
import { SagTensionInspector, SagTensionCanvas } from "@/components/v2/SagTensionModule";
import { FaultInspector, FaultCanvas } from "@/components/v2/FaultModule";
import { CommandPalette } from "@/components/v2/CommandPalette";
import { StaleWarning } from "@/components/v2/TrustWidgets";
import { HistoryModule } from "@/components/v2/HistoryModule";
import { LoadFlowInspector, LoadFlowCanvas, getDefaultBuses, getDefaultBranches } from "@/components/v2/LoadFlowModule";
import { LossesInspector, LossesCanvas, getDefaultLossesInputs } from "@/components/v2/LossesModule";
import { CTSizingInspector, CTSizingCanvas } from "@/components/v2/CTSizingModule";
import { ProtectionInspector, ProtectionCanvas } from "@/components/v2/ProtectionModule";
import { ContingencyCanvas } from "@/components/v2/ContingencyModule";
import type { ModuleId } from "@/components/v2/Sidebar";

import { computeSCForces, getDefaultInputs } from "@/lib/scForcesEngine";
import type { SCInputs } from "@/lib/scForcesEngine";
import { computeSagTension, getDefaultSagTensionInputs } from "@/lib/sagTensionEngine";
import type { SagTensionInputs } from "@/lib/sagTensionEngine";
import { calculateFaults } from "@/lib/faultSolver";
import type { FaultInput, FaultResults } from "@/lib/faultSolver";
import { runNewtonRaphsonLoadFlow } from "@/lib/loadFlowSolver";
import type { Bus, Branch, LoadFlowResult } from "@/lib/loadFlowSolver";
import type { LossesInputs } from "@/components/v2/LossesModule";
import { useHistoryState } from "@/lib/useHistoryState";
import { autoFillSCForcesFields } from "@/lib/ceaClearances";
import { calculateCTSizing, getDefaultCTSizingInputs } from "@/lib/ctSizingEngine";
import type { CTSizingInputs } from "@/lib/ctSizingEngine";
import { calculateProtection, getDefaultProtectionInputs } from "@/lib/protectionEngine";
import type { ProtectionInputs } from "@/lib/protectionEngine";

import {
  Network, DollarSign, Shield,
  Sparkles, FileText, History, Construction, ShieldAlert
} from "lucide-react";

// ─── Project State Shape ───
interface ProjectState {
  faultInputs: FaultInput;
  faultResults: FaultResults | null;
  scInputs: SCInputs;
  sagInputs: SagTensionInputs;
  lfBuses: Bus[];
  lfBranches: Branch[];
  lfResult: LoadFlowResult | null;
  lfBaseMva: number;
  lossesInputs: LossesInputs;
  ctInputs: CTSizingInputs;
  protectionInputs: ProtectionInputs;
  hasLinkedFault: boolean;
  hasLinkedSag: boolean;
  faultLinkedValues: { ik3: number; xr: number } | null;
  sagLinkedValues: { fst_kg: number; span: number } | null;
}

function getInitialProjectState(): ProjectState {
  return {
    faultInputs: {
      voltageKv: 220, sourceMva: 1000, lineLengthKm: 15,
      lineRPerKm: 0.0687, lineXPerKm: 0.320,
      zeroSeqRMultiplier: 3.0, zeroSeqXMultiplier: 3.0, cFactor: 1.1,
    },
    faultResults: null,
    scInputs: getDefaultInputs(),
    sagInputs: getDefaultSagTensionInputs(),
    lfBuses: getDefaultBuses(),
    lfBranches: getDefaultBranches(),
    lfResult: null,
    lfBaseMva: 100,
    lossesInputs: getDefaultLossesInputs(),
    ctInputs: getDefaultCTSizingInputs(),
    protectionInputs: getDefaultProtectionInputs(),
    hasLinkedFault: false,
    hasLinkedSag: false,
    faultLinkedValues: null,
    sagLinkedValues: null,
  };
}

// Placeholder for modules not yet integrated
function PlaceholderModule({ name, icon: Icon, description }: { name: string; icon: React.ElementType; description: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{name}</h2>
        <p className="text-[13px] text-slate-400 leading-relaxed">{description}</p>
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-600">
          <Construction className="w-3.5 h-3.5" />
          <span>Module integration in progress — engine already built</span>
        </div>
      </div>
    </div>
  );
}

const MODULE_CONFIG: Record<string, { name: string; icon: React.ElementType; description: string }> = {
  loadflow:    { name: "Meshed Load Flow", icon: Network, description: "Newton-Raphson load flow analysis for meshed transmission networks." },
  losses:      { name: "Losses & ROI", icon: DollarSign, description: "Technical and commercial loss analysis with return-on-investment calculator." },
  contingency: { name: "N-1 Contingency", icon: Shield, description: "System reliability assessment under single outage contingency (N-1 criterion)." },
  protection:  { name: "Protection Coordination", icon: ShieldAlert, description: "TCC curve coordination for primary and backup relays." },
  ctsizing:    { name: "CT Sizing", icon: ShieldAlert, description: "Knee Point Voltage and Burden calculation as per IS 2705 / IEC 61869." },
  ai:          { name: "AI Insights", icon: Sparkles, description: "AI-powered analysis recommendations across all modules." },
  report:      { name: "Engineering Report", icon: FileText, description: "Consolidated engineering report with calculation traces." },
};

// Modules that have the Right Inspector panel
const MODULES_WITH_INSPECTOR: ModuleId[] = ["scforces", "sagtension", "fault", "loadflow", "losses", "ctsizing", "protection"];

export default function V2Page() {
  const [activeModule, setActiveModule] = useState<ModuleId>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectName, setProjectName] = useState("Riyadh North 220kV Feeder");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global state
  const [systemVoltage_kV] = useState(220);
  const [baseMVA] = useState(1000);

  // ─── History-tracked project state ───
  const projectHistory = useHistoryState<ProjectState>(
    getInitialProjectState(),
    "Project initialized",
    "gridintel-v2-project-state" // This key enables localStorage persistence
  );
  const project = projectHistory.state;

  // Stale-data dismissal (UI-only, not part of history)
  const [staleFaultDismissed, setStaleFaultDismissed] = useState(false);
  const [staleSagDismissed, setStaleSagDismissed] = useState(false);

  // ─── Derived calculations ───
  const scResults = useMemo(() => computeSCForces(project.scInputs), [project.scInputs]);
  const sagResults = useMemo(() => computeSagTension(project.sagInputs), [project.sagInputs]);

  // ─── Update helpers ───
  const updateFaultInputs = useCallback((partial: Partial<FaultInput>) => {
    const updatedFault = { ...project.faultInputs, ...partial };
    projectHistory.setState(
      { 
        ...project, 
        faultInputs: updatedFault,
        // Auto-link fault current to CT and Protection
        ctInputs: { ...project.ctInputs, faultCurrentA: updatedFault.sourceMva * 1000 / (Math.sqrt(3) * updatedFault.voltageKv) },
        protectionInputs: { ...project.protectionInputs, faultCurrentA: updatedFault.sourceMva * 1000 / (Math.sqrt(3) * updatedFault.voltageKv) }
      },
      "Updated Fault Analysis parameters"
    );
  }, [project, projectHistory]);

  const runFaultCalc = useCallback(() => {
    const results = calculateFaults(project.faultInputs);
    // Link Fault Current to other modules
    projectHistory.setState(
      { 
        ...project, 
        faultResults: results,
        scInputs: { ...project.scInputs, ik3: results.i3Phase * 1000, xr: project.faultInputs.lineXPerKm / Math.max(project.faultInputs.lineRPerKm, 0.0001) },
        ctInputs: { ...project.ctInputs, faultCurrentA: results.i3Phase * 1000, xrRatio: project.faultInputs.lineXPerKm / Math.max(project.faultInputs.lineRPerKm, 0.0001) },
        protectionInputs: { ...project.protectionInputs, faultCurrentA: results.i3Phase * 1000 },
        hasLinkedFault: true,
        faultLinkedValues: { ik3: results.i3Phase * 1000, xr: project.faultInputs.lineXPerKm / Math.max(project.faultInputs.lineRPerKm, 0.0001) },
      },
      "Computed Fault Analysis & linked downstream modules"
    );
    projectHistory.commit("Calculated Fault Levels");
  }, [project, projectHistory]);

  const updateScInput = useCallback(<K extends keyof SCInputs>(key: K, val: SCInputs[K]) => {
    projectHistory.setState(
      { ...project, scInputs: { ...project.scInputs, [key]: val } },
      `Updated SC Forces: ${key}`
    );
  }, [project, projectHistory]);

  const updateScInputs = useCallback((partial: Partial<SCInputs>) => {
    projectHistory.setState(
      { ...project, scInputs: { ...project.scInputs, ...partial } },
      "Updated SC Forces parameters"
    );
  }, [project, projectHistory]);

  const updateSagInputs = useCallback((partial: Partial<SagTensionInputs>) => {
    projectHistory.setState(
      { ...project, sagInputs: { ...project.sagInputs, ...partial } },
      "Updated Sag-Tension parameters"
    );
  }, [project, projectHistory]);

  const updateCTInputs = useCallback((partial: Partial<CTSizingInputs>) => {
    projectHistory.setState(
      { ...project, ctInputs: { ...project.ctInputs, ...partial } },
      "Updated CT Sizing parameters"
    );
  }, [project, projectHistory]);

  const updateProtectionInputs = useCallback((partial: Partial<ProtectionInputs>) => {
    projectHistory.setState(
      { ...project, protectionInputs: { ...project.protectionInputs, ...partial } },
      "Updated Protection parameters"
    );
  }, [project, projectHistory]);

  const updateLfBus = useCallback((idx: number, partial: Partial<Bus>) => {
    const newBuses = [...project.lfBuses];
    newBuses[idx] = { ...newBuses[idx], ...partial };
    projectHistory.setState({ ...project, lfBuses: newBuses }, "Updated Load Flow Bus");
  }, [project, projectHistory]);

  const updateLfBranch = useCallback((idx: number, partial: Partial<Branch>) => {
    const newBranches = [...project.lfBranches];
    newBranches[idx] = { ...newBranches[idx], ...partial };
    projectHistory.setState({ ...project, lfBranches: newBranches }, "Updated Load Flow Branch");
  }, [project, projectHistory]);

  const addLfBus = useCallback(() => {
    const newId = Math.max(0, ...project.lfBuses.map(b => b.id)) + 1;
    const newBus: Bus = { id: newId, name: `Bus ${newId}`, type: 'PQ', v: 1.0, theta: 0, pGen: 0, qGen: 0, pLoad: 0, qLoad: 0, baseKv: 220 };
    projectHistory.setState({ ...project, lfBuses: [...project.lfBuses, newBus] }, "Added Load Flow Bus");
  }, [project, projectHistory]);

  const addLfBranch = useCallback(() => {
    const newId = Math.max(0, ...project.lfBranches.map(b => b.id)) + 1;
    const fromBus = project.lfBuses.length > 0 ? project.lfBuses[0].id : 0;
    const toBus = project.lfBuses.length > 1 ? project.lfBuses[1].id : 0;
    const newBranch: Branch = { id: newId, fromBus, toBus, r: 0.01, x: 0.05, b: 0 };
    projectHistory.setState({ ...project, lfBranches: [...project.lfBranches, newBranch] }, "Added Load Flow Branch");
  }, [project, projectHistory]);

  const removeLfBus = useCallback((idx: number) => {
    const newBuses = project.lfBuses.filter((_, i) => i !== idx);
    projectHistory.setState({ ...project, lfBuses: newBuses }, "Removed Load Flow Bus");
  }, [project, projectHistory]);

  const removeLfBranch = useCallback((idx: number) => {
    const newBranches = project.lfBranches.filter((_, i) => i !== idx);
    projectHistory.setState({ ...project, lfBranches: newBranches }, "Removed Load Flow Branch");
  }, [project, projectHistory]);

  const runLoadFlow = useCallback(() => {
    try {
      const res = runNewtonRaphsonLoadFlow(project.lfBuses, project.lfBranches, project.lfBaseMva);
      projectHistory.setState({ ...project, lfResult: res }, "Solved Load Flow");
      projectHistory.commit("Solved Load Flow");
    } catch (e) {
      console.error(e);
    }
  }, [project, projectHistory]);

  const updateLossesInputs = useCallback((partial: Partial<LossesInputs>) => {
    projectHistory.setState(
      { ...project, lossesInputs: { ...project.lossesInputs, ...partial } },
      "Updated Losses & ROI parameters"
    );
  }, [project, projectHistory]);

  // ─── Cross-module data flow ───
  const isStaleFault = project.hasLinkedFault && project.faultLinkedValues && project.faultResults &&
    (Math.abs(project.faultLinkedValues.ik3 - project.scInputs.ik3) > 0.1 ||
     Math.abs(project.faultLinkedValues.xr - project.scInputs.xr) > 0.01) && !staleFaultDismissed;
  const isStaleSag = project.hasLinkedSag && project.sagLinkedValues &&
    (Math.abs(project.sagLinkedValues.fst_kg - project.scInputs.fst_kg) > 0.1) && !staleSagDismissed;

  const handleFaultFeedToSC = useCallback((data: { ik3_A: number; xr_ratio: number; voltage_kV: number }) => {
    const { phaseToPhaseClearanceM, suggestedPhaseSpacingM } = autoFillSCForcesFields(data.voltage_kV);
    const newScInputs = {
      ...project.scInputs,
      ik3: data.ik3_A,
      xr: data.xr_ratio,
      vsys: data.voltage_kV * 1000,
      clph: phaseToPhaseClearanceM,
      aph: suggestedPhaseSpacingM,
    };
    projectHistory.setState(
      {
        ...project,
        scInputs: newScInputs,
        faultLinkedValues: { ik3: data.ik3_A, xr: data.xr_ratio },
        hasLinkedFault: true,
      },
      `Linked Fault → SC Forces (I_k3 = ${(data.ik3_A / 1000).toFixed(1)} kA)`
    );
    projectHistory.commit(`Linked Fault → SC Forces (I_k3 = ${(data.ik3_A / 1000).toFixed(1)} kA)`);
    setStaleFaultDismissed(false);
    setActiveModule("scforces");
  }, [project, projectHistory]);

  const handleSagFeedToSC = useCallback((data: { fst_kg: number; span_m: number; conductorName: string }) => {
    projectHistory.setState(
      {
        ...project,
        scInputs: { ...project.scInputs, fst_kg: data.fst_kg, lspan: data.span_m },
        sagLinkedValues: { fst_kg: data.fst_kg, span: data.span_m },
        hasLinkedSag: true,
      },
      `Linked Sag-Tension → SC Forces (F_st = ${data.fst_kg.toFixed(0)} kg)`
    );
    projectHistory.commit(`Linked Sag-Tension → SC Forces (F_st = ${data.fst_kg.toFixed(0)} kg)`);
    setStaleSagDismissed(false);
    setActiveModule("scforces");
  }, [project, projectHistory]);

  // Count active links
  const activeLinksCount = (project.hasLinkedFault ? 1 : 0) + (project.hasLinkedSag ? 1 : 0);

  // ─── Global keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K → Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      // Ctrl+Z → Undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        projectHistory.undo();
      }
      // Ctrl+Shift+Z or Ctrl+Y → Redo
      if ((e.metaKey || e.ctrlKey) && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault();
        projectHistory.redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [projectHistory]);

  // Check if current module has inspector
  const showInspector = MODULES_WITH_INSPECTOR.includes(activeModule);

  const renderCanvas = () => {
    switch (activeModule) {
      case "home":
        return <BentoHome />;
      case "fault":
        return <FaultCanvas inputs={project.faultInputs} results={project.faultResults} onFeedToSCForces={handleFaultFeedToSC} />;
      case "scforces":
        return (
          <>
            {isStaleFault && (
              <div className="px-6 pt-4">
                <StaleWarning
                  message={`Fault Analysis values changed since last feed (I_k3 was ${project.faultLinkedValues!.ik3.toFixed(0)} A, now ${project.scInputs.ik3.toFixed(0)} A). SC Forces results may be outdated.`}
                  onRecalculate={() => {
                    if (project.faultResults) {
                      handleFaultFeedToSC({
                        ik3_A: project.faultResults.i3Phase * 1000,
                        xr_ratio: project.faultInputs.lineXPerKm / Math.max(project.faultInputs.lineRPerKm, 0.0001),
                        voltage_kV: project.faultInputs.voltageKv,
                      });
                    }
                  }}
                  onDismiss={() => setStaleFaultDismissed(true)}
                />
              </div>
            )}
            {isStaleSag && (
              <div className="px-6 pt-4">
                <StaleWarning
                  message={`Sag-Tension values changed since last feed (F_st was ${project.sagLinkedValues!.fst_kg.toFixed(0)} kg, now ${project.scInputs.fst_kg.toFixed(0)} kg). SC Forces results may be outdated.`}
                  onRecalculate={() => {
                    if (sagResults) {
                      handleSagFeedToSC({
                        fst_kg: sagResults.staticTension_kg,
                        span_m: project.sagInputs.span_m,
                        conductorName: project.sagInputs.conductorName,
                      });
                    }
                  }}
                  onDismiss={() => setStaleSagDismissed(true)}
                />
              </div>
            )}
            <SCForcesCanvas inputs={project.scInputs} results={scResults} />
          </>
        );
      case "sagtension":
        return <SagTensionCanvas inputs={project.sagInputs} results={sagResults} onFeedToSCForces={handleSagFeedToSC} />;
      case "history":
        return (
          <HistoryModule
            history={projectHistory.history}
            currentIndex={projectHistory.currentIndex}
            canUndo={projectHistory.canUndo}
            canRedo={projectHistory.canRedo}
            onUndo={projectHistory.undo}
            onRedo={projectHistory.redo}
            onRevertTo={projectHistory.revertTo}
          />
        );
      case "loadflow":
        return <LoadFlowCanvas buses={project.lfBuses} branches={project.lfBranches} result={project.lfResult} />;
      case "losses":
        return <LossesCanvas inputs={project.lossesInputs} />;
      case "ctsizing":
        return <CTSizingCanvas inputs={project.ctInputs} />;
      case "protection":
        return <ProtectionCanvas inputs={project.protectionInputs} />;
      case "contingency":
        return <ContingencyCanvas buses={project.lfBuses} branches={project.lfBranches} baseMva={project.lfBaseMva} />;
      default: {
        const config = MODULE_CONFIG[activeModule];
        if (config) return <PlaceholderModule name={config.name} icon={config.icon} description={config.description} />;
        return null;
      }
    }
  };

  const renderInspector = () => {
    switch (activeModule) {
      case "fault":
        return (
          <FaultInspector
            inputs={project.faultInputs}
            onUpdate={updateFaultInputs}
            onCalculate={runFaultCalc}
          />
        );
      case "scforces":
        return (
          <SCForcesInspector
            inputs={project.scInputs}
            onUpdate={updateScInput}
            onUpdateInputs={updateScInputs}
            onCalculate={() => {}}
            hasLinkedFault={project.hasLinkedFault}
            hasLinkedSag={project.hasLinkedSag}
          />
        );
      case "sagtension":
        return (
          <SagTensionInspector
            inputs={project.sagInputs}
            onUpdateInputs={updateSagInputs}
          />
        );
      case "loadflow":
        return (
          <LoadFlowInspector
            buses={project.lfBuses}
            branches={project.lfBranches}
            onUpdateBus={updateLfBus}
            onUpdateBranch={updateLfBranch}
            onAddBus={addLfBus}
            onAddBranch={addLfBranch}
            onRemoveBus={removeLfBus}
            onRemoveBranch={removeLfBranch}
            onSolve={runLoadFlow}
            baseMva={project.lfBaseMva}
            onBaseMvaChange={(v) => projectHistory.setState({ ...project, lfBaseMva: v }, "Updated Load Flow Base MVA")}
          />
        );
      case "losses":
        return (
          <LossesInspector
            inputs={project.lossesInputs}
            onUpdate={updateLossesInputs}
          />
        );
      case "ctsizing":
        return (
          <CTSizingInspector
            inputs={project.ctInputs}
            onUpdate={updateCTInputs}
            hasLinkedFault={project.hasLinkedFault}
          />
        );
      case "protection":
        return (
          <ProtectionInspector
            inputs={project.protectionInputs}
            onUpdate={updateProtectionInputs}
            hasLinkedFault={project.hasLinkedFault}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1a] text-white overflow-hidden">
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={setActiveModule}
      />

      {/* Top Bar */}
      <TopBar
        activeModule={activeModule}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        systemVoltage_kV={systemVoltage_kV}
        baseMVA={baseMVA}
        activeLinksCount={activeLinksCount}
        onCommandPalette={() => setCommandPaletteOpen(true)}
        canUndo={projectHistory.canUndo}
        canRedo={projectHistory.canRedo}
        onUndo={projectHistory.undo}
        onRedo={projectHistory.redo}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Center Canvas */}
        <div className="flex-1 overflow-y-auto bg-[#0a0f1a]">
          {renderCanvas()}
        </div>

        {/* Right Inspector */}
        {showInspector && (
          <div className="w-[320px] shrink-0 border-l border-white/[0.06] bg-[#0c1220] overflow-hidden">
            {renderInspector()}
          </div>
        )}
      </div>
    </div>
  );
}
