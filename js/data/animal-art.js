// One illustrated family everywhere: cards, cutouts, avatars and the garden.
// Source prompts and generation provenance: docs/animal-art-prompts.json.
export const ANIMAL_ART_IDS = [
  'dog', 'cat', 'cow', 'duck', 'sheep', 'horse', 'rooster', 'pig', 'lion',
  'elephant', 'frog', 'owl', 'bear', 'bee', 'bunny', 'butterfly', 'dinosaur',
  'fish', 'giraffe', 'monkey', 'shark', 'turtle', 'zebra',
  'whale', 'jellyfish', 'eagle', 'sparrow', 'penguin', 'octopus', 'crocodile',
  'panda', 'fox', 'koala', 'deer', 'squirrel', 'brachiosaurus', 'pterodactyl',
  'triceratops', 'stegosaurus', 'velociraptor', 'snake', 'ant', 'grasshopper',
  'tiger', 'hippo', 'camel', 'kangaroo', 'rhino', 'duckling', 'parrot',
  'budgie', 'budgie-flight', 'sparrow-flight',
  'baby-shark', 'daddy-shark', 'mommy-shark', 'grandpa-shark', 'grandma-shark',
  'toy-teddy', 'toy-duck',
];
const IDS = new Set(ANIMAL_ART_IDS);
const ALIASES = {
  puppy: 'dog', kitten: 'cat', 'bear-cub': 'bear', 'lion-cub': 'lion',
  rabbit: 'bunny', 'sea-turtle': 'turtle', piglet: 'pig', lamb: 'sheep',
  'deer-fawn': 'deer', 't-rex': 'dinosaur', goldfish: 'fish',
};

export function animalArt(id) {
  const key = ALIASES[id] || id;
  if (!IDS.has(key)) throw new Error(`Unknown illustrated animal: ${id}`);
  return `assets/animal-art/${key}.webp`;
}
