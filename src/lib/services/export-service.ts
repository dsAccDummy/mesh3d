// ============================================
// Mesh3D - Export & Download Service
// Multi-format 3D model export with ZIP packaging
// ============================================

import type { ExportFormat, ModelMetadata } from '$lib/types';

// --- Format Metadata ---
export const FORMAT_INFO: Record<ExportFormat, {
  name: string;
  extension: string;
  mime: string;
  description: string;
  multiFile: boolean;
  supportsTextures: boolean;
  supportsPBR: boolean;
}> = {
  glb: {
    name: 'GLB (Binary glTF)',
    extension: '.glb',
    mime: 'model/gltf-binary',
    description: 'Single binary file with embedded textures. Best for web & sharing.',
    multiFile: false,
    supportsTextures: true,
    supportsPBR: true
  },
  gltf: {
    name: 'glTF',
    extension: '.gltf',
    mime: 'model/gltf+json',
    description: 'JSON-based format with separate texture files.',
    multiFile: true,
    supportsTextures: true,
    supportsPBR: true
  },
  obj: {
    name: 'OBJ + MTL',
    extension: '.obj',
    mime: 'text/plain',
    description: 'Universal format with material file. Wide compatibility.',
    multiFile: true,
    supportsTextures: true,
    supportsPBR: false
  },
  stl: {
    name: 'STL',
    extension: '.stl',
    mime: 'application/sla',
    description: 'Mesh-only format ideal for 3D printing. No textures.',
    multiFile: false,
    supportsTextures: false,
    supportsPBR: false
  },
  usdz: {
    name: 'USDZ (Apple AR)',
    extension: '.usdz',
    mime: 'model/vnd.usdz+zip',
    description: 'Apple AR Quick Look format for iOS/macOS.',
    multiFile: false,
    supportsTextures: true,
    supportsPBR: true
  },
  fbx: {
    name: 'FBX',
    extension: '.fbx',
    mime: 'application/octet-stream',
    description: 'Autodesk format. Best for Unity & game engines.',
    multiFile: false,
    supportsTextures: true,
    supportsPBR: true
  }
};

// --- Export Options ---
export interface ExportOptions {
  format: ExportFormat;
  includeTextures: boolean;
  includePBR: boolean;
  compressTextures: boolean;
  textureQuality: number; // 0-1
  fileName: string;
}

const DEFAULT_OPTIONS: ExportOptions = {
  format: 'glb',
  includeTextures: true,
  includePBR: true,
  compressTextures: false,
  textureQuality: 0.9,
  fileName: 'mesh3d-model'
};

// --- File Size Estimation ---
export function estimateFileSize(
  metadata: ModelMetadata,
  format: ExportFormat,
  includeTextures: boolean,
  textureResolution: number
): number {
  // Base mesh size estimation (bytes per vertex varies by format)
  const bytesPerVertex: Record<ExportFormat, number> = {
    glb: 48,   // position + normal + uv + indices, binary
    gltf: 80,  // JSON overhead
    obj: 60,   // text-based
    stl: 50,   // triangles only
    usdz: 52,  // similar to glb
    fbx: 55    // binary
  };

  let size = metadata.vertices * (bytesPerVertex[format] || 50);

  // Add texture size estimation
  if (includeTextures && FORMAT_INFO[format].supportsTextures) {
    const texSize = textureResolution * textureResolution * 3; // RGB bytes
    const compressionRatio = format === 'glb' || format === 'usdz' ? 0.15 : 0.3;
    const numTextures = FORMAT_INFO[format].supportsPBR ? 4 : 1; // diffuse, normal, roughness, metalness
    size += texSize * compressionRatio * numTextures;
  }

  return Math.round(size);
}

// --- Download Helpers ---
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadFromUrl(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const blob = await response.blob();
    downloadBlob(blob, filename);
  } catch (error) {
    throw new Error(`Failed to download: ${(error as Error).message}`);
  }
}

