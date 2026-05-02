import { useState, useCallback } from 'react';
import { useImageStore } from '../../stores/imageStore';
import { useToast } from '../ui/Toast';

export default function ImagePreprocessPanel() {
  const { sourceImage, processedImageUrl, setProcessedImageUrl, revertProcessed } = useImageStore();
  const { toast } = useToast();

  const currentUrl = processedImageUrl || sourceImage?.dataUrl;

  const processImage = useCallback(async (
    operation: 'rotate-cw' | 'rotate-ccw' | 'flip-h' | 'flip-v' | 'crop',
  ) => {
    if (!sourceImage) return;

    try {
      const img = new Image();
      img.src = processedImageUrl || sourceImage.dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      if (operation === 'rotate-cw' || operation === 'rotate-ccw') {
        canvas.width = img.height;
        canvas.height = img.width;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((operation === 'rotate-cw' ? 90 : -90) * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
      } else if (operation === 'crop') {
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
        if (operation === 'flip-h') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        } else {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }
        ctx.drawImage(img, 0, 0);
      }

      setProcessedImageUrl(canvas.toDataURL('image/png'));
      toast('图像处理完成', 'success');
    } catch {
      toast('图像处理失败', 'error');
    }
  }, [sourceImage, processedImageUrl, setProcessedImageUrl, toast]);

  const handleReset = useCallback(() => {
    setProcessedImageUrl(null);
    toast('已重置为原图', 'info');
  }, [setProcessedImageUrl, toast]);

  const handleDownload = useCallback(() => {
    if (!currentUrl) return;
    const a = document.createElement('a');
    a.href = currentUrl;
    a.download = 'processed-image.png';
    a.click();
    toast('已下载处理后的图片', 'success');
  }, [currentUrl, toast]);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-text-primary">图像预处理</h3>

      {!sourceImage ? (
        <div className="text-xs text-text-muted bg-surface-hover rounded-md p-3">
          请先在左侧上传源图
        </div>
      ) : (
        <>
          <div className="relative rounded-lg overflow-hidden border border-border bg-background/50">
            <img
              src={currentUrl}
              alt="预览"
              className="w-full h-auto max-h-48 object-contain"
            />
            {processedImageUrl && (
              <div className="absolute top-1 right-1 bg-primary/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                已修改
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => processImage('rotate-ccw')} className="btn-secondary text-xs">
              ↺ 左旋90°
            </button>
            <button onClick={() => processImage('rotate-cw')} className="btn-secondary text-xs">
              ↻ 右旋90°
            </button>
            <button onClick={() => processImage('flip-h')} className="btn-secondary text-xs">
              ↔ 水平翻转
            </button>
            <button onClick={() => processImage('flip-v')} className="btn-secondary text-xs">
              ↕ 垂直翻转
            </button>
          </div>

          <button onClick={() => processImage('crop')} className="btn-secondary text-xs w-full">
            裁剪为正方形（居中）
          </button>

          <div className="flex gap-2">
            {processedImageUrl && (
              <button onClick={handleReset} className="btn-ghost text-xs flex-1">
                重置
              </button>
            )}
            <button onClick={handleDownload} className="btn-primary text-xs flex-1">
              下载图片
            </button>
          </div>
        </>
      )}
    </div>
  );
}
