<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  LIBRARY_SORTS,
  uniqueArtists,
  visibleLibraryTracks,
  type LibrarySort,
} from '../../domain/library'
import { formatTimecode } from '../../domain/timecode'
import { useCommandBus } from '../../io/keys'
import { useLibraryStore } from '../../state/library.store'

const commandBus = useCommandBus()
const libraryStore = useLibraryStore()
const { library } = storeToRefs(libraryStore)
const playlistName = ref('')

const visible = computed(() => visibleLibraryTracks(library.value))
const artists = computed(() => uniqueArtists(library.value.tracks))

async function onImport(event: Event): Promise<void> {
  const input = event.target
  if (!(input instanceof HTMLInputElement) || !input.files?.length) {
    return
  }
  await commandBus.dispatch({ type: 'LIBRARY_IMPORT', files: [...input.files] })
  input.value = ''
}

async function setQuery(event: Event): Promise<void> {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  await commandBus.dispatch({ type: 'LIBRARY_SET_QUERY', query: target.value })
}

async function setSort(event: Event): Promise<void> {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    return
  }
  await commandBus.dispatch({ type: 'LIBRARY_SET_SORT', sort: target.value as LibrarySort })
}

async function setArtist(event: Event): Promise<void> {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    return
  }
  await commandBus.dispatch({
    type: 'LIBRARY_SET_ARTIST',
    artist: target.value === '' ? null : target.value,
  })
}

async function setBpmMin(event: Event): Promise<void> {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  await commandBus.dispatch({
    type: 'LIBRARY_SET_BPM',
    min: target.value === '' ? null : Number(target.value),
    max: library.value.bpmMax,
  })
}

async function setBpmMax(event: Event): Promise<void> {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  await commandBus.dispatch({
    type: 'LIBRARY_SET_BPM',
    min: library.value.bpmMin,
    max: target.value === '' ? null : Number(target.value),
  })
}

async function selectPlaylist(playlistId: string | null): Promise<void> {
  await commandBus.dispatch({ type: 'LIBRARY_SELECT_PLAYLIST', playlistId })
}

async function createPlaylist(): Promise<void> {
  const name = playlistName.value
  await commandBus.dispatch({ type: 'LIBRARY_CREATE_PLAYLIST', name })
  playlistName.value = ''
}

async function deletePlaylist(): Promise<void> {
  if (!library.value.selectedPlaylistId) {
    return
  }
  await commandBus.dispatch({
    type: 'LIBRARY_DELETE_PLAYLIST',
    playlistId: library.value.selectedPlaylistId,
  })
}

async function loadTrack(deck: 1 | 2, trackId: string): Promise<void> {
  await commandBus.dispatch({ type: 'LIBRARY_LOAD', deck, trackId })
}

async function addToLatestPlaylist(trackId: string): Promise<void> {
  const target = library.value.playlists[library.value.playlists.length - 1]
  if (!target) {
    return
  }
  await commandBus.dispatch({
    type: 'LIBRARY_ADD_TO_PLAYLIST',
    playlistId: target.id,
    trackId,
  })
}

async function removeFromPlaylist(trackId: string): Promise<void> {
  if (!library.value.selectedPlaylistId) {
    return
  }
  await commandBus.dispatch({
    type: 'LIBRARY_REMOVE_FROM_PLAYLIST',
    playlistId: library.value.selectedPlaylistId,
    trackId,
  })
}

function sortLabel(sort: LibrarySort): string {
  switch (sort) {
    case 'title':
      return 'Title'
    case 'artist':
      return 'Artist'
    case 'bpm':
      return 'BPM'
    case 'added':
      return 'Added'
    default: {
      const neverSort: never = sort
      return neverSort
    }
  }
}
</script>

