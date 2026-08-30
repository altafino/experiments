<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { DeckId } from '../../commands/DJCommand'
import type { HotCue, Loop } from '../../domain/DeckState'
import { PAD_BANKS, PAD_BANK_LABELS, padBankTestId, type PadBank } from '../../domain/padBank'
import { useViewStore } from '../../state/view.store'
import BeatJumpPads from './BeatJumpPads.vue'
import HotCuePads from './HotCuePads.vue'
import LoopControls from './LoopControls.vue'

defineProps<{
  deckId: DeckId
  hotCues: HotCue[]
  quantizeEnabled: boolean
  loopInSeconds?: number
  activeLoop?: Loop
  disabled: boolean
}>()

const viewStore = useViewStore()
const { padBank } = storeToRefs(viewStore)

function selectBank(bank: PadBank): void {
  viewStore.setPadBank(bank)
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1" data-testid="pad-bank">
    <div class="flex gap-0.5" role="tablist" aria-label="Performance pads">
      <button
        v-for="bank in PAD_BANKS"
        :key="bank"
        type="button"
        role="tab"
        :data-testid="padBankTestId(bank)"
        :aria-selected="padBank === bank"
        class="min-h-11 min-w-11 flex-1 rounded-sm px-1 text-[9px] tracking-[0.12em] uppercase"
        :class="
          padBank === bank ? 'bg-accent/20 text-accent' : 'border border-panel-border text-muted'
        "
        @click="selectBank(bank)"
      >
        {{ PAD_BANK_LABELS[bank] }}
      </button>
    </div>
    <HotCuePads
      v-show="padBank === 'hotcue'"
      :deck-id="deckId"
      :hot-cues="hotCues"
      :quantize-enabled="quantizeEnabled"
      :disabled="disabled"
    />
    <LoopControls
      v-show="padBank === 'loop'"
      :deck-id="deckId"
      :loop-in-seconds="loopInSeconds"
      :active-loop="activeLoop"
      :disabled="disabled"
    />
    <BeatJumpPads v-show="padBank === 'jump'" :deck-id="deckId" :disabled="disabled" />
  </div>
</template>
