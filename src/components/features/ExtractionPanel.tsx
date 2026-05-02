import { useState, useCallback, useRef } from 'react';
import { useImageStore } from '../../stores/imageStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { useToast } from '../ui/Toast';
import { rgbToHex, rgbToHsl, rgbToOklch, formatRgb, formatHsl } from '../../utils/colorUtils';
import { getRecommendations } from '../../utils/recommendationUtils';
import { loadImageFromFile } from '../../utils/imageUtils';
import type { Color } from '../../types';

function kMeansClustering(pixels: Uint8ClampedArray, k: number, maxIter = 20): { centers: number[][]; counts: number[] } {
  const n = pixels.length / 4;
  const centers: number[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < k; i++) {
    let idx: number;
    do { idx = Math.floor(Math.random() * n); } while (used.has(idx));
    used.add(idx);
    const p = idx * 4;
    centers.push([pixels[p], pixels[p + 1], pixels[p + 2]]);
  }

  const assignments = new Int32Array(n);

  for (let iter = 0; iter < maxIter; iter++) {
    for (let i = 0; i < n; i++) {
      const p = i * 4;
      let minDist = Infinity;
      let minIdx = 0;
      for (let c = 0; c < k; c++) {
        const dr = pixels[p] - centers[c][0];
        const dg = pixels[p + 1] - centers[c][1];
        const db = pixels[p + 2] - centers[c][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) { minDist = dist; minIdx = c; }
      }
      assignments[i] = minIdx;
    }

    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Array(k).fill(0);

    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      const p = i * 4;
      sums[c][0] += pixels[p];
      sums[c][1] += pixels[p + 1];
      sums[c][2] += pixels[p + 2];
      counts[c]++;
    }

    let converged = true;
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      const nr = sums[c][0] / counts[c];
      const ng = sums[c][1] / counts[c];
      const nb = sums[c][2] / counts[c];
      if (Math.abs(nr - centers[c][0]) > 1 || Math.abs(ng - centers[c][1]) > 1 || Math.abs(nb - centers[c][2]) > 1) {
        converged = false;
      }
      centers[c] = [nr, ng, nb];
    }
    if (converged) break;
  }

  const finalCounts = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    finalCounts[assignments[i]]++;
  }

  return { centers, counts: finalCounts };
}

function medianCut(pixels: Uint8ClampedArray, k: number): { colors: number[][]; counts: number[] } {
  const n = pixels.length / 4;
  const colorData: { r: number; g: number; b: number; idx: number }[] = [];

  for (let i = 0; i < n; i++) {
    const p = i * 4;
    colorData.push({ r: pixels[p], g: pixels[p + 1], b: pixels[p + 2], idx: i });
  }

  const buckets = [colorData];

  while (buckets.length < k) {
    let maxRange = -1;
    let maxIdx = 0;

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
      for (const c of bucket) {
        rMin = Math.min(rMin, c.r); rMax = Math.max(rMax, c.r);
        gMin = Math.min(gMin, c.g); gMax = Math.max(gMax, c.g);
        bMin = Math.min(bMin, c.b); bMax = Math.max(bMax, c.b);
      }
      const range = Math.max(rMax - rMin, gMax - gMin, bMax - bMin);
      if (range > maxRange) { maxRange = range; maxIdx = i; }
    }

    const bucket = buckets[maxIdx];
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (const c of bucket) {
      rMin = Math.min(rMin, c.r); rMax = Math.max(rMax, c.r);
      gMin = Math.min(gMin, c.g); gMax = Math.max(gMax, c.g);
      bMin = Math.min(bMin, c.b); bMax = Math.max(bMax, c.b);
    }

    const rRange = rMax - rMin;
    const gRange = gMax - gMin;
    const bRange = bMax - bMin;

    let sortKey: 'r' | 'g' | 'b' = 'r';
    if (gRange >= rRange && gRange >= bRange) sortKey = 'g';
    else if (bRange >= rRange && bRange >= gRange) sortKey = 'b';

    bucket.sort((a, b) => a[sortKey] - b[sortKey]);
    const mid = Math.floor(bucket.length / 2);
    buckets.splice(maxIdx, 1, bucket.slice(0, mid), bucket.slice(mid));
  }

  const colors = buckets.map((bucket) => {
    const sum = bucket.reduce(
      (acc, c) => [acc[0] + c.r, acc[1] + c.g, acc[2] + c.b] as [number, number, number],
      [0, 0, 0] as [number, number, number]
    );
    return [sum[0] / bucket.length, sum[1] / bucket.length, sum[2] / bucket.length];
  });

  const counts = buckets.map((b) => b.length);

  return { colors, counts };
}

