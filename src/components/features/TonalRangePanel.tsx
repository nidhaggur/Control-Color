import { useState, useCallback, useRef, useEffect } from 'react';
import { usePaletteStore } from '../../stores/paletteStore';
import { useImageStore } from '../../stores/imageStore';
import { useHistoryStore } from '../../stores/historyStore';
import { loadImage, imageToCanvas, canvasToImageData, canvasToDataUrl, imageDataToCanvas } from '../../utils/imageUtils';
import { hexToRgb } from '../../utils/colorUtils';
import { useToast } from '../ui/Toast';

interface RegionConfig {
  start: number;
  end: number;
  startColor: string;
  endColor: string;
}

function sigmoidBlend(t: number, edgeStart: number, edgeWidth: number): number {
  const x = (t - edgeStart) / edgeWidth;
  return 1 / (1 + Math.exp(-10 * (x - 0.5)));
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  };
}

export default function TonalRangePanel() {
  const { colors } = usePaletteStore();
  const { sourceImage, processedImageUrl, setProcessedImageUrl, revertProcessed } = useImageStore();
  const { pushEntry } = useHistoryStore();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [histogram, setHistogram] = useState<number[]>([]);
  const [regions, setRegions] = useState<RegionConfig[]>([
    { start: 0, end: 85, startColor: '#1a1a2e', endColor: '#16213e' },
    { start: 85, end: 170, startColor: '#533483', endColor: '#e94560' },
    { start: 170, end: 255, startColor: '#f5a623', endColor: '#ffffff' },
  ]);
  const [useGradient, setUseGradient] = useState(true);
  const autoAppliedRef = useRef(false);

  useEffect(() => {
    if (!sourceImage) return;
    const loadHist = async () => {
      const img = await loadImage(sourceImage.dataUrl);
      const canvas = imageToCanvas(img);
      const imageData = canvasToImageData(canvas);
      const bins = new Array(256).fill(0);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const lum = Math.round(0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2]);
        bins[lum]++;
      }
      setHistogram(bins);
    };
    loadHist();
  }, [sourceImage]);

  useEffect(() => {
    if (!canvasRef.current || histogram.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const max = Math.max(...histogram);
    const barW = w / 256;

    for (let i = 0; i < 256; i++) {
      const barH = (histogram[i] / max) * h * 0.9;
      let color: string;

      const region = regions.find((r) => i >= r.start && i <= r.end);
      if (region) {
        const regionRange = region.end - region.start || 1;
        const t = (i - region.start) / regionRange;
        const c1 = hexToRgb(region.startColor);
        const c2 = hexToRgb(region.endColor);
        const blended = lerpColor(c1, c2, t);
        color = `rgb(${Math.round(blended.r)},${Math.round(blended.g)},${Math.round(blended.b)})`;
      } else {
        color = `rgb(${i},${i},${i})`;
      }

      ctx.fillStyle = color;
      ctx.fillRect(i * barW, h - barH, barW + 1, barH);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const region of regions) {
      const x = (region.start / 255) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      const x2 = (region.end / 255) * w;
      ctx.beginPath();
      ctx.moveTo(x2, 0);
      ctx.lineTo(x2, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }, [histogram, regions]);

  const updateRegion = useCallback((index: number, field: keyof RegionConfig, value: number | string) => {
    setRegions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const applyTonal = useCallback(async () => {
    if (!sourceImage) return;
    try {
      const img = await loadImage(sourceImage.dataUrl);
      const canvas = imageToCanvas(img);
      const imageData = canvasToImageData(canvas);
      const data = imageData.data;
      const result = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
      const rd = result.data;
      const edgeWidth = 20 / 255;

      for (let i = 0; i < data.length; i += 4) {
        const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        const lumByte = lum * 255;

        let outR = 0, outG = 0, outB = 0;

        for (const region of regions) {
          const rStart = region.start / 255;
          const rEnd = region.end / 255;

          if (lum >= rStart && lum <= rEnd) {
            const regionRange = rEnd - rStart || 1;
            const t = (lum - rStart) / regionRange;
            const c1 = hexToRgb(region.startColor);
            const c2 = hexToRgb(region.endColor);

            if (useGradient) {
              const blended = lerpColor(c1, c2, t);
              outR = blended.r;
              outG = blended.g;
              outB = blended.b;
            } else {
              const blended = lerpColor(c1, c2, t);
              outR = blended.r;
              outG = blended.g;
              outB = blended.b;
            }

            if (t < edgeWidth / regionRange) {
              const s = sigmoidBlend(t * regionRange, 0, edgeWidth);
              const origLum = lumByte;
              outR = origLum + (outR - origLum) * s;
              outG = origLum + (outG - origLum) * s;
              outB = origLum + (outB - origLum) * s;
            } else if (t > 1 - edgeWidth / regionRange) {
              const s = sigmoidBlend((1 - t) * regionRange, 0, edgeWidth);
              const origLum = lumByte;
              outR = origLum + (outR - origLum) * s;
              outG = origLum + (outG - origLum) * s;
              outB = origLum + (outB - origLum) * s;
            }

            break;
          }
        }

        rd[i] = Math.max(0, Math.min(255, Math.round(outR)));
        rd[i + 1] = Math.max(0, Math.min(255, Math.round(outG)));
        rd[i + 2] = Math.max(0, Math.min(255, Math.round(outB)));
        rd[i + 3] = data[i + 3];
      }

      const resultCanvas = imageDataToCanvas(result);
      setProcessedImageUrl(canvasToDataUrl(resultCanvas));
      pushEntry({
        type: 'tonal-boundary',
        description: `灰阶着色 ${regions.length}区域`,
        snapshot: [...colors],
      });
      toast('灰阶区域配色完成', 'success');
    } catch {
      toast('处理失败', 'error');
    }
  }, [sourceImage, regions, useGradient, setProcessedImageUrl, pushEntry, toast]);

  useEffect(() => {
    if (sourceImage && processedImageUrl && autoAppliedRef.current) {
      applyTonal();
    }
  }, [regions, useGradient]);

  const handleApply = useCallback(() => {
    autoAppliedRef.current = true;
    applyTonal();
  }, [applyTonal]);

  const handleExport = () => {
    if (!processedImageUrl) return;
    const a = document.createElement('a');
    a.href = processedImageUrl;
    a.download = 'tonal-colored.png';
    a.click();
  };

  const applyFromPalette = (regionIdx: number) => {
    if (colors.length === 0) return;
    const region = regions[regionIdx];
    const midValue = (region.start + region.end) / 2;
    const closestColor = colors.reduce((best, c) => {
      const lum = 0.299 * c.rgb.r + 0.587 * c.rgb.g + 0.114 * c.rgb.b;
      const bestLum = 0.299 * best.rgb.r + 0.587 * best.rgb.g + 0.114 * best.rgb.b;
      return Math.abs(lum - midValue) < Math.abs(bestLum - midValue) ? c : best;
    }, colors[0]);
    updateRegion(regionIdx, 'startColor', closestColor.hex);
    updateRegion(regionIdx, 'endColor', closestColor.hex);
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-text-muted leading-relaxed">
        将图片分为不同灰阶区域，为每个区域应用渐变色映射。区域边界使用 sigmoid 平滑过渡避免硬边。
      </div>

      {!sourceImage && (
        <div className="text-center text-text-muted py-6 text-xs space-y-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-40">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 3l18 18" />
          </svg>
          <div>请先上传图片</div>
          <div className="text-[10px] opacity-60">建议使用灰度图或先通过灰阶工具转换</div>
        </div>
      )}

      {histogram.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-text-muted">亮度分布</div>
          <canvas ref={canvasRef} width={280} height={80} className="w-full rounded-md bg-background/50" />
          <div className="flex justify-between text-[9px] text-text-muted">
            <span>0 (暗)</span>
            <span>128</span>
            <span>255 (亮)</span>
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          onClick={() => setUseGradient((v) => !v)}
          className={`relative w-8 h-[18px] rounded-full transition-colors ${useGradient ? 'bg-primary' : 'bg-surface-hover'}`}
        >
          <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${useGradient ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-xs text-text-secondary">渐变色映射</span>
      </label>

      <div className="space-y-3">
        {regions.map((region, i) => {
          const regionLabel = i === 0 ? '阴影' : i === 1 ? '中间调' : '高光';
          return (
            <div key={i} className="rounded-lg border border-border bg-surface-hover/30 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">{regionLabel}</span>
                {colors.length > 0 && (
                  <button onClick={() => applyFromPalette(i)} className="text-[9px] text-primary hover:underline">
                    从配色取
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-muted w-8">范围</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={region.start}
                  onChange={(e) => updateRegion(i, 'start', +e.target.value)}
                  className="slider flex-1"
                />
                <span className="text-[10px] font-mono w-6 text-center">{region.start}</span>
                <span className="text-[10px] text-text-muted">-</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={region.end}
                  onChange={(e) => updateRegion(i, 'end', +e.target.value)}
                  className="slider flex-1"
                />
                <span className="text-[10px] font-mono w-6 text-center">{region.end}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-muted w-8">起始</span>
                <input
                  type="color"
                  value={region.startColor}
                  onChange={(e) => updateRegion(i, 'startColor', e.target.value)}
                  className="w-7 h-5 rounded cursor-pointer bg-transparent border border-border"
                />
                <span className="text-[10px] font-mono text-text-muted">{region.startColor}</span>
                <span className="text-[10px] text-text-muted mx-1">→</span>
                <input
                  type="color"
                  value={region.endColor}
                  onChange={(e) => updateRegion(i, 'endColor', e.target.value)}
                  className="w-7 h-5 rounded cursor-pointer bg-transparent border border-border"
                />
                <span className="text-[10px] font-mono text-text-muted">{region.endColor}</span>
              </div>

              <div
                className="h-3 rounded-full"
                style={{
                  background: `linear-gradient(to right, ${region.startColor}, ${region.endColor})`,
                }}
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={handleApply}
        disabled={!sourceImage}
        className="btn-primary w-full text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        应用配色
      </button>

      {processedImageUrl && (
        <div className="space-y-2">
          <img src={processedImageUrl} alt="配色结果" className="w-full rounded-md" />
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-ghost flex-1 text-xs">
              导出图片
            </button>
            <button
              onClick={() => { revertProcessed(); autoAppliedRef.current = false; }}
              className="btn-ghost flex-1 text-xs text-text-muted hover:text-red-400"
            >
              撤回操作
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
