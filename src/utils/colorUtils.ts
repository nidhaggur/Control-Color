import { formatHex, parse, converter, type Oklch } from 'culori';
import type { Color, RgbColor, HslColor, OklchColor } from '../types';

const toOklch = converter('oklch');

export function hexToRgb(hex: string): RgbColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function rgbToHsl(r: number, g: number, b: number): HslColor {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function rgbToOklch(r: number, g: number, b: number): OklchColor {
  const oklch = toOklch({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 }) as { l?: number; c?: number; h?: number };
  return {
    l: oklch.l ?? 0,
    c: oklch.c ?? 0,
    h: oklch.h ?? 0,
  };
}

export function hslToRgb(h: number, s: number, l: number): RgbColor {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export function createColor(hex: string, name?: string): Color {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
  return { hex: hex.toUpperCase(), rgb, hsl, oklch, name };
}

export function createColorFromRgb(r: number, g: number, b: number, name?: string): Color {
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  const oklch = rgbToOklch(r, g, b);
  return { hex: hex.toUpperCase(), rgb: { r, g, b }, hsl, oklch, name };
}

export function parseColorInput(input: string): Color | null {
  const trimmed = input.trim();

  if (/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
    const hex = trimmed.startsWith('#') ? trimmed : '#' + trimmed;
    return createColor(hex);
  }

  if (/^#?[0-9a-fA-F]{3}$/.test(trimmed)) {
    const hex = trimmed.startsWith('#') ? trimmed : '#' + trimmed;
    const expanded = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    return createColor(expanded);
  }

  const rgbMatch = trimmed.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    return createColorFromRgb(+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]);
  }

  const hslMatch = trimmed.match(/hsl\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i);
  if (hslMatch) {
    const h = +hslMatch[1] / 360;
    const s = +hslMatch[2] / 100;
    const l = +hslMatch[3] / 100;
    const rgb = hslToRgb(h, s, l);
    return createColorFromRgb(rgb.r, rgb.g, rgb.b);
  }

  const parsed = parse(trimmed);
  if (parsed) {
    const hex = formatHex(parsed);
    if (hex) return createColor(hex);
  }

  return null;
}

export function formatRgb(color: RgbColor): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function formatHsl(color: HslColor): string {
  return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
}

export function formatOklch(color: OklchColor): string {
  return `oklch(${color.l.toFixed(3)} ${color.c.toFixed(3)} ${color.h.toFixed(1)})`;
}

export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(rgb: RgbColor): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getWcagLevel(ratio: number): 'AAA' | 'AA' | 'fail' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'fail';
}

export function deltaE(color1: OklchColor, color2: OklchColor): number {
  const dL = color1.l - color2.l;
  const dC = color1.c - color2.c;
  const dH = Math.sqrt(
    Math.max(0, color1.c * color1.c + color2.c * color2.c - 2 * color1.c * color2.c * Math.cos(toRad(color1.h - color2.h)))
  );
  return Math.sqrt(dL * dL + dC * dC + dH * dH) * 100;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function hexToImageData(hex: string): { r: number; g: number; b: number; a: number } {
  const rgb = hexToRgb(hex);
  return { ...rgb, a: 255 };
}

export function randomHex(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}
