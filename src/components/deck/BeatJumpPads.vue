<script setup lang="ts">
import type { DeckId } from '../../commands/DJCommand'
import {
  BEAT_JUMP_LENGTHS,
  beatJumpLabel,
  beatJumpTestId,
  type BeatJumpLength,
} from '../../domain/beatJump'
import { useCommandBus } from '../../io/keys'

const props = defineProps<{
  deckId: DeckId
  disabled: boolean
}>()

const commandBus = useCommandBus()

async function jump(beats: BeatJumpLength): Promise<void> {
  await commandBus.dispatch({ type: 'BEAT_JUMP', deck: props.deckId, beats })
}
</script>

<template>
  <div class="flex flex-col gap-1" data-testid="beat-jump">
    <p class="text-[9px] tracking-wider text-muted uppercase">Beat jump</p>
    <div class="flex flex-wrap gap-1">
      <button
        v-for="beats in BEAT_JUMP_LENGTHS"
        :key="beats"
        type="button"
        :data-testid="beatJumpTestId(beats)"
        class="rounded border border-panel-border px-1.5 py-0.5 text-[9px] tracking-wide text-muted"
        :disabled="disabled"
        @click="jump(beats)"
      >
        {{ beatJumpLabel(beats) }}
      </button>
    </div>
  </div>
</template>
