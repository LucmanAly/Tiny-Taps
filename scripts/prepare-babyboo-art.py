#!/usr/bin/env python3
"""Preserve the approved front drawings as anchored, layered game cutouts.

The original renderer/atlases were not supplied. This deliberately extracts the
approved reference art instead of inventing replacement character models.
Pillow does all preparation; no image generation service is involved.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import binary_fill_holes, binary_dilation

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/babyboo'
source = Image.open(OUT / 'source/cast-reference.png').convert('RGB')
BG = np.array(source.getpixel((80, 210)), dtype=float)
MODELS = {
    'daddy': dict(box=(104, 222, 362, 507), color='#F9FBFF', edge='#D7D4EE', pivot=(129, 279),
        eyes=[(185,294,218,344),(249,294,284,344)],
        parts={'left-arm':[(145,350),(129,355),(101,379),(104,406),(131,408),(146,387)],
               'right-arm':[(320,351),(339,358),(363,381),(362,405),(336,406),(320,389)]},
        joints={'left-arm':(141,358),'right-arm':(324,358)}),
    'mommy': dict(box=(500, 251, 724, 508), color='#FFF0F7', edge='#D7D4EE', pivot=(112, 251),
        eyes=[(565,310,597,366),(624,311,656,366)],
        parts={'left-arm':[(539,365),(522,371),(500,397),(500,416),(521,420),(539,400)],
               'right-arm':[(687,366),(702,373),(725,399),(725,418),(706,421),(686,399)]},
        joints={'left-arm':(535,375),'right-arm':(690,375)}),
    'boo': dict(box=(919, 337, 1057, 506), color='#F9FBFF', edge='#D7D4EE', pivot=(69, 164),
        eyes=[(960,388,982,422),(995,388,1018,422)],
        parts={'left-arm':[(944,423),(933,428),(919,441),(921,452),(936,452),(944,443)],
               'right-arm':[(1034,423),(1046,428),(1058,442),(1056,453),(1044,454),(1033,442)]},
        joints={'left-arm':(942,429),'right-arm':(1035,429)}),
    'monster': dict(box=(1262, 243, 1469, 507), color='#A16CDB', edge='#72469F', pivot=(104, 257),
        eyes=[(1307,326,1363,385),(1373,326,1430,385)],
        parts={'left-arm':[(1288,373),(1272,376),(1261,391),(1264,407),(1279,417),(1290,407)],
               'right-arm':[(1443,373),(1458,378),(1471,390),(1470,407),(1454,417),(1441,405)],
               'left-foot':[(1283,482),(1315,478),(1344,493),(1345,506),(1282,507)],
               'right-foot':[(1390,493),(1420,478),(1453,482),(1457,507),(1388,507)]},
        joints={'left-arm':(1288,390),'right-arm':(1443,390),
                'left-foot':(1324,487),'right-foot':(1408,487)}),
}

def extract(cfg):
    rgb = np.asarray(source.crop(cfg['box'])).astype(float)
    edge = np.array(tuple(bytes.fromhex(cfg['edge'][1:])), dtype=float)
    delta = np.max(rgb - BG, axis=2)
    solid = binary_fill_holes((delta > 24) & (np.max(rgb, axis=2) > 100))
    # Recover the lightly antialiased exterior against the known flat card.
    rim = binary_dilation(solid) & ~solid & (delta > 2)
    alpha = solid.astype(float)
    alpha[rim] = np.clip(delta[rim] / max(edge - BG), 0, 1)
    a = alpha[...,None]
    unmatted = np.clip((rgb - BG * (1-a)) / np.maximum(a, .001), 0, 255)
    return Image.fromarray(np.uint8(np.dstack((unmatted,alpha*255))), 'RGBA')

manifest = {'version':1,'kind':'layered-front-view-cutouts',
    'provenance':'Approved Cast_Reference.png and Home_Reference.png supplied by owner.',
    'note':'Base drawings preserved. Layer motion/blinks are production variants; no profile/back views or original atlases claimed.',
    'characters':{}, 'files':[]}
preview = Image.new('RGBA',(1200,440),'#211633')
for index,(name,cfg) in enumerate(MODELS.items()):
    image = extract(cfg)
    image.save(OUT / f'{name}-front.png')
    x0,y0,_,_ = cfg['box']
    body = image.copy()
    parts = {}
    for part,points in cfg['parts'].items():
        mask=Image.new('L',image.size)
        ImageDraw.Draw(mask).polygon([(x-x0,y-y0) for x,y in points],fill=255)
        layer=image.copy()
        layer.putalpha(Image.fromarray(np.minimum(np.array(image.getchannel('A')),np.array(mask))))
        body.putalpha(Image.fromarray(np.where(np.array(mask)>0,0,np.array(body.getchannel('A'))).astype('uint8')))
        layer.save(OUT / f'{name}-{part}.png')
        parts[part]={'src':f'assets/babyboo/{name}-{part}.png',
            'joint':[cfg['joints'][part][0]-x0,cfg['joints'][part][1]-y0]}
    blink=body.copy()
    d=ImageDraw.Draw(blink)
    for xx,yy,xx2,yy2 in cfg['eyes']:
        box=(xx-x0,yy-y0,xx2-x0,yy2-y0)
        d.ellipse(box,fill=cfg['color'])
        # Eyelids are drawn at 2x and downsampled to keep their curves smooth.
        lid=Image.new('RGBA',(image.width*2,image.height*2))
        ld=ImageDraw.Draw(lid)
        cx=(box[0]+box[2])/2; cy=(box[1]+box[3])/2
        ld.arc((int((cx-(box[2]-box[0])*.30)*2),int((cy-5)*2),int((cx+(box[2]-box[0])*.30)*2),int((cy+6)*2)),0,180,fill='#30203F',width=4)
        blink.alpha_composite(lid.resize(image.size,Image.Resampling.LANCZOS))
    body.save(OUT/f'{name}-body.png')
    blink.save(OUT/f'{name}-blink.png')
    manifest['characters'][name]={'width':image.width,'height':image.height,'pivot':list(cfg['pivot']),
        'body':f'assets/babyboo/{name}-body.png','blink':f'assets/babyboo/{name}-blink.png',
        'parts':parts,'animations':{'blinkMs':160,'idleMs':3200,'walkMs':720,'waveMs':1800}}
    ratio=1.1
    preview.alpha_composite(image.resize((int(image.width*ratio),int(image.height*ratio))),
        (int(index*300+150-image.width*ratio/2),int(385-image.height*ratio)))
# Keep the exact lavender house geometry from the approved exterior.
home=Image.open(OUT/'source/home-reference.png').convert('RGBA')
mask=Image.new('L',home.size)
d=ImageDraw.Draw(mask)
d.polygon([(550,317),(755,131),(961,317)],fill=255)
d.rectangle((587,313,923,545),fill=255)
home.putalpha(mask)
home.crop((548,129,964,547)).save(OUT/'house.png')
manifest['house']='assets/babyboo/house.png'
manifest['files']=[f'assets/babyboo/{p.name}' for p in sorted(OUT.glob('*.png'))]
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
preview.convert('RGB').save(ROOT/'docs/baby-boo/cutout-preview.jpg',quality=92)
print(f'Prepared {len(manifest["files"])} anchored layers from approved drawings.')
