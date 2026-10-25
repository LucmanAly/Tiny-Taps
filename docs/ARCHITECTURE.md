# Tiny Taps architecture

Tiny Taps is a static, offline-first toddler learning PWA. It runs directly as
ES modules with no framework, bundler, account, server API, or analytics service.
State that persists is stored locally with `localStorage` or IndexedDB.

## Animal artwork

The 60 storybook assets in `assets/animal-art/` replace the original shared SVGs,
animal flashcard images, Shark Family illustrations, Play House bird drawings
and animal-shaped toys. `js/data/animal-art.js` owns canonical IDs and aliases
(such as puppy → dog and goldfish → fish). Shared games and child avatars use
transparent WebP cutouts; Shadow Match applies its black filter to the same
alpha. My First Words keeps its existing card IDs, bundled recordings, filters
and practice history, with animal cards resolved to this library and everyday
object photographs retained. Paint Pots colors the new frog and pig with an SVG
filter that retains their shading. Play House uses matching perched/flight bird
art, preserves its movement and feeding logic, and tints garden birds at draw time.

Coloring retains its original twelve inline animal sketches in
`js/games/coloring.js`, plus the supplied parrot and Daddy Shark SVG pages in
`assets/art/`. The generated alternatives in `assets/animal-art/coloring/`
are archival files only and are neither loaded nor precached. Saved child
pictures remain their own snapshots. The original shark SVG and card picture
are preserved in `assets/art/shark.svg` and `assets/art/shark-original.jpg`;
the new storybook shark stays available.
`docs/animal-art-prompts.json` records the prompts and generation provenance;
`scripts/prepare-animal-art.mjs` frames and compresses cutouts, and
`scripts/trace-animal-coloring.mjs` produced the archived coloring alternatives. These tools
require Sharp only during asset preparation. The application still has no build
step or runtime dependency. All active cutouts and external coloring pages are
precached. The release gate permits the restored Coloring pages while rejecting
runtime references to the other retired animal libraries.

## Application shell and module boundaries

`index.html` provides `#app`, `#screen`, and the celebration Canvas, loads the
two CSS files, and starts `js/app.js`. `js/app.js` imports the game registry and
engine modules, owns screen transitions, and passes a small context object into
each game's `start(ctx)` function. A game owns everything it adds to `ctx.stage`
and returns a cleanup callback for timers, animation frames, listeners, or speech.

The shared context contains `stage`, `audio`, `speech`, `celebrate`, `setReprompt`,
`exitToMenu`, adaptive `difficulty`, and `recordOutcome`. Game modules should use
these services rather than reaching into the app shell.

`js/games/index.js` is the authoritative registry. It currently exports 25 games.

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
   In the My Name set each letter says itself and the last letter says the
   whole name (one name value).
4. `js/games/playhouse.js` routes every Play House cue through one `W.say(word)`
   helper wrapping a single `speakWord(word)` call. Each cue is one name: a
   weather word, an outfit, a toy, an animal (including a fed bush animal, a
   "Bee" or a "Butterfly"), a photo's name, a crop from the
   vegetable patch (its toy's word), or "Water" from the watering can. Repeated words
   are suppressed for 1.6 s. The modules in `js/games/playhouse/` call `W.say`
   and never `speakWord`.

`js/games/animals.js` and `js/games/numberbook.js` do not use browser speech.
My First Words loads Piper MP3s from `assets/audio/animals/` (its Find it mode plays the same
clip as the only prompt); Number Book loads 111 Piper MP3s from
`assets/audio/numbers/`. Both use the same
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
per-game mute state. Things That Go adds one effect per vehicle (`siren`,
`beepBeep`, `puttPutt`, `chopChop`, `foghorn`, `jet`, `ringRing`, plus the
existing `honk` and `toot`); Things That Go, Paint Pots and Silly Faces use
effects only. The Play House vegetable patch adds `trickle` (pouring water),
`sprout` (a plant growing a stage) and `pluck` (pulling up a harvest); its
garden and house add `chirp` (a bird's tweet) and `click` (the lamp's pull
cord). Authentic animal sounds and the bundled My First Words
Piper MP3s are data/media sounds, not browser narration. `js/data/animals.js`
records which animals have authentic sound files.

Play House's children have recorded voices too: the baby's giggles, delighted
squeals, babble, coos, gulps, a yawn and a sneeze, the brother's laughs, and
the real beads of her rattle, in `assets/audio/playhouse/`. They are wordless
vocalisations cut from public-domain and Creative Commons recordings
(`scripts/cut-playhouse-voices.py`, credits in `assets/CREDITS.md`), so like
the animal recordings they are not computer narration and carry no words,
instructions or praise. `audio.playVoice(name, { channel })` plays them over
other sound instead of taking turns like `audio.play`: one at a time per
channel, and softer while a parent recording is speaking. It returns false
when a clip is not loaded so the caller can fall back to the synthesized
`giggle`, `babble`, `coo`, `sleepyCoo`, `glug` or `rattleShake`.

## Navigation and lifecycle

`showSplash()` unlocks audio on the first gesture and opens `showMenu()`, or
`showWhoIsPlaying()` first when more than one child is set up. With several
children the menu shows the playing child's avatar chip (top-left; avatar only
on phones), which returns to that chooser.
`showMenu()` filters the registry by the selected learning profile and hidden
games, builds the card grid, and anchors Settings, Mix, and Info controls.
Every preset profile includes Baby Boo and the Sticker Book; My First Words, Things That Go
and Silly Faces are on the younger home screens, Paint Pots and Number Book on
the older ones. While the bedtime timer is winding down, the menu shows only
`calm.CALM_GAMES` (title "Wind-down time"), and `mixPool()` applies the same
filter to Mix. `showGoodnight()` replaces any screen when the timer ends, and
boot shows it instead of the splash while the goodnight lock is active.

