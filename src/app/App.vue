<script setup lang="ts">
import DeckPanel from '../components/controller/DeckPanel.vue'
</script>

<template>
  <div class="min-h-screen bg-surface px-6 py-8">
    <header class="mx-auto mb-8 flex max-w-5xl items-baseline justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-wide">Web DJ</h1>
        <p class="mt-1 text-sm text-muted">Phase 1 — single-deck transport</p>
      </div>
    </header>
    <main class="mx-auto max-w-5xl">
      <DeckPanel />
    </main>
  </div>
</template>
