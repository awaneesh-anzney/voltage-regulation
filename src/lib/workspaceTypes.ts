import { FaultInput, FaultResults } from "@/lib/faultSolver";
import { SCInputs, getDefaultInputs as getDefaultScInputs } from "@/lib/scForcesEngine";
import { SagTensionInputs, getDefaultSagTensionInputs } from "@/lib/sagTensionEngine";
import { Bus, Branch, LoadFlowResult } from "@/lib/loadFlowSolver";
import { getDefaultBuses, getDefaultBranches } from "@/components/v2/LoadFlowModule";
import { LossesInputs, getDefaultLossesInputs } from "@/components/v2/LossesModule";
import { CTSizingInputs, getDefaultCTSizingInputs } from "@/lib/ctSizingEngine";
import { ProtectionInputs, getDefaultProtectionInputs } from "@/lib/protectionEngine";

export interface ProjectState {
  projectName: string;
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

export interface Case {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  state: ProjectState;
  isBaseCase?: boolean;
}

export interface Study {
  id: string;
  name: string;
  description: string;
  cases: Case[];
  activeCaseId: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  studies: Study[];
  activeStudyId: string;
}

export interface Workspace {
  projects: Project[];
  activeProjectId: string;
}

export function getInitialProjectState(projectName: string = "Riyadh North 220kV Feeder"): ProjectState {
  return {
    projectName,
    faultInputs: {
      voltageKv: 220, sourceMva: 1000, lineLengthKm: 15,
      lineRPerKm: 0.0687, lineXPerKm: 0.320,
      zeroSeqRMultiplier: 3.0, zeroSeqXMultiplier: 3.0, cFactor: 1.1,
      sourceGroundingType: "solid",
      sourceR0Mult: 2.0,
      sourceX0Mult: 2.0,
      faultLocationKm: 15,
      includeTransformer: false,
      transformerMva: 100,
      transformerReactancePct: 12.5,
      tk1: 1.0,
    },
    faultResults: null,
    scInputs: getDefaultScInputs(),
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

export function createDefaultWorkspace(): Workspace {
  const defaultCase: Case = {
    id: "case-default-1",
    name: "Base Case",
    description: "Initial starting state",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    state: getInitialProjectState(),
    isBaseCase: true
  };

  const defaultStudy: Study = {
    id: "study-default-1",
    name: "Initial Study",
    description: "Default study configuration",
    cases: [defaultCase],
    activeCaseId: defaultCase.id
  };

  const defaultProject: Project = {
    id: "proj-default-1",
    name: "Default Project",
    description: "My first project",
    studies: [defaultStudy],
    activeStudyId: defaultStudy.id
  };

  return {
    projects: [defaultProject],
    activeProjectId: defaultProject.id
  };
}
