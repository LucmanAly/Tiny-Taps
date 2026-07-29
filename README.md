# Tiny-Taps

A game for my kids.

Twenty-one toddler-friendly mini-games in one small web app — no ads, no links,
nothing to buy, works offline once loaded:

1. **Peekaboo** — tap tiles to reveal animals and hear their real sounds; every tap is a win
2. **Animal Sounds** — hear an authentic recording, tap the animal that makes it
3. **Colors** — tap the balloon that matches the color
4. **Shapes** — tap the shape that fits the dashed outline
5. **Counting** — tap each animal to count it aloud; badges and a big numeral track the count (1–5 or 1–10 — press-and-hold the corner button)
6. **Number Book** — tap one giant number to hear it and turn the page; switch between every number from 0–100 and tens/place values through one trillion, with an instant reset
7. **Puzzle Fit** — choose Animals or Shapes; fit animal silhouettes or fill the exact missing piece in a picture
8. **Feed Me** — drag the right food to the hungry animal; one happy bite and the next friend arrives
9. **Coloring** — choose all pages or character portraits, fill complete grouped regions, and save finished pictures to an in-app gallery
10. **Matching** — flip four cards, find the two matching friends
11. **Music** — a rainbow xylophone; pure free play
12. **Bubbles** — pure free play; pop the bubbles
13. **Stickers** — big wins award animal stickers into a collection book
14. **Shadow Match** — tap the animal that matches the silhouette
15. **Big or Small** — tap the big (or little) version of the animal
16. **Patterns** — a color sequence marches by; tap what comes next
17. **Sort It** — drag each animal to its home, the farm or the water
18. **Wash the Animal** — rub the mud off with a finger until it shines
19. **Trace It** — choose Alphabet, Shapes, Numbers, or Animals and follow each dotted stroke
20. **Play House** — an open-ended landscape world: change the weather (sun, rain, wind, snow) and the time of day, send the mascot to bed, bounce him on the trampoline, open the wardrobe to pick his outfit, tap him for a burst of wand magic, and visit his baby sister in her playpen — where tapping brings up one of ten illustrated "Play Together" moments of the two of them playing
21. **My First Words** — a full-photo flashcard deck with Animals, Shark Family, and Objects filters; tap the pictured object to hear its name in one consistent bundled voice, or swipe anywhere on the game screen to move through the selected deck

The animal library spans 23 friends — from cat and cow to dinosaur, shark,
giraffe and zebra. Seventeen of them come with authentic recorded sounds; when a
game shows a single animal, it says hello with its real voice.

Gameplay is intentionally quiet. Counting and Number Book speak only a tapped
number, Big or Small speaks only the target size at round start, and Trace It
speaks only the completed letter, shape, number, or animal name.
Recorded parent praise and encouragement remain active. The Home button
responds immediately to one normal tap.

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

The optional **Play Mix** control changes among age-appropriate games every
90 seconds.

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

- **v5.7** — Number Book correction: renamed the second mode to **10s & Big
  Numbers**, added five responsive size tiers so every comma-separated value
  through one trillion fits its page, synchronized page turns with the spoken
  value, and forced English pronunciation when device voices are still loading
  or the device uses another system language.

- **v5.6** — Number Book adds a polished page-turn counting game with one
  giant tappable number, natural spoken number names, a complete 0–100 deck,
  a second tens-and-place-values deck through one trillion, and a visible
  reset control. Both modes work fully offline after the app is cached.

- **v4.7** — a safe-corner category button in My First Words switches between
  Animals, Shark Family, and Objects and remembers the selected deck. The
  generic shark stays in Animals; Shark Family contains only the five colored
  family characters.

- **v4.6** — one consistent bundled Piper voice for every My First Words card,
  including everyday words and the shark family. Removed the device-dependent
  Safari speech fallback and explicitly unlocks recorded playback on the card
  tap so animal-photo names and word-photo names follow the same audio path.

