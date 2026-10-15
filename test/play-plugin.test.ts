import { SVGuitarChord, type Chord } from '@svguitar/core'
import * as entry from '../src/play-plugin'
import { playChord, playPlugin } from '../src/play-plugin'
import * as notes from '../src/notes'
import * as tuning from '../src/tuning'
import * as synth from '../src/synth'

const pluck = jest.spyOn(synth, 'pluck')

class FakeNode {
  connected: unknown[] = []
  connect(node: unknown) {
    this.connected.push(node)
  }
  disconnect = jest.fn()
}

class FakeGain extends FakeNode {
  gain = { value: 1 }
}

class FakeSource extends FakeNode {
  buffer?: { samples: Float32Array }
  onended?: () => void
  startedAt?: number
  start(when: number) {
    this.startedAt = when
  }
  stop = jest.fn(() => this.onended?.())
}

class FakeAudioContext {
  state = 'running'
  currentTime = 10
  sampleRate = 8000
  destination = new FakeNode()
  gains: FakeGain[] = []
  sources: FakeSource[] = []
  resume = jest.fn()

  createGain() {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }
  createBufferSource() {
    const source = new FakeSource()
    this.sources.push(source)
    return source
  }
  createBuffer(channels: number, length: number) {
    const samples = new Float32Array(length)
    return { samples, getChannelData: () => samples }
  }
}

const fakeContext = () => new FakeAudioContext()
const asContext = (context: FakeAudioContext) => context as unknown as BaseAudioContext

const openC: Chord = {
  fingers: [
    [6, 'x'],
    [5, 3],
    [4, 2],
    [3, 0],
    [2, 1],
    [1, 0],
  ],
  barres: [],
}

afterEach(() => {
  pluck.mockClear()
  delete (globalThis as { AudioContext?: unknown }).AudioContext
})

describe('playChord', () => {
  test('plucks every string that sounds, from the lowest', () => {
    const context = fakeContext()
    const playback = playChord(openC, {}, { audioContext: asContext(context), duration: 1 })

    expect(playback.notes).toEqual([48, 52, 55, 60, 64])
    expect(context.sources).toHaveLength(5)
    expect(context.sources.map((s) => s.startedAt)).toEqual([10, 10.03, 10.06, 10.09, 10.12])
    context.sources.forEach((source) => {
      expect(source.buffer?.samples).toHaveLength(8000)
      expect(source.buffer?.samples.some((s) => s !== 0)).toBe(true)
      expect(source.connected).toEqual([context.gains[0]])
    })
    expect(context.gains[0].gain.value).toBeCloseTo(0.24)
    expect(context.gains[0].connected).toEqual([context.destination])
  })

  test('strums up', () => {
    const context = fakeContext()
    playChord(openC, {}, { audioContext: asContext(context), direction: 'up', strum: 0.1 })

    expect(pluck.mock.calls.map(([frequency]) => Math.round(frequency))).toEqual([
      330, 262, 196, 165, 131,
    ])
    expect(context.sources[4].startedAt).toBeCloseTo(10.4)
  })

  test('applies the volume and the destination', () => {
    const context = fakeContext()
    const destination = new FakeNode()
    playChord(
      openC,
      {},
      {
        audioContext: asContext(context),
        volume: 0.5,
        destination: destination as unknown as AudioNode,
      },
    )

    expect(context.gains[0].gain.value).toBeCloseTo(0.15)
    expect(context.gains[0].connected).toEqual([destination])
  })

  test('finishes when the last string ends', async () => {
    const context = fakeContext()
    const playback = playChord(openC, {}, { audioContext: asContext(context) })

    context.sources[4].onended?.()
    await playback.finished
    expect(context.gains[0].disconnect).toHaveBeenCalled()
  })

  test('stops all strings once', async () => {
    const context = fakeContext()
    const playback = playChord(openC, {}, { audioContext: asContext(context) })

    playback.stop()
    playback.stop()
    await playback.finished
    context.sources.forEach((source) => expect(source.stop).toHaveBeenCalledTimes(1))
  })

  test('throws if the chord can not be played', () => {
    const context = fakeContext()
    expect(() => playChord(openC, { strings: 5 }, { audioContext: asContext(context) })).toThrow(
      'The chord can not be played',
    )
    expect(context.sources).toHaveLength(0)
  })

  test('creates and resumes a shared audio context', () => {
    const contexts: FakeAudioContext[] = []
    class SuspendedContext extends FakeAudioContext {
      state = 'suspended'
      constructor() {
        super()
        contexts.push(this)
      }
    }
    Object.assign(globalThis, { AudioContext: SuspendedContext })

    playChord(openC)
    playChord(openC)

    expect(contexts).toHaveLength(1)
    expect(contexts[0].resume).toHaveBeenCalled()
    expect(contexts[0].sources).toHaveLength(10)
  })

  test('throws without Web Audio', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const isolated = require('../src/play-plugin') as typeof entry
      expect(() => isolated.playChord(openC)).toThrow('The Web Audio API is not available')
    })
  })

  test('does not resume contexts it did not create as AudioContext', () => {
    const context = fakeContext()
    context.state = 'suspended'
    playChord(openC, {}, { audioContext: asContext(context) })

    expect(context.resume).not.toHaveBeenCalled()
  })
})

describe('playPlugin', () => {
  const SVGuitarWithPlay = SVGuitarChord.plugin(playPlugin)

  test('plays the chord of the chart', () => {
    const context = fakeContext()
    const chart = new SVGuitarWithPlay()
    chart.configure({ strings: 4 }).chord({ fingers: [[1, 3]], barres: [] })

    const playback = chart.play({ audioContext: asContext(context) })

    expect(playback.notes).toEqual([67, 60, 64, 72])
  })

  test('tells if the chord of the chart can be played', () => {
    const chart = new SVGuitarWithPlay()

    expect(chart.isPlayable()).toBe(true)
    expect(chart.isPlayable({ unmarkedStrings: 'muted' })).toBe(false)
    chart.configure({ strings: 5 })
    expect(chart.isPlayable()).toBe(false)
    chart.configure({ tuning: ['A', 'D', 'G', 'B', 'E'] })
    expect(chart.isPlayable()).toBe(true)
  })
})

test('exports the functions', () => {
  expect(entry).toMatchObject({
    chordNotes: notes.chordNotes,
    isPlayable: notes.isPlayable,
    stringTuning: tuning.stringTuning,
    tuningFromNames: tuning.tuningFromNames,
    parseNote: tuning.parseNote,
    GUITAR_TUNING: tuning.GUITAR_TUNING,
    UKULELE_TUNING: tuning.UKULELE_TUNING,
    default: playPlugin,
  })
})
