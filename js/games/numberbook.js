// Number Book: a calm, full-screen counting deck. Tapping the page speaks the
// number currently on it, then turns to the next page. The two visible modes
// cover every number from 0–100 and tens/place values through one trillion.

export const COUNTING_NUMBERS = Array.from({ length: 101 }, (_, index) => index);

export const BIG_NUMBER_SEQUENCE = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
  1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000,
  1_000_000_000, 10_000_000_000, 100_000_000_000, 1_000_000_000_000,
];

const SMALL_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS_WORDS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty',
  'seventy', 'eighty', 'ninety'];
const SCALES = [
  [1_000_000_000_000, 'trillion'],
  [1_000_000_000, 'billion'],
  [1_000_000, 'million'],
  [1_000, 'thousand'],
];

function underThousand(value) {
  const words = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  if (hundreds) words.push(SMALL_WORDS[hundreds], 'hundred');
  if (rest < 20) {
    if (rest) words.push(SMALL_WORDS[rest]);
  } else {
    const tens = TENS_WORDS[Math.floor(rest / 10)];
    const ones = rest % 10;
    words.push(ones ? `${tens}-${SMALL_WORDS[ones]}` : tens);
  }
  return words.join(' ');
}

export function numberWords(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000_000) {
    throw new RangeError('Number Book supports whole numbers from zero to one trillion');
  }
  if (value < 20) return SMALL_WORDS[value];

  let remaining = value;
  const words = [];
  for (const [size, name] of SCALES) {
    if (remaining < size) continue;
    const amount = Math.floor(remaining / size);
    words.push(underThousand(amount), name);
    remaining %= size;
  }
  if (remaining) words.push(underThousand(remaining));
  return words.join(' ');
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function numberSize(value) {
  const length = formatNumber(value).length;
  if (length >= 14) return 'smallest';
  if (length >= 11) return 'tiny';
  if (length >= 8) return 'smaller';
  if (length >= 6) return 'small';
  if (length >= 5) return 'compact';
  return 'large';
}

export function numberVoicePath(value) {
  return `assets/audio/numbers/${value}.mp3`;
}

function numberVoiceKey(value) {
  return `number-book:${value}`;
}

export const DEFAULT_PAGE_DELAY = 0.25;
export const PAGE_DELAY_STORAGE_KEY = 'tinytaps-number-book-delay';

export function normalizePageDelay(value) {
  if (value === null || value === undefined || value === '') return DEFAULT_PAGE_DELAY;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_PAGE_DELAY;
  return Math.round(Math.max(0, Math.min(2, parsed)) * 4) / 4;
}

export function pageDelayLabel(value) {
  const delay = normalizePageDelay(value);
  if (delay === 0) return 'Instant';
  return `${delay.toFixed(delay % 1 ? 2 : 0)} ${delay === 1 ? 'second' : 'seconds'}`;
}

