import { GranularStretcher } from './granularStretch'
import { STRETCH_PROCESSOR_NAME, type StretchFromWorklet, type StretchToWorklet } from './stretchMessages'

class StretchProcessor extends AudioWorkletProcessor {
  private readonly stretcher = new GranularStretcher()
  private playId = 0

  constructor() {
    super()
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
        return
      case 'start':
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
        return
      case 'clearLoop':
        this.stretcher.clearLoop()
        return
      case 'stop':
        this.playId = 0
        this.stretcher.stop()
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
