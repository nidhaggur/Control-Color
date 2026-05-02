import { useState, useEffect } from 'react';
import { usePaletteStore } from '../../stores/paletteStore';
import { getRecommendations } from '../../utils/recommendationUtils';
import type { RecommendedColor } from '../../types';
import { useToast } from '../ui/Toast';

export default function RecommendationPanel() {
  const { colors, addColor } = usePaletteStore();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<RecommendedColor[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (colors.length > 0 && !dismissed) {
      const recs = getRecommendations(colors, 8);
      setRecommendations(recs);
    } else {
      setRecommendations([]);
    }
  }, [colors, dismissed]);

  const handleAccept = (rec: RecommendedColor) => {
    addColor(rec.color.hex);
    setRecommendations((prev) => prev.filter((r) => r.color.hex !== rec.color.hex));
    toast(`已添加 ${rec.label}`, 'success');
  };

  const handleAcceptAll = () => {
    recommendations.forEach((rec) => addColor(rec.color.hex));
    toast(`已添加 ${recommendations.length} 个推荐颜色`, 'success');
    setRecommendations([]);
  };

  if (colors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-text-muted text-xs px-4 gap-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <div>智能推荐就绪</div>
        <div className="text-[10px] text-text-muted/60">
          选择一个颜色或使用提取、预设功能后，自动推荐和谐配色
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-text-secondary">推荐配色</h3>
        <div className="flex items-center gap-1">
          {recommendations.length > 0 && (
            <button
              onClick={handleAcceptAll}
              className="text-[10px] text-primary hover:text-primary/80 transition-colors px-1.5 py-0.5 rounded hover:bg-primary/10"
            >
              全部采纳
            </button>
          )}
          <button
            onClick={() => setDismissed((d) => !d)}
            className="text-[10px] text-text-muted hover:text-text-secondary transition-colors px-1.5 py-0.5 rounded hover:bg-surface-hover"
            title={dismissed ? '显示推荐' : '关闭推荐'}
          >
            {dismissed ? '显示' : '关闭'}
          </button>
        </div>
      </div>

      {!dismissed && recommendations.length > 0 && (
        <div className="space-y-1.5">
          {recommendations.map((rec) => (
            <div
              key={rec.color.hex}
              className="flex items-center gap-2 group p-1.5 rounded-md hover:bg-surface-hover transition-colors"
            >
              <div
                className="w-5 h-5 rounded-md border border-border shrink-0"
                style={{ backgroundColor: rec.color.hex }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-text-secondary truncate">{rec.color.hex}</div>
                <div className="text-[9px] text-text-muted">{rec.label}</div>
              </div>
              <button
                onClick={() => handleAccept(rec)}
                className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded hover:bg-primary/10"
              >
                采纳
              </button>
            </div>
          ))}
        </div>
      )}

      {!dismissed && recommendations.length === 0 && (
        <div className="text-[10px] text-text-muted text-center py-4">
          暂无更多推荐
        </div>
      )}
    </div>
  );
}
