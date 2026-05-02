import { useState, useMemo, useRef } from 'react';
import { usePaletteStore } from '../../stores/paletteStore';
import { useToast } from '../ui/Toast';

type GradientType = 'linear' | 'radial';
type GradientAngle = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

export default function GradientPanel() {
  const { colors } = usePaletteStore();
  const { toast } = useToast();
  const [gradientType, setGradientType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState<GradientAngle>(90);
  const previewRef = useRef<HTMLDivElement>(null);

  const gradientCSS = useMemo(() => {
    if (colors.length < 2) return '';
    const colorStops = colors.map((c, i) => {
      const percent = Math.round((i / (colors.length - 1)) * 100);
      return `${c.hex} ${percent}%`;
    }).join(', ');

    if (gradientType === 'linear') {
      return `linear-gradient(${angle}deg, ${colorStops})`;
    }
    return `radial-gradient(circle, ${colorStops})`;
  }, [colors, gradientType, angle]);

  const cssCode = useMemo(() => {
    if (!gradientCSS) return '';
    return `background: ${gradientCSS};`;
  }, [gradientCSS]);

  const tailwindCode = useMemo(() => {
    if (colors.length < 2) return '';
    if (gradientType === 'linear') {
      const directionMap: Record<number, string> = {
        0: 'to-t', 45: 'to-tr', 90: 'to-r', 135: 'to-br',
        180: 'to-b', 225: 'to-bl', 270: 'to-l', 315: 'to-tl',
      };
      const dir = directionMap[angle] || 'to-r';
      const fromColor = colors[0].hex;
      const toColor = colors[colors.length - 1].hex;
      const viaColors = colors.slice(1, -1).map((c) => 'via-[' + c.hex + ']').join(' ');
      return 'bg-gradient-' + dir.replace('to-', '') + ' from-[' + fromColor + '] ' + viaColors + ' to-[' + toColor + ']';
    }
    return 'bg-[radial-gradient(circle,' + colors.map((c, i) => c.hex + ' ' + Math.round((i / (colors.length - 1)) * 100) + '%').join(',') + ')]';
  }, [colors, gradientType, angle]);

  const svgCode = useMemo(() => {
    if (colors.length < 2) return '';
    const stops = colors.map((c, i) => {
      const offset = Math.round((i / (colors.length - 1)) * 100);
      return `    <stop offset="${offset}%" stop-color="${c.hex}" />`;
    }).join('\n');

    if (gradientType === 'linear') {
      const rad = (angle * Math.PI) / 180;
      const x1 = Math.round(50 - Math.cos(rad) * 50);
      const y1 = Math.round(50 - Math.sin(rad) * 50);
      const x2 = Math.round(50 + Math.cos(rad) * 50);
      const y2 = Math.round(50 + Math.sin(rad) * 50);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <defs>
    <linearGradient id="grad" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
${stops}
    </linearGradient>
  </defs>
  <rect width="400" height="200" fill="url(#grad)" />
</svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <defs>
    <radialGradient id="grad" cx="50%" cy="50%" r="50%">
${stops}
    </radialGradient>
  </defs>
  <rect width="200" height="200" fill="url(#grad)" />
</svg>`;
  }, [colors, gradientType, angle]);

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    toast(`已复制 ${label} 代码`, 'success');
  };

  const downloadSvg = () => {
    if (!svgCode) return;
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gradient.svg';
    a.click();
    URL.revokeObjectURL(url);
    toast('SVG 渐变已下载', 'success');
  };

  if (colors.length < 2) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium text-text-primary">渐变生成器</h3>
        <p className="text-xs text-text-muted">
          需要至少 2 个颜色才能生成渐变。请先添加颜色到配色方案。
        </p>
      </div>
    );
  }

  const angles: GradientAngle[] = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-text-primary">渐变生成器</h3>

      <div
        ref={previewRef}
        className="w-full h-32 rounded-lg border border-border"
        style={{ background: gradientCSS }}
      />

      <div className="flex gap-2">
        <button
          onClick={() => setGradientType('linear')}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
            gradientType === 'linear'
              ? 'bg-primary text-white'
              : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          线性渐变
        </button>
        <button
          onClick={() => setGradientType('radial')}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
            gradientType === 'radial'
              ? 'bg-primary text-white'
              : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          径向渐变
        </button>
      </div>

      {gradientType === 'linear' && (
        <div className="space-y-2">
          <label className="text-xs text-text-secondary">角度</label>
          <div className="grid grid-cols-4 gap-1">
            {angles.map((a) => (
              <button
                key={a}
                onClick={() => setAngle(a)}
                className={`text-xs py-1.5 rounded-md transition-colors ${
                  angle === a
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {a}°
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={angle}
            onChange={(e) => setAngle(+e.target.value as GradientAngle)}
            className="w-full accent-primary"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 h-3 rounded-full overflow-hidden flex">
          {colors.map((c, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
        <span className="text-xs text-text-muted">{colors.length} 色</span>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => copyCode(cssCode, 'CSS')}
          className="btn-secondary text-xs w-full"
        >
          复制 CSS 代码
        </button>
        <button
          onClick={() => copyCode(tailwindCode, 'Tailwind')}
          className="btn-secondary text-xs w-full"
        >
          复制 Tailwind 代码
        </button>
        <button
          onClick={downloadSvg}
          className="btn-primary text-xs w-full"
        >
          下载 SVG
        </button>
      </div>

      <div className="card p-3">
        <div className="text-xs text-text-muted mb-2">CSS 预览</div>
        <pre className="text-[10px] text-text-secondary font-mono break-all whitespace-pre-wrap bg-background/50 p-2 rounded">
          {cssCode}
        </pre>
      </div>
    </div>
  );
}
