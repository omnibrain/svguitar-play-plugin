import type { ChordSettings } from '@svguitar/core'

/** MIDI notes of standard guitar tuning (E2 A2 D3 G3 B3 E4), from the leftmost string */
export const GUITAR_TUNING = [40, 45, 50, 55, 59, 64]

/** MIDI notes of standard ukulele tuning (G4 C4 E4 A4, re-entrant), from the leftmost string */
export const UKULELE_TUNING = [67, 60, 64, 69]

const defaultTunings: Record<number, number[]> = { 6: GUITAR_TUNING, 4: UKULELE_TUNING }

const pitchClasses: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

interface Note {
  pitchClass: number
  octave?: number
}

const mod12 = (n: number) => ((n % 12) + 12) % 12

const midi = ({ pitchClass, octave }: Note) => 12 * (octave! + 1) + pitchClass

/**
 * Parses a note name like "E", "e", "F#", "Bb", "C♯3" or "Eb2". The octave is optional.
 */
export function parseNote(name: string): Note | undefined {
  const match = /^\s*([A-Ga-g])([#♯b♭]*)(-?\d)?\s*$/.exec(name)
  if (!match) {
    return undefined
  }
  const [, letter, accidentals, octave] = match
  const shift = [...accidentals].reduce((sum, a) => sum + (a === '#' || a === '♯' ? 1 : -1), 0)

  return {
    pitchClass: pitchClasses[letter.toUpperCase()] + shift,
    octave: octave === undefined ? undefined : Number(octave),
  }
}

/**
 * The MIDI notes of a tuning given by note names, from the leftmost (lowest) string. Returns
 * undefined if a name isn't a note.
 *
 * Notes without an octave are placed above the string to their left, and the highest string in
 * octave 4 unless another string has an octave: "E A D G B E" is standard guitar tuning. "G C E A"
 * is the re-entrant ukulele tuning (G4 C4 E4 A4).
 */
export function tuningFromNames(names: string[]): number[] | undefined {
  const notes = names.map(parseNote)
  if (notes.length === 0 || !notes.every((note): note is Note => note !== undefined)) {
    return undefined
  }

  const withOctave = notes.findIndex((note) => note.octave !== undefined)
  if (withOctave === -1 && notes.map((note) => mod12(note.pitchClass)).join() === '7,0,4,9') {
    return UKULELE_TUNING
  }

  const ascending: number[] = []
  notes.forEach((note, i) => {
    const pitchClass = mod12(note.pitchClass)
    ascending.push(
      i === 0 ? pitchClass : ascending[i - 1] + mod12(pitchClass - ascending[i - 1] - 1) + 1,
    )
  })

  const highest = ascending[ascending.length - 1]
  const shift =
    withOctave === -1
      ? 60 + mod12(highest) - highest
      : midi(notes[withOctave]) - ascending[withOctave]

  return notes.map((note, i) => (note.octave === undefined ? ascending[i] + shift : midi(note)))
}

/**
 * The MIDI notes of the open strings of a chart, from the leftmost string. A chart is tuned to the
 * notes of its tuning labels if every string has one. Otherwise, a chart with 6 strings is a guitar
 * and a chart with 4 strings a ukulele in standard tuning, unless a label names another note than
 * the standard tuning has on that string. Returns undefined if the tuning of the strings is
 * unknown.
 */
export function stringTuning(settings: ChordSettings = {}): number[] | undefined {
  const strings = settings.strings ?? 6
  const names = (settings.tuning ?? []).slice(0, strings)
  const named = names.length === strings ? tuningFromNames(names) : undefined
  if (named) {
    return named
  }

  const standard = defaultTunings[strings]
  if (!standard) {
    return undefined
  }
  const contradicts = names.some((name, i) => {
    const note = parseNote(name)
    if (!note) {
      return false
    }
    return note.octave === undefined
      ? mod12(note.pitchClass) !== mod12(standard[i])
      : midi(note) !== standard[i]
  })

  return contradicts ? undefined : standard
}
