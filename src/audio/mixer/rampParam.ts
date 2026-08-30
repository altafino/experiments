const RAMP_SECONDS = 0.012

export function rampParam(param: AudioParam, value: number, now: number): void {
  param.cancelScheduledValues(now)
  param.setValueAtTime(param.value, now)
  param.linearRampToValueAtTime(value, now + RAMP_SECONDS)
}
