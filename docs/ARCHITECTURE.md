# Tiny Taps architecture

Tiny Taps is a static, offline-first toddler learning PWA. It runs directly as
ES modules with no framework, bundler, account, server API, or analytics service.
State that persists is stored locally with `localStorage` or IndexedDB.

## Application shell and module boundaries

`index.html` provides `#app`, `#screen`, and the celebration Canvas, loads the
two CSS files, and starts `js/app.js`. `js/app.js` imports the game registry and
engine modules, owns screen transitions, and passes a small context object into
each game's `start(ctx)` function. A game owns everything it adds to `ctx.stage`
and returns a cleanup callback for timers, animation frames, listeners, or speech.

The shared context contains `stage`, `audio`, `speech`, `celebrate`, `setReprompt`,
`exitToMenu`, adaptive `difficulty`, and `recordOutcome`. Game modules should use
these services rather than reaching into the app shell.

`js/games/index.js` is the authoritative registry. It currently exports 21 games.

## Voice and audio

### Computer voice boundary

`js/engine/speech.js` deliberately separates active single-value synthesis from
legacy narration. `speak()` returns a resolved promise without producing audio;
old calls remain harmless so unrelated games do not need invasive rewrites.
`speakWord()` is the only active computer-speech function during gameplay.

There are exactly four gameplay modules:

1. `js/games/counting.js` calls `speakWord(WORDS[counted])` when an uncounted
   animal is tapped. The utterance is only `one` through `ten`.
2. `js/games/bigsmall.js` calls `speakWord` after rendering each new round. The
   utterance is only `Big` or `Small`; idle reprompting does not repeat it.
3. `js/games/trace.js` awaits `speakWord(current.spoken)` after the final valid
   stroke. The utterance is only the completed letter, number word, shape, or animal.
4. `js/games/playhouse.js` routes its short weather, outfit, and sibling-moment
   cues through one `speakWord(word)` helper.

`js/games/animals.js` and `js/games/numberbook.js` do not use browser speech.
My First Words loads Piper MP3s from `assets/audio/animals/`; Number Book loads
111 Piper MP3s from `assets/audio/numbers/`. Both use the same
`en_US-amy-medium` voice and remain consistent across devices. A failed clip
load remains silent rather than falling back to device-dependent system speech.

Settings uses `speakWord()` for parent-facing voice/rate previews; that is not a
gameplay trigger. `scripts/check.mjs` enforces the permitted game modules and one
active trigger in each. Every synthesized utterance uses the selected voice's
English locale, with `en-US` as a fallback while a device's voice list loads;
this prevents number names from inheriting a non-English system locale.

### Parent voice

Parent praise and encouragement are independent of computer speech. Settings
records blobs with `MediaRecorder`; `js/engine/recordings.js` stores the `praise`
and `encourage` categories in IndexedDB. At boot, `js/app.js` loads and decodes
them through `js/engine/audio.js`, then registers their buffer names with
`speech.setRecordedCategory()`.

`speech.praise()` and `speech.encourage()` play only those saved category clips.
They never synthesize fallback phrases. Quick games throttle recorded praise;
slower completions can pass `{ quick: false }`. Celebrations call parent praise
through `js/engine/celebrate.js` `big()`. This must remain separate from the
computer-voice triggers.

### Other audio

`js/engine/audio.js` owns Web Audio effects, decoded buffers, global volume, and
per-game mute state. Authentic animal sounds and the bundled My First Words
Piper MP3s are data/media sounds, not browser narration. `js/data/animals.js`
records which animals have authentic sound files.

## Navigation and lifecycle

`showSplash()` unlocks audio on the first gesture and opens `showMenu()`.
`showMenu()` filters the registry by the selected learning profile and hidden
games, builds the card grid, and anchors Settings, Mix, and Info controls.

`startGame()` guards against multi-touch duplicate launches, clears the previous
screen, creates the game stage and chrome, records a play, constructs `ctx`, and
stores the cleanup returned by the game. Mix mode wraps cleanup with its own
90-second switch timer.

