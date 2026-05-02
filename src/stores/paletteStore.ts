import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Color, SourceType } from '../types';
import { randomHex, hexToRgb, rgbToHsl, rgbToOklch } from '../utils/colorUtils';

interface PaletteHistoryEntry {
  colors: Color[];
  name: string;
  baseHue: number;
}

interface PaletteState {
  colors: Color[];
  name: string;
  baseHue: number;
  sourceType: SourceType;
  history: PaletteHistoryEntry[];
  historyIndex: number;
  addColor: (hex?: string) => void;
  removeColor: (index: number) => void;
  setColor: (index: number, hex: string) => void;
  setColors: (colors: Color[]) => void;
  setName: (name: string) => void;
  setSourceType: (type: SourceType) => void;
  reorderColors: (fromIndex: number, toIndex: number) => void;
  setBaseHue: (hue: number) => void;
  resetColors: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY = 50;

function makeColor(hex: string): Color {
  const rgb = hexToRgb(hex);
  if (!rgb) return { hex, rgb: { r: 0, g: 0, b: 0 }, hsl: { h: 0, s: 0, l: 0 }, oklch: { l: 0, c: 0, h: 0 } };
  return {
    hex,
    rgb,
    hsl: rgbToHsl(rgb.r, rgb.g, rgb.b),
    oklch: rgbToOklch(rgb.r, rgb.g, rgb.b),
  };
}

const pushHistory = (state: PaletteState): { history: PaletteHistoryEntry[]; historyIndex: number } => {
  const entry: PaletteHistoryEntry = {
    colors: [...state.colors],
    name: state.name,
    baseHue: state.baseHue,
  };
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(entry);
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  return { history: newHistory, historyIndex: newHistory.length - 1 };
};

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set, get) => ({
      colors: [],
      name: '我的配色',
      baseHue: 200,
      sourceType: 'extraction' as SourceType,
      history: [],
      historyIndex: -1,

      addColor: (hex) => {
        const state = get();
        const h = pushHistory(state);
        set({
          ...h,
          colors: [...state.colors, makeColor(hex || randomHex())],
        });
      },

      removeColor: (index) => {
        const state = get();
        const h = pushHistory(state);
        set({
          ...h,
          colors: state.colors.filter((_, i) => i !== index),
        });
      },

      setColor: (index, hex) => {
        const state = get();
        const h = pushHistory(state);
        set({
          ...h,
          colors: state.colors.map((c, i) => (i === index ? makeColor(hex) : c)),
        });
      },

      setColors: (colors) => {
        const state = get();
        const h = pushHistory(state);
        set({ ...h, colors });
      },

      setName: (name) => set({ name }),

      setSourceType: (sourceType) => set({ sourceType }),

      reorderColors: (fromIndex, toIndex) => {
        const state = get();
        const h = pushHistory(state);
        const colors = [...state.colors];
        const [moved] = colors.splice(fromIndex, 1);
        colors.splice(toIndex, 0, moved);
        set({ ...h, colors });
      },

      setBaseHue: (hue) => {
        const state = get();
        const h = pushHistory(state);
        set({ ...h, baseHue: hue });
      },

      resetColors: () => {
        const state = get();
        const h = pushHistory(state);
        set({ ...h, colors: [] });
      },

      undo: () => {
        const state = get();
        if (state.historyIndex < 0) return;
        const entry = state.history[state.historyIndex];
        set({
          colors: [...entry.colors],
          name: entry.name,
          baseHue: entry.baseHue,
          historyIndex: state.historyIndex - 1,
        });
      },

      redo: () => {
        const state = get();
        if (state.historyIndex >= state.history.length - 1) return;
        const entry = state.history[state.historyIndex + 1];
        set({
          colors: [...entry.colors],
          name: entry.name,
          baseHue: entry.baseHue,
          historyIndex: state.historyIndex + 1,
        });
      },

      canUndo: () => get().historyIndex >= 0,
      canRedo: () => get().historyIndex < get().history.length - 1,
    }),
    {
      name: 'control-color-palette',
      partialize: (state) => ({
        colors: state.colors,
        name: state.name,
        baseHue: state.baseHue,
        sourceType: state.sourceType,
      }),
    }
  )
);
