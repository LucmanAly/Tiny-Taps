// Shared animal roster. `sound` files are authentic recordings — see
// assets/CREDITS.md for per-file source and license. Animals without a
// recording have sound: null; games that need real audio (Animal Sounds)
// should use SOUND_ANIMALS.

export const ANIMALS = [
  { id: 'dog',       name: 'dog',       art: 'assets/art/dog.svg',       sound: 'assets/audio/dog.mp3',      habitat: 'farm' },
  { id: 'cat',       name: 'cat',       art: 'assets/art/cat.svg',       sound: 'assets/audio/cat.mp3',      habitat: 'farm' },
  { id: 'cow',       name: 'cow',       art: 'assets/art/cow.svg',       sound: 'assets/audio/cow.mp3',      habitat: 'farm' },
  { id: 'duck',      name: 'duck',      art: 'assets/art/duck.svg',      sound: 'assets/audio/duck.mp3',     habitat: 'water' },
  { id: 'sheep',     name: 'sheep',     art: 'assets/art/sheep.svg',     sound: 'assets/audio/sheep.mp3',    habitat: 'farm' },
  { id: 'horse',     name: 'horse',     art: 'assets/art/horse.svg',     sound: 'assets/audio/horse.mp3',    habitat: 'farm' },
  { id: 'rooster',   name: 'rooster',   art: 'assets/art/rooster.svg',   sound: 'assets/audio/rooster.mp3',  habitat: 'farm' },
  { id: 'pig',       name: 'pig',       art: 'assets/art/pig.svg',       sound: 'assets/audio/pig.mp3',      habitat: 'farm' },
  { id: 'lion',      name: 'lion',      art: 'assets/art/lion.svg',      sound: 'assets/audio/lion.mp3',     habitat: 'wild' },
  { id: 'elephant',  name: 'elephant',  art: 'assets/art/elephant.svg',  sound: 'assets/audio/elephant.mp3', habitat: 'wild' },
  { id: 'frog',      name: 'frog',      art: 'assets/art/frog.svg',      sound: 'assets/audio/frog.mp3',     habitat: 'water' },
  { id: 'owl',       name: 'owl',       art: 'assets/art/owl.svg',       sound: 'assets/audio/owl.mp3',      habitat: 'wild' },
  { id: 'bear',      name: 'bear',      art: 'assets/art/bear.svg',      sound: 'assets/audio/bear.mp3',     habitat: 'wild' },
  { id: 'bee',       name: 'bee',       art: 'assets/art/bee.svg',       sound: 'assets/audio/bee.mp3',      habitat: 'wild' },
  { id: 'bunny',     name: 'bunny',     art: 'assets/art/bunny.svg',     sound: 'assets/audio/bunny.mp3',    habitat: 'farm' },
  { id: 'butterfly', name: 'butterfly', art: 'assets/art/butterfly.svg', sound: null,                        habitat: 'wild' },
  { id: 'dinosaur',  name: 'dinosaur',  art: 'assets/art/dinosaur.svg',  sound: null,                        habitat: 'wild' },
  { id: 'fish',      name: 'fish',      art: 'assets/art/fish.svg',      sound: null,                        habitat: 'water' },
  { id: 'giraffe',   name: 'giraffe',   art: 'assets/art/giraffe.svg',   sound: null,                        habitat: 'wild' },
  { id: 'monkey',    name: 'monkey',    art: 'assets/art/monkey.svg',    sound: 'assets/audio/monkey.mp3',   habitat: 'wild' },
  { id: 'shark',     name: 'shark',     art: 'assets/art/shark.svg',     sound: null,                        habitat: 'water' },
  { id: 'turtle',    name: 'turtle',    art: 'assets/art/turtle.svg',    sound: null,                        habitat: 'water' },
  { id: 'zebra',     name: 'zebra',     art: 'assets/art/zebra.svg',     sound: 'assets/audio/zebra.mp3',    habitat: 'wild' },
];

// Animals with an authentic recording (used by sound-guessing games).
export const SOUND_ANIMALS = ANIMALS.filter(a => a.sound);

export const FOODS = [
  { id: 'bone',    name: 'bone',    art: 'assets/art/food-bone.svg' },
  { id: 'fish',    name: 'fish',    art: 'assets/art/food-fish.svg' },
  { id: 'carrot',  name: 'carrot',  art: 'assets/art/food-carrot.svg' },
  { id: 'grass',   name: 'grass',   art: 'assets/art/food-grass.svg' },
  { id: 'banana',  name: 'banana',  art: 'assets/art/food-banana.svg' },
  { id: 'corn',    name: 'corn',    art: 'assets/art/food-corn.svg' },
  { id: 'honey',   name: 'honey',   art: 'assets/art/food-honey.svg' },
  { id: 'flower',  name: 'flower',  art: 'assets/art/food-flower.svg' },
  { id: 'leaves',  name: 'leaves',  art: 'assets/art/food-leaves.svg' },
  { id: 'lettuce', name: 'lettuce', art: 'assets/art/food-lettuce.svg' },
];

// Who eats what (Feed Me).
export const DIET = {
  dog: 'bone',
  cat: 'fish',
  horse: 'carrot',
  cow: 'grass',
  elephant: 'banana',
  pig: 'corn',
  bear: 'honey',
  bunny: 'carrot',
  monkey: 'banana',
  bee: 'flower',
  butterfly: 'flower',
  giraffe: 'leaves',
  dinosaur: 'leaves',
  turtle: 'lettuce',
  shark: 'fish',
  zebra: 'grass',
  sheep: 'grass',
  duck: 'corn',
};

export function animal(id) {
  return ANIMALS.find(a => a.id === id);
}

export function food(id) {
  return FOODS.find(f => f.id === id);
}

export function preloadSounds(audio, ids) {
  return Promise.all(
    (ids || SOUND_ANIMALS.map(a => a.id)).map(id => {
      const a = animal(id);
      if (!a || !a.sound) return Promise.resolve(null);
      return audio.load('animal:' + id, a.sound);
    })
  );
}
