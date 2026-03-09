// ============================================
// Mesh3D - Utility Functions
// ============================================

// --- ID Generation ---
export function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// --- File Helpers ---
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function isValidImageType(file: File): boolean {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp'];
  return validTypes.includes(file.type);
}

export function isValidImageSize(file: File, maxMB: number = 20): boolean {
  return file.size <= maxMB * 1024 * 1024;
}

// --- Image Processing ---
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function createThumbnail(file: File, maxSize: number = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Depth Map Generation (Client-side) ---
export function generateDepthMap(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const out = output.data;

  // Convert to grayscale luminance
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    out[i] = out[i + 1] = out[i + 2] = luminance;
    out[i + 3] = 255;
  }

  // Apply Gaussian blur for smoother depth
  const kernel = [1, 4, 7, 4, 1, 4, 16, 26, 16, 4, 7, 26, 41, 26, 7, 4, 16, 26, 16, 4, 1, 4, 7, 4, 1];
  const kernelSize = 5;
  const kernelSum = kernel.reduce((a, b) => a + b, 0);
  const half = Math.floor(kernelSize / 2);
  const blurred = new Uint8ClampedArray(out.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          const py = Math.min(Math.max(y + ky, 0), height - 1);
          const idx = (py * width + px) * 4;
          const ki = (ky + half) * kernelSize + (kx + half);
          sum += out[idx] * kernel[ki];
        }
      }
      const idx = (y * width + x) * 4;
      const val = sum / kernelSum;
      blurred[idx] = blurred[idx + 1] = blurred[idx + 2] = val;
      blurred[idx + 3] = 255;
    }
  }

  return new ImageData(blurred, width, height);
}

// --- Time Helpers ---
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// --- Debounce ---
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as any;
}

// --- Clamp ---
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// --- CSS Class Helper ---
export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
