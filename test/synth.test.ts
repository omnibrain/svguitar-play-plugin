import { midiToFrequency, pluck } from '../src/synth'

const sampleRate = 48000

/** Deterministic noise, so the tests don't depend on chance */
function seededRandom(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

/** Estimates the frequency of a signal from the peak of its autocorrelation */
function estimateFrequency(samples: Float32Array, minHz = 60, maxHz = 1500): number {
  let bestLag = 0
  let best = -Infinity
  for (let lag = Math.floor(sampleRate / maxHz); lag <= sampleRate / minHz; lag++) {
    let sum = 0
    for (let i = 0; i + lag < samples.length; i++) {
      sum += samples[i] * samples[i + lag]
    }
    if (sum > best) {
      best = sum
      bestLag = lag
    }
  }
  // parabolic interpolation around the peak
  const correlation = (lag: number) =>
    samples.reduce((sum, s, i) => (i + lag < samples.length ? sum + s * samples[i + lag] : sum), 0)
  const [a, b, c] = [bestLag - 1, bestLag, bestLag + 1].map(correlation)
  return sampleRate / (bestLag + (a - c) / (2 * (a - 2 * b + c)))
}

const cents = (frequency: number, target: number) => 1200 * Math.log2(frequency / target)

test('midiToFrequency', () => {
  expect(midiToFrequency(69)).toBe(440)
  expect(midiToFrequency(57)).toBe(220)
  expect(midiToFrequency(60)).toBeCloseTo(261.63, 2)
})

test('pluck has the length of the duration', () => {
  expect(pluck(220, sampleRate, 1.5, 0.5)).toHaveLength(72000)
})

test.each([40, 52, 64, 69, 76, 84])('pluck is in tune for MIDI note %d', (note) => {
  const frequency = midiToFrequency(note)
  const samples = pluck(frequency, sampleRate, 0.3, 0.5, seededRandom()).subarray(2000)

  expect(Math.abs(cents(estimateFrequency(samples), frequency))).toBeLessThan(5)
})

test('pluck rings, fades out and stays within -1 and 1', () => {
  const samples = pluck(110, sampleRate, 2, 1, seededRandom())
  const rms = (from: number, to: number) =>
    Math.sqrt(samples.subarray(from, to).reduce((sum, s) => sum + s * s, 0) / (to - from))

  expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1)
  expect(rms(0, 4800)).toBeGreaterThan(0.1)
  expect(rms(48000, 52800)).toBeGreaterThan(0.01)
  expect(rms(48000, 52800)).toBeLessThan(rms(0, 4800))
  expect(samples[samples.length - 1]).toBeCloseTo(0)
})

test('a softer pluck has fewer high tones', () => {
  const roughness = (samples: Float32Array) =>
    samples.slice(1, 2000).reduce((sum, s, i) => sum + Math.abs(s - samples[i]), 0)

  expect(roughness(pluck(110, sampleRate, 0.1, 0, seededRandom()))).toBeLessThan(
    roughness(pluck(110, sampleRate, 0.1, 1, seededRandom())),
  )
})

test('pluck works with a duration shorter than one period', () => {
  expect(pluck(110, sampleRate, 0.001, 0.5)).toHaveLength(48)
})

test('pluck is silent without noise', () => {
  expect(pluck(110, sampleRate, 0.1, 0.5, () => 0.5).every((s) => s === 0)).toBe(true)
})
