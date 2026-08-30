import { Buffer } from 'node:buffer'

export function encodeClickWav(bpm = 120, durationSeconds = 8, sampleRate = 44100): Buffer {
  const frameCount = Math.floor(sampleRate * durationSeconds)
  const dataBytes = frameCount * 2
  const buffer = Buffer.alloc(44 + dataBytes)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataBytes, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataBytes, 40)

  const period = Math.round((60 / bpm) * sampleRate)
  const click = Math.floor(sampleRate * 0.004)
  for (let start = 0; start + click < frameCount; start += period) {
    for (let i = 0; i < click; i += 1) {
      const sample = 1 - i / click
      buffer.writeInt16LE(Math.round(sample * 32767), 44 + (start + i) * 2)
    }
  }

  return buffer
}
