import type { CCImageInfo } from '../types';

const MAX_SIZE = 4096;

let imageIdCounter = 0;

export function loadImageFromFile(file: File): Promise<CCImageInfo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          id: `img-${Date.now()}-${++imageIdCounter}`,
          dataUrl,
          width: img.width,
          height: img.height,
          name: file.name,
        });
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
}

export function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  let { width, height } = img;

  if (width > MAX_SIZE || height > MAX_SIZE) {
    const scale = MAX_SIZE / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export function canvasToImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d')!;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = createCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, type: string = 'image/png', quality?: number): string {
  return canvas.toDataURL(type, quality);
}

export function generateThumbnail(canvas: HTMLCanvasElement, maxSize: number = 200): string {
  const { width, height } = canvas;
  const scale = maxSize / Math.max(width, height);
  const newW = Math.round(width * scale);
  const newH = Math.round(height * scale);

  const thumb = createCanvas(newW, newH);
  const ctx = thumb.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0, newW, newH);
  return thumb.toDataURL('image/webp', 0.8);
}

export function getDisplaySize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export function isImageFile(file: File): boolean {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
}

export function grayscaleAverage(r: number, g: number, b: number): number {
  return Math.round((r + g + b) / 3);
}

export function grayscaleWeighted(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

export function grayscaleDesaturate(r: number, g: number, b: number): number {
  return Math.round((Math.max(r, g, b) + Math.min(r, g, b)) / 2);
}

export function applyGrayscale(
  imageData: ImageData,
  method: 'average' | 'weighted' | 'desaturate',
): ImageData {
  const fn = method === 'average' ? grayscaleAverage
    : method === 'weighted' ? grayscaleWeighted
    : grayscaleDesaturate;

  const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  const data = result.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = fn(data[i], data[i + 1], data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = gray;
  }

  return result;
}

export function applyChannelIsolation(
  imageData: ImageData,
  channel: 'r' | 'g' | 'b',
): ImageData {
  const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  const data = result.data;
  const idx = channel === 'r' ? 0 : channel === 'g' ? 1 : 2;

  for (let i = 0; i < data.length; i += 4) {
    const val = data[i + idx];
    data[i] = channel === 'r' ? val : 0;
    data[i + 1] = channel === 'g' ? val : 0;
    data[i + 2] = channel === 'b' ? val : 0;
  }

  return result;
}

export function applyChannelIntensity(
  imageData: ImageData,
  intensity: { r: number; g: number; b: number },
): ImageData {
  const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  const data = result.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, Math.round(data[i] * (intensity.r / 100))));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(data[i + 1] * (intensity.g / 100))));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(data[i + 2] * (intensity.b / 100))));
  }

  return result;
}

export function applyChannelSwap(
  imageData: ImageData,
  swap: { r: 'r' | 'g' | 'b'; g: 'r' | 'g' | 'b'; b: 'r' | 'g' | 'b' },
): ImageData {
  const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  const data = result.data;
  const src = imageData.data;
  const idxMap = { r: 0, g: 1, b: 2 };

  for (let i = 0; i < data.length; i += 4) {
    data[i] = src[i + idxMap[swap.r]];
    data[i + 1] = src[i + idxMap[swap.g]];
    data[i + 2] = src[i + idxMap[swap.b]];
    data[i + 3] = src[i + 3];
  }

  return result;
}

export function applyChannelMix(
  imageData: ImageData,
  weights: { r: number; g: number; b: number },
): ImageData {
  const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  const data = result.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] * (weights.r / 100);
    const g = data[i + 1] * (weights.g / 100);
    const b = data[i + 2] * (weights.b / 100);
    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  return result;
}

export function computeHistogram(imageData: ImageData): number[] {
  const histogram = new Array(256).fill(0);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[gray]++;
  }

  return histogram;
}

export function flipImage(imageData: ImageData, direction: 'horizontal' | 'vertical'): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  const rd = result.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = direction === 'horizontal'
        ? (y * width + (width - 1 - x)) * 4
        : ((height - 1 - y) * width + x) * 4;
      rd[dstIdx] = data[srcIdx];
      rd[dstIdx + 1] = data[srcIdx + 1];
      rd[dstIdx + 2] = data[srcIdx + 2];
      rd[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return result;
}

export function rotateImage90(imageData: ImageData, clockwise: boolean = true): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(height, width);
  const rd = result.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      let dstIdx: number;
      if (clockwise) {
        dstIdx = (x * height + (height - 1 - y)) * 4;
      } else {
        dstIdx = ((width - 1 - x) * height + y) * 4;
      }
      rd[dstIdx] = data[srcIdx];
      rd[dstIdx + 1] = data[srcIdx + 1];
      rd[dstIdx + 2] = data[srcIdx + 2];
      rd[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return result;
}

export function cropImage(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number,
): ImageData {
  const result = new ImageData(width, height);
  const rd = result.data;
  const sd = imageData.data;
  const sw = imageData.width;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcIdx = ((y + row) * sw + (x + col)) * 4;
      const dstIdx = (row * width + col) * 4;
      rd[dstIdx] = sd[srcIdx];
      rd[dstIdx + 1] = sd[srcIdx + 1];
      rd[dstIdx + 2] = sd[srcIdx + 2];
      rd[dstIdx + 3] = sd[srcIdx + 3];
    }
  }

  return result;
}
