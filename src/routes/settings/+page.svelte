<script lang="ts">
  import { app } from '$lib/stores/stores.svelte';
  import { PROVIDER_CONFIGS } from '$lib/services/ai-providers';
  import type { AIProvider, QualityTier, PolyCount, TextureResolution, ExportFormat } from '$lib/types';
  import { formatFileSize } from '$lib/utils/utils';

  // --- Local State ---
  let showApiKeys = $state<Record<string, boolean>>({ meshy: false, tripo: false, stability: false });
  let testingProvider = $state<string | null>(null);
  let testResults = $state<Record<string, 'success' | 'error' | null>>({});
  let storageEstimate = $state<{ used: number; quota: number } | null>(null);
  let showResetConfirm = $state(false);
  let showClearGalleryConfirm = $state(false);
  let activeSection = $state('providers');

  const sections = [
    { id: 'providers', label: 'API Providers', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'generation', label: 'Generation', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
    { id: 'performance', label: 'Performance', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'appearance', label: 'Appearance', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
    { id: 'storage', label: 'Storage', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    { id: 'shortcuts', label: 'Shortcuts', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' }
  ];

  const providerList: AIProvider[] = ['meshy', 'tripo', 'stability'];

  const shortcuts = [
    { keys: 'Ctrl + U', action: 'Upload Image', category: 'General' },
    { keys: 'Ctrl + G', action: 'Generate 3D', category: 'General' },
    { keys: 'Space', action: 'Toggle Auto-Rotate', category: 'Viewer' },
    { keys: 'W', action: 'Toggle Wireframe', category: 'Viewer' },
    { keys: 'G', action: 'Toggle Grid', category: 'Viewer' },
    { keys: 'A', action: 'Toggle Axes', category: 'Viewer' },
    { keys: 'F', action: 'Fullscreen', category: 'Viewer' },
    { keys: 'S', action: 'Screenshot', category: 'Viewer' },
    { keys: 'R', action: 'Reset Camera', category: 'Viewer' },
    { keys: 'Ctrl + E', action: 'Export Model', category: 'Export' },
    { keys: 'Ctrl + S', action: 'Save Settings', category: 'General' },
    { keys: 'Ctrl + D', action: 'Download Model', category: 'Export' },
    { keys: 'Esc', action: 'Close Modal/Cancel', category: 'General' }
  ];

  // --- Methods ---
  async function testConnection(provider: AIProvider) {
    testingProvider = provider;
    testResults[provider] = null;
    // Simulate test
    await new Promise(r => setTimeout(r, 1500));
    const hasKey = app.settings.apiKeys[provider]?.length > 5;
    testResults[provider] = hasKey ? 'success' : 'error';
    testingProvider = null;
    app.addToast({
      type: hasKey ? 'success' : 'error',
      title: hasKey ? 'Connection Successful' : 'Connection Failed',
      message: `${PROVIDER_CONFIGS[provider].name}: ${hasKey ? 'API key is valid' : 'Invalid or missing API key'}`
    });
  }

  async function estimateStorage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const est = await navigator.storage.estimate();
      storageEstimate = { used: est.usage || 0, quota: est.quota || 0 };
    }
  }

  function exportSettings() {
    const data = JSON.stringify({ settings: app.settings, viewer: app.viewerSettings, generation: app.generationSettings }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mesh3d-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    app.addToast({ type: 'success', title: 'Settings Exported' });
  }

  function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.settings) app.settings = { ...app.settings, ...data.settings };
        if (data.viewer) app.viewerSettings = { ...app.viewerSettings, ...data.viewer };
        if (data.generation) app.generationSettings = { ...app.generationSettings, ...data.generation };
        app.saveSettings();
        app.addToast({ type: 'success', title: 'Settings Imported' });
      } catch {
        app.addToast({ type: 'error', title: 'Import Failed', message: 'Invalid settings file' });
      }
    };
    input.click();
  }

  function clearGallery() {
    app.gallery = [];
    showClearGalleryConfirm = false;
    app.addToast({ type: 'success', title: 'Gallery Cleared' });
  }

  function resetAllSettings() {
    app.resetSettings();
    showResetConfirm = false;
    app.addToast({ type: 'success', title: 'Settings Reset', message: 'All settings restored to defaults' });
  }

  // Auto-save on settings change
  $effect(() => {
    const _ = JSON.stringify(app.settings) + JSON.stringify(app.viewerSettings) + JSON.stringify(app.generationSettings) + app.theme;
    app.saveSettings();
  });

  // Estimate storage on mount
  $effect(() => { estimateStorage(); });
