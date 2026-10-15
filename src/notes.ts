import type { Chord, ChordSettings } from '@svguitar/core'
import { stringTuning } from './tuning'

/**
 * How strings without a finger, an "O" or an "X" sound: `open` plays them as open strings, `muted`
 * doesn't play them.
 */
export type UnmarkedStrings = 'open' | 'muted'

/**
 * The MIDI notes a chord sounds, from the leftmost (lowest) string to the rightmost. Muted strings
 * are left out. Returns an empty array if the tuning of the strings is unknown (see
 * {@link stringTuning}).
 *
 * On each string, the highest finger or barre sounds. Frets are relative to the position of the
 * chord, as they are drawn.
 */
export function chordNotes(
  chord: Chord,
  settings: ChordSettings = {},
  unmarkedStrings: UnmarkedStrings = 'open',
): number[] {
  const tuning = stringTuning(settings)
  if (!tuning) {
    return []
  }

  const strings = tuning.length
  const position = chord.position ?? settings.position ?? 1
  // SVGuitar numbers the strings from the rightmost (1), the tuning starts with the leftmost
  const index = (string: number) => strings - string
  const frets: (number | undefined)[] = new Array(strings).fill(undefined)
  const muted = new Set(
    chord.fingers.filter(([, fret]) => fret === 'x').map(([string]) => index(string)),
  )

  const press = (string: number, fret: number) => {
    const i = index(string)
    if (i >= 0 && i < strings) {
      frets[i] = Math.max(frets[i] ?? 0, fret > 0 ? fret + position - 1 : 0)
    }
  }

  chord.barres.forEach(({ fromString, toString, fret }) => {
    for (let s = Math.min(fromString, toString); s <= Math.max(fromString, toString); s++) {
      press(s, fret)
    }
  })
  chord.fingers.forEach(([string, fret]) => {
    if (fret !== 'x') {
      press(string, fret)
    }
  })

  return tuning.flatMap((note, i) => {
    const fret = frets[i]
    if (muted.has(i) || (fret === undefined && unmarkedStrings === 'muted')) {
      return []
    }
    return [note + (fret ?? 0)]
  })
}

/**
 * Whether a chord can be played: the tuning of its strings must be known (see
 * {@link stringTuning}) and at least one string must sound.
 */
export function isPlayable(
  chord: Chord,
  settings: ChordSettings = {},
  unmarkedStrings: UnmarkedStrings = 'open',
): boolean {
  return chordNotes(chord, settings, unmarkedStrings).length > 0
}