`startGame()` guards against multi-touch duplicate launches, clears the previous
screen, creates the game stage and chrome, records a play, constructs `ctx`, and
stores the cleanup returned by the game. Mix mode wraps cleanup with its own
90-second switch timer.

`clearScreen()` runs cleanup, cancels reprompts and computer speech, stops active
buffer playback, and removes the prior DOM. `makeHomeButton()` returns to the
menu immediately on one pointerdown; there is no hold timer.

The mute control resets to audible for each newly opened game unless a parent
turned on "Keep sound muted between games" (`calm.savedMute()`). Muting cancels
speech and affects both Web Audio and speech synthesis through engine checks.

## Game architecture

Games with specialized gestures implement their own `start(ctx)`. Simple
prompt/choice games can use `js/engine/roundgame.js` `makeRoundGame()`, which
handles target construction, answer buttons, feedback, parent voice, progress,
stickers, fade transitions, and reprompt registration.

`js/engine/drag.js` `makeDraggable()` (Feed Me, Sort It, Puzzle Fit Animals,
Paint Pots) also provides tap-to-place: a press that moves less than 10 px in
under 600 ms is a tap. With one destination the item glides straight there;
otherwise it is lifted (`.tap-selected`) and every destination pulses
(`.tap-target`) until a capture-phase document listener sees the next tap —
on a destination it glides there, anywhere else it is put down. Arrival goes
through the same `onDrop` verdict as a real drop, so wrong choices bounce home
with the usual feedback. Parents can switch it off (`tinytaps-tap-place`).

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

Shapes mode is the Shape Builder. `js/data/builds.js` defines `BUILDS`: toys
(car, boat, fish, snowman, duck, turtle, house, ladybug, rocket, robot,
butterfly, plane, train) made of 3–6 primitive parts (circle, oval, rectangle,
square, half circle, triangle). Each part is positioned by its bounding-box
centre, so its path doubles as its dashed `sb-slot` outline; parts with
identical paths (a pair of wheels) are interchangeable. Size matters as much
as shape (the snowman's three circles, the train's big and small wheels).

`buildShapes()` renders one SVG sized 1:1 to the content box. `layout()` splits
it into a build area and a tray (beside it in landscape, under it in portrait),
fits the build at scale `s`, and shelf-packs the remaining pieces at a smaller
uniform scale `t` so their relative sizes stay true; a lifted piece grows to
`s` so it matches its outline exactly. A `ResizeObserver` re-lays the round out
on rotation while keeping placed pieces. Dragging is custom pointer handling in
SVG space (one piece at a time). With tap-to-place on, a quick tap lifts a
piece (`.sb-picked`) and makes every empty outline glow (`.sb-target`, so no
answer is given away); tapping an outline glides the piece there and resolves
it like a drop, tapping elsewhere puts it down. A drop near a matching empty outline snaps in
with a thud and a rising bell note; a drop on a different outline boings, plays
the throttled parent encouragement, pulses the piece's own outline, and glides
it home; a drop elsewhere just glides home. The idle re-prompt silently wiggles
one piece and pulses its outline. Level 1 (`ctx.difficulty()`) tints outlines
with the piece colour and draws only level-1 builds; levels 2–3 use plain
outlines and add bigger builds. Wrong drops and completed builds are recorded
through `ctx.recordOutcome` as `build:<id>`.

When the last piece lands, the toy bounces, `celebrate.big({ quick: false })`
runs, and the toy comes alive according to `go.kind` (drive, chug, sail,
paddle, swim, walk, hop, dance, fly, plane, launch, peek) using Web Audio toy
effects (`honk`, `toot`, `rumble`, …) or an authentic animal recording — the
house opens its door and a random farm animal from `VISITORS` pops out with
its real sound. There is no computer speech, sequence, or pattern-continuation
logic in this mode.

### Feed Me

`js/games/feedme.js` chooses an animal/diet pair from `js/data/animals.js`, shows
three foods, and uses forgiving drag completion for the correct food. With
tap-to-place a tapped food goes straight to the animal (its only destination).

### Coloring

