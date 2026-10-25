// Original jungle scenery drawn with Canvas at up to 2x backing resolution.
// The four characters and house retain the owner's approved reference drawings.
export const PALETTE = {
  sky: '#170F31', horizon: '#4C2A72', green: '#1E6B5B', light: '#FFF3AF',
  lavender: '#A18AC9', pink: '#DF80C2', moon: '#FFAD36', water: '#255E76',
};
const TAU = Math.PI * 2;
export const mix = (a, b, t) => a + (b - a) * t;
export const ease = t => t * t * (3 - 2 * t);

export async function loadArt(signal) {
  const base = new URL('../../../', import.meta.url);
  const response = await fetch(new URL('assets/babyboo/manifest.json', base), { signal });
  if (!response.ok) throw new Error('The Baby Boo art could not load.');
  const manifest = await response.json();
  const images = {};
  await Promise.all(manifest.files.map(src => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { images[src] = img; resolve(); };
    img.onerror = () => reject(new Error('A Baby Boo drawing could not load.'));
    img.src = new URL(src, base).href;
  })));
  if (signal.aborted) throw new DOMException('Stopped', 'AbortError');
  return { manifest, images };
}

export function ellipse(g, x, y, rx, ry, color) {
  g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
}
function path(g, points, fill, stroke, width = 3) {
  g.beginPath();
  for (let i = 0; i < points.length; i++) (i ? g.lineTo : g.moveTo).call(g, ...points[i]);
  g.closePath(); g.fillStyle = fill; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.lineJoin = 'round'; g.stroke(); }
}
export function heart(g, x, y, size, color = '#FFB9D7') {
  g.save(); g.translate(x, y); g.scale(size / 30, size / 30);
  g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-30,-4,-14,-25,0,-10);
  g.bezierCurveTo(14,-25,30,-4,0,14); g.fillStyle = color; g.fill(); g.restore();
}
export function leaf(g, x, y, size = 55, rotation = -.15) {
  g.save(); g.translate(x,y); g.rotate(rotation); g.scale(size/55,size/55);
  g.beginPath(); g.moveTo(-54,12); g.bezierCurveTo(-48,-38,23,-42,57,-21);
  g.bezierCurveTo(49,23,-12,41,-54,12); g.fillStyle='#76BE92'; g.fill();
  g.strokeStyle='#3E8D6C'; g.lineWidth=3; g.stroke();
  g.beginPath(); g.moveTo(-47,14); g.quadraticCurveTo(4,3,50,-19); g.stroke();
  g.strokeStyle='#AAD7A3'; g.lineWidth=2;
  for(let i=0;i<4;i++){const xx=-25+i*17;g.beginPath();g.moveTo(xx,8-i*5);g.lineTo(xx-5,-15-i*3);g.stroke();}
  g.restore();
}
export function candy(g, x, y, size = 24, color = '#FF86B8') {
  g.save();g.translate(x,y);g.scale(size/24,size/24);
  path(g,[[-17,-4],[-34,-14],[-32,13],[-17,6]],'#FFD487','#F0B85D',2);
  path(g,[[17,-4],[34,-14],[32,13],[17,6]],'#FFD487','#F0B85D',2);
  g.beginPath();g.roundRect(-21,-15,42,30,12);g.fillStyle=color;g.fill();
  g.strokeStyle='#D467A4';g.lineWidth=2;g.stroke();
  g.save();g.beginPath();g.roundRect(-20,-14,40,28,11);g.clip();
  g.strokeStyle='#FFE9D5';g.lineWidth=8;g.beginPath();g.moveTo(-17,18);g.lineTo(5,-20);g.moveTo(5,21);g.lineTo(25,-17);g.stroke();g.restore();
  ellipse(g,-8,-8,6,2,'#FFF4E8');g.restore();
}
export function flower(g,x,y,size=25) {
  g.save();g.translate(x,y);g.scale(size/25,size/25);
  g.strokeStyle='#71A77B';g.lineWidth=5;g.beginPath();g.moveTo(0,0);g.lineTo(-4,42);g.stroke();
  ellipse(g,6,25,12,5,'#77BC8A');
  for(let i=0;i<6;i++){const a=i*TAU/6;ellipse(g,Math.cos(a)*13,Math.sin(a)*13,10,10,'#F3A9D3');}
  ellipse(g,0,0,9,9,'#FFE59A');g.restore();
}
export function basket(g,x,y,bounce=0) {
  g.save();g.translate(x,y-bounce);
  g.strokeStyle='#C69D83';g.lineWidth=8;g.beginPath();g.ellipse(0,-21,32,34,0,Math.PI,TAU);g.stroke();
  g.beginPath();g.moveTo(-46,-22);g.lineTo(-34,26);g.quadraticCurveTo(0,38,34,26);g.lineTo(46,-22);g.closePath();
  g.fillStyle='#B88C78';g.fill();g.strokeStyle='#7F5C67';g.lineWidth=3;g.stroke();
  for(let i=-24;i<=24;i+=12){g.beginPath();g.moveTo(i,-16);g.lineTo(i*.8,26);g.strokeStyle='#D6AB8C';g.lineWidth=3;g.stroke();}
  ellipse(g,0,-23,44,11,'#77566B');candy(g,-15,-28,13);candy(g,15,-29,14,'#BDA4EF');
  g.restore();
}
function palm(g,x,y,height,seed=0,dark=false) {
  g.save();g.translate(x,y);const lean=Math.sin(seed)*height*.15;
  g.beginPath();g.moveTo(-height*.045,0);g.quadraticCurveTo(lean,height*-.45,lean-height*.035,-height);
  g.lineTo(lean+height*.035,-height);g.quadraticCurveTo(lean+height*.065,-height*.4,height*.045,0);
  g.closePath();g.fillStyle=dark?'#343E56':'#86634F';g.fill();
  if(!dark)for(let i=0;i<8;i++){const yy=-height*(.08+i*.105);g.strokeStyle='#614A48';g.lineWidth=2;g.beginPath();g.moveTo(-height*.035+lean*(-yy/height),yy);g.lineTo(height*.035+lean*(-yy/height),yy+5);g.stroke();}
  const topY=-height;
  for(let i=0;i<7;i++){
    const a=-Math.PI+ i*Math.PI/6;const len=height*(.37+ .07*Math.sin(i+seed));
    const xx=lean+Math.cos(a)*len, yy=topY+Math.sin(a)*len*.7;
    path(g,[[lean,topY+12],[xx,yy],[mix(xx,lean,.32),mix(yy,topY,.7)+18],[lean,topY+26]],dark?'#244854':i%2?'#276F67':'#1F5D5C');
  }
  if(!dark){ellipse(g,lean-10,topY+15,12,10,'#946E50');ellipse(g,lean+8,topY+16,12,10,'#A07851');}
  g.restore();
}
function bush(g,x,y,size=80,dark=false) {
  const colors=dark?['#174F4D','#1E5B53','#205D57']:['#1E6B5B','#287B68','#20665C'];
  for(let i=0;i<7;i++){const a=i*2.39;ellipse(g,x+Math.cos(a)*size*.52,y+Math.sin(a)*size*.28,size*.44,size*.35,colors[i%3]);}
  if(!dark)for(let i=0;i<4;i++)ellipse(g,x+Math.sin(i*3.7)*size*.55,y-12+Math.cos(i*2.3)*size*.2,4,4,'#DA86B6');
}
export function mushroom(g,x,y,size=40,bob=0) {
  g.save();g.translate(x,y-bob);g.scale(size/40,size/40);
  g.fillStyle='#F1D5EA';g.beginPath();g.roundRect(-8,-10,16,36,6);g.fill();
  g.beginPath();g.ellipse(0,-6,35,31,0,Math.PI,TAU);g.quadraticCurveTo(0,7,-35,-6);g.fillStyle='#DF80C2';g.fill();
  ellipse(g,-16,-18,5,6,'#FFE8F8');ellipse(g,7,-29,6,6,'#FFE8F8');ellipse(g,22,-15,4,5,'#FFE8F8');g.restore();
}
function pumpkin(g,x,y,size) {
  g.save();g.translate(x,y);g.scale(size/50,size/50);
  g.strokeStyle='#79A575';g.lineWidth=9;g.beginPath();g.moveTo(0,-26);g.lineTo(5,-43);g.stroke();
  ellipse(g,-15,0,25,32,'#F29A2F');ellipse(g,15,0,25,32,'#F6A32E');ellipse(g,0,0,24,34,'#FFB13C');
  path(g,[[-23,-6],[-15,-18],[-7,-6]],'#FFF2AC');path(g,[[7,-6],[15,-18],[23,-6]],'#FFF2AC');
  g.beginPath();g.moveTo(-23,7);g.quadraticCurveTo(0,39,23,7);g.quadraticCurveTo(0,20,-23,7);g.fillStyle='#FFE99A';g.fill();g.restore();
}

