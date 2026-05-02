import { useState, useCallback } from 'react';
import { usePaletteStore } from '../../stores/paletteStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { useAuthStore } from '../../stores/authStore';
import { useContextMenu } from '../ui/ContextMenu';
import { exportPalette } from '../../utils/exportUtils';
import type { ExportFormat, Color } from '../../types';

function getTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export default function PaletteBar() {
  const { colors, name, sourceType, removeColor, reorderColors, addColor, setName } = usePaletteStore();
  const { addPalette } = useCollectionStore();
  const { isAuthenticated, setShowLoginModal, setPendingAction } = useAuthStore();
  const { showContextMenu } = useContextMenu();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(name);

  const copyToClipboard = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  }, []);

  const handleSave = useCallback(() => {
    if (colors.length === 0) return;
    if (!isAuthenticated) {
      setPendingAction('登录后将自动收藏当前配色');
      setShowLoginModal(true);
      return;
    }
    addPalette([...colors], sourceType);
  }, [colors, sourceType, addPalette, isAuthenticated, setPendingAction, setShowLoginModal]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (colors.length === 0) return;
      exportPalette(colors, format, name);
      setShowExportMenu(false);
    },
    [colors, name],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, color: Color, idx: number) => {
      showContextMenu(e, [
        {
          label: `复制 HEX (${color.hex})`,
          onClick: () => copyToClipboard(color.hex, idx),
        },
        {
          label: `复制 RGB (${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
          onClick: () => copyToClipboard(`rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`, idx),
        },
        {
          label: `复制 HSL (${color.hsl.h}°, ${color.hsl.s}%, ${color.hsl.l}%)`,
          onClick: () => copyToClipboard(`hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`, idx),
        },
        { label: '', onClick: () => {}, separator: true },
        {
          label: '添加到配色方案',
          onClick: () => addColor(color.hex),
        },
        {
          label: '设为基础色',
          onClick: () => {
            const { setBaseHue } = usePaletteStore.getState();
            setBaseHue(color.oklch.h);
            window.dispatchEvent(new CustomEvent('cc:switch-tool', { detail: 'preset' }));
          },
        },
        {
          label: '删除此颜色',
          onClick: () => removeColor(idx),
        },
      ]);
    },
    [showContextMenu, copyToClipboard, removeColor, addColor],
  );

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIdx !== null && dragIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== dropIdx) {
      reorderColors(dragIdx, dropIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  if (colors.length === 0) {
    return (
      <div className="h-14 rounded-lg border border-dashed border-border flex items-center justify-center text-text-muted text-xs">
        上传图片提取配色或使用预设方案开始
      </div>
    );
  }

  const handlePaletteContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    showContextMenu(e, [
      { label: '收藏配色', icon: '⭐', onClick: handleSave },
      { label: '重命名', icon: '✏️', onClick: () => { setIsRenaming(true); setRenameValue(name); } },
      { separator: true, label: '', onClick: () => {} },
      { label: '导出 CSS', icon: '📋', onClick: () => handleExport('css') },
      { label: '导出 Tailwind', icon: '📋', onClick: () => handleExport('tailwind') },
      { label: '导出 JSON', icon: '📋', onClick: () => handleExport('json') },
      { label: '导出 SVG', icon: '📋', onClick: () => handleExport('svg') },
      { separator: true, label: '', onClick: () => {} },
      { label: '清空所有颜色', icon: '✕', onClick: () => colors.forEach((_, i) => removeColor(0)) },
    ]);
  };

  return (
    <div className="bg-surface border border-border rounded-lg shadow-lg" onContextMenu={handlePaletteContextMenu}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        {isRenaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => { setName(renameValue.trim() || name); setIsRenaming(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setName(renameValue.trim() || name); setIsRenaming(false); } if (e.key === 'Escape') setIsRenaming(false); }}
            className="flex-1 text-xs font-medium text-text-secondary bg-transparent border-b border-primary outline-none"
            autoFocus
          />
        ) : (
          <span className="text-xs font-medium text-text-secondary flex-1 truncate">
            {name} · {colors.length} 色
          </span>
        )}
        <div className="relative">
          <button
            onClick={handleSave}
            className="btn-ghost text-xs px-2 py-1"
            title="收藏当前配色方案"
          >
            收藏
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="btn-ghost text-xs px-2 py-1"
          >
            导出
          </button>
          {showExportMenu && (
            <div className="absolute bottom-full right-0 mb-1 bg-surface border border-border rounded-lg shadow-xl py-1 z-50 min-w-[120px]">
              {(['css', 'tailwind', 'json', 'svg'] as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-hover transition-colors"
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-stretch gap-0 p-2 overflow-x-auto">
        {colors.map((color, idx) => (
          <div
            key={`${color.hex}-${idx}`}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onContextMenu={(e) => handleContextMenu(e, color, idx)}
            className={`group relative flex-1 min-w-[60px] max-w-[120px] h-16 rounded-md cursor-grab active:cursor-grabbing transition-all ${
              dragIdx === idx ? 'opacity-50 scale-95' : ''
            } ${dragOverIdx === idx ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface' : ''}`}
            style={{ backgroundColor: color.hex }}
            onClick={() => copyToClipboard(color.hex, idx)}
            title={`${color.hex} · 点击复制`}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: getTextColor(color.hex) }}
            >
              {copiedIdx === idx ? (
                <span className="text-xs font-medium">已复制!</span>
              ) : (
                <>
                  <span className="text-[10px] font-mono">{color.hex}</span>
                  <span className="text-[9px] opacity-70 mt-0.5">
                    {color.hsl.h}° {color.hsl.s}% {color.hsl.l}%
                  </span>
                </>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                removeColor(idx);
              }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
              title="删除颜色"
            >
              ×
            </button>

            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: getTextColor(color.hex) === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
