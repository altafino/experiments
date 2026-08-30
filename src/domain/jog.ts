export const SECONDS_PER_REVOLUTION = 1.8
export const JOG_NUDGE_RADIANS = 0.04
export const JOG_COAST_TAU = 0.12
export const JOG_COAST_STOP = 0.08

export function radiansToSeconds(deltaRadians: number): number {
  return (deltaRadians / (Math.PI * 2)) * SECONDS_PER_REVOLUTION
}

export function wrapAngleDelta(fromRadians: number, toRadians: number): number {
  let delta = toRadians - fromRadians
  while (delta > Math.PI) {
    delta -= Math.PI * 2
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2
  }
  return delta
}

export function coastOffsetSeconds(velocity: number, elapsedSeconds: number, tau = JOG_COAST_TAU): number {
  if (tau <= 0) {
    return 0
  }
  return velocity * tau * (1 - Math.exp(-elapsedSeconds / tau))
}

export function coastVelocity(initialVelocity: number, elapsedSeconds: number, tau = JOG_COAST_TAU): number {
  if (tau <= 0) {
    return 0
  }
  return initialVelocity * Math.exp(-elapsedSeconds / tau)
}
