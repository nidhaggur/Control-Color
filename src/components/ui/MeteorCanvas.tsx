import { useRef, useEffect, useCallback, useState } from 'react';
import { generateMeteorPalette } from '../../utils/presetUtils';
import { usePaletteStore } from '../../stores/paletteStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { useAuthStore } from '../../stores/authStore';
import type { Color } from '../../types';

interface Meteor {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  colors: Color[];
  colorIndex: number;
  life: number;
  maxLife: number;
  size: number;
  particles: Particle[];
  captured: boolean;
  scale: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

interface TextChar {
  char: string;
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  bold: boolean;
  width: number;
  height: number;
}

interface CapturedMeteor {
  id: number;
  x: number;
  y: number;
  colors: Color[];
  fadeAlpha: number;
}

export interface HeroTextBlock {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold: boolean;
  lineHeight: number;
}

const MAX_METEORS = 5;
const COOLDOWN_MS = 400;
const CAPTURE_RADIUS = 300;

const SPRING_K = 0.08;
const SPRING_DAMPING = 0.82;
const COLLISION_BASE_R = 60;

let audioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
};

function playMeteorSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function playCaptureSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

interface MeteorCanvasProps {
  heroTextBlocks?: HeroTextBlock[];
}

export default function MeteorCanvas({ heroTextBlocks }: MeteorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meteorsRef = useRef<Meteor[]>([]);
  const capturedRef = useRef<CapturedMeteor[]>([]);
  const textCharsRef = useRef<TextChar[]>([]);
  const lastClickRef = useRef(0);
  const meteorIdRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const [showPopup, setShowPopup] = useState<{ x: number; y: number; colors: Color[] } | null>(null);
  const { setColors, setSourceType } = usePaletteStore();
  const { addPalette } = useCollectionStore();
  const { isAuthenticated, setShowLoginModal, setPendingAction } = useAuthStore();

  const buildTextChars = useCallback((blocks: HeroTextBlock[], canvasW: number) => {
    const chars: TextChar[] = [];
    const fontFamily = '"Inter", "Noto Sans SC", system-ui, sans-serif';

    for (const block of blocks) {
      const fontSize = block.fontSize;
      const fontWeight = block.bold ? '700' : '400';
      const text = block.text;
      const lineHeight = block.lineHeight || fontSize * 1.4;

      const offscreen = document.createElement('canvas');
      const octx = offscreen.getContext('2d');
      if (!octx) continue;
      octx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

      let currentX = block.x;
      let currentY = block.y;
      const maxX = canvasW - 40;

      for (const char of text.split('')) {
        if (char === '\n') {
          currentX = block.x;
          currentY += lineHeight;
          continue;
        }
        const metrics = octx.measureText(char);
        const charW = metrics.width;
        const charH = fontSize;

        if (currentX + charW > maxX && currentX > block.x + 10) {
          currentX = block.x;
          currentY += lineHeight;
        }

        chars.push({
          char,
          originX: currentX + charW / 2,
          originY: currentY + charH / 2,
          x: currentX + charW / 2,
          y: currentY + charH / 2,
          vx: 0,
          vy: 0,
          size: fontSize,
          alpha: block.color === 'muted' ? 0.5 : 1,
          color: block.color,
          bold: block.bold,
          width: charW,
          height: charH,
        });

        currentX += charW;
      }
    }

    textCharsRef.current = chars;
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      if (heroTextBlocks && heroTextBlocks.length > 0) {
        buildTextChars(heroTextBlocks, w);
      }
    }
  }, [heroTextBlocks, buildTextChars]);

  const spawnMeteor = useCallback((colors?: Color[]) => {
    if (meteorsRef.current.length >= MAX_METEORS) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const palette = colors || generateMeteorPalette(5 + Math.floor(Math.random() * 2));

    const startX = canvas.width * (0.05 + Math.random() * 0.3);
    const startY = -40 - Math.random() * 60;

    const targetX = canvas.width * (0.4 + Math.random() * 0.5);
    const targetY = canvas.height * (0.55 + Math.random() * 0.35);

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy);
    const lifetimeSec = 1.8 + Math.random() * 0.7;
    const maxLife = Math.round(lifetimeSec * 60);
    const speed = dist / maxLife;

    const meteor: Meteor = {
      id: ++meteorIdRef.current,
      x: startX,
      y: startY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      colors: palette,
      colorIndex: 0,
      life: 0,
      maxLife,
      size: 8 + Math.random() * 6,
      particles: [],
      captured: false,
      scale: 1,
    };
    meteorsRef.current.push(meteor);
    playMeteorSound();
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const now = Date.now();
    if (now - lastClickRef.current < COOLDOWN_MS) return;
    lastClickRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    for (const meteor of meteorsRef.current) {
      if (meteor.captured) continue;
      const dist = Math.hypot(clickX - meteor.x, clickY - meteor.y);
      if (dist < CAPTURE_RADIUS * meteor.scale) {
        meteor.captured = true;
        meteor.scale = 1.3;
        playCaptureSound();
        setShowPopup({
          x: Math.min(e.clientX, window.innerWidth - 280),
          y: Math.min(e.clientY, window.innerHeight - 220),
          colors: meteor.colors,
        });
        return;
      }
    }

    spawnMeteor();
  }, [spawnMeteor]);

  const handleSaveCaptured = useCallback((colors: Color[]) => {
    if (!isAuthenticated) {
      setPendingAction('登录后将自动收藏流星配色');
      setShowLoginModal(true);
      return;
    }
    setColors([...colors]);
    setSourceType('meteor');
    addPalette([...colors], 'meteor');
    setShowPopup(null);
  }, [setColors, setSourceType, addPalette, isAuthenticated, setPendingAction, setShowLoginModal]);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  useEffect(() => {
    if (heroTextBlocks && heroTextBlocks.length > 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        buildTextChars(heroTextBlocks, canvas.width);
      }
    }
  }, [heroTextBlocks, buildTextChars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontFamily = '"Inter", "Noto Sans SC", system-ui, sans-serif';

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const chars = textCharsRef.current;
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        c.vx += (c.originX - c.x) * SPRING_K;
        c.vy += (c.originY - c.y) * SPRING_K;
        c.vx *= SPRING_DAMPING;
        c.vy *= SPRING_DAMPING;
        c.x += c.vx;
        c.y += c.vy;
      }

      for (const m of meteorsRef.current) {
        if (m.captured) continue;
        const collisionR = COLLISION_BASE_R * (m.size / 10);
        for (let i = 0; i < chars.length; i++) {
          const c = chars[i];
          const ddx = c.x - m.x;
          const ddy = c.y - m.y;
          const dist = Math.hypot(ddx, ddy);
          if (dist < collisionR && dist > 0) {
            const overlap = (collisionR - dist) / collisionR;
            const push = overlap * overlap * 12;
            c.vx += (ddx / dist) * push;
            c.vy += (ddy / dist) * push;
          }
        }
      }

      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        ctx.save();
        ctx.font = `${c.bold ? '700' : '400'} ${c.size}px ${fontFamily}`;
        ctx.fillStyle = c.color;
        ctx.globalAlpha = c.alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.char, c.x, c.y);
        ctx.restore();
      }

      meteorsRef.current = meteorsRef.current.filter((m) => {
        m.life++;
        if (m.captured) {
          m.scale *= 0.94;
          if (m.scale < 0.08) {
            capturedRef.current.push({
              id: m.id, x: m.x, y: m.y, colors: m.colors, fadeAlpha: 1,
            });
            return false;
          }
        }

        if (m.life > m.maxLife && !m.captured) {
          capturedRef.current.push({
            id: m.id, x: m.x, y: Math.min(m.y, canvas.height - 50),
            colors: m.colors, fadeAlpha: 1,
          });
          return false;
        }

        if (!m.captured) {
          m.x += m.vx;
          m.y += m.vy;

          for (let i = 0; i < 4; i++) {
            m.particles.push({
              x: m.x + (Math.random() - 0.5) * 12,
              y: m.y + (Math.random() - 0.5) * 12,
              vx: (Math.random() - 0.5) * 2.5,
              vy: (Math.random() - 0.5) * 2.5 + 0.8,
              alpha: 0.9,
              size: 2 + Math.random() * 4,
              color: m.colors[m.colorIndex % m.colors.length].hex,
            });
          }
          m.colorIndex++;
        }

        const tailLength = 150;
        const headColor = m.colors[m.colorIndex % m.colors.length].hex;
        const gradient = ctx.createLinearGradient(
          m.x, m.y,
          m.x - m.vx * tailLength / 3, m.y - m.vy * tailLength / 3,
        );
        gradient.addColorStop(0, headColor + 'EE');
        gradient.addColorStop(0.3, headColor + '88');
        gradient.addColorStop(0.7, headColor + '33');
        gradient.addColorStop(1, 'transparent');

        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.scale(m.scale, m.scale);
        ctx.translate(-m.x, -m.y);

        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(
          m.x - m.vx * tailLength / 3 - m.vy * 4,
          m.y - m.vy * tailLength / 3 + m.vx * 4,
        );
        ctx.lineTo(
          m.x - m.vx * tailLength / 3 + m.vy * 4,
          m.y - m.vy * tailLength / 3 - m.vx * 4,
        );
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = headColor;
        ctx.shadowColor = headColor;
        ctx.shadowBlur = 25;
        ctx.fill();
        ctx.shadowBlur = 0;

        for (let r = 0; r < 3; r++) {
          ctx.beginPath();
          ctx.arc(
            m.x - m.vx * (r + 1) * 3,
            m.y - m.vy * (r + 1) * 3,
            m.size * (1.5 - r * 0.3),
            0, Math.PI * 2,
          );
          ctx.fillStyle = m.colors[(m.colorIndex + r + 1) % m.colors.length].hex + '66';
          ctx.fill();
        }

        ctx.restore();

        return true;
      });

      meteorsRef.current.forEach((m) => {
        m.particles = m.particles.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.018;
          if (p.alpha <= 0) return false;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
          ctx.fill();
          return true;
        });
      });

      capturedRef.current = capturedRef.current.filter((c) => {
        c.fadeAlpha -= 0.012;
        if (c.fadeAlpha <= 0) return false;

        const barWidth = Math.min(260, canvas.width * 0.35);
        const barHeight = 24;
        const barX = c.x - barWidth / 2;
        const barY = Math.min(c.y, canvas.height - 40);

        ctx.globalAlpha = c.fadeAlpha;
        c.colors.forEach((color, i) => {
          const segW = barWidth / c.colors.length;
          ctx.fillStyle = color.hex;
          ctx.beginPath();
          const r = 4;
          const x = barX + i * segW;
          const y = barY;
          const w = segW + 0.5;
          const isFirst = i === 0;
          const isLast = i === c.colors.length - 1;
          ctx.moveTo(x + (isFirst ? r : 0), y);
          ctx.lineTo(x + w - (isLast ? r : 0), y);
          if (isLast) ctx.arcTo(x + w, y, x + w, y + r, r);
          ctx.lineTo(x + w, y + barHeight - (isLast ? r : 0));
          if (isLast) ctx.arcTo(x + w, y + barHeight, x + w - r, y + barHeight, r);
          ctx.lineTo(x + (isFirst ? r : 0), y + barHeight);
          if (isFirst) ctx.arcTo(x, y + barHeight, x, y + barHeight - r, r);
          ctx.lineTo(x, y + (isFirst ? r : 0));
          if (isFirst) ctx.arcTo(x, y, x + r, y, r);
          ctx.closePath();
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        return true;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        onPointerDown={handlePointerDown}
        style={{ cursor: 'pointer' }}
      />
      {showPopup && (
        <div
          className="fixed z-[200] animate-fade-in"
          style={{ left: showPopup.x, top: showPopup.y }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-2xl p-4 min-w-[260px] backdrop-blur-md">
            <div className="text-sm font-medium text-text-primary mb-2">捕获了一颗流星配色!</div>
            <div className="flex gap-1 h-12 rounded-lg overflow-hidden mb-3">
              {showPopup.colors.map((c, i) => (
                <div
                  key={i}
                  className="flex-1 flex items-center justify-center group"
                  style={{ backgroundColor: c.hex }}
                >
                  <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: c.hsl.l > 60 ? '#000' : '#fff' }}>
                    {c.hex}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveCaptured(showPopup.colors)}
                className="btn-primary text-xs flex-1 py-2"
              >
                收藏此配色
              </button>
              <button
                onClick={() => setShowPopup(null)}
                className="btn-ghost text-xs px-3"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
