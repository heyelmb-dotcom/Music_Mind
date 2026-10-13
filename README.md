# Music Mind

A personal, phone-first app for learning music production by ear. It covers how songs are built: rhythm, bass, harmony, melody, texture and arrangement. It also trains your ears, both musical (intervals, chords, progressions) and production (EQ bands, what dropped out).

No build step and no dependencies: plain HTML, CSS and ES modules, with Web Audio synths.

## The tabs

- **Bass**: the Bass Lab. Seven lessons on how the bass relates to everything else: roots, locking with the kick, chord tones, approach notes, rhythm, inversions and pedals, and register. Each lesson loops one groove and lets you switch only the bass part while it plays. Every bass note is labeled by its job (R, 3, 5, 7, → approach). Each lesson ends with a task to try with your band.

- **Path**: concepts (backbeat, the pocket, bass chord tones, intervals, major/minor, the four-chord family, root motion, the frequency map, arrangement as subtraction, sidechain, 7ths, borrowed chords, triplet feel). Each one has a short lesson, a demo and a **trial**: an ear test or a build challenge checked against your Studio pattern. Earned concepts unlock songs.
- **Studio**: an 8-track step sequencer (kick, snare, hats, perc, bass, chords, pad, lead). It has a chord lane in roman numerals, a piano roll with scale lock, 16-step or 12-step (triplet) grids and swing. Each track has filter, reverb, pan and a sidechain DUCK switch. There's a spectrum analyser, and **MIDI export to Logic**.
- **Ear**: free practice for every drill. You choose your own option sets, and nothing is tallied.
- **Songs**: your repertoire. Each song has an arrangement map (sections × layers × energy curve), a chord chart per section, listening missions with a journal, and a style sketch to load into the Studio. There's an in-app **editor** for mapping songs, and import/export of maps as JSON.

Song maps ship as **drafts**. The structures are scaffolds to verify by ear, and the sketches are style studies, not transcriptions. Mapping a song yourself is the exercise.

## Run it

```sh
npm start        # serves on http://localhost:8080
npm test         # theory, sequencer, MIDI and content checks
```

## Put it on your phone

The workflow in `.github/workflows/pages.yml` deploys to GitHub Pages on every push. To turn it on, go to the repo's **Settings → Pages → Source: GitHub Actions**. Then open the Pages URL on your phone and choose **Add to Home Screen** (iOS Safari) or **Install app** (Android Chrome). Data is stored on the device; use **More → Back up everything** now and then.

## Adding songs

Map a song in the app's editor, then **Export map** and drop the JSON into `js/data/songs.js` (or just keep it on the device). Chords use roman numerals measured against the major scale of the key: `I ii iii IV V vi vii°`, with `b`/`#` for borrowed chords (`bVII`, `bVI`, `iv`) and `7`, `maj7`, `ø7`, `sus4` and `add9` for colour.
