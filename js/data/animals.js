// Shared animal roster. All animal cutouts use the refreshed storybook art.
// Authentic animal recordings and their licenses remain in assets/CREDITS.md.
import { animalArt } from './animal-art.js';

export const ANIMALS = [
  { id: 'dog',       name: 'dog',       art: animalArt('dog'),    sound: 'assets/audio/dog.mp3',      habitat: 'farm' },
  { id: 'cat',       name: 'cat',       art: animalArt('cat'),   sound: 'assets/audio/cat.mp3',      habitat: 'farm' },
  { id: 'cow',       name: 'cow',       art: animalArt('cow'),      sound: 'assets/audio/cow.mp3',      habitat: 'farm' },
  { id: 'duck',      name: 'duck',      art: animalArt('duck'),      sound: 'assets/audio/duck.mp3',     habitat: 'water' },
  { id: 'sheep',     name: 'sheep',     art: animalArt('sheep'),     sound: 'assets/audio/sheep.mp3',    habitat: 'farm' },
  { id: 'horse',     name: 'horse',     art: animalArt('horse'),    sound: 'assets/audio/horse.mp3',    habitat: 'farm' },
  { id: 'rooster',   name: 'rooster',   art: animalArt('rooster'),   sound: 'assets/audio/rooster.mp3',  habitat: 'farm' },
  { id: 'pig',       name: 'pig',       art: animalArt('pig'),   sound: 'assets/audio/pig.mp3',      habitat: 'farm' },
  { id: 'lion',      name: 'lion',      art: animalArt('lion'), sound: 'assets/audio/lion.mp3',     habitat: 'wild' },
  { id: 'elephant',  name: 'elephant',  art: animalArt('elephant'), sound: 'assets/audio/elephant.mp3', habitat: 'wild' },
  { id: 'frog',      name: 'frog',      art: animalArt('frog'),      sound: 'assets/audio/frog.mp3',     habitat: 'water' },
  { id: 'owl',       name: 'owl',       art: animalArt('owl'),       sound: 'assets/audio/owl.mp3',      habitat: 'wild' },
  { id: 'bear',      name: 'bear',      art: animalArt('bear'), sound: 'assets/audio/bear.mp3',     habitat: 'wild' },
  { id: 'bee',       name: 'bee',       art: animalArt('bee'),       sound: 'assets/audio/bee.mp3',      habitat: 'wild' },
  { id: 'bunny',     name: 'bunny',     art: animalArt('bunny'),   sound: 'assets/audio/bunny.mp3',    habitat: 'farm' },
  { id: 'butterfly', name: 'butterfly', art: animalArt('butterfly'), sound: null,                        habitat: 'wild' },
  { id: 'dinosaur',  name: 'dinosaur',  art: animalArt('dinosaur'),  sound: null,                        habitat: 'wild' },
  { id: 'fish',      name: 'fish',      art: animalArt('fish'),      sound: null,                        habitat: 'water' },
  { id: 'giraffe',   name: 'giraffe',   art: animalArt('giraffe'),  sound: null,                        habitat: 'wild' },
  { id: 'monkey',    name: 'monkey',    art: animalArt('monkey'),   sound: 'assets/audio/monkey.mp3',   habitat: 'wild' },
  { id: 'shark',     name: 'shark',     art: animalArt('shark'),    sound: null,                        habitat: 'water' },
  { id: 'turtle',    name: 'turtle',    art: animalArt('turtle'), sound: null,                      habitat: 'water' },
  { id: 'zebra',     name: 'zebra',     art: animalArt('zebra'),    sound: 'assets/audio/zebra.mp3',    habitat: 'wild' },
];


// Transparent cutouts work in cards, silhouettes, puzzles and the garden.
export function displayArt(a) { return a.art; }

// Animals with an authentic recording (used by sound-guessing games).
export const SOUND_ANIMALS = ANIMALS.filter(a => a.sound);

export const FOODS = [
  { id: 'bone',    name: 'bone',    art: 'assets/art/food-bone.svg' },
  { id: 'fish',    name: 'fish',    art: animalArt('fish') },
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
