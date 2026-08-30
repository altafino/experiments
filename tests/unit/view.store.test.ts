import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useViewStore } from '../../src/state/view.store'

describe('useViewStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps pad banks as display-only state', () => {
    const view = useViewStore()
    expect(view.padBank).toBe('hotcue')
    view.setPadBank('loop')
    expect(view.padBank).toBe('loop')
    view.setPadBank('jump')
    expect(view.padBank).toBe('jump')
    expect(view.displayMode).toBe('performance')
  })
})
