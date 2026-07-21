# Tiny Taps contributor guide

Tiny Taps is an offline-first toddler learning PWA built with vanilla JavaScript,
DOM/SVG/Canvas APIs, CSS, Web Audio, and browser speech synthesis. There is no
framework or build step. Keep interactions forgiving, touch-first, private, and
usable without reading.

## Folder map

- `index.html` — app shell and PWA metadata links.
- `js/app.js` — boot, menus, game shell, settings, navigation, and shared context.
- `js/games/` — one module per mini-game plus the registry in `js/games/index.js`.
- `js/engine/` — audio, speech, dragging, rounds, progress, celebrations, and UI helpers.
- `js/data/` — animal catalog, strings, trace catalogs, and displayed version.
- `css/main.css` — global screens, chrome, settings, safe areas, and shared controls.
- `css/games.css` — mini-game layouts and interaction visuals.
- `assets/` — original SVG art, licensed animal audio, and credits.
- `scripts/check.mjs` — import, offline-asset, manifest, and voice-boundary checks.
- `sw.js` — offline precache and network-first code/cache-first media strategy.
- `docs/ARCHITECTURE.md` — deeper system and game behavior reference.

## Shipped mini-games

The current registry contains 18 games:

1. Peekaboo — reveal covered animals and hear authentic sounds; `js/games/peekaboo.js` `start`.
2. Animal Sounds — match a recording to its animal; `js/games/sounds.js` `start`.
3. Colors — match a displayed color to a balloon; `js/games/colors.js` `start`.
4. Shapes — match a dotted outline to a filled shape; `js/games/shapes.js` `start`.
5. Counting — tap animals in order and hear number words; `js/games/counting.js` `start`.
6. Puzzle Fit — fit animal silhouettes or missing picture pieces; `js/games/puzzle.js` `start`.
7. Feed Me — drag the correct food to an animal; `js/games/feedme.js` `start`.
8. Coloring — fill large picture regions and save finished pages; `js/games/coloring.js` `start`.
9. Matching — find the matching animal-card pair; `js/games/memory.js` `start`.
10. Music — free-play rainbow xylophone; `js/games/music.js` `start`.
11. Bubbles — free-play Canvas bubble popping; `js/games/bubbles.js` `start`.
12. Sticker Book — browse locally earned animal stickers; `js/games/stickers.js` `start`.
13. Shadow Match — identify an animal silhouette; `js/games/shadow.js` `makeRoundGame` config.
14. Big or Small — choose the requested size; `js/games/bigsmall.js` `makeRoundGame` config.
15. Patterns — select the next color in a sequence; `js/games/pattern.js` `makeRoundGame` config.
16. Sort It — drag animals to their habitat; `js/games/sort.js` `start`.
17. Wash the Animal — rub a Canvas mud layer away; `js/games/wash.js` `start`.
18. Trace It — trace letters, shapes, numbers, and animal-specific paths; `js/games/trace.js` `start`.

## Core conventions

- Every game exports `{ id, title, icon, start(ctx) }`; `start` returns cleanup.
- Use pointer events and large targets. Prevent duplicate completion and stale timers.
- Record outcomes through `ctx.recordOutcome`; do not add scores or cloud tracking.
- Computer voice and saved parent voice are separate systems.
- `speech.speak` is intentionally silent legacy compatibility; do not re-enable it.
- Computer voice uses `speech.speakWord` for exactly three gameplay triggers:
  Counting tapped number, Big/Small round-start target, Trace It completed item name.
- Those triggers contain one word/name only. Do not add instructions or computer praise.
- Parent praise/encouragement uses `speech.praise` and `speech.encourage`; preserve it.
- Authentic animal recordings and Web Audio effects are not computer narration.
- Trace progress must be sequential movement along the active path; a tap cannot complete it.
- Puzzle Fit Shapes mode is negative-space piece fitting, never sequence continuation.
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
| Puzzle Fit modes | `docs/ARCHITECTURE.md` Puzzle Fit | `js/games/puzzle.js` `buildAnimals`, `buildShapes` |
| Settings or local data | `docs/ARCHITECTURE.md` Settings | `js/app.js` `showSettings`, `showProgress`; `js/engine/progress.js` |
| Safari, PWA, or safe areas | `docs/ARCHITECTURE.md` PWA and display modes | `css/main.css`; `sw.js` `install`, `activate`, `fetch` |

At the end of any session that changes folder structure, adds/removes a mini-game, or changes a core system (voice, navigation, settings), update this file and docs/ARCHITECTURE.md accordingly before ending the session.
