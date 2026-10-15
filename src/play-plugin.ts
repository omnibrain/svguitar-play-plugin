import type { Chord, ChordSettings, SVGuitarChord } from '@svguitar/core'
import { chordNotes, isPlayable, type UnmarkedStrings } from './notes'
import { midiToFrequency, pluck } from './synth'
import { GUITAR_TUNING, parseNote, stringTuning, tuningFromNames, UKULELE_TUNING } from './tuning'

export {
  chordNotes,
  GUITAR_TUNING,
  isPlayable,
  parseNote,
  stringTuning,
  tuningFromNames,
  UKULELE_TUNING,
  type UnmarkedStrings,
}

export interface PlayOptions {
  /** Seconds each string rings. Defaults to 2. */
  duration?: number
  /** Seconds between two strings being plucked. 0 plucks all strings at once. Defaults to 0.03. */
  strum?: number
  /** `down` strums from the lowest string to the highest, `up` the other way. Defaults to `down`. */
  direction?: 'down' | 'up'
  /** Volume from 0 to 1. Defaults to 0.8. */
  volume?: number
  /** How bright the strings sound, from 0 (soft) to 1 (bright). Defaults to 0.5. */
  brightness?: number
  /** How strings without a finger, "O" or "X" sound. Defaults to `open`. */
  unmarkedStrings?: UnmarkedStrings
  /** The audio context to play in. By default, one audio context is created and shared. */
  audioContext?: BaseAudioContext
  /** Where to send the sound, e.g. to add effects or record it. Defaults to the speakers. */
  destination?: AudioNode
}

export interface Playback {
  /** The MIDI notes being played, from the lowest string to the highest */
  notes: number[]
  /** Resolves when the chord has finished playing or was stopped */
  finished: Promise<void>
  /** Stops playing */
  stop(): void
}

let sharedContext: AudioContext | undefined

function defaultContext(): AudioContext {
  if (!sharedContext) {
    if (typeof AudioContext === 'undefined') {
      throw new Error('The Web Audio API is not available, pass an audioContext to play chords')
    }
    sharedContext = new AudioContext()
  }
  return sharedContext
}

/**
 * Plays a chord with a synthesized guitar sound. Check if the chord can be played with
 * {@link isPlayable} first: this throws an error if it can't.
 *
 * In browsers, audio can only start after the user interacted with the page, so call this from a
 * click handler or similar.
 */
export function playChord(
  chord: Chord,
  settings: ChordSettings = {},
  options: PlayOptions = {},
): Playback {
  const {
    duration = 2,
    strum = 0.03,
    direction = 'down',
    volume = 0.8,
    brightness = 0.5,
    unmarkedStrings = 'open',
  } = options

  const notes = chordNotes(chord, settings, unmarkedStrings)
  if (notes.length === 0) {
    throw new Error(
      'The chord can not be played: it needs 6 strings (guitar), 4 strings (ukulele) or a note ' +
        'name as the tuning of every string, and at least one string that is not muted',
    )
  }

  const context = options.audioContext ?? defaultContext()
  if (
    context.state === 'suspended' &&
    typeof AudioContext !== 'undefined' &&
    context instanceof AudioContext
  ) {
    void context.resume()
  }

  const output = context.createGain()
  // several strings sounding together are louder than one
  output.gain.value = volume * 0.3
  output.connect(options.destination ?? context.destination)

  const start = context.currentTime
  const sources = (direction === 'up' ? [...notes].reverse() : notes).map((note, i) => {
    const samples = pluck(midiToFrequency(note), context.sampleRate, duration, brightness)
    const buffer = context.createBuffer(1, samples.length, context.sampleRate)
    buffer.getChannelData(0).set(samples)

    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(output)
    source.start(start + i * strum)
    return source
  })

  const finished = new Promise<void>((resolve) => {
    // all strings ring equally long, so the last one plucked ends last
    sources[sources.length - 1].onended = () => {
      output.disconnect()
      resolve()
    }
  })

  let stopped = false
  return {
    notes,
    finished,
    stop() {
      if (!stopped) {
        stopped = true
        sources.forEach((source) => source.stop())
      }
    },
  }
}

export interface PlayPluginApi {
  /**
   * Plays the chord with a synthesized guitar sound. Throws an error if the chord can't be played
   * (see {@link PlayPluginApi.isPlayable}).
   */
  play(options?: PlayOptions): Playback

  /**
   * Whether the chord can be played: a chart with 6 strings is a guitar, with 4 strings a ukulele in
   * standard tuning. Other charts need the note of every string as their tuning, e.g.
   * `['B', 'E', 'A', 'D', 'G', 'B', 'E']`. A guitar or ukulele with only some strings named can't
   * be played if a name contradicts the standard tuning. At least one string must sound.
   */
  isPlayable(options?: Pick<PlayOptions, 'unmarkedStrings'>): boolean
}

/** The settings and chord of an SVGuitar chart, which are private */
interface ChartInternals {
  settings: ChordSettings
  chordInternal: Chord
}

/**
 * SVGuitar plugin that plays chords.
 *
 * @example
 * const SVGuitarWithPlay = SVGuitarChord.plugin(playPlugin)
 * const chart = new SVGuitarWithPlay('#chart')
 * chart.chord(chord).draw()
 * button.onclick = () => chart.play({ duration: 3 })
 */
export function playPlugin(instance: SVGuitarChord): PlayPluginApi {
  const chart = instance as unknown as ChartInternals

  return {
    play(options?: PlayOptions) {
      return playChord(chart.chordInternal, chart.settings, options)
    },
    isPlayable(options?: Pick<PlayOptions, 'unmarkedStrings'>) {
      return isPlayable(chart.chordInternal, chart.settings, options?.unmarkedStrings)
    },
  }
}

export default playPlugin
