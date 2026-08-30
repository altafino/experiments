import { ColorPitchShifter } from './colorPitch'
import { COLOR_PITCH_PROCESSOR_NAME } from './colorPitchMessages'

class ColorPitchProcessor extends AudioWorkletProcessor {
  private readonly shifter = new ColorPitchShifter()

  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      {
        name: 'ratio',
        defaultValue: 1,
        minValue: 0.25,
        maxValue: 4,
        automationRate: 'k-rate',
      },
    ]
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    const input = inputs[0]
    const output = outputs[0]
    const outL = output?.[0]
    if (!outL) {
      return true
    }
    const outR = output[1] ?? outL
    const inL = input?.[0]
    const inR = input?.[1] ?? inL
    if (!inL || !inR) {
      outL.fill(0)
      if (outR !== outL) {
        outR.fill(0)
      }
      return true
    }
    const ratioParam = parameters.ratio
    const ratio = ratioParam?.[0] ?? 1
    this.shifter.process(inL, inR, outL, outR, outL.length, ratio)
    return true
  }
}

registerProcessor(COLOR_PITCH_PROCESSOR_NAME, ColorPitchProcessor)