<template>
  <section
    data-testid="library"
    class="rounded-xl border border-panel-border bg-panel p-5 shadow-xl"
  >
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xs tracking-[0.2em] text-muted uppercase">Library</h2>
      <label
        class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-panel-border px-3 py-1.5 text-xs"
      >
        <span>Import</span>
        <input
          data-testid="library-import"
          class="sr-only"
          type="file"
          accept="audio/*"
          multiple
          @change="onImport"
        />
      </label>
    </header>

    <div class="mb-3 flex flex-wrap items-end gap-3">
      <label class="flex min-w-[10rem] flex-1 flex-col gap-1 text-[10px] tracking-wider text-muted uppercase">
        Search
        <input
          data-testid="library-search"
          class="rounded-md border border-panel-border bg-surface px-2 py-1 text-sm text-ink normal-case"
          type="search"
          :value="library.query"
          @input="setQuery"
        />
      </label>
      <label class="flex flex-col gap-1 text-[10px] tracking-wider text-muted uppercase">
        Sort
        <select
          data-testid="library-sort"
          class="rounded-md border border-panel-border bg-surface px-2 py-1 text-sm text-ink normal-case"
          :value="library.sort"
          @change="setSort"
        >
          <option v-for="sort in LIBRARY_SORTS" :key="sort" :value="sort">
            {{ sortLabel(sort) }}
          </option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-[10px] tracking-wider text-muted uppercase">
        Artist
        <select
          data-testid="library-artist"
          class="rounded-md border border-panel-border bg-surface px-2 py-1 text-sm text-ink normal-case"
          :value="library.artistFilter ?? ''"
          @change="setArtist"
        >
          <option value="">All</option>
          <option v-for="artist in artists" :key="artist" :value="artist">
            {{ artist }}
          </option>
        </select>
      </label>
      <label class="flex w-20 flex-col gap-1 text-[10px] tracking-wider text-muted uppercase">
        BPM min
        <input
          data-testid="library-bpm-min"
          class="rounded-md border border-panel-border bg-surface px-2 py-1 text-sm text-ink normal-case"
          type="number"
          min="0"
          :value="library.bpmMin ?? ''"
          @input="setBpmMin"
        />
      </label>
      <label class="flex w-20 flex-col gap-1 text-[10px] tracking-wider text-muted uppercase">
        BPM max
        <input
          data-testid="library-bpm-max"
          class="rounded-md border border-panel-border bg-surface px-2 py-1 text-sm text-ink normal-case"
          type="number"
          min="0"
          :value="library.bpmMax ?? ''"
          @input="setBpmMax"
        />
      </label>
    </div>

    <div class="mb-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-testid="library-collection"
        class="rounded px-2 py-0.5 text-[9px] tracking-wide uppercase"
        :class="
          library.selectedPlaylistId === null
            ? 'bg-accent text-surface'
            : 'border border-panel-border text-muted'
        "
        :aria-pressed="library.selectedPlaylistId === null"
        @click="selectPlaylist(null)"
      >
        Collection
      </button>
      <button
        v-for="playlist in library.playlists"
        :key="playlist.id"
        type="button"
        :data-testid="`library-playlist-${playlist.id}`"
        class="rounded px-2 py-0.5 text-[9px] tracking-wide uppercase"
        :class="
          library.selectedPlaylistId === playlist.id
            ? 'bg-accent text-surface'
            : 'border border-panel-border text-muted'
        "
        :aria-pressed="library.selectedPlaylistId === playlist.id"
        @click="selectPlaylist(playlist.id)"
      >
        {{ playlist.name }}
      </button>
      <input
        v-model="playlistName"
        data-testid="library-playlist-name"
        class="w-32 rounded-md border border-panel-border bg-surface px-2 py-1 text-xs text-ink"
        type="text"
        placeholder="Playlist name"
      />
      <button
        type="button"
        data-testid="library-playlist-create"
        class="rounded border border-panel-border px-2 py-0.5 text-[9px] tracking-wide text-muted uppercase"
        @click="createPlaylist"
      >
        New
      </button>
      <button
        v-if="library.selectedPlaylistId"
        type="button"
        data-testid="library-playlist-delete"
        class="rounded border border-panel-border px-2 py-0.5 text-[9px] tracking-wide text-danger uppercase"
        @click="deletePlaylist"
      >
        Delete
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="text-[10px] tracking-wider text-muted uppercase">
          <tr>
            <th class="pb-2 font-normal">Title</th>
            <th class="pb-2 font-normal">Artist</th>
            <th class="pb-2 font-normal">BPM</th>
            <th class="pb-2 font-normal">Time</th>
            <th class="pb-2 font-normal">Load</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="visible.length === 0">
            <td colspan="5" class="py-4 text-muted">Import local audio files. Files are not stored in IndexedDB.</td>
          </tr>
          <tr
            v-for="track in visible"
            :key="track.id"
            data-testid="library-row"
            class="border-t border-panel-border"
          >
            <td class="py-2 pr-3 text-ink">{{ track.title }}</td>
            <td class="py-2 pr-3 text-muted">{{ track.artist ?? '—' }}</td>
            <td class="py-2 pr-3 font-mono text-muted">
              {{ track.bpm !== undefined ? track.bpm.toFixed(1) : '—' }}
            </td>
            <td class="py-2 pr-3 font-mono text-muted">
              {{ track.duration > 0 ? formatTimecode(track.duration) : '—' }}
            </td>
            <td class="py-2">
              <div class="flex gap-1">
                <button
                  type="button"
                  data-testid="library-load-1"
                  class="rounded px-1.5 py-0.5 text-[9px] uppercase"
                  :class="
                    track.playable
                      ? 'border border-panel-border text-muted'
                      : 'cursor-not-allowed text-muted/40'
                  "
                  :disabled="!track.playable"
                  @click="loadTrack(1, track.id)"
                >
                  1
                </button>
                <button
                  type="button"
                  data-testid="library-load-2"
                  class="rounded px-1.5 py-0.5 text-[9px] uppercase"
                  :class="
                    track.playable
                      ? 'border border-panel-border text-muted'
                      : 'cursor-not-allowed text-muted/40'
                  "
                  :disabled="!track.playable"
                  @click="loadTrack(2, track.id)"
                >
                  2
                </button>
                <button
                  v-if="library.selectedPlaylistId"
                  type="button"
                  data-testid="library-playlist-remove"
                  class="rounded border border-panel-border px-1.5 py-0.5 text-[9px] text-muted uppercase"
                  @click="removeFromPlaylist(track.id)"
                >
                  Remove
                </button>
                <button
                  v-else-if="library.playlists.length > 0"
                  type="button"
                  data-testid="library-playlist-add"
                  class="rounded border border-panel-border px-1.5 py-0.5 text-[9px] text-muted uppercase"
                  @click="addToLatestPlaylist(track.id)"
                >
                  Add
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
