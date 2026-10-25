// Adventure invariants: the same actions power tap, drag and resumed play.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createState,take,dropHeld,share,placeLeaf,loadBoat,ripple,stepBoat,visit } from '../js/games/babyboo/model.js';

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
