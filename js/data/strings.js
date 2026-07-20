// Every spoken phrase in one place, so a second language or recorded
// parent voice only needs to touch this file (plus engine/speech.js for
// praise/encouragement variants).

export const S = {
  appName: 'Tiny Taps!',

  // peekaboo
  peekabooIntro: 'Peekaboo! Who is hiding? Tap and see!',
  peekabooMore: 'More friends are hiding! Tap and see!',
  peekabooReprompt: 'Tap a square! Who is hiding?',
  reveal: name => `A ${name}!`,

  // animal sounds
  soundsIntro: 'Listen! Who makes this sound?',
  soundsReprompt: 'Who makes this sound? Tap the animal!',
  soundsYes: name => `Yes! The ${name}!`,

  // colors
  colorsPrompt: name => `Tap the ${name} balloon!`,

  // shapes
  shapesPrompt: name => `Where is the ${name}? Tap the ${name}!`,

  // counting
  countIntro: name => `Let's count the ${name}s! Tap each one!`,
  countReprompt: name => `Tap the ${name}s to count them!`,
  countTotal: (word, name, plural) => `${word} ${name}${plural ? 's' : ''}!`,

  // puzzle
  puzzleIntro: 'Put each animal in its spot!',
  puzzleReprompt: 'Drag the animals to their spots!',

  // feed me
  feedHungry: name => `The ${name} is hungry! Feed the ${name}!`,
  feedReprompt: name => `Drag the food to the ${name}'s mouth!`,
  feedYum: name => `Yum yum! The ${name} loves it!`,
  feedNo: name => `No no, the ${name} does not eat that! Try again!`,

  // coloring
  colorIntro: name => `Let's color the ${name}! Pick a color, then tap the picture!`,
  colorReprompt: 'Tap a color dot, then tap the picture to color it!',
  colorDone: 'What a beautiful picture!',
  galleryIntro: 'Your beautiful pictures!',

  // bubbles
  bubblesIntro: 'Pop the bubbles!',

  // memory
  memoryIntro: 'Find the matching friends! Tap two cards!',
  memoryReprompt: 'Tap a card, then find its twin!',
  memoryMatch: name => `Two ${name}s! A match!`,

  // music
  musicIntro: 'Tap the bars to make music!',

  // shadow match
  shadowPrompt: name => `Whose shadow is this? Find the ${name}!`,
  shadowReprompt: name => `Tap the ${name} to match the shadow!`,

  // big or small
  bigSmallPrompt: (size, name) => size === 'big' ? `Tap the BIG ${name}!` : `Tap the little ${name}!`,

  // patterns
  patternPrompt: 'What comes next? Tap the color!',

  // sort it
  sortIntro: 'Where does it go? Drag it home!',
  sortReprompt: 'Drag the animal to its home!',
  sortYes: name => `Yes! The ${name} lives there!`,
  sortNo: 'Not quite — try another home!',

  // wash the animal
  washIntro: name => `Oh no, the ${name} is muddy! Rub it clean!`,
  washReprompt: 'Keep rubbing to clean the mud!',
  washDone: name => `All clean! Sparkly ${name}!`,

  // trace it
  traceIntro: 'Trace the path with your finger!',
  traceReprompt: 'Follow the glowing star with your finger!',
  traceDone: 'Great tracing!',

  // stickers
  stickerBook: n => n === 0
    ? 'Your sticker book! Play games to win stickers!'
    : `Your sticker book! You have ${n} sticker${n === 1 ? '' : 's'}!`,
};
