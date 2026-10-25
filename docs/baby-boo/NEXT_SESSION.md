# Baby Boo — next-session handoff

Prepared 2026-10-25 for Luqman Ali. Repository: **LucmanAly/Tiny-Taps**.

## Start here

This closes phase one of **Baby Boo: Little Jungle Adventures**. The owner
explicitly authorized merging [PR #33](https://github.com/LucmanAly/Tiny-Taps/pull/33)
and preparing this handoff. This document is included in that PR before its
closing merge. At the next session, fetch current `main` and verify the actual
merge/deploy state; do not assume the old feature branch is the newest source.

- Production: https://mytinytaps.netlify.app/ — choose **Baby Boo**.
- Phase-one preview: https://deploy-preview-33--mytinytaps.netlify.app/.
- Runtime release: **5.29** (app version, HTML query keys and SW cache agree).
- Tested implementation commit: `754473d2b2a4b30d65f782ab8f5b877008aab171`.
  The final handoff documentation commit is additional to that implementation.

Read `AGENTS.md`, this handoff, `docs/baby-boo/PROJECT_BIBLE.md`,
`docs/baby-boo/GAME.md`, `docs/baby-boo/ASSET_CATALOG.md` and the Baby Boo
section of `docs/ARCHITECTURE.md`. Inspect the actual reference art and manifest
before substantial art/motion work. Honor newer user feedback and repository
changes over this dated snapshot. Preserve any unrelated local work.

## What exists and works

Baby Boo is the first menu card, included in all age presets and wind-down.
The connected places are the lavender house, short jungle path and moonlit
pond. Boo moves when the ground is tapped; Monster follows. Tap Boo to glow.
Objects can be carried, dropped and moved between places by tap or drag.

The complete optional adventure is: pick up the path's big leaf, take it to the
pond, place it on the outlined water spot, pick up a candy, load the boat, tap
the water to send the gift to Monster, then return to Mommy and Daddy. The
empty boat comes back for more play. A flower can be cargo too; an empty boat
still works. Direct candy sharing, bush/firefly discovery, mushroom notes and
a puddle give room for free play. Homecoming has welcoming waves/hearts; it is
not a fully choreographed four-character physical hug. **Again?** restarts a
leaf adventure while preserving memories.

## Creative rules to preserve

- Target roughly age three. A cozy place to explore with a friend, with room
  between activities. Optional little stories give purpose; let the child
  wander, experiment and repeat. Use reassuring reactions and readable motion.
- Purple Monster **loves candies and always hopes for them**. Boo gives him
  candies. This is an owner-confirmed recurring trait, not a proposed change.
  Monster also initiates play and helps Boo; their friendship remains warm.
- Preserve all four stock identities, facial layout, accessories, colors and
  relative size. Boo is smallest with one curl; Daddy has the orange bow tie;
  Mommy has the pink head bow/eyelashes; Monster has purple fuzz, pale horns,
  belly patch, googly eyes, two small fangs and friendly expressions.
- Preserve the recognizable lavender house and gentle purple/green jungle.
  Boo's existing glow is helpful, warm and gradual. No new powers or recurring
  characters should silently become established lore.
- No image generation or Sora under current instructions. Use approved assets
  and code-drawn shapes, with smooth curves and 2x rendering where appropriate.
- The combined bible is version 1.2. Phase-one geography is adopted for this
  game. Episode 1 remains unknown; game content does not rewrite episode history.

## Asset reality — do not rebuild the cast

The task supplied Cast_Reference, Home_Reference, Sprite_State_Preview and the
combined bible. The original drawing functions, original atlases and their
original asset catalog were **not supplied**. Approved character drawings and
the exact house were extracted into transparent anchored layers instead.

`assets/babyboo/source/` retains the unchanged cast/home references.
`assets/babyboo/manifest.json` records each shared canvas/pivot, limb joints,
filenames, provenance and motion timing. The layer/blink animation is a working
production variant of the approved front models; no back/profile is approved.
Sprite_State_Preview is a labelled reference, not an atlas to guess/slice.
`scripts/prepare-babyboo-art.py` reproduces the assets with Pillow/NumPy/SciPy.
Keep aspect ratios/anchors stable and labels outside sprite art. Preserve
approved originals and version deliberate future variants.

## Code and integration

- `js/games/babyboo.js`: normal Tiny Taps registry entry/icon.
- `js/games/babyboo/model.js`: serializable item ownership, boat state machine,
  validation/recovery, carrying, sharing, replay and memory rules.
- `js/games/babyboo/world.js`: lifecycle, pointer/tap/drag controls, movement,
  pickup/action queue, scene transitions, effects and accessible overlay buttons.
- `js/games/babyboo/art.js`: scenery/props, layout, layer motion, glow and bubbles.
- `css/games.css`: Baby Boo styles under `.bb-*`.

This is a vanilla JS static PWA with no build step. Extend this implementation
rather than rebuilding it in a new engine or making a separate unrelated app.
Every game returns cleanup. Cancel/abort listeners, loads and animation loops.
Use the existing app's Home/mute, parent praise and Calm/reduced-motion behavior.
Do not add computer narration or re-enable the silent legacy speech channel.

State is local and per child under `childKey('tinytaps-babyboo-v1')`; its resolved
key is captured at game start for safe cleanup. Keep saves compatible when
adding places/items. Model rules own objects; tap and drag share those rules.
Boat progress pauses outside the pond. A separate put-down control avoids
covering Boo's face with large phone hit areas. Controls are at least 48 CSS px.

For runtime changes, update `js/data/version.js`, `index.html` query keys and
`sw.js` cache together, and cache every new runtime module/asset. Update
AGENTS/architecture docs for new games, folders or core-system changes.

## Verified and still unverified

Passed: `npm run check`, all JS syntax checks, `git diff --check`, and
`scripts/test-babyboo-browser.mjs` in automated Chromium. The browser test uses
local HTTPS under `/Tiny-Taps/` and covers the complete adventure, reload with
cargo, cross-scene carrying, rotation, replay, separate children, drag with
tap-to-place off, shared mute, keyboard actions, reduced motion and a fresh
launch with networking disabled. Viewports: 1180×820, 820×1180, 390×844, 844×390.

**Not verified:** physical iPad/iPhone Safari, installed-iOS PWA behavior on real
hardware, or a three-year-old's actual usability. Do not claim those passed.
Prioritize concrete device/child feedback if supplied before expanding content.

The optional browser test needs Playwright/Chromium and OpenSSL in development;
these are not runtime dependencies. `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE`
can select existing installations. In this hosted runtime, the normal browser
CDN download failed, so an isolated `@sparticuz/chromium` package was used for
QA. Scratch paths/binaries may disappear: reproduce tools if needed. Keep the
HTTPS server and browser in the same execution call when network namespaces
are isolated. The cached intro may need two gestures: one starts it, one skips.

Git reads worked via CLI. CLI push lacked credentials; GitHub connector blob,
tree, commit and branch tools successfully uploaded the exact tested tree.
Prefer available authenticated tools for writes. Use expected head SHAs for
branch updates/merges. Never force-push over unseen changes.

## Next work

No phase-two gameplay was built in this closing session. Proposed expansion:
Pumpkin Patch and Firefly Grove, peekaboo, musical logs, a stepping-stone
crossing, family picnic and more cross-location prop uses. These are future
ideas, not completed features or accepted video events.

When the user asks to continue/implement phase two, first inspect the current
live game and any user feedback. Keep improvements bounded and playable. A
recommended first slice is **Pumpkin Patch + peekaboo**, integrated with existing
travel, Monster reactions and carryable props; add the grove/music/crossing in
later reviewable slices. Preserve the leaf-boat loop and all existing games.
Routine reversible choices can proceed without repeated approval requests.
Finish with working files, appropriate checks, an inspectable preview and a PR.
Do not merge future PRs solely because PR #33 was authorized for merging.

## Suggested opening instruction for the next chat

Continue Baby Boo in LucmanAly/Tiny-Taps from the latest main. Read
`docs/baby-boo/NEXT_SESSION.md` and its linked sources first. Preserve the
approved cast, lavender house, candy-loving Monster and working phase-one game.
Check the live game and my latest feedback, then continue phase two in the
small, playable increments described in the handoff.
