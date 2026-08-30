import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './app/App.vue'
import { AudioEngine } from './audio/AudioEngine'
import { CommandBus } from './commands/CommandBus'
import { KeyboardController } from './io/KeyboardController'
import { commandBusKey } from './io/keys'
import { LibraryService } from './library/LibraryService'
import { MidiService } from './midi/MidiService'
import { useDeckStore } from './state/deck.store'
import { useLibraryStore } from './state/library.store'
import { useMidiStore } from './state/midi.store'
import { useMixerStore } from './state/mixer.store'
import { useRecordingStore } from './state/recording.store'
import { startUiSync } from './state/uiSync'
import './style.css'

const audioEngine = new AudioEngine()
const libraryService = new LibraryService()
const midiService = new MidiService()
const commandBus = new CommandBus(audioEngine, libraryService, midiService)
midiService.setDispatch((command) => commandBus.dispatch(command))
midiService.setEngine(audioEngine)
const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.provide(commandBusKey, commandBus)

const deckStore = useDeckStore(pinia)
const mixerStore = useMixerStore(pinia)
const libraryStore = useLibraryStore(pinia)
const recordingStore = useRecordingStore(pinia)
const midiStore = useMidiStore(pinia)
startUiSync(
  audioEngine,
  libraryService,
  midiService,
  deckStore,
  mixerStore,
  libraryStore,
  recordingStore,
  midiStore,
)

const keyboard = new KeyboardController(commandBus, audioEngine, {
  get: () => deckStore.focusedDeck,
  set: (deck) => {
    deckStore.focusDeck(deck)
  },
})
keyboard.attach()

app.mount('#app')
