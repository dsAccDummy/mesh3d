// ============================================
// Mesh3D - Global Reactive Stores (Svelte 5 Runes)
// ============================================

import type {
  AppSettings,
  GenerationJob,
  ModelEntry,
  BatchJob,
  Toast,
  ViewerSettings,
  GenerationSettings,
  AIProvider,
  ImageFile
} from '$lib/types';

// --- Default Values ---
const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  provider: 'demo',
  quality: 'high',
  polyCount: 'medium',
  textureResolution: 2048,
  outputFormat: 'glb',
  generatePBR: true,
  autoCenter: true,
  smoothNormals: true
};

const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  autoRotate: true,
  autoRotateSpeed: 2,
  showGrid: true,
  showAxes: false,
  showBoundingBox: false,
  showWireframeOverlay: false,
  materialMode: 'pbr',
  environment: 'studio',
  backgroundColor: '#0a0a1a',
  ambientIntensity: 0.5,
  directionalIntensity: 1.2,
  exposure: 1.0,
  toneMapping: 0, // THREE.NoToneMapping placeholder
  enableShadows: true,
  pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'dark',
  qualityTier: 'high',
  defaultProvider: 'demo',
  defaultSettings: DEFAULT_GENERATION_SETTINGS,
  apiKeys: { meshy: '', tripo: '', stability: '', demo: '' },
  maxConcurrentJobs: 2,
  autoSaveToGallery: true,
  enableNotifications: true,
  language: 'en'
};

// --- App State ---
class AppState {
  // Navigation
  sidebarOpen = $state(false);
  mobileMenuOpen = $state(false);
  currentPage = $state('/');

  // Theme
  theme = $state<'dark' | 'light' | 'system'>('dark');
  isDark = $derived(this.theme === 'dark' || (this.theme === 'system' && this._prefersDark));
  private _prefersDark = $state(true);

  // Settings
  settings = $state<AppSettings>(DEFAULT_APP_SETTINGS);
  viewerSettings = $state<ViewerSettings>(DEFAULT_VIEWER_SETTINGS);
  generationSettings = $state<GenerationSettings>(DEFAULT_GENERATION_SETTINGS);

  // Generation
  currentJob = $state<GenerationJob | null>(null);
  jobHistory = $state<GenerationJob[]>([]);
  isGenerating = $derived(this.currentJob?.status === 'processing' || this.currentJob?.status === 'generating' || this.currentJob?.status === 'texturing');

  // Gallery
  gallery = $state<ModelEntry[]>([]);
  galleryViewMode = $state<'grid' | 'list'>('grid');
  gallerySearch = $state('');
  gallerySort = $state<'newest' | 'oldest' | 'name' | 'size'>('newest');

  // Batch
  batchJobs = $state<BatchJob[]>([]);
  activeBatch = $state<BatchJob | null>(null);

  // Upload
  uploadedImage = $state<ImageFile | null>(null);
  dragOver = $state(false);

  // 3D Model
  loadedModelUrl = $state<string | null>(null);
  modelMetadata = $state<any>(null);

  // Toasts
  toasts = $state<Toast[]>([]);

  // Device
  isMobile = $state(false);
  isTablet = $state(false);
  performanceTier = $state<'low' | 'medium' | 'high'>('high');

  constructor() {
    if (typeof window !== 'undefined') {
      this._prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isMobile = window.innerWidth < 768;
      this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      this._detectPerformance();
      this._loadFromStorage();
    }
  }

  // --- Toast Methods ---
  addToast(toast: Omit<Toast, 'id'>) {
    const id = crypto.randomUUID();
    this.toasts = [...this.toasts, { ...toast, id }];
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => this.removeToast(id), duration);
    }
    return id;
  }

  removeToast(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  // --- Settings Persistence ---
  saveSettings() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mesh3d_settings', JSON.stringify(this.settings));
      localStorage.setItem('mesh3d_viewer', JSON.stringify(this.viewerSettings));
      localStorage.setItem('mesh3d_generation', JSON.stringify(this.generationSettings));
      localStorage.setItem('mesh3d_theme', this.theme);
    }
  }

  private _loadFromStorage() {
    try {
      const settings = localStorage.getItem('mesh3d_settings');
      if (settings) this.settings = { ...DEFAULT_APP_SETTINGS, ...JSON.parse(settings) };

      const viewer = localStorage.getItem('mesh3d_viewer');
      if (viewer) this.viewerSettings = { ...DEFAULT_VIEWER_SETTINGS, ...JSON.parse(viewer) };

      const gen = localStorage.getItem('mesh3d_generation');
      if (gen) this.generationSettings = { ...DEFAULT_GENERATION_SETTINGS, ...JSON.parse(gen) };

      const theme = localStorage.getItem('mesh3d_theme');
      if (theme) this.theme = theme as 'dark' | 'light' | 'system';
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }

  private _detectPerformance() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      this.performanceTier = 'low';
      return;
    }
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    const isMobileGPU = /mali|adreno|powervr|apple gpu/i.test(renderer);
    const cores = navigator.hardwareConcurrency || 2;
    if (isMobileGPU || cores <= 2) {
      this.performanceTier = 'low';
    } else if (cores <= 4) {
      this.performanceTier = 'medium';
    } else {
      this.performanceTier = 'high';
    }
  }

  // --- Reset ---
  resetSettings() {
    this.settings = DEFAULT_APP_SETTINGS;
    this.viewerSettings = DEFAULT_VIEWER_SETTINGS;
    this.generationSettings = DEFAULT_GENERATION_SETTINGS;
    this.theme = 'dark';
    this.saveSettings();
  }
}

// Singleton
export const app = new AppState();

// Convenience exports
export { DEFAULT_GENERATION_SETTINGS, DEFAULT_VIEWER_SETTINGS, DEFAULT_APP_SETTINGS };
