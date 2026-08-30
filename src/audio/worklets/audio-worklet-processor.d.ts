declare const sampleRate: number

interface AudioWorkletProcessor {
  readonly port: MessagePort
}

declare const AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor
  new (): AudioWorkletProcessor
}

interface AudioParamDescriptor {
  name: string
  automationRate?: AutomationRate
  defaultValue?: number
  minValue?: number
  maxValue?: number
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor,
): void
