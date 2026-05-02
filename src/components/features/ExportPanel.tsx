import { useState, useCallback } from 'react';
import { usePaletteStore } from '../../stores/paletteStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { useImageStore } from '../../stores/imageStore';
import { exportAsCss, exportAsTailwind, exportAsJson, exportAsSvg, downloadFile } from '../../utils/exportUtils';
import { useToast } from '../ui/Toast';
import type { Color, ExportFormat } from '../../types';

const FORMAT_OPTIONS: { key: ExportFormat; label: string; desc: string }[] = [
  { key: 'css', label: 'CSS 变量', desc: ':root { --color-1: #hex }' },
  { key: 'tailwind', label: 'Tailwind', desc: 'colors: { primary: "#hex" }' },
  { key: 'json', label: 'JSON', desc: '[{ "hex": "#hex" }]' },
  { key: 'svg', label: 'SVG 色块', desc: '可视化色板卡片' },
];

function getExportContent(colors: Color[], format: ExportFormat): string {
  switch (format) {
    case 'css': return exportAsCss(colors);
    case 'tailwind': return exportAsTailwind(colors);
    case 'json': return exportAsJson(colors);
    case 'svg': return exportAsSvg(colors);
  }
}

export default function ExportPanel() {
  const { colors } = usePaletteStore();
  const { palettes } = useCollectionStore();
  const { processedImageUrl } = useImageStore();
  const { toast } = useToast();
  const [format, setFormat] = useState<ExportFormat>('css');
  const [imageFormat, setImageFormat] = useState<'png' | 'webp'>('png');
  const [imageQuality, setImageQuality] = useState(92);
  const [preview, setPreview] = useState('');

  const handlePreview = useCallback(() => {
    if (colors.length === 0) {
      toast('配色方案为空', 'error');
      return;
    }
    const content = getExportContent(colors, format);
    setPreview(content);
  }, [colors, format, toast]);

  const handleCopy = useCallback(async () => {
    if (!preview) {
      handlePreview();
      return;
    }
    try {
      await navigator.clipboard.writeText(preview);
      toast('已复制到剪贴板', 'success');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = preview;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast('已复制到剪贴板', 'success');
    }
  }, [preview, handlePreview, toast]);

  const handleDownload = useCallback(() => {
    if (colors.length === 0) {
      toast('配色方案为空', 'error');
      return;
    }

    const content = getExportContent(colors, format);
    const filename = format === 'svg' ? 'palette.svg' : `palette.${format === 'tailwind' ? 'js' : format}`;
    const mimeType = format === 'svg' ? 'image/svg+xml' : format === 'json' ? 'application/json' : 'text/plain';

    downloadFile(content, filename, mimeType);
    toast(`已导出 ${filename}`, 'success');
  }, [colors, format, toast]);

  const handleImageExport = useCallback(() => {
    if (!processedImageUrl) {
      toast('没有可导出的图片', 'error');
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const mimeType = imageFormat === 'webp' ? 'image/webp' : 'image/png';
      const quality = imageFormat === 'webp' ? imageQuality / 100 : undefined;
      const dataUrl = canvas.toDataURL(mimeType, quality);

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `processed-image.${imageFormat}`;
      a.click();
      toast(`已导出 ${imageFormat.toUpperCase()} 图片`, 'success');
    };
    img.src = processedImageUrl;
  }, [processedImageUrl, imageFormat, imageQuality, toast]);

  const handleBatchExport = useCallback(() => {
    if (palettes.length === 0) {
      toast('收藏夹为空', 'error');
      return;
    }

    const allData = palettes.map((pal) => ({
      id: pal.id,
      name: pal.name,
      colors: pal.colors,
      tags: pal.tags,
      exportedAt: new Date().toISOString(),
    }));

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-palettes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`已导出 ${palettes.length} 个收藏方案`, 'success');
  }, [palettes, toast]);

  return (
    <div className="space-y-4">
      <div className="text-xs text-text-muted leading-relaxed">
        将当前配色方案导出为代码或图片，支持多种格式和批量导出。
      </div>

      <div>
        <div className="text-[10px] text-text-muted mb-1.5">配色导出格式</div>
        <div className="grid grid-cols-2 gap-1.5">
          {FORMAT_OPTIONS.map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => { setFormat(key); setPreview(''); }}
              className={`text-left p-2 rounded-lg border transition-all ${
                format === key
                  ? 'border-primary bg-primary/10 text-text-primary'
                  : 'border-border bg-surface-hover/50 text-text-secondary hover:border-border-hover'
              }`}
            >
              <div className="text-xs">{label}</div>
              <div className="text-[9px] text-text-muted font-mono truncate">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handlePreview} className="btn-secondary flex-1 text-xs">
          预览
        </button>
        <button onClick={handleCopy} className="btn-ghost flex-1 text-xs">
          复制
        </button>
        <button onClick={handleDownload} className="btn-primary flex-1 text-xs">
          下载
        </button>
      </div>

      {preview && (
        <div className="rounded-lg bg-background/80 border border-border p-3 max-h-48 overflow-auto">
          <pre className="text-[10px] font-mono text-text-secondary whitespace-pre-wrap break-all leading-relaxed">
            {preview}
          </pre>
        </div>
      )}

      <div className="border-t border-border pt-3 space-y-2">
        <div className="text-[10px] text-text-muted font-medium">图片导出</div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['png', 'webp'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setImageFormat(fmt)}
                className={`text-[10px] px-3 py-1.5 rounded-md transition-colors ${
                  imageFormat === fmt
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-text-muted hover:text-text-secondary border border-border'
                }`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
          {imageFormat === 'webp' && (
            <div className="flex items-center gap-1 flex-1">
              <span className="text-[10px] text-text-muted">质量</span>
              <input
                type="range"
                min={10}
                max={100}
                value={imageQuality}
                onChange={(e) => setImageQuality(+e.target.value)}
                className="slider flex-1"
              />
              <span className="text-[10px] font-mono text-text-muted w-8">{imageQuality}%</span>
            </div>
          )}
        </div>
        <button
          onClick={handleImageExport}
          disabled={!processedImageUrl}
          className="btn-ghost w-full text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {processedImageUrl ? '导出处理后图片' : '暂无可导出的图片'}
        </button>
      </div>

      {palettes.length > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-muted font-medium">批量导出收藏</span>
            <span className="text-[10px] text-text-muted">{palettes.length} 个方案</span>
          </div>
          <button onClick={handleBatchExport} className="btn-ghost w-full text-xs">
            导出全部收藏（JSON）
          </button>
        </div>
      )}

      {colors.length === 0 && (
        <div className="text-[10px] text-text-muted text-center bg-surface-hover/30 rounded-lg p-2">
          当前配色方案为空
        </div>
      )}
    </div>
  );
}
