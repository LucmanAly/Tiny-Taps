// Play House voices: the baby sister and her big brother giggle, coo,
// babble, yawn and sneeze with real children's recordings (cut by
// scripts/cut-playhouse-voices.py, credited in assets/CREDITS.md). They are
// wordless, like the animal recordings: never narration, instructions or
// praise.
//
// Each sound has a few takes, never the same one twice running, at a slightly
// different pitch each time. One plays at a time per child: a bigger moment
// (delight) cuts in over a smaller one, while a smaller one waits its turn
// rather than chopping the last giggle off. Until a take has loaded, the old
// synthesized sound plays instead, so a child is never silent.

const BASE = 'assets/audio/playhouse/';

// kind: [file prefix, takes, priority, volume, synthesized stand-in, always cuts in]
const KINDS = {
  baby: {
    delight: ['baby-delight-', 3, 3, 0.95, a => a.giggle()],
    laugh: ['baby-laugh-', 7, 2, 0.9, a => a.giggle()],
    babble: ['baby-babble-', 10, 2, 0.85, a => a.babble()],
    sneeze: ['baby-sneeze-', 2, 2, 0.85, a => a.pop()],
    coo: ['baby-coo-', 6, 1, 0.85, a => a.coo()],
    gulp: ['baby-gulp-', 2, 1, 0.8, a => a.glug()],
    yawn: ['baby-yawn-', 1, 1, 0.9, a => a.sleepyCoo()],
  },
  boy: {
    laugh: ['boy-laugh-', 5, 2, 0.8, () => {}],
  },
  // Not a voice, but recorded too: her rattle's real beads, which answer every
  // shake at once.
  toy: {
    rattle: ['rattle-', 2, 1, 0.85, a => a.rattleShake(), true],
  },
};

export const VOICE_FILES = Object.values(KINDS).flatMap(kinds => Object.values(kinds)
  .flatMap(([prefix, n]) => Array.from({ length: n }, (_, i) => `${BASE}${prefix}${i + 1}.mp3`)));

export function createVoices(W) {
  const { audio } = W;
  for (const url of VOICE_FILES) audio.load('ph:' + url, url);

  const last = {};                       // kind -> last take, per child
  const busy = { baby: 0, boy: 0, toy: 0 };      // until when (W.t) each is sounding
  const busyPri = { baby: 0, boy: 0, toy: 0 };

  function say(who, kind) {
    const spec = KINDS[who][kind];
    if (!spec || !W.isAlive()) return;
    const [prefix, n, pri, volume, stand, cuts] = spec;
    if (W.t < busy[who] && pri <= busyPri[who] && !cuts) return;
    const key = who + kind;
    let take = 1 + ((Math.random() * n) | 0);
    if (n > 1 && take === last[key]) take = (take % n) + 1;
    last[key] = take;
    const name = 'ph:' + BASE + prefix + take + '.mp3';
    const rate = 0.96 + Math.random() * 0.08;
    if (audio.playVoice(name, { channel: 'ph-' + who, volume, rate })) {
      busy[who] = W.t + audio.duration(name) / rate;
      busyPri[who] = pri;
    } else {
      stand(audio);
    }
  }

  W.voice = {
    baby: kind => say('baby', kind),
    boy: kind => say('boy', kind),
    rattle: () => say('toy', 'rattle'),
  };
  return W.voice;
}
