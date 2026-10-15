import type { Chord } from '@svguitar/core'
import { chordNotes, isPlayable } from '../src/notes'

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

const barreF: Chord = {
  fingers: [
    [5, 3],
    [4, 3],
    [3, 2],
  ],
  barres: [{ fromString: 6, toString: 1, fret: 1 }],
}

describe('chordNotes', () => {
  test('plays a guitar chord', () => {
    // C3 E3 G3 C4 E4
    expect(chordNotes(openC)).toEqual([48, 52, 55, 60, 64])
  })

  test('plays the highest finger or barre on each string', () => {
    // F2 C3 F3 A3 C4 F4
    expect(chordNotes(barreF)).toEqual([41, 48, 53, 57, 60, 65])
  })

  test('accepts barres from the highest to the lowest string', () => {
    const chord = { fingers: [], barres: [{ fromString: 1, toString: 6, fret: 1 }] }
    expect(chordNotes(chord)).toEqual([41, 46, 51, 56, 60, 65])
  })

  test('counts frets from the position of the chord or the settings', () => {
    // A barre chord at the 5th fret
    const chord = { ...barreF, position: 5 }
    expect(chordNotes(chord)).toEqual([45, 52, 57, 61, 64, 69])
    expect(chordNotes(barreF, { position: 5 })).toEqual([45, 52, 57, 61, 64, 69])
    expect(chordNotes(chord, { position: 3 })).toEqual([45, 52, 57, 61, 64, 69])
  })

  test('mutes strings with an X even under a barre', () => {
    const chord: Chord = { ...barreF, fingers: [...barreF.fingers, [6, 'x']] }
    expect(chordNotes(chord)).toEqual([48, 53, 57, 60, 65])
  })

  test('plays unmarked strings open unless told otherwise', () => {
    const chord: Chord = { fingers: [[2, 1]], barres: [] }
    expect(chordNotes(chord)).toEqual([40, 45, 50, 55, 60, 64])
    expect(chordNotes(chord, {}, 'muted')).toEqual([60])
  })

  test('ignores strings the chart does not have', () => {
    const chord: Chord = {
      fingers: [
        [7, 2],
        [0, 1],
        [1, 3],
      ],
      barres: [],
    }
    expect(chordNotes(chord, {}, 'muted')).toEqual([67])
  })

  test('plays a ukulele chord', () => {
    // C on a ukulele: G4 C4 E4 C5
    const chord: Chord = { fingers: [[1, 3]], barres: [] }
    expect(chordNotes(chord, { strings: 4 })).toEqual([67, 60, 64, 72])
  })

  test('plays nothing if the tuning is unknown', () => {
    expect(chordNotes(openC, { strings: 5 })).toEqual([])
  })
})

describe('isPlayable', () => {
  test('guitar and ukulele chords can be played', () => {
    expect(isPlayable(openC)).toBe(true)
    expect(isPlayable(openC, { strings: 6 })).toBe(true)
    expect(isPlayable({ fingers: [[1, 3]], barres: [] }, { strings: 4 })).toBe(true)
  })

  test('other charts need the tuning of every string', () => {
    expect(isPlayable(openC, { strings: 5 })).toBe(false)
    expect(isPlayable(openC, { strings: 7 })).toBe(false)
    expect(isPlayable(openC, { strings: 5, tuning: ['A', 'D', 'G', 'B', 'E'] })).toBe(true)
  })

  test('at least one string must sound', () => {
    const muted: Chord = { fingers: [1, 2, 3, 4].map((s) => [s, 'x']), barres: [] }
    expect(isPlayable(muted, { strings: 4 })).toBe(false)
    expect(isPlayable({ fingers: [], barres: [] })).toBe(true)
    expect(isPlayable({ fingers: [], barres: [] }, {}, 'muted')).toBe(false)
  })
})
