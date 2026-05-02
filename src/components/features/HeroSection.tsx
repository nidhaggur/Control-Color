import { useState, useEffect, useRef } from 'react';
import MeteorCanvas, { type HeroTextBlock } from '../ui/MeteorCanvas';
import { usePaletteStore } from '../../stores/paletteStore';
import { useCollectionStore } from '../../stores/collectionStore';

interface HeroSectionProps {
  onScrollToWorkspace: () => void;
}

const FLOAT_KEYWORDS = [
  '色彩', 'HSL', 'RGB', '对比度', 'WCAG', '配色',
  '色轮', '互补色', '饱和度', '明度', '色相', '梯度',
  'Accessibility', 'OKLCH', '迁移', '提取', '调色板', '和谐',
  '灵感', '设计', '主题', '渐变', '色温', '冷暖',
];

export default function HeroSection({ onScrollToWorkspace }: HeroSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const tipRef = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const featureCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const keywordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const { colors, sourceType } = usePaletteStore();
  useCollectionStore();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const [textBlocks, setTextBlocks] = useState<HeroTextBlock[]>([]);

  useEffect(() => {
    if (!isVisible) return;

    const recalculate = () => {
      const blocks: HeroTextBlock[] = [];
      const section = sectionRef.current;
      if (!section) return;
      const sRect = section.getBoundingClientRect();

      const measure = (el: HTMLElement | null, fontSize: number, color: string, bold: boolean) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        blocks.push({
          text: el.textContent || '',
          x: r.left - sRect.left,
          y: r.top - sRect.top,
          fontSize,
          color,
          bold,
          lineHeight: fontSize * 1.5,
        });
      };

      measure(titleRef.current, 42, '#f1f5f9', true);
      measure(subtitleRef.current, 16, '#94a3b8', false);
      measure(descRef.current, 14, '#64748b', false);
      measure(tipRef.current, 12, '#475569', false);
      measure(btnRef.current, 14, '#f1f5f9', true);

      featureCardRefs.current.forEach((el) => {
        if (!el) return;
        const titleEl = el.querySelector('[data-card-title]');
        const descEl = el.querySelector('[data-card-desc]');
        if (titleEl) measure(titleEl as HTMLElement, 13, '#e2e8f0', true);
        if (descEl) measure(descEl as HTMLElement, 11, '#64748b', false);
      });

      keywordRefs.current.forEach((el) => {
        measure(el, 11, '#475569', false);
      });

      setTextBlocks(blocks);
    };

    recalculate();

    const section = sectionRef.current;
    if (!section) return;

    const observer = new ResizeObserver(() => recalculate());
    observer.observe(section);
    return () => observer.disconnect();
  }, [isVisible]);

  const palettePreview = colors.length > 0
    ? colors
    : [
        { hex: '#5B8DEF', rgb: { r: 91, g: 141, b: 239 }, hsl: { h: 220, s: 78, l: 65 }, oklch: { l: 0.62, c: 0.15, h: 250 } },
        { hex: '#F765A3', rgb: { r: 247, g: 101, b: 163 }, hsl: { h: 335, s: 86, l: 68 }, oklch: { l: 0.65, c: 0.18, h: 350 } },
        { hex: '#FFD166', rgb: { r: 255, g: 209, b: 102 }, hsl: { h: 43, s: 100, l: 70 }, oklch: { l: 0.86, c: 0.12, h: 85 } },
        { hex: '#06D6A0', rgb: { r: 6, g: 214, b: 160 }, hsl: { h: 164, s: 94, l: 43 }, oklch: { l: 0.76, c: 0.14, h: 165 } },
        { hex: '#8B5CF6', rgb: { r: 139, g: 92, b: 246 }, hsl: { h: 258, s: 88, l: 66 }, oklch: { l: 0.58, c: 0.2, h: 290 } },
      ];

  const features = [
    { title: '配色提取', desc: '从图片中智能提取主色调', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z' },
    { title: '配色迁移', desc: '将色彩风格迁移到目标图片', icon: 'M21 3H3v18h18V3z' },
    { title: '色轮编辑', desc: '基于色彩理论的智能推荐', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    { title: '无障碍检查', desc: '色盲模拟与对比度验证', icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' },
  ];

  return (
    <section ref={sectionRef} className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      <MeteorCanvas heroTextBlocks={textBlocks} />

      <div
        className={`relative z-10 max-w-4xl mx-auto px-6 text-center transition-all duration-1000 pointer-events-none ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <h1
          ref={titleRef}
          className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
          style={{ color: 'transparent' }}
          aria-hidden="true"
        >
          Control Color
        </h1>

        <h2 ref={subtitleRef} className="text-lg md:text-xl text-text-secondary mb-4 font-medium" style={{ color: 'transparent' }} aria-hidden="true">
          专业色彩设计工作台 · 提取 · 迁移 · 分析 · 无障碍
        </h2>

        <p ref={descRef} className="text-sm text-text-muted mb-8 max-w-lg mx-auto leading-relaxed" style={{ color: 'transparent' }} aria-hidden="true">
          从图片中智能提取配色方案，一键迁移色彩风格，实时对比效果，
          支持 WCAG 无障碍标准检查。点击空白区域生成流星配色灵感！
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-8 pointer-events-auto">
          <button
            ref={btnRef}
            onClick={onScrollToWorkspace}
            className="btn-primary px-8 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            开始使用
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('features-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-ghost px-6 py-3 rounded-xl text-sm font-medium"
          >
            了解更多
          </button>
        </div>

        <div
          className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface/60 backdrop-blur-md border border-border/50 shadow-lg mb-8"
        >
          <div className="flex gap-1.5 h-7 rounded-lg overflow-hidden shadow-sm">
            {palettePreview.map((color, i) => (
              <div
                key={i}
                className="w-7 h-full first:rounded-l-lg last:rounded-r-lg"
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
          <div className="text-xs text-text-muted">
            {colors.length > 0
              ? `当前配色 · ${colors.length} 色`
              : '点击流星捕获随机配色'}
          </div>
          <div className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
            {sourceType === 'meteor' ? '流星' : sourceType === 'extraction' ? '提取' : '预设'}
          </div>
        </div>

        <div id="features-section" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 max-w-2xl mx-auto pointer-events-auto">
          {features.map((f, i) => (
            <div
              key={i}
              ref={(el) => { featureCardRefs.current[i] = el; }}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              className={`group p-4 rounded-xl bg-surface/40 backdrop-blur-sm border transition-all duration-300 cursor-pointer ${
                hoveredFeature === i
                  ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10 scale-105'
                  : 'border-border/30 hover:border-border/50'
              }`}
            >
              <div className={`w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center transition-colors ${
                hoveredFeature === i ? 'bg-primary/15 text-primary' : 'bg-surface-hover text-text-muted'
              }`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <div data-card-title className="text-sm font-semibold text-text-primary mb-0.5">{f.title}</div>
              <div data-card-desc className="text-[11px] text-text-muted leading-snug">{f.desc}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-6 max-w-xl mx-auto">
          {FLOAT_KEYWORDS.map((kw, i) => (
            <span
              key={kw}
              ref={(el) => { keywordRefs.current[i] = el; }}
              className="text-[11px] text-text-muted/50 select-none"
              style={{ color: 'transparent' }}
              aria-hidden="true"
            >
              {kw}
            </span>
          ))}
        </div>

        <p ref={tipRef} className="text-xs text-text-muted animate-pulse">
          ↓ 向下滑动进入工作区 · 点击背景生成流星配色
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
