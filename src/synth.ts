/** Seconds for the volume of a string to fall by 60 dB, besides the damping of the high tones */
const ringTime = 6

/** Seconds to fade out at the end so cutting off a string doesn't click */
const release = 0.05

export const midiToFrequency = (note: number) => 440 * 2 ** ((note - 69) / 12)

/**
 * Synthesizes a plucked string with the Karplus-Strong algorithm: a burst of noise circulates in a
 * delay line one period long, and averaging neighboring samples damps its high tones over time.
 *
 * @param brightness 0 to 1, how bright the pluck sounds
 */
export function pluck(
  frequency: number,
  sampleRate: number,
  duration: number,
  brightness: number,
  random: () => number = Math.random,
): Float32Array {
  const samples = new Float32Array(Math.ceil(duration * sampleRate))

  // the averaging filter delays by half a sample, an all-pass filter adds the rest of the period
  let delay = Math.floor(sampleRate / frequency - 0.5)
  let fraction = sampleRate / frequency - 0.5 - delay
  if (fraction < 0.1) {
    delay -= 1
    fraction += 1
  }
  const allPass = (1 - fraction) / (1 + fraction)
  const decay = 10 ** (-3 / (ringTime * frequency))

  // low-passed noise sounds like a softer pluck
  const smoothing = 0.1 + 0.9 * Math.min(Math.max(brightness, 0), 1)
  let level = 0
  for (let i = 0; i < Math.min(delay, samples.length); i++) {
    level += smoothing * (random() * 2 - 1 - level)
    samples[i] = level
  }
  const excitation = samples.subarray(0, delay)
  const mean = excitation.reduce((sum, s) => sum + s, 0) / excitation.length
  const peak = excitation.reduce((max, s) => Math.max(max, Math.abs(s - mean)), 0) || 1
  excitation.forEach((s, i) => (excitation[i] = (s - mean) / peak))

  let previousIn = 0
  let previousOut = 0
  for (let i = delay; i < samples.length; i++) {
    const averaged = decay * 0.5 * (samples[i - delay] + (samples[i - delay - 1] ?? 0))
    previousOut = allPass * averaged + previousIn - allPass * previousOut
    previousIn = averaged
    samples[i] = previousOut
  }

  const fadeOut = Math.min(Math.round(release * sampleRate), samples.length)
  for (let i = 0; i < fadeOut; i++) {
    samples[samples.length - 1 - i] *= i / fadeOut
  }

  return samples
}
