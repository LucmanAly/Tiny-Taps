// Service worker: precache everything so the app works fully offline after
// the first visit.
//
// Strategy: code (html/js/css/manifest) is network-first with cache fallback,
// so a deploy reaches the child's tablet on the very next launch while still
// working fully offline. Heavy immutable assets (art, audio, icons) are
// cache-first. Bump VERSION on any deploy to clear stale precaches.
const VERSION = 'tiny-taps-v5.29';

const NUMBER_AUDIO_VALUES = [
  ...Array.from({ length: 101 }, (_, index) => index),
  1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000,
  1_000_000_000, 10_000_000_000, 100_000_000_000, 1_000_000_000_000,
];
const NUMBER_AUDIO_ASSETS = NUMBER_AUDIO_VALUES
  .map(value => `assets/audio/numbers/${value}.mp3`);

const ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'css/main.css',
  'css/games.css',
  'js/app.js',
  'js/data/animals.js',
  'js/data/animal-art.js',
  'assets/animal-art/dog.webp',
  'assets/animal-art/cat.webp',
  'assets/animal-art/cow.webp',
  'assets/animal-art/duck.webp',
  'assets/animal-art/sheep.webp',
  'assets/animal-art/horse.webp',
  'assets/animal-art/rooster.webp',
  'assets/animal-art/pig.webp',
  'assets/animal-art/lion.webp',
  'assets/animal-art/elephant.webp',
  'assets/animal-art/frog.webp',
  'assets/animal-art/owl.webp',
  'assets/animal-art/bear.webp',
  'assets/animal-art/bee.webp',
  'assets/animal-art/bunny.webp',
  'assets/animal-art/butterfly.webp',
  'assets/animal-art/dinosaur.webp',
  'assets/animal-art/fish.webp',
  'assets/animal-art/giraffe.webp',
  'assets/animal-art/monkey.webp',
  'assets/animal-art/shark.webp',
  'assets/animal-art/turtle.webp',
  'assets/animal-art/zebra.webp',
  'assets/animal-art/whale.webp',
  'assets/animal-art/jellyfish.webp',
  'assets/animal-art/eagle.webp',
  'assets/animal-art/sparrow.webp',
  'assets/animal-art/penguin.webp',
  'assets/animal-art/octopus.webp',
  'assets/animal-art/crocodile.webp',
  'assets/animal-art/panda.webp',
  'assets/animal-art/fox.webp',
  'assets/animal-art/koala.webp',
  'assets/animal-art/deer.webp',
  'assets/animal-art/squirrel.webp',
  'assets/animal-art/brachiosaurus.webp',
  'assets/animal-art/pterodactyl.webp',
  'assets/animal-art/triceratops.webp',
  'assets/animal-art/stegosaurus.webp',
  'assets/animal-art/velociraptor.webp',
  'assets/animal-art/snake.webp',
  'assets/animal-art/ant.webp',
  'assets/animal-art/grasshopper.webp',
  'assets/animal-art/tiger.webp',
  'assets/animal-art/hippo.webp',
  'assets/animal-art/camel.webp',
  'assets/animal-art/kangaroo.webp',
  'assets/animal-art/rhino.webp',
  'assets/animal-art/duckling.webp',
  'assets/animal-art/parrot.webp',
  'assets/animal-art/budgie.webp',
  'assets/animal-art/budgie-flight.webp',
  'assets/animal-art/sparrow-flight.webp',
  'assets/animal-art/baby-shark.webp',
  'assets/animal-art/daddy-shark.webp',
  'assets/animal-art/mommy-shark.webp',
  'assets/animal-art/grandpa-shark.webp',
  'assets/animal-art/grandma-shark.webp',
  'assets/animal-art/toy-teddy.webp',
  'assets/animal-art/toy-duck.webp',
  'js/data/builds.js',
  'js/data/strings.js',
  'js/data/trace-items.js',
  'js/data/version.js',
  'js/engine/audio.js',
  'js/engine/calm.js',
  'js/engine/celebrate.js',
  'js/engine/children.js',
  'js/engine/drag.js',
  'js/engine/intro.js',
  'js/engine/rand.js',
  'js/engine/recordings.js',
  'js/engine/progress.js',
  'js/engine/roundgame.js',
  'js/engine/speech.js',
  'js/engine/stickers.js',
  'js/engine/ui.js',
  'js/games/index.js',
  'js/games/peekaboo.js',
  'js/games/sounds.js',
  'js/games/colors.js',
  'js/games/shapes.js',
  'js/games/counting.js',
  'js/games/numberbook.js',
  'js/games/puzzle.js',
  'js/games/feedme.js',
  'js/games/coloring.js',
  'js/games/memory.js',
  'js/games/music.js',
  'js/games/bubbles.js',
  'js/games/stickers.js',
  'js/games/shadow.js',
  'js/games/bigsmall.js',
  'js/games/pattern.js',
  'js/games/sort.js',
  'js/games/wash.js',
  'js/games/trace.js',
  'js/games/playhouse.js',
  'js/games/babyboo.js',
  'js/games/babyboo/world.js',
  'js/games/babyboo/art.js',
  'js/games/babyboo/model.js',
  'assets/babyboo/manifest.json',
  'assets/babyboo/boo-blink.png',
  'assets/babyboo/boo-body.png',
  'assets/babyboo/boo-front.png',
  'assets/babyboo/boo-left-arm.png',
  'assets/babyboo/boo-right-arm.png',
  'assets/babyboo/daddy-blink.png',
  'assets/babyboo/daddy-body.png',
  'assets/babyboo/daddy-front.png',
  'assets/babyboo/daddy-left-arm.png',
  'assets/babyboo/daddy-right-arm.png',
  'assets/babyboo/house.png',
  'assets/babyboo/mommy-blink.png',
  'assets/babyboo/mommy-body.png',
  'assets/babyboo/mommy-front.png',
  'assets/babyboo/mommy-left-arm.png',
  'assets/babyboo/mommy-right-arm.png',
  'assets/babyboo/monster-blink.png',
  'assets/babyboo/monster-body.png',
  'assets/babyboo/monster-front.png',
  'assets/babyboo/monster-left-arm.png',
  'assets/babyboo/monster-left-foot.png',
  'assets/babyboo/monster-right-arm.png',
  'assets/babyboo/monster-right-foot.png',
  'js/games/playhouse/layout.js', 'js/games/playhouse/world.js', 'js/games/playhouse/art.js', 'js/games/playhouse/assets.js',
  'js/games/playhouse/fx.js', 'js/games/playhouse/sky.js', 'js/games/playhouse/props.js', 'js/games/playhouse/kids.js',
  'js/games/playhouse/home.js', 'js/games/playhouse/garden.js', 'js/games/playhouse/patch.js', 'js/games/playhouse/moments.js',
  'js/games/playhouse/voices.js',
  'js/games/playhouse/petbird.js', 'js/games/playhouse/visitors.js',
  'js/games/animals.js',
  'js/games/vehicles.js',
  'js/games/paintpots.js',
  'js/games/faces.js',

  'assets/art/parrot-coloring.svg', 'assets/art/daddy-shark-coloring.svg',
  'assets/art/motu-coloring.svg',
  'assets/art/john-the-don-coloring.svg', 'assets/art/patlu-coloring.svg',
  'assets/art/family-man-coloring.svg', 'assets/art/family-woman-coloring.svg',
  'assets/art/family-baby-camera-coloring.svg', 'assets/art/family-boy-coloring.svg',
  'assets/art/chingam-coloring.svg',

  'assets/art/food-bone.svg',  'assets/art/food-carrot.svg',
  'assets/art/food-grass.svg', 'assets/art/food-banana.svg', 'assets/art/food-corn.svg',
  'assets/art/food-honey.svg', 'assets/art/food-flower.svg', 'assets/art/food-leaves.svg',
  'assets/art/food-lettuce.svg',
  'assets/audio/dog.mp3', 'assets/audio/cat.mp3', 'assets/audio/cow.mp3',
  'assets/audio/duck.mp3', 'assets/audio/sheep.mp3', 'assets/audio/horse.mp3',
  'assets/audio/rooster.mp3', 'assets/audio/pig.mp3', 'assets/audio/lion.mp3',
  'assets/audio/elephant.mp3', 'assets/audio/frog.mp3', 'assets/audio/owl.mp3',
  'assets/audio/bear.mp3', 'assets/audio/bee.mp3', 'assets/audio/bunny.mp3',
  'assets/audio/monkey.mp3', 'assets/audio/zebra.mp3',
  // Bundled Piper voice clips for the Animals flashcard deck.
  'assets/audio/animals/whale.mp3', 'assets/audio/animals/shark.mp3',
  'assets/audio/animals/jellyfish.mp3', 'assets/audio/animals/eagle.mp3',
  'assets/audio/animals/sparrow.mp3', 'assets/audio/animals/penguin.mp3',
  'assets/audio/animals/octopus.mp3', 'assets/audio/animals/turtle.mp3',
  'assets/audio/animals/crocodile.mp3', 'assets/audio/animals/rabbit.mp3',
  'assets/audio/animals/kitten.mp3', 'assets/audio/animals/puppy.mp3',
  'assets/audio/animals/bear.mp3', 'assets/audio/animals/elephant.mp3',
  'assets/audio/animals/lion.mp3', 'assets/audio/animals/monkey.mp3',
  'assets/audio/animals/horse.mp3', 'assets/audio/animals/cow.mp3',
  'assets/audio/animals/panda.mp3', 'assets/audio/animals/giraffe.mp3',
  'assets/audio/animals/zebra.mp3', 'assets/audio/animals/pig.mp3',
  'assets/audio/animals/sheep.mp3', 'assets/audio/animals/fox.mp3',
  'assets/audio/animals/koala.mp3', 'assets/audio/animals/deer.mp3',
  'assets/audio/animals/squirrel.mp3', 'assets/audio/animals/t_rex.mp3',
  'assets/audio/animals/brachiosaurus.mp3', 'assets/audio/animals/pterodactyl.mp3',
  'assets/audio/animals/triceratops.mp3', 'assets/audio/animals/stegosaurus.mp3',
  'assets/audio/animals/velociraptor.mp3',
  // The remaining My First Words names use the same bundled Piper voice.
  'assets/audio/animals/snake.mp3', 'assets/audio/animals/ant.mp3',
  'assets/audio/animals/grasshopper.mp3', 'assets/audio/animals/tiger.mp3',
  'assets/audio/animals/hippo.mp3', 'assets/audio/animals/camel.mp3',
  'assets/audio/animals/kangaroo.mp3', 'assets/audio/animals/rhino.mp3',
  'assets/audio/animals/bee.mp3', 'assets/audio/animals/butterfly.mp3',
  'assets/audio/animals/goldfish.mp3', 'assets/audio/animals/frog.mp3',
  'assets/audio/animals/owl.mp3', 'assets/audio/animals/duckling.mp3',
  'assets/audio/animals/baby_shark.mp3', 'assets/audio/animals/daddy_shark.mp3',
  'assets/audio/animals/mommy_shark.mp3', 'assets/audio/animals/grandpa_shark.mp3',
  'assets/audio/animals/grandma_shark.mp3', 'assets/audio/animals/bed.mp3',
  'assets/audio/animals/shoe.mp3', 'assets/audio/animals/hat.mp3',
  'assets/audio/animals/apple.mp3', 'assets/audio/animals/banana.mp3',
  'assets/audio/animals/flower.mp3', 'assets/audio/animals/sun.mp3',
  'assets/audio/animals/moon.mp3', 'assets/audio/animals/star.mp3',
  'assets/audio/animals/house.mp3', 'assets/audio/animals/train.mp3',
  'assets/audio/animals/airplane.mp3', 'assets/audio/animals/boat.mp3',
  'assets/audio/animals/bicycle.mp3', 'assets/audio/animals/car.mp3',
  'assets/audio/animals/bus.mp3', 'assets/audio/animals/ball.mp3',
  'assets/audio/animals/book.mp3', 'assets/audio/animals/cup.mp3',
  'assets/audio/animals/spoon.mp3', 'assets/audio/animals/chair.mp3',
  // Number Book uses the same bundled Piper voice and never relies on browser
  // speech synthesis, which is missing in some iPhone/PWA environments.
  ...NUMBER_AUDIO_ASSETS,
  'icons/tiny-taps-touch-180.png', 'icons/tiny-taps-touch-192.png',
  'icons/tiny-taps-touch-512.png',
  // Intro mascot art. Note the exact casing (.PNG) — GitHub Pages serves from
  // a case-sensitive filesystem, so these must match the files byte for byte.
  // These are large; the install below caches every entry independently, so a
  // slow or failed mascot download can still never block the PWA installing.
  'assets/mascot_walking.PNG', 'assets/mascot_waving.PNG',
  'assets/mascot_magic.PNG', 'assets/mascot_idle.PNG',
  // Play House outfits. Winter reuses the four above and adds these two.
  'assets/mascot_winter_jump.PNG', 'assets/mascot_winter_sleep.PNG',
  'assets/mascot_rain_stand.PNG', 'assets/mascot_rain_walk.PNG',
  'assets/mascot_rain_jump.PNG', 'assets/mascot_rain_sleep.PNG',
  'assets/mascot_summer_stand.PNG', 'assets/mascot_summer_walk.PNG',
  'assets/mascot_summer_jump.PNG', 'assets/mascot_summer_sleep.PNG',
  // Flat-lay garment cards for the wardrobe picker.
  'assets/mascot_outfit_winter.PNG', 'assets/mascot_outfit_rain.PNG',
  'assets/mascot_outfit_summer.PNG',
  // The baby's four poses, sliced from one sprite sheet.
  'assets/baby_sit.PNG', 'assets/baby_happy.PNG',
  'assets/baby_crawl.PNG', 'assets/baby_sleep.PNG',
  // Play House poses, toys, toy box and bushes, sliced from the uploaded
  // sheets by scripts/slice-playhouse-art.py.
  'assets/playhouse/baby-hug.png', 'assets/playhouse/baby-look.png', 'assets/playhouse/baby-reach.png',
  'assets/playhouse/baby-sleepy.png', 'assets/playhouse/boy-rain-carry.png', 'assets/playhouse/boy-rain-kneel.png',
  'assets/playhouse/boy-rain-push-a.png', 'assets/playhouse/boy-rain-push-b.png', 'assets/playhouse/boy-summer-carry.png',
  'assets/playhouse/boy-summer-kneel.png', 'assets/playhouse/boy-summer-push-a.png', 'assets/playhouse/boy-summer-push-b.png',
  'assets/playhouse/boy-winter-carry.png', 'assets/playhouse/boy-winter-kneel.png', 'assets/playhouse/boy-winter-push-a.png',
  'assets/playhouse/boy-winter-push-b.png', 'assets/playhouse/bush-big.png', 'assets/playhouse/bush-medium.png',
  'assets/playhouse/bush-small.png', 'assets/playhouse/toy-ball.png', 'assets/playhouse/toy-blanket.png',
   'assets/playhouse/toy-rattle.png',
  'assets/playhouse/toybox-closed.png', 'assets/playhouse/toybox-empty.png', 'assets/playhouse/toybox-open.png',
  // Play House children's voices (giggles, coos, babble, yawns, sneezes) and
  // the rattle, cut from Commons recordings by scripts/cut-playhouse-voices.py.
  'assets/audio/playhouse/baby-babble-1.mp3', 'assets/audio/playhouse/baby-babble-10.mp3', 'assets/audio/playhouse/baby-babble-2.mp3',
  'assets/audio/playhouse/baby-babble-3.mp3', 'assets/audio/playhouse/baby-babble-4.mp3', 'assets/audio/playhouse/baby-babble-5.mp3',
  'assets/audio/playhouse/baby-babble-6.mp3', 'assets/audio/playhouse/baby-babble-7.mp3', 'assets/audio/playhouse/baby-babble-8.mp3',
  'assets/audio/playhouse/baby-babble-9.mp3', 'assets/audio/playhouse/baby-coo-1.mp3', 'assets/audio/playhouse/baby-coo-2.mp3',
  'assets/audio/playhouse/baby-coo-3.mp3', 'assets/audio/playhouse/baby-coo-4.mp3', 'assets/audio/playhouse/baby-coo-5.mp3',
  'assets/audio/playhouse/baby-coo-6.mp3', 'assets/audio/playhouse/baby-delight-1.mp3', 'assets/audio/playhouse/baby-delight-2.mp3',
  'assets/audio/playhouse/baby-delight-3.mp3', 'assets/audio/playhouse/baby-gulp-1.mp3', 'assets/audio/playhouse/baby-gulp-2.mp3',
  'assets/audio/playhouse/baby-laugh-1.mp3', 'assets/audio/playhouse/baby-laugh-2.mp3', 'assets/audio/playhouse/baby-laugh-3.mp3',
  'assets/audio/playhouse/baby-laugh-4.mp3', 'assets/audio/playhouse/baby-laugh-5.mp3', 'assets/audio/playhouse/baby-laugh-6.mp3',
  'assets/audio/playhouse/baby-laugh-7.mp3', 'assets/audio/playhouse/baby-sneeze-1.mp3', 'assets/audio/playhouse/baby-sneeze-2.mp3',
  'assets/audio/playhouse/baby-yawn-1.mp3', 'assets/audio/playhouse/boy-laugh-1.mp3', 'assets/audio/playhouse/boy-laugh-2.mp3',
  'assets/audio/playhouse/boy-laugh-3.mp3', 'assets/audio/playhouse/boy-laugh-4.mp3', 'assets/audio/playhouse/boy-laugh-5.mp3',
  'assets/audio/playhouse/rattle-1.mp3', 'assets/audio/playhouse/rattle-2.mp3',
  // "Play Together" sibling moments.
  'assets/moment_teddy.PNG', 'assets/moment_crawl.PNG', 'assets/moment_hug.PNG',
  'assets/moment_rattle.PNG', 'assets/moment_peekaboo.PNG', 'assets/moment_clap.PNG',
  'assets/moment_duck.PNG', 'assets/moment_bubbles.PNG', 'assets/moment_ride.PNG',
  'assets/moment_lift.PNG',
  // Animals: one photo per animal, sliced from four uploaded grid sheets
  // (the originals are archived, unsliced, in assets/new-assets/).

  // My First Words: everyday-word photos beyond the animal kingdom, sliced
  // from four more uploaded grid sheets.

  'assets/words-photos/bed.jpg', 'assets/words-photos/shoe.jpg',
  'assets/words-photos/hat.jpg', 'assets/words-photos/apple.jpg',
  'assets/words-photos/banana.jpg', 'assets/words-photos/flower.jpg',
  'assets/words-photos/sun.jpg', 'assets/words-photos/moon.jpg',
  'assets/words-photos/star.jpg', 'assets/words-photos/house.jpg',
  'assets/words-photos/train.jpg', 'assets/words-photos/airplane.jpg',
  'assets/words-photos/boat.jpg', 'assets/words-photos/bicycle.jpg',
  'assets/words-photos/car.jpg', 'assets/words-photos/bus.jpg',
  'assets/words-photos/ball.jpg', 'assets/words-photos/book.jpg',
  'assets/words-photos/cup.jpg', 'assets/words-photos/spoon.jpg',
  'assets/words-photos/chair.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    // One unavailable optional asset must not prevent the entire PWA from
    // installing. Cache independently, while requiring the app shell.
    caches.open(VERSION).then(async c => {
      const results = await Promise.allSettled(ASSETS.map(asset => c.add(asset)));
      const shell = ['index.html', 'css/main.css', 'js/app.js'];
      const failedShell = results.some((r, i) => r.status === 'rejected' && shell.includes(ASSETS[i]));
      if (failedShell) throw new Error('Tiny Taps app shell could not be cached');
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isCode(url) {
  const p = new URL(url).pathname;
  return p.endsWith('/') || /\.(html|js|css|webmanifest)$/.test(p);
}

async function putIfOk(request, res) {
  if (res && res.ok) {
    const copy = res.clone();
    const c = await caches.open(VERSION);
    c.put(request, copy);
  }
  return res;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (isCode(e.request.url)) {
    // Network-first: fresh code when online, cached code offline.
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => putIfOk(e.request, res))
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
  } else {
    // Cache-first for immutable art/audio/icons.
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then(hit =>
        hit || fetch(e.request).then(res => putIfOk(e.request, res))
      )
    );
  }
});
