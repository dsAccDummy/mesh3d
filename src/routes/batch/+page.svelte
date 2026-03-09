<script lang="ts">
  import { base } from '$app/paths';
  import { app } from '$lib/stores/stores.svelte';
  import { formatFileSize, generateId, isValidImageType, isValidImageSize, createThumbnail } from '$lib/utils/utils';
  import type { BatchJob, BatchItem, ImageFile, GenerationStatus } from '$lib/types';

  // --- Local State ---
  let dragOver = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);
  let maxConcurrent = $state(app.activeBatch?.maxConcurrent ?? 2);
  let parallelMode = $state(app.activeBatch?.parallelProcessing ?? true);

  // --- Derived ---
  let batch = $derived(app.activeBatch);
  let items = $derived(batch?.items ?? []);
  let completedItems = $derived(items.filter((i) => i.status === 'completed'));
  let failedItems = $derived(items.filter((i) => i.status === 'failed'));
  let processingItems = $derived(
    items.filter((i) => ['uploading', 'processing', 'generating', 'texturing'].includes(i.status))
  );
  let queuedItems = $derived(items.filter((i) => i.status === 'idle'));
  let overallProgress = $derived(
    items.length > 0 ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length) : 0
  );
  let isRunning = $derived(batch?.status === 'processing');
  let isPaused = $derived(batch?.status === 'paused');

  // --- Status Helpers ---
  function statusColor(status: GenerationStatus): string {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'processing': case 'generating': case 'texturing': return 'text-accent-400';
      case 'uploading': return 'text-yellow-400';
      default: return 'text-surface-200/40';
    }
  }

  function statusLabel(status: GenerationStatus): string {
    switch (status) {
      case 'idle': return 'Queued';
      case 'uploading': return 'Uploading';
      case 'processing': return 'Processing';
      case 'generating': return 'Generating';
      case 'texturing': return 'Texturing';
      case 'completed': return 'Done';
      case 'failed': return 'Failed';
      default: return status;
    }
  }

  function statusIcon(status: GenerationStatus): string {
    switch (status) {
      case 'completed': return 'M5 13l4 4L19 7';
      case 'failed': return 'M6 18L18 6M6 6l12 12';
      case 'idle': return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
      default: return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15';
    }
  }

  // --- File Handling ---
  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files).filter(
      (f) => isValidImageType(f) && isValidImageSize(f)
    );

    if (fileArray.length === 0) {
      app.addToast({ type: 'warning', title: 'No valid images', message: 'Only PNG, JPEG, WebP under 20MB are supported.' });
      return;
    }

    const newItems: BatchItem[] = [];

    for (const file of fileArray) {
      const url = URL.createObjectURL(file);
      const thumbnail = await createThumbnail(file);
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = url;
      });

      const imageFile: ImageFile = {
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

      newItems.push({
        id: generateId(),
        image: imageFile,
        settings: { ...app.generationSettings },
        status: 'idle',
        progress: 0
      });
    }

    if (!app.activeBatch) {
      app.activeBatch = {
        id: generateId(),
        items: newItems,
        status: 'queued',
        parallelProcessing: parallelMode,
        maxConcurrent,
        createdAt: Date.now()
      };
    } else {
      app.activeBatch.items = [...app.activeBatch.items, ...newItems];
    }

    app.addToast({ type: 'success', title: `${newItems.length} image${newItems.length > 1 ? 's' : ''} added`, message: 'Ready to process.' });
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function triggerFileInput() {
    fileInput?.click();
  }

  function onFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      handleFiles(target.files);
      target.value = '';
    }
  }

  // --- Batch Controls ---
  function startAll() {
    if (app.activeBatch) {
      app.activeBatch.status = 'processing';
      app.activeBatch.parallelProcessing = parallelMode;
      app.activeBatch.maxConcurrent = maxConcurrent;
      // In a real app, this would kick off the generation engine
      app.addToast({ type: 'info', title: 'Batch started', message: `Processing ${items.length} items...` });
    }
  }

  function pauseAll() {
    if (app.activeBatch) {
      app.activeBatch.status = 'paused';
      app.addToast({ type: 'warning', title: 'Batch paused' });
    }
  }

  function resumeAll() {
    if (app.activeBatch) {
      app.activeBatch.status = 'processing';
      app.addToast({ type: 'info', title: 'Batch resumed' });
    }
  }

  function cancelAll() {
    if (app.activeBatch) {
      app.activeBatch.status = 'cancelled';
      app.activeBatch.items.forEach((item) => {
        if (item.status !== 'completed' && item.status !== 'failed') {
          item.status = 'idle';
          item.progress = 0;
        }
      });
      app.addToast({ type: 'warning', title: 'Batch cancelled' });
    }
  }

  function clearBatch() {
    app.activeBatch = null;
    app.addToast({ type: 'info', title: 'Batch cleared' });
  }

  function removeItem(itemId: string) {
    if (app.activeBatch) {
      app.activeBatch.items = app.activeBatch.items.filter((i) => i.id !== itemId);
      if (app.activeBatch.items.length === 0) {
        app.activeBatch = null;
      }
    }
  }

  function retryItem(itemId: string) {
    if (app.activeBatch) {
      const item = app.activeBatch.items.find((i) => i.id === itemId);
      if (item) {
        item.status = 'idle';
        item.progress = 0;
        item.error = undefined;
      }
    }
  }

  function exportAll() {
    // Placeholder: In real app, zip all completed models and download
    app.addToast({ type: 'info', title: 'Export started', message: `Preparing ${completedItems.length} models for download...` });
  }
