# Baby Boo — next-session handoff

Updated 2026-10-25 for Luqman Ali. Repository: **LucmanAly/Tiny-Taps**.

## Start here

Phase one was merged in [PR #33](https://github.com/LucmanAly/Tiny-Taps/pull/33).
This continuation starts from main `b7cc978b2619d535389ac0a1d39cd7d60f20fc83`.
Production was inspected at **v5.29**, with house, path and pond working.
Peekaboo is in [PR #34](https://github.com/LucmanAly/Tiny-Taps/pull/34), still
open when this slice started. This branch, `baby-boo-firefly-grove`, adds
**v5.31**, the second small phase-two slice, on top of peekaboo commit
`97d0fad67d7983db92dfedfabf243a33808c5470`. [PR #35](https://github.com/LucmanAly/Tiny-Taps/pull/35)
targets main to produce a combined Netlify preview; it includes peekaboo until
#34 is merged. Review #34 first. The grove-only comparison is the difference
between `baby-boo-pumpkin-peekaboo` and `baby-boo-firefly-grove`. Check actual
PR bases, merge/deploy state and current main before resuming; do not assume
either slice is in production.

- Production: https://mytinytaps.netlify.app/ — choose **Baby Boo**.
- Latest branch runtime: **5.31**, including matching HTML query keys and SW cache.
- No authorization to merge this or other future PRs follows from PR #33's merge.

Read `AGENTS.md`, this handoff, `docs/baby-boo/PROJECT_BIBLE.md`,
`docs/baby-boo/GAME.md`, `docs/baby-boo/ASSET_CATALOG.md` and the Baby Boo
section of `docs/ARCHITECTURE.md`. Inspect the reference art and manifest
before substantial art/motion work. Honor newer owner feedback and repository
changes over this snapshot. Preserve unrelated work.

## What exists and works

The first menu card is Baby Boo, available in all age presets and wind-down.
The house, jungle path and moonlit pond retain the complete phase-one loop:
carry the path's big leaf to the pond, place it on the water outline, load a
candy or flower, tap the water to send it to Monster, then return to Mommy
and Daddy. Empty boats work too and return for replay. Homecoming uses warm
waves/hearts, not a choreographed four-character physical hug. **Again?**
restarts the leaf adventure while preserving memories. Boo moves on ground
taps and glows on a tap; Monster follows. Props support tap, drag and put-down.

**New optional branch:** the pumpkin picture sign on the jungle path leads
to Pumpkin Patch. It does not replace the Pond sign. Tap the Boo/pumpkin
picture, or a big pumpkin, to start peekaboo. Boo floats behind one of three
smiling pumpkins, leaving his curl visible beside the stem. Tap the right
pumpkin or curl to reveal him. Other pumpkins rustle with fireflies. There is
no failure or time limit. Replays use different hiding spots; a delayed outline
helps if needed. Monster celebrates and later thinks of candy. Bring and
share an existing candy freely; peekaboo does not generate/consume candy or
make kindness contingent on winning. Carry/drop/reload existing props here.

Leave at any time through the Path sign. Friend/prop actions can interrupt
peekaboo. Leaving or reloading ends the temporary hiding round safely. All
phase-one item ownership, boat state and memories are preserved.

**Firefly Grove:** the firefly picture sign branches from the jungle path.
Three chunky logs play soft C/E/G notes in any order. Nearby fireflies brighten
gradually; Monster sways along. With empty hands, tap Monster to play a note
as his turn. With a carried candy/flower, he receives the ordinary gift instead.
Boo can glow and carry/drop/reload props here. Light/color responses work with
sound muted. No tune to copy, score, failure, timer, prize or autonomous song.
Rapid taps coalesce sound starts, while keeping visual feedback. Calm/reduced
motion retains light feedback and suppresses incidental movement. The Path
sign leaves freely; there is no queued playback after leaving.

## Owner feedback and creative rules

The latest explicit approval is “Do it” for the proposed Firefly Grove and
three musical logs, Monster joining in and Boo carrying/glowing/exploring.
Continue phase two in **small playable steps**,
preserving the cast, candy-loving Monster and working phase-one game. The
prior feedback calls for a cozy explorable place with room between activities,
a broader world than one short story, and smooth, flowy animation. No newer
specific Baby Boo device/child playtest feedback was found in the previous
conversation context or PR #33's discussion. Ask for/inspect concrete feedback
when it arrives; do not invent a child usability result.

- Target roughly age three. Optional stories and repeatable exploration, with
  reassuring reactions and readable movement.
- Monster is a friend who loves candies and always hopes for them. Boo gives
  him candies. Preserve their warm friendship and mutual play.
- Keep all four approved stock models, facial layout, silhouette, accessories,
  colors and relative size. Preserve the lavender house and gentle purple/
  green night jungle. Boo's warm glow is established; no new powers were added.
- No image generation or Sora. Use approved assets and code-drawn scenery.
- Combined bible is v1.4. The new slice is recorded as game implementation for
  review, not a completed video episode. Episode 1 remains unknown. Further
  locations/activities remain proposals.

## Asset reality — preserve the cast

Original Python drawing functions/atlases were not supplied. The approved
cast and exact house were extracted from supplied references into anchored
transparent layers. Do not replace them with a newly drawn cast.

`assets/babyboo/source/` retains unchanged cast/home references;
`manifest.json` records fixed canvases, pivots, joints, provenance and timing.
`scripts/prepare-babyboo-art.py` reproduces them. The labelled
Sprite_State_Preview is a reference, not an atlas to guess/slice. No profile/
back view is approved. Phase two changes no character bitmap or manifest.
Pumpkins occlude the same Boo model; both tiny Boo UI pictures reuse his
existing front image. New scenery/signs use Canvas at up to 2x resolution.

## Code and integration

- `js/games/babyboo.js`: normal Tiny Taps registry entry/icon.
- `babyboo/model.js`: saved item/boat rules, scene validation, compatible
  version-one saves and per-child memories including optional `peekaboo`.
- `babyboo/peekaboo.js`: temporary idle/hiding/hidden/revealing/found round,
  alternating spots, gentle misses and one completion boundary per reveal.
- `babyboo/grove.js`: transient log strikes, smoothed lights/sway and input
  coalescing; C/E/G reuse the shared bell. No timers/automatic note queue.
- `babyboo/world.js`: lifecycle, tap/drag, movement, transitions, cues and real
  minimum-48px overlay buttons. Reused hit targets update their current action
  for both pointer and keyboard input when hiding spots change.
- `babyboo/art.js`: anchored stock art, scenery, pumpkins, glow and bubbles.
- `css/games.css`: styles under `.bb-*`.

Extend the vanilla JS PWA; no framework/build step or separate app. Every game
returns cleanup. Preserve Home/mute, parent praise and Calm/reduced motion.
Do not add computer narration or re-enable silent legacy speech.

World state is local/per child under `childKey('tinytaps-babyboo-v1')`, captured
at startup for cleanup. Existing saves remain compatible; new memory defaults
false. `memories.music` remembers the first musical interaction, while notes,
light envelopes and peekaboo rounds are transient. Boat progress pauses outside
the pond, including both new regions. Model rules own props for tap and drag.
Candy baskets exist only at home and pond. Keep the separate put-down control
away from Boo's face. Small props/controls outrank character targets in both
DOM and drag hit tests; an item left at Boo's feet remains pickable after reload.

For runtime changes update `js/data/version.js`, `index.html` query keys and
`sw.js` cache together; cache every runtime module/asset. `peekaboo.js` and
`grove.js` are precached. Update AGENTS/architecture when folders or core behavior change.

## Validation and limits

`npm run check`, JavaScript syntax and `git diff --check` cover repository
integrity, item/save invariants, peekaboo replay/no-timeout boundaries, original
asset anchors and offline coverage.

`scripts/test-babyboo-browser.mjs` uses Chromium on temporary local HTTPS under
`/Tiny-Taps/`. It exercises the original full leaf-boat journey/homecoming,
sharing, cross-scene carry, cargo reload, replay, separate child saves, shared
mute, keyboard controls, reduced motion, drag with tap-to-place off, and fresh
offline launch. It also covers patch travel, gentle misses, curl and pumpkin
reveals, changing replay spots, interruption/reload with dropped props, candy
sharing after peekaboo and offline peekaboo. Grove checks exercise the actual
three oscillator pitches, Monster playing versus gift sharing, notes with
tap-to-place off, mute/keyboard, dropped-candy reload, four log layouts,
per-child musical memory, a clean exit without deferred notes and fresh offline
musical play. Hidden, grove and normal layouts are
checked at 1180×820, 820×1180, 390×844 and 844×390; screenshots were inspected
for curl readability, face clearance and clipping.

Physical iPad/iPhone Safari, installed iOS PWA and actual three-year-old
usability remain unverified. Prefer that feedback before expanding further.

The optional browser test needs Playwright/Chromium and OpenSSL only for
development. `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` select existing tools.
Keep the HTTPS server and browser in the same execution call in isolated
network environments. The hosted Chromium worked with its default graphics
settings; forcing ANGLE/SwiftShader flags stalled screenshots after rotation.
The intro may need one gesture to start and a second to skip; allow its fade
to finish before interacting with the menu.

Git reads work through CLI. Prefer authenticated GitHub tools for writes;
CLI push previously lacked credentials. Upload the exact tested files. Use
expected head SHAs for branch updates; never overwrite unseen changes.

Hosted-preview browser interaction was previously blocked by automatic review
because it could send third-party Segment telemetry. This continuation uses
local browser tests and GitHub/Netlify deployment status instead. Do not
repeat the blocked hosted-browser operation without resolving that approval.

## Next small step

Review the grove and Pumpkin Patch on the child's device and fix concrete
feedback first. Stepping-stone building, family picnic and more cross-location
prop uses remain later proposals. Choose one bounded slice per review.
Preserve the existing boat, peekaboo and free-music loops, and all other games.
Finish with checks, an inspectable preview and a PR; do not merge without
current authorization.
