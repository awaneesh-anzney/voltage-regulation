// Global Project History Engine — Undo/Redo with debounced auto-commit
//
// Captures full project state snapshots (all module inputs + links)
// and provides undo/redo traversal with commit descriptions.

import { useCallback, useRef, useState } from "react";

export interface HistoryEntry<T> {
  state: T;
  description: string;
  timestamp: number;
}

export interface HistoryControls<T> {
  state: T;
  setState: (next: T, description?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  history: HistoryEntry<T>[];
  currentIndex: number;
  commit: (description: string) => void;  // Force a named commit
  revertTo: (index: number) => void;
}

const MAX_HISTORY = 100;
const DEBOUNCE_MS = 2000;

export function useHistoryState<T>(initialState: T, initialDescription: string = "Initial state"): HistoryControls<T> {
  const [past, setPast] = useState<HistoryEntry<T>[]>([]);
  const [present, setPresent] = useState<HistoryEntry<T>>({
    state: initialState,
    description: initialDescription,
    timestamp: Date.now(),
  });
  const [future, setFuture] = useState<HistoryEntry<T>[]>([]);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether current present has uncommitted changes
  const pendingDescriptionRef = useRef<string | null>(null);

  // Push current present to past and set new present
  const pushState = useCallback((newState: T, description: string) => {
    setPast(prev => {
      const newPast = [...prev, present];
      // Cap history size
      if (newPast.length > MAX_HISTORY) {
        return newPast.slice(newPast.length - MAX_HISTORY);
      }
      return newPast;
    });
    setPresent({
      state: newState,
      description,
      timestamp: Date.now(),
    });
    setFuture([]); // Clear redo stack on new action
  }, [present]);

  // setState — debounced: rapid changes batch into one commit
  const setState = useCallback((next: T, description?: string) => {
    const desc = description || "Parameter change";

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // If there's no pending description, it means this is a fresh change sequence.
    // Save the current present to past immediately on first change.
    if (pendingDescriptionRef.current === null) {
      // First change in a new batch: push current state to history
      setPast(prev => {
        const newPast = [...prev, present];
        if (newPast.length > MAX_HISTORY) {
          return newPast.slice(newPast.length - MAX_HISTORY);
        }
        return newPast;
      });
      setFuture([]); // Clear redo stack
    }

    pendingDescriptionRef.current = desc;

    // Update present immediately (for responsive UI)
    setPresent({
      state: next,
      description: desc,
      timestamp: Date.now(),
    });

    // Set debounce to finalize the commit
    debounceRef.current = setTimeout(() => {
      pendingDescriptionRef.current = null;
      debounceRef.current = null;
    }, DEBOUNCE_MS);
  }, [present]);

  // Force a named commit (e.g., on "Calculate" or "Feed to SC Forces")
  const commit = useCallback((description: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // If there was a pending batch, it's already in present.
    // Just update the description to the explicit one.
    if (pendingDescriptionRef.current !== null) {
      setPresent(prev => ({ ...prev, description, timestamp: Date.now() }));
      pendingDescriptionRef.current = null;
    } else {
      // No pending changes — create a commit point of the current state
      setPast(prev => {
        const newPast = [...prev, present];
        if (newPast.length > MAX_HISTORY) {
          return newPast.slice(newPast.length - MAX_HISTORY);
        }
        return newPast;
      });
      setPresent(prev => ({ ...prev, description, timestamp: Date.now() }));
      setFuture([]);
    }
  }, [present]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    // Cancel any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      pendingDescriptionRef.current = null;
    }
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setPast(newPast);
    setFuture(prev => [present, ...prev]);
    setPresent(previous);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      pendingDescriptionRef.current = null;
    }
    const next = future[0];
    const newFuture = future.slice(1);
    setPast(prev => [...prev, present]);
    setPresent(next);
    setFuture(newFuture);
  }, [future, present]);

  const revertTo = useCallback((index: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      pendingDescriptionRef.current = null;
    }
    // Build full timeline
    const fullTimeline = [...past, present, ...future];
    if (index < 0 || index >= fullTimeline.length) return;

    const target = fullTimeline[index];
    const newPast = fullTimeline.slice(0, index);
    const newFuture = fullTimeline.slice(index + 1);
    setPast(newPast);
    setPresent(target);
    setFuture(newFuture);
  }, [past, present, future]);

  // Build full history for display
  const fullHistory = [...past, present, ...future];
  const currentIndex = past.length;

  return {
    state: present.state,
    setState,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    history: fullHistory,
    currentIndex,
    commit,
    revertTo,
  };
}