</script>

<svelte:head>
  <title>Batch Processing - Mesh3D</title>
</svelte:head>

<div class="page-enter min-h-[calc(100dvh-4rem)] pt-20 pb-8 px-4 sm:px-6">
  <div class="max-w-[1400px] mx-auto space-y-6">

    <!-- ===== HEADER ===== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold">
          <span class="gradient-text">Batch Processing</span>
        </h1>
        <p class="text-surface-200/60 text-sm mt-1">
          Process multiple images into 3D models simultaneously
        </p>
      </div>
      {#if batch && completedItems.length > 0}
        <button class="btn btn-primary btn-sm" onclick={exportAll}>
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export All ({completedItems.length})
        </button>
      {/if}
    </div>

    <!-- ===== STATS BAR ===== -->
    {#if batch}
      <div class="glass rounded-xl p-4">
        <div class="flex flex-wrap gap-4 sm:gap-8 items-center">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-surface-200/40"></div>
            <span class="text-sm text-surface-200/60">Total: <strong class="text-surface-100">{items.length}</strong></span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-accent-400 animate-pulse"></div>
            <span class="text-sm text-surface-200/60">Processing: <strong class="text-accent-400">{processingItems.length}</strong></span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-green-400"></div>
            <span class="text-sm text-surface-200/60">Completed: <strong class="text-green-400">{completedItems.length}</strong></span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-red-400"></div>
            <span class="text-sm text-surface-200/60">Failed: <strong class="text-red-400">{failedItems.length}</strong></span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-yellow-400"></div>
            <span class="text-sm text-surface-200/60">Queued: <strong class="text-yellow-400">{queuedItems.length}</strong></span>
          </div>
          <div class="ml-auto">
            <span class="text-sm font-bold gradient-text">{overallProgress}%</span>
          </div>
        </div>
        <!-- Overall progress bar -->
        <div class="mt-3 h-1.5 bg-surface-900 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-400 transition-all duration-500"
            style="width: {overallProgress}%"
          ></div>
        </div>
      </div>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <!-- ===== MAIN AREA ===== -->
      <div class="space-y-4">

        <!-- Upload Zone -->
        <div
          class="glass rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
            {dragOver ? 'border-primary-400 bg-primary-500/5 scale-[1.01]' : 'border-white/10 hover:border-primary-500/30'}"
          role="button"
          tabindex="0"
          ondrop={handleDrop}
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          onclick={triggerFileInput}
          onkeydown={(e) => e.key === 'Enter' && triggerFileInput()}
        >
          <div class="py-10 px-6 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-400/10 flex items-center justify-center">
              <svg class="w-8 h-8 {dragOver ? 'text-primary-400' : 'text-surface-200/40'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p class="text-surface-100 font-medium mb-1">
              {dragOver ? 'Drop images here' : 'Drag & drop multiple images'}
            </p>
            <p class="text-surface-200/40 text-sm">
              PNG, JPEG, WebP up to 20MB each &middot; or <span class="text-primary-400 underline">browse files</span>
            </p>
          </div>
          <input
            bind:this={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            class="hidden"
            onchange={onFileSelect}
          />
        </div>

        <!-- Queue List -->
        {#if items.length > 0}
          <div class="space-y-2">
            {#each items as item (item.id)}
              <div class="glass glass-hover rounded-xl p-3 flex items-center gap-3 transition-all duration-200 animate-slide-up">
                <!-- Thumbnail -->
                <div class="w-12 h-12 rounded-lg overflow-hidden bg-surface-900 shrink-0">
                  <img src={item.image.thumbnail} alt={item.image.name} class="w-full h-full object-cover" />
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <p class="text-sm font-medium text-surface-100 truncate">{item.image.name}</p>
                    <span class="badge {item.status === 'completed' ? 'badge-success' : item.status === 'failed' ? 'badge-error' : 'badge-primary'} shrink-0">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <div class="flex items-center gap-3 text-xs text-surface-200/40">
                    <span>{formatFileSize(item.image.size)}</span>
                    <span>{item.image.width} x {item.image.height}</span>
                    {#if item.error}
                      <span class="text-red-400 truncate">{item.error}</span>
                    {/if}
                  </div>
                  <!-- Progress bar -->
                  {#if item.status !== 'idle' && item.status !== 'completed' && item.status !== 'failed'}
                    <div class="mt-2 h-1 bg-surface-900 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-400 transition-all duration-300"
                        style="width: {item.progress}%"
                      ></div>
                    </div>
                  {/if}
                </div>

                <!-- Status Icon -->
                <div class="shrink-0 {statusColor(item.status)}">
                  {#if ['processing', 'generating', 'texturing', 'uploading'].includes(item.status)}
                    <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d={statusIcon(item.status)} />
                    </svg>
                  {:else}
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d={statusIcon(item.status)} />
                    </svg>
                  {/if}
                </div>

                <!-- Item Actions -->
                <div class="flex items-center gap-1 shrink-0">
                  {#if item.status === 'failed'}
                    <button
                      class="btn btn-ghost btn-icon btn-sm text-yellow-400 hover:text-yellow-300"
                      onclick={() => retryItem(item.id)}
                      data-tooltip="Retry"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  {/if}
                  <button
                    class="btn btn-ghost btn-icon btn-sm text-surface-200/30 hover:text-red-400"
                    onclick={() => removeItem(item.id)}
                    data-tooltip="Remove"
                    disabled={['processing', 'generating', 'texturing'].includes(item.status)}
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <!-- Empty queue hint -->
          <div class="text-center py-8">
            <p class="text-surface-200/30 text-sm">Upload images to start building your batch queue.</p>
          </div>
        {/if}
      </div>

      <!-- ===== SIDEBAR CONTROLS ===== -->
      <div class="space-y-4">

        <!-- Processing Mode -->
        <div class="glass rounded-xl p-4 space-y-4">
          <h3 class="text-sm font-semibold text-surface-100">Processing Mode</h3>

          <!-- Parallel / Sequential Toggle -->
          <div class="flex gap-2">
            <button
              class="btn btn-sm flex-1 {parallelMode ? 'btn-primary' : 'btn-ghost'}"
              onclick={() => (parallelMode = true)}
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Parallel
            </button>
            <button
              class="btn btn-sm flex-1 {!parallelMode ? 'btn-primary' : 'btn-ghost'}"
              onclick={() => (parallelMode = false)}
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              Sequential
            </button>
          </div>

          <!-- Max Concurrent Slider -->
          {#if parallelMode}
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs text-surface-200/50">Max Concurrent Jobs</label>
                <span class="text-xs font-mono text-accent-400">{maxConcurrent}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                bind:value={maxConcurrent}
              />
              <div class="flex justify-between text-[10px] text-surface-200/30 mt-1">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>
          {/if}
        </div>

        <!-- Batch Actions -->
        <div class="glass rounded-xl p-4 space-y-3">
          <h3 class="text-sm font-semibold text-surface-100">Batch Controls</h3>

          {#if !isRunning && !isPaused}
            <button
              class="btn btn-primary w-full"
              onclick={startAll}
              disabled={items.length === 0 || queuedItems.length === 0}
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start All
            </button>
          {:else if isRunning}
            <button class="btn btn-secondary w-full" onclick={pauseAll}>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pause All
            </button>
          {:else if isPaused}
            <button class="btn btn-primary w-full" onclick={resumeAll}>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              Resume
            </button>
          {/if}

          {#if isRunning || isPaused}
            <button class="btn btn-danger w-full" onclick={cancelAll}>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Cancel All
            </button>
          {/if}

          {#if batch && !isRunning}
            <button class="btn btn-ghost w-full text-surface-200/40" onclick={clearBatch}>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Batch
            </button>
          {/if}
        </div>

        <!-- Export -->
        {#if completedItems.length > 0}
          <div class="glass rounded-xl p-4 space-y-3">
            <h3 class="text-sm font-semibold text-surface-100">Export</h3>
            <button class="btn btn-primary w-full" onclick={exportAll}>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download ZIP ({completedItems.length} models)
            </button>
            <p class="text-xs text-surface-200/30 text-center">
              Downloads all completed models as a single ZIP archive
            </p>
          </div>
        {/if}

        <!-- Generation Settings Preview -->
        <div class="glass rounded-xl p-4 space-y-3">
          <h3 class="text-sm font-semibold text-surface-100">Generation Settings</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-surface-200/50">Provider</span>
              <span class="text-surface-100 capitalize">{app.generationSettings.provider}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-200/50">Quality</span>
              <span class="text-surface-100 capitalize">{app.generationSettings.quality}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-200/50">Format</span>
              <span class="badge badge-primary">{app.generationSettings.outputFormat.toUpperCase()}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-200/50">Texture</span>
              <span class="text-surface-100">{app.generationSettings.textureResolution}px</span>
            </div>
          </div>
          <a href="{base}/settings" class="btn btn-ghost btn-sm w-full mt-2 text-surface-200/40">
            Edit in Settings
          </a>
        </div>
      </div>
    </div>
  </div>
</div>
