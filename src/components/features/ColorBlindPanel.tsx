import { useMemo, useState } from 'react';
import { usePaletteStore } from '../../stores/paletteStore';
import type { RgbColor } from '../../types';

type BlindType = 'protanopia' | 'deuteranopia' | 'tritanopia';

const BLIND_TYPES: { type: BlindType; label: string; description: string }[] = [
  { type: 'protanopia', label: '红色盲', description: '无法区分红绿色（约1%男性）' },
  { type: 'deuteranopia', label: '绿色盲', description: '无法区分红绿色（约1%男性）' },
  { type: 'tritanopia', label: '蓝黄色盲', description: '无法区分蓝黄色（极罕见）' },
];

function simulateBlindness(rgb: RgbColor, type: BlindType): RgbColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  let nr: number, ng: number, nb: number;

  switch (type) {
    case 'protanopia':
      nr = 0.567 * r + 0.433 * g + 0.0 * b;
      ng = 0.558 * r + 0.442 * g + 0.0 * b;
      nb = 0.0 * r + 0.242 * g + 0.758 * b;
      break;
    case 'deuteranopia':
      nr = 0.625 * r + 0.375 * g + 0.0 * b;
      ng = 0.7 * r + 0.3 * g + 0.0 * b;
      nb = 0.0 * r + 0.3 * g + 0.7 * b;
      break;
    case 'tritanopia':
      nr = 0.95 * r + 0.05 * g + 0.0 * b;
      ng = 0.0 * r + 0.433 * g + 0.567 * b;
      nb = 0.0 * r + 0.475 * g + 0.525 * b;
      break;
  }

  return {
    r: Math.round(Math.max(0, Math.min(1, nr)) * 255),
    g: Math.round(Math.max(0, Math.min(1, ng)) * 255),
    b: Math.round(Math.max(0, Math.min(1, nb)) * 255),
  };
}

function rgbToHex(rgb: RgbColor): string {
  return '#' + [rgb.r, rgb.g, rgb.b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export default function ColorBlindPanel() {
  const { colors } = usePaletteStore();
  const [activeType, setActiveType] = useState<BlindType>('protanopia');

  const simulatedColors = useMemo(() => {
    return colors.map((color) => ({
      original: color.hex,
      simulated: rgbToHex(simulateBlindness(color.rgb, activeType)),
    }));
  }, [colors, activeType]);

  if (colors.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium text-text-primary">色盲模拟</h3>
        <p className="text-xs text-text-muted">
          请先添加颜色到配色方案，以查看色盲模拟效果。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-text-primary">色盲模拟</h3>
      <p className="text-xs text-text-muted">
        模拟不同色觉障碍用户看到的配色效果
      </p>

      <div className="flex flex-col gap-1">
        {BLIND_TYPES.map(({ type, label, description }) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors ${
              activeType === type
                ? 'bg-primary/10 border border-primary/30 text-text-primary'
                : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="font-medium">{label}</span>
            <span className="text-text-muted text-[10px]">{description}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="text-xs text-text-secondary font-medium">原始配色</div>
        <div className="flex gap-1 h-12">
          {colors.map((c, i) => (
            <div
              key={i}
              className="flex-1 rounded-md flex items-center justify-center"
              style={{ backgroundColor: c.hex }}
            >
              <span className={`text-[9px] font-mono px-1 rounded ${
                c.hsl.l > 60 ? 'bg-black/20 text-black' : 'bg-white/20 text-white'
              }`}>{c.hex}</span>
            </div>
          ))}
        </div>

        <div className="text-xs text-text-secondary font-medium">
          {BLIND_TYPES.find((b) => b.type === activeType)?.label} 模拟
        </div>
        <div className="flex gap-1 h-12">
          {simulatedColors.map((c, i) => (
            <div
              key={i}
              className="flex-1 rounded-md flex items-center justify-center"
              style={{ backgroundColor: c.simulated }}
            >
              <span className="text-[9px] font-mono px-1 rounded bg-white/20 text-white">
                {c.simulated}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-3 space-y-2">
        <div className="text-xs text-text-secondary font-medium">对比分析</div>
        {simulatedColors.map((c, i) => {
          const isSame = c.original.toUpperCase() === c.simulated.toUpperCase();
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="w-4 h-4 rounded-sm border border-border"
                style={{ backgroundColor: c.original }}
              />
              <span className="text-text-muted">→</span>
              <span
                className="w-4 h-4 rounded-sm border border-border"
                style={{ backgroundColor: c.simulated }}
              />
              <span className="text-text-muted font-mono">{c.original}</span>
              <span className="text-text-muted">→</span>
              <span className="text-text-primary font-mono">{c.simulated}</span>
              {isSame && (
                <span className="text-[10px] text-emerald-400">无变化</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="card p-3 bg-yellow-500/5 border-yellow-500/20">
        <div className="text-xs text-yellow-400 font-medium mb-1">设计建议</div>
        <p className="text-[11px] text-text-muted leading-relaxed">
          确保配色方案在色盲模式下仍可区分。避免仅依赖红/绿来传达信息，考虑使用形状、纹理或文字标签作为补充。
        </p>
      </div>
    </div>
  );
}