`js/games/coloring.js` mixes hand-built and cleaned external SVG pages with
large `data-region` targets. Repeated region names join split vector paths into
one logical fill (for example, every piece of a leg changes together). A
collapsible sidebar displays every page as a thumbnail and filters All Pictures
or Characters. It starts closed on every screen, overlays the canvas when
opened from Pictures, and closes immediately on every sketch tap (including
the selected sketch), before loading any external SVG. Viewport changes never
reopen the picker or shrink the drawing area. The compact palette has six colors
per row (two rows), or one row on wide landscape screens. Selecting a page restores its unfinished colors for the current
session; stale asynchronous loads cannot replace the latest selection. The animal
pages use the original chunky sketches. The supplied parrot has six logical fill
groups, and Daddy Shark has seven, with fixed ink and eye details that pass taps through.
Palette taps fill regions. Each page's fills are an ordered list of
`[region, color]` pairs in `tinytaps-coloring-drafts`: the picture is rebuilt
by resetting every region to its original fill and replaying the list, Undo
pops the last pair, and a repeat tap with the same color adds nothing. Lists
over 200 steps fold into one fill per region. Drafts survive leaving the game;
the game reopens on the last unfinished page (`tinytaps-coloring-last`) and
picker thumbnails with a draft show a paint dot. A separate Done control above
the picture saves one completed SVG snapshot (with the page name) to the
bounded local gallery, clears that draft, then advances to the next sketch in
the active category after celebration (wrapping after the last one). The
picker stays closed. Done and Undo are disabled until a region is colored and
during celebration. In the gallery, holding ⤓ for 0.65 s renders the snapshot
to a 1600 px PNG (re-serialized as namespaced XML, drawn on white) and hands it
to the share sheet on release, falling back to a download. Cleanup cancels
completion timers and removes open gallery overlays. All page assets are
precached offline.

### Matching

`js/games/memory.js` creates two pairs of animal cards, locks while resolving a
pair, leaves matches open, and flips misses back after gentle feedback.

### Music

`js/games/music.js` is round-free play. Eight large bars trigger synthesized
notes and occasional visual bursts. Every tap is remembered as `[bar, pause]`
pairs; 3.5 s of quiet (or a new instrument) starts a new tune, capped at 24
notes. The green replay button plays the current or previous tune with its
timing (pauses clamped to 110–1200 ms), lighting each bar; any bar tap stops
it. The star keeps the tune as a chip (six at most, `tinytaps-music-tunes`).
The instrument button cycles the xylophone and recorded animals (dog, cat,
cow, duck, sheep, pig), whose recording plays at 0.75–1.5× speed per bar
(`tinytaps-music-instrument`). The controls sit between Home and mute.

### Bubbles

`js/games/bubbles.js` owns a responsive Canvas animation loop. Pointer hits pop
bubbles, play effects, and update the free-play scene.

### Sticker Book

`js/engine/stickers.js` defines `STICKER_SETS`: Animals (plain animal ids, so
older books still count), Toys (`toy:<build>`, drawn by `buildSvg` from
`js/data/builds.js`) and Treats (`food:<id>`). One sticker is awarded every
fifth win across all sets until the whole book is complete. Animal stickers
show the photo in the book and the cut-out cartoon (`cutout`) in scenes.

`js/games/stickers.js` has a Book tab (each set with earned art or locked
silhouettes) and three scene tabs — Farm, Jungle, Ocean — with SVG backdrops
anchored to the bottom (`xMidYMax slice`). The tray under a scene holds every
earned sticker: a tap drops one at a random spot, a drag (upward on touch, so
sideways swipes still scroll the tray) places it exactly. Placed stickers move
by drag, stack by z-index (re-appending would drop pointer capture), play
their sound on tap, and are removed by dropping them on the tray. Scenes keep
up to 40 stickers each in `tinytaps-sticker-scenes`.

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
Targets and outcomes use the habitat field in `js/data/animals.js`. With
tap-to-place, tapping the animal lifts it and both homes pulse.

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

Before each stroke a glowing demo dot (`playDemo`) runs along it once, leaving
a faint trail; it only draws and never changes progress, any touch on the card
stops it, and the idle reprompt replays it silently. The parent's path width
(`tinytaps-trace-width`, per child: narrow 0.75×, normal, wide 1.4×) scales
the tracing tolerance, start tolerance and stroke widths. When the playing
child has a name (Settings → Children; A–Z are kept, up to 10 letters), a Name
tab comes first: `nameItems()` makes one item per letter, the strip above the card shows
the whole name with the current letter large, and the last letter's spoken
value is the whole name.

### Play House

`js/games/playhouse.js` builds the world and owns the voice helper; the world
lives in `js/games/playhouse/`:

