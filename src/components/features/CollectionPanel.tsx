import { useState, useCallback } from 'react';
import { useCollectionStore } from '../../stores/collectionStore';
import { useAuthStore } from '../../stores/authStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { useToast } from '../ui/Toast';

type ViewMode = 'grid' | 'list';

const SOURCE_LABELS: Record<string, string> = {
  extraction: '提取',
  preset: '预设',
  custom: '自定义',
  recommendation: '推荐',
  meteor: '流星',
};

export default function CollectionPanel() {
  const { palettes, removePalette, batchRemove, renamePalette, addTag, removeTag, batchAddTag, selectedIds, toggleSelect, selectAll, clearSelection } = useCollectionStore();
  const { isAuthenticated, setShowLoginModal, setPendingAction } = useAuthStore();
  const { setColors } = usePaletteStore();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showBatchBar, setShowBatchBar] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [addingTagId, setAddingTagId] = useState<string | null>(null);

  const filteredPalettes = palettes.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)) || p.colors.some(c => c.hex.toLowerCase().includes(q));
  });

  const selectedCount = selectedIds.size;

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      renamePalette(editingId, editName.trim());
      toast('已重命名', 'success');
    }
    setEditingId(null);
  };

  const handleAddTag = (id: string) => {
    if (!tagInput.trim()) return;
    addTag(id, tagInput.trim());
    setTagInput('');
    setAddingTagId(null);
    toast(`已添加标签 "${tagInput.trim()}"`, 'success');
  };

  const handleBatchDelete = () => {
    const ids = Array.from(selectedIds);
    batchRemove(ids);
    setShowBatchBar(false);
    toast(`已删除 ${ids.length} 个方案`, 'success');
  };

  const handleBatchTag = () => {
    if (!tagInput.trim()) return;
    const ids = Array.from(selectedIds);
    batchAddTag(ids, tagInput.trim());
    setTagInput('');
    toast(`已为 ${ids.length} 个方案添加标签`, 'success');
  };

  const handleApply = (colors: typeof palettes[0]['colors']) => {
    setColors(colors);
    toast('已应用到配色方案', 'success');
  };

  const handleSave = useCallback(() => {
    if (!isAuthenticated) {
      setPendingAction('登录后将自动收藏当前配色');
      setShowLoginModal(true);
      return;
    }
  }, [isAuthenticated, setPendingAction, setShowLoginModal]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          收藏配色
          <span className="text-[10px] text-text-muted font-normal ml-1.5">{palettes.length}/200</span>
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-1.5 rounded-md hover:bg-surface-hover transition-colors text-text-muted hover:text-text-secondary"
            title={viewMode === 'grid' ? '切换列表' : '切换网格'}
          >
            {viewMode === 'grid' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            )}
          </button>
          <button
            onClick={() => { setShowBatchBar(!showBatchBar); if (!showBatchBar) clearSelection(); }}
            className={`p-1.5 rounded-md transition-colors ${showBatchBar ? 'bg-primary/15 text-primary' : 'hover:bg-surface-hover text-text-muted hover:text-text-secondary'}`}
            title="批量操作"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
          </button>
        </div>
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索配色方案..."
          className="input-field flex-1 text-xs"
        />
      </div>

      {showBatchBar && (
        <div className="flex items-center gap-2 bg-surface-hover/50 rounded-lg p-2">
          <button onClick={selectAll} className="text-[10px] text-primary hover:underline">
            全选
          </button>
          <button onClick={clearSelection} className="text-[10px] text-text-muted hover:underline">
            取消
          </button>
          <span className="text-[10px] text-text-muted flex-1">
            已选 {selectedCount} 项
          </span>
          {selectedCount > 0 && (
            <>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBatchTag()}
                placeholder="标签"
                className="input-field text-[10px] w-20"
              />
              <button onClick={handleBatchTag} className="text-[10px] text-primary">打标签</button>
              <button onClick={handleBatchDelete} className="text-[10px] text-red-400">删除</button>
            </>
          )}
        </div>
      )}

      {!isAuthenticated && palettes.length === 0 && (
        <div className="text-center text-text-muted py-6 text-xs space-y-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto opacity-40">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          <div>收藏配色方案</div>
          <button onClick={handleSave} className="text-primary text-[10px] hover:underline">
            登录后开始收藏
          </button>
        </div>
      )}

      {filteredPalettes.length === 0 && palettes.length > 0 && (
        <div className="text-[10px] text-text-muted text-center py-4">
          未找到匹配的配色方案
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="space-y-2">
          {filteredPalettes.map((palette) => (
            <div
              key={palette.id}
              className={`rounded-lg border transition-colors p-2 space-y-1.5 ${
                selectedIds.has(palette.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-border-hover'
              }`}
              onClick={() => showBatchBar && toggleSelect(palette.id)}
            >
              <div className="flex items-center gap-1.5">
                {showBatchBar && (
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      selectedIds.has(palette.id) ? 'bg-primary border-primary' : 'border-border'
                    }`}
                  >
                    {selectedIds.has(palette.id) && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </div>
                )}

                <div className="flex gap-0.5 flex-1 h-8">
                  {palette.colors.map((c, i) => (
                    <div
                      key={i}
                      className="flex-1 first:rounded-l-md last:rounded-r-md"
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>

                <div className="flex gap-0.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleApply(palette.colors); }}
                    className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-primary transition-colors"
                    title="应用"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removePalette(palette.id); toast('已删除', 'info'); }}
                    className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-red-400 transition-colors"
                    title="删除"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {editingId === palette.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                    className="input-field text-[10px] flex-1"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="text-[10px] text-text-secondary truncate cursor-pointer hover:text-text-primary flex-1"
                    onClick={(e) => { e.stopPropagation(); handleStartRename(palette.id, palette.name); }}
                    title="点击重命名"
                  >
                    {palette.name}
                  </span>
                )}

                {palette.sourceType && (
                  <span className="text-[8px] text-text-muted bg-surface-hover px-1 py-0.5 rounded shrink-0">
                    {SOURCE_LABELS[palette.sourceType] || palette.sourceType}
                  </span>
                )}

                <span className="text-[8px] text-text-muted shrink-0">
                  {new Date(palette.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {palette.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {palette.tags.map((tag) => (
                    <span key={tag} className="text-[8px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 group">
                      {tag}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTag(palette.id, tag); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {addingTagId === palette.id ? (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag(palette.id)}
                    placeholder="输入标签"
                    className="input-field text-[10px] flex-1"
                    autoFocus
                  />
                  <button onClick={() => handleAddTag(palette.id)} className="text-[10px] text-primary">添加</button>
                  <button onClick={() => setAddingTagId(null)} className="text-[10px] text-text-muted">取消</button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setAddingTagId(palette.id); setTagInput(''); }}
                  className="text-[8px] text-text-muted hover:text-primary transition-colors"
                >
                  + 添加标签
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {filteredPalettes.map((palette) => (
            <div
              key={palette.id}
              className={`flex items-center gap-2 p-1.5 rounded-md transition-colors group ${
                selectedIds.has(palette.id) ? 'bg-primary/5' : 'hover:bg-surface-hover'
              }`}
              onClick={() => showBatchBar && toggleSelect(palette.id)}
            >
              {showBatchBar && (
                <div
                  className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
                    selectedIds.has(palette.id) ? 'bg-primary border-primary' : 'border-border'
                  }`}
                >
                  {selectedIds.has(palette.id) && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </div>
              )}

              <div className="flex gap-px w-16 shrink-0">
                {palette.colors.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex-1 h-5 first:rounded-l last:rounded-r" style={{ backgroundColor: c.hex }} />
                ))}
              </div>

              {editingId === palette.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                  className="input-field text-[10px] flex-1"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="text-[10px] text-text-secondary truncate flex-1 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); handleStartRename(palette.id, palette.name); }}
                >
                  {palette.name}
                </span>
              )}

              {palette.sourceType && (
                <span className="text-[8px] text-text-muted bg-surface-hover px-1 py-0.5 rounded shrink-0">
                  {SOURCE_LABELS[palette.sourceType]}
                </span>
              )}

              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); handleApply(palette.colors); }}
                  className="p-1 rounded hover:bg-surface text-text-muted hover:text-primary"
                  title="应用"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removePalette(palette.id); toast('已删除', 'info'); }}
                  className="p-1 rounded hover:bg-surface text-text-muted hover:text-red-400"
                  title="删除"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {palettes.length > 0 && (
        <div className="text-[9px] text-text-muted text-center">
          点击名称重命名 · {palettes.length}/200
        </div>
      )}
    </div>
  );
}
