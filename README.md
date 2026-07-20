# Tiny-Taps

A game for my kids.

Nine toddler-friendly mini-games in one small web app — no ads, no links,
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

The animal library spans 23 friends — from cat and cow to dinosaur, shark,
giraffe and zebra. Twelve of them come with authentic recorded sounds; when a
game shows a single animal, it says hello with its real voice.

Everything is spoken aloud (device text-to-speech) — no reading needed.
The Home button responds to a normal tap.

## Parent settings

Press-and-hold the gear button (bottom-left of the menu) to open parent
settings: volume, voice speed, showing/hiding games on the menu, and —
best of all — **recording your own voice** for praise and encouragement.
Recordings are stored on-device only.

## Adding sounds for the newer animals

Bear, bee, bunny, butterfly, dinosaur, fish, giraffe, monkey, shark, turtle
and zebra don't have recordings yet. To add one: drop an `.mp3` into
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
