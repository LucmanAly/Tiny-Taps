"""Slice the Play House sprite sheets into trimmed, transparent PNGs.

The four uploaded sheets in assets/ are palette PNGs drawn on a plain white
page, so they cannot be drawn into the world as they are. This flood-fills the
white page from the sheet border (enclosed whites such as the summer T-shirt
or the folded blanket are untouched, because the fill never reaches them),
softens the anti-aliased rim so no white fringe is left, then cuts each grid
cell down to its artwork.

Run from the repository root:  python scripts/slice-playhouse-art.py
Output: assets/playhouse/*.png  (re-run safely; files are overwritten)
"""

import os
from PIL import Image, ImageDraw

OUT = os.path.join('assets', 'playhouse')
MARK = (255, 0, 255)
# How far from pure white still counts as page. The soft grey contact shadows
# under the characters' feet sit inside this, so they are removed too; the
# game draws its own shadows to match each pose's real footing.
THRESH = 34
# The painted outlines are a warm dark brown, never near-white; anything in
# this band beside the page is anti-aliasing and gets partial alpha.
RIM_LIGHT = 196

SHEETS = [
    ('playhouse_brother_push_sheet.png', 3, 2, [
        ['boy-winter-push-a', 'boy-rain-push-a', 'boy-summer-push-a'],
        ['boy-winter-push-b', 'boy-rain-push-b', 'boy-summer-push-b'],
    ]),
    ('playhouse_brother_toy_interactions_sheet.png', 3, 2, [
        ['boy-winter-carry', 'boy-rain-carry', 'boy-summer-carry'],
        ['boy-winter-kneel', 'boy-rain-kneel', 'boy-summer-kneel'],
    ]),
    ('playhouse_baby_reactions_sheet.png', 2, 2, [
        ['baby-reach', 'baby-hug'],
        ['baby-sleepy', 'baby-look'],
    ]),
    ('playhouse_objects_sheet.png', 3, 4, [
        ['toy-teddy', 'toy-ball', 'toy-duck'],
        ['toy-rattle', 'toy-blanket', 'toybox-closed'],
        ['toybox-open', 'bush-big', None],
        ['toybox-empty', 'bush-small', 'bush-medium'],
    ]),
]


def cut_page(sheet):
    """RGBA copy of `sheet` with the white page made transparent."""
    rgb = sheet.convert('RGB')
    w, h = rgb.size
    # Seed the fill all round the border, in case artwork touches an edge.
    for x in range(0, w, 16):
        for y in (0, h - 1):
            if rgb.getpixel((x, y)) != MARK and min(rgb.getpixel((x, y))) > 255 - THRESH:
                ImageDraw.floodfill(rgb, (x, y), MARK, thresh=THRESH)
    for y in range(0, h, 16):
        for x in (0, w - 1):
            if rgb.getpixel((x, y)) != MARK and min(rgb.getpixel((x, y))) > 255 - THRESH:
                ImageDraw.floodfill(rgb, (x, y), MARK, thresh=THRESH)

    src = rgb.load()
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            p = src[x, y]
            if p == MARK:
                continue
            a = 255
            lo = min(p)
            if lo > RIM_LIGHT and touches_page(src, x, y, w, h):
                # Partial alpha for the anti-aliased rim, then un-mix the
                # white it was blended with so the edge is not haloed.
                a = int(round(255 * (255 - lo) / (255 - RIM_LIGHT)))
                a = max(0, min(255, a))
                if a == 0:
                    continue
                k = a / 255
                p = tuple(max(0, min(255, int(round((c - 255 * (1 - k)) / k)))) for c in p)
            dst[x, y] = (p[0], p[1], p[2], a)
    return out


def touches_page(src, x, y, w, h):
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and src[nx, ny] == MARK:
                return True
    return False


def drop_strays(cell):
    """Clear small specks that touch the cell edge.

    A few pieces of art overhang their grid cell slightly (the open toy-box
    lid, a push-pose heel), and the overhang would otherwise be cut into the
    neighbouring sprite as a sliver and widen its trimmed box.
    """
    w, h = cell.size
    alpha = cell.getchannel('A').load()
    seen = bytearray(w * h)
    parts = []
    for sy in range(h):
        for sx in range(w):
            if seen[sy * w + sx] or alpha[sx, sy] <= 10:
                continue
            stack = [(sx, sy)]
            seen[sy * w + sx] = 1
            pixels = []
            edge = False
            while stack:
                x, y = stack.pop()
                pixels.append((x, y))
                if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                    edge = True
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and alpha[nx, ny] > 10:
                            seen[ny * w + nx] = 1
                            stack.append((nx, ny))
            parts.append((pixels, edge))
    if not parts:
        return cell
    biggest = max(len(p) for p, _ in parts)
    px = cell.load()
    for pixels, edge in parts:
        if len(pixels) < biggest * (0.25 if edge else 0.002):
            for x, y in pixels:
                px[x, y] = (0, 0, 0, 0)
    return cell


def trim(cell):
    cell = drop_strays(cell)
    alpha = cell.getchannel('A').point(lambda v: 255 if v > 10 else 0)
    box = alpha.getbbox()
    return cell.crop(box) if box else None


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, cols, rows, grid in SHEETS:
        sheet = Image.open(os.path.join('assets', name))
        cut = cut_page(sheet)
        cw, ch = cut.width / cols, cut.height / rows
        for r in range(rows):
            for c in range(cols):
                label = grid[r][c]
                if not label:
                    continue
                cell = cut.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
                art = trim(cell)
                if art is None:
                    print('  empty cell', name, r, c)
                    continue
                art.save(os.path.join(OUT, label + '.png'), optimize=True)
                print(f'{label:22s} {art.width:4d} x {art.height:4d}')


if __name__ == '__main__':
    main()