- `layout.js` — world geometry in world units (wu). The design band is 800 wu
  tall with y = 800 at the screen bottom; taller screens reveal sky and roof.
  The strip is 4720 wu wide: house interior 44–1600, doorway at 1630, garden
  1660–4720, with the vegetable patch (`PLACES.seeds`, `veg`, `can`, `basket`)
  past the apple tree from about 3420, and the baby's cot (`PLACES.cot`) against the
  back wall under the photo frames. Feet, toys and pram rest in a floor band (y 650–786); furniture
  sits behind it, so moving things are always drawn in front of furniture.
  `depthAt(y)` scales things further back.
- `world.js` — canvas, camera and frame loop. Landscape fits a 1600 wu view,
  portrait a 620 wu view; the child pans by swiping empty space, by carrying
  something to a screen edge, or with the round edge arrows. Drawing order:
  sky (gradient, stars, sun, moon, weather cloud), then the world (parallax
  hills, outside-fence path and visitors (`outside` layer), garden backdrop
  including the fence, ground decals, house backdrop, house decals, things
  sorted by base y, then held things), weather particles, effects, world-space
  UI (thought bubbles, polaroids) and screen-space UI (arrows, photo zoom,
  camera flash). After dusk the world is drawn on a second canvas, tinted with
  `source-atop` and lit with additive glows, so the sky behind is not darkened.
  Touches go to screen UI, soap bubbles, then the front-most thing. A press on
  a draggable gives instant feedback and becomes a tap on release or a drag
  after 10 px; a press elsewhere taps at once and becomes a pan after 14 px;
  empty space emits `tapEmpty`. The frame callback is scheduled before work
  and wrapped in try/catch so one error can never freeze the screen.
- `art.js` — the scenery as SVG strings (house, garden, hills, furniture,
  pram, tree, clouds, sun, moon, props) wrapped in a displacement "wobble" and
  a grain pass, rasterized once per pixel density (backdrops capped at 1.5×).
- `assets.js` — outfit pose tables (stand, walk, jump, sleep, magic, push,
  carry, kneel), baby poses, toys, scene art, moments, bush animals.
  `boundsOf` measures visible pixels so poses are drawn by figure height.
