import { useState, useRef, useCallback, useEffect } from 'react';
import { useImageStore } from '../stores/imageStore';
import { useCollectionStore } from '../stores/collectionStore';
import { usePaletteStore } from '../stores/paletteStore';
import { useHistoryStore } from '../stores/historyStore';
import { useAuthStore } from '../stores/authStore';
import { loadImageFromFile } from '../utils/imageUtils';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useToast } from '../components/ui/Toast';
import { exportPalette } from '../utils/exportUtils';
import HeroSection from '../components/features/HeroSection';
import PaletteBar from '../components/features/PaletteBar';
import ToolRail from '../components/layout/ToolRail';
import ComparisonSlider from '../components/ui/ComparisonSlider';
import ExtractionPanel from '../components/features/ExtractionPanel';
import TransferPanel from '../components/features/TransferPanel';
import QuickActionsPanel from '../components/features/QuickActionsPanel';
import PresetPanel from '../components/features/PresetPanel';
import CustomColorPanel from '../components/features/CustomColorPanel';
import RecommendationPanel from '../components/features/RecommendationPanel';
import GrayscalePanel from '../components/features/GrayscalePanel';
import ChannelPanel from '../components/features/ChannelPanel';
import TonalRangePanel from '../components/features/TonalRangePanel';
import ImagePreprocessPanel from '../components/features/ImagePreprocessPanel';
import ContrastPanel from '../components/features/ContrastPanel';
import GradientPanel from '../components/features/GradientPanel';
import ColorBlindPanel from '../components/features/ColorBlindPanel';
import HistoryPanel from '../components/features/HistoryPanel';
import SharePanel from '../components/features/SharePanel';
import CollectionPanel from '../components/features/CollectionPanel';
import ExportPanel from '../components/features/ExportPanel';
import { useContextMenu } from '../components/ui/ContextMenu';
import type { ComparisonMode } from '../types';

