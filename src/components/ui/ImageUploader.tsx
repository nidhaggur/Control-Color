import React, { useCallback, useRef, useState } from 'react';
import { readFileAsDataUrl, isImageFile, loadImage, imageToCanvas, canvasToDataUrl, generateThumbnail } from '../../utils/imageUtils';
import type { CCImageInfo } from '../../types';

interface ImageUploaderProps {
  onImageLoad: (imageData: CCImageInfo) => void;
  label?: string;
  className?: string;
}

export default function ImageUploader({ onImageLoad, label = '上传图片', className = '' }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!isImageFile(file)) {
      setError('不支持的文件格式，请使用 PNG、JPG 或 WebP');
      return;
    }
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const img = await loadImage(dataUrl);
      const canvas = imageToCanvas(img);
      const finalUrl = canvasToDataUrl(canvas);
      onImageLoad({
        id: Date.now().toString(),
        dataUrl: finalUrl,
        width: canvas.width,
        height: canvas.height,
        name: file.name,
      });
    } catch {
      setError('图片加载失败，请重试');
    }
  }, [onImageLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) processFile(file);
        return;
      }
    }
  }, [processFile]);

  const handleUrlLoad = useCallback(async () => {
    if (!urlInput.trim()) return;
    setError(null);
    try {
      const img = await loadImage(urlInput.trim());
      const canvas = imageToCanvas(img);
      const finalUrl = canvasToDataUrl(canvas);
      onImageLoad({
        id: Date.now().toString(),
        dataUrl: finalUrl,
        width: canvas.width,
        height: canvas.height,
        name: 'url-image',
      });
      setUrlInput('');
      setShowUrlInput(false);
    } catch {
      setError('无法加载该图片，请检查 URL 或尝试本地上传');
    }
  }, [urlInput, onImageLoad]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center ${className}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
    >
      <div
        className={`
          w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-3
          border-2 border-dashed rounded-lg cursor-pointer transition-all duration-fast
          ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-text-muted hover:bg-surface/50'}
        `}
        onClick={() => inputRef.current?.click()}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span className="text-text-secondary text-sm">{label}</span>
        <span className="text-text-muted text-xs">拖拽 / 点击 / Ctrl+V 粘贴</span>

        <button
          onClick={(e) => { e.stopPropagation(); setShowUrlInput(!showUrlInput); }}
          className="text-xs text-primary hover:text-primary-hover underline mt-1"
        >
          输入图片 URL
        </button>

        {showUrlInput && (
          <div className="flex gap-1 mt-2 w-3/4" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="input text-xs py-1 flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlLoad()}
            />
            <button onClick={handleUrlLoad} className="btn-primary text-xs py-1 px-2">
              加载
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="absolute bottom-2 left-2 right-2 bg-red-600/90 text-white text-xs px-3 py-2 rounded-md flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:opacity-70">✕</button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
