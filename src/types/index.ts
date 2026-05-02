export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface OklchColor {
  l: number;
  c: number;
  h: number;
}

export interface Color {
  hex: string;
  rgb: RgbColor;
  hsl: HslColor;
  oklch: OklchColor;
  name?: string;
}

export type SourceType = 'extraction' | 'preset' | 'custom' | 'recommendation' | 'meteor';

export interface Palette {
  colors: Color[];
  sourceType: SourceType;
  sourceImageId?: string;
  baseHue?: number;
  name: string;
  updatedAt: number;
}

export type PresetRule = 'monochromatic' | 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic';

export interface PresetScheme {
  type: PresetRule;
  name: string;
  colors: Color[];
}

export type RecommendationType = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'lightness-variant' | 'saturation-variant';

export interface RecommendedColor {
  color: Color;
  type: RecommendationType;
  label: string;
}

export type GrayscaleMethod = 'average' | 'weighted' | 'desaturate';

export interface ChannelWeights {
  r: number;
  g: number;
  b: number;
}

export interface TonalRegion {
  start: number;
  end: number;
  startColor: string;
  endColor: string;
}

export type TransferAlgorithm = 'reinhard' | 'histogram';

export interface TransferParams {
  algorithm: TransferAlgorithm;
  intensity: number;
}

export interface CCImageInfo {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  name: string;
}

export type ExportFormat = 'css' | 'tailwind' | 'json' | 'svg';

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultExtractCount: number;
  defaultTransferAlgorithm: TransferAlgorithm;
  smartRecommendationEnabled: boolean;
  theme: 'dark' | 'light';
  language: 'zh' | 'en';
  meteorEffectEnabled: boolean;
  presetColorCount: number;
}

export interface SavedPalette {
  id: string;
  userId?: string;
  name: string;
  colors: Color[];
  sourceType?: SourceType;
  tags: string[];
  thumbnailUrl?: string;
  createdAt: number;
  updatedAt?: number;
  isFavorite?: boolean;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export type ComparisonMode = 'side-by-side' | 'slider' | 'overlay';

export type ChannelType = 'r' | 'g' | 'b';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface HistoryEntry {
  id: string;
  type: 'palette-change' | 'transfer-param' | 'tonal-boundary' | 'channel-param';
  description: string;
  timestamp: number;
  snapshot: unknown;
}