- `kids.js` — the brother (walk, hop, held/dangle, fall, sleep in bed,
  trampoline bounce with tap boosts, kneel, push, outfit changes and weather
  outfit wishes) and the baby (sit/look idle, crawl, wishes every 11–17 s
  preferring things in her room, toy reactions, peekaboo under the blanket,
  sleep, brother visits). She is carried around her middle, floats down
  softly when let go and stays put for 25 s before crawling off. Tapping the
  brother while he is within 330 wu of his awake sister plays a lullaby: he
  kneels beside her (or rocks her pram) and she yawns and falls asleep;
  tapping her wakes her, so it repeats on demand. Waking or lifting her
  always returns the blanket toy to the floor. In her cot (state `'cot'`,
  `baby.cot`, with the pram's `nap` flag meaning asleep) the cot draws her;
  touching her wakes her, lifting her takes her out, the brother's lullaby
  works there too (he kneels beside it), and she climbs out by herself after
  about 10 s awake. At bedtime (`boySleep`), when sleepy, or late at night in
  the house she crawls to the cot instead of sleeping on the floor (`toCot`).
  `W.kids.hum` is the shared music-box tune. Fulfilled wishes call
  `celebrate`, which plays parent praise only (`speech.praise`), the wisher's
  recorded delight (see `voices.js`) and records an outcome. The brother's
  weather outfit wish lasts 20 s, and tapping his thought bubble puts those
  clothes on where he stands (the wardrobe may be a whole garden away). When
  she drinks, the bottle's teat is at her lips and the bottle tips up and
  away from her face (`drawBottle`). The brother can carry a toy in his arms (`carry`/`putDown`,
  drawn in his carry and kneel poses); sent to do something else, picked up,
  or left standing for 2.5 s, he puts it down.  The baby eats food (apple, carrot, tomato, strawberry: it shrinks at her
  mouth and is gone), waves a flower in her raised hand, and claps at the
  pumpkin; dropping edible produce onto the brother (`boyEat`) lets him munch
  it too with chomps, his laugh, parent praise, and a `feed:boy` outcome. The
  baby can wish for any produce that exists as a toy or is ripe in the patch
  (`W.patch.ripe`), and tapping her bubble then points at it.
- `props.js` — toys with simple gravity, bounce, roll and throw physics;
  dropped toys are offered to `W.dropTargets` (baby/brother, toy box,
  trampoline, pram, harvest basket, a showing bush animal) in order before
  falling to the floor. When the rubber duck (`duck`) lands in a filled
  puddle (`W.sky.puddleAt`), it floats, bobs and drifts on the water with a
  ripple ring, and splashes + quacks in place when tapped. Produce toys carry a
  `produce` type (food, flower, big). `drawArt` paints a hidden toy in
  someone's hands; `W.removeToy` takes an eaten or basketed toy out of the
  world.
- `home.js` / `garden.js` — a pull-cord lamp (on, a golden shade, a cone of
  light and a wall halo by day; it lights the room at night), bed, the baby's
  cot (`W.cot`: glows while she is carried over it and seats her on release;
  tapping it spins the mobile and plays the tune, or calls her over from
  anywhere in the house), wardrobe with in-world outfit cards, curtains with
  window visitors, toy box spill/tidy (toys only: produce is left out), door;
  bushes with peekaboo animals (authentic recordings) who are fed from the
  garden: produce carried within about 260 wu of a bush brings out an animal
  that eats it (`EATS`, favourite first) and shows a "let go here" ring;
  dropped on them it is munched away (chomps, its recording and name, parent
  praise for a favourite, a `feed:<animal>` outcome), while the cat and frog
  sniff it and hand it back. After dark, when none of the night animals (owl,
  frog, cat) eats what is carried, a hungry daytime animal pops up instead. The apple tree holds eight apples dropped one per
  tap; a picked one regrows after 20 s in view, or quickly once the tree has
  been off screen for 2 s, and more than six loose apples are tidied into the
  basket (`W.patch.stash`). Night owl, trampoline, pram rides. Birds come in
  little colourful groups on clear days (`spawnFlock`, more at a rainbow);
  some land on the fence rail (`decal` layer), the seed-stand roof or the
  basket handle (sorted just in front of them), hop and peck, and leave after
  a while, at night or rain, or when tapped (`audio.chirp`). The pram glows with a ground ring while the
  baby is carried over it (`takes`) and seats her on release; tapping the
  empty pram has her crawl in (within 600 wu), as does wheeling it up to
  her. In the pram, `seatHit` (her, the hood and basket top) lifts her out,
  while the handle and wheels drag the pram from where it was grabbed.
- `petbird.js` — pet budgie at `PLACES.birdcage` beside the trampoline. Tapping
  the cage opens the door and sends it on a short flight to the ground;
  tapping again recalls it and closes the door only after it lands inside.
  The seed bowl calls the awake, free baby from anywhere: she crawls over,
  holds seeds out (`feedbird` state, reach pose), the bird lands at her hand
  and pecks, then she claps and it flutters to the ground. A finished feeding
  records `feed:petbird` through the shared outcome channel and plays parent
  praise. Tapping the free bird makes a short flight and the nearby baby
  claps. Lifting her or starting another activity cancels feeding; callbacks
  belong to their own crawl and cannot cancel a later one. All timing uses
  world updates. The bird stays near its cage, shelters at night or in bad
  weather, and has lower, slower flights with Calm/reduced motion.
- `visitors.js` — exterior cobblestone country lane, hillside trail to the
  windmill, and an interactive arched Halloween festival banner (`W.halloween`)
  outside the house. When tapped on, glowing jack-o'-lantern pumpkins, fence
  bunting, and porch cobwebs appear, and twelve storybook creatures (ghosts,
  zombies, skeletons, and vampires) move around the outside of the house.
  Touching any creature startles it and sends it running away from the house
  up the hillside trail towards the windmill side (`fleeToWindmill`),
  returning after a short pause while the banner stays on. Ambient roaming
  pauses with Calm/reduced motion.
- `sky.js` — day/night (`W.dayT`), sun/moon tap or drag, weather cloud
  (rain → snow cover and snowman → rainbow), rain weather bed, fireflies,
  tappable porch lantern (`sky.porchOn`), and the turning/tappable windmill on
  the far hills (`W.windmillAngle`, `W.sprites.windmillSails`). Tapping a
  firefly at night makes it twinkle brightly, chime and dart playfully (paused
  under `quietMotion()`). The sun and moon are screen-anchored (`anchor(f)`, sun 0.72 and
  moon 0.3 of the view, never left of x 1900 so they are never behind the
  house), glide to another spot when the apple tree's canopy would hide them
  (`placeBodies`), and ride higher on tall screens (`sunTop`). In rain or snow
  the sun slips behind a little cloud of its own, its eyes peeking over the
  top (`sky.veil`, `drawVeil`). Rain falls over
  the whole visible garden (about 170 drops per 1600 wu, none indoors), fills
  every puddle, greys the sky (`sky.gloom`, mixed in by `skyStops` in
  world.js) and shows through the bedroom window (`windowWeather`, as does
  snow). The rainbow is centred on the view (`sky.rainbowX`), emits
  `rainbow`, and fades with the daylight if the sun is sent down. A tap on
  snowy lawn starts the snowman there; tapped at the vegetable patch, he is
  built at the edge of the lawn (x 3240) and the view eases over to show him. The cloud can be dragged over the whole garden; once the view has
  rested for 2 s with the cloud off screen, behind the tree or in front of the
  sun or moon, it floats (`cloud.glideTo`, at most 900 wu/s) to the best clear
  spot in view (`followView`).
- `patch.js` — the vegetable patch. A seed stand holds six packets (carrot,
  tomato, strawberry, sunflower, tulip, pumpkin); a raised bed has four plots.
  A packet dragged onto a plot plants it; a tapped packet is chosen (it lifts,
  says its name, and empty plots glow for 6 s) and a tapped empty plot then
  gets it; a packet tapped twice tosses its seeds into the next empty plot; an
  empty plot tapped with nothing chosen plants the next crop from a shuffled
  bag. The brother, if free, comes over from anywhere to kneel and help plant.
  Each plot has `water` (0–1) and growth `g` from 1 (seed) to 5 (ripe):
  stage 2 sprout, 3 leafy, 4 buds or green fruit, 5 ripe. Plants grow only in
  daylight with water and no snow (4.5 sunny s per stage, slower in rain),
  drinking a full plot in 10 s; at sunrise each watered plant grows one stage.
  Rain waters every plot. The watering can pours while
  carried over a plot (tipping toward it) and, tapped, flies to the
  thirstiest plant and pours. Dry plants droop under a big bouncing water
  drop; tapping one points a sparkle trail at the can. Plants are drawn on canvas; produce, packets' pictures, the
  can, bed, stand and basket are painted sprites in `art.js`. Tapping a ripe
  plant tugs it; if the brother is free in the garden within 1300 wu he walks
  over, kneels and pulls it, otherwise it pops after 0.4 s and he comes over
  from wherever he is (`fetch`) to pick it up. The produce
  becomes a toy that arcs onto the path (stars, `pluck`, its name, fanfare,
  parent praise, `garden:<crop>` outcome, confetti the first time a crop is
  ever grown); the baby claps if she is within 750 wu. A brother who pulled it
  picks it up and carries it to his sister if she is free in the garden, who
  then eats it, waves it or claps; otherwise he puts it in the basket and
  steps back beside the seed stand, clear of the can and basket. The
  basket is a drop target for produce (apples too) and keeps a heap of the
  last 14; dragging from it takes the top one out again. More than six loose
  crops are tidied into the basket. Plots, the heap and the crops ever grown
  persist per child in `tinytaps-playhouse-garden` (saved on change, every
  6 s while growing, and on leaving); on return, watered plants have grown at
  half pace for the time away until their water ran out. A first visit starts
  with a nearly ripe strawberry and a carrot seedling. Once the view has
  rested on the patch for 3 s, an idle brother far away walks over to the
  seed stand (`tagAlong`, once per visit to the patch). Bees and butterflies
  (`BEE` / `BUTTERFLY` art, at most two) visit open flowers on sunny days: a
  ripe sunflower or tulip, or the strawberry's stage-4 blossoms (`bloomsOf`);
  they settle 4–8 s, move on or leave, and leave at once if the flower is
  picked or it turns to night, rain or snow. Tapped, a bee leaves with its
  recording and `Bee`, a butterfly with two shimmers and `Butterfly`.
- `moments.js` — the ten sibling photos. `snap(id)` is rationed to one per
  7 s; the polaroid flies to its fixed frame. Collected ids persist in
  `localStorage` (`tinytaps-playhouse-photos`); the last outfit persists in
  `tinytaps-playhouse-outfit`.
- `voices.js` — the children's recorded voices (`W.voice.baby(kind)`,
  `W.voice.boy('laugh')`, `W.voice.rattle()`; files in
  `assets/audio/playhouse/`, listed by `VOICE_FILES`). The baby laughs when
  tapped or lifted and after a toy's own sound, babbles when she wishes for
  something or points at it, coos when set down, woken or settled, gulps her
  bottle, yawns as she falls asleep, sneezes now and then at a flower or the
  first snow, and squeals with delight at a granted wish, peekaboo or the end
  of a pram ride; the brother laughs when lifted, hopping, waving, splashing,
  at the top of a big bounce, with his sister, and when he gets his clothes.
  Each kind has several takes (never the same twice running, pitch varied by
  ±4%), one sound at a time per child: a bigger moment cuts in over a smaller
  one, a smaller one is skipped rather than chopping the last off (the rattle
  always answers). Until a clip loads the old synthesized sound plays.

