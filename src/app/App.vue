<script setup lang="ts">
import DeckPanel from '../components/controller/DeckPanel.vue'
import MixerPanel from '../components/mixer/MixerPanel.vue'
</script>

<template>
  <div class="min-h-screen bg-surface px-4 py-8">
    <header class="mx-auto mb-8 flex max-w-7xl items-baseline justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-wide">Web DJ</h1>
        <p class="mt-1 text-sm text-muted">Phase 10 — loops</p>
      </div>
      <p class="text-xs text-muted">
        1 / 2 focus · Space play/pause · C cue · Q W E hot cues · I/O/L loop · , . half/double · T
        quantize · ← → seek · [ ] pitch bend · M master tempo · S sync · G master deck
      </p>
    </header>
    <main
      class="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
    >
      <DeckPanel :deck-id="1" />
      <MixerPanel />
      <DeckPanel :deck-id="2" />
    </main>
  </div>
</template>
