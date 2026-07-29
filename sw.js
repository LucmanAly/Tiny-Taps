// Service worker: precache everything so the app works fully offline after
// the first visit.
//
// Strategy: code (html/js/css/manifest) is network-first with cache fallback,
// so a deploy reaches the child's tablet on the very next launch while still
// working fully offline. Heavy immutable assets (art, audio, icons) are
// cache-first. Bump VERSION on any deploy to clear stale precaches.
const VERSION = 'tiny-taps-v5.2';

const ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'css/main.css',
  'css/games.css',
  'js/app.js',
  'js/data/animals.js',
  'js/data/strings.js',
  'js/data/trace-items.js',
  'js/data/version.js',
  'js/engine/audio.js',
  'js/engine/celebrate.js',
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
  'js/games/animals.js',
  'assets/art/dog.svg', 'assets/art/cat.svg', 'assets/art/cow.svg',
  'assets/art/duck.svg', 'assets/art/sheep.svg', 'assets/art/horse.svg',
  'assets/art/rooster.svg', 'assets/art/pig.svg', 'assets/art/lion.svg',
  'assets/art/elephant.svg', 'assets/art/frog.svg', 'assets/art/owl.svg',
  'assets/art/bear.svg', 'assets/art/bee.svg', 'assets/art/bunny.svg',
  'assets/art/butterfly.svg', 'assets/art/dinosaur.svg', 'assets/art/fish.svg',
  'assets/art/giraffe.svg', 'assets/art/monkey.svg', 'assets/art/shark.svg',
  'assets/art/daddy-shark-coloring.svg', 'assets/art/motu-coloring.svg',
  'assets/art/john-the-don-coloring.svg', 'assets/art/patlu-coloring.svg',
  'assets/art/turtle.svg', 'assets/art/zebra.svg',
  'assets/art/food-bone.svg', 'assets/art/food-fish.svg', 'assets/art/food-carrot.svg',
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
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
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
  // "Play Together" sibling moments.
  'assets/moment_teddy.PNG', 'assets/moment_crawl.PNG', 'assets/moment_hug.PNG',
  'assets/moment_rattle.PNG', 'assets/moment_peekaboo.PNG', 'assets/moment_clap.PNG',
  'assets/moment_duck.PNG', 'assets/moment_bubbles.PNG', 'assets/moment_ride.PNG',
  'assets/moment_lift.PNG',
  // Animals: one photo per animal, sliced from four uploaded grid sheets
  // (the originals are archived, unsliced, in assets/new-assets/).
  'assets/animals-photos/whale.jpg', 'assets/animals-photos/shark.jpg',
  'assets/animals-photos/jellyfish.jpg', 'assets/animals-photos/eagle.jpg',
  'assets/animals-photos/sparrow.jpg', 'assets/animals-photos/penguin.jpg',
  'assets/animals-photos/octopus.jpg', 'assets/animals-photos/sea-turtle.jpg',
  'assets/animals-photos/crocodile.jpg', 'assets/animals-photos/rabbit.jpg',
  'assets/animals-photos/kitten.jpg', 'assets/animals-photos/puppy.jpg',
  'assets/animals-photos/bear-cub.jpg', 'assets/animals-photos/elephant.jpg',
  'assets/animals-photos/lion-cub.jpg', 'assets/animals-photos/monkey.jpg',
  'assets/animals-photos/horse.jpg', 'assets/animals-photos/cow.jpg',
  'assets/animals-photos/panda.jpg', 'assets/animals-photos/giraffe.jpg',
  'assets/animals-photos/zebra.jpg', 'assets/animals-photos/piglet.jpg',
  'assets/animals-photos/lamb.jpg', 'assets/animals-photos/fox.jpg',
  'assets/animals-photos/koala.jpg', 'assets/animals-photos/deer-fawn.jpg',
  'assets/animals-photos/squirrel.jpg', 'assets/animals-photos/t-rex.jpg',
  'assets/animals-photos/brachiosaurus.jpg', 'assets/animals-photos/pterodactyl.jpg',
  'assets/animals-photos/triceratops.jpg', 'assets/animals-photos/stegosaurus.jpg',
  'assets/animals-photos/velociraptor.jpg',
  // My First Words: everyday-word photos beyond the animal kingdom, sliced
  // from four more uploaded grid sheets.
  'assets/words-photos/snake.jpg', 'assets/words-photos/ant.jpg',
  'assets/words-photos/grasshopper.jpg', 'assets/words-photos/tiger.jpg',
  'assets/words-photos/hippo.jpg', 'assets/words-photos/camel.jpg',
  'assets/words-photos/kangaroo.jpg', 'assets/words-photos/rhino.jpg',
  'assets/words-photos/bee.jpg', 'assets/words-photos/butterfly.jpg',
  'assets/words-photos/goldfish.jpg', 'assets/words-photos/frog.jpg',
  'assets/words-photos/owl.jpg', 'assets/words-photos/duckling.jpg',
  'assets/words-photos/baby-shark.png', 'assets/words-photos/daddy-shark.png',
  'assets/words-photos/mommy-shark.png', 'assets/words-photos/grandpa-shark.png',
  'assets/words-photos/grandma-shark.png',
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
      fetch(e.request)
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
