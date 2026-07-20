// Every spoken phrase in one place, so a second language or recorded
// parent voice only needs to touch this file (plus engine/speech.js for
// praise/encouragement variants).

export const S = {
  appName: 'Tiny Taps!',

  // peekaboo
  peekabooIntro: 'Peekaboo!',
  peekabooReprompt: 'Who is hiding?',
  reveal: name => `A ${name}!`,

  // animal sounds
  soundsIntro: 'Who makes this sound?',
  soundsReprompt: 'Who makes this sound?',
  soundsYes: name => `${name}!`,

  // colors
  colorsPrompt: name => `${name}!`,

  // shapes
  shapesPrompt: name => `${name}!`,

  // counting
  countReprompt: 'Tap to count!',

  // puzzle
  puzzleReprompt: 'Match them up!',

  // feed me
  feedHungry: name => `Feed the ${name}!`,
  feedReprompt: name => `Feed the ${name}!`,

  // coloring
  colorIntro: name => `Let's color the ${name}!`,
  colorReprompt: 'Pick a color!',
  galleryIntro: 'Your pictures!',

  // bubbles
  bubblesIntro: 'Pop the bubbles!',

  // memory
  memoryIntro: 'Find the match!',
  memoryReprompt: 'Find the match!',
  memoryMatch: name => `${name}!`,

  // music
  musicIntro: 'Tap the bars to make music!',

  // shadow match
  shadowPrompt: name => `${name}!`,
  shadowReprompt: name => `Find the ${name}!`,

  // big or small
  bigSmallPrompt: (size, name) => size === 'big' ? `Big ${name}!` : `Little ${name}!`,

  // patterns
  patternPrompt: 'What comes next?',

  // sort it
  sortIntro: 'Where does it go?',
  sortReprompt: 'Where does it go?',

  // wash the animal
  washIntro: name => `Rub the ${name} clean!`,
  washReprompt: 'Keep rubbing!',

  // trace it
  traceIntro: 'Trace the path!',
  traceReprompt: 'Follow the star!',

  // stickers
  stickerBook: n => n === 0
    ? 'Your sticker book! Play games to win stickers!'
    : `Your sticker book! You have ${n} sticker${n === 1 ? '' : 's'}!`,
};
