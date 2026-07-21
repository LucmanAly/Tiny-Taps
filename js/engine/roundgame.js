// Shared skeleton for "prompt -> N big choices -> celebrate/encourage ->
// advance" games (the pattern Colors and Shapes both hand-wrote). A config
// object describes what's different; this factory handles the round loop,
// fade transitions between rounds, the busy-lock, and correct/wrong feedback
// (including recorded-voice praise/encourage, sequenced so nothing overlaps).

import { fadeSwap } from './ui.js';
import * as stickers from './stickers.js';

export function makeRoundGame(config) {
  const {
    id, title, icon,
    optionClass = 'option-card',
    rowClass = '',
    promptAreaClass = 'prompt-area',
    nextRound,      // () => target (any shape you like)
    renderPrompt,   // (promptEl, target, ctx) => void
    options,        // (target, ctx) => [{ correct, render(btn, ctx) }]
    speakPrompt,     // (target, first, ctx) => void
    reprompt,        // (target, ctx) => void
    onWin,           // optional async ({ target, opt, btn, event, ctx }) => void, before burst+praise
    nextAnimalId,    // optional (target) => animal id, so a sticker earned this
                     // round previews the animal coming up next
    winDelay = 900,
    burstCount = 26,
  } = config;

  function start(ctx) {
    const { stage, audio, speech, celebrate, setReprompt } = ctx;
    let alive = true;
    let busy = false;
    let target = null;

    const promptArea = document.createElement('div');
    promptArea.className = promptAreaClass;
    const row = document.createElement('div');
    row.className = 'options-row' + (rowClass ? ' ' + rowClass : '');
    stage.appendChild(promptArea);
    stage.appendChild(row);

    function newRound(first, preset) {
      const build = () => {
        if (!alive) return;
        busy = false;
        target = preset || nextRound(ctx);
        renderPrompt(promptArea, target, ctx);
        row.innerHTML = '';
        options(target, ctx).forEach(opt => {
          const b = document.createElement('button');
          b.className = optionClass + ' pop-in';
          opt.render(b, ctx);
          b.addEventListener('pointerdown', async e => {
            if (!alive || busy) return;
            if (opt.correct) {
              busy = true;
              if (ctx.recordOutcome) ctx.recordOutcome(true, target.name || target.id || 'round');
              if (onWin) await onWin({ target, opt, btn: b, event: e, ctx });
              if (!alive) return;
              celebrate.burst(e.clientX, e.clientY, { count: burstCount });
              speech.praise({ quick: true });
              // Draw what's actually coming up next now (not the target that
              // was just answered) so a sticker preview matches reality, and
              // reuse that draw when the round rebuilds instead of drawing
              // again.
              const upcoming = nextRound(ctx);
              const preferredId = nextAnimalId ? nextAnimalId(upcoming) : null;
              const won = stickers.recordWin(preferredId);
              if (won) setTimeout(() => stickers.showToast(won), winDelay);
              setTimeout(() => newRound(false, upcoming), winDelay);
            } else {
              if (ctx.recordOutcome) ctx.recordOutcome(false, target.name || target.id || 'round');
              b.classList.remove('wiggle');
              void b.offsetWidth;
              b.classList.add('wiggle');
              audio.boing();
              speech.encourage();
            }
          });
          row.appendChild(b);
        });
        speakPrompt(target, first, ctx);
      };
      if (first) build();
      else fadeSwap(row, build);
    }

    setReprompt(() => reprompt(target, ctx));
    newRound(true);
    return () => { alive = false; };
  }

  return { id, title, icon, start };
}
