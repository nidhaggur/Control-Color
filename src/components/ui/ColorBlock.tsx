import React, { useState } from 'react';
import type { Color } from '../../types';
import { formatRgb, formatHsl } from '../../utils/colorUtils';
import { useToast } from './Toast';

interface ColorBlockProps {
  color: Color;
  index: number;
  onRemove?: () => void;
  onSelect?: () => void;
  selected?: boolean;
  showActions?: boolean;
  compact?: boolean;
}

export default function ColorBlock({
  color,
  index,
  onRemove,
  onSelect,
  selected = false,
  showActions = true,
  compact = false,
}: ColorBlockProps) {
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`已复制 ${label}`, 'success');
    } catch {
      toast('复制失败', 'error');
    }
  };

  const isLight = color.hsl.l > 60;

  if (compact) {
    return (
      <button
        className={`
          w-8 h-8 rounded-md border-2 transition-all duration-fast cursor-pointer
          hover:scale-110 hover:shadow-md
          ${selected ? 'border-white scale-110' : 'border-transparent'}
        `}
        style={{ backgroundColor: color.hex }}
        onClick={onSelect}
        title={`${color.hex}${color.name ? ` - ${color.name}` : ''}`}
      />
    );
  }

  return (
    <div
      className={`
        group relative card overflow-hidden cursor-pointer
        transition-all duration-fast hover:shadow-md
        ${selected ? 'ring-2 ring-primary' : ''}
      `}
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(!showMenu);
      }}
    >
      <div
        className="h-16 w-full relative"
        style={{ backgroundColor: color.hex }}
      >
        {showActions && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(color.hex, 'HEX');
              }}
              className={`p-1 rounded text-xs backdrop-blur-sm ${isLight ? 'bg-black/20 text-black' : 'bg-white/20 text-white'}`}
              title="复制 HEX"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className={`p-1 rounded text-xs backdrop-blur-sm ${isLight ? 'bg-black/20 text-black' : 'bg-white/20 text-white'}`}
                title="删除颜色"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-2 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-text-primary">{color.hex}</span>
        </div>
        <div className="text-[10px] text-text-muted font-mono">{formatRgb(color.rgb)}</div>
        <div className="text-[10px] text-text-muted font-mono">{formatHsl(color.hsl)}</div>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full left-0 z-50 mt-1 bg-surface border border-border rounded-md shadow-lg py-1 min-w-[140px]">
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-hover"
              onClick={(e) => { e.stopPropagation(); copyToClipboard(color.hex, 'HEX'); setShowMenu(false); }}
            >
              复制 HEX
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-hover"
              onClick={(e) => { e.stopPropagation(); copyToClipboard(formatRgb(color.rgb), 'RGB'); setShowMenu(false); }}
            >
              复制 RGB
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-hover"
              onClick={(e) => { e.stopPropagation(); copyToClipboard(formatHsl(color.hsl), 'HSL'); setShowMenu(false); }}
            >
              复制 HSL
            </button>
            {onRemove && (
              <>
                <div className="border-t border-border my-1" />
                <button
                  className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-surface-hover"
                  onClick={(e) => { e.stopPropagation(); onRemove(); setShowMenu(false); }}
                >
                  删除
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
