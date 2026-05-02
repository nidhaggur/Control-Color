import { useState, useCallback } from 'react';
import { useImageStore } from '../../stores/imageStore';
import { applyGrayscale, canvasToDataUrl, canvasToImageData, imageDataToCanvas, imageToCanvas, loadImage } from '../../utils/imageUtils';
import { useToast } from '../ui/Toast';

type GrayscaleMethod = 'average' | 'weighted' | 'desaturate';

export default function GrayscalePanel() {
  const { sourceImage, processedImageUrl, setProcessedImageUrl, revertProcessed } = useImageStore();
  const { toast } = useToast();
  const [method, setMethod] = useState<GrayscaleMethod>('weighted');

  const apply = useCallback(async () => {
    if (!sourceImage) return;
    try {
      const img = await loadImage(sourceImage.dataUrl);
      const canvas = imageToCanvas(img);
      const imageData = canvasToImageData(canvas);
      const result = applyGrayscale(imageData, method);
      const resultCanvas = imageDataToCanvas(result);
      setProcessedImageUrl(canvasToDataUrl(resultCanvas));
      toast('灰阶处理完成', 'success');
    } catch {
      toast('处理失败', 'error');
    }
  }, [sourceImage, method, setProcessedImageUrl, toast]);

  const handleExport = () => {
    if (!processedImageUrl) return;
    const a = document.createElement('a');
    a.href = processedImageUrl;
    a.download = 'grayscale.png';
    a.click();
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-text-primary">灰阶工具</h3>

      {!sourceImage && (
        <div className="text-xs text-text-muted bg-surface-hover rounded-md p-3">
          请先在左侧上传源图
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-text-secondary">转换方式</label>
        {(['average', 'weighted', 'desaturate'] as GrayscaleMethod[]).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`w-full text-xs py-2 px-3 rounded-md text-left transition-colors ${
              method === m ? 'bg-primary/10 border border-primary/30 text-text-primary' : 'bg-surface hover:bg-surface-hover text-text-secondary'
            }`}
          >
            {m === 'average' && '平均值法 (R+G+B)/3'}
            {m === 'weighted' && '加权法 (0.299R + 0.587G + 0.114B)'}
            {m === 'desaturate' && '去饱和法 (max+min)/2'}
          </button>
        ))}
      </div>

      <button
        onClick={apply}
        disabled={!sourceImage}
        className="btn-primary text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        应用灰阶
      </button>

      {processedImageUrl && (
        <div className="space-y-2">
          <img src={processedImageUrl} alt="灰阶结果" className="w-full rounded-md" />
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-ghost flex-1 text-xs">
              导出图片
            </button>
            <button
              onClick={revertProcessed}
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
