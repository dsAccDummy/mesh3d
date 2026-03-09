<script lang="ts">
  import '../app.css';
  import { app } from '$lib/stores/stores.svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  // Navigation items
  const navItems = [
    { href: '/', label: 'Generate', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { href: '/gallery', label: 'Gallery', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { href: '/batch', label: 'Batch', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { href: '/compare', label: 'Compare', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { href: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
  ];

  function isActive(href: string): boolean {
    const currentPath = $page.url.pathname.replace(base, '') || '/';
    return href === '/' ? currentPath === '/' : currentPath.startsWith(href);
  }

  function toggleMobileMenu() {
    app.mobileMenuOpen = !app.mobileMenuOpen;
  }

  function closeMobileMenu() {
    app.mobileMenuOpen = false;
  }
</script>

<div class="min-h-dvh flex flex-col">
  <!-- ===== NAVBAR ===== -->
  <header class="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
    <div class="max-w-[1600px] mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <a href="{base}/" class="flex items-center gap-2.5 group" onclick={closeMobileMenu}>
          <div class="relative">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            </div>
            <div class="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <div>
            <span class="text-lg font-bold gradient-text">Mesh3D</span>
            <span class="hidden sm:inline text-[10px] text-surface-200/40 ml-1.5 font-medium">IMAGE TO 3D</span>
          </div>
        </a>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-1">
          {#each navItems as item}
            <a
              href="{base}{item.href}"
              class="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                {isActive(item.href)
                  ? 'bg-primary-500/15 text-primary-300 shadow-sm shadow-primary-500/10'
                  : 'text-surface-200/60 hover:text-surface-100 hover:bg-white/5'}"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </a>
          {/each}
        </nav>

        <!-- Right side -->
        <div class="flex items-center gap-2">
          <!-- Performance indicator -->
          <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-[11px] text-surface-200/50">
            <div class="w-1.5 h-1.5 rounded-full {app.performanceTier === 'high' ? 'bg-success' : app.performanceTier === 'medium' ? 'bg-warning' : 'bg-error'}"></div>
            {app.performanceTier === 'high' ? 'Ultra' : app.performanceTier === 'medium' ? 'Balanced' : 'Lite'}
          </div>

          <!-- Mobile hamburger -->
          <button
            class="md:hidden btn btn-ghost btn-icon"
            onclick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              {#if app.mobileMenuOpen}
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              {/if}
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    {#if app.mobileMenuOpen}
      <div class="md:hidden border-t border-white/5 animate-slide-up">
        <nav class="px-4 py-3 space-y-1">
          {#each navItems as item}
            <a
              href="{base}{item.href}"
              onclick={closeMobileMenu}
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                {isActive(item.href)
                  ? 'bg-primary-500/15 text-primary-300'
                  : 'text-surface-200/60 hover:bg-white/5 hover:text-surface-100'}"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </a>
          {/each}
        </nav>
      </div>
    {/if}
  </header>

  <!-- ===== MAIN CONTENT ===== -->
  <main class="flex-1 pt-16">
    <div class="page-enter">
      {@render children()}
    </div>
  </main>

  <!-- ===== FOOTER ===== -->
  <footer class="border-t border-white/5 py-6 px-4 sm:px-6">
    <div class="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-surface-200/30">
      <div class="flex items-center gap-2">
        <span class="gradient-text font-semibold">Mesh3D</span>
        <span>Image to 3D Generator</span>
      </div>
      <div class="flex items-center gap-4">
        <span>Built with SvelteKit + Threlte + Three.js</span>
        <span class="hidden sm:inline">|</span>
        <span class="hidden sm:inline">WebGL {app.performanceTier === 'low' ? '1.0' : '2.0'}</span>
      </div>
    </div>
  </footer>

  <!-- ===== TOAST CONTAINER ===== -->
  {#if app.toasts.length > 0}
    <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {#each app.toasts as toast (toast.id)}
        <div
          class="pointer-events-auto glass rounded-xl px-4 py-3 flex items-start gap-3 animate-slide-up shadow-xl
            {toast.type === 'success' ? 'border-success/30' : ''}
            {toast.type === 'error' ? 'border-error/30' : ''}
            {toast.type === 'warning' ? 'border-warning/30' : ''}
            {toast.type === 'info' ? 'border-primary-500/30' : ''}"
        >
          <div class="mt-0.5">
            {#if toast.type === 'success'}
              <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {:else if toast.type === 'error'}
              <svg class="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {:else if toast.type === 'warning'}
              <svg class="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            {:else}
              <svg class="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-surface-100">{toast.title}</p>
            {#if toast.message}
              <p class="text-xs text-surface-200/50 mt-0.5">{toast.message}</p>
            {/if}
          </div>
          {#if toast.dismissible !== false}
            <button
              class="text-surface-200/30 hover:text-surface-100 transition-colors"
              onclick={() => app.removeToast(toast.id)}
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Mobile menu overlay -->
  {#if app.mobileMenuOpen}
    <button
      class="fixed inset-0 bg-black/50 z-40 md:hidden"
      onclick={closeMobileMenu}
      aria-label="Close menu"
    ></button>
  {/if}
</div>
