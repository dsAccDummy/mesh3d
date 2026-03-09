// ============================================
// Mesh3D - AI Provider Engine
// Multi-provider abstraction for Image-to-3D
// ============================================

import type {
  AIProvider,
  AIProviderConfig,
  GenerationJob,
  GenerationResult,
  GenerationSettings,
  GenerationStatus,
  ImageFile,
  ModelMetadata
} from '$lib/types';
import { generateId } from '$lib/utils/utils';

// --- Provider Configurations ---
export const PROVIDER_CONFIGS: Record<AIProvider, AIProviderConfig> = {
  meshy: {
    id: 'meshy',
    name: 'Meshy AI',
    description: 'Industry-leading quality with PBR textures. Best for production assets.',
    icon: 'M',
    apiKeyRequired: true,
    maxImageSize: 20,
    supportedFormats: ['glb', 'gltf', 'obj', 'stl', 'fbx', 'usdz'],
    estimatedTime: '30-90 seconds',
    pricing: '$0.10-$0.30 per model'
  },
  tripo: {
    id: 'tripo',
    name: 'Tripo AI',
    description: 'Fast generation with multi-view support. Great for rapid prototyping.',
    icon: 'T',
    apiKeyRequired: true,
    maxImageSize: 20,
    supportedFormats: ['glb', 'gltf', 'obj', 'stl', 'fbx'],
    estimatedTime: '25-100 seconds',
    pricing: '$0.10-$0.30 per model'
  },
  stability: {
    id: 'stability',
    name: 'Stability AI SF3D',
    description: 'Stable Diffusion powered 3D generation. Consistent and reliable.',
    icon: 'S',
    apiKeyRequired: true,
    maxImageSize: 10,
    supportedFormats: ['glb', 'gltf', 'obj'],
    estimatedTime: '20-60 seconds',
    pricing: 'Credits-based'
  },
  demo: {
    id: 'demo',
    name: 'Demo Mode',
    description: 'Try the full workflow with sample 3D models. No API key needed.',
    icon: 'D',
    apiKeyRequired: false,
    maxImageSize: 20,
    supportedFormats: ['glb', 'gltf', 'obj', 'stl', 'fbx', 'usdz'],
    estimatedTime: '5-8 seconds',
    pricing: 'Free'
  }
};

// --- Abstract Provider Interface ---
interface ProviderAdapter {
  startGeneration(image: ImageFile, settings: GenerationSettings, apiKey: string): Promise<string>;
  pollStatus(taskId: string, apiKey: string): Promise<{ status: GenerationStatus; progress: number; resultUrl?: string }>;
  getResult(taskId: string, apiKey: string): Promise<GenerationResult>;
}

// --- Meshy AI Provider ---
class MeshyProvider implements ProviderAdapter {
  private baseUrl = 'https://api.meshy.ai/v2';

  async startGeneration(image: ImageFile, settings: GenerationSettings, apiKey: string): Promise<string> {
    const formData = new FormData();
    formData.append('image_file', image.file);
    formData.append('enable_pbr', String(settings.generatePBR));
    formData.append('ai_model', 'meshy-4');
    formData.append('topology', settings.polyCount === 'low' ? 'triangle' : 'quad');
    formData.append('target_polycount', this._polyCountValue(settings.polyCount).toString());

    const res = await fetch(`${this.baseUrl}/image-to-3d`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    });

    if (!res.ok) throw new Error(`Meshy API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.result;
  }

  async pollStatus(taskId: string, apiKey: string) {
    const res = await fetch(`${this.baseUrl}/image-to-3d/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error(`Poll error: ${res.status}`);
    const data = await res.json();

    const statusMap: Record<string, GenerationStatus> = {
      PENDING: 'uploading',
      IN_PROGRESS: 'generating',
      SUCCEEDED: 'completed',
      FAILED: 'failed'
    };

    return {
      status: statusMap[data.status] || 'processing',
      progress: data.progress || 0,
      resultUrl: data.model_urls?.glb
    };
  }