const MODES = {
  counting: {
    title: 'Counting',
    range: '0–100',
    kicker: 'COUNT WITH ME',
    numbers: COUNTING_NUMBERS,
  },
  big: {
    title: '10s & Big Numbers',
    range: 'to 1 trillion',
    kicker: 'BIG NUMBER BOOK',
    numbers: BIG_NUMBER_SEQUENCE,
  },
};

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="nb-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6957dc"/><stop offset="1" stop-color="#a76de8"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="84" height="84" rx="22" fill="url(#nb-bg)"/>
  <path d="M17 25c12-4 23-2 33 5v48c-10-7-21-9-33-5z" fill="#fff3c9"/>
  <path d="M83 25c-12-4-23-2-33 5v48c10-7 21-9 33-5z" fill="#fff"/>
  <path d="M50 30v48" fill="none" stroke="#d9cfee" stroke-width="2"/>
  <text x="33.5" y="58" text-anchor="middle" font-size="23" font-weight="900"
        font-family="Arial Rounded MT Bold, sans-serif" fill="#5a4bc5">1</text>
  <text x="67" y="58" text-anchor="middle" font-size="20" font-weight="900"
        font-family="Arial Rounded MT Bold, sans-serif" fill="#ed6e74">10</text>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, setReprompt } = ctx;
  let alive = true;
  let turning = false;
  let nextTimer = 0;
  let turnTimer = 0;
  let settleTimer = 0;
  let voiceRequest = 0;
  let modeId = localStorage.getItem('tinytaps-number-book-mode') === 'big' ? 'big' : 'counting';
  let pageDelay = normalizePageDelay(localStorage.getItem(PAGE_DELAY_STORAGE_KEY));
  let index = 0;

  stage.classList.add('number-book-stage');
  stage.innerHTML = `
    <div class="number-book-glow number-book-glow-one"></div>
    <div class="number-book-glow number-book-glow-two"></div>
    <div class="number-book-tabs" role="group" aria-label="Choose counting mode"></div>
    <div class="number-book-scene">
      <div class="number-book-page-shadow page-shadow-back"></div>
      <div class="number-book-page-shadow page-shadow-middle"></div>
      <button class="number-book-page" type="button">
        <span class="number-book-sparkle sparkle-one" aria-hidden="true">✦</span>
        <span class="number-book-sparkle sparkle-two" aria-hidden="true">●</span>
        <span class="number-book-kicker"></span>
        <span class="number-book-number"></span>
        <span class="number-book-words"></span>
        <span class="number-book-tap-hint" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <path d="M11.8 15.1V7.3a2.2 2.2 0 0 1 4.4 0v6.4-2.4a2.1 2.1 0 0 1 4.2 0v2.8-1.7a2.1 2.1 0 0 1 4.2 0v2.5-1.2a2.1 2.1 0 0 1 4.2 0v5.1c0 6.1-3.8 10.2-9.8 10.2h-1.4c-3.4 0-5.5-1.3-7.4-3.7l-4.8-6.1a2.4 2.4 0 0 1 3.6-3.1l2.8 3.1z"
                  fill="#fff" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          Tap the number
        </span>
        <span class="number-book-fold" aria-hidden="true"></span>
      </button>
    </div>
    <div class="number-book-footer">
      <div class="number-book-progress" aria-live="polite"></div>
      <div class="number-book-actions">
        <button class="number-book-settings-button" type="button"
                aria-label="Number Book settings" aria-expanded="false">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.8 3.5h4.4l.7 2.2 1.3.8 2.2-.5 2.2 3.8-1.5 1.7v1.1l1.5 1.7-2.2 3.8-2.2-.5-1.3.8-.7 2.2H9.8l-.7-2.2-1.3-.8-2.2.5-2.2-3.8 1.5-1.7v-1.1L3.4 9.8 5.6 6l2.2.5 1.3-.8z"
                  fill="none" stroke="currentColor" stroke-width="1.8"
                  stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor"
                    stroke-width="1.8"/>
          </svg>
          Timing
        </button>
        <button class="number-book-reset" type="button" aria-label="Reset counting">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5.1 8.2A8 8 0 1 1 4 14" fill="none" stroke="currentColor"
                  stroke-width="2.3" stroke-linecap="round"/>
            <path d="M4.7 3.8v5h5" fill="none" stroke="currentColor"
                  stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Reset
        </button>
      </div>
    </div>
    <div class="number-book-settings" hidden>
      <div class="number-book-settings-card" role="dialog" aria-modal="true"
           aria-labelledby="number-book-settings-title">
        <div class="number-book-settings-heading">
          <div>
            <small>NUMBER BOOK</small>
            <h2 id="number-book-settings-title">Page timing</h2>
          </div>
          <button class="number-book-settings-close" type="button" aria-label="Close settings">×</button>
        </div>
        <label class="number-book-delay-label" for="number-book-delay">
          <span>Delay before next number</span>
          <output class="number-book-delay-value" for="number-book-delay"></output>
        </label>
        <input class="number-book-delay" id="number-book-delay" type="range"
               min="0" max="2" step="0.25">
        <div class="number-book-delay-scale" aria-hidden="true">
          <span>Instant</span><span>1 second</span><span>2 seconds</span>
        </div>
        <p>The voice starts right away. This controls when the next page appears.</p>
      </div>
    </div>`;

  const tabs = stage.querySelector('.number-book-tabs');
  const page = stage.querySelector('.number-book-page');
  const kicker = stage.querySelector('.number-book-kicker');
  const number = stage.querySelector('.number-book-number');
  const words = stage.querySelector('.number-book-words');
  const progress = stage.querySelector('.number-book-progress');
  const reset = stage.querySelector('.number-book-reset');
  const settingsButton = stage.querySelector('.number-book-settings-button');
  const settings = stage.querySelector('.number-book-settings');
  const settingsCard = stage.querySelector('.number-book-settings-card');
  const settingsClose = stage.querySelector('.number-book-settings-close');
  const delayInput = stage.querySelector('.number-book-delay');
  const delayValue = stage.querySelector('.number-book-delay-value');

  function closeSettings() {
    settings.hidden = true;
    settingsButton.setAttribute('aria-expanded', 'false');
  }

  function cancelPendingTurn(stopVoice = false) {
    clearTimeout(nextTimer);
    clearTimeout(turnTimer);
    clearTimeout(settleTimer);
    nextTimer = 0;
    turnTimer = 0;
    settleTimer = 0;
    voiceRequest += 1;
    turning = false;
    page.classList.remove('speaking', 'turning', 'arriving');
    if (stopVoice) audio.stopPlayback();
  }

  for (const [id, mode] of Object.entries(MODES)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'number-book-tab';
    button.dataset.mode = id;
    button.innerHTML = `<span>${mode.title}</span><small>${mode.range}</small>`;
    button.addEventListener('pointerdown', event => {
      event.stopPropagation();
      if (!alive || modeId === id) return;
      // Mode changes are navigation, not page turns: cancel any pending wait
      // or voice and show the other deck immediately.
      cancelPendingTurn(true);
      closeSettings();
      modeId = id;
      index = 0;
      localStorage.setItem('tinytaps-number-book-mode', modeId);
      audio.chime();
      render();
    });
    tabs.appendChild(button);
  }

  function render() {
    if (!alive) return;
    const mode = MODES[modeId];
    const value = mode.numbers[index];
    const formatted = formatNumber(value);
    const spoken = numberWords(value);
    kicker.textContent = mode.kicker;
    number.textContent = formatted;
    words.textContent = spoken;
    progress.textContent = `${index + 1} of ${mode.numbers.length}`;
    page.dataset.size = numberSize(value);
    page.dataset.theme = String(index % 5);
    page.setAttribute('aria-label', `${spoken}. Tap to hear it and turn the page.`);
    for (const tab of tabs.children) {
      const selected = tab.dataset.mode === modeId;
      tab.classList.toggle('selected', selected);
      tab.setAttribute('aria-pressed', String(selected));
    }
    // The service worker stores every clip offline. Warm the visible page and
    // its next page into decoded audio buffers so taps begin promptly.
    audio.load(numberVoiceKey(value), numberVoicePath(value));
    const nextValue = mode.numbers[(index + 1) % mode.numbers.length];
    audio.load(numberVoiceKey(nextValue), numberVoicePath(nextValue));
  }

  function turnPage(changePage) {
    turning = true;
    page.classList.remove('arriving');
    page.classList.add('turning');
    clearTimeout(turnTimer);
    clearTimeout(settleTimer);
    turnTimer = setTimeout(() => {
      if (!alive) return;
      changePage();
      page.classList.remove('turning');
      page.classList.add('arriving');
      turnTimer = 0;
      settleTimer = setTimeout(() => {
        if (!alive) return;
        page.classList.remove('arriving');
        turning = false;
        settleTimer = 0;
      }, 300);
    }, 260);
  }

  page.addEventListener('pointerdown', event => {
    event.stopPropagation();
    if (!alive || turning) return;
    const mode = MODES[modeId];
    const value = mode.numbers[index];
    const tappedMode = modeId;
    const request = ++voiceRequest;
    turning = true;
    page.classList.add('speaking');
    audio.unlock();

    // Start the same bundled Piper voice immediately on every device. Speech
    // and page timing run independently, so a long recording never forces a
    // long wait before the next number.
    Promise.resolve(audio.load(numberVoiceKey(value), numberVoicePath(value)))
      .then(loaded => {
        if (!loaded || !alive || request !== voiceRequest || tappedMode !== modeId) return;
        return audio.play(numberVoiceKey(value), { rate: speech.getUserRate() });
      })
      .catch(() => {})
      .then(() => {
        if (!alive || request !== voiceRequest) return;
        page.classList.remove('speaking');
      });

    // Start the 260 ms page-turn animation early enough that the new number
    // appears at the chosen delay. "Instant" skips the animation entirely.
    const waitBeforeTurn = pageDelay === 0 ? 0 : Math.max(0, pageDelay * 1000 - 260);
    nextTimer = setTimeout(() => {
      nextTimer = 0;
      if (!alive || request !== voiceRequest || tappedMode !== modeId) return;
      voiceRequest += 1;
      page.classList.remove('speaking');
      audio.pop();
      if (pageDelay === 0) {
        index = (index + 1) % mode.numbers.length;
        turning = false;
        render();
        return;
      }
      turnPage(() => {
        index = (index + 1) % mode.numbers.length;
        render();
      });
    }, waitBeforeTurn);
  });

  settingsButton.addEventListener('pointerdown', event => {
    event.stopPropagation();
    if (!alive) return;
    const opening = settings.hidden;
    settings.hidden = !opening;
    settingsButton.setAttribute('aria-expanded', String(opening));
    if (opening) {
      delayInput.value = String(pageDelay);
      delayValue.textContent = pageDelayLabel(pageDelay);
    }
  });

  settings.addEventListener('pointerdown', event => {
    event.stopPropagation();
    if (event.target === settings) closeSettings();
  });
  settingsCard.addEventListener('pointerdown', event => event.stopPropagation());
  settingsClose.addEventListener('pointerdown', event => {
    event.stopPropagation();
    closeSettings();
  });

  delayInput.addEventListener('input', event => {
    pageDelay = normalizePageDelay(event.target.value);
    delayValue.textContent = pageDelayLabel(pageDelay);
    localStorage.setItem(PAGE_DELAY_STORAGE_KEY, String(pageDelay));
  });

  reset.addEventListener('pointerdown', event => {
    event.stopPropagation();
    if (!alive || turning) return;
    audio.chime();
    turnPage(() => {
      index = 0;
      render();
    });
  });

  setReprompt(null);
  delayInput.value = String(pageDelay);
  delayValue.textContent = pageDelayLabel(pageDelay);
  render();

  return () => {
    alive = false;
    cancelPendingTurn(true);
    closeSettings();
    stage.classList.remove('number-book-stage');
  };
}

export default {
  id: 'numberbook',
  title: 'Number Book',
  icon: ICON,
  start,
};