export function geometry(W,H,scene) {
  const floor=H*.8;
  const common={W,H,floor,scale:W<850?.76:.82,
    basket:{x:W*.48,y:H*.87},
    dock:{x:W*.28,y:H*.71},water:{x:W*.52,y:H*.64},
    previous:{x:Math.max(65,W*.065),y:H-125},next:{x:W-Math.max(65,W*.065),y:H-125},
    leaf:{x:W*.53,y:H*.86},flower:{x:W*.25,y:H*.87},
    bush:{x:W*.22,y:H*.65},mushroom:{x:W*.82,y:H*.87},puddle:{x:W*.68,y:H*.88},
    daddy:{x:W*.34,y:H*.73},mommy:{x:W*.57,y:H*.73},
    boo:{x:W*.36,y:floor},monster:{x:W*.75,y:floor}};
  if(scene==='home'){
    common.basket={x:W*.16,y:H*.87};
    common.daddy={x:W*.36,y:H*.71};common.mommy={x:W*.61,y:H*.71};
    common.boo={x:W*.23,y:H*.84};common.monster={x:W*.82,y:H*.83};
  }
  if(scene==='pond'){
    common.boo={x:W*.20,y:H*.81};common.monster={x:W*.83,y:H*.81};
    common.leaf={x:W*.23,y:H*.87};common.flower={x:W*.66,y:H*.88};
  }
  return common;
}