  async getResult(taskId: string, apiKey: string): Promise<GenerationResult> {
    const res = await fetch(`${this.baseUrl}/image-to-3d/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await res.json();

    return {
      modelUrl: data.model_urls?.glb || data.model_urls?.obj,
      thumbnailUrl: data.thumbnail_url,
      textureUrls: {
        diffuse: data.texture_urls?.base_color,
        normal: data.texture_urls?.normal,
        roughness: data.texture_urls?.roughness,
        metalness: data.texture_urls?.metallic
      },
      metadata: {
        vertices: data.mesh_info?.vertex_count || 0,
        faces: data.mesh_info?.face_count || 0,
        triangles: data.mesh_info?.triangle_count || 0,
        fileSize: 0,
        boundingBox: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
        dimensions: { width: 2, height: 2, depth: 2 },
        hasTextures: true,
        hasPBR: true,
        format: 'glb'
      }
    };
  }

  private _polyCountValue(tier: string): number {
    return { low: 10000, medium: 50000, high: 150000, ultra: 300000 }[tier] || 50000;
  }
}

// --- Tripo AI Provider ---
class TripoProvider implements ProviderAdapter {
  private baseUrl = 'https://api.tripo3d.ai/v2/openapi';

  async startGeneration(image: ImageFile, settings: GenerationSettings, apiKey: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', image.file);

    // First upload the image
    const uploadRes = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    });
    if (!uploadRes.ok) throw new Error(`Upload error: ${uploadRes.status}`);
    const uploadData = await uploadRes.json();

    // Then start generation
    const genRes = await fetch(`${this.baseUrl}/task`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'image_to_model',
        file: { file_token: uploadData.data.image_token },
        model_version: 'v2.0-20240919'
      })
    });
    if (!genRes.ok) throw new Error(`Generation error: ${genRes.status}`);
    const genData = await genRes.json();
    return genData.data.task_id;
  }

  async pollStatus(taskId: string, apiKey: string) {
    const res = await fetch(`${this.baseUrl}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await res.json();

    const statusMap: Record<string, GenerationStatus> = {
      queued: 'uploading',
      running: 'generating',
      success: 'completed',
      failed: 'failed'
    };

    return {
      status: statusMap[data.data.status] || 'processing',
      progress: data.data.progress || 0,
      resultUrl: data.data.output?.model
    };
  }

  async getResult(taskId: string, apiKey: string): Promise<GenerationResult> {
    const res = await fetch(`${this.baseUrl}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await res.json();

    return {
      modelUrl: data.data.output?.model || '',
      metadata: {
        vertices: 0, faces: 0, triangles: 0, fileSize: 0,
        boundingBox: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
        dimensions: { width: 2, height: 2, depth: 2 },
        hasTextures: true, hasPBR: false, format: 'glb'
      }
    };
  }
}

// --- Stability AI SF3D Provider ---
class StabilityProvider implements ProviderAdapter {
  private baseUrl = 'https://api.stability.ai/v2beta/3d';

  async startGeneration(image: ImageFile, settings: GenerationSettings, apiKey: string): Promise<string> {
    const formData = new FormData();
    formData.append('image', image.file);
    formData.append('texture_resolution', settings.textureResolution.toString());
    formData.append('foreground_ratio', '0.85');

    const res = await fetch(`${this.baseUrl}/stable-fast-3d`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    });

    if (!res.ok) throw new Error(`Stability API error: ${res.status}`);
    // SF3D returns the model directly (synchronous)
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return `direct:${url}:${blob.size}`;
  }

  async pollStatus(taskId: string, _apiKey: string) {
    // SF3D is synchronous - if we have a taskId starting with 'direct:', it's done
    if (taskId.startsWith('direct:')) {
      return { status: 'completed' as GenerationStatus, progress: 100, resultUrl: taskId.split(':')[1] };
    }
    return { status: 'processing' as GenerationStatus, progress: 50 };
  }

  async getResult(taskId: string, _apiKey: string): Promise<GenerationResult> {
    const parts = taskId.split(':');
    const url = parts[1];
    const size = parseInt(parts[2]) || 0;

    return {
      modelUrl: url,
      metadata: {
        vertices: 0, faces: 0, triangles: 0, fileSize: size,
        boundingBox: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
        dimensions: { width: 2, height: 2, depth: 2 },
        hasTextures: true, hasPBR: false, format: 'glb'
      }
    };
  }
}

// --- Demo Provider (No API Key) ---
class DemoProvider implements ProviderAdapter {
  async startGeneration(_image: ImageFile, _settings: GenerationSettings, _apiKey: string): Promise<string> {
    return `demo_${generateId()}`;
  }

  async pollStatus(_taskId: string, _apiKey: string) {
    return { status: 'completed' as GenerationStatus, progress: 100 };
  }

  async getResult(_taskId: string, _apiKey: string): Promise<GenerationResult> {
    // Return a demo result with realistic metadata
    const verts = 8000 + Math.floor(Math.random() * 12000);
    return {
      modelUrl: 'demo://generated-model.glb',
      thumbnailUrl: undefined,
      metadata: {
        vertices: verts,
        faces: Math.floor(verts * 0.65),
        triangles: Math.floor(verts * 1.3),
        fileSize: verts * 120,
        boundingBox: { min: { x: -1, y: -0.5, z: -1 }, max: { x: 1, y: 1.5, z: 1 } },
        dimensions: { width: 2, height: 2, depth: 2 },
        hasTextures: true,
        hasPBR: true,
        format: 'glb'
      }
    };
  }
}

// --- Provider Factory ---
const providers: Record<AIProvider, ProviderAdapter> = {
  meshy: new MeshyProvider(),
  tripo: new TripoProvider(),
  stability: new StabilityProvider(),
  demo: new DemoProvider()
};

// --- Main Generation Engine ---
export class GenerationEngine {
  private pollIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private cache = new Map<string, GenerationResult>();

  async generate(
    image: ImageFile,
    settings: GenerationSettings,
    apiKey: string,
    onProgress: (job: Partial<GenerationJob>) => void
  ): Promise<GenerationResult> {
    const provider = providers[settings.provider];
    if (!provider) throw new Error(`Unknown provider: ${settings.provider}`);

    // Check cache
    const cacheKey = `${image.id}_${settings.provider}_${settings.quality}_${settings.polyCount}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      onProgress({ status: 'completed', progress: 100, result: cached });
      return cached;
    }

    try {
      // Stage 1: Upload
      onProgress({ status: 'uploading', progress: 5 });
      const taskId = await provider.startGeneration(image, settings, apiKey);
      onProgress({ status: 'processing', progress: 15 });

      // Stage 2: Poll for completion
      const result = await this._pollUntilComplete(taskId, settings.provider, apiKey, onProgress);

      // Stage 3: Get final result
      onProgress({ status: 'texturing', progress: 90 });
      const finalResult = result.resultUrl
        ? await provider.getResult(taskId, apiKey)
        : await provider.getResult(taskId, apiKey);

      // Cache result
      this.cache.set(cacheKey, finalResult);
      onProgress({ status: 'completed', progress: 100, result: finalResult });

      return finalResult;
    } catch (error) {
      onProgress({ status: 'failed', progress: 0, error: (error as Error).message });
      throw error;
    }
  }

  private _pollUntilComplete(
    taskId: string,
    providerId: AIProvider,
    apiKey: string,
    onProgress: (job: Partial<GenerationJob>) => void
  ): Promise<{ status: GenerationStatus; progress: number; resultUrl?: string }> {
    return new Promise((resolve, reject) => {
      const provider = providers[providerId];
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes at 1s interval

      const check = async () => {
        try {
          attempts++;
          if (attempts > maxAttempts) {
            this.stopPolling(taskId);
            reject(new Error('Generation timed out'));
            return;
          }

          const status = await provider.pollStatus(taskId, apiKey);
          onProgress({ status: status.status, progress: Math.min(status.progress, 85) });

          if (status.status === 'completed') {
            this.stopPolling(taskId);
            resolve(status);
          } else if (status.status === 'failed') {
            this.stopPolling(taskId);
            reject(new Error('Generation failed on provider side'));
          }
        } catch (err) {
          // Retry on network errors (up to 3 retries)
          if (attempts % 3 === 0) {
            this.stopPolling(taskId);
            reject(err);
          }
        }
      };

      // For demo provider, resolve immediately
      if (providerId === 'demo') {
        setTimeout(async () => {
          try {
            const status = await provider.pollStatus(taskId, apiKey);
            resolve(status);
          } catch (e) { reject(e); }
        }, 100);
        return;
      }

      const interval = setInterval(check, 1000);
      this.pollIntervals.set(taskId, interval);
      check(); // First check immediately
    });
  }

  stopPolling(taskId: string) {
    const interval = this.pollIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(taskId);
    }
  }

  stopAll() {
    for (const [id] of this.pollIntervals) {
      this.stopPolling(id);
    }
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

// Singleton engine instance
export const engine = new GenerationEngine();
