import { childKey } from '../../engine/children.js';
import { quietMotion } from '../../engine/calm.js';
import { tapPlaceEnabled } from '../../engine/drag.js';
import * as rules from './model.js';
import { createPeekaboo, beginPeekaboo, choosePumpkin, stepPeekaboo, playingPeekaboo } from './peekaboo.js';
import { loadArt, geometry, drawScenery, character, candy, leaf, flower, basket,
  pumpkin, heart, thought, sign, ellipse, mix, ease } from './art.js';

const KEY = 'tinytaps-babyboo-v1';
const TITLES = { home: 'Lavender House', path: 'The Jungle Path', pond: 'Moonlit Pond', patch: 'Pumpkin Patch' };
const CUES = {
  basket: 'A little treat to share.', monster: 'Take it to your friend.',
  leaf: 'A big leaf. What could it be?', next: 'Let’s go exploring.',
  previous: 'There’s a leaf on the jungle path.', dock: 'A leaf can be a little boat.',
  boat: 'Put your treat on the leaf.', water: 'Tap the water. Here it comes!',
  mommy: 'A flower for someone you love.',
  peekaboo: 'Play peekaboo with Boo. Look for his little curl!',
};
const ITEM_DRAW = { candy, leaf, flower };
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

export function startAdventure(ctx) {
  const { stage, audio, speech, recordOutcome, setReprompt } = ctx;
  let saved;
  const storageKey = childKey(KEY); // Capture now; cleanup always writes to this child.
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { /* optional */ }
  const state = rules.createState(saved);
  let alive = true, art = null, raf = 0, last = 0, t = 0, L;
  let view = { scale:1, W:1100,H:760 }, transition = null, tasks = [];
  let pointer = null, drag = null, pickup = null, gift = null, hug = 0;
  let glow = 0, glowUntil = 0, lastInput = 0, hint = null, captionUntil = 0;
  let scenery = { rustle:0,mushroom:0,window:false }, ripples = [], motes = [];
  let tripGift = state.memories.boat && !state.memories.home;
  let monsterHappy = 0, waveUntil = 2.5;
  let peek = createPeekaboo();
  const actors = { boo:{x:0,y:0,v:0},monster:{x:0,y:0,v:0} };
  const targets = new Map();
  const aborter = new AbortController();

  const root = document.createElement('section');
  root.className = 'bb-world'; root.setAttribute('aria-label', 'Baby Boo’s little jungle adventures');
  root.innerHTML = `<canvas class="bb-canvas" aria-hidden="true"></canvas>
    <div class="bb-heading"><span class="bb-brand">BABY BOO</span><span class="bb-place"></span></div>
    <p class="bb-caption" role="status" aria-live="polite"></p>
    <p class="bb-access-help">Tap a friend or object to play. Tap the ground to move Boo.
      Carry a leaf to the pond, place it on the water, add a candy and tap the water.
      The pumpkin sign on the jungle path leads to peekaboo. Tap the picture of Boo
      to start, then look for his curl and tap a pumpkin. There is no time limit.
      Tap Boo to glow. Use the path signs to explore, or the app’s Home button to leave.</p>
    <div class="bb-loading"><span>One little moment…</span></div>`;
  stage.appendChild(root);
  const canvas = root.querySelector('canvas');
  const g = canvas.getContext('2d');
  const placeLabel = root.querySelector('.bb-place');
  const captionEl = root.querySelector('.bb-caption');
  const loader = root.querySelector('.bb-loading');
  setReprompt(null);

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* private browsing/storage full: still playable */ }
  }
  function publish() {
    root.dataset.scene = state.scene; root.dataset.held = state.held || '';
    root.dataset.boat = state.boat.phase; root.dataset.cargo = state.boat.cargo || '';
    root.dataset.delivered = String(state.memories.boat); root.dataset.shared = String(state.memories.shared); root.dataset.completed = String(state.memories.home);
    root.dataset.peekaboo = peek.phase; root.dataset.foundBoo = String(state.memories.peekaboo);
    placeLabel.textContent = TITLES[state.scene];
    if(t>=captionUntil)captionEl.textContent = cue();
  }
  function say(text, seconds=3) { captionEl.textContent=text; captionUntil=t+seconds; }
  function cue() {
    if(state.scene==='patch'&&playingPeekaboo(peek))return peek.phase==='hiding'?'Boo is finding a cozy hiding place.':'Where is Boo? Look for his little curl.';
    return CUES[rules.nextHint(state)] || 'Play a little. Explore together.';
  }
  function sound(name,...args) { if(alive)audio[name]?.(...args); }
  function outcome(detail) { recordOutcome(true, detail); speech.praise({quick:true}); }
  function sparkle(x,y,color='#FFF3AF',count=7) {
    if(quietMotion())return;
    for(let i=0;i<count;i++)motes.push({x,y,vx:Math.cos(i*2.4)*30,vy:-28-Math.sin(i)*20,life:1.4,color});
  }
  function rippleAt(x,y) { ripples.push({x,y,age:0}); sound('splash'); }

  function resize() {
    const r=root.getBoundingClientRect();
    if(!r.width||!r.height)return;
    const old=L;
    const scale=r.width/r.height < .9 ? r.width/720 : Math.min(r.width/1100,r.height/760);
    view={scale,W:r.width/scale,H:r.height/scale};
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
    g.setTransform(dpr*scale,0,0,dpr*scale,0,0);
    L=geometry(view.W,view.H,state.scene);
    for(const name of ['boo','monster']) {
      if(old){ actors[name].x=actors[name].x/old.W*L.W;actors[name].y=actors[name].y/old.H*L.H; }
      else Object.assign(actors[name],L[name]);
    }
    if(old)for(const task of tasks){ task.x=task.x/old.W*L.W;task.y=task.y/old.H*L.H; }
    // A rotated screen cancels only a finger gesture, never its carried item.
    if(pointer){ pointer=null;drag=null; }
    ripples=[];
  }
  const observer = new ResizeObserver(resize);observer.observe(root);
  window.addEventListener('resize',resize);
  window.addEventListener('pagehide',save);
  const visibility=()=>{last=0;if(document.hidden)save();};
  document.addEventListener('visibilitychange',visibility);

  function positionItem(name) {
    const p=L[name] || L.basket;
    const drop=state.dropped[name];
    return drop?{x:drop.x*L.W,y:L.H*.87}:p;
  }
  function carryPoint() {
    const b=actors.boo;
    return {x:b.x+37*L.scale,y:b.y-63*L.scale};
  }
  function boatPoint() {
    const b=state.boat;
    let p=b.phase==='ready'?0:b.phase==='returning'?1-ease(clamp(b.progress,0,1)):b.phase==='arrived'?1:ease(clamp(b.progress,0,1));
    return {x:mix(L.dock.x,L.W*.76,p),y:mix(L.dock.y,L.H*.63,p)-Math.sin(p*Math.PI)*L.H*.055};
  }
  function target(id,label,p,w,h,action=id) {
    let entry=targets.get(id);
    if(!entry){
      const button=document.createElement('button');button.type='button';button.className='bb-hit';
      button.dataset.action=action;button.dataset.target=id;
      button.addEventListener('click',e=>{if(e.detail===0){ input();act(button.dataset.action); }});
      root.appendChild(button);entry={button};targets.set(id,entry);
    }
    const sx=p.x*view.scale,sy=p.y*view.scale;
    const width=Math.max(48,w*view.scale),height=Math.max(48,h*view.scale);
    entry.seen=true;entry.p=p;entry.w=width/view.scale;entry.h=height/view.scale;entry.action=action;
    const b=entry.button;b.hidden=false;
    if(b.dataset.action!==action)b.dataset.action=action;
    if(b.getAttribute('aria-label')!==label)b.setAttribute('aria-label',label);
    b.style.left=`${sx}px`;b.style.top=`${sy}px`;b.style.width=`${width}px`;b.style.height=`${height}px`;
    b.classList.toggle('bb-hinted',hint===id);
    b.classList.toggle('bb-selected',pickup===id);
  }
  function hit(p,ignoreHeld=false) {
    // The small prop/boat targets win over large character or water targets.
    const entries=[...targets.values()].filter(e=>e.seen&&!e.button.hidden&&(!ignoreHeld||e.action!=='held'));
    return entries.reverse().find(e=>Math.abs(p.x-e.p.x)<=e.w/2&&Math.abs(p.y-e.p.y)<=e.h/2)?.action;
  }
  function input(){ lastInput=t;hint=null;hug=0; }
  function stopPeekaboo() {
    if(playingPeekaboo(peek)){
      // Walk out from the current anchor on interruption; never teleport Boo
      // or transfer/drop a carried prop as a side effect of ending the round.
      const p=L.pumpkins?.[peek.spot];
      if(p)tasks=[{action:'walk',x:p.x+((peek.spot===2?-160:160)-20)*L.scale,y:p.y+175*L.scale}];
    }
    peek.phase='idle';publish();
  }
  function walkTask(action,p,{keepPickup=true}={}) {
    const task={action,x:clamp(p.x,75,L.W-75),y:clamp(p.y,L.H*.66,L.H*.86)};
    if(keepPickup&&tasks[0]?.action.startsWith('take:'))tasks=[tasks[0],task];
    else tasks=[task];
  }
  function go(scene) {
    if(scene===state.scene||transition)return;
    if(tasks[0]?.action.startsWith('take:')){
      tasks=[tasks[0],{action:`go:${scene}`,x:actors.boo.x,y:L.floor}];return;
    }
    tasks=[];pickup=null;
    transition={scene,time:0,changed:false};
    save();sound('rustle');
  }
  function giveToFriend(parent=false) {
    if(!state.held){monsterHappy=t+1.5;sound('giggle');waveUntil=t+1.5;return;}
    if(state.held==='leaf') {sound('rustle');say('Let’s take our leaf to the pond.');hint=state.scene==='patch'?'previous':'next';return;}
    const p=parent?L.mommy:actors.monster;
    walkTask(parent?'give-parent':'give',{x:p.x-95*L.scale,y:parent?L.floor:p.y});
  }
  function act(action) {
    if(!alive||!art||transition)return;
    if(action==='peekaboo'){
      if(state.scene!=='patch')return;
      if(beginPeekaboo(peek,{x:actors.boo.x/L.W,y:actors.boo.y/L.H})){
        tasks=[];pickup=null;hint=null;lastInput=t;sound('rustle');
        say('Boo is finding a cozy hiding place.',2);publish();
      }
      return;
    }
    if(action?.startsWith('pumpkin:')){
      if(state.scene!=='patch')return;
      if(!playingPeekaboo(peek)){act('peekaboo');return;}
      const spot=Number(action.slice(8)),reaction=choosePumpkin(peek,spot);
      if(reaction==='rustle'){
        sound('rustle');const p=L.pumpkins[spot];sparkle(p.x,p.y-30,'#E5EFAB',3);
        say('A little rustle… look for Boo’s curl.');
      }else if(reaction==='found'){sound('giggle');say('Peekaboo! Here is Boo!',4);}
      publish();return;
    }
    // Friends, props and travel remain usable. End an optional round before
    // processing their ordinary shared tap/drag rules.
    if(playingPeekaboo(peek)&&!['previous','next','patch'].includes(action))stopPeekaboo();
    if(action?.startsWith('take:')) {
      const name=action.slice(5);const p=positionItem(name);
      if(!tapPlaceEnabled()) { sparkle(p.x,p.y);say('You can drag it to pick it up.');return; }
      pickup=name;walkTask(action,{x:p.x-45,y:L.floor},{keepPickup:false});sound('rustle');return;
    }
    switch(action){
      case 'basket': {
        if(state.items.candy!=='basket') {hint=state.items.candy==='boat'?'water':'held';return;}
        if(!tapPlaceEnabled()){say('Drag a candy out of the basket.');return;}
        pickup='basket';walkTask('take:candy',{x:L.basket.x+60,y:L.floor},{keepPickup:false});sound('rustle');break;
      }
      case 'boo':case 'glow': glowUntil=t+5;sound('shimmer',440);sparkle(actors.boo.x,actors.boo.y-70);say('Glow, glow, little Boo!');break;
      case 'monster': giveToFriend();break;
      case 'mommy':case 'daddy':
        if(state.held==='flower'||state.held==='candy')giveToFriend(true);
        else{waveUntil=t+2;hug=t+2;sound('gentleGift');say('Hello, little Boo!');}break;
      case 'held':
        if(state.held){rules.dropHeld(state,actors.boo.x/L.W);sound('rustle');save();publish();}break;
      case 'dock':case 'boat':
        if(state.held==='leaf')walkTask('place-leaf',{x:L.dock.x-55,y:L.floor});
        else if(state.held==='candy'||state.held==='flower')walkTask('load-boat',{x:L.dock.x-55,y:L.floor});
        else if(state.boat.phase!=='none'){rules.ripple(state);rippleAt(L.dock.x,L.dock.y+20);save();publish();}
        else{hint='previous';say('Bring the big leaf from the jungle path.');}break;
      case 'water':
        if(state.held==='leaf'){act('dock');break;}
        if(state.held&&state.boat.phase==='ready'&&!state.boat.cargo){act('boat');break;}
        rules.ripple(state);rippleAt(L.water.x+(Math.random()-.5)*80,L.water.y+30);save();publish();break;
      case 'previous':go(['pond','patch'].includes(state.scene)?'path':'home');break;
      case 'next':go(state.scene==='home'?'path':'pond');break;
      case 'patch':go('patch');break;
      case 'bush':scenery.rustle=1;sound('rustle');sparkle(L.bush.x,L.bush.y-40,'#E5EFAB',9);say('Hello, little fireflies.');break;
      case 'mushroom':scenery.mushroom=13;sound('bell',Math.floor(t)%5);monsterHappy=t+1;break;
      case 'puddle':walkTask('splash',{x:L.puddle.x-90,y:L.floor});break;
      case 'window':scenery.window=!scenery.window;sound('bell',2);waveUntil=t+2;break;
      case 'again':
        rules.dropHeld(state,actors.boo.x/L.W);state.items.leaf='path';state.items.candy='basket';
        if(state.items.flower==='boat')state.items.flower='path';
        state.boat={phase:'none',cargo:null,progress:0};tripGift=false;
        say('Another little adventure?');save();publish();go('path');break;
      default:break;
    }
  }
  function arrive(task) {
    const action=task.action;
    if(action.startsWith('go:')){tasks=[];go(action.slice(3));return;}
    if(action.startsWith('take:')) {
      const item=action.slice(5);
      if(rules.take(state,item,actors.boo.x/L.W)){sound('pluck');sparkle(actors.boo.x+30,actors.boo.y-65);}
      pickup=null;
    }else if(action==='place-leaf'){
      if(rules.placeLeaf(state)){rippleAt(L.dock.x,L.dock.y);say('Our little leaf boat.');}
    }else if(action==='load-boat'){
      if(rules.loadBoat(state)){sound('gentleGift');say('Tap the water to send it to Monster.');}
    }else if(action==='give'||action==='give-parent'){
      const item=state.held;const first=!state.memories.shared;
      const shared=rules.share(state);
      if(shared){
        const p=carryPoint(),receiver=action==='give-parent'?L.mommy:actors.monster;
        gift={item,from:p,to:{x:receiver.x-45*L.scale,y:receiver.y-95*L.scale},start:t};
        monsterHappy=t+2.5;waveUntil=t+2;sound('gentleGift');say(shared==='candy'?'A candy for you!':'A flower for you!');
        if(first&&shared==='candy')outcome('share:candy');
      }
    }else if(action==='splash'){
      rippleAt(L.puddle.x,L.puddle.y);monsterHappy=t+2;sound('giggle');say('Splish, splash!');
    }
    save();publish();
  }
  function point(e) {
    const r=root.getBoundingClientRect();return{x:(e.clientX-r.left)/view.scale,y:(e.clientY-r.top)/view.scale};
  }
  function onDown(e) {
    if(!art||transition||e.isPrimary===false||pointer||e.target.closest('.bb-loading'))return;
    e.preventDefault();input();
    const p=point(e);const action=e.target.closest('[data-action]')?.dataset.action||hit(p);
    pointer={id:e.pointerId,start:p,last:p,action};
    root.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if(!pointer||e.pointerId!==pointer.id)return;
    const p=point(e);pointer.last=p;
    if(!drag&&Math.hypot(p.x-pointer.start.x,p.y-pointer.start.y)*view.scale>10){
      const action=pointer.action;
      let item=action?.startsWith('take:')?action.slice(5):action==='basket'?'candy':action==='held'?state.held:null;
      if(item){
        if(playingPeekaboo(peek))stopPeekaboo();else tasks=[];
        pickup=null;
        if(state.held===item||rules.take(state,item,actors.boo.x/L.W)){drag={item,p};sound('rustle');publish();}
      }
    }
    if(drag)drag.p=p;
  }
  function onUp(e) {
    if(!pointer||e.pointerId!==pointer.id)return;
    const p=point(e),press=pointer;pointer=null;
    if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);
    if(drag){
      const action=hit(p,true);drag=null;
      if(['monster','mommy','daddy','dock','boat','water','previous','next','patch'].includes(action))act(action);
      else{rules.dropHeld(state,p.x/L.W);save();publish();}
    }else if(Math.hypot(p.x-press.start.x,p.y-press.start.y)*view.scale<16){
      if(press.action)act(press.action);
      else if(p.y>L.H*.60){if(playingPeekaboo(peek))stopPeekaboo();walkTask('walk',{x:p.x,y:p.y},{keepPickup:false});}
      else{sparkle(p.x,p.y);sound('bell',Math.floor(p.x/80)%5);}
    }
  }
  function onCancel(e) {
    if(pointer?.id!==e.pointerId)return;
    pointer=null;drag=null;save();publish();
  }
  root.addEventListener('pointerdown',onDown);
  root.addEventListener('pointermove',onMove);
  root.addEventListener('pointerup',onUp);
  root.addEventListener('pointercancel',onCancel);

  function move(actor,x,y,dt,speed=270) {
    const dx=x-actor.x,dy=y-actor.y,d=Math.hypot(dx,dy);
    const step=Math.min(d,dt*Math.min(speed,Math.max(65,d*4)));
    if(d>.8){actor.x+=dx/d*step;actor.y+=dy/d*step;actor.v=mix(actor.v,1,Math.min(1,dt*10));}
    else{actor.x=x;actor.y=y;actor.v=mix(actor.v,0,Math.min(1,dt*12));}
    return d<3;
  }
  function update(dt) {
    if(transition){
      transition.time+=dt;
      if(transition.time>=.22&&!transition.changed){
        const next=transition.scene,old=state.scene;
        const firstHome=next==='home'&&!state.memories.home&&state.memories.boat;
        rules.visit(state,next);L=geometry(view.W,view.H,next);tasks=[];pickup=null;peek=createPeekaboo();
        Object.assign(actors.boo,L.boo);Object.assign(actors.monster,L.monster);
        // Enter a place from a consistent side, then float to its clear foreground.
        const forward=next==='path'?old==='home':next!=='home';
        actors.boo.x=forward?L.W*.14:L.W*.78;
        actors.monster.x=forward?L.W*.28:L.W*.90;
        tasks=[{action:'walk',x:L.boo.x,y:L.boo.y}];
        if(next==='home'&&(tripGift||firstHome)){
          hug=t+4;waveUntil=t+4;tripGift=false;say('Back home, together.',5);sound('gentleGift');
          if(firstHome)outcome('adventure:home');
        }else captionUntil=0;
        transition.changed=true;ripples=[];save();publish();
      }
      if(transition.time>=.48)transition=null;
    }
    if(!transition&&playingPeekaboo(peek)){
      const event=stepPeekaboo(peek,dt),p=L.pumpkins[peek.spot];
      // Offset the curl from the stem while the wider pumpkin covers his arms.
      const hidden={x:p.x-20*L.scale,y:p.y+54*L.scale};
      if(peek.phase==='hiding'){
        const progress=ease(clamp(peek.elapsed/1.6,0,1));
        actors.boo.x=mix(peek.from.x*L.W,hidden.x,progress);
        actors.boo.y=mix(peek.from.y*L.H,hidden.y,progress)-(quietMotion()?0:Math.sin(progress*Math.PI)*24*L.scale);
        actors.boo.v=1;
      }else if(peek.phase==='hidden'){
        Object.assign(actors.boo,hidden,{v:0});
      }else{
        const progress=peek.phase==='found'?1:ease(clamp(peek.elapsed/1.1,0,1));
        actors.boo.x=hidden.x+(peek.spot===2?-160:160)*L.scale*progress;
        actors.boo.y=hidden.y+121*L.scale*progress;actors.boo.v=1-progress;
      }
      if(event==='complete'){
        monsterHappy=t+3;waveUntil=t+3;sound('gentleGift');sparkle(actors.boo.x,actors.boo.y-80);
        say('You found Boo! Play again, or explore together.',5);
        const first=!state.memories.peekaboo;state.memories.peekaboo=true;
        if(first)outcome('play:peekaboo');save();
      }
      if(event)publish();
    }else if(!transition&&tasks.length){
      const task=tasks[0];
      if(move(actors.boo,task.x,task.y,dt)){tasks.shift();arrive(task);}
    }else actors.boo.v=mix(actors.boo.v,0,Math.min(1,dt*8));
    let mx=L.monster.x,my=L.monster.y;
    const waiting=tasks.some(task=>task.action==='give');
    if(playingPeekaboo(peek)){mx=L.monster.x;my=L.monster.y;}
    else if(state.scene==='pond'&&['sailing','arrived','returning'].includes(state.boat.phase)){
      mx=L.W*.88;my=L.H*.68;
    }else if(waiting){mx=actors.monster.x;my=actors.monster.y;}
    else if(Math.abs(actors.boo.x-L.boo.x)>100){mx=clamp(actors.boo.x+L.W*.23,L.W*.23,L.W*.88);}
    move(actors.monster,mx,my,dt,220);
    const prior=state.boat.phase,hadBoat=state.memories.boat,hadShare=state.memories.shared;
    const event=rules.stepBoat(state,dt);
    if(event==='candy'||event==='flower'){
      monsterHappy=t+3;waveUntil=t+2.5;tripGift=true;
      const b=boatPoint();gift={item:event,from:b,to:{x:actors.monster.x-48,y:actors.monster.y-95},start:t};
      sound('gentleGift');say('You sent a little gift!');
      if(!hadBoat)outcome('boat:gift');else if(!hadShare&&event==='candy')outcome('share:candy');
    }
    if(event||prior!==state.boat.phase){save();publish();}
    glow=mix(glow,t<glowUntil?1:0,Math.min(1,dt*1.8));
    scenery.rustle=Math.max(0,scenery.rustle-dt*2);scenery.mushroom=Math.max(0,scenery.mushroom-dt*19);
    for(const r of ripples)r.age+=dt;
    ripples=ripples.filter(r=>r.age<2);
    for(const p of motes){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
    motes=motes.filter(p=>p.life>0);
    if(gift&&t-gift.start>.8)gift=null;
    if(t-lastInput>8&&!hint){hint=playingPeekaboo(peek)?`pumpkin-${peek.spot}`:rules.nextHint(state);lastInput=t-3;}
    if(t>=captionUntil)captionEl.textContent=cue();
  }

  function drawItem(name,p,size,rotation=0) {
    g.save();g.translate(p.x,p.y);g.rotate(rotation);
    ITEM_DRAW[name](g,0,0,size);g.restore();
  }
  function draw() {
    const quiet=quietMotion();
    for(const e of targets.values())e.seen=false;
    drawScenery(g,L,state.scene,art,t,quiet,scenery);
    const {W,H}=L;
    if(['home','pond'].includes(state.scene)){
      basket(g,L.basket.x,L.basket.y,pickup==='basket'&&!quiet?Math.sin(t*5)*3:0);
      target('basket','Pick up a candy',L.basket,96,90);
    }
    if(state.scene==='home'){
      const opts={quiet,phase:1,wave:t<waveUntil||t<hug?1:0};
      character(g,art,'daddy',L.daddy.x,L.daddy.y,L.scale,t,opts);
      character(g,art,'mommy',L.mommy.x,L.mommy.y,L.scale,t,{...opts,phase:2});
      target('daddy','Daddy Ghost: share or say hello',{x:L.daddy.x,y:L.daddy.y-110*L.scale},130,220);
      target('mommy','Mommy Ghost: share or say hello',{x:L.mommy.x,y:L.mommy.y-105*L.scale},125,210);
      if(state.memories.flower)flower(g,W*.66,H*.71,20);
      target('window','Touch the warm house window',{x:W*.44,y:H*.48},65,65);
    }
    if(state.scene==='path'){
      target('bush','Rustle the bush for fireflies',L.bush,145,100);
      target('mushroom','Play the pink mushroom',L.mushroom,90,80);
      target('puddle','Splash with Purple Monster',L.puddle,110,60);
    }
    if(state.scene==='pond'){
      target('water','Make a ripple and send the leaf boat',L.water,W*.38,H*.20);
      if(state.boat.phase==='none'){
        target('dock','Place the leaf on the water',L.dock,125,85);
        if(state.held==='leaf'||hint==='dock'){g.globalAlpha=.35;leaf(g,L.dock.x,L.dock.y,48);g.globalAlpha=1;}
      }else{
        const p=boatPoint();leaf(g,p.x,p.y,53,quiet?-.12:-.12+Math.sin(t*2)*.035);
        if(state.boat.cargo)drawItem(state.boat.cargo,{x:p.x,y:p.y-18},state.boat.cargo==='candy'?20:17);
        target('boat',state.boat.cargo?'Send the loaded leaf boat':'Place a candy or flower on the leaf boat',p,130,80);
      }
    }
    for(const r of ripples){
      g.globalAlpha=(1-r.age/2)*.55;g.strokeStyle='#C4DFCA';g.lineWidth=2;
      g.beginPath();g.ellipse(r.x,r.y,14+r.age*43,4+r.age*13,0,0,Math.PI*2);g.stroke();g.globalAlpha=1;
    }
    for(const name of ['leaf','candy','flower']){
      if(state.items[name]!==state.scene)continue;
      const p=positionItem(name);
      ellipse(g,p.x,p.y+13,name==='leaf'?52:27,7,'#123D3C40');
      const size=name==='leaf'?51:name==='candy'?23:25;
      drawItem(name,p,size,pickup===name&&!quiet?Math.sin(t*5)*.04:0);
      if(pickup===name){g.strokeStyle='#FFF1B5';g.lineWidth=2;g.beginPath();g.ellipse(p.x,p.y,60,30,0,0,Math.PI*2);g.stroke();}
      target(name,`Pick up the ${name}`,p,name==='leaf'?120:80,80,`take:${name}`);
    }
    const b=actors.boo,m=actors.monster;
    const options={quiet,moving:b.v,phase:0,glow,wave:state.held?.3:0};
    character(g,art,'boo',b.x,b.y,L.scale,t,options);
    character(g,art,'monster',m.x,m.y,L.scale,t,{quiet,moving:m.v,phase:3,wave:t<waveUntil?.8:0,happy:t<monsterHappy?1:0});
    if(!playingPeekaboo(peek))target('boo','Baby Boo: glow',{x:b.x,y:b.y-70*L.scale},110,155);
    target('monster',state.held?'Give your friend what Boo is carrying':'Play with Purple Monster',{x:m.x,y:m.y-107*L.scale},150,220);
    // Pumpkins occlude the same anchored Boo drawing; his curl is the clue.
    // Carry art is also behind the pumpkin, so a candy cannot give him away.
    const drawCarry=()=>{if(state.held&&!drag){const p=carryPoint();drawItem(state.held,p,state.held==='leaf'?35:state.held==='candy'?21:19);}};
    if(state.scene==='patch'){
      drawCarry();
      for(const [i,p] of L.pumpkins.entries()){
        const wiggle=quiet?0:Math.sin(peek.wiggles[i]*24)*peek.wiggles[i]*5;
        pumpkin(g,p.x+wiggle,p.y,116*L.scale);
        target(`pumpkin-${i}`,`Look behind pumpkin ${i+1}`,p,190*L.scale,178*L.scale,`pumpkin:${i}`);
      }
      if(peek.phase==='hidden'){
        const p=L.pumpkins[peek.spot];
        target('hidden-boo','Boo’s little curl: peekaboo!',{x:p.x-20*L.scale,y:p.y-94*L.scale},65*L.scale,48,`pumpkin:${peek.spot}`);
      }
      if(!playingPeekaboo(peek)){
        const p=L.peekaboo,unit=1/view.scale;
        g.fillStyle='#F2DCB7';g.beginPath();g.roundRect(p.x-61*unit,p.y-27*unit,122*unit,54*unit,22*unit);g.fill();
        const image=art.images['assets/babyboo/boo-front.png'];g.drawImage(image,p.x-44*unit,p.y-23*unit,34*unit,42*unit);
        pumpkin(g,p.x+23*unit,p.y,24*unit);
        target('peekaboo',peek.phase==='found'?'Play peekaboo again':'Play peekaboo with Boo',p,122*unit,54*unit);
      }
    }else drawCarry();
    if(state.held&&!drag){
      // Keep a separate drop control away from Boo's face: generous phone
      // hit areas must not make tapping Boo accidentally drop his treat.
      const tray={x:W*.5,y:108/view.scale},r=25/view.scale;
      ellipse(g,tray.x,tray.y,r,r,'#FFF1DD');
      drawItem(state.held,tray,state.held==='leaf'?17/view.scale:12/view.scale);
      target('held',`Put down the ${state.held}`,tray,52/view.scale,52/view.scale);
    }
    if(drag)drawItem(drag.item,drag.p,drag.item==='leaf'?45:27);
    if(gift){const p=ease(clamp((t-gift.start)/.7,0,1));drawItem(gift.item,{x:mix(gift.from.x,gift.to.x,p),y:mix(gift.from.y,gift.to.y,p)-Math.sin(p*Math.PI)*35},21);}
    if(t<monsterHappy)heart(g,m.x,m.y-235*L.scale,20);
    else if(playingPeekaboo(peek))thought(g,m.x,m.y-255*L.scale,'boo',t,quiet,art);
    else if(state.held==='candy'||(!state.memories.shared&&state.scene==='home')||(state.scene==='patch'&&peek.phase==='found'))thought(g,m.x,m.y-255*L.scale,'candy',t,quiet);
    else if(state.scene==='path'&&state.items.leaf==='path'&&!state.held)thought(g,m.x,m.y-255*L.scale,'leaf',t,quiet);
    else if(state.scene==='pond'&&state.boat.phase==='ready'&&!state.boat.cargo&&!state.held)thought(g,m.x,m.y-255*L.scale,'boat',t,quiet);
    if(t<hug&&state.scene==='home'){
      heart(g,W*.49,H*.40,36);heart(g,W*.58,H*.36,20,'#FFE8A9');
    }
    for(const p of motes){g.globalAlpha=Math.min(1,p.life);ellipse(g,p.x,p.y,3,3,p.color);}g.globalAlpha=1;
    if(state.scene!=='home'){
      sign(g,L.previous.x,L.previous.y,-1,state.scene==='path'?'House':'Path');
      target('previous',state.scene==='path'?'Go back to the house':'Go back to the jungle path',L.previous,100,90);
    }
    if(['home','path'].includes(state.scene)){
      sign(g,L.next.x,L.next.y,1,state.scene==='home'?'Jungle':'Pond');
      target('next',state.scene==='home'?'Explore the jungle path':'Visit the pond',L.next,100,90);
    }
    if(state.scene==='path'){
      sign(g,L.patch.x,L.patch.y,1,'Pumpkins','pumpkin');
      target('patch','Visit the pumpkin patch',L.patch,112,96);
    }
    if(state.scene==='home'&&state.memories.home){
      g.fillStyle='#F2DCB7';g.beginPath();g.roundRect(W*.66-52,H*.86-24,104,48,20);g.fill();
      g.fillStyle='#594366';g.font='600 20px ui-rounded,sans-serif';g.textAlign='center';g.fillText('Again?',W*.66,H*.86+7);
      target('again','Play the leaf boat adventure again',{x:W*.66,y:H*.86},108,54);
    }
    if(hint&&!quiet){
      const e=targets.get(hint);if(e?.seen){const p=e.p;g.strokeStyle='#FFF1B5';g.lineWidth=2;g.globalAlpha=.6;g.beginPath();g.ellipse(p.x,p.y,e.w*.52+3,e.h*.52+3,0,0,Math.PI*2);g.stroke();g.globalAlpha=1;}
    }
    for(const e of targets.values())if(!e.seen)e.button.hidden=true;
    if(transition){g.fillStyle=`rgba(23,15,49,${transition.time<.22?transition.time/.22:Math.max(0,1-(transition.time-.22)/.26)})`;g.fillRect(0,0,W,H);}
  }
  function frame(now) {
    if(!alive)return;
    const dt=last?Math.min(.05,(now-last)/1000):0;last=now;t+=dt;
    update(dt);draw();raf=requestAnimationFrame(frame);
  }
  async function boot() {
    loader.hidden=false;loader.innerHTML='<span>One little moment…</span>';
    try{
      art=await loadArt(aborter.signal);
      if(!alive)return;
      loader.hidden=true;resize();publish();raf=requestAnimationFrame(frame);
    }catch(error){
      if(!alive||error.name==='AbortError')return;
      loader.innerHTML='<span>The drawings couldn’t load.</span><button type="button">Try again</button>';
      loader.querySelector('button').addEventListener('click',boot,{once:true});
    }
  }
  resize();publish();boot();
  return()=>{
    alive=false;save();aborter.abort();cancelAnimationFrame(raf);observer.disconnect();
    window.removeEventListener('resize',resize);window.removeEventListener('pagehide',save);
    document.removeEventListener('visibilitychange',visibility);
    root.removeEventListener('pointerdown',onDown);root.removeEventListener('pointermove',onMove);
    root.removeEventListener('pointerup',onUp);root.removeEventListener('pointercancel',onCancel);
    root.remove();
  };
}
