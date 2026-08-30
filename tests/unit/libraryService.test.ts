import { describe, expect, it } from 'vitest'
import { MemoryAnalysisRepository } from '../../src/library/MemoryAnalysisRepository'
import { MemoryLibraryCatalog } from '../../src/library/LibraryCatalog'
import { LibraryService } from '../../src/library/LibraryService'
import { fileAnalysisKey } from '../../src/library/fileAnalysisKey'

describe('LibraryService', () => {
  it('imports files into the collection without requiring a deck load', async () => {
    const service = new LibraryService(new MemoryLibraryCatalog(), new MemoryAnalysisRepository())
    const file = new File([new Uint8Array([1, 2, 3])], 'Autechre - Fold.wav', { type: 'audio/wav' })

    await service.importFiles([file])

    const snapshot = service.getSnapshot()
    expect(snapshot.tracks).toHaveLength(1)
    expect(snapshot.tracks[0]?.title).toBe('Fold')
    expect(snapshot.tracks[0]?.artist).toBe('Autechre')
    expect(snapshot.tracks[0]?.playable).toBe(true)
    expect(service.fileOf(fileAnalysisKey(file))).toBe(file)
  })

  it('adds and removes playlist members', async () => {
    const service = new LibraryService(new MemoryLibraryCatalog(), new MemoryAnalysisRepository())
    const file = new File([new Uint8Array([1])], 'track.wav', { type: 'audio/wav' })
    await service.importFiles([file])
    const trackId = fileAnalysisKey(file)

    const playlistId = service.createPlaylist('Warmup')
    service.addToPlaylist(playlistId, trackId)
    service.selectPlaylist(playlistId)
    expect(service.getSnapshot().playlists[0]?.trackIds).toEqual([trackId])
    expect(service.getSnapshot().selectedPlaylistId).toBe(playlistId)

    service.removeFromPlaylist(playlistId, trackId)
    expect(service.getSnapshot().playlists[0]?.trackIds).toEqual([])
  })
})