After seven seconds without a touch, an on-screen interactive thing wiggles
with a sparkle every few seconds as a hint (a smaller wiggle and no sparkle
under `calm.quietMotion()`, which also suppresses the photo camera flash in
`fx.flash()`). During bedtime wind-down Play House starts at night. Play
House never sets a reprompt.

### Baby Boo

`js/games/babyboo.js` registers the game in the normal menu. `world.js`
mounts a responsive 2x Canvas world plus real, labelled, minimum-48px DOM
buttons over its interactive objects. The shared app retains Home/mute.
The house, jungle path and pond are connected by path signs; an optional
pumpkin picture sign branches from the path to Pumpkin Patch, and a firefly
picture sign leads to Firefly Grove. A short fade
changes the scenery. The child guides Boo; Monster follows with smooth
movement and alternating feet. The four models retain their approved front
views, anchored layers, relative scale, colors and accessories.

`model.js` owns the serializable item locations, single carried item, boat
phase/cargo and memories. Tap-to-carry and forgiving drag/drop use the same
rules. Pending pickups can queue a destination; new movement replaces stale
intentions. A leaf becomes the boat, candy/flower becomes cargo, water taps
start or assist its gentle journey, Monster receives the gift, and the empty
boat returns. Empty voyages are replayable too. Boat progress pauses outside
the pond. Rapid taps cannot duplicate consumption or delivery outcomes.

