import { useEffect } from 'react';
import { usePaletteStore } from '../stores/paletteStore';

interface KeyboardShortcuts {
  onSave?: () => void;
  onExport?: () => void;
  onEscape?: () => void;
  onToggleComparison?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDeleteLastColor?: () => void;
  onPasteImage?: (file: File) => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcuts) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape' && handlers.onEscape) {
        e.preventDefault();
        handlers.onEscape();
        return;
      }

      if (e.key === 'Tab' && handlers.onToggleComparison) {
        e.preventDefault();
        handlers.onToggleComparison();
        return;
      }

      if (e.key === ' ' && !isInput && handlers.onToggleComparison) {
        e.preventDefault();
        handlers.onToggleComparison();
        return;
      }

      if (e.key === 'Delete' && !isInput && handlers.onDeleteLastColor) {
        e.preventDefault();
        handlers.onDeleteLastColor();
        return;
      }

      if (ctrl && e.key === 's') {
        e.preventDefault();
        handlers.onSave?.();
        return;
      }

      if (ctrl && e.key === 'e') {
        e.preventDefault();
        handlers.onExport?.();
        return;
      }

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('cc:skip-palette-history'));
        usePaletteStore.getState().undo();
        handlers.onUndo?.();
        return;
      }

      if (ctrl && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('cc:skip-palette-history'));
        usePaletteStore.getState().redo();
        handlers.onRedo?.();
        return;
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      if (!handlers.onPasteImage) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handlers.onPasteImage(file);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('paste', onPaste);
    };
  }, [handlers]);
}
