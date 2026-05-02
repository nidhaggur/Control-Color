import ExtractionPanel from './ExtractionPanel';
import TransferPanel from './TransferPanel';
import { usePaletteStore } from '../../stores/paletteStore';
import { useImageStore } from '../../stores/imageStore';

export default function QuickActionsPanel() {
  const { colors } = usePaletteStore();
  const { sourceImage, targetImage } = useImageStore();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <h3 className="text-xs font-semibold text-text-primary">配色提取</h3>
          {sourceImage && (
            <span className="text-[9px] text-text-muted bg-surface-hover px-1.5 py-0.5 rounded ml-auto">已加载源图</span>
          )}
        </div>
        <ExtractionPanel />
      </div>

      <div className="border-t border-border/50" />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <h3 className="text-xs font-semibold text-text-primary">配色迁移</h3>
          {colors.length > 0 && (
            <span className="text-[9px] text-text-muted bg-surface-hover px-1.5 py-0.5 rounded ml-auto">{colors.length}色就绪</span>
          )}
        </div>
        <TransferPanel />
      </div>
    </div>
  );
}