export function drawScenery(g,L,scene,art,t,quiet,props={}) {
  const {W,H}=L;
  const sky=g.createLinearGradient(0,0,0,H*.74);sky.addColorStop(0,PALETTE.sky);sky.addColorStop(1,PALETTE.horizon);
  g.fillStyle=sky;g.fillRect(0,0,W,H);
  // Fixed moon and stars within a place; only the scene transition changes view.
  for(let i=0;i<28;i++){
    const xx=((i*193+79)%997)/997*W,yy=85+((i*131)%337)/337*H*.38;
    const a=quiet?.55:.52+.18*Math.sin(t*.65+i);
    g.globalAlpha=a;ellipse(g,xx,yy,i%5===0?2:1.1,i%5===0?2:1.1,'#FFF0C6');
  }g.globalAlpha=1;
  const moonR=Math.min(77,W*.075);const mx=W*.84,my=Math.min(H*.23,190);
  const glow=g.createRadialGradient(mx,my,moonR*.6,mx,my,moonR*1.5);glow.addColorStop(0,'#FFB64822');glow.addColorStop(1,'#FFB64800');
  g.fillStyle=glow;g.fillRect(mx-moonR*1.5,my-moonR*1.5,moonR*3,moonR*3);
  ellipse(g,mx,my,moonR,moonR,'#FFB23B');
  ellipse(g,mx-moonR*.33,my-moonR*.1,moonR*.17,moonR*.19,'#EE9C36');ellipse(g,mx+moonR*.21,my+moonR*.35,moonR*.12,moonR*.14,'#F0A139');
  for(let i=0;i<3;i++){
    const x=W*(.16+i*.25),y=H*(.20+(i%2)*.12);
    ellipse(g,x,y,60,19,'#37264F');ellipse(g,x-23,y-10,28,24,'#37264F');ellipse(g,x+20,y-7,35,26,'#37264F');
  }
  for(let layer=0;layer<2;layer++){
    g.beginPath();g.moveTo(0,H);g.lineTo(0,H*(.54+layer*.08));
    g.bezierCurveTo(W*.3,H*(.41+layer*.09),W*.65,H*(.65+layer*.03),W,H*(.48+layer*.1));
    g.lineTo(W,H);g.closePath();g.fillStyle=layer?'#1B4547':'#303554';g.fill();
  }
  palm(g,W*.04,H*.76,H*.52,1,true);palm(g,W*.98,H*.76,H*.55,2,true);
  g.fillStyle='#204D47';g.fillRect(0,H*.73,W,H*.27);
  ellipse(g,W*.5,H*.86,W*.6,H*.19,'#28574B');
  if(scene==='home'){
    const image=art.images[art.manifest.house];const w=Math.min(445,W*.60),h=w*image.height/image.width;
    g.drawImage(image,W*.5-w/2,H*.71-h,w,h);
    if(props.window){ellipse(g,W*.42,H*.49,18,16,'#FFF5C444');}
    for(let i=0;i<4;i++)ellipse(g,W*.5-i*W*.025,H*(.75+i*.048),34+i*4,7+i,'#AC96CC');
    pumpkin(g,W*.27,H*.73,43);pumpkin(g,W*.70,H*.72,34);pumpkin(g,W*.77,H*.74,42);
    palm(g,W*.09,H*.73,H*.52,3);bush(g,W*.94,H*.75,100);mushroom(g,W*.93,H*.87,36);
  }else if(scene==='path'){
    g.beginPath();g.moveTo(-20,H*.92);g.bezierCurveTo(W*.3,H*.75,W*.68,H*.94,W+30,H*.71);
    g.strokeStyle='#587365';g.lineWidth=92;g.lineCap='round';g.stroke();
    g.strokeStyle='#698070';g.lineWidth=70;g.stroke();
    for(let i=0;i<7;i++)ellipse(g,W*(.08+i*.14),H*(.87-.10*i/7),23,9,'#A28EBC');
    palm(g,W*.06,H*.67,H*.53,1);palm(g,W*.94,H*.69,H*.56,4);
    bush(g,L.bush.x,L.bush.y,85+props.rustle*5);bush(g,W*.87,H*.66,80);
    mushroom(g,L.mushroom.x,L.mushroom.y,42,props.mushroom||0);
    ellipse(g,L.puddle.x,L.puddle.y,53,13,'#639A9A');ellipse(g,L.puddle.x-7,L.puddle.y-3,30,3,'#98C7B9');
  }else{
    // A sheltered pond with a continuous dry bank around it.
    ellipse(g,W*.55,H*.64,W*.36,H*.17,'#5C8D7A');
    const water=g.createLinearGradient(0,H*.48,0,H*.8);water.addColorStop(0,'#304F72');water.addColorStop(1,'#387E88');
    ellipse(g,W*.55,H*.64,W*.33,H*.15,water);
    g.save();g.beginPath();g.ellipse(W*.55,H*.64,W*.32,H*.14,0,0,TAU);g.clip();
    for(let i=0;i<8;i++){
      const y=H*(.52+i*.027);const offset=quiet?0:Math.sin(t*.5+i)*9;
      ellipse(g,W*.55+offset,y,25+i*9,1.8,i%2?'#8AAEB747':'#C2D0BA38');
    }g.restore();
    const glow=g.createRadialGradient(mx,H*.59,0,mx,H*.59,60);glow.addColorStop(0,'#FFD99450');glow.addColorStop(1,'#FFD99400');
    ellipse(g,W*.73,H*.6,52,9,glow);
    palm(g,W*.05,H*.70,H*.55,2);bush(g,W*.94,H*.65,85);bush(g,W*.10,H*.69,62);
    for(let i=0;i<5;i++){const x=W*(.77+i*.02);g.strokeStyle='#86AA78';g.lineWidth=4;g.beginPath();g.moveTo(x,H*.54);g.lineTo(x-10,H*.45-i*4);g.stroke();}
    for(let i=0;i<3;i++)ellipse(g,W*(.27+i*.025),H*(.77+i*.015),27,8,'#AC9AC3');
    g.save();g.strokeStyle='#BBD3AA88';g.lineWidth=3;g.setLineDash([7,8]);g.beginPath();g.ellipse(L.dock.x,L.dock.y,60,23,-.15,0,TAU);g.stroke();g.restore();
  }
  // Foreground stays sparse so props and hands remain readable.
  bush(g,-25,H*.96,90,true);bush(g,W+20,H*.98,95,true);
  for(let i=0;i<9;i++){
    const x=W*(.08+((i*73)%97)/116),y=H*(.39+((i*41)%73)/180);
    const dx=quiet?0:Math.sin(t*.4+i*2)*12,dy=quiet?0:Math.sin(t*.65+i)*8;
    ellipse(g,x+dx,y+dy,6,6,'#D8EDAA13');ellipse(g,x+dx,y+dy,2,2,'#E7EFB8');
  }
}

