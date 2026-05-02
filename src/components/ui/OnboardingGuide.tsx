import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

const STEPS = [
  {
    title: '欢迎使用 Control Color',
    desc: '专业的色彩设计工具，帮助您快速提取、创建和管理配色方案。',
    icon: '🎨',
  },
  {
    title: '上传图片提取配色',
    desc: '将图片拖拽到左侧区域，使用提取工具自动识别主色调。支持 K-Means 聚类和中位切分算法。',
    icon: '📸',
  },
  {
    title: '配色迁移与编辑',
    desc: '将一张图片的配色风格迁移到另一张图片，或使用色轮手动创建配色方案。',
    icon: '🔄',
  },
  {
    title: '导出与收藏',
    desc: '支持导出为 CSS、Tailwind、JSON、SVG 等格式。收藏常用配色方案，随时调用。',
    icon: '💾',
  },
  {
    title: '快捷键',
    desc: 'Ctrl+S 收藏 · Ctrl+E 导出 · Ctrl+Z 撤销 · Ctrl+Shift+Z 重做 · Tab 切换对比模式 · Esc 关闭面板',
    icon: '⌨️',
  },
];

export default function OnboardingGuide() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const { language } = useSettingsStore();

  useEffect(() => {
    const seen = localStorage.getItem('control-color-onboarding-seen');
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem('control-color-onboarding-seen', 'true');
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-border">
        <div className="p-8 text-center">
          <div className="text-5xl mb-4">{current.icon}</div>
          <h2 className="text-lg font-bold text-text-primary mb-2">{current.title}</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{current.desc}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === step ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>

        <div className="flex border-t border-border">
          <button
            onClick={handleClose}
            className="flex-1 py-3 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            跳过
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={handleNext}
            className="flex-1 py-3 text-xs text-primary font-medium hover:bg-primary/5 transition-colors"
          >
            {isLast ? '开始使用' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}