- **v3.7** — "Play Together" sibling moments: tapping the playpen now opens
  one of ten illustrated moments of brother and sister playing together —
  sharing a teddy bear, crawling face to face, a hug, a rattle, peekaboo
  through a cardboard house, clapping, a rubber duck, bubbles, a ride-on car,
  and being lifted up for a cuddle — modelling gentle ways to play with a
  baby sibling. Shown in shuffled order so all ten are seen before any
  repeat, each with a one-word spoken cue and a matching sound, then fades
  back to the sandbox on its own. Sliced from a 3x3 grid plus one standalone
  image; despeckled per-cell so a stray fragment from a neighbouring scene
  never survives into the wrong one. Four new earcons (`gentleGift`,
  `rattleShake`, `clapClap`, `quack`). Also fixed: `speech.speak()` is a
  permanent no-op elsewhere in the app (how other games' descriptive
  narration was silenced); Play House's weather cues and outfit names were
  silently going through it too and were never actually spoken — they, and
  the new moment cues, now go through the real `speakWord()` channel.

- **v3.6** — a second character in Play House: a baby sister in a playpen on
  the grass between the house and the trampoline. She sits, crawls a little
  every few seconds, sleeps at night with her own drifting Zzz, and laughs
  when tapped, which also brings her brother over to wave. Her four poses were
  sliced from a single sprite sheet at import — found by detecting
  disconnected islands of opaque pixels rather than assuming a grid — and
  scaled by one common factor so a crawling baby stays lower and longer than a
  sitting one. Snow settles on the playpen rail. New `babble()` earcon.

- **v3.5** — Play House mascot magic: tapping the mascot now uses the existing
  wand pose and creates a colorful, no-wrong-answer sparkle burst; other outfits
  stay on the child instead of switching back to the winter costume.

- **v3.4** — Play House weather and wardrobe: the wardrobe now opens a picker
  showing the three outfits as garment cards, so the child chooses rather than
  cycling through them. Added snow as a fourth weather — it falls slowly and
  settles, covering the grass, both roof slopes, the chimney and the
  trampoline, then thaws when the weather changes. Rebuilt the house with
  overhanging eaves, shingle rows, a ridge cap, a chimney that smokes after
  dark, a window showing the live sky, floorboards, skirting and a stone
  foundation. Rain and wind now have quiet looping ambience, synthesized from
  filtered noise so it costs no download and works offline. Tapping furniture
  now takes priority over tapping the mascot, so the wardrobe he is standing in
  front of still opens.

- **v3.3** — Play House: a nineteenth game that is a small sandbox
  rather than a round-based quiz. Tapping the sky cycles sunny/rainy/windy,
  tapping the sun toggles day and night, and the mascot walks to the bed, the
  trampoline or the wardrobe on request. The whole world is drawn on canvas;
  only the mascot is artwork. He now has three outfits — winter coat, rain
  coat and t-shirt — each with its own stand, walk, jump and sleep pose, cycled
  by tapping the wardrobe and loaded one outfit at a time with the next one
  prefetched. The game is landscape-only, with a rotate prompt in portrait,
  and Parent Settings now reports the app's total on-device size.

- **v3.2** — tracing and spatial-fit correction: made Trace It progress
  sequential, movement-based, and tolerant of sparse pointer events; added a
  distinct recognizable trace outline for every animal; replaced Puzzle Fit's
  Shapes sequence with negative-space picture fitting; restricted Counting and
  Trace completion speech to the item name; added the one-word Big/Small
  round-start cue; and documented the current architecture and voice boundary.

- **v3.1** — quiet-play and tracing release: removed general computer
  narration while preserving recorded parent praise/encouragement; Counting
  now speaks numbers only; rebuilt Trace It with Alphabet A–Z, Shapes,
  Numbers 1–10, and the full Animals library plus one-word completion speech;
  Puzzle Fit now switches between animal silhouettes and an age-appropriate
  missing-block spatial pattern; restored immediate single-tap Home; moved a
  prominent red Close control to the top of Settings; and hardened dynamic
  viewport/safe-area positioning for Safari and standalone iPhone/iPad PWAs.

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
