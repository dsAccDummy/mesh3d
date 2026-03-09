<script lang="ts">
  import { app } from '$lib/stores/stores.svelte';
  import { generateId, isValidImageType, isValidImageSize, createThumbnail, formatFileSize, generateDepthMap, loadImage } from '$lib/utils/utils';
  import type { ImageFile, GenerationSettings, AIProvider } from '$lib/types';

  // --- Local State ---
  let fileInput: HTMLInputElement;
  let depthCanvas: HTMLCanvasElement;
  let showDepthPreview = $state(false);
  let depthMapUrl = $state<string | null>(null);
  let isProcessingDepth = $state(false);
  let settingsExpanded = $state(true);
  let selectedTab = $state<'upload' | 'preview' | 'depth'>('upload');

  // --- Provider Configs ---
  const providers: { id: AIProvider; name: string; desc: string; badge: string; color: string }[] = [
    { id: 'meshy', name: 'Meshy AI', desc: 'Best quality PBR models', badge: 'PRO', color: 'text-purple-400' },
    { id: 'tripo', name: 'Tripo AI', desc: 'Fast multi-view generation', badge: 'FAST', color: 'text-cyan-400' },
    { id: 'stability', name: 'Stability SF3D', desc: 'Stable & consistent results', badge: 'NEW', color: 'text-green-400' },
    { id: 'demo', name: 'Demo Mode', desc: 'Preview with sample models', badge: 'FREE', color: 'text-yellow-400' }
  ];

  // --- File Handling ---
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    app.dragOver = true;
  }

  function handleDragLeave() {
    app.dragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    app.dragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) processFile(file);
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) processFile(file);
  }

  async function processFile(file: File) {
    if (!isValidImageType(file)) {
      app.addToast({ type: 'error', title: 'Invalid Format', message: 'Please upload PNG, JPG, WebP, or BMP images' });
      return;
    }
    if (!isValidImageSize(file, 20)) {
      app.addToast({ type: 'error', title: 'File Too Large', message: 'Maximum file size is 20MB' });
      return;
    }

    const url = URL.createObjectURL(file);
    const thumbnail = await createThumbnail(file);
    const img = await loadImage(url);

    app.uploadedImage = {
      id: generateId(),
      file,
      url,
      thumbnail,
      name: file.name,
      size: file.size,
      width: img.width,
      height: img.height,
      type: file.type
    };

    selectedTab = 'preview';
    app.addToast({ type: 'success', title: 'Image Loaded', message: `${file.name} (${img.width}x${img.height})` });

    // Auto-generate depth map
    generateDepthPreview();
  }

  async function generateDepthPreview() {
    if (!app.uploadedImage) return;
    isProcessingDepth = true;

    try {
      const img = await loadImage(app.uploadedImage.url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const maxDim = 512;
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const depthData = generateDepthMap(imageData);

      const depthCanvasEl = document.createElement('canvas');
      depthCanvasEl.width = canvas.width;
      depthCanvasEl.height = canvas.height;
      const depthCtx = depthCanvasEl.getContext('2d')!;
      depthCtx.putImageData(depthData, 0, 0);
      depthMapUrl = depthCanvasEl.toDataURL('image/png');
      showDepthPreview = true;
    } catch (err) {
      console.error('Depth map generation failed:', err);
    } finally {
      isProcessingDepth = false;
    }
  }

  function clearImage() {
    if (app.uploadedImage?.url) {
      URL.revokeObjectURL(app.uploadedImage.url);
    }
    app.uploadedImage = null;
    depthMapUrl = null;
    showDepthPreview = false;
    selectedTab = 'upload';
  }

  async function handleGenerate() {
    if (!app.uploadedImage) return;

    const job = {
      id: generateId(),
      status: 'uploading' as const,
      progress: 0,
      provider: app.generationSettings.provider,
      sourceImage: app.uploadedImage,
      settings: { ...app.generationSettings },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    app.currentJob = job;
    app.addToast({ type: 'info', title: 'Generation Started', message: `Using ${providers.find(p => p.id === job.provider)?.name}` });

    // Simulate progress for demo
    simulateGeneration(job.id);
  }

  function simulateGeneration(jobId: string) {
    const stages: { status: any; duration: number; progress: number }[] = [
      { status: 'uploading', duration: 800, progress: 10 },
      { status: 'processing', duration: 1500, progress: 30 },
      { status: 'generating', duration: 3000, progress: 70 },
      { status: 'texturing', duration: 2000, progress: 90 },
      { status: 'completed', duration: 500, progress: 100 }
    ];

    let delay = 0;
    stages.forEach(stage => {
      delay += stage.duration;
      setTimeout(() => {
        if (app.currentJob?.id === jobId) {
          app.currentJob = { ...app.currentJob, status: stage.status, progress: stage.progress, updatedAt: Date.now() };
          if (stage.status === 'completed') {
            app.currentJob = {
              ...app.currentJob,
              result: {
                modelUrl: 'demo://sample-model.glb',
                thumbnailUrl: app.uploadedImage?.thumbnail,
                metadata: {
                  vertices: 12500 + Math.floor(Math.random() * 5000),
                  faces: 8200 + Math.floor(Math.random() * 3000),
                  triangles: 16400 + Math.floor(Math.random() * 6000),
                  fileSize: 2.4 * 1024 * 1024,
                  boundingBox: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
                  dimensions: { width: 2, height: 2, depth: 2 },
                  hasTextures: true,
                  hasPBR: app.generationSettings.generatePBR,
                  format: app.generationSettings.outputFormat
                }
              }
            };
            app.addToast({ type: 'success', title: '3D Model Ready!', message: 'Your model has been generated successfully' });
          }
        }
      }, delay);
    });
  }

  // Reactive status helpers
  let statusLabel = $derived(
    app.currentJob ? {
      'idle': 'Ready',
      'uploading': 'Uploading image...',
      'processing': 'Analyzing image...',
      'generating': 'Generating 3D mesh...',
      'texturing': 'Applying textures...',
      'completed': 'Complete!',
      'failed': 'Generation failed'
    }[app.currentJob.status] || '' : ''
  );
</script>

<svelte:head>
  <title>Mesh3D - Image to 3D Generator</title>
</svelte:head>

<div class="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 lg:py-8">
  <!-- Hero Header -->
  <div class="text-center mb-8 lg:mb-10">
    <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
      <span class="gradient-text">Transform Images</span>
      <span class="text-surface-100"> into 3D</span>
    </h1>
    <p class="text-surface-200/50 text-sm sm:text-base max-w-2xl mx-auto">
      Upload any image and convert it into a high-quality 3D model with AI-powered generation,
      real-time depth preview, and multi-format export.
    </p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <!-- ===== LEFT COLUMN: Upload & Preview ===== -->
    <div class="lg:col-span-7 xl:col-span-8 space-y-5">

      <!-- Tab Switcher -->
      {#if app.uploadedImage}
        <div class="flex gap-1 p-1 rounded-xl bg-surface-900/50 w-fit">
          {#each [{ id: 'upload', label: 'Upload' }, { id: 'preview', label: 'Preview' }, { id: 'depth', label: 'Depth Map' }] as tab}
            <button
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all
                {selectedTab === tab.id ? 'bg-primary-500/20 text-primary-300' : 'text-surface-200/50 hover:text-surface-200'}"
              onclick={() => selectedTab = tab.id as any}
            >
              {tab.label}
            </button>
          {/each}
        </div>
      {/if}

      <!-- Upload Zone -->
      {#if selectedTab === 'upload' || !app.uploadedImage}
        <div
          class="relative glass rounded-2xl p-8 sm:p-12 transition-all duration-300 cursor-pointer group
            {app.dragOver ? 'border-primary-500/50 bg-primary-500/5 scale-[1.01]' : 'glass-hover'}"
          role="button"
          tabindex="0"
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
          onclick={() => fileInput.click()}
          onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
        >
          <input
            bind:this={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/bmp"
            class="hidden"
            onchange={handleFileSelect}
          />

          <div class="flex flex-col items-center text-center space-y-4">
            <!-- Upload Icon -->
            <div class="relative">
              <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center group-hover:from-primary-500/30 group-hover:to-accent-500/30 transition-all">
                <svg class="w-10 h-10 text-primary-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              {#if app.dragOver}
                <div class="absolute inset-0 rounded-2xl animate-pulse-glow"></div>
              {/if}
            </div>

            <div>
              <p class="text-lg font-semibold text-surface-100">
                {app.dragOver ? 'Drop your image here' : 'Drag & drop your image'}
              </p>
              <p class="text-sm text-surface-200/40 mt-1">
                or <span class="text-primary-400 underline underline-offset-2">browse files</span>
              </p>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-2 text-xs text-surface-200/30">
              <span class="badge badge-primary">PNG</span>
              <span class="badge badge-primary">JPG</span>
              <span class="badge badge-primary">WebP</span>
              <span class="badge badge-primary">BMP</span>
              <span>up to 20MB</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Image Preview -->
      {#if app.uploadedImage && selectedTab === 'preview'}
        <div class="glass rounded-2xl overflow-hidden animate-fade-in">
          <div class="relative">
            <img
              src={app.uploadedImage.url}
              alt={app.uploadedImage.name}
              class="w-full h-auto max-h-[500px] object-contain bg-surface-950"
            />
            <!-- Overlay info -->
            <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-white truncate max-w-[250px]">{app.uploadedImage.name}</p>
                  <p class="text-xs text-white/50">
                    {app.uploadedImage.width} x {app.uploadedImage.height} | {formatFileSize(app.uploadedImage.size)}
                  </p>
                </div>
                <button class="btn btn-ghost btn-sm text-white/70 hover:text-white" onclick={clearImage}>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Depth Map Preview -->
      {#if app.uploadedImage && selectedTab === 'depth'}
        <div class="glass rounded-2xl overflow-hidden animate-fade-in">
          {#if isProcessingDepth}
            <div class="flex flex-col items-center justify-center py-20">
              <div class="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin-slow"></div>
              <p class="text-sm text-surface-200/50 mt-4">Generating depth map...</p>
            </div>
          {:else if depthMapUrl}
            <div class="relative">
              <img
                src={depthMapUrl}
                alt="Depth Map"
                class="w-full h-auto max-h-[500px] object-contain bg-surface-950"
              />
              <div class="absolute top-3 left-3">
                <span class="badge badge-primary">Depth Map</span>
              </div>
              <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p class="text-xs text-white/50">
                  Client-side depth estimation - Lighter areas are closer, darker areas are further away
                </p>
              </div>
            </div>
          {:else}
            <div class="flex flex-col items-center justify-center py-20 text-surface-200/40">
              <p class="text-sm">No depth map generated yet</p>
              <button class="btn btn-secondary btn-sm mt-3" onclick={generateDepthPreview}>Generate Depth Map</button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Generation Progress -->
      {#if app.currentJob && app.isGenerating}
        <div class="glass rounded-2xl p-5 animate-scale-in">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <div class="w-4 h-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
              </div>
              <div>
                <p class="text-sm font-semibold text-surface-100">{statusLabel}</p>
                <p class="text-xs text-surface-200/40">{providers.find(p => p.id === app.currentJob?.provider)?.name}</p>
              </div>
            </div>
            <span class="text-sm font-mono text-primary-400">{app.currentJob.progress}%</span>
          </div>
          <div class="h-2 bg-surface-900 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-700 ease-out"
              style="width: {app.currentJob.progress}%"
            ></div>
          </div>
        </div>
      {/if}

      <!-- Completed Result Card -->
      {#if app.currentJob?.status === 'completed' && app.currentJob.result}
        <div class="glass rounded-2xl p-5 border-success/20 animate-scale-in">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
              <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-success">3D Model Generated!</p>
              <p class="text-xs text-surface-200/40">Ready to view, edit, and export</p>
            </div>
          </div>
          <!-- Model Stats Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-surface-900/50 rounded-xl p-3 text-center">
              <p class="text-lg font-bold text-surface-100">{(app.currentJob.result.metadata.vertices / 1000).toFixed(1)}K</p>
              <p class="text-[10px] text-surface-200/40 uppercase tracking-wider">Vertices</p>
            </div>
            <div class="bg-surface-900/50 rounded-xl p-3 text-center">
              <p class="text-lg font-bold text-surface-100">{(app.currentJob.result.metadata.faces / 1000).toFixed(1)}K</p>
              <p class="text-[10px] text-surface-200/40 uppercase tracking-wider">Faces</p>
            </div>
            <div class="bg-surface-900/50 rounded-xl p-3 text-center">
              <p class="text-lg font-bold text-surface-100">{(app.currentJob.result.metadata.fileSize / 1024 / 1024).toFixed(1)}MB</p>
              <p class="text-[10px] text-surface-200/40 uppercase tracking-wider">Size</p>
            </div>
            <div class="bg-surface-900/50 rounded-xl p-3 text-center">
              <p class="text-lg font-bold text-surface-100">{app.currentJob.result.metadata.format.toUpperCase()}</p>
              <p class="text-[10px] text-surface-200/40 uppercase tracking-wider">Format</p>
            </div>
          </div>
          <!-- Action buttons -->
          <div class="flex flex-wrap gap-2 mt-4">
            <a href="{import('$app/paths').then(m => m.base)}/gallery" class="btn btn-primary btn-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View in 3D
            </a>
            <button class="btn btn-secondary btn-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <button class="btn btn-ghost btn-sm" onclick={() => { app.currentJob = null; }}>
              Generate Another
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- ===== RIGHT COLUMN: Settings Panel ===== -->
    <div class="lg:col-span-5 xl:col-span-4 space-y-5">

      <!-- Provider Selection -->
      <div class="glass rounded-2xl p-5">
        <h3 class="text-sm font-semibold text-surface-100 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          AI Provider
        </h3>
        <div class="space-y-2">
          {#each providers as provider}
            <button
              class="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all
                {app.generationSettings.provider === provider.id
                  ? 'bg-primary-500/10 border border-primary-500/30'
                  : 'bg-surface-900/30 border border-transparent hover:border-white/5 hover:bg-surface-900/50'}"
              onclick={() => app.generationSettings.provider = provider.id}
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-surface-100">{provider.name}</span>
                  <span class="badge {provider.color} bg-white/5 text-[10px]">{provider.badge}</span>
                </div>
                <p class="text-xs text-surface-200/40 mt-0.5">{provider.desc}</p>
              </div>
              {#if app.generationSettings.provider === provider.id}
                <svg class="w-5 h-5 text-primary-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Generation Settings -->
      <div class="glass rounded-2xl overflow-hidden">
        <button
          class="w-full flex items-center justify-between p-5 text-left"
          onclick={() => settingsExpanded = !settingsExpanded}
        >
          <h3 class="text-sm font-semibold text-surface-100 flex items-center gap-2">
            <svg class="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Generation Settings
          </h3>
          <svg class="w-4 h-4 text-surface-200/40 transition-transform {settingsExpanded ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {#if settingsExpanded}
          <div class="px-5 pb-5 space-y-4 animate-slide-up">
            <!-- Quality -->
            <div>
              <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Quality</label>
              <div class="grid grid-cols-4 gap-1.5 mt-2">
                {#each ['low', 'medium', 'high', 'ultra'] as q}
                  <button
                    class="py-2 rounded-lg text-xs font-medium transition-all capitalize
                      {app.generationSettings.quality === q
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                        : 'bg-surface-900/30 text-surface-200/50 border border-transparent hover:bg-surface-900/50'}"
                    onclick={() => app.generationSettings.quality = q as any}
                  >
                    {q}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Polygon Count -->
            <div>
              <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Polygon Count</label>
              <div class="grid grid-cols-4 gap-1.5 mt-2">
                {#each [{ id: 'low', label: '10K' }, { id: 'medium', label: '50K' }, { id: 'high', label: '150K' }, { id: 'ultra', label: '300K' }] as pc}
                  <button
                    class="py-2 rounded-lg text-xs font-medium transition-all
                      {app.generationSettings.polyCount === pc.id
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                        : 'bg-surface-900/30 text-surface-200/50 border border-transparent hover:bg-surface-900/50'}"
                    onclick={() => app.generationSettings.polyCount = pc.id as any}
                  >
                    {pc.label}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Texture Resolution -->
            <div>
              <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Texture Resolution</label>
              <select
                class="select mt-2"
                value={app.generationSettings.textureResolution}
                onchange={(e) => app.generationSettings.textureResolution = parseInt((e.target as HTMLSelectElement).value) as any}
              >
                <option value={512}>512 x 512 (Fast)</option>
                <option value={1024}>1024 x 1024 (Balanced)</option>
                <option value={2048}>2048 x 2048 (High Quality)</option>
                <option value={4096}>4096 x 4096 (Ultra)</option>
              </select>
            </div>

            <!-- Output Format -->
            <div>
              <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Output Format</label>
              <select
                class="select mt-2"
                value={app.generationSettings.outputFormat}
                onchange={(e) => app.generationSettings.outputFormat = (e.target as HTMLSelectElement).value as any}
              >
                <option value="glb">GLB (Recommended)</option>
                <option value="gltf">glTF</option>
                <option value="obj">OBJ + MTL</option>
                <option value="stl">STL (3D Print)</option>
                <option value="usdz">USDZ (Apple AR)</option>
                <option value="fbx">FBX</option>
              </select>
            </div>

            <!-- Toggles -->
            <div class="space-y-3 pt-2">
              {#each [
                { key: 'generatePBR', label: 'Generate PBR Textures', desc: 'Normal, roughness, metalness maps' },
                { key: 'autoCenter', label: 'Auto-Center Model', desc: 'Center model at origin' },
                { key: 'smoothNormals', label: 'Smooth Normals', desc: 'Apply normal smoothing' }
              ] as toggle}
                <label class="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p class="text-sm text-surface-200/80 group-hover:text-surface-100 transition-colors">{toggle.label}</p>
                    <p class="text-[11px] text-surface-200/30">{toggle.desc}</p>
                  </div>
                  <div class="relative">
                    <input
                      type="checkbox"
                      class="sr-only peer"
                      checked={app.generationSettings[toggle.key as keyof GenerationSettings] as boolean}
                      onchange={(e) => (app.generationSettings as any)[toggle.key] = (e.target as HTMLInputElement).checked}
                    />
                    <div class="w-9 h-5 bg-surface-900 rounded-full peer-checked:bg-primary-500/40 transition-colors"></div>
                    <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-surface-200/50 rounded-full peer-checked:translate-x-4 peer-checked:bg-primary-400 transition-all"></div>
                  </div>
                </label>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Generate Button -->
      <button
        class="btn btn-primary btn-lg w-full group relative overflow-hidden"
        disabled={!app.uploadedImage || app.isGenerating}
        onclick={handleGenerate}
      >
        <div class="absolute inset-0 bg-gradient-to-r from-primary-600/0 via-white/10 to-primary-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        {#if app.isGenerating}
          <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Generating...
        {:else}
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate 3D Model
        {/if}
      </button>

      <!-- Quick Tips -->
      <div class="glass rounded-2xl p-4">
        <h4 class="text-xs font-semibold text-surface-200/50 uppercase tracking-wider mb-3">Quick Tips</h4>
        <ul class="space-y-2">
          {#each [
            'Use well-lit images with clear subjects',
            'Single objects work better than complex scenes',
            'Higher resolution images produce better results',
            'Remove backgrounds for cleaner 3D models'
          ] as tip}
            <li class="flex items-start gap-2 text-xs text-surface-200/40">
              <svg class="w-3.5 h-3.5 text-accent-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {tip}
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
</div>