`clearScreen()` runs cleanup, cancels reprompts and computer speech, stops active
buffer playback, and removes the prior DOM. `makeHomeButton()` returns to the
menu immediately on one pointerdown; there is no hold timer.

The mute control resets to audible for each newly opened game. Muting cancels
speech and affects both Web Audio and speech synthesis through engine checks.

## Game architecture

Games with specialized gestures implement their own `start(ctx)`. Simple
prompt/choice games can use `js/engine/roundgame.js` `makeRoundGame()`, which
handles target construction, answer buttons, feedback, parent voice, progress,
stickers, fade transitions, and reprompt registration.

### Peekaboo

`js/games/peekaboo.js` cycles animal groups. A covered tile reveals its animal,
plays an authentic recording when available, records success, and advances after
the group is open.

### Animal Sounds

`js/games/sounds.js` preloads recorded animals, plays the target sound from a
listen button, and builds adaptive two- or three-animal choices.

### Colors

`js/games/colors.js` shows a target swatch and balloon choices. Difficulty controls
choice count. Legacy narration calls are silent; visual prompting drives play.

### Shapes

`js/games/shapes.js` shows a dashed target outline and filled shape options.
Correct selection fills the target and advances; difficulty controls choices.

### Counting

`js/games/counting.js` creates one to ten copies of an animal. Each animal can be
tapped once, receives an ordinal badge, advances the large numeral, and speaks
only that number word. A parent-gated control switches the configured maximum.

### Number Book

`js/games/numberbook.js` is a round-free page deck with a top mode switch.
Counting mode contains every integer from 0 through 100. 10s & Big Numbers mode
contains 0, each ten through 100, then decimal place values through one
trillion. Tapping speaks the visible number and flips forward; Reset returns
the selected mode to zero. Each of its 111 unique values has a bundled Piper
MP3 generated by `scripts/generate-number-audio.mjs`. The page waits for that
recording to finish before turning, keeping spoken and visible values
synchronized. The current and next clips are warmed into decoded audio buffers,
and the service worker caches the entire collection for offline use. Number
formatting, responsive size tiers, and spoken phrases are deterministic.

### Puzzle Fit

`js/games/puzzle.js` keeps the Animals/Shapes toggle in local storage. Animals
mode creates four silhouette slots and draggable matching animal pieces.

Shapes mode uses `PICTURE_PUZZLES`. Each entry draws one large familiar SVG
picture and overlays one white dashed negative-space `fit-gap-target`. The tray
contains the exact geometric piece plus two distractors. `makeDraggable()` tests
the gap; only the matching shape fills the cut-out and completes the picture.
There is no sequence or pattern-continuation logic in this mode.

### Feed Me

`js/games/feedme.js` chooses an animal/diet pair from `js/data/animals.js`, shows
three foods, and uses forgiving drag completion for the correct food.

### Coloring

`js/games/coloring.js` mixes hand-built and cleaned external SVG pages with
large `data-region` targets. Repeated region names join split vector paths into
one logical fill (for example, every piece of a leg changes together). A
persistent in-game filter switches between All Pictures and Characters.
Palette taps fill regions, and completed SVG snapshots are retained in a
bounded local gallery.

### Matching

`js/games/memory.js` creates two pairs of animal cards, locks while resolving a
pair, leaves matches open, and flips misses back after gentle feedback.

### Music

`js/games/music.js` is round-free play. Eight large bars trigger synthesized
notes and occasional visual bursts.

### Bubbles

`js/games/bubbles.js` owns a responsive Canvas animation loop. Pointer hits pop
bubbles, play effects, and update the free-play scene.

### Sticker Book

`js/games/stickers.js` reads locally earned animal IDs from
`js/engine/stickers.js` and shows earned art or locked silhouettes.

### Shadow Match

`js/games/shadow.js` configures `makeRoundGame()` with a filtered animal image
as the target and adaptive animal choices, revealing the art on success.