export function character(g,art,name,x,y,scale,t,{moving=0,wave=0,happy=0,glow=0,quiet=false,phase=0}={}) {
  const m=art.manifest.characters[name];const img=art.images;
  const ghost=name!=='monster';
  const stride=quiet?0:Math.sin(t*9+phase)*moving;
  const bob=quiet?0:(ghost?Math.sin(t*2.1+phase)*3:Math.abs(stride)*2);
  const blink=(t+phase*1.9)%4.9<.15;
  ellipse(g,x,y+4,m.width*scale*.40,m.width*scale*.065,'#1224323B');
  if(glow>.005){
    const radius=m.height*scale*.85;
    const halo=g.createRadialGradient(x,y-m.height*scale*.45,0,x,y-m.height*scale*.45,radius);
    halo.addColorStop(0,`rgba(255,243,175,${glow*.38})`);halo.addColorStop(.5,`rgba(255,243,175,${glow*.14})`);halo.addColorStop(1,'#FFF3AF00');
    ellipse(g,x,y-m.height*scale*.45,radius,radius,halo);
  }
  g.save();g.translate(x,y-bob-(quiet?0:happy*Math.sin(t*7)*3));
  g.rotate(quiet?0:stride*.018);g.scale(scale,scale);g.translate(-m.pivot[0],-m.pivot[1]);
  function part(key){
    const p=m.parts[key];if(!p)return;
    const left=key.startsWith('left');const foot=key.endsWith('foot');
    const angle=foot?(left?stride:-stride)*.075:(left?1:-1)*wave*(.35+Math.sin(t*5)*.18)+(left?stride:-stride)*.06;
    g.save();g.translate(...p.joint);g.rotate(angle);g.translate(-p.joint[0],-p.joint[1]);
    if(foot)g.translate(0,quiet?0:Math.min(0,(left?stride:-stride)*5));
    g.drawImage(img[p.src],0,0);g.restore();
  }
  part('left-foot');part('right-foot');
  g.drawImage(img[blink?m.blink:m.body],0,0);part('left-arm');part('right-arm');g.restore();
}