// --- ZIP Packaging ---
export async function createZipPackage(
  files: { name: string; data: Blob | ArrayBuffer | string }[],
  zipName: string
): Promise<Blob> {
  // Dynamic import JSZip for code splitting
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (const file of files) {
    if (typeof file.data === 'string') {
      zip.file(file.name, file.data);
    } else {
      zip.file(file.name, file.data);
    }
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

// --- Main Export Function ---
export async function exportModel(
  modelBlob: Blob | null,
  modelUrl: string,
  options: Partial<ExportOptions> = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const formatInfo = FORMAT_INFO[opts.format];
  const filename = `${opts.fileName}${formatInfo.extension}`;

  // If we have the blob directly, download it
  if (modelBlob) {
    if (formatInfo.multiFile) {
      // Package multi-file formats as ZIP
      const zipFiles: { name: string; data: Blob | string }[] = [
        { name: filename, data: modelBlob }
      ];

      // Add placeholder texture files for multi-file formats
      if (opts.includeTextures) {
        zipFiles.push({ name: `${opts.fileName}_diffuse.png`, data: 'placeholder' });
        if (opts.includePBR && formatInfo.supportsPBR) {
          zipFiles.push({ name: `${opts.fileName}_normal.png`, data: 'placeholder' });
          zipFiles.push({ name: `${opts.fileName}_roughness.png`, data: 'placeholder' });
          zipFiles.push({ name: `${opts.fileName}_metalness.png`, data: 'placeholder' });
        }
      }

      // Add README
      zipFiles.push({
        name: 'README.txt',
        data: `Mesh3D Export\n=============\nFormat: ${formatInfo.name}\nExported: ${new Date().toISOString()}\n\nFiles included:\n${zipFiles.map(f => `- ${f.name}`).join('\n')}\n`
      });

      const zipBlob = await createZipPackage(zipFiles, opts.fileName);
      downloadBlob(zipBlob, `${opts.fileName}.zip`);
    } else {
      downloadBlob(modelBlob, filename);
    }
  } else if (modelUrl && !modelUrl.startsWith('demo://')) {
    // Download from URL
    await downloadFromUrl(modelUrl, filename);
  } else {
    // Demo mode - create a placeholder file
    const demoContent = `// Mesh3D Demo Export\n// This is a placeholder file from Demo Mode.\n// Connect an AI provider API key to generate real 3D models.\n// Format: ${formatInfo.name}\n// Generated: ${new Date().toISOString()}\n`;
    const blob = new Blob([demoContent], { type: 'text/plain' });
    downloadBlob(blob, `${opts.fileName}-demo.txt`);
  }
}

// --- Batch Export ---
export async function exportBatch(
  models: { blob: Blob | null; url: string; name: string }[],
  format: ExportFormat
): Promise<void> {
  const formatInfo = FORMAT_INFO[format];
  const zipFiles: { name: string; data: Blob | string }[] = [];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const name = `${model.name || `model_${i + 1}`}${formatInfo.extension}`;

    if (model.blob) {
      zipFiles.push({ name, data: model.blob });
    } else if (model.url && !model.url.startsWith('demo://')) {
      try {
        const response = await fetch(model.url);
        const blob = await response.blob();
        zipFiles.push({ name, data: blob });
      } catch {
        zipFiles.push({ name: `${name}.error.txt`, data: `Failed to download: ${model.url}` });
      }
    }
  }

  if (zipFiles.length === 0) {
    throw new Error('No models to export');
  }

  zipFiles.push({
    name: 'manifest.json',
    data: JSON.stringify({
      generator: 'Mesh3D',
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      format: formatInfo.name,
      modelCount: models.length
    }, null, 2)
  });

  const zipBlob = await createZipPackage(zipFiles, 'mesh3d-batch');
  downloadBlob(zipBlob, `mesh3d-batch-${Date.now()}.zip`);
}
