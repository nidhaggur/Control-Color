import { useRef, useEffect, useCallback, useState } from 'react';
import { hslToHex } from '../../utils/colorUtils';

interface WheelThumb {
  hue: number;
  saturation: number;
  lightness: number;
}

interface ColorWheelProps {
  thumbs: WheelThumb[];
  activeIndex: number;
  onThumbsChange: (thumbs: WheelThumb[]) => void;
  onActiveChange: (index: number) => void;
  size?: number;
  harmonyLocked?: boolean;
  onBaseDrag?: (deltaHue: number) => void;
}

const HANDLE_R = 14;
const HIT_R = 28;

export default function ColorWheel({
  thumbs,
  activeIndex,
  onThumbsChange,
  onActiveChange,
  size = 280,
  harmonyLocked = false,
  onBaseDrag,
}: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const prevHueRef = useRef(0);
  const [brightness, setBrightness] = useState(() => thumbs[activeIndex]?.lightness ?? 50);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 20;
  const innerR = 36;

  useEffect(() => {
    const t = thumbs[activeIndex];
    if (t) setBrightness(t.lightness);
  }, [activeIndex, thumbs]);

  const hslToRgbLocal = useCallback((h: number, s: number, l: number): [number, number, number] => {
    const sN = s / 100;
    const lN = l / 100;
    const c = (1 - Math.abs(2 * lN - 1)) * sN;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lN - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }, []);

  const drawWheel = useCallback((ctx: CanvasRenderingContext2D) => {
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= innerR - 1 && dist <= outerR + 1) {
          const angle = Math.atan2(dy, dx);
          let hue = (angle * 180) / Math.PI;
          if (hue < 0) hue += 360;
          const satRaw = ((dist - innerR) / (outerR - innerR)) * 100;
          const sat = Math.max(0, Math.min(100, satRaw));

          let alpha = 255;
          if (dist < innerR + 1) alpha = Math.round((dist - innerR + 1) * 255);
          if (dist > outerR - 1) alpha = Math.round((outerR + 1 - dist) * 255);
          alpha = Math.max(0, Math.min(255, alpha));

          const [r, g, b] = hslToRgbLocal(hue, sat, brightness);
          const idx = (y * size + x) * 4;
          d[idx] = r;
          d[idx + 1] = g;
          d[idx + 2] = b;
          d[idx + 3] = alpha;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 0.5, 0, Math.PI * 2);
    ctx.stroke();

    const centerColor = hslToHex(thumbs[activeIndex]?.hue ?? 0, thumbs[activeIndex]?.saturation ?? 0, brightness);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR - 6);
    grad.addColorStop(0, centerColor);
    grad.addColorStop(1, 'rgba(30,30,30,0.95)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hslToHex(thumbs[activeIndex]?.hue ?? 0, thumbs[activeIndex]?.saturation ?? 0, brightness).toUpperCase(), cx, cy);
  }, [size, cx, cy, innerR, outerR, brightness, hslToRgbLocal, thumbs, activeIndex]);

  const drawHandles = useCallback((ctx: CanvasRenderingContext2D) => {
    thumbs.forEach((thumb, i) => {
      const rad = (thumb.hue * Math.PI) / 180;
      const dist = innerR + (thumb.saturation / 100) * (outerR - innerR);
      const hx = cx + Math.cos(rad) * dist;
      const hy = cy + Math.sin(rad) * dist;
      const isActive = i === activeIndex;

      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(hx, hy, HANDLE_R + 2, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(hx, hy, HANDLE_R, 0, Math.PI * 2);
      ctx.fillStyle = hslToHex(thumb.hue, thumb.saturation, thumb.lightness);
      ctx.fill();
      ctx.strokeStyle = isActive ? '#fff' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.stroke();

      if (isActive) {
        ctx.beginPath();
        ctx.arc(hx, hy, HANDLE_R + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${isActive ? 12 : 11}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, hx, hy);
    });
  }, [thumbs, activeIndex, cx, cy, innerR, outerR]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    drawWheel(ctx);
    drawHandles(ctx);
  }, [drawWheel, drawHandles, size]);

  useEffect(() => { draw(); }, [draw]);

  const getPosFromEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement> | PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      return { x, y };
    },
    [],
  );

  const getHSLFromPoint = useCallback(
    (x: number, y: number): { hue: number; saturation: number } | null => {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < innerR - 8 || dist > outerR + 8) return null;

      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      const saturation = Math.max(0, Math.min(100, ((dist - innerR) / (outerR - innerR)) * 100));
      return { hue: Math.round(angle * 10) / 10, saturation: Math.round(saturation) };
    },
    [cx, cy, innerR, outerR],
  );

  const findClosestThumb = useCallback(
    (x: number, y: number): number => {
      let minDist = Infinity;
      let closest = 0;
      thumbs.forEach((thumb, i) => {
        const rad = (thumb.hue * Math.PI) / 180;
        const dist = innerR + (thumb.saturation / 100) * (outerR - innerR);
        const hx = cx + Math.cos(rad) * dist;
        const hy = cy + Math.sin(rad) * dist;
        const d = Math.sqrt((x - hx) ** 2 + (y - hy) ** 2);
        if (d < minDist) {
          minDist = d;
          closest = i;
        }
      });
      return closest;
    },
    [thumbs, cx, cy, innerR, outerR],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const pos = getPosFromEvent(e);
      if (!pos) return;

      const idx = findClosestThumb(pos.x, pos.y);
      onActiveChange(idx);
      draggingRef.current = true;

      const hsl = getHSLFromPoint(pos.x, pos.y);
      if (hsl) {
        if (harmonyLocked && idx === 0 && onBaseDrag) {
          prevHueRef.current = hsl.hue;
        }
        const newThumbs = [...thumbs];
        newThumbs[idx] = { ...newThumbs[idx], hue: hsl.hue, saturation: hsl.saturation };
        onThumbsChange(newThumbs);
      }

      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    },
    [thumbs, getPosFromEvent, findClosestThumb, getHSLFromPoint, onActiveChange, onThumbsChange, harmonyLocked, onBaseDrag],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return;
      const pos = getPosFromEvent(e);
      if (!pos) return;

      const hsl = getHSLFromPoint(pos.x, pos.y);
      if (hsl) {
        if (harmonyLocked && activeIndex === 0 && onBaseDrag) {
          const delta = hsl.hue - prevHueRef.current;
          if (Math.abs(delta) > 0.1) {
            onBaseDrag(delta);
            prevHueRef.current = hsl.hue;
          }
        } else {
          const newThumbs = [...thumbs];
          newThumbs[activeIndex] = { ...newThumbs[activeIndex], hue: hsl.hue, saturation: hsl.saturation };
          onThumbsChange(newThumbs);
        }
      }
    },
    [thumbs, activeIndex, getPosFromEvent, getHSLFromPoint, onThumbsChange, harmonyLocked, onBaseDrag],
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleBrightnessChange = useCallback(
    (val: number) => {
      setBrightness(val);
      const newThumbs = thumbs.map((t) => ({ ...t, lightness: val }));
      onThumbsChange(newThumbs);
    },
    [thumbs, onThumbsChange],
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="touch-none cursor-crosshair"
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div className="w-full flex items-center gap-3 px-1">
        <span className="text-[10px] text-text-muted w-5 text-right shrink-0">L</span>
        <div className="flex-1 relative h-3">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(to right, hsl(${thumbs[activeIndex]?.hue ?? 0}, ${thumbs[activeIndex]?.saturation ?? 100}%, 0%), hsl(${thumbs[activeIndex]?.hue ?? 0}, ${thumbs[activeIndex]?.saturation ?? 100}%, 50%), hsl(${thumbs[activeIndex]?.hue ?? 0}, ${thumbs[activeIndex]?.saturation ?? 100}%, 100%))`,
            }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={brightness}
            onChange={(e) => handleBrightnessChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none"
            style={{
              left: `calc(${brightness}% - 8px)`,
              backgroundColor: hslToHex(thumbs[activeIndex]?.hue ?? 0, thumbs[activeIndex]?.saturation ?? 100, brightness),
            }}
          />
        </div>
        <span className="text-[10px] text-text-muted w-6 text-right shrink-0">{brightness}</span>
      </div>
    </div>
  );
}
