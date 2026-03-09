<script lang="ts">
  import { base } from '$app/paths';
  import { app } from '$lib/stores/stores.svelte';
  import { formatFileSize, formatNumber, timeAgo } from '$lib/utils/utils';
  import type { ModelEntry, AIProvider } from '$lib/types';

  // --- Local State ---
  let selectedModel = $state<ModelEntry | null>(null);
  let showDetailModal = $state(false);
  let showDeleteConfirm = $state(false);
  let deleteTarget = $state<ModelEntry | null>(null);

  // --- Filtered & Sorted Gallery ---
  let filteredGallery = $derived.by(() => {
    let items = [...app.gallery];

    // Search filter
    if (app.gallerySearch.trim()) {
      const q = app.gallerySearch.toLowerCase();
      items = items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (app.gallerySort) {
      case 'newest':
        items.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        items.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'size':
        items.sort((a, b) => b.result.metadata.fileSize - a.result.metadata.fileSize);
        break;
    }

    return items;
  });

  let totalModels = $derived(app.gallery.length);
  let totalSize = $derived(
    app.gallery.reduce((sum, m) => sum + m.result.metadata.fileSize, 0)
  );
  let favoriteCount = $derived(app.gallery.filter((m) => m.favorite).length);

  // --- Provider Badge Color ---
  function providerColor(provider: AIProvider): string {
    switch (provider) {
      case 'meshy': return 'badge-primary';
      case 'tripo': return 'badge-success';
      case 'stability': return 'badge-warning';
      case 'demo': return 'badge-error';
      default: return 'badge-primary';
    }
  }

  function providerLabel(provider: AIProvider): string {
    const labels: Record<AIProvider, string> = {
      meshy: 'Meshy', tripo: 'Tripo', stability: 'Stability', demo: 'Demo'
    };
    return labels[provider] ?? provider;
  }

  // --- Actions ---
  function toggleFavorite(e: MouseEvent, model: ModelEntry) {
    e.stopPropagation();
    const idx = app.gallery.findIndex((m) => m.id === model.id);
    if (idx !== -1) {
      app.gallery[idx].favorite = !app.gallery[idx].favorite;
    }
  }

  function openDetail(model: ModelEntry) {
    selectedModel = model;
    showDetailModal = true;
  }

  function closeDetail() {
    showDetailModal = false;
    selectedModel = null;
  }

  function confirmDelete(e: MouseEvent, model: ModelEntry) {
    e.stopPropagation();
    deleteTarget = model;
    showDeleteConfirm = true;
  }

  function executeDelete() {
    if (deleteTarget) {
      app.gallery = app.gallery.filter((m) => m.id !== deleteTarget!.id);
      app.addToast({ type: 'success', title: 'Model deleted', message: deleteTarget.name });
      if (showDetailModal && selectedModel?.id === deleteTarget.id) {
        closeDetail();
      }
      deleteTarget = null;
    }
    showDeleteConfirm = false;
  }

  function cancelDelete() {
    deleteTarget = null;
    showDeleteConfirm = false;
  }

  function handleDetailDelete() {
    if (selectedModel) {
      deleteTarget = selectedModel;
      closeDetail();
      showDeleteConfirm = true;
    }
  }
</script>

<svelte:head>
  <title>Gallery - Mesh3D</title>
</svelte:head>

<div class="page-enter min-h-[calc(100dvh-4rem)] pt-20 pb-8 px-4 sm:px-6">
  <div class="max-w-[1600px] mx-auto space-y-6">

    <!-- ===== HEADER ===== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold">
          <span class="gradient-text">Gallery</span>
        </h1>
        <p class="text-surface-200/60 text-sm mt-1">
          {totalModels} model{totalModels !== 1 ? 's' : ''} &middot;
          {formatFileSize(totalSize)} total &middot;
          {favoriteCount} favorite{favoriteCount !== 1 ? 's' : ''}
        </p>
      </div>

      <!-- View toggle + actions -->
      <div class="flex items-center gap-2">
        <a href="{base}/" class="btn btn-primary btn-sm">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Model
        </a>
        <div class="flex items-center glass rounded-lg p-0.5">
          <button
            class="btn btn-sm {app.galleryViewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}"
            onclick={() => (app.galleryViewMode = 'grid')}
            data-tooltip="Grid view"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            class="btn btn-sm {app.galleryViewMode === 'list' ? 'btn-primary' : 'btn-ghost'}"
            onclick={() => (app.galleryViewMode = 'list')}
            data-tooltip="List view"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ===== SEARCH & SORT BAR ===== -->
    <div class="glass rounded-xl p-3 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          class="input pl-10"
          placeholder="Search models by name, provider, or tag..."
          bind:value={app.gallerySearch}
        />
        {#if app.gallerySearch}
          <button
            class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-200/40 hover:text-white transition-colors"
            onclick={() => (app.gallerySearch = '')}
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-surface-200/50 whitespace-nowrap">Sort by:</span>
        <select class="select w-40" bind:value={app.gallerySort}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
      </div>
    </div>

    <!-- ===== GALLERY CONTENT ===== -->
    {#if filteredGallery.length === 0}
      <!-- Empty State -->
      <div class="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div class="relative mb-8">
          <div class="w-32 h-32 rounded-full border-2 border-dashed border-primary-500/20 flex items-center justify-center animate-spin-slow">
            <div class="w-20 h-20 rounded-full border-2 border-dashed border-accent-400/20 flex items-center justify-center" style="animation: spin 5s linear infinite reverse;">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-400/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {#if app.gallerySearch}
          <h3 class="text-lg font-semibold text-surface-100 mb-2">No matches found</h3>
          <p class="text-surface-200/50 text-sm text-center max-w-sm">
            No models match "{app.gallerySearch}". Try a different search term.
          </p>
          <button class="btn btn-secondary btn-sm mt-4" onclick={() => (app.gallerySearch = '')}>
            Clear search
          </button>
        {:else}
          <h3 class="text-lg font-semibold text-surface-100 mb-2">Your gallery is empty</h3>
          <p class="text-surface-200/50 text-sm text-center max-w-sm">
            Generate your first 3D model from an image to see it here.
          </p>
          <a href="{base}/" class="btn btn-primary mt-4">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Model
          </a>
        {/if}
      </div>
    {:else}
      {#if app.gallerySearch}
        <p class="text-xs text-surface-200/40">
          Showing {filteredGallery.length} of {totalModels} models
        </p>
      {/if}

      <!-- ===== GRID VIEW ===== -->
      {#if app.galleryViewMode === 'grid'}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {#each filteredGallery as model (model.id)}
            <div
              class="glass glass-hover rounded-xl overflow-hidden group cursor-pointer transition-all duration-300 hover:-translate-y-1"
              role="button"
              tabindex="0"
              onclick={() => openDetail(model)}
              onkeydown={(e) => e.key === 'Enter' && openDetail(model)}
            >
              <!-- Thumbnail -->
              <div class="relative aspect-square overflow-hidden bg-surface-900">
                <img
                  src={model.sourceImage.thumbnail}
                  alt={model.name}
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <!-- Overlay on hover -->
                <div class="absolute inset-0 bg-gradient-to-t from-surface-950/90 via-surface-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span class="badge {providerColor(model.provider)}">
                      {providerLabel(model.provider)}
                    </span>
                    <span class="badge badge-primary">
                      {model.result.metadata.format.toUpperCase()}
                    </span>
                  </div>
                </div>

                <!-- Favorite button -->
                <button
                  class="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                    {model.favorite
                      ? 'bg-red-500/20 text-red-400 scale-100'
                      : 'bg-surface-950/50 text-surface-200/40 opacity-0 group-hover:opacity-100 hover:text-red-400'}"
                  onclick={(e) => toggleFavorite(e, model)}
                  data-tooltip={model.favorite ? 'Unfavorite' : 'Favorite'}
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill={model.favorite ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>

                <!-- Delete button -->
                <button
                  class="absolute top-2 left-2 w-8 h-8 rounded-full bg-surface-950/50 flex items-center justify-center text-surface-200/40 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/20 transition-all duration-200"
                  onclick={(e) => confirmDelete(e, model)}
                  data-tooltip="Delete"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <!-- Card Info -->
              <div class="p-3 space-y-2">
                <h3 class="font-semibold text-sm text-surface-100 truncate">{model.name}</h3>
                <div class="flex items-center justify-between text-xs text-surface-200/50">
                  <span>{timeAgo(model.createdAt)}</span>
                  <span>{formatNumber(model.result.metadata.vertices)} verts</span>
                </div>
                <div class="flex items-center justify-between text-xs text-surface-200/40">
                  <span>{formatFileSize(model.result.metadata.fileSize)}</span>
                  <span>{formatNumber(model.result.metadata.triangles)} tris</span>
                </div>
              </div>
            </div>
          {/each}
        </div>

      <!-- ===== LIST VIEW ===== -->
      {:else}
        <div class="glass rounded-xl overflow-hidden">
          <!-- List Header -->
          <div class="hidden sm:grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-white/5 text-xs text-surface-200/40 font-medium uppercase tracking-wider">
            <div class="w-10"></div>
            <div>Name</div>
            <div>Provider</div>
            <div>Date</div>
            <div>Vertices</div>
            <div>Size</div>
            <div class="w-20 text-right">Actions</div>
          </div>

          {#each filteredGallery as model (model.id)}
            <div
              class="grid grid-cols-1 sm:grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_auto] gap-3 sm:gap-4 px-4 py-3 items-center border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer group"
              role="button"
              tabindex="0"
              onclick={() => openDetail(model)}
              onkeydown={(e) => e.key === 'Enter' && openDetail(model)}
            >
              <div class="w-10 h-10 rounded-lg overflow-hidden bg-surface-900 shrink-0">
                <img src={model.sourceImage.thumbnail} alt={model.name} class="w-full h-full object-cover" />
              </div>
              <div class="min-w-0">
                <p class="font-medium text-sm text-surface-100 truncate">{model.name}</p>
                <p class="text-xs text-surface-200/40 sm:hidden">
                  {providerLabel(model.provider)} &middot; {timeAgo(model.createdAt)}
                </p>
              </div>
              <div class="hidden sm:block">
                <span class="badge {providerColor(model.provider)}">{providerLabel(model.provider)}</span>
              </div>
              <div class="hidden sm:block text-sm text-surface-200/60">{timeAgo(model.createdAt)}</div>
              <div class="hidden sm:block text-sm text-surface-200/60 font-mono">{formatNumber(model.result.metadata.vertices)}</div>
              <div class="hidden sm:block text-sm text-surface-200/60">
                <span class="badge badge-primary">{model.result.metadata.format.toUpperCase()}</span>
                <span class="ml-1">{formatFileSize(model.result.metadata.fileSize)}</span>
              </div>
              <div class="flex items-center gap-1 justify-end">
                <button
                  class="btn btn-ghost btn-icon btn-sm {model.favorite ? 'text-red-400' : 'text-surface-200/30'}"
                  onclick={(e) => toggleFavorite(e, model)}
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill={model.favorite ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <button
                  class="btn btn-ghost btn-icon btn-sm text-surface-200/30 hover:text-red-400"
                  onclick={(e) => confirmDelete(e, model)}
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- ===== DETAIL MODAL ===== -->
{#if showDetailModal && selectedModel}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <div class="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" onclick={closeDetail} role="presentation"></div>

    <div class="relative glass rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-scale-in z-10">
      <button class="absolute top-4 right-4 btn btn-ghost btn-icon btn-sm z-10" onclick={closeDetail}>
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Image -->
      <div class="relative aspect-video overflow-hidden rounded-t-2xl bg-surface-900">
        <img src={selectedModel.sourceImage.thumbnail} alt={selectedModel.name} class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-surface-950/80 to-transparent"></div>
        <div class="absolute bottom-4 left-4 right-4">
          <h2 class="text-xl font-bold text-white mb-1">{selectedModel.name}</h2>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="badge {providerColor(selectedModel.provider)}">{providerLabel(selectedModel.provider)}</span>
            <span class="badge badge-primary">{selectedModel.result.metadata.format.toUpperCase()}</span>
            <span class="text-xs text-surface-200/60">{timeAgo(selectedModel.createdAt)}</span>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="p-6 space-y-5">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="glass rounded-lg p-3 text-center">
            <p class="text-xs text-surface-200/40 mb-1">Vertices</p>
            <p class="text-lg font-bold gradient-text">{formatNumber(selectedModel.result.metadata.vertices)}</p>
          </div>
          <div class="glass rounded-lg p-3 text-center">
            <p class="text-xs text-surface-200/40 mb-1">Faces</p>
            <p class="text-lg font-bold gradient-text">{formatNumber(selectedModel.result.metadata.faces)}</p>
          </div>
          <div class="glass rounded-lg p-3 text-center">
            <p class="text-xs text-surface-200/40 mb-1">Triangles</p>
            <p class="text-lg font-bold gradient-text">{formatNumber(selectedModel.result.metadata.triangles)}</p>
          </div>
          <div class="glass rounded-lg p-3 text-center">
            <p class="text-xs text-surface-200/40 mb-1">File Size</p>
            <p class="text-lg font-bold gradient-text">{formatFileSize(selectedModel.result.metadata.fileSize)}</p>
          </div>
        </div>

        <!-- Dimensions -->
        <div class="glass rounded-lg p-4">
          <h4 class="text-sm font-semibold text-surface-100 mb-3">Bounding Box Dimensions</h4>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div>
              <p class="text-xs text-surface-200/40">Width</p>
              <p class="font-mono text-sm text-accent-400">{selectedModel.result.metadata.dimensions.width.toFixed(3)}</p>
            </div>
            <div>
              <p class="text-xs text-surface-200/40">Height</p>
              <p class="font-mono text-sm text-accent-400">{selectedModel.result.metadata.dimensions.height.toFixed(3)}</p>
            </div>
            <div>
              <p class="text-xs text-surface-200/40">Depth</p>
              <p class="font-mono text-sm text-accent-400">{selectedModel.result.metadata.dimensions.depth.toFixed(3)}</p>
            </div>
          </div>
        </div>

        <!-- Properties -->
        <div class="glass rounded-lg p-4">
          <h4 class="text-sm font-semibold text-surface-100 mb-3">Properties</h4>
          <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-surface-200/50">Textures</span>
              <span class={selectedModel.result.metadata.hasTextures ? 'text-green-400' : 'text-surface-200/30'}>
                {selectedModel.result.metadata.hasTextures ? 'Yes' : 'No'}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-200/50">PBR</span>
              <span class={selectedModel.result.metadata.hasPBR ? 'text-green-400' : 'text-surface-200/30'}>
                {selectedModel.result.metadata.hasPBR ? 'Yes' : 'No'}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-200/50">Quality</span>
              <span class="text-surface-100 capitalize">{selectedModel.settings.quality}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-200/50">Poly Count</span>
              <span class="text-surface-100 capitalize">{selectedModel.settings.polyCount}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-200/50">Texture Res</span>
              <span class="text-surface-100">{selectedModel.settings.textureResolution}px</span>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-200/50">Source</span>
              <span class="text-surface-100 truncate ml-2">{selectedModel.sourceImage.name}</span>
            </div>
          </div>
        </div>

        <!-- Tags -->
        {#if selectedModel.tags.length > 0}
          <div>
            <h4 class="text-sm font-semibold text-surface-100 mb-2">Tags</h4>
            <div class="flex flex-wrap gap-2">
              {#each selectedModel.tags as tag}
                <span class="badge badge-primary">{tag}</span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2">
          <button class="btn btn-primary flex-1">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download {selectedModel.result.metadata.format.toUpperCase()}
          </button>
          <button
            class="btn btn-icon {selectedModel.favorite ? 'btn-danger' : 'btn-secondary'}"
            onclick={(e) => toggleFavorite(e, selectedModel!)}
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill={selectedModel.favorite ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <button class="btn btn-icon btn-danger" onclick={handleDetailDelete}>
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ===== DELETE CONFIRMATION ===== -->
{#if showDeleteConfirm && deleteTarget}
  <div class="fixed inset-0 z-[110] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
    <div class="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" onclick={cancelDelete} role="presentation"></div>
    <div class="relative glass rounded-2xl max-w-sm w-full p-6 animate-scale-in z-10 text-center">
      <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg class="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-surface-100 mb-2">Delete Model?</h3>
      <p class="text-sm text-surface-200/60 mb-6">
        Are you sure you want to delete <strong class="text-surface-100">{deleteTarget.name}</strong>? This action cannot be undone.
      </p>
      <div class="flex items-center gap-3">
        <button class="btn btn-secondary flex-1" onclick={cancelDelete}>Cancel</button>
        <button class="btn btn-danger flex-1" onclick={executeDelete}>
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}
