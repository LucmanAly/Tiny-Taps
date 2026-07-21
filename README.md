# Tiny-Taps

A game for my kids.

Eighteen toddler-friendly mini-games in one small web app — no ads, no links,
nothing to buy, works offline once loaded:

1. **Peekaboo** — tap tiles to reveal animals and hear their real sounds; every tap is a win
2. **Animal Sounds** — hear an authentic recording, tap the animal that makes it
3. **Colors** — tap the balloon that matches the color
4. **Shapes** — tap the shape that fits the dashed outline
5. **Counting** — tap each animal to count it aloud; badges and a big numeral track the count (1–5 or 1–10 — press-and-hold the corner button)
6. **Puzzle Fit** — drag each animal onto its outlined spot
7. **Feed Me** — drag the right food to the hungry animal; one happy bite and the next friend arrives
8. **Coloring** — big hand-sketched coloring pages; finished pictures are saved to an in-app gallery
9. **Matching** — flip four cards, find the two matching friends
10. **Music** — a rainbow xylophone; pure free play
11. **Bubbles** — pure free play; pop the bubbles
12. **Stickers** — big wins award animal stickers into a collection book
13. **Shadow Match** — tap the animal that matches the silhouette
14. **Big or Small** — tap the big (or little) version of the animal
15. **Patterns** — a color sequence marches by; tap what comes next
16. **Sort It** — drag each animal to its home, the farm or the water
17. **Wash the Animal** — rub the mud off with a finger until it shines
18. **Trace It** — drag a finger along a glowing path to paint it in

The animal library spans 23 friends — from cat and cow to dinosaur, shark,
giraffe and zebra. Seventeen of them come with authentic recorded sounds; when a
game shows a single animal, it says hello with its real voice.

Everything is spoken aloud (device text-to-speech) — no reading needed.
The Home button responds to a normal tap.

## Parent settings

Tap the gear button (bottom-left of the menu) to open parent settings:
volume, voice speed, showing/hiding games on the menu, the app version, and —
best of all — **recording your own voice** for praise and encouragement.
Recordings are stored on-device only.

Tiny Taps 3.0 adds three developmentally focused menu presets:

- **Little Explorer (18–30 months)** — six simple, success-first games
- **Early Learner (2½–3½ years)** — colors, shapes, sounds and first puzzles
- **Growing Thinker (3½–4½ years)** — patterns, sorting, tracing and memory

Parents can still make a custom menu. Colors, Shapes, Animal Sounds,
Counting, Matching and Patterns automatically adjust among three difficulty
levels based on recent play. A private parent view shows favorite games,
completed activities and concepts currently being practiced. This history
never leaves the device and can be reset at any time.

Optional controls include a short hold for the Home button to prevent
accidental exits and **Play Mix**, which changes among age-appropriate games
every 90 seconds.

## Adding sounds for the newer animals

Butterfly, dinosaur, fish, giraffe, shark and turtle intentionally remain
voice-only. Tiny Taps does not use a fabricated dinosaur roar or substitute an
unrelated ambient recording for animals without a clear, toddler-recognizable
call. To add a verified recording later, drop an `.mp3` into
`assets/audio/` (short, trimmed, toddler-friendly; check the license and add
it to `assets/CREDITS.md`), then set the animal's `sound:` path in
`js/data/animals.js` and add the file to `sw.js`'s asset list. Every game —
including Animal Sounds — picks it up automatically.

## Running it

It's a static site — open `index.html` via any web server, or use the
GitHub Pages URL. On a tablet: open the URL, then "Add to Home Screen" to
install it fullscreen; it works offline afterward.

## Credits

Animal sounds are authentic recordings from Wikimedia Commons under
CC0/public-domain/CC BY-SA licenses — see [assets/CREDITS.md](assets/CREDITS.md)
for every file's source, author, and license. Artwork is original SVG made for
this app. UI sounds are synthesized in-app with WebAudio.

## Changelog

The current version is shown in Parent Settings.

- **v3.0** — developmental journey release: three age/stage menu presets, a
  calmer six-game home screen with More Games, adaptive three-level difficulty,
  private on-device parent observations, optional protected Home button,
  optional continuous Play Mix, interactive sound-playing stickers, recent
  variety safeguards, clear iPhone/iPad installation and offline-ready status,
  resilient per-asset offline caching, automated asset checks, and five new
  licensed authentic recordings (bear, bee, bunny, monkey and zebra).

- **v2.2** — reliability, voice, and visual polish pass: a per-game mute
  toggle alongside the global volume setting; a Settings voice picker so a
  parent can choose the best-sounding installed TTS voice, plus a broader
  auto-selection heuristic; narration trimmed to essentials app-wide
  (Counting now speaks only the numbers, no surrounding commentary);
  parent-voice praise now always plays on the first win after recording
  instead of being silently caught by the quick-game throttle, with a
  hardened record→decode pipeline and an audible self-test right in
  Settings; a real Trace It bug fix — the straight line under-registered
  fast swipes because its forward-search window was too small, now widened
  (while still requiring the trace to actually start near the beginning);
  Sort It shows 2 of its 3 environments per round instead of all 3 at once;
  and a redesigned splash logo, bolder menu font/contrast, and richer menu
  card styling.
- **v2.1** — pacing and reliability pass from real play-testing: snappier
  round transitions, in-sync Counting voice, scroll-safe menu taps, trimmed
  animal sound clips, more reliable Animal Sounds/parent-voice playback, a
  friendlier Feed Me chomp sound, a spoken Big/Small prompt, a consistent
  sticker rule with next-animal previews, Trace It difficulty progression,
  faster Bubbles, a tighter Big/Small layout, a third Sort It bin (Jungle)
  with the full animal roster, a redesigned Matching opening peek, and
  drag-to-target leniency in Feed Me.
- **v2.0** — six new games: Shadow Match, Big or Small, Patterns, Sort It,
  Wash the Animal, Trace It. Fixed recorded praise/encouragement not playing
  on task completion in several games. Added a shared quiz-game engine
  (`js/engine/roundgame.js`) for the tap-the-right-answer games.
- **v1** — initial 12-game release: Peekaboo, Animal Sounds, Colors, Shapes,
  Counting, Puzzle Fit, Feed Me, Coloring, Matching, Music, Bubbles, Stickers.
  Parent settings, recorded voice, coloring gallery, offline support.
