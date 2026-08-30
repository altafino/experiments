import { GranularStretcher } from './granularStretch'
import { ScratchReader } from './scratchReader'
import { STRETCH_PROCESSOR_NAME, type StretchFromWorklet, type StretchToWorklet } from './stretchMessages'

class StretchProcessor extends AudioWorkletProcessor {
  private readonly stretcher = new GranularStretcher()
  private readonly scratch = new ScratchReader()
  private playId = 0

  constructor() {
    super()
    this.scratch.setSampleRate(sampleRate)
    this.port.onmessage = (event: MessageEvent<StretchToWorklet>) => {
      this.onMessage(event.data)
    }
  }

  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      {
        name: 'rate',
        defaultValue: 1,
        minValue: 0.01,
        maxValue: 4,
        automationRate: 'k-rate',
      },
    ]
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    const output = outputs[0]
    const left = output?.[0]
    if (!left) {
      return true
    }
    const right = output[1] ?? left
    if (this.scratch.isActive()) {
      const settled = this.scratch.process(left, right, left.length)
      if (settled) {
        const message: StretchFromWorklet = {
          type: 'scratchSettled',
          playId: this.playId,
          positionSamples: this.scratch.position(),
        }
        this.port.postMessage(message)
      }
      return true
    }
    const rateParam = parameters.rate
    const rate = rateParam?.[0] ?? 1
    const ended = this.stretcher.process(left, right, left.length, rate)
    if (ended) {
      const message: StretchFromWorklet = { type: 'ended', playId: this.playId }
      this.port.postMessage(message)
    }
    return true
  }

  private onMessage(message: StretchToWorklet): void {
    switch (message.type) {
      case 'load':
        this.stretcher.load(message.channels)
        this.scratch.load(message.channels)
        return
      case 'start':
        this.scratch.stop()
        this.playId = message.playId
        if (
          message.loopStartSamples !== undefined &&
          message.loopEndSamples !== undefined
        ) {
          this.stretcher.setLoop(message.loopStartSamples, message.loopEndSamples)
        } else {
          this.stretcher.clearLoop()
        }
        this.stretcher.start(message.offsetSamples)
        return
      case 'setLoop':
        this.stretcher.setLoop(message.startSamples, message.endSamples)
        this.scratch.setLoop(message.startSamples, message.endSamples)
        return
      case 'clearLoop':
        this.stretcher.clearLoop()
        this.scratch.clearLoop()
        return
      case 'stop':
        this.playId = 0
        this.stretcher.stop()
        this.scratch.stop()
        return
      case 'scratchStart':
        this.stretcher.stop()
        this.playId = message.playId
        if (
          message.loopStartSamples !== undefined &&
          message.loopEndSamples !== undefined
        ) {
          this.scratch.setLoop(message.loopStartSamples, message.loopEndSamples)
        } else {
          this.scratch.clearLoop()
        }
        this.scratch.start(message.offsetSamples)
        return
      case 'scratchMove':
        this.scratch.setPosition(message.positionSamples, message.velocity)
        return
      case 'scratchCoast':
        this.playId = message.playId
        this.scratch.startCoast(message.velocity)
        return
      default: {
        const neverMessage: never = message
        void neverMessage
        return
      }
    }
  }
}

registerProcessor(STRETCH_PROCESSOR_NAME, StretchProcessor)
