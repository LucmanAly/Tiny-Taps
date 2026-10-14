"""Cut the Play House children's voices from Wikimedia Commons recordings.

The baby sister and her big brother giggle, coo, babble, yawn and sneeze with
real children's voices rather than oscillator blips, and her rattle is a real
rattle. They are wordless
vocalisations, like the authentic animal recordings, never narration: no
words, instructions or praise. Each clip below is a short stretch of a
public-domain or Creative Commons recording (credited in assets/CREDITS.md),
high-passed to remove room rumble, lightly denoised, faded at both ends and
levelled to sit with the animal sounds.

Run from the repository root:
    python scripts/cut-playhouse-voices.py [SOURCE_DIR]
SOURCE_DIR (default .cache/commons) holds the original recordings; any that
are missing are fetched from upload.wikimedia.org first, slowly, as Commons
rate-limits bulk downloads.
Output: assets/audio/playhouse/*.mp3  (re-run safely; files are overwritten)
"""

import os, re, subprocess, sys, time, urllib.request, urllib.error

OUT = os.path.join('assets', 'audio', 'playhouse')
UA = 'TinyTaps/1.0 (offline toddler PWA; fetching a few licensed clips once)'
COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/'

# key: (local file, Commons path, author, licence)
SOURCES = {
    'laugh9m': ('baby_laugh.ogg', '6/6b/Baby_Laugh.ogg', 'reinsamba', 'CC BY 3.0'),
    'rire': ('rire_bebe_9_mois.ogg', '9/90/Rire_de_b%C3%A9b%C3%A9_de_9_mois.ogg', 'Litlok', 'CC BY-SA 4.0'),
    'gabble': ('baby_5m_gabbling.ogg', 'a/ab/Baby_5_months_old_gabbling_laughing_practising_voice.ogg', 'stephan', 'Public domain'),
    'yawn': ('baby_yawning.ogg', '7/74/Baby_yawning_cute.ogg', 'natalie', 'Public domain'),
    'sneeze': ('baby_sneeze.ogg', 'f/f9/Baby_sneeze.ogg', 'stephan', 'Public domain'),
    'swallow': ('baby_swallow.ogg', '4/46/Baby_swallow_up.ogg', 'natalie', 'Public domain'),
    'babble14m': ('baby_14m_communicative.ogg', '7/7c/Even_tempered_baby_14_months_communicative.ogg', 'stephan', 'Public domain'),
    'rattle': ('babys_rattle.ogg', 'a/a1/Babys_rattle.ogg', 'ezwa', 'Public domain'),
    'boy4': ('boy_4y_laughing.ogg', '8/80/Four_Years_Old_child_laughing.ogg', 'morgantj', 'CC BY 3.0'),
}