The per-child `tinytaps-babyboo-v1` save captures the world on meaningful
actions, lifecycle exit and pagehide. Restoring validates data and reconciles
item ownership. First candy sharing, first boat gift and first homecoming
record outcomes and may play the parent's praise. All other sound uses shared
Web Audio effects; Baby Boo adds no synthesized narration. Muting, reduced
motion and Calm are respected; Baby Boo appears in all presets and wind-down.

`art.js` draws new scenery in the franchise palette. Approved character and
house drawings were extracted from supplied references by
`scripts/prepare-babyboo-art.py`; the original renderer and atlases were not
available. `assets/babyboo/manifest.json` records consistent canvases, pivots,
layer joints, animation durations and provenance. Source references are kept
for reproduction and are not precached. All runtime layers and the manifest
are cached. See `docs/baby-boo/ASSET_CATALOG.md` and `GAME.md`.

Cleanup cancels the animation loop, aborts loading, disconnects observation,
removes lifecycle/pointer listeners, and preserves that child's save. A load
failure has a retry control. Pointer cancellation/rotation keeps item ownership
intact. Responsive layout keeps both orientations playable.

`peekaboo.js` owns the patch's temporary hiding/reveal round and gentle wrong
choices. Boo floats behind a pumpkin, leaving his curl visible beside the stem;
the correct pumpkin or curl target reveals him. Replays rotate through three
spots. There is no timeout or failure. The current button action is refreshed
when a reusable hit target changes hiding spots, for both pointer and keyboard
activation. Round progress is intentionally not saved: leaving/reloading ends
it safely. Only `memories.peekaboo` persists with the existing version-one save;
old saves default that field to false. Carry/drop/share rules are unchanged,
the patch accepts carried/dropped props, and boats stay paused outside the pond.

`grove.js` owns transient log strikes, smoothed light levels, Monster's sway,
and a short input cooldown. Each accepted tap immediately calls one shared
`audio.bell` note (C/E/G); no background tune or delayed note is scheduled.
Tapping Monster with empty hands plays a note; carrying a prop retains the
ordinary gift behavior. All three logs remain usable with tap-to-place off,
keyboard input and mute. Fireflies respond to notes and Boo's existing glow.
Quiet mode suppresses movement while preserving soft light/color feedback.
Only the first musical interaction memory (`memories.music`) is saved, using
the existing per-child version-one schema; older saves default it false.
Grove props are ordinary owned items, and the pond boat stays paused here.
Small props/controls explicitly outrank character hit areas for both DOM
pointers and drag hit-testing, so an item dropped at Boo's feet remains
pickable after reload regardless of target creation order.

### My First Words

`js/games/animals.js` partitions all 73 cards into three exclusive decks:
Animals includes the shared storybook animal library plus the additional illustrated animal
word cards, Shark Family includes only the five new colored family illustrations, and
Objects contains the remaining everyday items. The generic shark belongs only
to Animals.

A safe-bottom-corner configuration button opens the mode row (Flashcards or
Find it, `tiny-taps:first-words-mode`) and the deck choices. The deck
selection is stored locally, immediately reshuffles that deck, and is restored
on the next visit. Object taps play bundled Piper names; full-screen horizontal
swipes move only within the selected category.

Find it plays the target's Piper clip and shows two pictures (three from level
2) from the selected deck; the speaker button and the idle reprompt replay
only that word. A right tap records a win, bursts, plays parent praise and
counts toward stickers (the sticker engine is imported lazily because the
release check imports this module under Node). A wrong tap wiggles, plays
parent encouragement, records a miss against the target word and replays the
word. Targets are weighted by `progress.details('animals')`: a word with more
misses than wins is drawn up to four times as often. Settings → progress lists
the hardest words under "Currently practicing".

### Things That Go

`js/games/vehicles.js` draws nine original vehicles (car, bus, fire truck,
tractor, train, plane, helicopter, boat, bike) as inline SVG, each with its own
effect and a way of leaving (`drive`, `fly`, `sail`). Garage mode is a street
of four garage doors: a tap rolls a door up, the vehicle's effect plays and a
copy (`.tg-mover`, wheels and rotor spinning) leaves across the screen with the
Web Animations API, then the door closes on a new surprise; every fourth reveal
celebrates. Listen mode plays one vehicle's sound and offers two or three
vehicles (by level); a wrong tap plays that vehicle's own sound before the
target sound repeats. Mode is stored in `tinytaps-vehicles-mode`.

### Paint Pots

