# Baby Boo asset catalog

## Approved sources

- `assets/babyboo/source/cast-reference.png`: unchanged supplied
  Cast_Reference.png, the approved stock drawings and their identities.
- `assets/babyboo/source/home-reference.png`: unchanged supplied
  Home_Reference.png, the approved lavender house/exterior.
- Sprite_State_Preview.png was inspected for motion/state guidance. It is a
  labelled preview, not an atlas, and is not cut into animation frames.

The source images are retained for reproduction but not loaded by the game or
precached. Their captions/panel backgrounds/shadows are not baked into sprites.

## Runtime art

`assets/babyboo/manifest.json` is the authoritative list of layer filenames,
canvas dimensions, fixed body/foot pivots and limb shoulder/foot joints. Every
layer of one model shares the same untrimmed canvas and pivot. Runtime art:

- `boo`, `daddy`, `mommy`, `monster`: each has `-front.png`, `-body.png`,
  `-blink.png`, `-left-arm.png` and `-right-arm.png`.
- Monster also has independent `-left-foot.png` and `-right-foot.png`.
- `house.png`: the exact roof and house geometry from the approved exterior.

These are layered front drawings, not sprite atlases. The manifest's timing
values describe production motion/blink cycles; no original frame metadata was
available. The base drawings remain approved; extracted layers, blinks and
motion are working production variants. No new camera view is claimed.

New sky, jungle/pond scenery, candy, leaf, flower, basket, signs, water ripples
and glow are original Canvas shapes in `js/games/babyboo/art.js`. Rendering
uses a backing canvas up to 2x CSS resolution. The approved orange moon and
lavender house cues remain recognizable.

Phase-two slice v5.30 adds code-drawn pumpkin vines, a pumpkin picture sign,
three larger versions of the existing smiling pumpkin, and a peekaboo picture
button. Boo hides through scenery occlusion of the same layered model; the
curl remains visible beside the stem. No cast/reference bitmap, anchor,
manifest scale or approved silhouette was changed. The tiny Boo picture in
Monster's thought bubble and the start button reuses `boo-front.png`.

## Reproduce

With Python, Pillow, NumPy and SciPy installed:

```sh
python3 scripts/prepare-babyboo-art.py
```

The script derives the layers from the supplied drawings, removes the flat
reference-panel background and retains consistent anchors. Blink eyelids are
drawn at 2x and downsampled. `cutout-preview.jpg` is an extraction QA montage,
not a new model sheet or an animation atlas. No generative image tool is used.

All runtime layer files and the manifest are enumerated in `sw.js` and checked
by `scripts/check-babyboo.mjs`. Preserve their paths or update the manifest,
cache list and checks together when intentionally replacing a version.
