import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  separator?: boolean;
  disabled?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: MenuItem[];
  visible: boolean;
}

interface ContextMenuContextValue {
  showContextMenu: (e: React.MouseEvent, items: MenuItem[]) => void;
  hideContextMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export function useContextMenu() {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) throw new Error('useContextMenu must be used within ContextMenuProvider');
  return ctx;
}

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    items: [],
    visible: false,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const showContextMenu = useCallback((e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();

    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - items.length * 36);

    setState({ x, y, items, visible: true });
  }, []);

  const hideContextMenu = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    if (!state.visible) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };

    const handleScroll = () => hideContextMenu();

    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [state.visible, hideContextMenu]);

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
      {children}
      {state.visible && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[200] min-w-[160px] bg-surface border border-border rounded-lg shadow-xl py-1 animate-fade-in"
          style={{ left: state.x, top: state.y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {state.items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.separator && <div className="h-px bg-border my-1" />}
              <button
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    hideContextMenu();
                  }
                }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                  item.disabled
                    ? 'text-text-muted cursor-not-allowed opacity-50'
                    : 'text-text-primary hover:bg-surface-hover'
                }`}
              >
                {item.icon && <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>,
        document.body,
      )}
    </ContextMenuContext.Provider>
  );
}
