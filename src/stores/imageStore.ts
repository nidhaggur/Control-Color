import { create } from 'zustand';
import type { CCImageInfo } from '../types';

interface ImageState {
  sourceImage: CCImageInfo | null;
  targetImage: CCImageInfo | null;
  processedImageUrl: string | null;
  comparisonBase: 'source' | 'target';

  setSourceImage: (image: CCImageInfo | null) => void;
  setTargetImage: (image: CCImageInfo | null) => void;
  setProcessedImageUrl: (url: string | null, base?: 'source' | 'target') => void;
  revertProcessed: () => void;
  clearAll: () => void;
}

export const useImageStore = create<ImageState>()((set) => ({
  sourceImage: null,
  targetImage: null,
  processedImageUrl: null,
  comparisonBase: 'source',

  setSourceImage: (image) => set({ sourceImage: image, processedImageUrl: null, comparisonBase: 'source' }),
  setTargetImage: (image) => set({ targetImage: image }),
  setProcessedImageUrl: (url, base) => set({ processedImageUrl: url, comparisonBase: base ?? 'source' }),
  revertProcessed: () => set({ processedImageUrl: null }),
  clearAll: () => set({ sourceImage: null, targetImage: null, processedImageUrl: null, comparisonBase: 'source' }),
}));
