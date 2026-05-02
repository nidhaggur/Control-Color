import { useState, useCallback, useEffect, useRef } from 'react';
import { useImageStore } from '../../stores/imageStore';
import { useHistoryStore } from '../../stores/historyStore';
import { applyChannelIsolation, applyChannelIntensity, applyChannelSwap, applyChannelMix, canvasToDataUrl, canvasToImageData, imageDataToCanvas, imageToCanvas, loadImage } from '../../utils/imageUtils';
import { useToast } from '../ui/Toast';
import type { ChannelType } from '../../types';

type ChannelMode = 'isolate' | 'intensity' | 'mix' | 'swap';

export default function ChannelPanel() {
  const { sourceImage, processedImageUrl, setProcessedImageUrl, revertProcessed } = useImageStore();
  const { pushEntry } = useHistoryStore();
  const { toast } = useToast();
  const [channel, setChannel] = useState<ChannelType>('r');
  const [mode, setMode] = useState<ChannelMode>('isolate');
  const [intensity, setIntensity] = useState({ r: 100, g: 100, b: 100 });
  const [mixWeights, setMixWeights] = useState({ r: 100, g: 100, b: 100 });
  const [swapMap, setSwapMap] = useState<{ r: 'r' | 'g' | 'b'; g: 'r' | 'g' | 'b'; b: 'r' | 'g' | 'b' }>({ r: 'r', g: 'g', b: 'b' });
  const autoAppliedRef = useRef(false);

  const apply = useCallback(async () => {
    if (!sourceImage) return;
    try {
      const img = await loadImage(sourceImage.dataUrl);
      const canvas = imageToCanvas(img);
      const imageData = canvasToImageData(canvas);
      let result: ImageData;

      switch (mode) {
        case 'isolate':
          result = applyChannelIsolation(imageData, channel);
          break;
        case 'intensity':
          result = applyChannelIntensity(imageData, intensity);
          break;
        case 'mix':
          result = applyChannelMix(imageData, mixWeights);
          break;
        case 'swap':
          result = applyChannelSwap(imageData, swapMap);
          break;
      }

      const resultCanvas = imageDataToCanvas(result);
      setProcessedImageUrl(canvasToDataUrl(resultCanvas));
      const modeLabels: Record<ChannelMode, string> = {
        isolate: `分离 ${channel.toUpperCase()}通道`,
        intensity: `强度 ${intensity.r}/${intensity.g}/${intensity.b}%`,
        mix: `混合 ${mixWeights.r}/${mixWeights.g}/${mixWeights.b}%`,
        swap: `交换 ${swapMap.r}/${swapMap.g}/${swapMap.b}`,
      };
      pushEntry({
        type: 'channel-param',
        description: modeLabels[mode],
        snapshot: [],
      });
      toast('通道处理完成', 'success');
    } catch {
      toast('处理失败', 'error');
    }
  }, [sourceImage, mode, channel, intensity, mixWeights, swapMap, setProcessedImageUrl, pushEntry, toast]);

  useEffect(() => {
    if (sourceImage && processedImageUrl && autoAppliedRef.current) {
      apply();
    }
  }, [intensity, mixWeights, swapMap, channel]);

  const handleApply = useCallback(() => {
    autoAppliedRef.current = true;
    apply();
  }, [apply]);

  const handleExport = () => {
    if (!processedImageUrl) return;
    const a = document.createElement('a');
    a.href = processedImageUrl;
    a.download = `channel-${mode}.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-text-muted leading-relaxed">
        RGB 通道分离、强度调节、混合和交换，精确控制每个颜色通道。
      </div>

      {!sourceImage && (
        <div className="text-center text-text-muted py-6 text-xs space-y-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-40">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 12h18M12 3v18" />
          </svg>
          <div>请先上传图片</div>
        </div>
      )}

      <div>
        <div className="text-[10px] text-text-muted mb-1.5">操作模式</div>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { key: 'isolate' as const, label: '通道分离', desc: '查看单通道' },
            { key: 'intensity' as const, label: '强度调节', desc: '0~200%' },
            { key: 'mix' as const, label: '通道混合', desc: '自定义权重' },
            { key: 'swap' as const, label: '通道交换', desc: '互换通道' },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMode(opt.key)}
              className={`text-left p-2 rounded-lg border transition-all ${
                mode === opt.key
                  ? 'border-primary bg-primary/10 text-text-primary'
                  : 'border-border bg-surface-hover/50 text-text-secondary hover:border-border-hover'
              }`}
            >
              <div className="text-xs">{opt.label}</div>
              <div className="text-[9px] text-text-muted">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {mode === 'isolate' && (
        <div className="flex gap-1.5">
          {(['r', 'g', 'b'] as ChannelType[]).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`flex-1 text-xs py-2.5 rounded-lg font-bold transition-colors ${
                channel === ch
                  ? ch === 'r' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : ch === 'g' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover border border-border'
              }`}
            >
              {ch.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {mode === 'intensity' && (
        <div className="space-y-2">
          {([
            { key: 'r' as const, label: 'R', color: '#ef4444' },
            { key: 'g' as const, label: 'G', color: '#22c55e' },
            { key: 'b' as const, label: 'B', color: '#3b82f6' },
          ]).map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] w-4 font-bold" style={{ color }}>{label}</span>
              <input
                type="range"
                min={0}
                max={200}
                value={intensity[key]}
                onChange={(e) => setIntensity((prev) => ({ ...prev, [key]: +e.target.value }))}
                className="slider flex-1"
              />
              <span className="text-[10px] w-8 text-right font-mono">{intensity[key]}%</span>
            </div>
          ))}
          <div className="text-[9px] text-text-muted text-center">100% = 原始强度</div>
        </div>
      )}

      {mode === 'mix' && (
        <div className="space-y-2">
          {([
            { key: 'r' as const, label: 'R →', color: '#ef4444' },
            { key: 'g' as const, label: 'G →', color: '#22c55e' },
            { key: 'b' as const, label: 'B →', color: '#3b82f6' },
          ]).map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] w-6 font-bold" style={{ color }}>{label}</span>
              <input
                type="range"
                min={-100}
                max={200}
                value={mixWeights[key]}
                onChange={(e) => setMixWeights((prev) => ({ ...prev, [key]: +e.target.value }))}
                className="slider flex-1"
              />
              <span className="text-[10px] w-10 text-right font-mono">{mixWeights[key]}%</span>
            </div>
          ))}
          <div className="text-[9px] text-text-muted text-center">范围 -100%~200%，输出自动 clamp 到 0~255</div>
        </div>
      )}

      {mode === 'swap' && (
        <div className="space-y-2">
          {([
            { key: 'r' as const, label: 'R 输出', color: '#ef4444' },
            { key: 'g' as const, label: 'G 输出', color: '#22c55e' },
            { key: 'b' as const, label: 'B 输出', color: '#3b82f6' },
          ]).map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] w-12 font-bold" style={{ color }}>{label}</span>
              <div className="flex gap-1 flex-1">
                {(['r', 'g', 'b'] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => setSwapMap((prev) => ({ ...prev, [key]: src }))}
                    className={`flex-1 text-[10px] py-1.5 rounded-md transition-colors font-bold ${
                      swapMap[key] === src
                        ? src === 'r' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : src === 'g' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-surface text-text-muted border border-border hover:bg-surface-hover'
                    }`}
                  >
                    {src.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="text-[9px] text-text-muted text-center">选择每个输出通道的来源通道</div>
        </div>
      )}

      <button
        onClick={handleApply}
        disabled={!sourceImage}
        className="btn-primary w-full text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        应用处理
      </button>

      {processedImageUrl && (
        <div className="space-y-2">
          <img src={processedImageUrl} alt="通道结果" className="w-full rounded-md" />
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
