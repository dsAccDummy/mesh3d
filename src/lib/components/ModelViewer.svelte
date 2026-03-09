<script lang="ts">
  import { app } from '$lib/stores/stores.svelte';
  import { formatFileSize, formatNumber } from '$lib/utils/utils';
  import type { MaterialMode, EnvironmentPreset } from '$lib/types';

  let {
    modelUrl = null,
    showControls = true,
    compact = false
  }: {
    modelUrl?: string | null;
    showControls?: boolean;
    compact?: boolean;
  } = $props();

  // --- Local Viewer State ---
  let isLoading = $state(false);
  let isFullscreen = $state(false);
  let showInfoPanel = $state(false);
  let wireframe = $state(false);
  let showGrid = $state(true);
  let showAxes = $state(false);
  let autoRotate = $state(true);
  let materialMode = $state<MaterialMode>('pbr');
  let environment = $state<EnvironmentPreset>('studio');
  let cubeRotation = $state({ x: -25, y: 45 });
  let viewerEl: HTMLDivElement;

  // Simulate loading when model URL changes
  $effect(() => {
    if (modelUrl) {
      isLoading = true;
      const timer = setTimeout(() => { isLoading = false; }, 1500);
      return () => clearTimeout(timer);
    }
  });

  // Auto-rotate the CSS cube
  $effect(() => {
    if (!autoRotate) return;
    let frame: number;
    let angle = cubeRotation.y;
    const animate = () => {
      angle += 0.5;
      cubeRotation = { ...cubeRotation, y: angle };
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  });

  const materialModes: { id: MaterialMode; label: string; icon: string }[] = [
    { id: 'pbr', label: 'PBR', icon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z' },
    { id: 'wireframe', label: 'Wire', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z' },
    { id: 'normals', label: 'Normal', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343' },
    { id: 'flat', label: 'Flat', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'depth', label: 'Depth', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z' }
  ];

  const environments: { id: EnvironmentPreset; label: string }[] = [
    { id: 'studio', label: 'Studio' },
    { id: 'sunset', label: 'Sunset' },
    { id: 'dawn', label: 'Dawn' },
    { id: 'night', label: 'Night' },
    { id: 'warehouse', label: 'Warehouse' },
    { id: 'forest', label: 'Forest' },
    { id: 'apartment', label: 'Apartment' },
    { id: 'city', label: 'City' }
  ];

  // Cube face colors based on material mode
  let faceColors = $derived({
    pbr: ['from-primary-500/40 to-primary-600/60', 'from-accent-500/40 to-accent-600/60', 'from-purple-500/40 to-purple-600/60', 'from-cyan-500/40 to-cyan-600/60', 'from-indigo-500/40 to-indigo-600/60', 'from-violet-500/40 to-violet-600/60'],
    wireframe: Array(6).fill('border-2 border-primary-400/60 bg-transparent'),
    normals: ['bg-[#8080ff]/50', 'bg-[#80ff80]/50', 'bg-[#ff8080]/50', 'bg-[#8080ff]/30', 'bg-[#80ff80]/30', 'bg-[#ff8080]/30'],
    flat: Array(6).fill('bg-surface-200/20'),
    depth: ['bg-white/60', 'bg-white/45', 'bg-white/30', 'bg-white/20', 'bg-white/10', 'bg-white/5'],
    uv: Array(6).fill('bg-gradient-to-br from-red-500/30 via-green-500/30 to-blue-500/30')
  }[materialMode]);

  function toggleFullscreen() {
    if (!viewerEl) return;
    if (!document.fullscreenElement) {
      viewerEl.requestFullscreen().then(() => isFullscreen = true).catch(() => {});
    } else {
      document.exitFullscreen().then(() => isFullscreen = false).catch(() => {});
    }
  }

  function takeScreenshot() {
    app.addToast({ type: 'info', title: 'Screenshot Captured', message: 'Saved to downloads' });
  }

  // Mock model data
  const mockMeta = {
    vertices: 14250,
    faces: 9400,
    triangles: 18800,
    fileSize: 2.8 * 1024 * 1024,
    dimensions: { width: 2.0, height: 2.4, depth: 1.8 }
  };
</script>

<div
  bind:this={viewerEl}
  class="relative rounded-2xl overflow-hidden {compact ? 'aspect-square' : 'aspect-video lg:aspect-[16/9]'}
    {isFullscreen ? 'fixed inset-0 z-[200] rounded-none' : ''}"
  style="background: radial-gradient(ellipse at center, {environment === 'night' ? '#0a0a2e' : environment === 'sunset' ? '#1a0a2e' : environment === 'dawn' ? '#1a1a3e' : '#0f0d26'} 0%, #050510 100%);"
>
  <!-- Grid Floor -->
  {#if showGrid}
    <div class="absolute bottom-0 inset-x-0 h-1/3 opacity-20" style="
      background-image: linear-gradient(rgba(108,79,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(108,79,241,0.3) 1px, transparent 1px);
      background-size: 40px 40px;
      transform: perspective(500px) rotateX(60deg);
      transform-origin: bottom;
    "></div>
  {/if}

  <!-- Axes -->
  {#if showAxes}
    <div class="absolute bottom-8 left-8">
      <div class="relative w-16 h-16">
        <div class="absolute bottom-0 left-0 w-12 h-[2px] bg-red-500 origin-left" style="transform: rotate(-15deg)"></div>
        <div class="absolute bottom-0 left-0 w-12 h-[2px] bg-green-500 origin-left" style="transform: rotate(-90deg)"></div>
        <div class="absolute bottom-0 left-0 w-12 h-[2px] bg-blue-500 origin-left" style="transform: rotate(-50deg)"></div>
        <span class="absolute -bottom-1 left-14 text-[9px] text-red-400 font-mono">X</span>
        <span class="absolute -top-1 left-0 text-[9px] text-green-400 font-mono">Y</span>
        <span class="absolute bottom-4 left-10 text-[9px] text-blue-400 font-mono">Z</span>
      </div>
    </div>
  {/if}

  <!-- Loading Overlay -->
  {#if isLoading}
    <div class="absolute inset-0 bg-surface-950/80 flex flex-col items-center justify-center z-30 animate-fade-in">
      <div class="w-12 h-12 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
      <p class="text-sm text-surface-200/50 mt-4">Loading 3D Model...</p>
    </div>
  {/if}

  <!-- 3D CSS Cube -->
  {#if modelUrl || true}
    <div class="absolute inset-0 flex items-center justify-center" style="perspective: 600px;">
      <div
        class="relative w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40"
        style="transform-style: preserve-3d; transform: rotateX({cubeRotation.x}deg) rotateY({cubeRotation.y}deg);"
      >
        <!-- Front -->
        <div class="absolute inset-0 {materialMode === 'wireframe' ? faceColors[0] : 'bg-gradient-to-br ' + faceColors[0]} rounded-lg backdrop-blur-sm flex items-center justify-center" style="transform: translateZ(calc(var(--cube-half, 48px))); --cube-half: min(5rem, 12vw);">
          {#if materialMode !== 'wireframe'}
            <svg class="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          {/if}
        </div>
        <!-- Back -->
        <div class="absolute inset-0 {materialMode === 'wireframe' ? faceColors[1] : 'bg-gradient-to-br ' + faceColors[1]} rounded-lg backdrop-blur-sm" style="transform: rotateY(180deg) translateZ(calc(var(--cube-half, 48px))); --cube-half: min(5rem, 12vw);"></div>
        <!-- Left -->
        <div class="absolute inset-0 {materialMode === 'wireframe' ? faceColors[2] : 'bg-gradient-to-br ' + faceColors[2]} rounded-lg backdrop-blur-sm" style="transform: rotateY(-90deg) translateZ(calc(var(--cube-half, 48px))); --cube-half: min(5rem, 12vw);"></div>
        <!-- Right -->
        <div class="absolute inset-0 {materialMode === 'wireframe' ? faceColors[3] : 'bg-gradient-to-br ' + faceColors[3]} rounded-lg backdrop-blur-sm" style="transform: rotateY(90deg) translateZ(calc(var(--cube-half, 48px))); --cube-half: min(5rem, 12vw);"></div>
        <!-- Top -->
        <div class="absolute inset-0 {materialMode === 'wireframe' ? faceColors[4] : 'bg-gradient-to-br ' + faceColors[4]} rounded-lg backdrop-blur-sm" style="transform: rotateX(90deg) translateZ(calc(var(--cube-half, 48px))); --cube-half: min(5rem, 12vw);"></div>
        <!-- Bottom -->
        <div class="absolute inset-0 {materialMode === 'wireframe' ? faceColors[5] : 'bg-gradient-to-br ' + faceColors[5]} rounded-lg backdrop-blur-sm" style="transform: rotateX(-90deg) translateZ(calc(var(--cube-half, 48px))); --cube-half: min(5rem, 12vw);"></div>
      </div>
    </div>
  {:else}
    <!-- Empty State -->
    <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
      <div class="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-primary-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      </div>
      <p class="text-sm text-surface-200/40">No model loaded</p>
      <p class="text-xs text-surface-200/25 mt-1">Generate or upload a 3D model to view it here</p>
    </div>
  {/if}

  <!-- Material Mode Badge -->
  <div class="absolute top-3 left-3 z-10">
    <span class="badge badge-primary text-[10px] uppercase">{materialMode}</span>
  </div>

  <!-- Environment Badge -->
  <div class="absolute top-3 right-3 z-10">
    <select
      class="bg-surface-900/60 backdrop-blur-md border border-white/10 rounded-lg text-[11px] text-surface-200/60 px-2 py-1 outline-none cursor-pointer"
      value={environment}
      onchange={(e) => environment = (e.target as HTMLSelectElement).value as EnvironmentPreset}
    >
      {#each environments as env}
        <option value={env.id}>{env.label}</option>
      {/each}
    </select>
  </div>

  <!-- Controls Bar -->
  {#if showControls}
    <div class="absolute bottom-0 inset-x-0 z-20">
      <div class="bg-gradient-to-t from-black/60 to-transparent pt-10 pb-3 px-3">
        <div class="flex items-center justify-between gap-2">
          <!-- Material modes -->
          <div class="flex gap-1 overflow-x-auto pb-1">
            {#each materialModes as mode}
              <button
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap
                  {materialMode === mode.id ? 'bg-primary-500/25 text-primary-300' : 'bg-white/5 text-surface-200/40 hover:text-surface-200/70 hover:bg-white/10'}"
                onclick={() => materialMode = mode.id}
                data-tooltip={mode.label}
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d={mode.icon} />
                </svg>
                <span class="hidden sm:inline">{mode.label}</span>
              </button>
            {/each}
          </div>

          <!-- Action buttons -->
          <div class="flex gap-1 shrink-0">
            <button
              class="btn btn-ghost btn-icon btn-sm {showGrid ? 'text-primary-400' : 'text-surface-200/30'}"
              onclick={() => showGrid = !showGrid}
              data-tooltip="Grid"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>

            <button
              class="btn btn-ghost btn-icon btn-sm {showAxes ? 'text-primary-400' : 'text-surface-200/30'}"
              onclick={() => showAxes = !showAxes}
              data-tooltip="Axes"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>

            <button
              class="btn btn-ghost btn-icon btn-sm {autoRotate ? 'text-primary-400' : 'text-surface-200/30'}"
              onclick={() => autoRotate = !autoRotate}
              data-tooltip="Auto-Rotate"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              class="btn btn-ghost btn-icon btn-sm text-surface-200/30 hover:text-surface-200/70"
              onclick={() => showInfoPanel = !showInfoPanel}
              data-tooltip="Model Info"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button
              class="btn btn-ghost btn-icon btn-sm text-surface-200/30 hover:text-surface-200/70"
              onclick={takeScreenshot}
              data-tooltip="Screenshot"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button
              class="btn btn-ghost btn-icon btn-sm text-surface-200/30 hover:text-surface-200/70"
              onclick={toggleFullscreen}
              data-tooltip="Fullscreen"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                {#if isFullscreen}
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                {:else}
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                {/if}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Info Panel -->
  {#if showInfoPanel}
    <div class="absolute top-12 right-3 z-20 w-52 glass rounded-xl p-3 animate-scale-in">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-xs font-semibold text-surface-200/60 uppercase tracking-wider">Model Info</h4>
        <button class="text-surface-200/30 hover:text-surface-200/70" onclick={() => showInfoPanel = false}>
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="space-y-2">
        {#each [
          { label: 'Vertices', value: formatNumber(mockMeta.vertices) },
          { label: 'Faces', value: formatNumber(mockMeta.faces) },
          { label: 'Triangles', value: formatNumber(mockMeta.triangles) },
          { label: 'File Size', value: formatFileSize(mockMeta.fileSize) },
          { label: 'Width', value: mockMeta.dimensions.width.toFixed(1) + 'm' },
          { label: 'Height', value: mockMeta.dimensions.height.toFixed(1) + 'm' },
          { label: 'Depth', value: mockMeta.dimensions.depth.toFixed(1) + 'm' }
        ] as info}
          <div class="flex justify-between text-xs">
            <span class="text-surface-200/35">{info.label}</span>
            <span class="text-surface-200/70 font-mono">{info.value}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