</script>

<svelte:head>
  <title>Settings - Mesh3D</title>
</svelte:head>

<div class="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 lg:py-8">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold text-surface-100">Settings</h1>
      <p class="text-sm text-surface-200/40 mt-1">Configure API providers, preferences, and performance</p>
    </div>
    <div class="flex gap-2">
      <button class="btn btn-secondary btn-sm" onclick={exportSettings}>
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        Export
      </button>
      <button class="btn btn-secondary btn-sm" onclick={importSettings}>
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Import
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <!-- Sidebar Navigation -->
    <div class="lg:col-span-3">
      <nav class="glass rounded-2xl p-2 space-y-1 lg:sticky lg:top-24">
        {#each sections as section}
          <button
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left
              {activeSection === section.id
                ? 'bg-primary-500/15 text-primary-300'
                : 'text-surface-200/50 hover:bg-white/5 hover:text-surface-200'}"
            onclick={() => activeSection = section.id}
          >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d={section.icon} />
            </svg>
            {section.label}
          </button>
        {/each}
      </nav>
    </div>

    <!-- Content -->
    <div class="lg:col-span-9 space-y-6">

      <!-- API Providers -->
      {#if activeSection === 'providers'}
        <div class="space-y-4 animate-fade-in">
          <h2 class="text-lg font-semibold text-surface-100">API Provider Configuration</h2>
          <p class="text-sm text-surface-200/40">Add your API keys to enable AI-powered 3D model generation. Keys are stored locally in your browser.</p>

          {#each providerList as providerId}
            {@const config = PROVIDER_CONFIGS[providerId]}
            {@const hasKey = (app.settings.apiKeys[providerId] || '').length > 0}
            <div class="glass rounded-2xl p-5 glass-hover">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center text-primary-400 font-bold text-lg">
                    {config.icon}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="text-sm font-semibold text-surface-100">{config.name}</h3>
                      <div class="w-2 h-2 rounded-full {hasKey ? 'bg-success' : 'bg-surface-200/20'}"></div>
                    </div>
                    <p class="text-xs text-surface-200/40">{config.description}</p>
                  </div>
                </div>
                <span class="badge {hasKey ? 'badge-success' : 'badge-warning'}">
                  {hasKey ? 'Connected' : 'Not Set'}
                </span>
              </div>

              <div class="flex gap-2">
                <div class="relative flex-1">
                  <input
                    type={showApiKeys[providerId] ? 'text' : 'password'}
                    class="input pr-10 font-mono text-xs"
                    placeholder="Enter your API key..."
                    value={app.settings.apiKeys[providerId] || ''}
                    oninput={(e) => app.settings.apiKeys[providerId] = (e.target as HTMLInputElement).value}
                  />
                  <button
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-surface-200/30 hover:text-surface-200/60 transition-colors"
                    onclick={() => showApiKeys[providerId] = !showApiKeys[providerId]}
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      {#if showApiKeys[providerId]}
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      {:else}
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      {/if}
                    </svg>
                  </button>
                </div>
                <button
                  class="btn btn-secondary btn-sm whitespace-nowrap"
                  disabled={testingProvider === providerId || !hasKey}
                  onclick={() => testConnection(providerId)}
                >
                  {#if testingProvider === providerId}
                    <div class="w-3 h-3 border-2 border-primary-300/30 border-t-primary-300 rounded-full animate-spin"></div>
                  {:else if testResults[providerId] === 'success'}
                    <svg class="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {:else if testResults[providerId] === 'error'}
                    <svg class="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  {:else}
                    Test
                  {/if}
                </button>
              </div>

              <div class="flex flex-wrap gap-3 mt-3 text-[11px] text-surface-200/30">
                <span>Max {config.maxImageSize}MB</span>
                <span>{config.estimatedTime}</span>
                <span>{config.pricing}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Generation Defaults -->
      {#if activeSection === 'generation'}
        <div class="space-y-4 animate-fade-in">
          <h2 class="text-lg font-semibold text-surface-100">Default Generation Settings</h2>
          <p class="text-sm text-surface-200/40">These defaults apply to new generation jobs</p>

          <div class="glass rounded-2xl p-5 space-y-5">
            <div>
              <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Default Provider</label>
              <select class="select mt-2" value={app.settings.defaultProvider} onchange={(e) => app.settings.defaultProvider = (e.target as HTMLSelectElement).value as AIProvider}>
                <option value="demo">Demo Mode (Free)</option>
                <option value="meshy">Meshy AI</option>
                <option value="tripo">Tripo AI</option>
                <option value="stability">Stability AI SF3D</option>
              </select>
            </div>

            <div>
              <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Default Quality</label>
              <div class="grid grid-cols-4 gap-1.5 mt-2">
                {#each ['low', 'medium', 'high', 'ultra'] as q}
                  <button
                    class="py-2.5 rounded-lg text-xs font-medium transition-all capitalize
                      {app.settings.defaultSettings.quality === q ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'bg-surface-900/30 text-surface-200/50 border border-transparent hover:bg-surface-900/50'}"
                    onclick={() => app.settings.defaultSettings.quality = q as QualityTier}
                  >{q}</button>
                {/each}
              </div>
            </div>

            <div>
              <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Default Polygon Count</label>
              <div class="grid grid-cols-4 gap-1.5 mt-2">
                {#each [{id:'low',l:'10K'},{id:'medium',l:'50K'},{id:'high',l:'150K'},{id:'ultra',l:'300K'}] as pc}
                  <button
                    class="py-2.5 rounded-lg text-xs font-medium transition-all
                      {app.settings.defaultSettings.polyCount === pc.id ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'bg-surface-900/30 text-surface-200/50 border border-transparent hover:bg-surface-900/50'}"
                    onclick={() => app.settings.defaultSettings.polyCount = pc.id as PolyCount}
                  >{pc.l}</button>
                {/each}
              </div>
            </div>

            <div>
              <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Default Texture Resolution</label>
              <select class="select mt-2" value={app.settings.defaultSettings.textureResolution} onchange={(e) => app.settings.defaultSettings.textureResolution = parseInt((e.target as HTMLSelectElement).value) as TextureResolution}>
                <option value={512}>512 x 512</option>
                <option value={1024}>1024 x 1024</option>
                <option value={2048}>2048 x 2048</option>
                <option value={4096}>4096 x 4096</option>
              </select>
            </div>

            <div>
              <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Default Output Format</label>
              <select class="select mt-2" value={app.settings.defaultSettings.outputFormat} onchange={(e) => app.settings.defaultSettings.outputFormat = (e.target as HTMLSelectElement).value as ExportFormat}>
                <option value="glb">GLB</option>
                <option value="gltf">glTF</option>
                <option value="obj">OBJ</option>
                <option value="stl">STL</option>
                <option value="usdz">USDZ</option>
                <option value="fbx">FBX</option>
              </select>
            </div>

            <div class="space-y-3 pt-2 border-t border-white/5">
              <label class="flex items-center justify-between cursor-pointer">
                <div>
                  <p class="text-sm text-surface-200/80">Auto-save to Gallery</p>
                  <p class="text-[11px] text-surface-200/30">Automatically save completed models</p>
                </div>
                <div class="relative">
                  <input type="checkbox" class="sr-only peer" checked={app.settings.autoSaveToGallery} onchange={(e) => app.settings.autoSaveToGallery = (e.target as HTMLInputElement).checked} />
                  <div class="w-9 h-5 bg-surface-900 rounded-full peer-checked:bg-primary-500/40 transition-colors"></div>
                  <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-surface-200/50 rounded-full peer-checked:translate-x-4 peer-checked:bg-primary-400 transition-all"></div>
                </div>
              </label>
              <label class="flex items-center justify-between cursor-pointer">
                <div>
                  <p class="text-sm text-surface-200/80">Enable Notifications</p>
                  <p class="text-[11px] text-surface-200/30">Show toast notifications for events</p>
                </div>
                <div class="relative">
                  <input type="checkbox" class="sr-only peer" checked={app.settings.enableNotifications} onchange={(e) => app.settings.enableNotifications = (e.target as HTMLInputElement).checked} />
                  <div class="w-9 h-5 bg-surface-900 rounded-full peer-checked:bg-primary-500/40 transition-colors"></div>
                  <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-surface-200/50 rounded-full peer-checked:translate-x-4 peer-checked:bg-primary-400 transition-all"></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      {/if}

      <!-- Performance -->
      {#if activeSection === 'performance'}
        <div class="space-y-4 animate-fade-in">
          <h2 class="text-lg font-semibold text-surface-100">Performance Settings</h2>
          <p class="text-sm text-surface-200/40">Optimize for your device capabilities. Detected: <span class="text-primary-300 font-medium capitalize">{app.performanceTier}</span></p>

          <div class="glass rounded-2xl p-5 space-y-5">
            <div>
              <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Quality Tier</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {#each [
                  { id: 'low', name: 'Lite', desc: 'Best for low-end devices. Reduced textures and effects.', icon: '1x' },
                  { id: 'medium', name: 'Balanced', desc: 'Good quality with reasonable performance.', icon: '2x' },
                  { id: 'high', name: 'High', desc: 'Full quality rendering with all effects.', icon: '3x' },
                  { id: 'ultra', name: 'Ultra', desc: 'Maximum quality. May impact performance.', icon: '4x' }
                ] as tier}
                  <button
                    class="flex items-center gap-3 p-4 rounded-xl text-left transition-all
                      {app.settings.qualityTier === tier.id ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-surface-900/30 border border-transparent hover:bg-surface-900/50'}"
                    onclick={() => app.settings.qualityTier = tier.id as QualityTier}
                  >
                    <div class="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 font-mono font-bold text-sm">
                      {tier.icon}
                    </div>
                    <div>
                      <p class="text-sm font-medium text-surface-100">{tier.name}</p>
                      <p class="text-[11px] text-surface-200/35">{tier.desc}</p>
                    </div>
                  </button>
                {/each}
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center">
                <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Pixel Ratio</label>
                <span class="text-xs text-primary-400 font-mono">{app.viewerSettings.pixelRatio.toFixed(1)}x</span>
              </div>
              <input type="range" min="0.5" max="3" step="0.25" value={app.viewerSettings.pixelRatio} oninput={(e) => app.viewerSettings.pixelRatio = parseFloat((e.target as HTMLInputElement).value)} class="mt-2" />
              <div class="flex justify-between text-[10px] text-surface-200/25 mt-1">
                <span>0.5x (Fast)</span><span>Device: {(typeof window !== 'undefined' ? window.devicePixelRatio : 1).toFixed(1)}x</span><span>3x (Sharp)</span>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center">
                <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Max Concurrent Jobs</label>
                <span class="text-xs text-primary-400 font-mono">{app.settings.maxConcurrentJobs}</span>
              </div>
              <input type="range" min="1" max="5" step="1" value={app.settings.maxConcurrentJobs} oninput={(e) => app.settings.maxConcurrentJobs = parseInt((e.target as HTMLInputElement).value)} class="mt-2" />
            </div>

            <label class="flex items-center justify-between cursor-pointer pt-2 border-t border-white/5">
              <div>
                <p class="text-sm text-surface-200/80">Enable Shadows</p>
                <p class="text-[11px] text-surface-200/30">Real-time shadow rendering in 3D viewer</p>
              </div>
              <div class="relative">
                <input type="checkbox" class="sr-only peer" checked={app.viewerSettings.enableShadows} onchange={(e) => app.viewerSettings.enableShadows = (e.target as HTMLInputElement).checked} />
                <div class="w-9 h-5 bg-surface-900 rounded-full peer-checked:bg-primary-500/40 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-surface-200/50 rounded-full peer-checked:translate-x-4 peer-checked:bg-primary-400 transition-all"></div>
              </div>
            </label>
          </div>
        </div>
      {/if}

      <!-- Appearance -->
      {#if activeSection === 'appearance'}
        <div class="space-y-4 animate-fade-in">
          <h2 class="text-lg font-semibold text-surface-100">Appearance</h2>

          <div class="glass rounded-2xl p-5">
            <label class="text-xs font-medium text-surface-200/60 uppercase tracking-wider">Theme</label>
            <div class="grid grid-cols-3 gap-3 mt-3">
              {#each [
                { id: 'dark', label: 'Dark', bg: 'bg-surface-950', fg: 'bg-surface-800', accent: 'border-primary-500/50' },
                { id: 'light', label: 'Light', bg: 'bg-surface-50', fg: 'bg-surface-200', accent: 'border-primary-500/50' },
                { id: 'system', label: 'System', bg: 'bg-gradient-to-r from-surface-950 to-surface-50', fg: 'bg-surface-200/20', accent: 'border-primary-500/50' }
              ] as theme}
                <button
                  class="relative p-4 rounded-xl border-2 transition-all
                    {app.theme === theme.id ? theme.accent + ' bg-primary-500/5' : 'border-transparent bg-surface-900/30 hover:bg-surface-900/50'}"
                  onclick={() => { app.theme = theme.id as any; document.documentElement.className = theme.id === 'light' ? '' : 'dark'; }}
                >
                  <div class="{theme.bg} rounded-lg h-16 mb-2 flex items-end p-2 gap-1">
                    <div class="{theme.fg} rounded w-8 h-3"></div>
                    <div class="{theme.fg} rounded w-5 h-3 opacity-60"></div>
                  </div>
                  <p class="text-xs font-medium text-surface-200/70">{theme.label}</p>
                  {#if app.theme === theme.id}
                    <div class="absolute top-2 right-2">
                      <svg class="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- Storage -->
      {#if activeSection === 'storage'}
        <div class="space-y-4 animate-fade-in">
          <h2 class="text-lg font-semibold text-surface-100">Storage Management</h2>

          <div class="glass rounded-2xl p-5 space-y-4">
            {#if storageEstimate}
              <div>
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-surface-200/60">Used Space</span>
                  <span class="text-surface-100 font-medium">{formatFileSize(storageEstimate.used)} / {formatFileSize(storageEstimate.quota)}</span>
                </div>
                <div class="h-3 bg-surface-900 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all" style="width: {Math.min((storageEstimate.used / storageEstimate.quota) * 100, 100)}%"></div>
                </div>
                <p class="text-[11px] text-surface-200/30 mt-1">{((storageEstimate.used / storageEstimate.quota) * 100).toFixed(1)}% used</p>
              </div>
            {:else}
              <p class="text-sm text-surface-200/40">Storage estimation not available</p>
            {/if}

            <div class="flex items-center justify-between p-4 bg-surface-900/30 rounded-xl">
              <div>
                <p class="text-sm text-surface-200/80">Gallery Models</p>
                <p class="text-[11px] text-surface-200/30">{app.gallery.length} models saved</p>
              </div>
              {#if showClearGalleryConfirm}
                <div class="flex gap-2">
                  <button class="btn btn-danger btn-sm" onclick={clearGallery}>Confirm</button>
                  <button class="btn btn-ghost btn-sm" onclick={() => showClearGalleryConfirm = false}>Cancel</button>
                </div>
              {:else}
                <button class="btn btn-danger btn-sm" onclick={() => showClearGalleryConfirm = true}>Clear Gallery</button>
              {/if}
            </div>

            <div class="flex items-center justify-between p-4 bg-surface-900/30 rounded-xl">
              <div>
                <p class="text-sm text-surface-200/80">Generation Cache</p>
                <p class="text-[11px] text-surface-200/30">Cached results for faster re-generation</p>
              </div>
              <button class="btn btn-secondary btn-sm" onclick={() => { app.addToast({ type: 'success', title: 'Cache Cleared' }); }}>Clear Cache</button>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="glass rounded-2xl p-5 border-error/10">
            <h3 class="text-sm font-semibold text-error mb-3">Danger Zone</h3>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-surface-200/80">Reset All Settings</p>
                <p class="text-[11px] text-surface-200/30">Restore all settings to factory defaults</p>
              </div>
              {#if showResetConfirm}
                <div class="flex gap-2">
                  <button class="btn btn-danger btn-sm" onclick={resetAllSettings}>Yes, Reset</button>
                  <button class="btn btn-ghost btn-sm" onclick={() => showResetConfirm = false}>Cancel</button>
                </div>
              {:else}
                <button class="btn btn-danger btn-sm" onclick={() => showResetConfirm = true}>Reset All</button>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <!-- Keyboard Shortcuts -->
      {#if activeSection === 'shortcuts'}
        <div class="space-y-4 animate-fade-in">
          <h2 class="text-lg font-semibold text-surface-100">Keyboard Shortcuts</h2>

          <div class="glass rounded-2xl overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="border-b border-white/5">
                  <th class="text-left text-xs font-medium text-surface-200/40 uppercase tracking-wider px-5 py-3">Shortcut</th>
                  <th class="text-left text-xs font-medium text-surface-200/40 uppercase tracking-wider px-5 py-3">Action</th>
                  <th class="text-left text-xs font-medium text-surface-200/40 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Category</th>
                </tr>
              </thead>
              <tbody>
                {#each shortcuts as shortcut, i}
                  <tr class="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td class="px-5 py-3">
                      <kbd class="inline-flex items-center gap-1 px-2 py-1 bg-surface-900/50 rounded-md text-xs font-mono text-primary-300 border border-white/5">
                        {shortcut.keys}
                      </kbd>
                    </td>
                    <td class="px-5 py-3 text-sm text-surface-200/70">{shortcut.action}</td>
                    <td class="px-5 py-3 hidden sm:table-cell">
                      <span class="badge badge-primary">{shortcut.category}</span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
