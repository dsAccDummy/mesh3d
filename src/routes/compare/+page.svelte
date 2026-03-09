<script lang="ts">
  import { base } from '$app/paths';
  import { app } from '$lib/stores/stores.svelte';
  import { formatFileSize, formatNumber, createThumbnail, isValidImageType, generateId } from '$lib/utils/utils';
  import type { ImageFile } from '$lib/types';

  // --- Comparison Slider State ---
  let sliderPosition = $state(50);
  let isDragging = $state(false);
  let sliderContainer = $state<HTMLDivElement | null>(null);

  // --- Upload State ---
  let beforeImage = $state<ImageFile | null>(null);
  let afterImage = $state<ImageFile | null>(null);
  let uploadTarget = $state<'before' | 'after' | null>(null);

  // --- Depth Map State ---
  let showDepthMap = $state(false);
  let depthMapUrl = $state<string | null>(null);

  // --- Quality Analysis (Mock) ---
  let topologyScore = $state(87);
  let uvCoverage = $state(94.2);
  let triangleQuality = $state({ excellent: 72, good: 18, fair: 7, poor: 3 });

  // --- Side-by-side Viewer State ---
  let leftEnvironment = $state('studio');
  let rightEnvironment = $state('sunset');
  let syncCameras = $state(true);

  // --- Slider Logic ---
  function handleSliderMove(e: MouseEvent | TouchEvent) {
    if (!isDragging || !sliderContainer) return;
    const rect = sliderContainer.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = ((clientX - rect.left) / rect.width) * 100;
    sliderPosition = Math.max(0, Math.min(100, pos));
  }

  function startDrag(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function stopDrag() {
    isDragging = false;
  }

  // --- File Upload ---
  async function handleImageUpload(e: Event, target: 'before' | 'after') {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !isValidImageType(file)) return;

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

    if (target === 'before') {
      beforeImage = imageFile;
      // Generate mock depth map
      generateMockDepthMap(url);
    } else {
      afterImage = imageFile;
    }
    input.value = '';
  }

  function generateMockDepthMap(imageUrl: string) {
    // In real app, this would use the depth map utility
    depthMapUrl = imageUrl; // Placeholder - same image with CSS filter
    showDepthMap = true;
  }

  function swapImages() {
    const temp = beforeImage;
    beforeImage = afterImage;
    afterImage = temp;
  }

  // --- Quality score color ---
  function scoreColor(score: number): string {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-accent-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  }

  function scoreGrade(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  }
</script>

<svelte:head>
  <title>Compare & Analyze - Mesh3D</title>
</svelte:head>

<svelte:window
  onmousemove={handleSliderMove}
  ontouchmove={handleSliderMove}
  onmouseup={stopDrag}
  ontouchend={stopDrag}
/>

