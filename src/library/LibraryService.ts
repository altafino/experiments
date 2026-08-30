import type { DeckState } from '../domain/DeckState'
import {
  DEFAULT_LIBRARY_SORT,
  parseTrackName,
  type LibrarySort,
  type LibraryState,
  type LibraryTrack,
  type Playlist,
} from '../domain/library'
import type { AnalysisRepository } from './AnalysisRepository'
import { IndexedDbRepository } from './IndexedDbRepository'
import { fileAnalysisKey } from './fileAnalysisKey'
import { IndexedDbLibraryCatalog } from './IndexedDbLibraryCatalog'
import {
  MemoryLibraryCatalog,
  toStoredTrack,
  type LibraryCatalog,
} from './LibraryCatalog'

export interface LibraryController {
  importFiles(files: File[]): Promise<void>
  fileOf(trackId: string): File | undefined
  setQuery(query: string): void
  setSort(sort: LibrarySort): void
  setArtistFilter(artist: string | null): void
  setBpmFilter(min: number | null, max: number | null): void
  selectPlaylist(playlistId: string | null): void
  createPlaylist(name: string): string
  deletePlaylist(playlistId: string): void
  addToPlaylist(playlistId: string, trackId: string): void
  removeFromPlaylist(playlistId: string, trackId: string): void
  syncFromDeck(state: DeckState): void
  getSnapshot(): LibraryState
}

/**
 * In-memory file map plus persisted metadata/playlists.
 * Audio blobs are never written to IndexedDB.
 */
export class LibraryService implements LibraryController {
  private readonly catalog: LibraryCatalog
  private readonly analysis: AnalysisRepository
  private readonly files = new Map<string, File>()
  private tracks: LibraryTrack[] = []
  private playlists: Playlist[] = []
  private query = ''
  private sort: LibrarySort = DEFAULT_LIBRARY_SORT
  private artistFilter: string | null = null
  private bpmMin: number | null = null
  private bpmMax: number | null = null
  private selectedPlaylistId: string | null = null
  private hydratePromise: Promise<void> | null = null

  constructor(catalog?: LibraryCatalog, analysis?: AnalysisRepository) {
    this.catalog = catalog ?? defaultCatalog()
    this.analysis = analysis ?? new IndexedDbRepository()
    this.hydratePromise = this.hydrate()
  }

  async ready(): Promise<void> {
    await this.hydratePromise
  }

  async importFiles(files: File[]): Promise<void> {
    await this.ready()
    const now = Date.now()
    for (const file of files) {
      const id = fileAnalysisKey(file)
      this.files.set(id, file)
      const parsed = parseTrackName(file.name)
      const cached = await this.analysis.get(id)
      const existing = this.tracks.find((track) => track.id === id)
      const next: LibraryTrack = {
        id,
        title: cached?.title || parsed.title,
        artist: existing?.artist ?? parsed.artist,
        album: existing?.album,
        duration: cached?.duration ?? existing?.duration ?? 0,
        bpm: cached?.bpm ?? existing?.bpm,
        addedAt: existing?.addedAt ?? now,
        playable: true,
      }
      this.upsertTrack(next)
      await this.persistTrack(next)
    }
  }

  fileOf(trackId: string): File | undefined {
    return this.files.get(trackId)
  }

  setQuery(query: string): void {
    this.query = query
  }

  setSort(sort: LibrarySort): void {
    this.sort = sort
  }

  setArtistFilter(artist: string | null): void {
    this.artistFilter = artist && artist.length > 0 ? artist : null
  }

  setBpmFilter(min: number | null, max: number | null): void {
    this.bpmMin = min
    this.bpmMax = max
  }

  selectPlaylist(playlistId: string | null): void {
    this.selectedPlaylistId = playlistId
  }

  createPlaylist(name: string): string {
    const trimmed = name.trim()
    const id = crypto.randomUUID()
    const playlist: Playlist = {
      id,
      name: trimmed || `Playlist ${this.playlists.length + 1}`,
      trackIds: [],
    }
    this.playlists = [...this.playlists, playlist]
    void this.catalog.putPlaylist(playlist)
    return id
  }

  deletePlaylist(playlistId: string): void {
    this.playlists = this.playlists.filter((playlist) => playlist.id !== playlistId)
    if (this.selectedPlaylistId === playlistId) {
      this.selectedPlaylistId = null
    }
    void this.catalog.deletePlaylist(playlistId)
  }

  addToPlaylist(playlistId: string, trackId: string): void {
    const playlist = this.playlists.find((item) => item.id === playlistId)
    if (!playlist || playlist.trackIds.includes(trackId)) {
      return
    }
    playlist.trackIds = [...playlist.trackIds, trackId]
    void this.catalog.putPlaylist({ ...playlist, trackIds: [...playlist.trackIds] })
  }

  removeFromPlaylist(playlistId: string, trackId: string): void {
    const playlist = this.playlists.find((item) => item.id === playlistId)
    if (!playlist) {
      return
    }
    playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId)
    void this.catalog.putPlaylist({ ...playlist, trackIds: [...playlist.trackIds] })
  }

  syncFromDeck(state: DeckState): void {
    if (!state.trackId) {
      return
    }
    const track = this.tracks.find((item) => item.id === state.trackId)
    if (!track) {
      return
    }
    let changed = false
    if (state.durationSeconds > 0 && track.duration !== state.durationSeconds) {
      track.duration = state.durationSeconds
      changed = true
    }
    if (state.originalBpm !== undefined && track.bpm !== state.originalBpm) {
      track.bpm = state.originalBpm
      changed = true
    }
    if (changed) {
      void this.persistTrack(track)
    }
  }

  getSnapshot(): LibraryState {
    return {
      tracks: this.tracks.map((track) => ({ ...track, playable: this.files.has(track.id) })),
      playlists: this.playlists.map((playlist) => ({
        ...playlist,
        trackIds: [...playlist.trackIds],
      })),
      query: this.query,
      sort: this.sort,
      artistFilter: this.artistFilter,
      bpmMin: this.bpmMin,
      bpmMax: this.bpmMax,
      selectedPlaylistId: this.selectedPlaylistId,
    }
  }

  private async hydrate(): Promise<void> {
    try {
      const [tracks, playlists] = await Promise.all([
        this.catalog.listTracks(),
        this.catalog.listPlaylists(),
      ])
      this.tracks = tracks.map((track) => ({ ...track, playable: this.files.has(track.id) }))
      this.playlists = playlists.map((playlist) => ({
        ...playlist,
        trackIds: [...playlist.trackIds],
      }))
    } catch {
      // Session library still works if persistence is unavailable.
    }
  }

  private upsertTrack(next: LibraryTrack): void {
    const index = this.tracks.findIndex((track) => track.id === next.id)
    if (index === -1) {
      this.tracks = [...this.tracks, next]
      return
    }
    this.tracks[index] = next
  }

  private async persistTrack(track: LibraryTrack): Promise<void> {
    try {
      await this.catalog.putTrack(toStoredTrack(track))
    } catch {
      // Playback does not depend on catalog writes.
    }
  }
}

function defaultCatalog(): LibraryCatalog {
  if (typeof indexedDB === 'undefined') {
    return new MemoryLibraryCatalog()
  }
  return new IndexedDbLibraryCatalog()
}

