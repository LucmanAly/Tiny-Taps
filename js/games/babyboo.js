import { startAdventure } from './babyboo/world.js';

export default {
  id: 'babyboo',
  title: 'Baby Boo',
  icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="3" y="3" width="94" height="94" rx="24" fill="#30204D"/>
    <circle cx="77" cy="24" r="13" fill="#FFB23B"/>
    <image href="assets/babyboo/monster-front.png" x="44" y="30" width="43" height="58"/>
    <image href="assets/babyboo/boo-front.png" x="12" y="40" width="40" height="49"/>
    <circle cx="22" cy="25" r="2" fill="#FFF3AF"/>
  </svg>`,
  start: startAdventure,
};
