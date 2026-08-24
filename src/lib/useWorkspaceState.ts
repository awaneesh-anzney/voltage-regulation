import { useState, useEffect, useCallback } from "react";
import { Workspace, Project, Study, Case, createDefaultWorkspace, getInitialProjectState } from "./workspaceTypes";

export function useWorkspaceState(storageKey: string = "gridintel-v2-workspace-state") {
  const [isInitialized, setIsInitialized] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>(createDefaultWorkspace());

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          let parsed = JSON.parse(stored);
          if (parsed && parsed.projects && parsed.activeProjectId) {
            // Migration: v1 -> v2 (Project->Case to Project->Study->Case)
            if (parsed.projects.length > 0 && !parsed.projects[0].studies) {
              parsed.projects = parsed.projects.map((p: any) => {
                const legacyCases = p.cases || [];
                const defaultStudyId = `study-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                return {
                  id: p.id,
                  name: p.name,
                  description: p.description || "",
                  studies: [{
                    id: defaultStudyId,
                    name: "Imported Study",
                    description: "Legacy cases converted to study",
                    cases: legacyCases.length > 0 ? legacyCases : createDefaultWorkspace().projects[0].studies[0].cases,
                    activeCaseId: p.activeCaseId || legacyCases[0]?.id || ""
                  }],
                  activeStudyId: defaultStudyId
                };
              });
            }
            setWorkspace(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to parse workspace state from localStorage", e);
      }
    }
    setIsInitialized(true);
  }, [storageKey]);

  // Save to localStorage whenever workspace changes
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(workspace));
      } catch (e) {
        console.error("Failed to save workspace state to localStorage. Quota exceeded?", e);
      }
    }
  }, [workspace, isInitialized, storageKey]);

  const activeProject = workspace.projects?.find(p => p.id === workspace.activeProjectId) || workspace.projects?.[0];
  const activeStudy = activeProject?.studies?.find(s => s.id === activeProject.activeStudyId) || activeProject?.studies?.[0];
  const activeCase = activeStudy?.cases?.find(c => c.id === activeStudy.activeCaseId) || activeStudy?.cases?.[0];

  // Helper to update the workspace
  const updateWorkspace = useCallback((updater: (prev: Workspace) => Workspace) => {
    setWorkspace(prev => updater(prev));
  }, []);

  // Update the active case's state
  const updateActiveCaseState = useCallback((newState: any) => {
    setWorkspace(prev => {
      const pIdx = prev.projects.findIndex(p => p.id === prev.activeProjectId);
      if (pIdx === -1) return prev;
      
      const project = prev.projects[pIdx];
      const sIdx = project.studies.findIndex(s => s.id === project.activeStudyId);
      if (sIdx === -1) return prev;

      const study = project.studies[sIdx];
      const cIdx = study.cases.findIndex(c => c.id === study.activeCaseId);
      if (cIdx === -1) return prev;

      const newCases = [...study.cases];
      newCases[cIdx] = {
        ...newCases[cIdx],
        state: newState,
        updatedAt: Date.now()
      };

      const newStudies = [...project.studies];
      newStudies[sIdx] = { ...study, cases: newCases };

      const newProjects = [...prev.projects];
      newProjects[pIdx] = { ...project, studies: newStudies };

      return { ...prev, projects: newProjects };
    });
  }, []);

  // --- Project CRUD ---
  const createProject = useCallback((name: string) => {
    const newCase: Case = {
      id: `case-${Date.now()}`,
      name: "Base Case",
      description: "Initial state",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: getInitialProjectState(),
      isBaseCase: true
    };

    const newStudy: Study = {
      id: `study-${Date.now()}`,
      name: "Initial Study",
      description: "Default study configuration",
      cases: [newCase],
      activeCaseId: newCase.id
    };

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      description: "",
      studies: [newStudy],
      activeStudyId: newStudy.id
    };

    setWorkspace(prev => ({
      ...prev,
      projects: [...prev.projects, newProject],
      activeProjectId: newProject.id
    }));
  }, []);

  const setActiveProject = useCallback((projectId: string) => {
    setWorkspace(prev => ({ ...prev, activeProjectId: projectId }));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setWorkspace(prev => {
      if (prev.projects.length <= 1) return prev; // Cannot delete the last project
      const newProjects = prev.projects.filter(p => p.id !== projectId);
      
      let newActiveId = prev.activeProjectId;
      if (projectId === prev.activeProjectId) {
        newActiveId = newProjects[0].id;
      }
      
      return { ...prev, projects: newProjects, activeProjectId: newActiveId };
    });
  }, []);

  // --- Study CRUD ---
  const createStudy = useCallback((name: string) => {
    setWorkspace(prev => {
      const pIdx = prev.projects.findIndex(p => p.id === prev.activeProjectId);
      if (pIdx === -1) return prev;
      const project = prev.projects[pIdx];

      const newCase: Case = {
        id: `case-${Date.now()}`,
        name: "Base Case",
        description: "Initial state",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        state: getInitialProjectState(),
        isBaseCase: true
      };

      const newStudy: Study = {
        id: `study-${Date.now()}`,
        name,
        description: "New study",
        cases: [newCase],
        activeCaseId: newCase.id
      };

      const newProjects = [...prev.projects];
      newProjects[pIdx] = {
        ...project,
        studies: [...project.studies, newStudy],
        activeStudyId: newStudy.id
      };

      return { ...prev, projects: newProjects };
    });
  }, []);

  const deleteStudy = useCallback((studyId: string) => {
    setWorkspace(prev => {
      const pIdx = prev.projects.findIndex(p => p.id === prev.activeProjectId);
      if (pIdx === -1) return prev;
      const project = prev.projects[pIdx];
      
      if (project.studies.length <= 1) return prev; // Don't delete last study

      const newStudies = project.studies.filter(s => s.id !== studyId);
      let newActiveStudyId = project.activeStudyId;
      
      if (studyId === project.activeStudyId) {
        newActiveStudyId = newStudies[0].id;
      }

      const newProjects = [...prev.projects];
      newProjects[pIdx] = {
        ...project,
        studies: newStudies,
        activeStudyId: newActiveStudyId
      };

      return { ...prev, projects: newProjects };
    });
  }, []);

  const setActiveStudy = useCallback((studyId: string) => {
    setWorkspace(prev => {
      const pIdx = prev.projects.findIndex(p => p.id === prev.activeProjectId);
      if (pIdx === -1) return prev;
      
      const newProjects = [...prev.projects];
      newProjects[pIdx] = {
        ...newProjects[pIdx],
        activeStudyId: studyId
      };
      
      return { ...prev, projects: newProjects };
    });
  }, []);

  // --- Case CRUD ---
  const createCase = useCallback((name: string) => {
    setWorkspace(prev => {
      const pIdx = prev.projects.findIndex(p => p.id === prev.activeProjectId);
      if (pIdx === -1) return prev;
      const project = prev.projects[pIdx];

      const sIdx = project.studies.findIndex(s => s.id === project.activeStudyId);
      if (sIdx === -1) return prev;
      const study = project.studies[sIdx];

      const newCase: Case = {
        id: `case-${Date.now()}`,
        name,
        description: "New case",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        state: getInitialProjectState()
      };

      const newStudies = [...project.studies];
      newStudies[sIdx] = {
        ...study,
        cases: [...study.cases, newCase],
        activeCaseId: newCase.id
      };

      const newProjects = [...prev.projects];
      newProjects[pIdx] = { ...project, studies: newStudies };

      return { ...prev, projects: newProjects };
    });
  }, []);

  const duplicateCase = useCallback((caseId: string, newName: string) => {
    setWorkspace(prev => {
      const pIdx = prev.projects.findIndex(p => p.id === prev.activeProjectId);
      if (pIdx === -1) return prev;
      const project = prev.projects[pIdx];
      
      const sIdx = project.studies.findIndex(s => s.id === project.activeStudyId);
      if (sIdx === -1) return prev;
      const study = project.studies[sIdx];
      
      const sourceCase = study.cases.find(c => c.id === caseId);
      if (!sourceCase) return prev;

      const newCase: Case = {
        ...sourceCase,
        id: `case-${Date.now()}`,
        name: newName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBaseCase: false, // Duplicate is not base case
        // Deep copy state to ensure isolation
        state: JSON.parse(JSON.stringify(sourceCase.state))
      };

      const newStudies = [...project.studies];
      newStudies[sIdx] = {
        ...study,
        cases: [...study.cases, newCase],
        activeCaseId: newCase.id
      };

      const newProjects = [...prev.projects];
      newProjects[pIdx] = { ...project, studies: newStudies };

      return { ...prev, projects: newProjects };
    });
  }, []);

  const deleteCase = useCallback((caseId: string) => {
    setWorkspace(prev => {
      const pIdx = prev.projects.findIndex(p => p.id === prev.activeProjectId);
      if (pIdx === -1) return prev;
      const project = prev.projects[pIdx];

      const sIdx = project.studies.findIndex(s => s.id === project.activeStudyId);
      if (sIdx === -1) return prev;
      const study = project.studies[sIdx];
      
      if (study.cases.length <= 1) return prev; // Don't delete last case

      const newCases = study.cases.filter(c => c.id !== caseId);
      let newActiveCaseId = study.activeCaseId;
      
      if (caseId === study.activeCaseId) {
        newActiveCaseId = newCases[0].id;
      }

      const newStudies = [...project.studies];
      newStudies[sIdx] = {
        ...study,
        cases: newCases,
        activeCaseId: newActiveCaseId
      };

      const newProjects = [...prev.projects];
      newProjects[pIdx] = { ...project, studies: newStudies };

      return { ...prev, projects: newProjects };
    });
  }, []);

  const setActiveCase = useCallback((caseId: string) => {
    setWorkspace(prev => {
      const pIdx = prev.projects.findIndex(p => p.id === prev.activeProjectId);
      if (pIdx === -1) return prev;
      const project = prev.projects[pIdx];

      const sIdx = project.studies.findIndex(s => s.id === project.activeStudyId);
      if (sIdx === -1) return prev;
      const study = project.studies[sIdx];

      const newStudies = [...project.studies];
      newStudies[sIdx] = {
        ...study,
        activeCaseId: caseId
      };

      const newProjects = [...prev.projects];
      newProjects[pIdx] = { ...project, studies: newStudies };
      
      return { ...prev, projects: newProjects };
    });
  }, []);

  return {
    isInitialized,
    workspace,
    activeProject,
    activeStudy,
    activeCase,
    setWorkspace,
    updateWorkspace,
    updateActiveCaseState,
    createProject,
    setActiveProject,
    deleteProject,
    createStudy,
    setActiveStudy,
    deleteStudy,
    createCase,
    duplicateCase,
    deleteCase,
    setActiveCase
  };
}
