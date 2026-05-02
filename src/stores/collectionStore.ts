import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Color, SourceType } from '../types';

const MAX_PALETTES = 200;

export interface StoredPalette {
  id: string;
  name: string;
  colors: Color[];
  tags: string[];
  createdAt: number;
  sourceType?: SourceType;
  imageDataUrl?: string;
}

interface CollectionState {
  palettes: StoredPalette[];
  selectedIds: Set<string>;
  addPalette: (colors: Color[], sourceType?: StoredPalette['sourceType'], imageDataUrl?: string) => { success: boolean; error?: string; id?: string };
  removePalette: (id: string) => void;
  batchRemove: (ids: string[]) => void;
  renamePalette: (id: string, name: string) => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;
  batchAddTag: (ids: string[], tag: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  getSelected: () => StoredPalette[];
  findDuplicates: () => string[];
}

function autoName(palettes: StoredPalette[]): string {
  const existing = new Set(palettes.map(p => p.name));
  let idx = palettes.length + 1;
  let name = `配色 ${idx}`;
  while (existing.has(name)) {
    idx++;
    name = `配色 ${idx}`;
  }
  return name;
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      palettes: [],
      selectedIds: new Set<string>(),

      addPalette: (colors, sourceType, imageDataUrl) => {
        const { palettes } = get();
        if (palettes.length >= MAX_PALETTES) {
          return { success: false, error: `收藏已达上限（${MAX_PALETTES} 个），请删除不需要的方案后再收藏` };
        }

        const name = autoName(palettes);
        const newPalette: StoredPalette = {
          id: `pal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name,
          colors,
          tags: [],
          createdAt: Date.now(),
          sourceType,
          imageDataUrl,
        };

        set({ palettes: [...palettes, newPalette] });
        return { success: true, id: newPalette.id };
      },

      removePalette: (id) => {
        set((state) => ({
          palettes: state.palettes.filter((p) => p.id !== id),
          selectedIds: (() => {
            const next = new Set(state.selectedIds);
            next.delete(id);
            return next;
          })(),
        }));
      },

      batchRemove: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({
          palettes: state.palettes.filter((p) => !idSet.has(p.id)),
          selectedIds: new Set<string>(),
        }));
      },

      renamePalette: (id, name) => {
        set((state) => ({
          palettes: state.palettes.map((p) =>
            p.id === id ? { ...p, name } : p,
          ),
        }));
      },

      addTag: (id, tag) => {
        set((state) => ({
          palettes: state.palettes.map((p) =>
            p.id === id && !p.tags.includes(tag)
              ? { ...p, tags: [...p.tags, tag] }
              : p,
          ),
        }));
      },

      removeTag: (id, tag) => {
        set((state) => ({
          palettes: state.palettes.map((p) =>
            p.id === id
              ? { ...p, tags: p.tags.filter((t) => t !== tag) }
              : p,
          ),
        }));
      },

      batchAddTag: (ids, tag) => {
        const idSet = new Set(ids);
        set((state) => ({
          palettes: state.palettes.map((p) =>
            idSet.has(p.id) && !p.tags.includes(tag)
              ? { ...p, tags: [...p.tags, tag] }
              : p,
          ),
        }));
      },

      toggleSelect: (id) => {
        set((state) => {
          const next = new Set(state.selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { selectedIds: next };
        });
      },

      selectAll: () => {
        set((state) => ({
          selectedIds: new Set(state.palettes.map(p => p.id)),
        }));
      },

      clearSelection: () => {
        set({ selectedIds: new Set<string>() });
      },

      getSelected: () => {
        const { palettes, selectedIds } = get();
        return palettes.filter(p => selectedIds.has(p.id));
      },

      findDuplicates: () => {
        const { palettes } = get();
        const seen = new Map<string, string>();
        const duplicates: string[] = [];
        for (const p of palettes) {
          const key = p.colors.map(c => c.hex).join(',');
          if (seen.has(key)) {
            duplicates.push(p.id);
          } else {
            seen.set(key, p.id);
          }
        }
        return duplicates;
      },
    }),
    {
      name: 'cc-palettes',
      version: 2,
    },
  ),
);
