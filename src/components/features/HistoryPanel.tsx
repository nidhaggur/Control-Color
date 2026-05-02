import { useMemo } from 'react';
import { useHistoryStore } from '../../stores/historyStore';
import { usePaletteStore } from '../../stores/paletteStore';
import type { HistoryEntry, Color } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  'palette-change': '配色修改',
  'transfer-param': '迁移参数',
  'tonal-boundary': '灰阶调整',
  'channel-param': '通道调整',
};

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function HistoryPanel() {
  const { entries, currentIndex, canUndo, canRedo, undo, redo, clear } = useHistoryStore();
  const { setColors } = usePaletteStore();

  const reversedEntries = useMemo(() => [...entries].reverse(), [entries]);

  const handleJumpTo = (entry: HistoryEntry) => {
    const idx = entries.findIndex(e => e.id === entry.id);
    if (idx === -1 || idx === currentIndex) return;
    if (entry.snapshot && Array.isArray(entry.snapshot)) {
      window.dispatchEvent(new CustomEvent('cc:skip-palette-history'));
      setColors(entry.snapshot as Color[]);
    }
    useHistoryStore.setState({ currentIndex: idx });
  };

  const handleUndo = () => {
    const entry = undo();
    if (entry?.snapshot && Array.isArray(entry.snapshot)) {
      window.dispatchEvent(new CustomEvent('cc:skip-palette-history'));
      setColors(entry.snapshot as Color[]);
    }
  };

  const handleRedo = () => {
    const entry = redo();
    if (entry?.snapshot && Array.isArray(entry.snapshot)) {
      window.dispatchEvent(new CustomEvent('cc:skip-palette-history'));
      setColors(entry.snapshot as Color[]);
    }
  };

  const getSnapshotColors = (snapshot: unknown): Color[] => {
    if (Array.isArray(snapshot)) return snapshot as Color[];
    return [];
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium text-text-primary">操作历史</h3>
        <div className="flex flex-col items-center justify-center py-8">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted mb-3">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p className="text-xs text-text-muted text-center">
            暂无操作记录<br />
            <span className="text-[10px]">开始编辑配色方案后，操作历史将在这里显示</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">操作历史</h3>
        <span className="text-[10px] text-text-muted">{entries.length} / 50 步</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleUndo}
          disabled={!canUndo()}
          className="flex-1 btn-secondary text-xs py-1.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          撤销
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo()}
          className="flex-1 btn-secondary text-xs py-1.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          重做
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
        <button
          onClick={clear}
          disabled={entries.length === 0}
          className="btn-ghost text-xs text-text-muted hover:text-red-400 px-2 py-1.5 disabled:opacity-40"
          title="清空历史"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-0.5 max-h-[400px] overflow-y-auto scrollbar-thin">
        {reversedEntries.map((entry, reverseIdx) => {
          const originalIdx = entries.length - 1 - reverseIdx;
          const isCurrent = originalIdx === currentIndex;
          const isFuture = originalIdx > currentIndex;

          return (
            <button
              key={entry.id}
              onClick={() => handleJumpTo(entry)}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors ${
                isCurrent
                  ? 'bg-primary/10 border border-primary/30'
                  : isFuture
                    ? 'opacity-40 hover:opacity-70'
                    : 'hover:bg-surface-hover'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isCurrent ? 'bg-primary' : isFuture ? 'bg-border' : 'bg-text-muted'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-primary truncate">
                  {TYPE_LABELS[entry.type] || entry.type}
                  {entry.description && <span className="text-text-muted ml-1">— {entry.description}</span>}
                </div>
                <div className="text-[10px] text-text-muted">{formatTime(entry.timestamp)}</div>
              </div>
              {Array.isArray(entry.snapshot) && (
                <div className="flex gap-0.5 shrink-0">
                  {getSnapshotColors(entry.snapshot).slice(0, 4).map((c: Color, i: number) => (
                    <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.hex }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-[10px] text-text-muted text-center">
        会话级历史，刷新页面后清空
      </div>
    </div>
  );
}
