// ============================================
// Mesh3D - Core Type Definitions
// ============================================

import type * as THREE from 'three';

// --- AI Provider Types ---
export type AIProvider = 'meshy' | 'tripo' | 'stability' | 'demo';

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  icon: string;
  apiKeyRequired: boolean;
  maxImageSize: number; // MB
  supportedFormats: ExportFormat[];
  estimatedTime: string;
  pricing: string;
}

// --- Generation Types ---
export type GenerationStatus = 'idle' | 'uploading' | 'processing' | 'generating' | 'texturing' | 'completed' | 'failed';

export interface GenerationSettings {
  provider: AIProvider;
  quality: QualityTier;
  polyCount: PolyCount;
  textureResolution: TextureResolution;
  outputFormat: ExportFormat;
  generatePBR: boolean;
  autoCenter: boolean;
  smoothNormals: boolean;
}

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';
export type PolyCount = 'low' | 'medium' | 'high' | 'ultra';
export type TextureResolution = 512 | 1024 | 2048 | 4096;
export type ExportFormat = 'glb' | 'gltf' | 'obj' | 'stl' | 'usdz' | 'fbx';

export interface GenerationJob {
  id: string;
  status: GenerationStatus;
  progress: number; // 0-100
  provider: AIProvider;
  sourceImage: ImageFile;
  settings: GenerationSettings;
  result?: GenerationResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
  estimatedTimeRemaining?: number;
}

export interface GenerationResult {
  modelUrl: string;
  modelBlob?: Blob;
  thumbnailUrl?: string;
  textureUrls?: {
    diffuse?: string;
    normal?: string;
    roughness?: string;
    metalness?: string;
    ao?: string;
  };
  metadata: ModelMetadata;
}

// --- Image Types ---
export interface ImageFile {
  id: string;
  file: File;
  url: string;
  thumbnail: string;
  name: string;
  size: number;
  width: number;
  height: number;
  type: string;
}

// --- Model Types ---
export interface ModelMetadata {
  vertices: number;
  faces: number;
  triangles: number;
  fileSize: number;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  dimensions: { width: number; height: number; depth: number };
  hasTextures: boolean;
  hasPBR: boolean;
  format: ExportFormat;
}

export interface ModelEntry {
  id: string;
  name: string;
  sourceImage: ImageFile;
  provider: AIProvider;
  settings: GenerationSettings;
  result: GenerationResult;
  createdAt: number;
  tags: string[];
  favorite: boolean;
}

// --- 3D Viewer Types ---
export type ViewerMode = 'orbit' | 'pan' | 'zoom';
export type MaterialMode = 'pbr' | 'wireframe' | 'normals' | 'flat' | 'depth' | 'uv';
export type EnvironmentPreset = 'studio' | 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'city';

export interface ViewerSettings {
  autoRotate: boolean;
  autoRotateSpeed: number;
  showGrid: boolean;
  showAxes: boolean;
  showBoundingBox: boolean;
  showWireframeOverlay: boolean;
  materialMode: MaterialMode;
  environment: EnvironmentPreset;
  backgroundColor: string;
  ambientIntensity: number;
  directionalIntensity: number;
  exposure: number;
  toneMapping: THREE.ToneMapping;
  enableShadows: boolean;
  pixelRatio: number;
}

// --- Batch Processing Types ---
export interface BatchJob {
  id: string;
  items: BatchItem[];
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'cancelled';
  parallelProcessing: boolean;
  maxConcurrent: number;
  createdAt: number;
  completedAt?: number;
}

export interface BatchItem {
  id: string;
  image: ImageFile;
  settings: GenerationSettings;
  status: GenerationStatus;
  progress: number;
  result?: GenerationResult;
  error?: string;
}

// --- Comparison Types ---
export interface ComparisonPair {
  id: string;
  original: ImageFile;
  model: ModelEntry;
  depthMap?: string;
}

// --- Settings Types ---
export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  qualityTier: QualityTier;
  defaultProvider: AIProvider;
  defaultSettings: GenerationSettings;
  apiKeys: Record<AIProvider, string>;
  maxConcurrentJobs: number;
  autoSaveToGallery: boolean;
  enableNotifications: boolean;
  language: string;
}

// --- Toast / Notification Types ---
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

// --- Keyboard Shortcut Types ---
export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  description: string;
  action: () => void;
  category: string;
}
