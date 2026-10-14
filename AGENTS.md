# Tiny Taps contributor guide

Tiny Taps is an offline-first toddler learning PWA built with vanilla JavaScript,
DOM/SVG/Canvas APIs, CSS, Web Audio, and browser speech synthesis. There is no
framework or build step. Keep interactions forgiving, touch-first, private, and
usable without reading.

## Folder map

- `index.html` — app shell and PWA metadata links.
- `js/app.js` — boot, menus, game shell, settings, navigation, and shared context.
- `js/games/` — one module per mini-game plus the registry in `js/games/index.js`.
- `js/games/playhouse/` — Play House's world modules (camera/input, scenery art,
  sky and weather, house, garden, vegetable patch, toys, characters, photo
  wall); the entry and its single voice trigger stay in `js/games/playhouse.js`.
- `js/engine/` — audio, speech, dragging (with tap-to-place), rounds, progress,
  celebrations, stickers, calm & bedtime (`calm.js`), child profiles
  (`children.js`), and UI helpers.
- `js/data/` — animal catalog, strings, trace catalogs (including the My Name
  helpers), Puzzle Fit Shape Builder blueprints (`builds.js`, whose `buildSvg`
  also draws the Sticker Book's toy stickers), and displayed version.
- `css/main.css` — global screens, chrome, settings, safe areas, and shared controls.
- `css/games.css` — mini-game layouts and interaction visuals.
- `assets/` — original SVG art, licensed animal audio, and credits.
  `assets/playhouse/` holds sprites sliced from the uploaded Play House sheets
  by `scripts/slice-playhouse-art.py`.
- `scripts/check.mjs` — import, offline-asset, manifest, and voice-boundary checks.
- `sw.js` — offline precache and network-first code/cache-first media strategy.
- `docs/ARCHITECTURE.md` — deeper system and game behavior reference.

## Shipped mini-games

The current registry contains 24 games:

1. Peekaboo — reveal covered animals and hear authentic sounds; `js/games/peekaboo.js` `start`.
2. Animal Sounds — match a recording to its animal; `js/games/sounds.js` `start`.
3. Colors — match a displayed color to a balloon; `js/games/colors.js` `start`.
4. Shapes — match a dotted outline to a filled shape; `js/games/shapes.js` `start`.
5. Counting — tap animals in order and hear number words; `js/games/counting.js` `start`.
6. Number Book — page through spoken numbers from 0–100 or tens/place values through one trillion; `js/games/numberbook.js` `start`.
7. Puzzle Fit — fit animal silhouettes, or Shapes mode's Shape Builder: drag (or tap, then tap an outline) 3–6 chunky shape pieces into a toy's dashed outlines, then the finished toy comes alive (drives, sails, launches, opens its door for an animal); `js/games/puzzle.js` `start`, blueprints in `js/data/builds.js`.
8. Feed Me — drag (or just tap) the correct food to an animal; `js/games/feedme.js` `start`.
9. Coloring — pick sketches from a collapsible thumbnail sidebar (All or Characters; an overlay that starts closed on every screen), fill grouped regions including the parrot, Undo fills one at a time, unfinished pictures persist (and reopen) between visits, save with the separate Done button, and grown-ups hold ⤓ in the gallery to export a PNG; `js/games/coloring.js` `start`.
10. Matching — find the matching animal-card pair; `js/games/memory.js` `start`.
11. Music — free-play rainbow xylophone that remembers the tune just tapped (replay button lights the bars), keeps up to six tunes as chips, and can swap notes for a pitched animal recording; `js/games/music.js` `start`.
12. Bubbles — free-play Canvas bubble popping; `js/games/bubbles.js` `start`.
13. Sticker Book — a book of three sticker sets (Animals, Shape Builder Toys, Feed Me Treats) plus Farm, Jungle and Ocean scenes to decorate with earned stickers (tap or drag in, drag around, drag back to the tray to remove); `js/games/stickers.js` `start`, sets in `js/engine/stickers.js`.
14. Shadow Match — identify an animal silhouette; `js/games/shadow.js` `makeRoundGame` config.
15. Big or Small — choose the requested size; `js/games/bigsmall.js` `makeRoundGame` config.
16. Patterns — select the next color in a sequence; `js/games/pattern.js` `makeRoundGame` config.
17. Sort It — drag (or tap, then tap a home) animals to their habitat; `js/games/sort.js` `start`.
18. Wash the Animal — rub a Canvas mud layer away; `js/games/wash.js` `start`.
19. Trace It — trace letters, shapes, numbers, animal-specific paths, and the playing child's own name (from Settings → Children); a glowing dot demonstrates each stroke first and again after a quiet spell; parents choose the path width; `js/games/trace.js` `start`.
20. Play House — a pannable dollhouse and garden: carry toys and both children, the baby's picture-bubble wishes, a brother's lullaby that puts her to sleep on demand, the baby's cot with a music-box mobile (she goes to it at bedtime), a pull-cord lamp, a weather cloud (rain over the whole garden, snow, rainbow) that follows the view, a sun and moon that stay on screen for day-night anywhere outside, bushes with animals that come out to be fed produce, an eight-apple tree that regrows while away, colourful perching birds, trampoline, pram, a persistent ten-photo sibling wall, and a per-child vegetable patch (plant seed packets, water with rain or the watering can, plants grow in daylight and shoot up at sunrise, bees and butterflies visit the flowers, the brother comes from anywhere to help and carries the harvest to his sister, a harvest basket); `js/games/playhouse.js` `start`, world in `js/games/playhouse/`, patch in `patch.js`.
21. My First Words — a full-photo flashcard deck with persistent Animals, Shark Family, and Objects filters; tap the pictured object to hear its name or swipe anywhere on the game screen to change cards, no scoring. An optional Find it mode (same corner panel) plays one bundled word and shows two or three photos to choose from, bringing missed words back more often; `js/games/animals.js` `start`.
22. Things That Go — Garage: tap a door and a vehicle drives, flies or sails away with its own sound effect; Listen: hear a vehicle sound and tap the vehicle that makes it; `js/games/vehicles.js` `start`.
23. Paint Pots — drop two paints (drag or tap) into the pot, stir with a finger or the spoon, and watch them mix; Mix keeps a shelf of colors made, Make it asks for the color of a picture; `js/games/paintpots.js` `start`.
24. Silly Faces — dress up a face (kid, monster, potato, robot) with eyes, noses, mouths, hats and extras; tap to pop a part in place or drag it anywhere, tap parts to make them react, dice for a surprise face; `js/games/faces.js` `start`.

## Core conventions

- Every game exports `{ id, title, icon, start(ctx) }`; `start` returns cleanup.
- Use pointer events and large targets. Prevent duplicate completion and stale timers.
- Record outcomes through `ctx.recordOutcome`; do not add scores or cloud tracking.
- Anything that belongs to one child (progress, stickers, pictures, tunes, faces,
  photos, the Play House garden, learning stage, menu layout, game mode choices) is read and written
  through `childKey(KEY)` from `js/engine/children.js`. Parent and device
  settings (volume, voice, recordings, tap-to-place, calm, bedtime) stay on
  plain keys. Child one keeps the original un-suffixed keys.
- Drag games use `js/engine/drag.js` `makeDraggable`, which also gives tap-to-place
  (tap an item, then a destination; a single destination receives a tap directly)
  unless a parent turns it off. Custom drag code (Shape Builder) mirrors it via
  `tapPlaceEnabled()`.
- Celebrations and motion follow `js/engine/calm.js`: confetti scales with the
  Celebrations setting and the device's reduce-motion preference; Play House
  skips its camera flash and hint sparkles under `quietMotion()`.
- Computer voice and saved parent voice are separate systems.
- `speech.speak` is intentionally silent legacy compatibility; do not re-enable it.
- Computer voice uses `speech.speakWord` only in four gameplay modules:
  Counting tapped numbers, Big/Small round-start target, Trace It completed
  item name, and Play House interaction cues (one name each, routed through
  `W.say` in `js/games/playhouse.js`; `js/games/playhouse/*` must not call
  `speakWord` directly). Number Book and My First Words (including Find it)
  use bundled Piper recordings and must not fall back to browser speech.
- Those triggers contain one number/name value only. Do not add instructions or computer praise.
  Trace It's My Name set says each letter, then the whole name on its last letter.
- Things That Go, Paint Pots and Silly Faces use Web Audio effects only.
- Parent praise/encouragement uses `speech.praise` and `speech.encourage`; preserve it.
- Authentic animal recordings and Web Audio effects are not computer narration.
- Trace progress must be sequential movement along the active path; a tap cannot complete it.
- Puzzle Fit Shapes mode is negative-space piece fitting (several pieces build one
  toy), never sequence continuation, and never a single-choice quiz (the separate
  Shapes game already covers outline matching).
- Bump `js/data/version.js` and the cache name in `sw.js` together for releases.
- Add runtime files needed offline to `sw.js` and run `npm run check`.

## Display-mode constraints

Support both mobile Safari tabs and Added-to-Home-Screen standalone/fullscreen mode.
Use `100dvh` with a `100%` fallback, preserve `env(safe-area-inset-*)`, and keep
Home, mute, Settings, Mix, and Info controls out of notches and home indicators.
Avoid transformed ancestors around fixed controls because they change containing blocks.

## Read this when relevant

| Topic | Read | Main code entry points |
|---|---|---|
| Voice or parent recordings | `docs/ARCHITECTURE.md` Voice and audio | `js/engine/speech.js` `speakWord`, `praise`, `encourage`; `js/engine/recordings.js` |
| Navigation or game lifecycle | `docs/ARCHITECTURE.md` Navigation | `js/app.js` `clearScreen`, `showMenu`, `startGame`, `makeHomeButton` |
| Shared round behavior | `docs/ARCHITECTURE.md` Game architecture | `js/engine/roundgame.js` `makeRoundGame` |
| Trace detection or catalogs | `docs/ARCHITECTURE.md` Trace It | `js/games/trace.js` `advanceSample`, `advanceTo`; `js/data/trace-items.js` |
| Puzzle Fit modes | `docs/ARCHITECTURE.md` Puzzle Fit | `js/games/puzzle.js` `buildAnimals`, `buildShapes`, `layout`; `js/data/builds.js` |
| Play House world | `docs/ARCHITECTURE.md` Play House | `js/games/playhouse/world.js` `createWorld`; `kids.js`, `sky.js`, `home.js`, `garden.js`, `patch.js` `createPatch` |
| Settings or local data | `docs/ARCHITECTURE.md` Settings | `js/app.js` `showSettings`, `showProgress`; `js/engine/progress.js` |
| Children (profiles) | `docs/ARCHITECTURE.md` Children | `js/engine/children.js` `childKey`, `children`, `setActive`; `js/app.js` `showWhoIsPlaying`, `setupChildren` |
| Calm mode, bedtime timer, keep mute | `docs/ARCHITECTURE.md` Calm and bedtime | `js/engine/calm.js`; `js/app.js` `showGoodnight`, `mixPool` |
| Tap-to-place dragging | `docs/ARCHITECTURE.md` Game architecture | `js/engine/drag.js` `makeDraggable`, `tapPlaceEnabled` |
| Stickers and scenes | `docs/ARCHITECTURE.md` Sticker Book | `js/engine/stickers.js` `STICKER_SETS`, `recordWin`; `js/games/stickers.js` |
| Safari, PWA, or safe areas | `docs/ARCHITECTURE.md` PWA and display modes | `css/main.css`; `sw.js` `install`, `activate`, `fetch` |

At the end of any session that changes folder structure, adds/removes a mini-game, or changes a core system (voice, navigation, settings), update this file and docs/ARCHITECTURE.md accordingly before ending the session.
