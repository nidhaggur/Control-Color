import { useMemo, useState } from 'react';
import { usePaletteStore } from '../../stores/paletteStore';
import { getContrastRatio, getWcagLevel, hexToRgb } from '../../utils/colorUtils';

interface ContrastPair {
  fg: string;
  bg: string;
  ratio: number;
  normalText: 'AAA' | 'AA' | 'fail';
  largeText: 'AAA' | 'AA' | 'fail';
}

function getTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function getLevelBg(level: 'AAA' | 'AA' | 'fail'): string {
  if (level === 'AAA') return 'bg-emerald-500/20 text-emerald-400';
  if (level === 'AA') return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
}

export default function ContrastPanel() {
  const { colors } = usePaletteStore();
  const [showAllPairs, setShowAllPairs] = useState(false);

  const pairs = useMemo<ContrastPair[]>(() => {
    if (colors.length < 2) return [];

    const result: ContrastPair[] = [];
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const ratio = getContrastRatio(colors[i].hex, colors[j].hex);
        result.push({
          fg: colors[i].hex,
          bg: colors[j].hex,
          ratio,
          normalText: getWcagLevel(ratio),
          largeText: ratio >= 3 ? 'AA' : 'fail',
        });
      }
    }

    result.sort((a, b) => b.ratio - a.ratio);

    return showAllPairs ? result : result.slice(0, 6);
  }, [colors, showAllPairs]);

  const allPairs = useMemo<ContrastPair[]>(() => {
    if (colors.length < 2) return [];
    const result: ContrastPair[] = [];
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const ratio = getContrastRatio(colors[i].hex, colors[j].hex);
        result.push({
          fg: colors[i].hex,
          bg: colors[j].hex,
          ratio,
          normalText: getWcagLevel(ratio),
          largeText: ratio >= 3 ? 'AA' : 'fail',
        });
      }
    }
    return result;
  }, [colors]);

  if (colors.length < 2) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium text-text-primary">WCAG 对比度检查</h3>
        <p className="text-xs text-text-muted">
          需要至少 2 个颜色才能检查对比度。请先通过提取、预设或自定义添加颜色。
        </p>
      </div>
    );
  }

  const aaCount = allPairs.filter((p) => p.normalText !== 'fail').length;
  const aaaCount = allPairs.filter((p) => p.normalText === 'AAA').length;
  const failCount = allPairs.filter((p) => p.normalText === 'fail').length;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-text-primary">WCAG 对比度检查</h3>

      <div className="grid grid-cols-3 gap-2">
        <div className="card p-2 text-center">
          <div className="text-xs text-text-muted">AAA</div>
          <div className="text-lg font-bold text-emerald-400">{aaaCount}</div>
        </div>
        <div className="card p-2 text-center">
          <div className="text-xs text-text-muted">AA</div>
          <div className="text-lg font-bold text-yellow-400">{aaCount - aaaCount}</div>
        </div>
        <div className="card p-2 text-center">
          <div className="text-xs text-text-muted">不通过</div>
          <div className="text-lg font-bold text-red-400">{failCount}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {pairs.map((pair, idx) => (
          <div key={idx} className="card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-5 h-5 rounded-sm border border-border"
                  style={{ backgroundColor: pair.fg }}
                />
                <span className="text-xs text-text-muted">+</span>
                <span
                  className="w-5 h-5 rounded-sm border border-border"
                  style={{ backgroundColor: pair.bg }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${getLevelBg(pair.normalText)}`}>
                  {pair.normalText === 'fail' ? '不通过' : pair.normalText}
                </span>
                <span className="text-xs font-mono text-text-secondary">
                  {pair.ratio.toFixed(2)}:1
                </span>
              </div>
            </div>

            <div
              className="rounded-md px-3 py-2 text-center text-sm font-medium"
              style={{ backgroundColor: pair.bg, color: pair.fg }}
            >
              正文文本预览 Aa Bb
            </div>

            <div
              className="rounded-md px-3 py-1.5 text-center text-lg font-bold"
              style={{ backgroundColor: pair.bg, color: pair.fg }}
            >
              大号标题
            </div>

            <div className="flex justify-between text-[10px] text-text-muted">
              <span>
                正文: <span className={pair.normalText === 'fail' ? 'text-red-400' : 'text-emerald-400'}>
                  {pair.normalText === 'fail' ? '不通过' : pair.normalText}
                </span>
              </span>
              <span>
                大字: <span className={pair.largeText === 'fail' ? 'text-red-400' : 'text-emerald-400'}>
                  {pair.largeText === 'fail' ? '不通过' : pair.largeText}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {allPairs.length > 6 && (
        <button
          onClick={() => setShowAllPairs(!showAllPairs)}
          className="btn-ghost text-xs w-full"
        >
          {showAllPairs ? '收起' : `查看全部 ${allPairs.length} 组对比`}
        </button>
      )}
    </div>
  );
}
