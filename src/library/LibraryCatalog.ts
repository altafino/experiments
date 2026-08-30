import type { LibraryTrack, Playlist } from '../domain/library'

/** Persisted row omits session-only `playable`. */
export type StoredLibraryTrack = Omit<LibraryTrack, 'playable'>

export interface LibraryCatalog {
  listTracks(): Promise<StoredLibraryTrack[]>
  putTrack(track: StoredLibraryTrack): Promise<void>
  listPlaylists(): Promise<Playlist[]>
  putPlaylist(playlist: Playlist): Promise<void>
  deletePlaylist(id: string): Promise<void>
}

export function toStoredTrack(track: LibraryTrack): StoredLibraryTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
    bpm: track.bpm,
    addedAt: track.addedAt,
  }
}

export class MemoryLibraryCatalog implements LibraryCatalog {
  private readonly tracks = new Map<string, StoredLibraryTrack>()
  private readonly playlists = new Map<string, Playlist>()

  async listTracks(): Promise<StoredLibraryTrack[]> {
    return [...this.tracks.values()]
  }

  async putTrack(track: StoredLibraryTrack): Promise<void> {
    this.tracks.set(track.id, { ...track })
  }

  async listPlaylists(): Promise<Playlist[]> {
    return [...this.playlists.values()].map((playlist) => ({
      ...playlist,
      trackIds: [...playlist.trackIds],
    }))
  }

  async putPlaylist(playlist: Playlist): Promise<void> {
    this.playlists.set(playlist.id, { ...playlist, trackIds: [...playlist.trackIds] })
  }

  async deletePlaylist(id: string): Promise<void> {
    this.playlists.delete(id)
  }
}
