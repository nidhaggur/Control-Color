import { useState, useCallback, useEffect, useRef } from 'react';
import { useImageStore } from '../../stores/imageStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useToast } from '../ui/Toast';
import { hexToRgb } from '../../utils/colorUtils';
import type { TransferAlgorithm } from '../../types';

const EPSILON = 1e-6;

function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  c = Math.max(0, Math.min(1, c));
  return c <= 0.0031308
    ? Math.round(c * 12.92 * 255)
    : Math.round((1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return [
    0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb,
    0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb,
    0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb,
  ];
}

function xyzToRgb(x: number, y: number, z: number): [number, number, number] {
  const r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
  const b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(b)];
}

function xyzToLms(x: number, y: number, z: number): [number, number, number] {
  return [
    0.3897 * x + 0.6890 * y - 0.0787 * z,
    -0.2298 * x + 1.1834 * y + 0.0464 * z,
    0.0000 * x + 0.0000 * y + 1.0000 * z,
  ];
}

function lmsToXyz(l: number, m: number, s: number): [number, number, number] {
  return [
    1.9102 * l - 1.1121 * m + 0.2019 * s,
    0.3710 * l + 0.6291 * m - 0.0000 * s,
    0.0000 * l + 0.0000 * m + 1.0000 * s,
  ];
}

function lmsToLAlphaBeta(l: number, m: number, s: number): [number, number, number] {
  const sqrt3 = Math.sqrt(3);
  const sqrt6 = Math.sqrt(6);
  const sqrt2 = Math.sqrt(2);
  return [
    (l + m + s) / sqrt3,
    (l + m - 2 * s) / sqrt6,
    (l - m) / sqrt2,
  ];
}

function lAlphaBetaToLms(L: number, alpha: number, beta: number): [number, number, number] {
  const sqrt3 = Math.sqrt(3);
  const sqrt6 = Math.sqrt(6);
  const sqrt2 = Math.sqrt(2);
  return [
    L / sqrt3 + alpha / sqrt6 + beta / sqrt2,
    L / sqrt3 + alpha / sqrt6 - beta / sqrt2,
    L / sqrt3 - (2 * alpha) / sqrt6,
  ];
}

function pixelToLAB(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r, g, b);
  const [l, m, s] = xyzToLms(x, y, z);
  return lmsToLAlphaBeta(
    Math.log10(Math.max(EPSILON, l)),
    Math.log10(Math.max(EPSILON, m)),
    Math.log10(Math.max(EPSILON, s)),
  );
}

function toLAB(data: Uint8ClampedArray, count: number): { L: number[]; A: number[]; B: number[] } {
  const L: number[] = [];
  const A: number[] = [];
  const B: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = i * 4;
    const [lL, a, b] = pixelToLAB(data[idx], data[idx + 1], data[idx + 2]);
    L.push(lL);
    A.push(a);
    B.push(b);
  }
  return { L, A, B };
}

function computeStats(arr: number[]): { mean: number; std: number } {
  const n = arr.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += arr[i];
  const mean = sum / n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (arr[i] - mean) ** 2;
  return { mean, std: Math.sqrt(variance / n) || 1 };
}

function computeHistogram(arr: number[], bins: number = 256): { hist: number[]; min: number; max: number } {
  let min = Infinity, max = -Infinity;
  for (const v of arr) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  const hist = new Array(bins).fill(0);
  for (const v of arr) {
    const bin = Math.min(bins - 1, Math.floor(((v - min) / range) * bins));
    hist[bin]++;
  }
  return { hist, min, max };
}

function computeCDF(hist: number[]): number[] {
  const cdf = new Array(hist.length);
  cdf[0] = hist[0];
  for (let i = 1; i < hist.length; i++) cdf[i] = cdf[i - 1] + hist[i];
  const total = cdf[cdf.length - 1];
  for (let i = 0; i < cdf.length; i++) cdf[i] /= total;
  return cdf;
}

function matchHistogram(srcValues: number[], tgtValues: number[]): number[] {
  const bins = 256;
  const srcStats = computeHistogram(srcValues, bins);
  const tgtStats = computeHistogram(tgtValues, bins);
  const srcCDF = computeCDF(srcStats.hist);
  const tgtCDF = computeCDF(tgtStats.hist);

  const mapping = new Array(bins);
  for (let i = 0; i < bins; i++) {
    let bestJ = 0;
    let bestDiff = Infinity;
    for (let j = 0; j < bins; j++) {
      const diff = Math.abs(srcCDF[i] - tgtCDF[j]);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestJ = j;
      }
    }
    mapping[i] = bestJ;
  }

  const srcRange = srcStats.max - srcStats.min || 1;
  return srcValues.map((v) => {
    const bin = Math.min(bins - 1, Math.floor(((v - srcStats.min) / srcRange) * bins));
    return tgtStats.min + (mapping[bin] / (bins - 1)) * (tgtStats.max - tgtStats.min);
  });
}

