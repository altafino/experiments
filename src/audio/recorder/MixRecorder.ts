/**
 * Captures a MediaStream (master tap) with MediaRecorder.
 * Audio timing stays on AudioContext; this only archives the mix.
 */
export class MixRecorder {
  private readonly stream: MediaStream
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []

  constructor(stream: MediaStream) {
    this.stream = stream
  }

  get recording(): boolean {
    return this.recorder !== null && this.recorder.state === 'recording'
  }

  start(): void {
    if (this.recording) {
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder is not available')
    }
    this.chunks = []
    const mimeType = pickMimeType()
    const recorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream)
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data)
      }
    }
    this.recorder = recorder
    recorder.start(100)
  }

  stop(): Promise<Blob> {
    const recorder = this.recorder
    if (!recorder || recorder.state === 'inactive') {
      this.recorder = null
      return Promise.resolve(new Blob())
    }
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        this.recorder = null
        resolve(new Blob(this.chunks, { type }))
      }
      recorder.onerror = () => {
        this.recorder = null
        reject(new Error('Mix recording failed'))
      }
      recorder.stop()
    })
  }
}

function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm']
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return undefined
}
