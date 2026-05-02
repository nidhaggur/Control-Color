import { useState, useCallback, useEffect } from 'react';
import { usePaletteStore } from '../../stores/paletteStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { generateAllPresetSchemes, getRandomHue } from '../../utils/presetUtils';
import type { PresetScheme } from '../../types';
import ColorBlock from '../ui/ColorBlock';
import { useToast } from '../ui/Toast';

export default function PresetPanel() {
  const { setColors, setSourceType, baseHue: storeBaseHue } = usePaletteStore();
  const { presetColorCount } = useSettingsStore();
  const { toast } = useToast();
  const [baseHue, setBaseHueLocal] = useState(storeBaseHue);
  const [schemes, setSchemes] = useState<PresetScheme[]>(() =>
    generateAllPresetSchemes(storeBaseHue, presetColorCount),
  );
  const [selectedScheme, setSelectedScheme] = useState<number | null>(null);

  useEffect(() => {
    setBaseHueLocal(storeBaseHue);
    setSchemes(generateAllPresetSchemes(storeBaseHue, presetColorCount));
    setSelectedScheme(null);
  }, [storeBaseHue, presetColorCount]);

  const regenerate = useCallback((hue: number) => {
    setSchemes(generateAllPresetSchemes(hue, presetColorCount));
    setSelectedScheme(null);
  }, [presetColorCount]);

  const handleHueChange = (hue: number) => {
    setBaseHueLocal(hue);
    regenerate(hue);
  };

  const handleRandom = () => {
    const hue = getRandomHue();
    setBaseHueLocal(hue);
    regenerate(hue);
  };

  const applyScheme = (index: number) => {
    const scheme = schemes[index];
    setColors(scheme.colors);
    setSourceType('preset');
    setSelectedScheme(index);
    toast(`已应用${scheme.name}方案`, 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-text-primary">预设配色方案</h3>

      <div className="flex items-center gap-2">
        <label className="text-xs text-text-secondary shrink-0">基础色相</label>
        <input
          type="range"
          min={0}
          max={359}
          value={baseHue}
          onChange={(e) => handleHueChange(+e.target.value)}
          className="flex-1 accent-primary"
          style={{
            background: `linear-gradient(to right,
              hsl(0, 70%, 55%), hsl(60, 70%, 55%), hsl(120, 70%, 55%),
              hsl(180, 70%, 55%), hsl(240, 70%, 55%), hsl(300, 70%, 55%), hsl(360, 70%, 55%))`,
            borderRadius: '9999px',
            height: '6px',
          }}
        />
        <span className="text-xs text-text-primary font-mono w-8 text-center">{baseHue}°</span>
      </div>

      <button onClick={handleRandom} className="btn-secondary text-xs w-full">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1">
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
        随机色相
      </button>

      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto scrollbar-thin">
        {schemes.map((scheme, idx) => (
          <div
            key={scheme.type}
            className={`card p-3 cursor-pointer transition-all duration-fast hover:shadow-md ${
              selectedScheme === idx ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => applyScheme(idx)}
          >
            <div className="text-xs text-text-secondary mb-2">{scheme.name}</div>
            <div className="flex gap-1">
              {scheme.colors.map((color, ci) => (
                <div
                  key={ci}
                  className="flex-1 h-8 rounded-sm"
                  style={{ backgroundColor: color.hex }}
                  title={color.hex}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