function detectGrayscaleLevel(data: Uint8ClampedArray, count: number): { isMostlyGray: boolean; saturationAvg: number } {
  let totalSat = 0;
  for (let i = 0; i < count; i++) {
    const idx = i * 4;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    totalSat += max === 0 ? 0 : (max - min) / max;
  }
  const saturationAvg = totalSat / count;
  return { isMostlyGray: saturationAvg < 0.05, saturationAvg };
}

function applyReinhardTransfer(
  tgtData: ImageData,
  paletteRgbs: { r: number; g: number; b: number }[],
  intensity: number,
): ImageData {
  const tw = tgtData.width;
  const th = tgtData.height;
  const td = tgtData.data;
  const tn = tw * th;

  const palA: number[] = [];
  const palB: number[] = [];
  for (const rgb of paletteRgbs) {
    const [, a, b] = pixelToLAB(rgb.r, rgb.g, rgb.b);
    palA.push(a);
    palB.push(b);
  }
  const pA = computeStats(palA);
  const pB = computeStats(palB);

  const tgt = toLAB(td, tn);
  const tA = computeStats(tgt.A);
  const tB = computeStats(tgt.B);

  const result = new ImageData(tw, th);
  const rd = result.data;

  for (let i = 0; i < tn; i++) {
    const idx = i * 4;
    const origR = td[idx];
    const origG = td[idx + 1];
    const origB = td[idx + 2];

    if (origR === 0 && origG === 0 && origB === 0) {
      rd[idx] = 0; rd[idx + 1] = 0; rd[idx + 2] = 0; rd[idx + 3] = td[idx + 3];
      continue;
    }
    if (origR === 255 && origG === 255 && origB === 255) {
      rd[idx] = 255; rd[idx + 1] = 255; rd[idx + 2] = 255; rd[idx + 3] = td[idx + 3];
      continue;
    }

    const mappedA = (tgt.A[i] - tA.mean) / tA.std * pA.std + pA.mean;
    const mappedB = (tgt.B[i] - tB.mean) / tB.std * pB.std + pB.mean;

    const finalA = tgt.A[i] + (mappedA - tgt.A[i]) * intensity;
    const finalB = tgt.B[i] + (mappedB - tgt.B[i]) * intensity;

    const [l, m, s] = lAlphaBetaToLms(tgt.L[i], finalA, finalB);
    const [x, y, z] = lmsToXyz(Math.pow(10, l), Math.pow(10, m), Math.pow(10, s));
    const [r, g, b] = xyzToRgb(x, y, z);

    rd[idx] = Math.max(0, Math.min(255, r));
    rd[idx + 1] = Math.max(0, Math.min(255, g));
    rd[idx + 2] = Math.max(0, Math.min(255, b));
    rd[idx + 3] = td[idx + 3];
  }

  return result;
}

function applyHistogramTransfer(
  tgtData: ImageData,
  paletteRgbs: { r: number; g: number; b: number }[],
  intensity: number,
): ImageData {
  const tw = tgtData.width;
  const th = tgtData.height;
  const td = tgtData.data;
  const tn = tw * th;

  const palA: number[] = [];
  const palB: number[] = [];
  for (const rgb of paletteRgbs) {
    const [, a, b] = pixelToLAB(rgb.r, rgb.g, rgb.b);
    palA.push(a);
    palB.push(b);
  }

  const tgt = toLAB(td, tn);

  const matchedA = matchHistogram(tgt.A, palA);
  const matchedB = matchHistogram(tgt.B, palB);

  const result = new ImageData(tw, th);
  const rd = result.data;

  for (let i = 0; i < tn; i++) {
    const idx = i * 4;
    const origR = td[idx];
    const origG = td[idx + 1];
    const origB = td[idx + 2];

    if (origR === 0 && origG === 0 && origB === 0) {
      rd[idx] = 0; rd[idx + 1] = 0; rd[idx + 2] = 0; rd[idx + 3] = td[idx + 3];
      continue;
    }
    if (origR === 255 && origG === 255 && origB === 255) {
      rd[idx] = 255; rd[idx + 1] = 255; rd[idx + 2] = 255; rd[idx + 3] = td[idx + 3];
      continue;
    }

    const finalA = tgt.A[i] + (matchedA[i] - tgt.A[i]) * intensity;
    const finalB = tgt.B[i] + (matchedB[i] - tgt.B[i]) * intensity;

    const [l, m, s] = lAlphaBetaToLms(tgt.L[i], finalA, finalB);
    const [x, y, z] = lmsToXyz(Math.pow(10, l), Math.pow(10, m), Math.pow(10, s));
    const [r, g, b] = xyzToRgb(x, y, z);

    rd[idx] = Math.max(0, Math.min(255, r));
    rd[idx + 1] = Math.max(0, Math.min(255, g));
    rd[idx + 2] = Math.max(0, Math.min(255, b));
    rd[idx + 3] = td[idx + 3];
  }

  return result;
}

