import { useState, useCallback, useEffect } from 'react';
import { usePaletteStore } from '../../stores/paletteStore';
import { hslToHex, hexToRgb, rgbToOklch } from '../../utils/colorUtils';
import { getRecommendations } from '../../utils/recommendationUtils';
import ColorWheel from '../ui/ColorWheel';
import type { Color, RecommendedColor } from '../../types';
import { useToast } from '../ui/Toast';

interface WheelThumb {
  hue: number;
  saturation: number;
  lightness: number;
}

type HarmonyType = 'custom' | 'analogous' | 'complementary' | 'triadic' | 'split' | 'tetradic' | 'monochromatic';
type InputMode = 'hex' | 'hsl' | 'rgb' | 'oklch';

const HARMONY_LABELS: Record<HarmonyType, string> = {
  custom: '自定义',
  analogous: '类似色',
  complementary: '互补色',
  triadic: '三角色',
  split: '分裂互补',
  tetradic: '四角色',
  monochromatic: '单色系',
};

function getHarmonyHues(baseHue: number, type: HarmonyType): number[] {
  switch (type) {
    case 'analogous':
      return [baseHue, (baseHue + 30) % 360, (baseHue - 30 + 360) % 360];
    case 'complementary':
      return [baseHue, (baseHue + 180) % 360];
    case 'triadic':
      return [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];
    case 'split':
      return [baseHue, (baseHue + 150) % 360, (baseHue + 210) % 360];
    case 'tetradic':
      return [baseHue, (baseHue + 90) % 360, (baseHue + 180) % 360, (baseHue + 270) % 360];
    case 'monochromatic':
      return [baseHue];
    case 'custom':
      return [];
  }
}

function thumbToHex(t: WheelThumb): string {
  return hslToHex(t.hue, t.saturation, t.lightness);
}

function hexToOklchVals(hex: string): { l: number; c: number; h: number } {
  const rgb = hexToRgb(hex);
  if (!rgb) return { l: 0, c: 0, h: 0 };
  return rgbToOklch(rgb.r, rgb.g, rgb.b);
}