`js/games/paintpots.js` has four paint jars (red, yellow, blue, white) whose
blobs use `makeDraggable` with the pot as the only destination, so a tap pours.
Two paints show as a swirl; stirring (finger angle travel around the pot, three
turns, or three spoon taps) blends both layers toward a hand-picked mix
(`MIXES`, so yellow and blue make green, not grey). Mix mode keeps the last
eight colors on a shelf and celebrates every third. Make it shows a picture
(carrot, frog, grapes; pig, raindrop and star at higher levels) and its swatch;
the right color paints it, the wrong one boings and empties the pot.

### Silly Faces

`js/games/faces.js` builds one SVG (viewBox −20 −40 240 280) with a base face
(kid, monster, potato, robot) and up to 16 parts from five kinds (eyes, nose,
mouth, hat, extra). Tapping a tray part places it at its usual spot, swapping a
same-kind part already there; dragging places it anywhere. Placed parts drag
in SVG space, react to taps by kind (blink, honk, chatter, hop, wiggle) and are
removed by dropping them on the tray. The face blinks on its own, giggles when
tapped, and celebrates the first time it has eyes, nose and mouth. The dice
builds a surprise face; the face button changes the base. The face persists in
`tinytaps-faces`.

## Settings and local state

`js/app.js` `showSettings()` creates the modal dynamically. Its red sticky Close
button is the first control. Settings includes learning profile, volume, voice
speed/voice selection, optional Mix, local progress, offline/install status,
parent recordings, and per-game menu visibility.

Settings opens with Children, then holds tap-to-place, the Trace It path
width, and the Calm & bedtime section (celebrations, keep mute, bedtime timer).
Learning stage, path width, the menu editor and the progress view belong to
the playing child and say so ("for <name>") when there are several.

Preferences use namespaced `localStorage` keys. `js/engine/progress.js` stores
plays, outcomes, detail difficulty, and local observations. The progress view is
informational and can reset data after confirmation. Recordings use IndexedDB
because audio blobs are unsuitable for localStorage.

## Children

`js/engine/children.js` keeps up to four children in `tinytaps-children`
(`{ active, list: [{ id, name, avatar }] }`); avatars are animal cartoons.
`childKey(base)` returns the storage key for the playing child: child one
(`c1`) uses the original key, everyone else `base::<id>`, so a device used
before profiles existed keeps its data as child one (and the old Trace It name
becomes child one's name). Per-child keys: progress, stickers and wins,
Coloring gallery/drafts/last page/category, sticker scenes and view, Music
tunes and instrument, Silly Faces, Play House photos, outfit and garden, learning
stage, hidden games and the custom menu groups, and each game's mode choice
(My First Words, Puzzle Fit, Trace It category and width, Things That Go,
Paint Pots, Number Book mode, Counting max). Shared keys: volume, voice and
rate, Mix, tap-to-place, calm and bedtime, offline status, Number Book page
delay, and the IndexedDB parent recordings.

Settings → Children lists every child with a tap-to-change avatar, a name
field, Play (switch) and remove (not child one). Switching or adding reopens
Settings, because the settings below belong to whoever is playing. Removing a
child deletes every `::<id>` key after a confirmation. Names are escaped
wherever they are shown.

## Calm and bedtime

`js/engine/calm.js` keeps three parent choices:

- Celebrations (`tinytaps-celebrations`): Full, Gentle or Calm.
  `celebrate.js` scales confetti by `confettiScale()` (1, 0.4, 0; always 0 under
  the device's reduce-motion setting) and plays `tada`, `softFanfare` or
  `gentleGift` in `big()`. `quietMotion()` is true for Calm or reduced motion.
- Keep mute (`tinytaps-keep-mute`, `tinytaps-muted`): the mute button's state
  carries into the next game.
- Bedtime timer (`tinytaps-bedtime-minutes`: off, 10–60): counted from app
  open or from choosing a time, checked against the wall clock every 10 s. The
  last five minutes (or last third of a short timer) are wind-down: calm games
  only, volume easing to about 55 %. At the end the goodnight screen (moon,
  stars, sleeping mascot, one soft lullaby) appears and `tinytaps-goodnight-at`
  keeps it up across reloads for eight hours. Holding the moon for two seconds
  unlocks it and snoozes the timer until the app is opened again.

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

Run `npm run check` after every change (it normalizes Windows path separators
and CRLF line endings, so it runs the same on every OS). It verifies relative JS imports, service
worker assets, animal media references, manifest icons, the four-game
computer-speech boundary, the exact My First Words category partition, and that
every Play House voice clip exists and is precached. Also
run JavaScript syntax checks and `git diff --check`. `npm run check` also runs
Baby Boo item ownership, replay, save recovery, layer-anchor and offline-asset
checks. Optional `node scripts/test-babyboo-browser.mjs` uses Playwright and a
local HTTPS server to exercise the complete adventure, four viewport layouts,
rotation, drag, per-child saves, shared mute, replay and a fresh offline launch.
For tracing/catalog work, verify all 23 animal IDs have non-empty, unique path
sets and that pointerdown alone cannot advance or finish a stroke.
