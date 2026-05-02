import type { Color, RecommendedColor, RecommendationType } from '../types';
import { deltaE } from './colorUtils';
import { createColor } from './colorUtils';

function oklchToHex(l: number, c: number, h: number): string {
  const hue = ((h % 360) + 360) % 360;
  const a = c * Math.cos((hue * Math.PI) / 180);
  const b = c * Math.sin((hue * Math.PI) / 180);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  r = r <= 0.0031308 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - 0.055;
  g = g <= 0.0031308 ? 12.92 * g : 1.055 * Math.pow(g, 1 / 2.4) - 0.055;
  bl = bl <= 0.0031308 ? 12.92 * bl : 1.055 * Math.pow(bl, 1 / 2.4) - 0.055;

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`.toUpperCase();
}

const RECOMMENDATION_LABELS: Record<RecommendationType, { zh: string; en: string }> = {
  complementary: { zh: '互补色', en: 'Complementary' },
  analogous: { zh: '类似色', en: 'Analogous' },
  triadic: { zh: '三色组', en: 'Triadic' },
  'split-complementary': { zh: '分裂互补色', en: 'Split Complementary' },
  'lightness-variant': { zh: '亮度变体', en: 'Lightness Variant' },
  'saturation-variant': { zh: '饱和度变体', en: 'Saturation Variant' },
};

function generateColorTheoryCandidates(color: Color): { candidate: Color; type: RecommendationType }[] {
  const { l, c, h } = color.oklch;
  const results: { candidate: Color; type: RecommendationType }[] = [];

  const complementaryHue = (h + 180) % 360;
  results.push({ candidate: createColor(oklchToHex(l, c, complementaryHue)), type: 'complementary' });

  for (const offset of [-30, 30]) {
    const hue = ((h + offset) % 360 + 360) % 360;
    results.push({ candidate: createColor(oklchToHex(l, c, hue)), type: 'analogous' });
  }

  for (const offset of [120, 240]) {
    const hue = (h + offset) % 360;
    results.push({ candidate: createColor(oklchToHex(l, c, hue)), type: 'triadic' });
  }

  for (const offset of [150, 210]) {
    const hue = (h + offset) % 360;
    results.push({ candidate: createColor(oklchToHex(l, c, hue)), type: 'split-complementary' });
  }

  return results;
}

function generateVariantCandidates(color: Color): { candidate: Color; type: RecommendationType }[] {
  const { l, c, h } = color.oklch;
  const results: { candidate: Color; type: RecommendationType }[] = [];

  for (const delta of [-0.1, 0.1]) {
    const newL = Math.max(0.2, Math.min(0.9, l + delta));
    results.push({ candidate: createColor(oklchToHex(newL, c, h)), type: 'lightness-variant' });
  }

  for (const delta of [-0.15, 0.15]) {
    const newC = Math.max(0.02, Math.min(0.3, c + delta));
    results.push({ candidate: createColor(oklchToHex(l, newC, h)), type: 'saturation-variant' });
  }

  return results;
}

export function getRecommendations(
  existingColors: Color[],
  maxCount: number = 8,
  lang: 'zh' | 'en' = 'zh',
): RecommendedColor[] {
  if (existingColors.length === 0) return [];

  const allCandidates: { candidate: Color; type: RecommendationType }[] = [];

  for (const color of existingColors) {
    allCandidates.push(...generateColorTheoryCandidates(color));
    allCandidates.push(...generateVariantCandidates(color));
  }

  const filtered = allCandidates.filter(({ candidate }) => {
    return existingColors.every((existing) => deltaE(existing.oklch, candidate.oklch) >= 5);
  });

  const unique: typeof filtered = [];
  const seen = new Set<string>();

  for (const item of filtered) {
    const key = item.candidate.hex;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  const existingCenter = {
    l: existingColors.reduce((s, c) => s + c.oklch.l, 0) / existingColors.length,
    c: existingColors.reduce((s, c) => s + c.oklch.c, 0) / existingColors.length,
    h: existingColors.reduce((s, c) => s + c.oklch.h, 0) / existingColors.length,
  };

  const scored = unique.map((item) => {
    const dist = deltaE(item.candidate.oklch, existingCenter);
    const score = -Math.abs(dist - 0.15);
    return { ...item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxCount).map(({ candidate, type }) => ({
    color: candidate,
    type,
    label: RECOMMENDATION_LABELS[type][lang],
  }));
}
