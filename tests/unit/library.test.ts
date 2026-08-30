import { describe, expect, it } from 'vitest'
import {
  emptyLibraryState,
  filterLibraryTracks,
  parseTrackName,
  uniqueArtists,
  visibleLibraryTracks,
  type LibraryTrack,
} from '../../src/domain/library'

function track(partial: Partial<LibraryTrack> & Pick<LibraryTrack, 'id' | 'title'>): LibraryTrack {
  return {
    duration: 0,
    addedAt: 0,
    playable: true,
    ...partial,
  }
}

describe('parseTrackName', () => {
  it.each([
    ['Artist - Title.mp3', 'Title', 'Artist'],
    ['just-a-track.wav', 'just-a-track', undefined],
    ['NoExtension', 'NoExtension', undefined],
    [' - missing artist.mp3', '- missing artist', undefined],
  ] as const)('parses %s', (filename, title, artist) => {
    expect(parseTrackName(filename)).toEqual(
      artist === undefined ? { title } : { title, artist },
    )
  })
})

describe('visibleLibraryTracks', () => {
  const tracks: LibraryTrack[] = [
    track({ id: 'a', title: 'Alpha', artist: 'Autechre', bpm: 120, addedAt: 1 }),
    track({ id: 'b', title: 'Beta', artist: 'Boards', bpm: 140, addedAt: 3 }),
    track({ id: 'c', title: 'Gamma', artist: 'Autechre', bpm: 90, addedAt: 2 }),
  ]

  it('filters by search across title and artist', () => {
    const state = emptyLibraryState()
    state.tracks = tracks
    state.query = 'aute'
    expect(filterLibraryTracks(state).map((item) => item.id)).toEqual(['a', 'c'])
  })

  it('filters by artist exactly', () => {
    const state = emptyLibraryState()
    state.tracks = tracks
    state.artistFilter = 'Boards'
    expect(filterLibraryTracks(state).map((item) => item.id)).toEqual(['b'])
  })

  it('filters BPM and hides unknown BPM when a range is set', () => {
    const state = emptyLibraryState()
    state.tracks = [...tracks, track({ id: 'd', title: 'Delta' })]
    state.bpmMin = 100
    state.bpmMax = 130
    expect(filterLibraryTracks(state).map((item) => item.id)).toEqual(['a'])
  })

  it('restricts to a playlist', () => {
    const state = emptyLibraryState()
    state.tracks = tracks
    state.playlists = [{ id: 'p1', name: 'Warmup', trackIds: ['c', 'b'] }]
    state.selectedPlaylistId = 'p1'
    expect(filterLibraryTracks(state).map((item) => item.id)).toEqual(['c', 'b'])
  })

  it('sorts by title, bpm, and recently added', () => {
    const state = emptyLibraryState()
    state.tracks = tracks
    state.sort = 'title'
    expect(visibleLibraryTracks(state).map((item) => item.id)).toEqual(['a', 'b', 'c'])
    state.sort = 'bpm'
    expect(visibleLibraryTracks(state).map((item) => item.id)).toEqual(['c', 'a', 'b'])
    state.sort = 'added'
    expect(visibleLibraryTracks(state).map((item) => item.id)).toEqual(['b', 'c', 'a'])
  })

  it('lists unique artists', () => {
    expect(uniqueArtists(tracks)).toEqual(['Autechre', 'Boards'])
  })
})
