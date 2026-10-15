import {
  GUITAR_TUNING,
  parseNote,
  stringTuning,
  tuningFromNames,
  UKULELE_TUNING,
} from '../src/tuning'

describe('parseNote', () => {
  test.each([
    ['E', { pitchClass: 4, octave: undefined }],
    ['e', { pitchClass: 4, octave: undefined }],
    ['F#', { pitchClass: 6, octave: undefined }],
    ['Bb', { pitchClass: 10, octave: undefined }],
    ['b', { pitchClass: 11, octave: undefined }],
    ['C♯3', { pitchClass: 1, octave: 3 }],
    ['E♭2', { pitchClass: 3, octave: 2 }],
    [' Cb4 ', { pitchClass: -1, octave: 4 }],
  ])('parses %s', (name, note) => {
    expect(parseNote(name)).toEqual(note)
  })

  test.each(['', 'H', '1', 'E string', 'C##x'])('rejects %p', (name) => {
    expect(parseNote(name)).toBeUndefined()
  })
})

describe('tuningFromNames', () => {
  test('places notes without octaves above each other, the highest in octave 4', () => {
    expect(tuningFromNames(['E', 'A', 'D', 'G', 'B', 'e'])).toEqual(GUITAR_TUNING)
    expect(tuningFromNames(['D', 'A', 'D', 'G', 'B', 'E'])).toEqual([38, 45, 50, 55, 59, 64])
    expect(tuningFromNames(['B', 'E', 'A', 'D', 'G', 'B', 'E'])).toEqual([
      35, 40, 45, 50, 55, 59, 64,
    ])
  })

  test('uses re-entrant tuning for a ukulele tuned G C E A', () => {
    expect(tuningFromNames(['G', 'C', 'E', 'A'])).toEqual(UKULELE_TUNING)
    expect(tuningFromNames(['G3', 'C4', 'E4', 'A4'])).toEqual([55, 60, 64, 69])
  })

  test('uses the octaves given', () => {
    expect(tuningFromNames(['E1', 'A1', 'D2', 'G2'])).toEqual([28, 33, 38, 43])
    expect(tuningFromNames(['E1', 'A', 'D', 'G'])).toEqual([28, 33, 38, 43])
    expect(tuningFromNames(['E', 'A', 'D3', 'G'])).toEqual([40, 45, 50, 55])
  })

  test('rejects names that are not notes', () => {
    expect(tuningFromNames(['E', 'A', '', 'G', 'B', 'E'])).toBeUndefined()
    expect(tuningFromNames([])).toBeUndefined()
  })
})

describe('stringTuning', () => {
  test('a chart with 6 strings is a guitar', () => {
    expect(stringTuning()).toEqual(GUITAR_TUNING)
    expect(stringTuning({ strings: 6 })).toEqual(GUITAR_TUNING)
  })

  test('a chart with 4 strings is a ukulele', () => {
    expect(stringTuning({ strings: 4 })).toEqual(UKULELE_TUNING)
  })

  test('other charts need the notes of all strings', () => {
    expect(stringTuning({ strings: 5 })).toBeUndefined()
    expect(stringTuning({ strings: 5, tuning: ['G', 'D', 'G', 'B'] })).toBeUndefined()
    expect(stringTuning({ strings: 5, tuning: ['G', 'D', 'G', 'B', '?'] })).toBeUndefined()
    expect(stringTuning({ strings: 5, tuning: ['B', 'E', 'A', 'D', 'G'] })).toEqual([
      47, 52, 57, 62, 67,
    ])
  })

  test('ignores labels of strings that are not drawn', () => {
    expect(stringTuning({ strings: 4, tuning: ['E', 'A', 'D', 'G', 'x'] })).toEqual([
      52, 57, 62, 67,
    ])
  })

  test('uses the tuning of guitars and ukuleles if all strings are named', () => {
    expect(stringTuning({ tuning: ['D', 'A', 'D', 'G', 'B', 'E'] })).toEqual([
      38, 45, 50, 55, 59, 64,
    ])
    expect(stringTuning({ tuning: ['1', '2', '3', '4', '5', '6'] })).toEqual(GUITAR_TUNING)
    expect(stringTuning({ strings: 4, tuning: ['A', 'D', 'F#', 'B'] })).toEqual([57, 62, 66, 71])
  })
})
