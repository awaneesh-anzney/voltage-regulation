import { useState, useRef, useEffect } from "react";
import { FolderOpen, FileText, Plus, Copy, Trash2, CheckCircle2, Folder, Library, X, AlertTriangle } from "lucide-react";
import { Workspace, Project, Study, Case } from "@/lib/workspaceTypes";

type ModalState = 
  | { type: 'none' }
  | { type: 'new-project' }
  | { type: 'new-study' }
  | { type: 'new-case' }
  | { type: 'duplicate-case', caseToDuplicate: Case }
  | { type: 'delete-case', caseToDelete: Case, study: Study }
  | { type: 'delete-study', studyToDelete: Study, project: Project }
  | { type: 'delete-project', projectToDelete: Project }
  | { type: 'error', message: string };

export function ProjectManagerModule({
  workspace,
  activeProjectId,
  activeStudyId,
  activeCaseId,
  onCreateProject,
  onSetActiveProject,
  onCreateStudy,
  onSetActiveStudy,
  onDeleteStudy,
  onDeleteProject,
  onCreateCase,
  onDuplicateCase,
  onDeleteCase,
  onSetActiveCase
}: {
  workspace: Workspace;
  activeProjectId: string;
  activeStudyId: string;
  activeCaseId: string;
  onCreateProject: (name: string) => void;
  onSetActiveProject: (projectId: string) => void;
  onCreateStudy: (name: string) => void;
  onSetActiveStudy: (studyId: string) => void;
  onDeleteStudy: (studyId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onCreateCase: (name: string) => void;
  onDuplicateCase: (caseId: string, name: string) => void;
  onDeleteCase: (caseId: string) => void;
  onSetActiveCase: (caseId: string) => void;
}) {
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalState.type !== 'none' && modalState.type !== 'error' && modalState.type !== 'delete-case' && modalState.type !== 'delete-study') {
      inputRef.current?.focus();
    }
  }, [modalState]);

  const handleNewProject = () => { setInputValue(""); setModalState({ type: 'new-project' }); };
  const handleNewStudy = () => { setInputValue(""); setModalState({ type: 'new-study' }); };
  const handleNewCase = () => { setInputValue(""); setModalState({ type: 'new-case' }); };
  const handleDuplicateCase = (c: Case) => { setInputValue(`${c.name} Copy`); setModalState({ type: 'duplicate-case', caseToDuplicate: c }); };

  const handleDeleteCase = (c: Case, study: Study) => {
    if (study.cases.length <= 1) {
      setModalState({ type: 'error', message: "Cannot delete the only case in a study." });
      return;
    }
    setModalState({ type: 'delete-case', caseToDelete: c, study });
  };

  const handleDeleteStudy = (s: Study, project: Project) => {
    if (project.studies.length <= 1) {
      setModalState({ type: 'error', message: "Cannot delete the only study in a project." });
      return;
    }
    setModalState({ type: 'delete-study', studyToDelete: s, project });
  };

  const handleDeleteProject = (p: Project) => {
    if (workspace.projects.length <= 1) {
      setModalState({ type: 'error', message: "Cannot delete the only project in the workspace." });
      return;
    }
    setModalState({ type: 'delete-project', projectToDelete: p });
  };

  const handleModalSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (modalState.type === 'new-project' && inputValue.trim()) onCreateProject(inputValue.trim());
    else if (modalState.type === 'new-study' && inputValue.trim()) onCreateStudy(inputValue.trim());
    else if (modalState.type === 'new-case' && inputValue.trim()) onCreateCase(inputValue.trim());
    else if (modalState.type === 'duplicate-case' && inputValue.trim()) onDuplicateCase(modalState.caseToDuplicate.id, inputValue.trim());
    else if (modalState.type === 'delete-case') onDeleteCase(modalState.caseToDelete.id);
    else if (modalState.type === 'delete-study') onDeleteStudy(modalState.studyToDelete.id);
    else if (modalState.type === 'delete-project') onDeleteProject((modalState as any).projectToDelete.id);
    
    setModalState({ type: 'none' });
  };

  const activeProject = workspace.projects.find(p => p.id === activeProjectId);
  const activeStudy = activeProject?.studies.find(s => s.id === activeStudyId);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6 md:h-[calc(100vh-80px)] flex flex-col h-full overflow-y-auto md:overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-blue-500" />
            Workspace Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your engineering workspace into Projects, Studies, and Cases.
          </p>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 pb-10 md:pb-0">
        
        {/* Column 1: Projects */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm min-h-[300px] md:min-h-0">
          <div className="px-4 py-3 bg-accent/30 border-b border-border flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Library className="w-4 h-4" />
              1. Projects
            </div>
            <button onClick={handleNewProject} className="p-1 hover:bg-blue-500/10 text-blue-500 rounded cursor-pointer" title="New Project">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {workspace.projects.map(project => {
              const isSelected = project.id === activeProjectId;
              return (
                <div 
                  key={project.id} 
                  onClick={() => onSetActiveProject(project.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group/project ${isSelected ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-accent border border-transparent'}`}
                >
                  <Folder className={`w-5 h-5 shrink-0 ${isSelected ? 'text-blue-500 fill-blue-500/20' : 'text-muted-foreground'}`} />
                  <div className="flex-1 truncate">
                    <div className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-500' : 'text-foreground/90'}`}>{project.name}</div>
                    <div className="text-[11px] text-muted-foreground">{project.studies.length} Studies</div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded cursor-pointer opacity-100 md:opacity-0 md:group-hover/project:opacity-100 transition-opacity shrink-0"
                    title="Delete Project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Studies */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm min-h-[300px] md:min-h-0">
          <div className="px-4 py-3 bg-accent/30 border-b border-border flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              2. Studies
            </div>
            <button onClick={handleNewStudy} className="p-1 hover:bg-blue-500/10 text-blue-500 rounded cursor-pointer" title="New Study">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeProject ? activeProject.studies.map(study => {
              const isSelected = study.id === activeStudyId;
              return (
                <div 
                  key={study.id} 
                  onClick={() => onSetActiveStudy(study.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group/study ${isSelected ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-accent border border-transparent'}`}
                >
                  <FolderOpen className={`w-5 h-5 shrink-0 ${isSelected ? 'text-amber-500 fill-amber-500/20' : 'text-muted-foreground'}`} />
                  <div className="flex-1 truncate">
                    <div className={`text-sm font-semibold truncate ${isSelected ? 'text-amber-500' : 'text-foreground/90'}`}>{study.name}</div>
                    <div className="text-[11px] text-muted-foreground">{study.cases.length} Cases</div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteStudy(study, activeProject); }}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded cursor-pointer opacity-100 md:opacity-0 md:group-hover/study:opacity-100 transition-opacity shrink-0"
                    title="Delete Study"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }) : (
              <div className="p-4 text-center text-sm text-muted-foreground">Select a project first</div>
            )}
          </div>
        </div>

        {/* Column 3: Cases */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm min-h-[300px] md:min-h-0">
          <div className="px-4 py-3 bg-accent/30 border-b border-border flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" />
              3. Cases
            </div>
            <button onClick={handleNewCase} className="p-1 hover:bg-blue-500/10 text-blue-500 rounded cursor-pointer" title="New Case">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeStudy ? activeStudy.cases.map(c => {
              const isSelected = c.id === activeCaseId;
              return (
                <div 
                  key={c.id} 
                  className={`flex flex-col gap-2 px-3 py-2.5 rounded-lg transition-colors group/case ${isSelected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-accent border border-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`w-5 h-5 shrink-0 ${isSelected ? 'text-emerald-500 fill-emerald-500/20' : 'text-muted-foreground'}`} />
                    <div className="flex-1 truncate">
                      <div className={`text-sm font-semibold truncate ${isSelected ? 'text-emerald-500' : 'text-foreground/90'}`}>
                        {c.name}
                        {c.isBaseCase && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/70 uppercase">Base Case</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Mod: {new Date(c.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover/case:opacity-100 transition-opacity mt-2 md:mt-0">
                    {!isSelected && (
                      <button 
                        onClick={() => onSetActiveCase(c.id)}
                        className="px-2 py-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded border border-emerald-500/20 cursor-pointer"
                      >
                        Open Case
                      </button>
                    )}
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded mr-auto">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDuplicateCase(c); }}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded cursor-pointer transition-colors"
                      title="Duplicate Case"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteCase(c, activeStudy); }}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded cursor-pointer transition-colors"
                      title="Delete Case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="p-4 text-center text-sm text-muted-foreground">Select a study first</div>
            )}
          </div>
        </div>

      </div>

      {/* Modal Overlay */}
      {modalState.type !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
              <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
                {(modalState.type === 'error' || modalState.type.startsWith('delete')) && <AlertTriangle className="w-4 h-4 text-red-500" />}
                {modalState.type === 'new-project' && "Create New Project"}
                {modalState.type === 'new-study' && "Create New Study"}
                {modalState.type === 'new-case' && "Create New Case"}
                {modalState.type === 'duplicate-case' && "Duplicate Case"}
                {modalState.type === 'delete-case' && "Delete Case"}
                {modalState.type === 'delete-study' && "Delete Study"}
                {modalState.type === 'delete-project' && "Delete Project"}
                {modalState.type === 'error' && "Action Prevented"}
              </h2>
              <button onClick={() => setModalState({ type: 'none' })} className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="p-4 space-y-4">
              {modalState.type === 'error' ? (
                <p className="text-sm text-foreground/90">{modalState.message}</p>
              ) : modalState.type.startsWith('delete') ? (
                <div className="space-y-2">
                  <p className="text-sm text-foreground/90">
                    Are you sure you want to delete the {modalState.type.replace('delete-', '')} <strong className="text-foreground">"{modalState.type === 'delete-case' ? (modalState as any).caseToDelete.name : modalState.type === 'delete-study' ? (modalState as any).studyToDelete.name : (modalState as any).projectToDelete.name}"</strong>?
                  </p>
                  {modalState.type === 'delete-study' && (
                    <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded p-2">
                      Warning: This will permanently delete all cases contained within this study.
                    </p>
                  )}
                  {modalState.type === 'delete-project' && (
                    <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded p-2">
                      Warning: This will permanently delete all studies and cases contained within this project!
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Enter a name..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalState({ type: 'none' })}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-accent hover:bg-accent/80 border border-border rounded-lg transition-colors cursor-pointer"
                >
                  {modalState.type === 'error' ? 'Close' : 'Cancel'}
                </button>
                {modalState.type !== 'error' && (
                  <button
                    type="submit"
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer ${
                      modalState.type.startsWith('delete') 
                        ? 'bg-red-600 hover:bg-red-500' 
                        : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    {modalState.type.startsWith('delete') ? 'Delete Permanently' : 'Confirm'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