### Big or Small

`js/games/bigsmall.js` configures `makeRoundGame()` with large and small copies
of the same animal. `speakPrompt()` says only the requested size at the start
of every round. `reprompt()` is intentionally silent.

### Patterns

`js/games/pattern.js` generates AB, AAB, or ABC color sequences according to
adaptive difficulty and asks for the next color visually.

### Sort It

`js/games/sort.js` shows two habitat targets per round and draggable animals.
Targets and outcomes use the habitat field in `js/data/animals.js`.

### Wash the Animal

`js/games/wash.js` draws an opaque mud layer on Canvas above animal art and uses
destination-out rubbing. Periodic pixel sampling completes near 78% cleared.

### Trace It

`js/data/trace-items.js` defines alphabet, shape, number, and animal catalogs.
Every one of the 23 animals has a distinct centre-line outline emphasizing its
recognizable features; the faint animal artwork remains a visual reference.

`js/games/trace.js` samples each SVG path into ordered points. A stroke can start
only near its current expected point. Pointer movement is interpolated at short
intervals, including coalesced browser events. `advanceSample()` searches only a
bounded distance ahead, so progress is monotonic and cannot jump across a curve
or from the shared start/end point of a closed shape. Completion requires both
the final ordered point and meaningful finger travel. Multiple-stroke items
activate strokes in order. A tap without movement cannot complete anything.

After the final stroke, Trace records the outcome, speaks exactly
`current.spoken`, then runs the normal visual celebration and separate parent
praise path.

### My First Words

`js/games/animals.js` partitions all 73 cards into three exclusive decks:
Animals includes the regular animal-photo library plus the additional animal
word photos, Shark Family includes only the five colored family PNGs, and
Objects contains the remaining everyday items. The generic shark belongs only
to Animals.

A safe-bottom-corner configuration button opens the three deck choices. The
selection is stored locally, immediately reshuffles that deck, and is restored
on the next visit. Object taps play bundled Piper names; full-screen horizontal
swipes move only within the selected category.

## Settings and local state

`js/app.js` `showSettings()` creates the modal dynamically. Its red sticky Close
button is the first control. Settings includes learning profile, volume, voice
speed/voice selection, optional Mix, local progress, offline/install status,
parent recordings, and per-game menu visibility.

Preferences use namespaced `localStorage` keys. `js/engine/progress.js` stores
plays, outcomes, detail difficulty, and local observations. The progress view is
informational and can reset data after confirmation. Recordings use IndexedDB
because audio blobs are unsuitable for localStorage.

## PWA, caching, and display modes

`manifest.webmanifest` runs with `display: fullscreen`, relative scope/start URL,
and portrait/landscape support. `sw.js` precaches the shell, modules, styles,
animal art/audio, and icons. Code requests are network-first with offline cache
fallback; immutable media is cache-first. Release changes must bump both
`js/data/version.js` and the service-worker cache name.

Mobile Safari and standalone iOS PWAs report viewport and safe-area geometry
differently. `css/main.css` therefore gives `html`, `body`, `#app`, and `#screen`
both `100%` and `100dvh` sizing. Menu/chrome positions include
`env(safe-area-inset-top/right/bottom/left)`. Settings, Mix, and Info are fixed
to safe corners/edges; standalone mode adds menu breathing room. Screen entry
animation changes opacity only so it does not create a transformed containing
block that would displace fixed controls.

Game-specific top padding in `css/games.css` keeps toggles below Home and mute.
Any layout change must be checked in a normal Safari tab and an Added-to-Home-
Screen launch, in both orientations where the game supports them.

## Validation

Run `npm run check` after every change. It verifies relative JS imports, service
worker assets, animal media references, manifest icons, the four-game
computer-speech boundary, and the exact My First Words category partition. Also
run JavaScript syntax checks and `git diff --check`.
For tracing/catalog work, verify all 23 animal IDs have non-empty, unique path
sets and that pointerdown alone cannot advance or finish a stroke.