<div class="page-enter min-h-[calc(100dvh-4rem)] pt-20 pb-8 px-4 sm:px-6">
  <div class="max-w-[1400px] mx-auto space-y-8">

    <!-- ===== HEADER ===== -->
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold">
        <span class="gradient-text">Compare & Analyze</span>
      </h1>
      <p class="text-surface-200/60 text-sm mt-1">
        Visual comparison tools and model quality analysis
      </p>
    </div>

    <!-- ===== UPLOAD SECTION ===== -->
    <div class="glass rounded-xl p-5">
      <h2 class="text-lg font-semibold text-surface-100 mb-4">Upload Images to Compare</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Before Image Upload -->
        <label class="relative glass rounded-xl p-4 border-2 border-dashed border-white/10 hover:border-primary-500/30 transition-all cursor-pointer group block">
          <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" onchange={(e) => handleImageUpload(e, 'before')} />
          {#if beforeImage}
            <div class="aspect-video rounded-lg overflow-hidden bg-surface-900 mb-3">
              <img src={beforeImage.url} alt="Before" class="w-full h-full object-cover" />
            </div>
            <p class="text-sm text-surface-100 truncate">{beforeImage.name}</p>
            <p class="text-xs text-surface-200/40">{beforeImage.width} x {beforeImage.height} &middot; {formatFileSize(beforeImage.size)}</p>
          {:else}
            <div class="aspect-video rounded-lg bg-surface-900/50 flex flex-col items-center justify-center">
              <svg class="w-8 h-8 text-surface-200/20 group-hover:text-primary-400/50 transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p class="text-sm text-surface-200/30">Original Image (Before)</p>
            </div>
          {/if}
          <div class="absolute top-2 left-2">
            <span class="badge badge-primary">Before</span>
          </div>
        </label>

        <!-- After Image Upload -->
        <label class="relative glass rounded-xl p-4 border-2 border-dashed border-white/10 hover:border-accent-400/30 transition-all cursor-pointer group block">
          <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" onchange={(e) => handleImageUpload(e, 'after')} />
          {#if afterImage}
            <div class="aspect-video rounded-lg overflow-hidden bg-surface-900 mb-3">
              <img src={afterImage.url} alt="After" class="w-full h-full object-cover" />
            </div>
            <p class="text-sm text-surface-100 truncate">{afterImage.name}</p>
            <p class="text-xs text-surface-200/40">{afterImage.width} x {afterImage.height} &middot; {formatFileSize(afterImage.size)}</p>
          {:else}
            <div class="aspect-video rounded-lg bg-surface-900/50 flex flex-col items-center justify-center">
              <svg class="w-8 h-8 text-surface-200/20 group-hover:text-accent-400/50 transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
              </svg>
              <p class="text-sm text-surface-200/30">3D Render (After)</p>
            </div>
          {/if}
          <div class="absolute top-2 left-2">
            <span class="badge badge-success">After</span>
          </div>
        </label>
      </div>

      {#if beforeImage && afterImage}
        <div class="flex justify-center mt-4">
          <button class="btn btn-ghost btn-sm" onclick={swapImages}>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Swap Images
          </button>
        </div>
      {/if}
    </div>

    <!-- ===== BEFORE / AFTER COMPARISON SLIDER ===== -->
    {#if beforeImage && afterImage}
      <div class="glass rounded-xl p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-surface-100">Before / After Comparison</h2>
          <div class="flex items-center gap-2">
            <span class="badge badge-primary">Before</span>
            <span class="text-surface-200/30 text-xs">{Math.round(sliderPosition)}%</span>
            <span class="badge badge-success">After</span>
          </div>
        </div>

        <!-- Slider Container -->
        <div
          bind:this={sliderContainer}
          class="relative aspect-video rounded-xl overflow-hidden bg-surface-900 select-none cursor-col-resize"
          onmousedown={startDrag}
          ontouchstart={startDrag}
          role="slider"
          aria-valuenow={Math.round(sliderPosition)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Comparison slider"
          tabindex="0"
        >
          <!-- After Image (full, below) -->
          <img
            src={afterImage.url}
            alt="After"
            class="absolute inset-0 w-full h-full object-cover"
          />

          <!-- Before Image (clipped) -->
          <div
            class="absolute inset-0 overflow-hidden"
            style="width: {sliderPosition}%"
          >
            <img
              src={beforeImage.url}
              alt="Before"
              class="absolute inset-0 w-full h-full object-cover"
              style="width: {sliderContainer ? sliderContainer.offsetWidth + 'px' : '100%'}; max-width: none;"
            />
          </div>

          <!-- Divider Line -->
          <div
            class="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10"
            style="left: {sliderPosition}%"
          >
            <!-- Handle -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass border-2 border-white/60 flex items-center justify-center shadow-lg">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </div>

          <!-- Labels -->
          <div class="absolute top-3 left-3 z-10">
            <span class="badge badge-primary">Before</span>
          </div>
          <div class="absolute top-3 right-3 z-10">
            <span class="badge badge-success">After</span>
          </div>
        </div>
      </div>
    {:else}
      <!-- Placeholder -->
      <div class="glass rounded-xl p-8 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-400/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-surface-200/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-surface-100 mb-1">Upload two images to compare</h3>
        <p class="text-surface-200/40 text-sm">Drag the slider to reveal differences between your original and 3D render.</p>
      </div>
    {/if}

    <!-- ===== DEPTH MAP VISUALIZATION ===== -->
    <div class="glass rounded-xl p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-surface-100">Depth Map Visualization</h2>
        <button
          class="btn btn-sm {showDepthMap ? 'btn-primary' : 'btn-ghost'}"
          onclick={() => (showDepthMap = !showDepthMap)}
        >
          {showDepthMap ? 'Hide' : 'Show'} Depth Map
        </button>
      </div>

      {#if beforeImage}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Original -->
          <div>
            <p class="text-xs text-surface-200/40 mb-2 uppercase tracking-wider">Original</p>
            <div class="aspect-video rounded-xl overflow-hidden bg-surface-900">
              <img src={beforeImage.url} alt="Original" class="w-full h-full object-cover" />
            </div>
          </div>
          <!-- Depth Map -->
          <div>
            <p class="text-xs text-surface-200/40 mb-2 uppercase tracking-wider">Estimated Depth Map</p>
            <div class="aspect-video rounded-xl overflow-hidden bg-surface-900 relative">
              {#if showDepthMap && depthMapUrl}
                <img
                  src={depthMapUrl}
                  alt="Depth Map"
                  class="w-full h-full object-cover"
                  style="filter: grayscale(100%) contrast(1.5) brightness(0.8);"
                />
                <div class="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-purple-500/20 mix-blend-overlay"></div>
              {:else}
                <div class="flex items-center justify-center h-full">
                  <p class="text-surface-200/20 text-sm">Upload an image to generate depth map</p>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Depth Legend -->
        {#if showDepthMap}
          <div class="flex items-center gap-3 justify-center">
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-3 rounded-sm bg-white"></div>
              <span class="text-xs text-surface-200/50">Near</span>
            </div>
            <div class="w-24 h-2 rounded-full bg-gradient-to-r from-white via-gray-500 to-black"></div>
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-3 rounded-sm bg-black border border-white/10"></div>
              <span class="text-xs text-surface-200/50">Far</span>
            </div>
          </div>
        {/if}
      {:else}
        <div class="text-center py-8">
          <p class="text-surface-200/30 text-sm">Upload a "Before" image above to generate a depth map visualization.</p>
        </div>
      {/if}
    </div>

    <!-- ===== MODEL QUALITY ANALYSIS ===== -->
    <div class="glass rounded-xl p-5 space-y-5">
      <h2 class="text-lg font-semibold text-surface-100">Model Quality Analysis</h2>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Topology Score -->
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-xs text-surface-200/40 uppercase tracking-wider mb-3">Topology Score</p>
          <div class="relative w-24 h-24 mx-auto mb-3">
            <svg class="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(108,79,241,0.1)" stroke-width="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="url(#scoreGradient)" stroke-width="8"
                stroke-linecap="round"
                stroke-dasharray="{topologyScore * 2.64} {264 - topologyScore * 2.64}"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#6c4ff1" />
                  <stop offset="100%" stop-color="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-2xl font-bold {scoreColor(topologyScore)}">{topologyScore}</span>
            </div>
          </div>
          <p class="text-sm font-medium {scoreColor(topologyScore)}">{scoreGrade(topologyScore)}</p>
          <p class="text-xs text-surface-200/30 mt-1">Clean edge flow and quad distribution</p>
        </div>

        <!-- UV Coverage -->
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-xs text-surface-200/40 uppercase tracking-wider mb-3">UV Coverage</p>
          <div class="relative w-24 h-24 mx-auto mb-3">
            <svg class="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(34,211,238,0.1)" stroke-width="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="url(#uvGradient)" stroke-width="8"
                stroke-linecap="round"
                stroke-dasharray="{uvCoverage * 2.64} {264 - uvCoverage * 2.64}"
              />
              <defs>
                <linearGradient id="uvGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#22d3ee" />
                  <stop offset="100%" stop-color="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-2xl font-bold text-accent-400">{uvCoverage}%</span>
            </div>
          </div>
          <p class="text-sm font-medium text-accent-400">{scoreGrade(uvCoverage)}</p>
          <p class="text-xs text-surface-200/30 mt-1">Texture space utilization</p>
        </div>

        <!-- Triangle Quality Distribution -->
        <div class="glass rounded-xl p-4">
          <p class="text-xs text-surface-200/40 uppercase tracking-wider mb-3 text-center">Triangle Quality</p>
          <div class="space-y-3 mt-4">
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-green-400">Excellent</span>
                <span class="text-surface-200/50">{triangleQuality.excellent}%</span>
              </div>
              <div class="h-2 bg-surface-900 rounded-full overflow-hidden">
                <div class="h-full bg-green-400 rounded-full transition-all duration-500" style="width: {triangleQuality.excellent}%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-accent-400">Good</span>
                <span class="text-surface-200/50">{triangleQuality.good}%</span>
              </div>
              <div class="h-2 bg-surface-900 rounded-full overflow-hidden">
                <div class="h-full bg-accent-400 rounded-full transition-all duration-500" style="width: {triangleQuality.good}%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-yellow-400">Fair</span>
                <span class="text-surface-200/50">{triangleQuality.fair}%</span>
              </div>
              <div class="h-2 bg-surface-900 rounded-full overflow-hidden">
                <div class="h-full bg-yellow-400 rounded-full transition-all duration-500" style="width: {triangleQuality.fair}%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-red-400">Poor</span>
                <span class="text-surface-200/50">{triangleQuality.poor}%</span>
              </div>
              <div class="h-2 bg-surface-900 rounded-full overflow-hidden">
                <div class="h-full bg-red-400 rounded-full transition-all duration-500" style="width: {triangleQuality.poor}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== SIDE-BY-SIDE 3D COMPARISON ===== -->
    <div class="glass rounded-xl p-5 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-surface-100">Side-by-Side Model Comparison</h2>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-2 text-sm text-surface-200/60 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={syncCameras}
              class="w-4 h-4 rounded border-primary-500/30 bg-surface-900 text-primary-500 focus:ring-primary-500/30"
            />
            Sync Cameras
          </label>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Left Viewer -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="badge badge-primary">Model A</span>
            <select class="select w-32" bind:value={leftEnvironment}>
              <option value="studio">Studio</option>
              <option value="sunset">Sunset</option>
              <option value="dawn">Dawn</option>
              <option value="night">Night</option>
              <option value="warehouse">Warehouse</option>
              <option value="forest">Forest</option>
            </select>
          </div>
          <div class="aspect-[4/3] rounded-xl overflow-hidden bg-surface-900 relative group">
            <!-- Placeholder 3D Viewer -->
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="viewer-cube">
                <div class="cube-face cube-front"></div>
                <div class="cube-face cube-back"></div>
                <div class="cube-face cube-right"></div>
                <div class="cube-face cube-left"></div>
                <div class="cube-face cube-top"></div>
                <div class="cube-face cube-bottom"></div>
              </div>
            </div>
            <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <span class="text-xs text-surface-200/40">Settings: High / GLB / 2K</span>
              <span class="badge badge-primary text-[10px]">Meshy AI</span>
            </div>
            <div class="absolute top-3 left-3">
              <span class="text-xs text-surface-200/20 uppercase tracking-wider">Environment: {leftEnvironment}</span>
            </div>
          </div>
        </div>

        <!-- Right Viewer -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="badge badge-success">Model B</span>
            <select class="select w-32" bind:value={rightEnvironment}>
              <option value="studio">Studio</option>
              <option value="sunset">Sunset</option>
              <option value="dawn">Dawn</option>
              <option value="night">Night</option>
              <option value="warehouse">Warehouse</option>
              <option value="forest">Forest</option>
            </select>
          </div>
          <div class="aspect-[4/3] rounded-xl overflow-hidden bg-surface-900 relative group">
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="viewer-cube viewer-cube-alt">
                <div class="cube-face cube-front"></div>
                <div class="cube-face cube-back"></div>
                <div class="cube-face cube-right"></div>
                <div class="cube-face cube-left"></div>
                <div class="cube-face cube-top"></div>
                <div class="cube-face cube-bottom"></div>
              </div>
            </div>
            <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <span class="text-xs text-surface-200/40">Settings: Ultra / GLB / 4K</span>
              <span class="badge badge-success text-[10px]">Tripo AI</span>
            </div>
            <div class="absolute top-3 left-3">
              <span class="text-xs text-surface-200/20 uppercase tracking-wider">Environment: {rightEnvironment}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison Stats -->
      <div class="glass rounded-lg p-4">
        <h4 class="text-xs text-surface-200/40 uppercase tracking-wider mb-3">Comparison Summary</h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p class="text-xs text-surface-200/40 mb-1">Vertices Diff</p>
            <p class="font-mono text-sm text-accent-400">+12.4K</p>
          </div>
          <div>
            <p class="text-xs text-surface-200/40 mb-1">File Size Diff</p>
            <p class="font-mono text-sm text-yellow-400">+2.3 MB</p>
          </div>
          <div>
            <p class="text-xs text-surface-200/40 mb-1">Texture Quality</p>
            <p class="font-mono text-sm text-green-400">+15%</p>
          </div>
          <div>
            <p class="text-xs text-surface-200/40 mb-1">Gen Time Diff</p>
            <p class="font-mono text-sm text-red-400">+34s</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>

<style>
  /* --- 3D CSS Cube for Viewer Placeholders --- */
  .viewer-cube {
    width: 80px;
    height: 80px;
    position: relative;
    transform-style: preserve-3d;
    animation: rotateCube 8s ease-in-out infinite;
  }

  .viewer-cube-alt {
    animation: rotateCubeAlt 10s ease-in-out infinite;
  }

  .cube-face {
    position: absolute;
    width: 80px;
    height: 80px;
    border: 1.5px solid rgba(108, 79, 241, 0.3);
    background: rgba(108, 79, 241, 0.03);
    border-radius: 4px;
  }

  .cube-front  { transform: translateZ(40px); }
  .cube-back   { transform: rotateY(180deg) translateZ(40px); }
  .cube-right  { transform: rotateY(90deg) translateZ(40px); }
  .cube-left   { transform: rotateY(-90deg) translateZ(40px); }
  .cube-top    { transform: rotateX(90deg) translateZ(40px); }
  .cube-bottom { transform: rotateX(-90deg) translateZ(40px); }

  .viewer-cube-alt .cube-face {
    border-color: rgba(34, 211, 238, 0.3);
    background: rgba(34, 211, 238, 0.03);
  }

  @keyframes rotateCube {
    0%   { transform: rotateX(-20deg) rotateY(0deg); }
    50%  { transform: rotateX(-30deg) rotateY(180deg); }
    100% { transform: rotateX(-20deg) rotateY(360deg); }
  }

  @keyframes rotateCubeAlt {
    0%   { transform: rotateX(-15deg) rotateY(45deg); }
    50%  { transform: rotateX(-25deg) rotateY(225deg); }
    100% { transform: rotateX(-15deg) rotateY(405deg); }
  }
</style>
