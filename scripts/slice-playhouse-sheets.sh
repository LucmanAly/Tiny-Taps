#!/usr/bin/env bash
set -euo pipefail

# Turn the generated Play House contact sheets into small, transparent runtime
# sprites. ImageMagick is only a development dependency; the app still ships as
# plain HTML/CSS/JS with no build step.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/assets"

slice() {
  local sheet="$1"
  local geometry="$2"
  local output="$3"
  local mask
  mask="$(mktemp --suffix=.png)"

  convert "$ASSETS/$sheet" \
    -crop "$geometry" +repage \
    -alpha on -bordercolor white -border 1 \
    -fuzz 10% -fill none -draw 'matte 0,0 floodfill' \
    -shave 1x1 -trim +repage \
    -strip -colors 256 "PNG8:$ASSETS/$output"

  # Exact grid crops can retain a tiny disconnected shoe, leaf or neighbouring
  # object fragment. Keep every meaningful connected island while discarding
  # only specks smaller than 1000 pixels in the final high-resolution sprite.
  convert "$ASSETS/$output" -alpha extract -threshold 1 \
    -define connected-components:mean-color=true \
    -define connected-components:area-threshold=1000 \
    -connected-components 8 "$mask"
  convert "$ASSETS/$output" "$mask" -compose CopyOpacity -composite \
    -strip -colors 256 "PNG8:$ASSETS/$output"
  rm "$mask"
}

# Baby reactions: 2 columns × 2 rows.
slice playhouse_baby_reactions_sheet.png 512x768+0+0       playhouse_baby_reach.png
slice playhouse_baby_reactions_sheet.png 512x768+512+0     playhouse_baby_hug_teddy.png
slice playhouse_baby_reactions_sheet.png 512x768+0+768     playhouse_baby_sleepy.png
slice playhouse_baby_reactions_sheet.png 512x768+512+768   playhouse_baby_laugh.png

# Brother pushing: 3 outfits × 2 alternating steps.
slice playhouse_brother_push_sheet.png 512x512+0+0         playhouse_push_winter_a.png
slice playhouse_brother_push_sheet.png 512x512+512+0       playhouse_push_rain_a.png
slice playhouse_brother_push_sheet.png 512x512+1024+0      playhouse_push_summer_a.png
slice playhouse_brother_push_sheet.png 512x512+0+512       playhouse_push_winter_b.png
slice playhouse_brother_push_sheet.png 512x512+512+512     playhouse_push_rain_b.png
slice playhouse_brother_push_sheet.png 512x512+1024+512    playhouse_push_summer_b.png

# Brother/toy interactions: carrying above, offering below.
slice playhouse_brother_toy_interactions_sheet.png 512x512+0+0       playhouse_carry_winter.png
slice playhouse_brother_toy_interactions_sheet.png 512x512+512+0     playhouse_carry_rain.png
slice playhouse_brother_toy_interactions_sheet.png 512x512+1024+0    playhouse_carry_summer.png
slice playhouse_brother_toy_interactions_sheet.png 512x512+0+512     playhouse_give_winter.png
slice playhouse_brother_toy_interactions_sheet.png 512x512+512+512   playhouse_give_rain.png
slice playhouse_brother_toy_interactions_sheet.png 512x512+1024+512  playhouse_give_summer.png

# The object generator returned a useful 3 × 4 sheet. v4 uses eight cells; the
# doll and fourth row remain available in the source sheet for later.
slice playhouse_objects_sheet.png 342x384+0+0       playhouse_toy_teddy.png
slice playhouse_objects_sheet.png 342x384+341+0     playhouse_toy_ball.png
slice playhouse_objects_sheet.png 342x384+682+0     playhouse_toy_duck.png
slice playhouse_objects_sheet.png 342x384+0+384     playhouse_toy_rattle.png
slice playhouse_objects_sheet.png 342x384+341+384   playhouse_blanket.png
slice playhouse_objects_sheet.png 342x384+682+384   playhouse_toy_bin_closed.png
slice playhouse_objects_sheet.png 342x384+0+768     playhouse_toy_bin_open.png
slice playhouse_objects_sheet.png 342x384+341+768   playhouse_bush.png

printf 'Created Play House runtime sprites in %s\n' "$ASSETS"