# (output name, source, start s, end s[, level dB[, high-pass Hz]]). Chosen from spectrograms: laughs
# are runs of short pitch chevrons, coos one smooth vowel, babble a few
# "ah-ah" vowels; anything cry-like, a click or a cough is left out.
CLIPS = [
    # Giggles: tapped, picked up, a toy she loves.
    ('baby-laugh-1', 'laugh9m', 0.02, 1.02),
    ('baby-laugh-2', 'rire', 1.22, 1.78),
    ('baby-laugh-3', 'rire', 4.08, 5.40),
    ('baby-laugh-4', 'rire', 7.05, 7.95),
    ('baby-laugh-5', 'rire', 11.12, 12.30),
    ('baby-laugh-6', 'rire', 19.75, 20.62),
    ('baby-laugh-7', 'rire', 21.25, 22.35),
    # Delight: a wish come true, peekaboo, a ride.
    ('baby-delight-1', 'laugh9m', 0.02, 2.20),
    ('baby-delight-2', 'rire', 12.50, 14.45),
    ('baby-delight-3', 'gabble', 258.62, 260.42),
    # Babble: thinking of something, pointing at it.
    ('baby-babble-1', 'gabble', 58.15, 59.25),
    ('baby-babble-2', 'gabble', 59.22, 60.62),
    ('baby-babble-3', 'gabble', 66.98, 67.98),
    ('baby-babble-4', 'gabble', 243.12, 244.58),
    ('baby-babble-5', 'gabble', 138.22, 139.22),
    ('baby-babble-6', 'gabble', 262.33, 263.38),
    ('baby-babble-7', 'babble14m', 25.58, 26.18),
    ('baby-babble-8', 'babble14m', 53.08, 53.86),
    ('baby-babble-9', 'babble14m', 77.10, 78.18),
    ('baby-babble-10', 'babble14m', 111.60, 112.75),
    # Coos: set down, woken, cuddling her teddy.
    ('baby-coo-1', 'gabble', 270.08, 271.48, -3),
    ('baby-coo-2', 'gabble', 275.25, 276.95, -3),
    ('baby-coo-3', 'gabble', 277.38, 278.05, -3),
    ('baby-coo-4', 'gabble', 265.33, 265.85, -3),
    ('baby-coo-5', 'gabble', 73.18, 74.32, -3),
    ('baby-coo-6', 'gabble', 282.48, 283.95, -3),
    # Gulps from her bottle.
    ('baby-gulp-1', 'swallow', 0.08, 0.48, -4),
    ('baby-gulp-2', 'swallow', 1.94, 2.30, -4),
    # Settling down to sleep, and a sneeze for the flowers and the snow.
    ('baby-yawn-1', 'yawn', 2.78, 3.70, -7),
    ('baby-sneeze-1', 'sneeze', 0.10, 0.80, -3),
    ('baby-sneeze-2', 'sneeze', 1.93, 2.50, -3),
    # Her rattle (only its beads: everything below them is room noise).
    ('rattle-1', 'rattle', 0.30, 1.50, -2, 900),
    ('rattle-2', 'rattle', 2.62, 3.30, -2, 900),
    # The brother laughing.
    ('boy-laugh-1', 'boy4', 0.28, 1.36),
    ('boy-laugh-2', 'boy4', 3.18, 4.02),
    ('boy-laugh-3', 'boy4', 5.98, 6.45),
    ('boy-laugh-4', 'boy4', 8.05, 8.65),
    ('boy-laugh-5', 'boy4', 9.28, 9.70),
]

TARGET_MEAN = -21.0   # dB, as the animal recordings
PEAK_LIMIT = -2.0     # dB
CLEAN = 'highpass=f={hp},lowpass=f=10000,afftdn=nr=10:nf=-45'


def fetch(src_dir, key):
    name, path, _, _ = SOURCES[key]
    local = os.path.join(src_dir, name)
    if os.path.exists(local) and os.path.getsize(local) > 10000:
        return local
    os.makedirs(src_dir, exist_ok=True)
    for attempt in range(6):
        try:
            req = urllib.request.Request(COMMONS + path, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            if data[:4] != b'OggS':
                raise ValueError('not an Ogg file')
            with open(local, 'wb') as f:
                f.write(data)
            time.sleep(10)
            return local
        except urllib.error.HTTPError as e:
            wait = int(e.headers.get('Retry-After') or 0) or 60 * (attempt + 1)
            print(f'  {name}: HTTP {e.code}, waiting {wait}s', flush=True)
            time.sleep(wait)
    sys.exit(f'could not fetch {name}')


def measure(src, a, b, hp):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-ss', f'{a}', '-to', f'{b}', '-i', src,
                          '-af', CLEAN.format(hp=hp) + ',volumedetect', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    mean = float(re.search(r'mean_volume: (-?[\d.]+)', out).group(1))
    peak = float(re.search(r'max_volume: (-?[\d.]+)', out).group(1))
    return mean, peak


def cut(src, a, b, dest, level=0, hp=140):
    mean, peak = measure(src, a, b, hp)
    gain = min(TARGET_MEAN + level - mean, PEAK_LIMIT - peak)
    dur = b - a
    fade_out = min(0.08, dur * 0.2)
    chain = (f'{CLEAN.format(hp=hp)},volume={gain:.2f}dB,afade=t=in:d=0.015,'
             f'afade=t=out:st={dur - fade_out:.3f}:d={fade_out:.3f}')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a}', '-to', f'{b}', '-i', src,
                    '-af', chain, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', dest],
                   check=True)
    return gain


def main():
    src_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join('.cache', 'commons')
    os.makedirs(OUT, exist_ok=True)
    local = {k: fetch(src_dir, k) for k in sorted({c[1] for c in CLIPS})}
    for name, key, a, b, *opts in CLIPS:
        gain = cut(local[key], a, b, os.path.join(OUT, name + '.mp3'), *opts)
        print(f'{name}.mp3  {b - a:4.2f}s  gain {gain:+5.1f} dB')


if __name__ == '__main__':
    main()
