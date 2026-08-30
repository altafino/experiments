import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './app/App.vue'
import { AudioEngine } from './audio/AudioEngine'
import { CommandBus } from './commands/CommandBus'
import { KeyboardController } from './io/KeyboardController'
import { commandBusKey } from './io/keys'
import { useDeckStore } from './state/deck.store'
import { useMixerStore } from './state/mixer.store'
import { startUiSync } from './state/uiSync'
import './style.css'

const audioEngine = new AudioEngine()
const commandBus = new CommandBus(audioEngine)
const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.provide(commandBusKey, commandBus)

const deckStore = useDeckStore(pinia)
const mixerStore = useMixerStore(pinia)
startUiSync(audioEngine, deckStore, mixerStore)

const keyboard = new KeyboardController(commandBus, audioEngine, {
  get: () => deckStore.focusedDeck,
  set: (deck) => {
    deckStore.focusDeck(deck)
  },
})
keyboard.attach()

app.mount('#app')
