// Adventure invariants: the same actions power tap, drag and resumed play.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createState,take,dropHeld,share,placeLeaf,loadBoat,ripple,stepBoat,visit } from '../js/games/babyboo/model.js';
import { createPeekaboo,beginPeekaboo,choosePumpkin,stepPeekaboo } from '../js/games/babyboo/peekaboo.js';

const s=createState();
assert.equal(take(s,'candy'),true);
visit(s,'path');assert.equal(s.held,'candy','A carried treat survives scene travel');
assert.equal(share(s),'candy');assert.equal(s.held,null);assert.equal(s.memories.shared,true);
assert.equal(share(s),null,'A repeated release cannot give the same candy twice');
assert.equal(take(s,'leaf'),true);visit(s,'pond');assert.equal(placeLeaf(s),true);
assert.equal(placeLeaf(s),false,'A leaf has only one owner');
assert.equal(take(s,'candy'),true);assert.equal(loadBoat(s),true);
assert.equal(loadBoat(s),false);assert.equal(take(s,'candy'),false,'Cargo is not simultaneously in the basket');
for(let i=0;i<30;i++)ripple(s);
assert.equal(s.boat.progress,.98,'Rapid tapping cannot skip the delivery boundary');
const restored=createState(JSON.parse(JSON.stringify(s)));
assert.equal(restored.boat.cargo,'candy');assert.equal(restored.items.leaf,'boat');
assert.equal(restored.items.candy,'boat');
visit(restored,'home');const progress=restored.boat.progress;
assert.equal(stepBoat(restored,30),null);assert.equal(restored.boat.progress,progress,'Boat waits safely while you explore another place');
visit(restored,'pond');let deliveries=0,arrivals=0;
for(let i=0;i<500;i++){
 const e=stepBoat(restored,.05);if(e==='candy')deliveries++;if(e==='arrived')arrivals++;
}
assert.equal(arrivals,1);assert.equal(deliveries,1);assert.equal(restored.boat.phase,'ready');
assert.equal(restored.memories.boat,true);assert.equal(restored.items.candy,'basket');
visit(restored,'home');assert.equal(restored.memories.home,true);
assert.equal(take(restored,'candy'),true);assert.equal(dropHeld(restored,.7),true);
assert.equal(restored.items.candy,'home');assert.equal(take(restored,'candy'),true);
visit(restored,'pond');assert.equal(loadBoat(restored),true,'The returned boat can be played again');
const invalid=createState({version:1,scene:'unknown',held:'leaf',items:{leaf:'boat',candy:'boat'},boat:{phase:'sailing',cargo:'leaf',progress:NaN}});
assert.equal(invalid.scene,'home');assert.equal(invalid.items.leaf,'held');assert.equal(invalid.items.candy,'basket');
assert.equal(invalid.boat.phase,'none');assert.equal(invalid.boat.progress,0);
const missingLeaf=createState({version:1,items:{leaf:'shared',flower:'basket',candy:'shared'}});
assert.equal(missingLeaf.items.leaf,'path');assert.equal(missingLeaf.items.flower,'path');assert.equal(missingLeaf.items.candy,'basket');

// Old saves migrate without resetting phase one. Props have exactly one owner
// in the new branch, and an unfinished boat cannot sail while playing there.
const patch=createState(JSON.parse(JSON.stringify(restored)));
visit(patch,'patch');assert.equal(patch.boat.cargo,'candy');
const paused=JSON.stringify(patch.boat);stepBoat(patch,60);assert.equal(JSON.stringify(patch.boat),paused);
assert.equal(take(patch,'candy'),false,'No imaginary candy basket in the patch');
visit(patch,'path');assert.equal(take(patch,'flower'),true);visit(patch,'patch');
dropHeld(patch,.6);const patchSave=createState(JSON.parse(JSON.stringify(patch)));
assert.equal(patchSave.scene,'patch');assert.equal(patchSave.items.flower,'patch');
assert.equal(take(patchSave,'flower'),true);assert.equal(share(patchSave),'flower');
assert.equal(createState({version:1,memories:{home:true,boat:true}}).memories.peekaboo,false);
const peek=createPeekaboo(),seen=new Set();
for(let round=0;round<4;round++){
 assert.equal(beginPeekaboo(peek,{x:.3,y:.8}),true);seen.add(peek.spot);
 assert.equal(beginPeekaboo(peek,{x:.9,y:.8}),false,'Repeated starts do not move a hiding Boo');
 assert.equal(choosePumpkin(peek,peek.spot),null,'Let the hiding motion finish');
 assert.equal(stepPeekaboo(peek,1.6),'hidden');
 assert.equal(choosePumpkin(peek,(peek.spot+1)%3),'rustle');assert.equal(peek.phase,'hidden');
 stepPeekaboo(peek,100);assert.equal(peek.phase,'hidden','No timeout or failure');
 assert.equal(choosePumpkin(peek,peek.spot),'found');
 assert.equal(choosePumpkin(peek,peek.spot),null,'Rapid reveal taps cannot repeat a completion');
 assert.equal(stepPeekaboo(peek,1.1),'complete');assert.equal(stepPeekaboo(peek,1.1),null);
}
assert.equal(seen.size,3,'Replays use all three hiding places');
patchSave.memories.peekaboo=true;
assert.equal(createState(JSON.parse(JSON.stringify(patchSave))).memories.peekaboo,true);

// All declared sprite layers must retain the same canvas and anchor and be cached.
const manifest=JSON.parse(fs.readFileSync('assets/babyboo/manifest.json','utf8'));
const sw=fs.readFileSync('sw.js','utf8');
for(const asset of ['assets/babyboo/manifest.json',...manifest.files]){
 assert.ok(fs.existsSync(asset),`Missing ${asset}`);assert.ok(sw.includes(`'${asset}'`),`Not cached: ${asset}`);
}
for(const m of Object.values(manifest.characters)){
 for(const asset of [m.body,m.blink,...Object.values(m.parts).map(p=>p.src)]){
  const bytes=fs.readFileSync(asset);assert.equal(bytes.readUInt32BE(16),m.width);assert.equal(bytes.readUInt32BE(20),m.height);
 }
 assert.ok(m.pivot[0]>=0&&m.pivot[0]<=m.width&&m.pivot[1]>=0&&m.pivot[1]<=m.height);
}
console.log('Baby Boo adventure rules, replay, save recovery, anchors and offline art passed.');