const toolItems = [
  {
    key: 'quick',
    label: '常用',
    description: '配色提取与配色迁移，最常用的核心功能组合面板。',
    group: '核心',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    key: 'extraction',
    label: '配色提取',
    description: '从源图中智能提取主要颜色，支持 K-Means 聚类和中位切分算法，自动识别主色调并显示像素占比。需要上传源图。',
    group: '核心',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    key: 'transfer',
    label: '配色迁移',
    description: '将配色方案的颜色风格应用到图片上，保持原始亮度和明暗关系不变。无需源图，有配色方案和目标图即可。',
    group: '核心',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
  {
    key: 'preset',
    label: '预设配色',
    description: '提供 30+ 套精选预设配色方案，涵盖单色、互补、类似、三色、四色、分裂互补等色彩理论模式。',
    group: '核心',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    ),
  },
  {
    key: 'custom',
    label: '色轮编辑',
    description: '基于 Adobe Color Wheel 的色轮编辑器，支持 6 种和谐模式（互补、类似、三色等），拖拽选择基色实时生成配色。',
    group: '核心',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    ),
  },
  {
    key: 'recommendation',
    label: '智能推荐',
    description: '基于当前配色方案，通过色彩理论和算法智能推荐互补色、类似色和对比色，扩展您的调色板。',
    group: '高级',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    key: 'grayscale',
    label: '灰度映射',
    description: '将彩色配色方案转换为灰度模式，支持加权平均、亮度保持、单通道三种算法，验证明暗层次是否合理。',
    group: '高级',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 0 0 20" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    key: 'channel',
    label: '通道分离',
    description: '将图片分离为红、绿、蓝三个颜色通道，分别查看各通道的灰度信息，辅助色彩分析和调整。',
    group: '高级',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: 'tonal',
    label: '灰阶着色',
    description: '对图片进行灰阶分离，将不同亮度区域映射到配色方案中的颜色，实现创意色调分级效果。',
    group: '高级',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 12h20" /><path d="M12 6v12" opacity="0.4" />
      </svg>
    ),
  },
  {
    key: 'preprocess',
    label: '图片预处理',
    description: '对图片进行旋转、翻转、裁剪等基础预处理操作，支持自由裁剪和多种比例约束。',
    group: '工具',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    key: 'contrast',
    label: '对比度检查',
    description: '检查配色方案中所有颜色两两组合的对比度，按 WCAG AA/AAA 标准评估文本可读性。',
    group: '工具',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 0 0 20V2z" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'gradient',
    label: '渐变生成',
    description: '基于当前配色方案生成 CSS 线性/径向渐变，支持自定义角度和透明度，一键复制代码。',
    group: '工具',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.8" /><stop offset="100%" stopColor="currentColor" stopOpacity="0.1" /></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="2" fill="url(#tg)" />
      </svg>
    ),
  },
  {
    key: 'colorblind',
    label: '色盲模拟',
    description: '模拟红色盲、绿色盲和蓝黄色盲用户看到的配色效果，评估配色方案的无障碍性和可区分性。',
    group: '工具',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    key: 'export',
    label: '导出',
    description: '将配色方案导出为 CSS 变量、Tailwind 配置、JSON 数据或 SVG 色板文件，支持一键复制代码。',
    group: '管理',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    key: 'history',
    label: '操作历史',
    description: '查看和回溯操作历史记录，支持撤销/重做和跳转到任意历史状态。',
    group: '管理',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: 'share',
    label: '分享配色',
    description: '生成精美的配色方案分享图片，支持横向/纵向/网格布局，一键下载 PNG。',
    group: '管理',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    key: 'collection',
    label: '配色收藏',
    description: '管理和收藏已保存的配色方案，支持搜索、标签分类和批量导出，随时调用历史配色。',
    group: '管理',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

type ToolKey = (typeof toolItems)[number]['key'];

export default function HomePage() {
  const { sourceImage, targetImage, processedImageUrl, comparisonBase, setSourceImage, setTargetImage, setProcessedImageUrl, clearAll } = useImageStore();
  const { colors, name, sourceType } = usePaletteStore();
  const { addPalette } = useCollectionStore();
  const { isAuthenticated, setShowLoginModal, setPendingAction } = useAuthStore();
  const { toast } = useToast();
  const { pushEntry } = useHistoryStore();
  const { showContextMenu } = useContextMenu();
  const [activeTool, setActiveTool] = useState<ToolKey>('quick');
  const [panelOpen, setPanelOpen] = useState(true);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('side-by-side');
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const skipHistoryRef = useRef(false);
  const prevColorsRef = useRef<string>('');

  useEffect(() => {
    const handleSwitchTool = (e: Event) => {
      const tool = (e as CustomEvent).detail;
      if (tool && toolItems.some(t => t.key === tool)) {
        setActiveTool(tool);
        setPanelOpen(true);
      }
    };
    const handleSkipHistory = () => { skipHistoryRef.current = true; };
    window.addEventListener('cc:switch-tool', handleSwitchTool);
    window.addEventListener('cc:skip-palette-history', handleSkipHistory);
    return () => {
      window.removeEventListener('cc:switch-tool', handleSwitchTool);
      window.removeEventListener('cc:skip-palette-history', handleSkipHistory);
    };
  }, []);

  useEffect(() => {
    const colorKey = colors.map(c => c.hex).join(',');
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      prevColorsRef.current = colorKey;
      return;
    }
    if (colorKey && colorKey !== prevColorsRef.current) {
      prevColorsRef.current = colorKey;
      if (colors.length > 0) {
        pushEntry({
          type: 'palette-change',
          description: `${colors.length}色配色方案`,
          snapshot: [...colors],
        });
      }
    }
  }, [colors]);

  const { removeColor: removeLastColor } = usePaletteStore();

  useKeyboardShortcuts({
    onSave: () => {
      if (colors.length > 0) {
        if (!isAuthenticated) {
          setPendingAction('登录后将自动收藏当前配色');
          setShowLoginModal(true);
          return;
        }
        addPalette([...colors], sourceType);
        toast('配色方案已收藏', 'success');
      }
    },
    onExport: () => {
      if (colors.length > 0) {
        exportPalette(colors, 'json', name);
        toast('已导出配色方案', 'success');
      }
    },
    onEscape: () => setPanelOpen(false),
    onToggleComparison: () => {
      setComparisonMode((prev) => (prev === 'side-by-side' ? 'slider' : 'side-by-side'));
    },
    onUndo: () => toast('已撤销', 'info'),
    onRedo: () => toast('已重做', 'info'),
    onDeleteLastColor: () => {
      if (colors.length > 0) {
        removeLastColor(colors.length - 1);
        toast('已删除最后一个颜色', 'info');
      }
    },
    onPasteImage: async (file: File) => {
      const img = await loadImageFromFile(file);
      if (!sourceImage) {
        setSourceImage(img);
      } else if (!targetImage) {
        setTargetImage(img);
      }
    },
  });

  const scrollToWorkspace = useCallback(() => {
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleToolSelect = useCallback((key: string) => {
    setActiveTool(key as ToolKey);
    setPanelOpen(true);
  }, []);

  const handleSourceUpload = useCallback(
    async (file: File) => {
      const img = await loadImageFromFile(file);
      setSourceImage(img);
    },
    [setSourceImage],
  );

  const handleTargetUpload = useCallback(
    async (file: File) => {
      const img = await loadImageFromFile(file);
      setTargetImage(img);
    },
    [setTargetImage],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, type: 'source' | 'target') => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        if (type === 'source') handleSourceUpload(file);
        else handleTargetUpload(file);
      }
    },
    [handleSourceUpload, handleTargetUpload],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSourceUpload(file);
  };

  const handleTargetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleTargetUpload(file);
  };

  const renderPanel = () => {
    switch (activeTool) {
      case 'quick': return <QuickActionsPanel />;
      case 'extraction': return <ExtractionPanel />;
      case 'transfer': return <TransferPanel />;
      case 'preset': return <PresetPanel />;
      case 'custom': return <CustomColorPanel />;
      case 'recommendation': return <RecommendationPanel />;
      case 'grayscale': return <GrayscalePanel />;
      case 'channel': return <ChannelPanel />;
      case 'tonal': return <TonalRangePanel />;
      case 'preprocess': return <ImagePreprocessPanel />;
      case 'contrast': return <ContrastPanel />;
      case 'gradient': return <GradientPanel />;
      case 'colorblind': return <ColorBlindPanel />;
      case 'history': return <HistoryPanel />;
      case 'share': return <SharePanel />;
      case 'collection': return <CollectionPanel />;
      case 'export': return <ExportPanel />;
      default: return null;
    }
  };

  const activeToolInfo = toolItems.find((t) => t.key === activeTool);

  const handleSourceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!sourceImage) return;
    showContextMenu(e, [
      { label: '替换图片', icon: '🔄', onClick: () => sourceInputRef.current?.click() },
      { label: '提取配色', icon: '🎨', onClick: () => { setActiveTool('extraction'); setPanelOpen(true); } },
      { separator: true, label: '', onClick: () => {} },
      { label: '移除图片', icon: '✕', onClick: () => { setSourceImage(null); setProcessedImageUrl(null); } },
    ]);
  };

  const handleTargetContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!targetImage && !processedImageUrl) return;
    showContextMenu(e, [
      ...(processedImageUrl ? [{ label: '提取配色', icon: '🎨', onClick: () => { setActiveTool('extraction'); setPanelOpen(true); } }] : []),
      { label: '替换图片', icon: '🔄', onClick: () => targetInputRef.current?.click() },
      { separator: true, label: '', onClick: () => {} },
      { label: '移除图片', icon: '✕', onClick: () => { setTargetImage(null); setProcessedImageUrl(null); } },
    ]);
  };

  return (
    <div className="flex flex-col">
      <HeroSection onScrollToWorkspace={scrollToWorkspace} />

      <div
        ref={workspaceRef}
        className="flex flex-col"
        style={{ height: 'calc(100vh - 3.5rem)' }}
      >
        <div className="flex flex-1 overflow-hidden">
          <ToolRail
            tools={toolItems}
            activeKey={activeTool}
            onSelect={handleToolSelect}
          />

          <div className="flex-1 flex flex-col p-4 gap-3 overflow-auto">
            {processedImageUrl && comparisonMode === 'slider' ? (() => {
              const beforeSrc = comparisonBase === 'target' && targetImage
                ? targetImage.dataUrl
                : sourceImage?.dataUrl;
              if (!beforeSrc) return null;
              const baseLabel = comparisonBase === 'target' ? '原始目标图' : '原始源图';
              return (
              <div className="flex-1 rounded-xl border border-border overflow-hidden relative bg-surface/30">
                <ComparisonSlider
                  beforeSrc={beforeSrc}
                  afterSrc={processedImageUrl}
                  className="w-full h-full"
                />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[10px] text-white flex items-center gap-2">
                  <span>拖拽滑块对比 · 左：{baseLabel} · 右：处理结果 · 按 Tab 切换模式</span>
                </div>
              </div>
              );
            })() : (
              <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0 relative">
                <div
                  id="guide-target-source"
                  className="flex-1 rounded-xl border-2 border-dashed border-border hover:border-accent transition-colors relative overflow-hidden flex flex-col bg-surface/30"
                  onDrop={(e) => handleDrop(e, 'source')}
                  onDragOver={handleDragOver}
                  onContextMenu={handleSourceContextMenu}
                >
                  {sourceImage ? (
                    <div className="flex-1 flex items-center justify-center p-3 relative">
                      <img src={sourceImage.dataUrl} alt="源图" className="max-w-full max-h-full object-contain rounded" />
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                        源图 · {sourceImage.width}×{sourceImage.height}
                      </div>
                      <button onClick={() => setSourceImage(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-colors">×</button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                      </svg>
                      <div className="text-sm">拖拽或点击上传源图</div>
                      <div className="text-xs opacity-60">PNG / JPG / WebP · Ctrl+V 粘贴</div>
                      <button onClick={() => sourceInputRef.current?.click()} className="btn-primary text-xs px-4 py-1.5">选择文件</button>
                      <input ref={sourceInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleSourceFileChange} />
                    </div>
                  )}
                </div>

                {(sourceImage || targetImage) && (
                  <button
                    onClick={() => {
                      const s = sourceImage;
                      const t = targetImage;
                      setSourceImage(t);
                      setTargetImage(s);
                    }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-surface border border-border shadow-md flex items-center justify-center text-text-muted hover:text-primary hover:border-primary transition-colors"
                    title="交换左右图片"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </button>
                )}

                <div
                  id="guide-target-target"
                  className="flex-1 rounded-xl border-2 border-dashed border-border hover:border-accent transition-colors relative overflow-hidden flex flex-col bg-surface/30"
                  onDrop={(e) => handleDrop(e, 'target')}
                  onDragOver={handleDragOver}
                  onContextMenu={handleTargetContextMenu}
                >
                  {processedImageUrl ? (
                    <div className="flex-1 flex items-center justify-center p-3 relative">
                      <img src={processedImageUrl} alt="处理结果" className="max-w-full max-h-full object-contain rounded" />
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                        处理结果
                      </div>
                    </div>
                  ) : targetImage ? (
                    <div className="flex-1 flex items-center justify-center p-3 relative">
                      <img src={targetImage.dataUrl} alt="目标图" className="max-w-full max-h-full object-contain rounded" />
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                        目标图 · {targetImage.width}×{targetImage.height}
                      </div>
                      <button onClick={() => setTargetImage(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-colors">×</button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                      </svg>
                      <div className="text-sm">拖拽或点击上传目标图</div>
                      <div className="text-xs opacity-60">用于配色迁移</div>
                      <button onClick={() => targetInputRef.current?.click()} className="btn-ghost text-xs px-4 py-1.5">选择文件</button>
                      <input ref={targetInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleTargetFileChange} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {processedImageUrl && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setComparisonMode('side-by-side')}
                  className={`text-[10px] px-3 py-1 rounded-full transition-colors ${
                    comparisonMode === 'side-by-side'
                      ? 'bg-primary text-white'
                      : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                  }`}
                >
                  并排对比
                </button>
                <button
                  onClick={() => setComparisonMode('slider')}
                  className={`text-[10px] px-3 py-1 rounded-full transition-colors ${
                    comparisonMode === 'slider'
                      ? 'bg-primary text-white'
                      : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                  }`}
                >
                  滑块对比
                </button>
                <span className="text-[10px] text-text-muted ml-2">Tab 键切换</span>
              </div>
            )}

            {colors.length > 0 && (
              <div className="flex items-center justify-end px-2">
                <button
                  id="guide-target-save"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setPendingAction('登录后将自动收藏当前配色');
                      setShowLoginModal(true);
                      return;
                    }
                    addPalette([...colors], sourceType);
                    toast('配色方案已收藏', 'success');
                  }}
                  className="text-[10px] text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  收藏配色
                </button>
              </div>
            )}

            <PaletteBar />
          </div>

          <div id="guide-target-transfer" className={`flex flex-col border-l border-border bg-surface/90 backdrop-blur-sm transition-all duration-200 ${panelOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-surface">
              <span className="text-sm">{activeToolInfo?.icon}</span>
              <span className="text-xs font-semibold text-text-primary flex-1">{activeToolInfo?.label}</span>
              <button onClick={() => setPanelOpen(false)} className="text-text-muted hover:text-text-primary transition-colors p-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
              {renderPanel()}
            </div>
          </div>

          {!panelOpen && (
            <button
              onClick={() => setPanelOpen(true)}
              className="w-8 flex items-center justify-center border-l border-border hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
              title="展开工具面板"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
