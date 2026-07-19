export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickN(arr, n) {
  return shuffle(arr).slice(0, n);
}

export function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function randFloat(min, max) {
  return min + Math.random() * (max - min);
}

// Returns a picker over `arr` that never returns the same item twice in a row
// and cycles through everything before repeating.
export function cycler(arr) {
  let bag = [];
  let last = null;
  return () => {
    if (bag.length === 0) {
      bag = shuffle(arr);
      if (bag.length > 1 && bag[0] === last) bag.push(bag.shift());
    }
    last = bag.shift();
    return last;
  };
}
