import { Buffer } from 'node:buffer'

export function encodeSineWav(durationSeconds = 3, sampleRate = 44100, frequency = 440): Buffer {
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

  for (let i = 0; i < frameCount; i += 1) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate)
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2)
  }

  return buffer
}
