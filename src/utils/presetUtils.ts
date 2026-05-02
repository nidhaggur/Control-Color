import type { Color, PresetScheme, PresetRule } from '../types';
import { createColor } from './colorUtils';

const PRESET_RULES: { type: PresetRule; name: string; nameEn: string; angleOffset: number[] }[] = [
  { type: 'monochromatic', name: '单色系', nameEn: 'Monochromatic', angleOffset: [0] },
  { type: 'complementary', name: '互补色', nameEn: 'Complementary', angleOffset: [0, 180] },
  { type: 'analogous', name: '类似色', nameEn: 'Analogous', angleOffset: [-30, 0, 30] },
  { type: 'triadic', name: '三色组', nameEn: 'Triadic', angleOffset: [0, 120, 240] },
  { type: 'split-complementary', name: '分裂互补色', nameEn: 'Split Complementary', angleOffset: [0, 150, 210] },
  { type: 'tetradic', name: '四色组', nameEn: 'Tetradic', angleOffset: [0, 90, 180, 270] },
];

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

function generateMonochromatic(baseHue: number, count: number): Color[] {
  const colors: Color[] = [];
  for (let i = 0; i < count; i++) {
    const l = 0.3 + (0.5 * i) / Math.max(1, count - 1);
    const c = 0.08 + Math.random() * 0.06;
    const hex = oklchToHex(l, c, baseHue);
    colors.push(createColor(hex));
  }
  return colors;
}

function generateWithOffsets(baseHue: number, offsets: number[], count: number): Color[] {
  const colors: Color[] = [];
  const needed = Math.min(count, offsets.length);

  for (let i = 0; i < needed; i++) {
    const hue = baseHue + offsets[i];
    const l = 0.5 + (Math.random() - 0.5) * 0.2;
    const c = 0.1 + Math.random() * 0.05;
    const hex = oklchToHex(l, c, hue);
    colors.push(createColor(hex));
  }

  while (colors.length < count) {
    const hue = baseHue + Math.random() * 360;
    const l = 0.4 + Math.random() * 0.3;
    const c = 0.08 + Math.random() * 0.07;
    const hex = oklchToHex(l, c, hue);
    colors.push(createColor(hex));
  }

  return colors;
}

export function generatePresetScheme(baseHue: number, rule: PresetRule, count: number = 5): PresetScheme {
  const ruleInfo = PRESET_RULES.find((r) => r.type === rule)!;
  let colors: Color[];

  if (rule === 'monochromatic') {
    colors = generateMonochromatic(baseHue, count);
  } else {
    colors = generateWithOffsets(baseHue, ruleInfo.angleOffset, count);
  }

  return {
    type: rule,
    name: ruleInfo.name,
    colors,
  };
}

export function generateAllPresetSchemes(baseHue: number, count: number = 5): PresetScheme[] {
  return PRESET_RULES.map((rule) => generatePresetScheme(baseHue, rule.type, count));
}

export function getRandomHue(): number {
  return Math.floor(Math.random() * 360);
}

export function getRandomColor(): Color {
  const hue = Math.random() * 360;
  const l = 0.5 + Math.random() * 0.25;
  const c = 0.1 + Math.random() * 0.08;
  const hex = oklchToHex(l, c, hue);
  return createColor(hex);
}

export function generateRandomPalette(count: number = 5): Color[] {
  const baseHue = Math.random() * 360;
  const schemeType = PRESET_RULES[Math.floor(Math.random() * PRESET_RULES.length)];
  return generatePresetScheme(baseHue, schemeType.type, count).colors;
}