export function thought(g,x,y,kind,t,quiet) {
  const bob=quiet?0:Math.sin(t*2)*2;
  g.save();g.translate(x,y+bob);
  ellipse(g,-16,43,5,5,'#FFF5E7');ellipse(g,-10,32,8,7,'#FFF5E7');
  g.fillStyle='#FFF5E7';g.beginPath();g.roundRect(-47,-29,94,67,23);g.fill();
  if(kind==='candy')candy(g,0,3,23);
  else if(kind==='leaf')leaf(g,0,4,32);
  else if(kind==='heart')heart(g,0,6,27);
  else if(kind==='boat'){leaf(g,0,14,33);candy(g,1,0,14);}
  g.restore();
}
export function sign(g,x,y,direction,label,kind) {
  g.save();g.translate(x,y);
  g.strokeStyle='#A7868C';g.lineWidth=8;g.beginPath();g.moveTo(0,10);g.lineTo(0,36);g.stroke();
  g.fillStyle='#E1CBAA';g.beginPath();g.roundRect(-46,-30,92,55,15);g.fill();g.strokeStyle='#AE8C88';g.lineWidth=2;g.stroke();
  g.strokeStyle='#65465F';g.lineWidth=5;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(-direction*9,-15);g.lineTo(direction*9,-3);g.lineTo(-direction*9,9);g.stroke();
  g.fillStyle='#FFF1D7';g.font='600 17px ui-rounded, sans-serif';g.textAlign='center';g.fillText(label,0,57);g.restore();
}