function loadImageToData(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = reject;
    img.src = src;
  });
}

export default function TransferPanel() {
  const { sourceImage, targetImage, processedImageUrl, setProcessedImageUrl } = useImageStore();
  const { colors } = usePaletteStore();
  const { toast } = useToast();
  const [intensity, setIntensity] = useState(1.0);
  const [processing, setProcessing] = useState(false);
  const [algorithm, setAlgorithm] = useState<TransferAlgorithm>('reinhard');
  const [grayscaleWarning, setGrayscaleWarning] = useState(false);
  const autoAppliedRef = useRef(false);

  const imageToApply = targetImage || sourceImage;

  useEffect(() => {
    if (imageToApply) {
      loadImageToData(imageToApply.dataUrl).then((imgData) => {
        const { isMostlyGray } = detectGrayscaleLevel(imgData.data, imgData.width * imgData.height);
        setGrayscaleWarning(isMostlyGray);
      }).catch(() => {});
    } else {
      setGrayscaleWarning(false);
    }
  }, [imageToApply]);

  const runTransfer = useCallback(async () => {
    if (!imageToApply || colors.length === 0) return;
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const imgData = await loadImageToData(imageToApply.dataUrl);
      const paletteRgbs = colors.map((c) => hexToRgb(c.hex));
      const result = algorithm === 'histogram'
        ? applyHistogramTransfer(imgData, paletteRgbs, intensity)
        : applyReinhardTransfer(imgData, paletteRgbs, intensity);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = result.width;
      outCanvas.height = result.height;
      const outCtx = outCanvas.getContext('2d')!;
      outCtx.putImageData(result, 0, 0);
      setProcessedImageUrl(outCanvas.toDataURL('image/png'), 'target');
    } catch (err) {
      console.error('配色迁移失败:', err);
      toast('配色迁移处理失败', 'error');
    } finally {
      setProcessing(false);
    }
  }, [imageToApply, colors, intensity, algorithm, setProcessedImageUrl, toast]);

  useEffect(() => {
    if (imageToApply && colors.length > 0 && processedImageUrl && autoAppliedRef.current) {
      runTransfer();
    }
  }, [intensity, algorithm]);

  const handleApply = useCallback(() => {
    autoAppliedRef.current = true;
    runTransfer();
  }, [runTransfer]);

  if (!imageToApply) {
    return (
      <div className="text-center text-text-muted py-8 text-xs space-y-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-40">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
        </svg>
        <div>请先上传一张图片</div>
        <div className="text-[10px] opacity-60">支持源图或目标图</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-text-muted leading-relaxed">
        将配色方案的颜色风格应用到图片上，保持原始亮度和明暗关系不变。
      </div>

      {grayscaleWarning && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-[10px] text-yellow-400 flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>目标图色彩信息较少，迁移效果可能不明显</span>
        </div>
      )}

      {processedImageUrl && (
        <div className="rounded-lg overflow-hidden border border-border">
          <img src={processedImageUrl} alt="迁移结果" className="w-full" />
        </div>
      )}

      <div>
        <div className="text-[10px] text-text-muted mb-1">迁移算法</div>
        <div className="flex gap-2">
          {([
            { key: 'reinhard' as const, label: '快速模式', desc: 'Reinhard 均值标准差匹配' },
            { key: 'histogram' as const, label: '精确模式', desc: '直方图匹配' },
          ]).map((algo) => (
            <button
              key={algo.key}
              onClick={() => setAlgorithm(algo.key)}
              className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                algorithm === algo.key
                  ? 'border-primary bg-primary/10 text-text-primary'
                  : 'border-border bg-surface-hover/50 text-text-secondary hover:border-border-hover'
              }`}
            >
              <div>{algo.label}</div>
              <div className="text-[9px] text-text-muted mt-0.5">{algo.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-hover/50 rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">迁移强度</span>
          <span className="text-[10px] font-mono text-text-secondary">{Math.round(intensity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={intensity}
          onChange={(e) => setIntensity(parseFloat(e.target.value))}
          className="slider w-full"
        />
        <div className="flex justify-between text-[9px] text-text-muted">
          <span>0% 原图</span>
          <span>100% 完全迁移</span>
        </div>
      </div>

      <button
        onClick={handleApply}
        disabled={!imageToApply || colors.length === 0 || processing}
        className="btn-primary w-full text-xs disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {processing ? '处理中...' : `应用配色方案${colors.length > 0 ? `（${colors.length}色）` : ''}`}
      </button>

      {colors.length === 0 && (
        <div className="text-[10px] text-text-muted text-center bg-surface-hover/30 rounded-lg p-2">
          当前配色方案为空，请先使用「配色提取」或「色轮编辑」
        </div>
      )}

      {processedImageUrl && (
        <a
          href={processedImageUrl}
          download="color-transfer-result.png"
          className="btn-ghost w-full text-xs block text-center"
        >
          下载结果
        </a>
      )}
    </div>
  );
}
