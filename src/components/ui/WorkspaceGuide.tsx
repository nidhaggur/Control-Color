import { useState, useEffect, useCallback } from 'react';
import { useImageStore } from '../../stores/imageStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { useAuthStore } from '../../stores/authStore';

const GUIDE_KEY = 'cc-workspace-guide-state';

type GuideState = 'active' | 'skipped' | 'completed';

interface GuidePersisted {
  state: GuideState;
  currentStep: number;
}

function loadGuideState(): GuidePersisted {
  try {
    const raw = localStorage.getItem(GUIDE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { state: 'active', currentStep: 0 };
}

function saveGuideState(s: GuidePersisted) {
  localStorage.setItem(GUIDE_KEY, JSON.stringify(s));
}

interface StepDef {
  title: string;
  desc: string;
  targetId: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const STEPS: StepDef[] = [
  {
    title: '第 1 步：上传源图',
    desc: '将你想提取配色的图片拖入左侧区域，或点击上传。源图将自动提取主色。',
    targetId: 'guide-target-source',
    position: 'bottom',
  },
  {
    title: '第 2 步：上传目标图',
    desc: '将目标风格图片拖入右侧区域。系统将分析目标图的色彩风格。',
    targetId: 'guide-target-target',
    position: 'bottom',
  },
  {
    title: '第 3 步：应用配色迁移',
    desc: '在右侧工具面板中选择「色彩迁移」，调整强度滑块，预览迁移效果。',
    targetId: 'guide-target-transfer',
    position: 'left',
  },
  {
    title: '第 4 步：收藏配色方案',
    desc: '点击 PaletteBar 上的收藏按钮保存当前配色。注册账户可跨设备同步收藏。',
    targetId: 'guide-target-save',
    position: 'top',
  },
];

export default function WorkspaceGuide() {
  const [persisted, setPersisted] = useState(loadGuideState);
  const [currentStep, setCurrentStep] = useState(persisted.currentStep);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowClass, setArrowClass] = useState('');

  const { sourceImage, targetImage } = useImageStore();
  const { colors } = usePaletteStore();
  const { isAuthenticated, setShowLoginModal } = useAuthStore();

  const isActive = persisted.state === 'active';

  const advanceTo = useCallback((step: number) => {
    setCurrentStep(step);
    setPersisted(prev => {
      const next = { ...prev, currentStep: step };
      saveGuideState(next);
      return next;
    });
  }, []);

  const skip = useCallback(() => {
    setPersisted({ state: 'skipped', currentStep: 0 });
    saveGuideState({ state: 'skipped', currentStep: 0 });
  }, []);

  const complete = useCallback(() => {
    setPersisted({ state: 'completed', currentStep: 0 });
    saveGuideState({ state: 'completed', currentStep: 0 });
  }, []);

  useEffect(() => {
    if (!isActive) return;
    if (currentStep === 0 && sourceImage) advanceTo(1);
    if (currentStep === 1 && targetImage) advanceTo(2);
    if (currentStep === 2 && colors.length > 0) advanceTo(3);
  }, [isActive, currentStep, sourceImage, targetImage, colors, advanceTo]);

  useEffect(() => {
    if (!isActive) return;
    const step = STEPS[currentStep];
    if (!step) return;

    const updatePosition = () => {
      const el = document.getElementById(step.targetId);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 12;

      let top = 0;
      let left = 0;
      let cls = '';

      switch (step.position) {
        case 'bottom':
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2;
          cls = 'guide-arrow-top';
          break;
        case 'top':
          top = rect.top - gap;
          left = rect.left + rect.width / 2;
          cls = 'guide-arrow-bottom';
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - gap;
          cls = 'guide-arrow-right';
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + gap;
          cls = 'guide-arrow-left';
          break;
      }

      setTooltipStyle({
        position: 'fixed',
        top,
        left,
        transform: step.position === 'bottom' || step.position === 'top'
          ? 'translateX(-50%)'
          : step.position === 'left'
            ? 'translate(-100%, -50%)'
            : 'translateY(-50%)',
        zIndex: 10000,
      });
      setArrowClass(cls);
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isActive, currentStep]);

  if (!isActive) return null;

  const step = STEPS[currentStep];
  if (!step) return null;

  const isLast = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      complete();
    } else {
      advanceTo(currentStep + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'none' }}>
      <div className="absolute inset-0 bg-black/40" style={{ pointerEvents: 'auto' }} onClick={skip} />

      <div
        className={`bg-surface border border-border rounded-xl shadow-2xl p-4 w-72 ${arrowClass}`}
        style={{ ...tooltipStyle, pointerEvents: 'auto' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted">
            {currentStep + 1} / {STEPS.length}
          </span>
          <button onClick={skip} className="text-xs text-text-muted hover:text-text-primary transition-colors">
            跳过引导
          </button>
        </div>

        <h3 className="text-sm font-semibold text-text-primary mb-1">{step.title}</h3>
        <p className="text-xs text-text-secondary leading-relaxed mb-3">{step.desc}</p>

        {currentStep === 3 && !isAuthenticated && (
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-full text-xs text-primary border border-primary/30 rounded-md py-1.5 mb-2 hover:bg-primary/10 transition-colors"
          >
            注册账户，同步收藏
          </button>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentStep ? 'bg-primary' : i < currentStep ? 'bg-primary/40' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <button onClick={handleNext} className="btn-primary text-xs px-3 py-1">
            {isLast ? '完成' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}
