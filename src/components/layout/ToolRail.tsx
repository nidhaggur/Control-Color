import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ToolItem {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  group: string;
}

interface ToolRailProps {
  tools: ToolItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function ToolRail({ tools, activeKey, onSelect }: ToolRailProps) {
  const [tooltip, setTooltip] = useState<{ label: string; desc: string; x: number; y: number } | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number>(0);

  const groups = Array.from(new Set(tools.map((t) => t.group)));

  const showTip = (tool: ToolItem, el: HTMLElement) => {
    clearTimeout(hideTimerRef.current);
    const rect = el.getBoundingClientRect();
    setTooltip({
      label: tool.label,
      desc: tool.description,
      x: rect.right + 8,
      y: rect.top + rect.height / 2,
    });
  };

  const hideTip = () => {
    hideTimerRef.current = window.setTimeout(() => setTooltip(null), 100);
  };

  useEffect(() => {
    return () => clearTimeout(hideTimerRef.current);
  }, []);

  return (
    <>
      <div
        ref={railRef}
        className="w-11 flex-shrink-0 bg-surface border-r border-border flex flex-col items-center py-2 gap-0.5 overflow-y-auto scrollbar-none relative"
      >
        {groups.map((group, gi) => (
          <div key={group} className="contents">
            {gi > 0 && <div className="w-6 h-px bg-border my-1" />}
            {tools
              .filter((t) => t.group === group)
              .map((tool) => {
                const isActive = activeKey === tool.key;
                return (
                  <button
                    key={tool.key}
                    onClick={() => onSelect(tool.key)}
                    onMouseEnter={(e) => showTip(tool, e.currentTarget)}
                    onMouseLeave={hideTip}
                    className={`w-9 h-9 rounded-md flex items-center justify-center text-base transition-all duration-150 relative group ${
                      isActive
                        ? 'bg-primary/15 text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    {tool.icon}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary rounded-r-full" />
                    )}
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      {tooltip && createPortal(
        <div
          className="fixed z-[9990] pointer-events-none animate-fade-in"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateY(-50%)' }}
        >
          <div
            className="px-3 py-2 rounded-lg shadow-xl min-w-[160px] max-w-[220px]"
            style={{ background: '#f1f5f9', color: '#0f172a' }}
          >
            <div className="text-[11px] font-semibold mb-0.5">{tooltip.label}</div>
            <div className="text-[10px] opacity-60 leading-relaxed">{tooltip.desc}</div>
          </div>
          <div
            className="absolute right-full top-1/2 -translate-y-1/2"
            style={{
              width: 0,
              height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '5px solid #f1f5f9',
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}
