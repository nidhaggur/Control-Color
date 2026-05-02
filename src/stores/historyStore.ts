import { create } from 'zustand';
import type { HistoryEntry } from '../types';

interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  maxEntries: number;

  pushEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  entries: [],
  currentIndex: -1,
  maxEntries: 50,

  pushEntry: (entry) =>
    set((state) => {
      const newEntry: HistoryEntry = {
        ...entry,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      const newEntries = state.entries.slice(0, state.currentIndex + 1);
      newEntries.push(newEntry);
      if (newEntries.length > state.maxEntries) {
        newEntries.shift();
      }
      return {
        entries: newEntries,
        currentIndex: newEntries.length - 1,
      };
    }),

  undo: () => {
    const state = get();
    if (state.currentIndex <= 0) return null;
    const newIndex = state.currentIndex - 1;
    set({ currentIndex: newIndex });
    return state.entries[newIndex];
  },

  redo: () => {
    const state = get();
    if (state.currentIndex >= state.entries.length - 1) return null;
    const newIndex = state.currentIndex + 1;
    set({ currentIndex: newIndex });
    return state.entries[newIndex];
  },

  canUndo: () => get().currentIndex > 0,
  canRedo: () => get().currentIndex < get().entries.length - 1,
  clear: () => set({ entries: [], currentIndex: -1 }),
}));
