import Phaser from 'phaser';
import { state, type Krathong } from './state';
export class River extends Phaser.Scene {
 private boats: { view: Phaser.GameObjects.Container; item: Krathong }[] = [];
 private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor() { super('river'); }
 create() { this.draw(); this.scale.on('resize', () => this.draw()); this.game.events.on('launch', this.addBoat, this); this.events.once('shutdown', () => this.game.events.off('launch', this.addBoat, this)); }
 draw() {
  this.children.removeAll(true); this.boats = [];
  const { width:w, height:h } = this.scale;
  const g = this.add.graphics();
  g.fillGradientStyle(0x142c3b,0x142c3b,0x295750,0x295750,1); g.fillRect(0,0,w,h);
  for(let i=0;i<65;i++) { const x=((i*719)%997)/997*w, y=((i*37)%101)/101*h*.34; g.fillStyle(0xfce9b6,.25+(i%4)*.13); g.fillCircle(x,y,i%3===0?1.6:1); }
  g.fillStyle(0xffe8b2,.05); g.fillCircle(w*.73,h*.15,65); g.fillStyle(0xffe8b2,.09);g.fillCircle(w*.73,h*.15,49);g.fillStyle(0xffe6b3);g.fillCircle(w*.73,h*.15,31);
  g.fillStyle(0x153d3d); g.beginPath();g.moveTo(0,h*.32); for(let i=0;i<=20;i++)g.lineTo(i*w/20,h*(.31+Math.sin(i*1.6)*.035));g.lineTo(w,h*.43);g.lineTo(0,h*.43);g.closePath();g.fillPath();
  g.fillGradientStyle(0x1d484d,0x1d484d,0x34726a,0x34726a,1);g.fillRect(0,h*.39,w,h*.61);
  for(let i=0;i<90;i++) {g.lineStyle(1,i%3===0?0xd7d4a1:0x91c4b5,.09);const x=((i*127)%997)/997*w,y=h*(.42+((i*43)%103)/103*.57);g.lineBetween(x,y,x+15+i%40,y);}
  for(let i=0;i<12;i++){g.fillStyle(0xffd989,.035); g.fillEllipse(w*.73+Math.sin(i*2)*13,h*(.41+i*.026),40+i*6,3);}
  for(let i=0;i<10;i++){const x=i%2===0?i*10:w-i*8,y=h*(.87+(i%4)*.035);g.fillStyle(0x204e45);g.fillEllipse(x,y,65,13);g.fillStyle(0x75a382,.5);g.fillEllipse(x,y-2,45,5);}
  state.krathongs.forEach(item=>this.addBoat(item));
 }
 addBoat(item: Krathong) {
  const view = this.add.container(item.x*this.scale.width,this.boatY(item));
  const g=this.add.graphics();view.add(g);
  g.fillStyle(0xffdb8e,.06);g.fillCircle(0,-15,45);g.lineStyle(1,0xb4dfc0,.2);g.strokeEllipse(0,15,87,17);g.fillStyle(0x0a3236,.3);g.fillEllipse(0,13,66,14);
  for(let i=0;i<9;i++){let a=i*Math.PI*2/9;g.fillStyle(i%2?0x75ab7a:0x497f63);g.fillTriangle(0,8,Math.cos(a)*31,Math.sin(a)*13,Math.cos(a+.6)*31,Math.sin(a+.6)*13);}
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;g.fillStyle(item.color);g.fillEllipse(Math.cos(a)*15,Math.sin(a)*7,17,11);}
  g.fillStyle(0xffe8b6);g.fillEllipse(0,0,19,11);g.fillStyle(0xffe8b6);g.fillRoundedRect(-2,-20,4,20,1);g.fillStyle(0xffb864,.2);g.fillCircle(0,-25,12);g.fillStyle(0xffd284);g.fillEllipse(0,-25,7,12);g.fillStyle(0xfff4d2);g.fillEllipse(0,-26,3,7);
  const label=this.add.text(0,-49,item.name,{fontFamily:'Tahoma, sans-serif',fontSize:'13px',color:'#fff3dc',backgroundColor:'#193b40',padding:{x:10,y:5}}).setOrigin(.5);view.add(label);
  const zone=this.add.zone(0,-12,82,100).setInteractive({useHandCursor:true});view.add(zone);zone.on('pointerdown',()=>window.dispatchEvent(new CustomEvent('wish',{detail:item})));
  this.boats.push({view,item});
 }
 private boatY(item: Krathong) { return (this.scale.width < 760 ? .435 + item.y * .035 : item.y) * this.scale.height; }
 update(time:number) { if(this.reduced)return; for(const {view,item} of this.boats){view.x=item.x*this.scale.width+Math.sin(time/7500+item.x*30)*12;view.y=this.boatY(item)+Math.sin(time/1500+item.x*10)*2;view.rotation=Math.sin(time/2200+item.y)*.025;} }
}
