# @svguitar/play-plugin

[SVGuitar](https://github.com/omnibrain/svguitar) plugin to play chord diagrams with a guitar sound.

The sound is synthesized in the browser with the Web Audio API (a plucked string, using the
Karplus-Strong algorithm), so there are no sound files to load.

## Installation

```bash
npm install @svguitar/core @svguitar/play-plugin
```

`@svguitar/core` is a peer dependency and is not bundled with this plugin.

## Usage

```ts
import { SVGuitarChord } from '@svguitar/core'
import { playPlugin } from '@svguitar/play-plugin'

const SVGuitarWithPlay = SVGuitarChord.plugin(playPlugin)

const chart = new SVGuitarWithPlay('#chart')
chart.chord({ fingers: [[2, 2], [3, 2], [4, 2], [6, 'x']], barres: [] }).draw()

if (chart.isPlayable()) {
  button.onclick = () => chart.play()
}
```

Browsers only allow audio after the user interacted with the page, so call `play()` from a click
handler or similar.

The plugin combines with other plugins, e.g. with
[@svguitar/chords-plugin](https://github.com/omnibrain/svguitar-chords-plugin):

```ts
const SVGuitarWithChords = SVGuitarChord.plugin([chordsPlugin, playPlugin])

const chart = new SVGuitarWithChords('#chart')
chart.guitarChord('Am7').draw()
chart.play()
```

### Which chords can be played

To play a chord, the plugin needs to know the notes of the strings:

- a chart with **6 strings** is a guitar in standard tuning (E A D G B E)
- a chart with **4 strings** is a ukulele in standard tuning (G C E A, with a high G)
- a chart with **any other number of strings** needs the note of every string as its `tuning`

Guitars and ukuleles with only some strings named can't be played if a name contradicts the standard
tuning, e.g. a `D` on the lowest guitar string. Labels that aren't notes, like `1`, are ignored. If
every string is named with a note, that tuning is used, e.g. for drop D:

```ts
chart.configure({ strings: 7, tuning: ['B', 'E', 'A', 'D', 'G', 'B', 'E'] })
chart.configure({ tuning: ['D', 'A', 'D', 'G', 'B', 'E'] })
```

Notes are `C` to `B` (also lowercase) with `#`/`b` (or `♯`/`♭`), optionally with an octave, e.g.
`E2`. Without octaves, every string is tuned above the string to its left and the highest string is
in octave 4. Give the octave of at least one string for other ranges, e.g. a bass:
`['E1', 'A', 'D', 'G']`.

`isPlayable()` is `false` if the notes of the strings are unknown or no string sounds. `play()`
throws an error for chords that can't be played.

On each string, the highest finger or barre sounds, strings with an "X" are muted, and strings with
an "O" or without a marking are played open. Pass `unmarkedStrings: 'muted'` to only play strings
with a finger, barre or "O".

### Options

```ts
const playback = chart.play({
  duration: 3, // seconds each string rings, default 2
  strum: 0.05, // seconds between two strings, 0 plays all at once, default 0.03
  direction: 'up', // 'down' (lowest string first, default) or 'up'
  volume: 0.5, // 0 to 1, default 0.8
  brightness: 0.8, // 0 (soft) to 1 (bright), default 0.5
  unmarkedStrings: 'muted', // 'open' (default) or 'muted'
  audioContext, // the AudioContext to play in, by default one is created and shared
  destination, // the AudioNode to play to, e.g. for effects or recording, default the speakers
})

playback.notes // MIDI notes played, from the lowest string, e.g. [48, 52, 55, 60, 64]
await playback.finished // resolves when the chord has finished or was stopped
playback.stop()
```

### Without a chart

The functions work with SVGuitar chords and settings directly:

```ts
import { chordNotes, isPlayable, playChord, stringTuning } from '@svguitar/play-plugin'

const chord = { fingers: [[1, 3]], barres: [] }

isPlayable(chord, { strings: 4 }) // true
chordNotes(chord, { strings: 4 }) // [67, 60, 64, 72], G4 C4 E4 C5
stringTuning({ strings: 5 }) // undefined, the strings need names
playChord(chord, { strings: 4 }, { duration: 1 })
```

## Development

```bash
npm install
npm test        # tests with coverage
npm run lint
npm run build   # UMD + ES builds in dist/
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint).

## Releases

Releases are managed by [release-please](https://github.com/googleapis/release-please). Every push to
`main` updates a release PR with the next version and changelog. Merging that PR tags the release
and publishes the package to npm. Publishing needs an `NPM_TOKEN` repository secret.

## License

MIT
