import type { Color, ExportFormat } from '../types';

export function exportAsCss(colors: Color[]): string {
  const lines = colors.map((c, i) => {
    const name = c.name || `color-${i + 1}`;
    return `  --${name}: ${c.hex}; /* rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b}) */`;
  });
  return `:root {\n${lines.join('\n')}\n}`;
}

export function exportAsTailwind(colors: Color[]): string {
  const colorObj: Record<string, string> = {};
  colors.forEach((c, i) => {
    const name = c.name || `color-${i + 1}`;
    colorObj[name] = c.hex;
  });
  return `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(colorObj, null, 8).replace(/^/gm, '      ').trim()}
    }
  }
}`;
}

export function exportAsJson(colors: Color[], name: string = '配色方案'): string {
  return JSON.stringify({
    name,
    colors: colors.map((c) => ({
      hex: c.hex,
      rgb: c.rgb,
      hsl: c.hsl,
      oklch: c.oklch,
      name: c.name,
    })),
  }, null, 2);
}

export function exportAsSvg(colors: Color[], width?: number, height?: number): string {
  const blockWidth = width ? width / colors.length : 80;
  const svgWidth = width || blockWidth * colors.length;
  const svgHeight = height || 120;
  const colorHeight = svgHeight * 0.7;
  const textHeight = svgHeight * 0.3;

  const blocks = colors.map((c, i) => {
    const x = i * blockWidth;
    return `  <rect x="${x}" y="0" width="${blockWidth}" height="${colorHeight}" fill="${c.hex}" />
  <text x="${x + blockWidth / 2}" y="${colorHeight + textHeight * 0.65}" text-anchor="middle" font-family="monospace" font-size="11" fill="#888">${c.hex}</text>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
${blocks}
</svg>`;
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string, format: 'png' | 'webp' = 'png') {
  const mimeType = format === 'png' ? 'image/png' : 'image/webp';
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, mimeType, 0.95);
}

export function exportPalette(colors: Color[], format: ExportFormat, name?: string) {
  switch (format) {
    case 'css':
      downloadFile(exportAsCss(colors), 'palette.css', 'text/css');
      break;
    case 'tailwind':
      downloadFile(exportAsTailwind(colors), 'tailwind-colors.js', 'application/javascript');
      break;
    case 'json':
      downloadFile(exportAsJson(colors, name), 'palette.json', 'application/json');
      break;
    case 'svg':
      downloadFile(exportAsSvg(colors), 'palette.svg', 'image/svg+xml');
      break;
  }
}
