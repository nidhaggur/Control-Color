import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPreferences } from '../types';

interface SettingsState extends UserPreferences {
  setTheme: (theme: 'dark' | 'light') => void;
  setLanguage: (lang: 'zh' | 'en') => void;
  setDefaultExtractCount: (count: number) => void;
  setDefaultTransferAlgorithm: (alg: 'reinhard' | 'histogram') => void;
  setSmartRecommendationEnabled: (enabled: boolean) => void;
  setMeteorEffectEnabled: (enabled: boolean) => void;
  setPresetColorCount: (count: number) => void;
}

const defaultPreferences: UserPreferences = {
  defaultExtractCount: 6,
  defaultTransferAlgorithm: 'reinhard',
  smartRecommendationEnabled: true,
  theme: 'dark',
  language: 'zh',
  meteorEffectEnabled: true,
  presetColorCount: 5,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      setTheme: (theme) => {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(theme);
        set({ theme });
      },
      setLanguage: (language) => set({ language }),
      setDefaultExtractCount: (defaultExtractCount) => set({ defaultExtractCount }),
      setDefaultTransferAlgorithm: (defaultTransferAlgorithm) => set({ defaultTransferAlgorithm }),
      setSmartRecommendationEnabled: (smartRecommendationEnabled) => set({ smartRecommendationEnabled }),
      setMeteorEffectEnabled: (meteorEffectEnabled) => set({ meteorEffectEnabled }),
      setPresetColorCount: (presetColorCount) => set({ presetColorCount }),
    }),
    {
      name: 'control-color-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.remove('dark', 'light');
          document.documentElement.classList.add(state.theme);
        }
      },
    },
  ),
);