const TREND_PALETTES: { name: string; hexes: string[] }[] = [
  { name: '森林晨光', hexes: ['#2D5016', '#4A7C2E', '#8FBC5A', '#C4E08C', '#F0F7E6'] },
  { name: '深海幽蓝', hexes: ['#0A1628', '#1A3A5C', '#2E6B9E', '#5BA3D9', '#B8DFF0'] },
  { name: '落日熔金', hexes: ['#1A0A2E', '#6B2D5B', '#D4553B', '#F09B30', '#FFD93D'] },
  { name: '沙漠黄昏', hexes: ['#2C1810', '#5C3A28', '#B8704A', '#E8A868', '#F5D4A8'] },
  { name: '极光幻彩', hexes: ['#0D1B2A', '#1B4332', '#2D6A4F', '#52B788', '#B7E4C7'] },
  { name: '春日花语', hexes: ['#FFB5C2', '#FF8FAB', '#E8A0BF', '#C4A1D4', '#A8D8EA'] },
  { name: '盛夏骄阳', hexes: ['#FF6B35', '#F7C948', '#2EC4B6', '#3DA5D9', '#7B2D8E'] },
  { name: '金秋落叶', hexes: ['#5C3317', '#8B4513', '#CD853F', '#DAA520', '#B8860B'] },
  { name: '寒冬霜雪', hexes: ['#1A1A2E', '#16213E', '#0F3460', '#537895', '#E8E8E8'] },
  { name: '赛博朋克', hexes: ['#0D0221', '#0F084B', '#26408B', '#FF2E63', '#08F7FE'] },
  { name: '莫兰迪灰', hexes: ['#A0928A', '#B8A99A', '#C5B9A8', '#D4CAB8', '#E3DDD4'] },
  { name: '复古胶片', hexes: ['#3E2723', '#6D4C41', '#A1887F', '#D7CCC8', '#EFEBE9'] },
  { name: '霓虹都市', hexes: ['#FF006E', '#FB5607', '#FFBE0B', '#3A86FF', '#8338EC'] },
  { name: '抹茶和风', hexes: ['#2E4A3E', '#4A7C59', '#7BB661', '#B5D99C', '#E8F5E0'] },
  { name: '薰衣草田', hexes: ['#4A0E5C', '#7B2D8E', '#9B59B6', '#C39BD3', '#E8DAEF'] },
  { name: '珊瑚海洋', hexes: ['#FF6F61', '#FF9A8B', '#FFB3A7', '#88D8B0', '#5CB8A5'] },
  { name: '水墨丹青', hexes: ['#1A1A1A', '#3D3D3D', '#6B6B6B', '#A0A0A0', '#E0E0E0'] },
  { name: '热带雨林', hexes: ['#0B3D0B', '#1E6B1E', '#2ECC40', '#FFD700', '#FF6347'] },
  { name: '星空紫夜', hexes: ['#0B0B2B', '#1B1B4B', '#3D2C8D', '#7B5EA7', '#C0A0E0'] },
  { name: '玫瑰金', hexes: ['#B76E79', '#D4A5A5', '#E8C4C4', '#F0D9D9', '#FFF0F0'] },
  { name: '冰川蓝', hexes: ['#003B46', '#07575B', '#66A5AD', '#C4DFE6', '#E0F0F5'] },
  { name: '焦糖拿铁', hexes: ['#3E2723', '#5D4037', '#8D6E63', '#BCAAA4', '#EFEBE9'] },
  { name: '薄荷清风', hexes: ['#004D40', '#00796B', '#26A69A', '#80CBC4', '#E0F2F1'] },
  { name: '日式枯山水', hexes: ['#2C2C2C', '#5A5A5A', '#8C8C8C', '#BEBEBE', '#F0F0F0'] },
  { name: '热带芒果', hexes: ['#FF8C00', '#FFA500', '#FFD700', '#FFFACD', '#FF6347'] },
  { name: '北极冰蓝', hexes: ['#1C3F60', '#2E6B9E', '#5BA3D9', '#A8D8EA', '#E8F4FD'] },
  { name: '落樱纷飞', hexes: ['#FFB7C5', '#FF8FA3', '#FF6B81', '#E05780', '#C74B7A'] },
  { name: '翡翠绿洲', hexes: ['#004B23', '#006400', '#007200', '#38B000', '#70E000'] },
  { name: '琥珀暖阳', hexes: ['#4A1A0A', '#7B2D0B', '#C65D0E', '#E89B2E', '#FFD166'] },
  { name: '薰衣草雾', hexes: ['#4B0082', '#6A0DAD', '#8A2BE2', '#BA55D3', '#DDA0DD'] },
  { name: '晨曦微光', hexes: ['#2C3E50', '#E74C3C', '#F39C12', '#F1C40F', '#ECF0F1'] },
  { name: '波西米亚', hexes: ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F5DEB3'] },
  { name: '电子紫', hexes: ['#1A0033', '#330066', '#6600CC', '#9933FF', '#CC99FF'] },
  { name: '暮色苍茫', hexes: ['#1A1A2E', '#16213E', '#533483', '#E94560', '#0F3460'] },
  { name: '奶油糖果', hexes: ['#FFDAB9', '#FFE4B5', '#FFEFD5', '#FFF8DC', '#FAEBD7'] },
  { name: '深林苔藓', hexes: ['#1B3A1B', '#2E5E2E', '#4A7C4A', '#6B9E6B', '#8FBC8F'] },
  { name: '火山熔岩', hexes: ['#1A0000', '#4A0000', '#8B0000', '#FF4500', '#FF8C00'] },
  { name: '青瓷釉色', hexes: ['#2F4F4F', '#5F9EA0', '#7FFFD4', '#AFEEEE', '#E0FFFF'] },
  { name: '琥珀黄昏', hexes: ['#3E1F0D', '#6B3A2A', '#A0522D', '#D2691E', '#FFDEAD'] },
  { name: '蓝调爵士', hexes: ['#0C1445', '#1A237E', '#283593', '#3F51B5', '#7986CB'] },
  { name: '桃花源记', hexes: ['#FF9EAA', '#FFB3C1', '#FFCCD5', '#FFE0E6', '#FFF0F3'] },
  { name: '重金属', hexes: ['#1A1A1A', '#2D2D2D', '#404040', '#708090', '#A9A9A9'] },
  { name: '绿野仙踪', hexes: ['#013220', '#228B22', '#32CD32', '#98FB98', '#F0FFF0'] },
  { name: '紫罗兰梦', hexes: ['#2E0854', '#4B0082', '#7B68EE', '#B19CD9', '#E6E6FA'] },
  { name: '柑橘气泡', hexes: ['#FF6F00', '#FF8F00', '#FFA000', '#FFB300', '#FFCA28'] },
  { name: '松石绿', hexes: ['#006D6F', '#008B8B', '#20B2AA', '#48D1CC', '#AFEEEE'] },
  { name: '午夜蓝', hexes: ['#003366', '#003D7A', '#004C99', '#005CB2', '#3388CC'] },
  { name: '暖棕皮革', hexes: ['#3E2723', '#4E342E', '#5D4037', '#795548', '#8D6E63'] },
  { name: '薰衣草奶油', hexes: ['#E6E6FA', '#D8BFD8', '#DDA0DD', '#EE82EE', '#DA70D6'] },
  { name: '铜绿锈迹', hexes: ['#0A3D2E', '#1B6B5A', '#2E8B7A', '#48A99A', '#7BC8C8'] },
];

function generateRandomOKLCH(count: number): Color[] {
  const colors: Color[] = [];
  for (let i = 0; i < count; i++) {
    const h = Math.random() * 360;
    const l = 0.45 + Math.random() * 0.3;
    const c = 0.08 + Math.random() * 0.1;
    const hex = oklchToHex(l, c, h);
    colors.push(createColor(hex));
  }
  return colors;
}

function generateGradientSequence(count: number): Color[] {
  const h1 = Math.random() * 360;
  const h2 = h1 + 30 + Math.random() * 90;
  const l1 = 0.4 + Math.random() * 0.15;
  const l2 = 0.55 + Math.random() * 0.2;
  const c = 0.1 + Math.random() * 0.06;

  const colors: Color[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const h = h1 + (h2 - h1) * t;
    const l = l1 + (l2 - l1) * t;
    const hex = oklchToHex(l, c, h);
    colors.push(createColor(hex));
  }
  return colors;
}

function pickTrendPalette(count: number): Color[] {
  const palette = TREND_PALETTES[Math.floor(Math.random() * TREND_PALETTES.length)];
  const hexes = palette.hexes;
  if (hexes.length === count) return hexes.map(h => createColor(h));
  if (hexes.length > count) {
    const step = (hexes.length - 1) / (count - 1);
    return Array.from({ length: count }, (_, i) => createColor(hexes[Math.round(i * step)]));
  }
  const result = hexes.map(h => createColor(h));
  while (result.length < count) {
    result.push(getRandomColor());
  }
  return result;
}

export function generateMeteorPalette(count: number = 5): Color[] {
  const r = Math.random();
  if (r < 0.4) {
    const baseHue = Math.random() * 360;
    const rule = PRESET_RULES[Math.floor(Math.random() * PRESET_RULES.length)];
    return generatePresetScheme(baseHue, rule.type, count).colors;
  }
  if (r < 0.7) {
    return generateRandomOKLCH(count);
  }
  if (r < 0.9) {
    return pickTrendPalette(count);
  }
  return generateGradientSequence(count);
}

export function getTrendPaletteNames(): string[] {
  return TREND_PALETTES.map(p => p.name);
}

export function getTrendPalette(index: number, count: number = 5): Color[] | null {
  if (index < 0 || index >= TREND_PALETTES.length) return null;
  const palette = TREND_PALETTES[index];
  const hexes = palette.hexes;
  if (hexes.length === count) return hexes.map(h => createColor(h));
  if (hexes.length > count) {
    const step = (hexes.length - 1) / (count - 1);
    return Array.from({ length: count }, (_, i) => createColor(hexes[Math.round(i * step)]));
  }
  const result = hexes.map(h => createColor(h));
  while (result.length < count) result.push(getRandomColor());
  return result;
}
