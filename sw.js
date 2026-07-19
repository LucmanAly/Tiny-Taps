// Service worker: precache everything so the app works fully offline after
// the first visit. Bump VERSION on any deploy to refresh caches.
const VERSION = 'tiny-taps-v2';

const ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'css/main.css',
  'css/games.css',
  'js/app.js',
  'js/data/animals.js',
  'js/engine/audio.js',
  'js/engine/celebrate.js',
  'js/engine/drag.js',
  'js/engine/rand.js',
  'js/engine/speech.js',
  'js/games/index.js',
  'js/games/peekaboo.js',
  'js/games/sounds.js',
  'js/games/colors.js',
  'js/games/shapes.js',
  'js/games/counting.js',
  'js/games/puzzle.js',
  'js/games/feedme.js',
  'js/games/coloring.js',
  'js/games/bubbles.js',
  'assets/art/dog.svg', 'assets/art/cat.svg', 'assets/art/cow.svg',
  'assets/art/duck.svg', 'assets/art/sheep.svg', 'assets/art/horse.svg',
  'assets/art/rooster.svg', 'assets/art/pig.svg', 'assets/art/lion.svg',
  'assets/art/elephant.svg', 'assets/art/frog.svg', 'assets/art/owl.svg',
  'assets/art/bear.svg', 'assets/art/bee.svg', 'assets/art/bunny.svg',
  'assets/art/butterfly.svg', 'assets/art/dinosaur.svg', 'assets/art/fish.svg',
  'assets/art/giraffe.svg', 'assets/art/monkey.svg', 'assets/art/shark.svg',
  'assets/art/turtle.svg', 'assets/art/zebra.svg',
  'assets/art/food-bone.svg', 'assets/art/food-fish.svg', 'assets/art/food-carrot.svg',
  'assets/art/food-grass.svg', 'assets/art/food-banana.svg', 'assets/art/food-corn.svg',
  'assets/art/food-honey.svg', 'assets/art/food-flower.svg', 'assets/art/food-leaves.svg',
  'assets/art/food-lettuce.svg',
  'assets/audio/dog.mp3', 'assets/audio/cat.mp3', 'assets/audio/cow.mp3',
  'assets/audio/duck.mp3', 'assets/audio/sheep.mp3', 'assets/audio/horse.mp3',
  'assets/audio/rooster.mp3', 'assets/audio/pig.mp3', 'assets/audio/lion.mp3',
  'assets/audio/elephant.mp3', 'assets/audio/frog.mp3', 'assets/audio/owl.mp3',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return res;
      })
    )
  );
});
