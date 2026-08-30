export const LIBRARY_SORTS = ['title', 'artist', 'bpm', 'added'] as const
export type LibrarySort = (typeof LIBRARY_SORTS)[number]

export const DEFAULT_LIBRARY_SORT: LibrarySort = 'added'

export interface LibraryTrack {
  id: string
  title: string
  artist?: string
  album?: string
  duration: number
  bpm?: number
  addedAt: number
  playable: boolean
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
}

export interface LibraryState {
  tracks: LibraryTrack[]
  playlists: Playlist[]
  query: string
  sort: LibrarySort
  artistFilter: string | null
  bpmMin: number | null
  bpmMax: number | null
  selectedPlaylistId: string | null
}

export function emptyLibraryState(): LibraryState {
  return {
    tracks: [],
    playlists: [],
    query: '',
    sort: DEFAULT_LIBRARY_SORT,
    artistFilter: null,
    bpmMin: null,
    bpmMax: null,
    selectedPlaylistId: null,
  }
}

export interface ParsedTrackName {
  title: string
  artist?: string
}

/**
 * `Artist - Title.ext` → artist + title; otherwise the basename is the title.
 */
export function parseTrackName(filename: string): ParsedTrackName {
  const base = filename.replace(/\.[^./\\]+$/, '').trim()
  const separator = ' - '
  const index = base.indexOf(separator)
  if (index <= 0) {
    return { title: base || filename }
  }
  const artist = base.slice(0, index).trim()
  const title = base.slice(index + separator.length).trim()
  if (!artist || !title) {
    return { title: base }
  }
  return { artist, title }
}

export function uniqueArtists(tracks: readonly LibraryTrack[]): string[] {
  const names = new Set<string>()
  for (const track of tracks) {
    if (track.artist) {
      names.add(track.artist)
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

function matchesQuery(track: LibraryTrack, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return true
  }
  const haystack = [track.title, track.artist ?? '', track.album ?? ''].join(' ').toLowerCase()
  return haystack.includes(needle)
}

function matchesArtist(track: LibraryTrack, artist: string | null): boolean {
  if (!artist) {
    return true
  }
  return (track.artist ?? '') === artist
}

function matchesBpm(track: LibraryTrack, min: number | null, max: number | null): boolean {
  if (min === null && max === null) {
    return true
  }
  if (track.bpm === undefined) {
    return false
  }
  if (min !== null && track.bpm < min) {
    return false
  }
  if (max !== null && track.bpm > max) {
    return false
  }
  return true
}

export function filterLibraryTracks(state: LibraryState): LibraryTrack[] {
  const playlist = state.selectedPlaylistId
    ? state.playlists.find((item) => item.id === state.selectedPlaylistId)
    : undefined
  if (playlist) {
    const byId = new Map(state.tracks.map((track) => [track.id, track]))
    return playlist.trackIds.flatMap((id) => {
      const track = byId.get(id)
      if (!track) {
        return []
      }
      if (
        !matchesQuery(track, state.query) ||
        !matchesArtist(track, state.artistFilter) ||
        !matchesBpm(track, state.bpmMin, state.bpmMax)
      ) {
        return []
      }
      return [track]
    })
  }
  return state.tracks.filter(
    (track) =>
      matchesQuery(track, state.query) &&
      matchesArtist(track, state.artistFilter) &&
      matchesBpm(track, state.bpmMin, state.bpmMax),
  )
}

function compareTracks(a: LibraryTrack, b: LibraryTrack, sort: LibrarySort): number {
  switch (sort) {
    case 'title':
      return a.title.localeCompare(b.title)
    case 'artist':
      return (a.artist ?? '').localeCompare(b.artist ?? '') || a.title.localeCompare(b.title)
    case 'bpm':
      return (a.bpm ?? Number.POSITIVE_INFINITY) - (b.bpm ?? Number.POSITIVE_INFINITY)
    case 'added':
      return b.addedAt - a.addedAt
    default: {
      const neverSort: never = sort
      throw new Error(`Unknown library sort: ${String(neverSort)}`)
    }
  }
}

export function visibleLibraryTracks(state: LibraryState): LibraryTrack[] {
  return filterLibraryTracks(state).sort((a, b) => compareTracks(a, b, state.sort))
}