export default function CustomColorPanel() {
  const { colors, setColors, addColor, removeColor, reorderColors } = usePaletteStore();
  const { toast } = useToast();
  const [harmonyType, setHarmonyType] = useState<HarmonyType>('custom');
  const [inputMode, setInputMode] = useState<InputMode>('hex');
  const [hexInput, setHexInput] = useState('#3B82F6');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const initThumbs = useCallback((): WheelThumb[] => {
    if (colors.length >= 2) {
      return colors.slice(0, 5).map((c) => ({
        hue: c.hsl.h,
        saturation: c.hsl.s,
        lightness: c.hsl.l,
      }));
    }
    return [
      { hue: 210, saturation: 80, lightness: 55 },
      { hue: 240, saturation: 70, lightness: 45 },
    ];
  }, [colors]);

  const [thumbs, setThumbs] = useState<WheelThumb[]>(initThumbs);
  const [activeThumb, setActiveThumb] = useState(0);

  useEffect(() => {
    if (colors.length >= 2) {
      setThumbs(colors.slice(0, 5).map((c) => ({
        hue: c.hsl.h,
        saturation: c.hsl.s,
        lightness: c.hsl.l,
      })));
    }
  }, [colors]);

  const applyHarmony = useCallback(() => {
    const base = thumbs[0];
    if (!base) return;
    const hues = getHarmonyHues(base.hue, harmonyType);
    if (hues.length === 0) return;
    const newThumbs = hues.map((h) => ({
      hue: h,
      saturation: base.saturation,
      lightness: base.lightness,
    }));
    setThumbs(newThumbs);
    setActiveThumb(0);
  }, [thumbs, harmonyType]);

  const handleBaseDrag = useCallback((deltaHue: number) => {
    setThumbs((prev) =>
      prev.map((t, i) => {
        if (i === 0) return { ...t, hue: (t.hue + deltaHue + 360) % 360 };
        return { ...t, hue: (t.hue + deltaHue + 360) % 360 };
      }),
    );
  }, []);

  const handleWheelChange = useCallback((newThumbs: WheelThumb[]) => {
    setThumbs(newThumbs);
    const hex = thumbToHex(newThumbs[activeThumb]);
    setHexInput(hex);
  }, [activeThumb]);

  const handleHexChange = useCallback((hex: string) => {
    setHexInput(hex);
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r / 255) h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g / 255) h = ((b / 255 - r / 255) / d + 2) * 60;
      else h = ((r / 255 - g / 255) / d + 4) * 60;
    }
    const newThumbs = [...thumbs];
    newThumbs[activeThumb] = { hue: Math.round(h), saturation: Math.round(s * 100), lightness: Math.round(l * 100) };
    setThumbs(newThumbs);
  }, [thumbs, activeThumb]);

  const handleSave = () => {
    const newColors: Color[] = thumbs.map((t) => {
      const hex = thumbToHex(t);
      const rgb = hexToRgb(hex)!;
      return {
        hex,
        rgb,
        hsl: { h: t.hue, s: t.saturation, l: t.lightness },
        oklch: rgbToOklch(rgb.r, rgb.g, rgb.b),
      };
    });
    setColors(newColors);
    toast(`已保存 ${newColors.length} 个颜色到配色方案`, 'success');
  };

  const handleAddSingle = () => {
    const t = thumbs[activeThumb];
    if (!t) return;
    const hex = thumbToHex(t);
    addColor(hex);
    toast('已添加到配色方案', 'success');
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      reorderColors(dragIdx, idx);
      setDragIdx(idx);
    }
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  const active = thumbs[activeThumb];
  const activeHex = active ? thumbToHex(active) : '#000000';
  const isHarmonyActive = harmonyType !== 'custom';
  const oklchVals = hexToOklchVals(activeHex);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-text-primary">色轮编辑器</h3>
        <span className="text-[10px] text-text-muted bg-surface-hover px-1.5 py-0.5 rounded">
          {HARMONY_LABELS[harmonyType]}
        </span>
      </div>

      <ColorWheel
        thumbs={thumbs}
        activeIndex={activeThumb}
        onThumbsChange={handleWheelChange}
        onActiveChange={(i) => {
          setActiveThumb(i);
          setHexInput(thumbToHex(thumbs[i]));
        }}
        size={280}
        harmonyLocked={isHarmonyActive}
        onBaseDrag={isHarmonyActive ? handleBaseDrag : undefined}
      />

      <div className="flex gap-1.5">
        {thumbs.map((t, i) => {
          const hex = thumbToHex(t);
          return (
            <button
              key={i}
              onClick={() => {
                setActiveThumb(i);
                setHexInput(hex);
              }}
              className={`flex-1 h-9 rounded-lg border-2 transition-all relative group ${
                i === activeThumb
                  ? 'border-white shadow-lg scale-105'
                  : 'border-transparent opacity-80 hover:opacity-100 hover:border-white/30'
              }`}
              style={{ backgroundColor: hex }}
            >
              <span className="absolute inset-x-0 bottom-0.5 text-center text-[9px] font-mono text-white/90 drop-shadow">
                {hex.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-surface/50">
          <div className="w-10 h-10 rounded-lg border border-border shadow-sm shrink-0" style={{ backgroundColor: activeHex }} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-text-primary font-semibold">{activeHex.toUpperCase()}</div>
            {active && (
              <div className="text-[10px] text-text-muted">
                H:{Math.round(active.hue)}° S:{Math.round(active.saturation)}% L:{Math.round(active.lightness)}%
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          {(['hex', 'hsl', 'rgb', 'oklch'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setInputMode(mode)}
              className={`flex-1 text-[10px] py-1.5 rounded-md transition-colors font-medium ${
                inputMode === mode
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-text-muted hover:text-text-secondary border border-transparent'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>

        {inputMode === 'hex' && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              className="input-field flex-1 text-xs font-mono"
              maxLength={7}
            />
            <input
              type="color"
              value={activeHex}
              onChange={(e) => handleHexChange(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-border"
            />
          </div>
        )}

        {inputMode === 'hsl' && active && (
          <div className="space-y-1.5">
            {([
              { key: 'h' as const, label: 'H', max: 360, val: Math.round(active.hue), color: '#ef4444' },
              { key: 's' as const, label: 'S', max: 100, val: Math.round(active.saturation), color: '#22c55e' },
              { key: 'l' as const, label: 'L', max: 100, val: Math.round(active.lightness), color: '#3b82f6' },
            ]).map(({ key, label, max, val, color }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] w-4 font-bold" style={{ color }}>{label}</span>
                <input
                  type="range"
                  min={0}
                  max={max}
                  value={val}
                  onChange={(e) => {
                    const nt = [...thumbs];
                    nt[activeThumb] = { ...nt[activeThumb], [key === 'h' ? 'hue' : key === 's' ? 'saturation' : 'lightness']: +e.target.value };
                    setThumbs(nt);
                  }}
                  className="slider flex-1"
                />
                <span className="text-[10px] w-7 text-right font-mono">{val}°</span>
              </div>
            ))}
          </div>
        )}

        {inputMode === 'rgb' && active && (
          <div className="space-y-1.5">
            {(['r', 'g', 'b'] as const).map((ch) => {
              const rgb = hexToRgb(activeHex);
              const val = rgb ? (ch === 'r' ? rgb.r : ch === 'g' ? rgb.g : rgb.b) : 0;
              const chColor = ch === 'r' ? '#ef4444' : ch === 'g' ? '#22c55e' : '#3b82f6';
              return (
                <div key={ch} className="flex items-center gap-2">
                  <span className="text-[10px] w-4 font-bold" style={{ color: chColor }}>{ch.toUpperCase()}</span>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={val}
                    onChange={(e) => {
                      const currentRgb = hexToRgb(activeHex) || { r: 0, g: 0, b: 0 };
                      const newRgb = { ...currentRgb, [ch]: +e.target.value };
                      const newHex = `#${newRgb.r.toString(16).padStart(2, '0')}${newRgb.g.toString(16).padStart(2, '0')}${newRgb.b.toString(16).padStart(2, '0')}`;
                      handleHexChange(newHex);
                    }}
                    className="slider flex-1"
                  />
                  <span className="text-[10px] w-7 text-right font-mono">{val}</span>
                </div>
              );
            })}
          </div>
        )}

        {inputMode === 'oklch' && (
          <div className="space-y-1.5">
            {([
              { key: 'l' as const, label: 'L', max: 100, val: Math.round(oklchVals.l * 100), color: '#f59e0b', step: 1 },
              { key: 'c' as const, label: 'C', max: 40, val: Math.round(oklchVals.c * 100), color: '#8b5cf6', step: 1 },
              { key: 'h' as const, label: 'H', max: 360, val: Math.round(oklchVals.h), color: '#06b6d4', step: 1 },
            ]).map(({ key, label, max, val, color }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] w-4 font-bold" style={{ color }}>{label}</span>
                <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(val / max) * 100}%`, backgroundColor: color }} />
                </div>
                <span className="text-[10px] w-8 text-right font-mono">{val}{key === 'h' ? '°' : ''}</span>
              </div>
            ))}
            <div className="text-[9px] text-text-muted text-center">
              OKLCH 值基于当前颜色计算，暂不支持直接编辑
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="text-[10px] text-text-muted mb-1.5 font-medium">色彩调和</div>
        <div className="grid grid-cols-4 gap-1">
          {(Object.keys(HARMONY_LABELS) as HarmonyType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setHarmonyType(type);
                if (type !== 'custom') {
                  const base = thumbs[0];
                  const hues = getHarmonyHues(base.hue, type);
                  if (hues.length > 0) {
                    setThumbs(hues.map((h) => ({ hue: h, saturation: base.saturation, lightness: base.lightness })));
                    setActiveThumb(0);
                  }
                }
              }}
              className={`text-[10px] py-1.5 px-1 rounded-md border transition-colors ${
                harmonyType === type
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-surface text-text-muted hover:text-text-secondary hover:border-border/80'
              }`}
            >
              {HARMONY_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleAddSingle} className="btn-secondary flex-1 text-xs py-2">
          + 添加当前
        </button>
        <button onClick={handleSave} className="btn-primary flex-1 text-xs py-2">
          全部应用
        </button>
      </div>

      {colors.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-text-muted font-medium">当前配色方案</div>
          <div className="flex gap-1">
            {colors.map((c, i) => (
              <div
                key={`${c.hex}-${i}`}
                className="flex-1 relative group cursor-move rounded-md overflow-hidden"
                style={{ backgroundColor: c.hex }}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
              >
                <div className="h-9 w-full" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeColor(i);
                    toast(`已删除 ${c.hex}`, 'info');
                  }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除此颜色"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <span className="absolute inset-x-0 bottom-0 text-center text-[8px] font-mono text-white/90 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                  {c.hex.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-text-muted text-center">拖拽色块可调整顺序，hover 显示删除按钮</div>
        </div>
      )}

      {colors.length > 0 && <InlineRecommendations />}
    </div>
  );
}

function InlineRecommendations() {
  const { colors, addColor } = usePaletteStore();
  const { toast } = useToast();
  const [recs, setRecs] = useState<RecommendedColor[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (colors.length > 0) {
      const r = getRecommendations(colors, 8);
      setRecs(r);
    } else {
      setRecs([]);
    }
  }, [colors]);

  if (recs.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-muted font-medium">智能推荐</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              recs.forEach(r => addColor(r.color.hex));
              toast(`已添加 ${recs.length} 个推荐色`, 'success');
              setRecs([]);
            }}
            className="text-[9px] text-primary hover:text-primary/80 px-1 py-0.5 rounded hover:bg-primary/10 transition-colors"
          >
            全部采纳
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-[9px] text-text-muted hover:text-text-secondary px-1 py-0.5 rounded hover:bg-surface-hover transition-colors"
          >
            {collapsed ? '展开' : '收起'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-4 gap-1.5">
          {recs.map((rec) => (
            <button
              key={rec.color.hex}
              onClick={() => {
                addColor(rec.color.hex);
                setRecs(prev => prev.filter(r => r.color.hex !== rec.color.hex));
                toast(`已添加 ${rec.label}`, 'success');
              }}
              className="group"
              title={`${rec.color.hex} · ${rec.label}`}
            >
              <div
                className="h-7 rounded-md border border-border/30 transition-transform group-hover:scale-105 group-hover:border-primary/50"
                style={{ backgroundColor: rec.color.hex }}
              />
              <div className="text-[8px] text-text-muted text-center mt-0.5 truncate group-hover:text-text-secondary">
                {rec.label}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