type ColorFormat = 'hex' | 'rgb' | 'hsl';

function formatColorValue(color: Color, format: ColorFormat): string {
  switch (format) {
    case 'hex': return color.hex;
    case 'rgb': return formatRgb(color.rgb);
    case 'hsl': return formatHsl(color.hsl);
  }
}

function formatPercent(pct: number): string {
  if (pct < 1) return '<1';
  return String(pct);
}

function getSupplementColors(existing: Color[], count: number = 5): Color[] {
  if (existing.length === 0) return [];
  const recs = getRecommendations(existing, count, 'zh');
  return recs.map(r => r.color);
}

export default function ExtractionPanel() {
  const { sourceImage, setSourceImage } = useImageStore();
  const { setColors } = usePaletteStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [colorCount, setColorCount] = useState(6);
  const [algorithm, setAlgorithm] = useState<'kmeans' | 'median'>('kmeans');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ colors: Color[]; percentages: number[]; time: number } | null>(null);
  const [skipTransparent, setSkipTransparent] = useState(true);
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex');
  const [supplements, setSupplements] = useState<Color[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  const handleExtract = useCallback(() => {
    if (!sourceImage) {
      toast('请先上传图片', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        try {
          const startTime = performance.now();
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          const maxDim = 200;
          const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const allPixels = imageData.data;

          let pixels: Uint8ClampedArray;
          if (skipTransparent) {
            const filtered: number[] = [];
            for (let i = 0; i < allPixels.length; i += 4) {
              const a = allPixels[i + 3];
              if (a < 10) continue;
              const r = allPixels[i];
              const g = allPixels[i + 1];
              const b = allPixels[i + 2];
              if (r > 245 && g > 245 && b > 245 && a > 250) continue;
              filtered.push(r, g, b, a);
            }
            if (filtered.length === 0) {
              setLoading(false);
              setError('图片完全空白/透明，无法提取颜色');
              return;
            }
            pixels = new Uint8ClampedArray(filtered);
          } else {
            pixels = allPixels;
          }

          let extractedColors: Color[];
          let clusterCounts: number[];

          if (algorithm === 'kmeans') {
            const { centers, counts } = kMeansClustering(pixels, colorCount);
            clusterCounts = counts;
            extractedColors = centers.map((c) => {
              const r = Math.round(c[0]);
              const g = Math.round(c[1]);
              const b = Math.round(c[2]);
              return {
                hex: rgbToHex(r, g, b),
                rgb: { r, g, b },
                hsl: rgbToHsl(r, g, b),
                oklch: rgbToOklch(r, g, b),
              };
            });
          } else {
            const { colors: medColors, counts } = medianCut(pixels, colorCount);
            clusterCounts = counts;
            extractedColors = medColors.map((c) => {
              const r = Math.round(c[0]);
              const g = Math.round(c[1]);
              const b = Math.round(c[2]);
              return {
                hex: rgbToHex(r, g, b),
                rgb: { r, g, b },
                hsl: rgbToHsl(r, g, b),
                oklch: rgbToOklch(r, g, b),
              };
            });
          }

          const total = clusterCounts.reduce((s, c) => s + c, 0);
          const percentages = clusterCounts.map((c) => Math.round((c / total) * 100));

          const indexed = extractedColors.map((color, i) => ({ color, pct: percentages[i] }));
          indexed.sort((a, b) => b.pct - a.pct);

          const sortedColors = indexed.map(item => item.color);
          const sortedPcts = indexed.map(item => item.pct);

          const elapsed = Math.round(performance.now() - startTime);
          setResult({ colors: sortedColors, percentages: sortedPcts, time: elapsed });
          setSupplements([]);
          setLoading(false);
          toast(`已提取 ${sortedColors.length} 种颜色 (${elapsed}ms)`, 'success');
        } catch {
          setLoading(false);
          setError('颜色提取过程中出错，请重试');
        }
      };
      img.onerror = () => {
        setLoading(false);
        setError('图片加载失败，请尝试重新上传');
      };
      img.src = sourceImage.dataUrl;
    }, 50);
  }, [sourceImage, colorCount, algorithm, skipTransparent, toast]);

  const handleCopy = useCallback(async (color: Color, format: ColorFormat) => {
    const text = formatColorValue(color, format);
    try {
      await navigator.clipboard.writeText(text);
      toast(`已复制 ${text}`, 'success');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast(`已复制 ${text}`, 'success');
    }
  }, [toast]);

  const handleDelete = useCallback((index: number) => {
    if (!result) return;
    const newColors = result.colors.filter((_, i) => i !== index);
    const newPcts = result.percentages.filter((_, i) => i !== index);
    setResult({ ...result, colors: newColors, percentages: newPcts });
  }, [result]);

  const handleSupplement = useCallback(() => {
    if (!result || result.colors.length === 0) return;
    const sups = getSupplementColors(result.colors, 5);
    setSupplements(sups);
    if (sups.length > 0) {
      toast(`推荐了 ${sups.length} 个补充色`, 'info');
    }
  }, [result, toast]);

  const handleAddSupplement = useCallback((color: Color) => {
    if (!result) return;
    setResult({
      ...result,
      colors: [...result.colors, color],
      percentages: [...result.percentages, 0],
    });
    setSupplements(prev => prev.filter(c => c.hex !== color.hex));
    toast(`已添加 ${color.hex}`, 'success');
  }, [result, toast]);

  const handleApply = () => {
    if (result && result.colors.length > 0) {
      setColors(result.colors);
      toast('已应用到配色方案', 'success');
    }
  };

  const handleUrlLoad = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) {
      toast('请输入图片 URL', 'error');
      return;
    }

    try {
      new URL(url);
    } catch {
      toast('请输入有效的 URL 地址', 'error');
      return;
    }

    setUrlLoading(true);
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('不是图片文件');
      }
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(blob);
      });
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片解码失败'));
        img.src = dataUrl;
      });
      setSourceImage({
        id: `img-${Date.now()}-url`,
        dataUrl,
        width: img.width,
        height: img.height,
        name: url.split('/').pop() || 'url-image',
      });
      setUrlInput('');
      toast('URL 图片加载成功', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      if (msg.includes('Failed to fetch') || msg.includes('CORS') || msg.includes('NetworkError')) {
        toast('无法加载该图片（CORS 限制），请检查 URL 或尝试本地上传', 'error');
      } else {
        toast(`无法加载该图片：${msg}，请检查 URL 或尝试本地上传`, 'error');
      }
    } finally {
      setUrlLoading(false);
    }
  }, [urlInput, setSourceImage, toast]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast('仅支持 PNG / JPG / WebP 格式', 'error');
      return;
    }
    try {
      const img = await loadImageFromFile(file);
      setSourceImage(img);
      setError(null);
    } catch {
      toast('文件加载失败', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [setSourceImage, toast]);

  const handleRetry = useCallback(() => {
    setError(null);
    handleExtract();
  }, [handleExtract]);

  const hasColors = result && result.colors.length > 0;

  return (
    <div className="space-y-4">
      <div className="text-xs text-text-muted leading-relaxed">
        从图片中智能提取配色方案。支持 K-Means 聚类和中位切分两种算法，自动识别图片中的主要颜色。
      </div>

      {!sourceImage && (
        <div className="space-y-3">
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center space-y-3">
            <div className="text-text-muted text-xs">拖拽图片到左侧源图区域，或通过以下方式上传</div>
            <button onClick={() => fileInputRef.current?.click()} className="btn-primary text-xs px-4 py-1.5">
              选择本地文件
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} />
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-text-muted">或输入图片 URL</div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlLoad()}
                placeholder="https://example.com/image.jpg"
                className="flex-1 input text-xs"
                disabled={urlLoading}
              />
              <button onClick={handleUrlLoad} disabled={urlLoading} className="btn-ghost text-xs px-3 shrink-0">
                {urlLoading ? '...' : '加载'}
              </button>
            </div>
            <div className="text-[10px] text-text-muted/70">
              提示：部分网站可能因 CORS 限制无法直接加载
            </div>
          </div>

          <div className="text-[10px] text-text-muted text-center">
            支持 Ctrl+V 粘贴剪贴板中的图片
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center space-y-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-red-400">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="text-xs text-red-400">{error}</div>
          <div className="flex gap-2 justify-center">
            <button onClick={handleRetry} className="btn-primary text-xs px-4 py-1.5">重新提取</button>
            <button onClick={() => { setError(null); setSourceImage(null); }} className="btn-ghost text-xs px-4 py-1.5">重新上传</button>
          </div>
        </div>
      )}

      {sourceImage && !error && (
        <>
          <div className="rounded-lg overflow-hidden border border-border mb-3">
            <img src={sourceImage.dataUrl} alt="源图" className="w-full h-32 object-cover" />
            <div className="flex items-center justify-between px-2 py-1.5 bg-surface-hover/50 text-[10px] text-text-muted">
              <span>{sourceImage.width}×{sourceImage.height}px</span>
              <button onClick={() => setSourceImage(null)} className="text-text-muted hover:text-red-400 transition-colors">更换图片</button>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-text-muted mb-1">提取算法</div>
            <div className="flex gap-2">
              {(['kmeans', 'median'] as const).map((algo) => (
                <button
                  key={algo}
                  onClick={() => setAlgorithm(algo)}
                  className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                    algorithm === algo
                      ? 'border-primary bg-primary/10 text-text-primary'
                      : 'border-border bg-surface-hover/50 text-text-secondary hover:border-border-hover'
                  }`}
                >
                  {algo === 'kmeans' ? 'K-Means 聚类' : '中位切分'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-text-muted mb-1">
              <span>提取颜色数量</span>
              <span className="text-text-secondary">{colorCount}</span>
            </div>
            <input
              type="range"
              min={3}
              max={12}
              value={colorCount}
              onChange={(e) => setColorCount(Number(e.target.value))}
              className="slider w-full"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setSkipTransparent((v) => !v)}
              className={`relative w-8 h-[18px] rounded-full transition-colors ${
                skipTransparent ? 'bg-primary' : 'bg-surface-hover'
              }`}
            >
              <div
                className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                  skipTransparent ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-xs text-text-secondary">忽略空白/透明像素</span>
          </label>

          <button onClick={handleExtract} disabled={loading} className="btn-primary w-full text-xs py-2">
            {loading ? '提取中...' : '开始提取'}
          </button>
        </>
      )}

      {hasColors && (
        <>
          <div className="flex gap-1.5 h-10">
            {result!.colors.map((color, i) => (
              <div
                key={`${color.hex}-${i}`}
                className="flex-1 rounded-lg shadow-sm relative group cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: color.hex }}
                onClick={() => handleCopy(color, colorFormat)}
                title={`点击复制 · ${color.hex} · ${formatPercent(result!.percentages[i])}%`}
              >
                {result!.percentages[i] > 0 && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[8px] text-center py-0.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatPercent(result!.percentages[i])}%
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-text-muted mr-1">显示格式</span>
            {(['hex', 'rgb', 'hsl'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setColorFormat(fmt)}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                  colorFormat === fmt
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {result!.colors.map((color, i) => (
              <div
                key={`${color.hex}-${i}`}
                className="flex items-center gap-2 text-xs group"
              >
                <div
                  className="w-5 h-5 rounded border border-border/50 shadow-sm shrink-0 cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.hex }}
                  onClick={() => handleCopy(color, colorFormat)}
                  title="点击复制"
                />
                <span
                  className="font-mono text-text-secondary cursor-pointer hover:text-text-primary transition-colors min-w-0 truncate"
                  onClick={() => handleCopy(color, colorFormat)}
                  title="点击复制"
                >
                  {formatColorValue(color, colorFormat)}
                </span>
                {result!.percentages[i] > 0 && (
                  <>
                    <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden min-w-[40px]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(result!.percentages[i], 1)}%`, backgroundColor: color.hex }}
                      />
                    </div>
                    <span className="text-text-muted text-[10px] w-8 text-right shrink-0">{formatPercent(result!.percentages[i])}%</span>
                  </>
                )}
                <button
                  onClick={() => handleDelete(i)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all p-0.5 shrink-0"
                  title="删除此颜色"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-text-muted text-center">
            提取耗时 {result!.time}ms · {sourceImage?.width}×{sourceImage?.height}px · 点击色块或色值可复制
          </div>

          <div className="flex gap-2">
            <button onClick={handleApply} className="btn-primary flex-1 text-xs py-2">
              应用到配色方案
            </button>
            <button onClick={handleSupplement} className="btn-ghost flex-1 text-xs py-2" title="基于已有配色推荐缺失色彩">
              补充推荐色
            </button>
          </div>

          {supplements.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] text-text-muted">推荐补充颜色（点击添加）</div>
              <div className="grid grid-cols-5 gap-1.5">
                {supplements.map((color) => (
                  <div
                    key={color.hex}
                    className="group cursor-pointer"
                    onClick={() => handleAddSupplement(color)}
                  >
                    <div
                      className="h-8 rounded-md border border-border/30 transition-transform group-hover:scale-105 group-hover:border-primary/50"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="text-[9px] font-mono text-text-muted text-center mt-0.5 truncate group-hover:text-text-secondary">
                      {color.hex}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-text-muted/70 text-center">
                基于色彩理论分析，推荐互补色、类似色等缺失色彩
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
