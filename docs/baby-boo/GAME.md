# Baby Boo: Little Jungle Adventures

Owner-approved scope, 2026-10-24. A playable addition to Tiny Taps using the
existing browser/tablet, touch and offline PWA setup. No framework/build step,
accounts, external services, image generation or synthesized narration.

## Play

Choose **Baby Boo** on the Tiny Taps menu. Tap the ground to guide Boo; tap Boo
to glow. Monster follows. Tap a candy basket, then Monster to share a treat.
Objects can also be dragged; dropping on open ground keeps them available.

The optional little adventure is:

1. Take the big leaf from the jungle path.
2. Follow the Pond sign and place the leaf on its outlined water spot.
3. Take a candy from the picnic basket and put it on the leaf boat.
4. Tap the water. The boat gently drifts to Monster; more taps make ripples
   that help it along. He receives the treat and sends the empty leaf back.
5. Return along the path to Mommy and Daddy at the lavender house.

A flower can ride the boat too. An empty boat is still a toy. The bush,
mushroom and puddle invite small discoveries. Trips and candy sharing can be
repeated. **Again?** starts another leaf adventure after a homecoming, while
preserving the child's memories. Exploration is always available.

## Phase two, first playable slice · v5.30

On the jungle path, tap the **pumpkin picture sign** to visit Pumpkin Patch.
The existing Pond sign still goes straight to the leaf-boat adventure.

Tap the Boo-and-pumpkin picture, or any big pumpkin, to start peekaboo. Boo
floats behind one of three smiling pumpkins; his curl peeks out beside its
stem. Tap that pumpkin or the curl to find him. Another pumpkin gives a soft
rustle and fireflies, with no failure or time limit. Boo emerges, Monster
celebrates, and the picture button invites another round in a different spot.
After a quiet spell, a gentle outline helps with the hiding place.

Bring candy for Monster or carry the existing leaf/flower through this region.
Props can be put down, picked up and restored after reload here too. Peekaboo
does not create, consume or reward candies. Monster still hopes for a treat;
sharing remains a separate, freely chosen action. Leave via the Path sign at
any time. Friends and props can interrupt a round. Leaving or reloading ends
the temporary hiding round safely, while preserving items, boat progress and
each child's first peekaboo memory. This is a game development slice for owner
review, not a new completed video episode.

## Phase two, second playable slice · v5.31

The firefly picture sign on the jungle path leads to **Firefly Grove**. Three
chunky logs play gentle low, middle and high notes. Tap in any order; nearby
fireflies brighten gradually and Monster sways along. With empty hands, tap
Monster to let him play a note too. Boo's existing glow warms the clearing.
Sound stays optional: colored log responses and fireflies also work muted.

Candy sharing and carrying/drop/reload use the same rules as the other places.
A carried candy is a gift when Monster is tapped; playing music never spends
or generates treats. Leave through the Path sign at any time. There is no
required tune, score, time limit, automatic song or delayed playback. A busy
finger gets visual feedback while sound starts are coalesced to avoid a loud
stack of notes. Calm/reduced motion keeps the light response and suppresses
sway, bobbing, moving fireflies and log wobble.

This slice builds on the peekaboo branch while PR #34 is still open. PR #35
targets main to produce a combined Netlify preview, so its diff includes
peekaboo until #34 is merged. Review #34 first; the preview contains both
phase-two slices.

## Continuity and art

`PROJECT_BIBLE.md` is the combined current project text. The candy-loving trait
is owner-confirmed. The game geography and phase-one adventure are approved
game scope; no Episode 1 story is inferred and no new recurring character or
power is introduced. Family designs, scale, front views and the house are kept.

The supplied kit had three reference PNGs and the combined bible. It did not
include its original Python drawing functions or animation atlases. The game
therefore reuses extracted approved drawings, not a replacement cast. See
`ASSET_CATALOG.md` for provenance, layers and reproduction.

## Behavior

- One carried object; generous tap and drag targets; tap-to-place follows the
  parent setting. Input can queue a destination while Boo finishes a pickup.
- Smooth motion, separate limb layers, blinking, gentle ghost bobs and Monster
  footfalls. No mirrored model, unmade profile or rear view.
- World/boat state and memories are private, saved per child, and survive exit,
  backgrounding and reload. A boat waits while another place is explored.
- Shared mute, parent praise and Calm/reduced motion apply. No reading or sound
  is required for the interaction; picture bubbles and visible props give cues.
- Browser portrait/landscape layouts, safe app chrome, one-tap exit, load retry,
  and full offline precaching of runtime art and modules.

## Validation

Run `npm run check`, JS syntax checks and `git diff --check`.

Optional browser test: install Playwright and its Chromium browser in a
development environment, then `npm run test:babyboo:browser`. It serves the app
on temporary local HTTPS under `/Tiny-Taps/`, matching GitHub Pages routing,
and covers touch sharing, the full boat trip, reload with cargo, rotation,
four phone/tablet viewport layouts, replay, reduced motion, keyboard input,
shared mute, drag with tap-to-place off, independent child saves, and a new
offline launch. It requires Node and OpenSSL; it changes no runtime dependency.
`PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` may select existing installations.
It also checks the optional patch branch, visible curl target, gentle misses,
repeat hiding places, candy sharing after peekaboo, interrupted/reloaded rounds,
cross-location prop persistence, patch layouts and offline peekaboo. Grove
checks cover the three oscillator frequencies, free note order, Monster
playing/sharing, mute and keyboard response, dropped-candy reload, four
layouts, no delayed notes on exit and fresh offline musical play.

Browser automation is not a physical iPad/iPhone Safari playtest or a child
usability study. Those remain valuable before expanding to the next phase.

## Verified in this implementation

Automated Chromium touch regression passed the full adventure, boat replay,
cargo save/reload, per-child data isolation, drag with tap-to-place disabled,
shared mute, reduced motion, keyboard activation, and fresh offline launch.
Layouts and minimum-48px controls passed at 1180×820, 820×1180, 390×844 and
844×390. Repository checks, new adventure invariants, JavaScript syntax and
Git whitespace checks passed. Physical iOS Safari and child playtesting remain
unverified.

## Later phases

Stepping-stone building, family picnics and more object combinations remain
planned proposals. Review the current grove and peekaboo on the child's actual
device before selecting another small expansion.
