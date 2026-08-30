<script setup lang="ts">
import DeckPanel from '../components/controller/DeckPanel.vue'
import MainDisplay from '../components/display/MainDisplay.vue'
import MixerPanel from '../components/mixer/MixerPanel.vue'
</script>

<template>
  <div class="min-h-screen bg-surface px-4 py-6">
    <header class="mx-auto mb-4 flex max-w-7xl flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-wide">Web DJ</h1>
        <p class="mt-0.5 text-sm text-muted">Phase 20 — controller UI</p>
      </div>
      <details class="max-w-3xl text-xs text-muted">
        <summary class="cursor-pointer tracking-[0.16em] uppercase hover:text-ink">
          Keyboard
        </summary>
        <p class="mt-2 leading-relaxed">
          1 / 2 focus · Space play/pause · C cue · H channel cue · R rec · Q W E hot cues · I/O/L
          loop · , . half/double · J/K beat jump · Y slip · V vinyl · F color FX · B beat FX · N
          cycle beat FX · T quantize · ← → seek · [ ] pitch bend · M master tempo · S sync · G
          master deck
        </p>
      </details>
    </header>
    <main class="mx-auto flex max-w-7xl flex-col gap-4">
      <MainDisplay />
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <DeckPanel :deck-id="1" />
        <MixerPanel />
        <DeckPanel :deck-id="2" />
      </div>
    </main>
  </div>
</template>
