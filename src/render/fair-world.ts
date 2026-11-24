import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FAIR_STOPS } from '../fair-state';
import { FairCrowd } from '../fair-crowd';

// Render adapter: fair-state and Fair own navigation and activity rules.
export class FairWorld {
  readonly scene = new T.Scene();
  readonly camera = new T.OrthographicCamera(-12, 12, 8, -8, .1, 120);
  readonly renderer: T.WebGLRenderer;
  private crowd = new FairCrowd();
  private crowdTemplate = new T.Group();
  private crowdParts: { source: T.Mesh; instances: T.InstancedMesh }[] = [];
  private crowdLegs: T.Group[] = [];
  private crowdArms: T.Group[] = [];
  private staticRoot = new T.Group();
  private wheel = new T.Group();
  private cabins: T.Group[] = [];
  private player = new T.Group();
  private legs: T.Group[] = [];
  private arms: T.Group[] = [];
  private textures = new Set<T.Texture>();
  private geos = new Set<T.BufferGeometry>();
  private mats = new Set<T.Material>();
  private image = new Image();
  private focus = 6;
  private width = 1;
  private height = 1;
  private angle = 0;
  private lost = false;
  private disposed = false;
  private ray = new T.Raycaster();
  private unitBox = new T.BoxGeometry();
  private unitBall = new T.SphereGeometry(1, 12, 8);
  private unitCylinder = new T.CylinderGeometry(1, 1, 1, 12);
  private paint = new Map<string, T.MeshStandardMaterial>();

  constructor(readonly canvas: HTMLCanvasElement, name: string, photo: string, private onContext: (lost: boolean) => void) {
    this.renderer = new T.WebGLRenderer({canvas, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.scene.background = new T.Color(0x25374f);
    this.scene.fog = new T.Fog(0x25374f, 35, 85);
    this.scene.add(new T.HemisphereLight(0xdce9ff, 0x6c6250, 2.2));
    const sun = new T.DirectionalLight(0xffddad, 3.1); sun.position.set(-8, 16, 12); this.scene.add(sun);
    const rim = new T.DirectionalLight(0x9bcee1, 1.2); rim.position.set(20, 10, -10); this.scene.add(rim);
    this.scene.add(this.staticRoot);
    this.buildStreet();
    this.buildWheel();
    this.buildPlayer(name, photo);
    this.buildCrowd();
    this.batch(this.staticRoot);
    this.canvas.dataset.renderer = 'three-webgl';
    this.canvas.addEventListener('webglcontextlost', this.contextLost);
    this.canvas.addEventListener('webglcontextrestored', this.contextRestored);
  }
  private contextLost = (event: Event) => { event.preventDefault(); this.lost = true; this.onContext(true); };
  private contextRestored = () => { this.lost = false; this.onContext(false); };
  private material(color: T.ColorRepresentation, glow = false) {
    const key = `${color}:${glow}`;
    if (!this.paint.has(key)) {
      const mat = new T.MeshStandardMaterial({ color, roughness: .65, metalness: glow ? .15 : .05,
        emissive: glow ? color : 0, emissiveIntensity: glow ? .7 : 0 });
      this.paint.set(key, mat); this.mats.add(mat);
    }
    return this.paint.get(key)!;
  }
  private part(parent: T.Group, geo: T.BufferGeometry, color: T.ColorRepresentation, x: number, y: number, z: number, sx: number, sy: number, sz: number, glow = false) {
    const mesh = new T.Mesh(geo, this.material(color, glow));
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); parent.add(mesh); this.geos.add(geo); return mesh;
  }
  private box(g: T.Group, color: T.ColorRepresentation, x: number,y: number,z: number,w: number,h: number,d: number, glow = false) {
    return this.part(g,this.unitBox,color,x,y,z,w,h,d,glow);
  }
  private ball(g: T.Group, color: T.ColorRepresentation,x: number,y: number,z: number,sx: number,sy=sx,sz=sx,glow=false) {
    return this.part(g,this.unitBall,color,x,y,z,sx,sy,sz,glow);
  }
  private beam(g: T.Group, color: T.ColorRepresentation, a: number[], b: number[], radius=.035, glow=false) {
    const start = new T.Vector3(...a as [number,number,number]), end = new T.Vector3(...b as [number,number,number]);
    const delta = end.clone().sub(start), mid = start.clone().add(end).multiplyScalar(.5);
    const m = this.part(g,this.unitCylinder,color,mid.x,mid.y,mid.z,radius,delta.length(),radius,glow);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()); return m;
  }
  private sign(label: string, width: number, height: number, color='#fff0d0', background='#493b46') {
    const c=document.createElement('canvas'); c.width=768; c.height=128;
    const ctx=c.getContext('2d')!; ctx.fillStyle=background; ctx.fillRect(0,0,768,128);
    ctx.strokeStyle='#e4b976'; ctx.lineWidth=5; ctx.strokeRect(6,6,756,116);
    ctx.fillStyle=color; ctx.font='600 45px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(label,384,65,718);
    const texture=new T.CanvasTexture(c); texture.colorSpace=T.SRGBColorSpace; this.textures.add(texture);
    const mat=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});this.mats.add(mat);
    const geo=new T.PlaneGeometry(width,height);this.geos.add(geo);return new T.Mesh(geo,mat);
  }
  private buildStreet() {
    const g=this.staticRoot;
    this.box(g,0x526c60,19,-.32,-2,48,.5,24);
    this.box(g,0xa89980,19,-.07,3,44,.18,6.6);
    for(let x=-3;x<43;x+=.8) for(const z of [.3,1.9,3.5,5.1])
      this.box(g,(Math.round(x*10)+Math.round(z*10))%3 ? 0xb8a88f:0xc3b69e,x,.028,z,.76,.025,1.5);
    for(const z of [-.5,6.4]) this.box(g,0xe2c6a2,19,.1,z,44,.22,.16);
    for(let i=0;i<15;i++) {
      const x=i*3.1-3;
      this.ball(g,0x304e50,x,1.2,-17,3.8,3.5,3);
      this.ball(g,0x3e6359,x,1.4,-12,1.9,2.8,1.6);
    }
    // A miniature Thai roofline behind the promenade, all modeled locally.
    this.box(g,0xc8b69a,8,2.1,-12,5,4,3);
    for(let i=0;i<3;i++) {
      const roof=this.box(g,i%2?0xba8761:0x9b5b50,8,4.2+i*.6,-12,6-i*.85,.22,3.7-i*.5);
      roof.rotation.z=.03;
      this.beam(g,0xe9c478,[5.1+i*.43,4.2+i*.6,-10.2],[8,5.2+i*.42,-10.2],.09);
      this.beam(g,0xe9c478,[8,5.2+i*.42,-10.2],[10.9-i*.43,4.2+i*.6,-10.2],.09);
    }
    this.ball(g,0xffe6b2,31,17,-26,1.4,1.4,1.4,true);
    const stars=[];
    for(let i=0;i<120;i++)stars.push(-12+(i*7.31)%65,10+(i*2.71)%17,-30-(i%4)*3);
    const starGeo=new T.BufferGeometry();starGeo.setAttribute('position',new T.Float32BufferAttribute(stars,3));this.geos.add(starGeo);
    const starMat=new T.PointsMaterial({color:0xffe5b0,size:.06});this.mats.add(starMat);g.add(new T.Points(starGeo,starMat));
    FAIR_STOPS.forEach((stop,i)=>{if(stop.kind!=='wheel')this.stall(stop.x/100,stop.name,stop.color,i);});
    // Strings, scalloped cloth flags, lanterns and flower planters give the lane scale.
    for(let x=0;x<=38;x+=3.8) {
      this.beam(g,0x725747,[x,0,0],[x,5.3,0],.055);
      for(let j=0;j<8;j++) {
        const bx=x+j*3.8/8,by=5.25-Math.sin(j/8*Math.PI)*.55;
        this.beam(g,0x61574d,[bx,by,-.1],[bx+.475,5.25-Math.sin((j+1)/8*Math.PI)*.55,-.1],.012);
        this.ball(g,j%2?0xffd998:0xf3b4ae,bx,by-.13,-.1,.06,.09,.06,true);
        const flag=this.part(g,new T.ConeGeometry(.13,.28,3),['#dfb779','#9cbcaf','#cf9baf'][j%3],bx+.22,by-.22,-.1,1,1,.2);
        flag.rotation.z=Math.PI;
      }
    }
    for(const x of [1,7.7,12.8,18,26.5,31.4,37.1]) for(const z of [-.45,6.8]) {
      this.part(g,this.unitCylinder,0xb78363,x,.23,z,.38,.45,.38);
      for(let i=0;i<7;i++) {
        const a=i*Math.PI*2/7;
        this.ball(g,0x749b68,x+Math.cos(a)*.23,.54,z+Math.sin(a)*.23,.23,.32,.23);
        this.ball(g,i%2?0xf0ce8b:0xe9a49c,x+Math.cos(a)*.29,.8,z+Math.sin(a)*.29,.12,.12,.12);
      }
    }
  }

  private stall(x: number, label: string, color: string, index: number) {
    const g=new T.Group();g.position.set(x,0,-2.25);this.staticRoot.add(g);
    this.box(g,0x865d45,0,.17,0,4.4,.32,3.3);
    for(let j=0;j<13;j++) this.box(g,j%2?0x956c50:0xa57956,-2.05+j*.34,.35,0,.31,.08,3.2);
    for(const px of [-1.94,1.94])for(const pz of [-1.28,1.28]) {
      this.beam(g,0x815940,[px,.3,pz],[px,3.95,pz],.075);
      this.ball(g,0xe6ba73,px,2.72,pz,.09,.12,.09,true);
    }
    this.box(g,0x76563f,0,1.35,-1.2,3.85,1.8,.12);
    // Individual boards, trim and a deep counter rather than painted flat facades.
    this.box(g,color,0,.9,1.12,3.85,1.2,.18);
    for(let j=0;j<11;j++) this.box(g,0xbfa27a,-1.75+j*.35,.87,1.23,.018,1.05,.035);
    this.box(g,0xe0bf90,0,1.52,.98,4.15,.17,.9);
    for(const px of [-1.85,1.85])this.box(g,0xd5b58a,px,.95,1.25,.08,1.2,.07);
    for(let j=0;j<12;j++) {
      const px=-2.2+j*.4;
      const panel=this.box(g,j%2?0xf1dfba:color,px,3.78,.05,.4,.12,3.65);
      panel.rotation.x=.12;
      this.box(g,j%2?0xf1dfba:color,px,3.48,1.85,.4,.4,.08);
      this.ball(g,j%2?0xf1dfba:color,px,3.3,1.85,.2,.13,.045);
    }
    const sign=this.sign(label,3.45,.5);sign.position.set(0,.94,1.32);g.add(sign);
    for(const px of [-1.75,1.75]) {
      this.beam(g,0x5c4d47,[px,3.2,1.1],[px,2.55,1.1],.012);
      this.ball(g,0xf4c18e,px,2.41,1.1,.16,.22,.16,true);
      for(const y of [2.22,2.6])this.part(g,this.unitCylinder,0x95674b,px,y,1.1,.12,.045,.12);
    }
    if(index===1) {
      this.box(g,0x465b66,0,2.35,.2,3.5,2.1,.12);
      for(let row=0;row<3;row++)for(let col=0;col<6;col++) {
        const px=-1.45+col*.58,py=1.5+row*.5;
        this.ball(g,['#e3a0ad','#efc064','#96bdad','#b6a5d2'][(col+row)%4],px,py,.33,.19,.24,.14);
        this.beam(g,0xdfd0ad,[px,py-.24,.33],[px,py-.4,.33],.008);
      }
      // Plush prizes hang at the edges of the balloon wall.
      for(const px of [-1.55,1.55]) {
        this.ball(g,0xf2d2a3,px,1.9,.15,.24,.3,.17);
        this.ball(g,0xf2d2a3,px,2.2,.15,.19,.18,.16);
        for(const dx of [-.13,.13])this.ball(g,0xe8bb8d,px+dx,2.35,.15,.08);
      }
    } else if(index===4) {
      for(let j=0;j<14;j++) {
        const sx=-1.55+(j%7)*.51,sy=1.8+Math.floor(j/7)*.55;
        this.beam(g,0xe0bb74,[sx,3,-.65],[sx,sy,-.65],.008);
        const star=new T.Shape();for(let k=0;k<10;k++) {const a=k*Math.PI/5+Math.PI/2,r=k%2?.085:.19; if(k===0)star.moveTo(Math.cos(a)*r,Math.sin(a)*r);else star.lineTo(Math.cos(a)*r,Math.sin(a)*r);}star.closePath();
        this.part(g,new T.ExtrudeGeometry(star,{depth:.05,bevelEnabled:false}),j%2?0xe9bd69:0xe4b6c7,sx,sy,-.65,1,1,1,true);
      }
    } else if(index===5) {
      for(let j=0;j<8;j++) {
        const px=-1.4+j*.4;
        this.part(g,this.unitCylinder,['#e29d96','#a6c4ad','#e6c37f'][j%3],px,1.78,1,.12,.4,.12);
        this.beam(g,0xffe9bc,[px,1.9,1],[px+.04,2.2,1],.012);
        if(j%2===0){this.beam(g,0xd4b889,[px,1.6,-.3],[px,2.1,-.3],.012);this.ball(g,0xf0b8cf,px,2.27,-.3,.2,.32,.18);}
      }
    } else {
      for(let j=0;j<5;j++) {
        const px=-1.5+j*.75;
        this.part(g,this.unitCylinder,0xe0ddd0,px,1.64,1,.3,.06,.25);
        for(let k=0;k<5;k++) {
          const a=k*2.4;
          this.ball(g,index===2?0xc88a51:['#e9c16b','#a7be7b','#dfaa8f'][j%3],px+Math.cos(a)*.15,1.72,1+Math.sin(a)*.1,.09,.07,.08);
        }
      }
      if(index===2) {
        this.part(g,this.unitCylinder,0x545658,-1,1.67,-.2,.4,.12,.4);
        for(let j=0;j<6;j++)this.beam(g,0xd2ae7b,[.2+j*.18,1.65,-.5],[.3+j*.18,1.65,.4],.015);
      } else {
        for(let j=0;j<3;j++)this.part(g,this.unitCylinder,0xc39b74,-1+j,1.8,-.6,.35,.45,.3);
      }
    }
  }
  private buildWheel() {
    const g=this.staticRoot, cx=22, cy=6.5, cz=-3.8, radius=4.65;
    this.box(g,0xc1ad8d,cx,.18,-2.8,5.2,.36,4.4);
    for(let i=0;i<3;i++)this.box(g,0xd7bf9c,cx,.1+i*.12,-.15-i*.25,2.6,.18,.5);
    for(const z of [cz-.65,cz+.65])for(const side of [-1,1]) {
      this.beam(g,0xc9d5d2,[cx+side*2.05,.4,z],[cx,cy,z],.16);
      this.beam(g,0xe6c27f,[cx+side*1.9,.5,z+.1],[cx,cy,z+.1],.035,true);
      this.box(g,0x8a9c9e,cx+side*2.05,.4,z,.65,.3,.65);
    }
    this.beam(g,0x829caa,[cx,cy,cz-1],[cx,cy,cz+1.1],.22);
    for(const side of [-1,1]) {
      this.beam(g,0xe2c18d,[cx+side*1.25,.5,-.2],[cx+side*1.25,1.2,-.2],.035);
      this.beam(g,0xe2c18d,[cx+side*1.25,1.2,-.2],[cx+side*1.25,1.2,-1.3],.035);
    }
    const banner=this.sign('ชิงช้าสวรรค์ · คืนแห่งความสุข',6.4,.8,'#fff2cd','#785c65');banner.position.set(cx,12.05,cz);g.add(banner);
    this.wheel.position.set(cx,cy,cz);this.scene.add(this.wheel);
    for(const z of [-.45,.45]) {
      this.part(this.wheel,new T.TorusGeometry(radius,.075,6,80),0xefca86,0,0,z,1,1,1);
      this.part(this.wheel,new T.TorusGeometry(radius-.2,.023,4,80),0xf7d58e,0,0,z+.03,1,1,1,true);
    }
    for(let i=0;i<12;i++) {
      const a=i*Math.PI*2/12,x=Math.cos(a)*radius,y=Math.sin(a)*radius;
      for(const z of [-.45,.45])this.beam(this.wheel,0xd3b28a,[0,0,z],[x,y,z],.045);
      this.beam(this.wheel,0xa9bfbe,[x,y,-.45],[x,y,.45],.045);
      const cabin=new T.Group();this.scene.add(cabin);this.cabins.push(cabin);
      const tint=['#e7b2a8','#99bcb2','#e2bf79','#bba6cf'][i%4];
      this.box(cabin,tint,0,-.3,0,.88,.6,.82);
      this.box(cabin,0xe9cd9e,0,-.66,0,.95,.1,.87);
      this.box(cabin,tint,0,.46,0,1.02,.15,.94);
      for(const px of [-.4,.4])for(const pz of [-.36,.36])this.beam(cabin,0xffe1b3,[px,-.05,pz],[px,.42,pz],.025);
      this.box(cabin,0x775a54,0,-.1,-.28,.66,.1,.24);
      this.beam(cabin,0xe5cda9,[0,.48,0],[0,.8,0],.035);
      this.batch(cabin);
    }
    for(let i=0;i<72;i++) {const a=i*Math.PI*2/72;this.ball(this.wheel,i%3===0?0xf2a7ae:0xffd788,Math.cos(a)*radius,Math.sin(a)*radius,.51,.055,.055,.055,true);}
    this.ball(this.wheel,0xffd990,0,0,.6,.43,.43,.12,true);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;this.ball(this.wheel,0xe6b88a,Math.cos(a)*.52,Math.sin(a)*.52,.55,.16,.25,.08,true);}
    this.batch(this.wheel);
  }
  private buildCrowd() {
    const limbs=this.person(this.crowdTemplate,"#ffffff",false);
    this.crowdLegs=limbs.legs;this.crowdArms=limbs.arms;
    const colors=["#b5a6c9","#dda98a","#87b4aa","#e4bc78","#9bb5d4","#ce9eb2"];
    this.crowdTemplate.traverse(source=>{
      if(!(source instanceof T.Mesh))return;
      const instances=new T.InstancedMesh(source.geometry,source.material,15);
      instances.instanceMatrix.setUsage(T.DynamicDrawUsage);instances.frustumCulled=false;
      instances.name="Wandering fair visitors";
      if(source.material instanceof T.MeshStandardMaterial&&source.material.color.getHex()===0xffffff)
        for(let i=0;i<15;i++)instances.setColorAt(i,new T.Color(colors[i%colors.length]));
      this.scene.add(instances);this.crowdParts.push({source,instances});
    });
    this.canvas.dataset.npcCount=String(this.crowd.visitors.length);
  }
  private person(g: T.Group,color: string, articulated: boolean) {
    const legs:T.Group[]=[],arms:T.Group[]=[];
    for(const side of [-1,1]) {
      const leg=new T.Group();leg.position.set(side*.14,.5,0);g.add(leg);
      this.box(leg,0x4b526b,0,-.18,0,.21,.42,.23);this.box(leg,0xf0d8b6,0,-.4,.06,.24,.13,.36);
      const arm=new T.Group();arm.position.set(side*.32,1.03,0);g.add(arm);
      this.ball(arm,color,0,-.09,0,.11,.22,.12);this.ball(arm,0xe9bf9d,0,-.33,.03,.085,.15,.09);
      legs.push(leg);arms.push(arm);
      if(articulated){this.legs.push(leg);this.arms.push(arm);}
    }
    this.ball(g,color,0,.86,0,.32,.42,.24);
    this.ball(g,0xe9bf9d,0,1.42,0,.29,.32,.27);
    this.ball(g,0x584b51,0,1.62,-.05,.29,.17,.26);
    for(const side of [-1,1])this.ball(g,0x443e48,side*.105,1.44,.25,.026,.035,.018);
    // Contact ellipse requires no shadow maps.
    const shadowMat=new T.MeshBasicMaterial({color:0x3b4946,transparent:true,opacity:.2,depthWrite:false});this.mats.add(shadowMat);
    const geo=new T.CircleGeometry(.45,20);this.geos.add(geo);const shadow=new T.Mesh(geo,shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=.05;shadow.scale.y=.65;g.add(shadow);
    return {legs,arms};
  }
  private buildPlayer(name: string, photo: string) {
    const hue=(Array.from(name).reduce((n,s)=>n+s.charCodeAt(0),0)*29)%360;
    this.person(this.player,`hsl(${hue}, 35%, 65%)`,true);this.scene.add(this.player);
    const label=this.sign(name,1.85,.32,'#fff0d3','#334e54');label.position.set(0,2.22,0);this.player.add(label);
    const c=document.createElement('canvas');c.width=c.height=128;
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;this.textures.add(texture);
    const mat=new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false});this.mats.add(mat);
    const face=new T.Sprite(mat);face.position.set(0,1.48,.19);face.scale.set(.69,.69,1);this.player.add(face);
    this.image.crossOrigin='anonymous';
    this.image.onload=()=>{if(this.disposed)return;const ctx=c.getContext('2d')!;ctx.clearRect(0,0,128,128);ctx.save();ctx.beginPath();ctx.arc(64,64,61,0,Math.PI*2);ctx.clip();ctx.drawImage(this.image,0,0,128,128);ctx.restore();ctx.strokeStyle='#ffe4ad';ctx.lineWidth=5;ctx.beginPath();ctx.arc(64,64,61,0,Math.PI*2);ctx.stroke();texture.needsUpdate=true;};
    this.image.onerror=()=>{this.image.onerror=null;face.visible=false;};this.image.src=photo;
  }
  private batch(root: T.Group) {
    root.updateMatrixWorld(true);
    const inverse=root.matrixWorld.clone().invert();
    const lists=new Map<boolean,T.BufferGeometry[]>(), remove:T.Mesh[]=[];
    root.traverse(obj=>{
      if(!(obj instanceof T.Mesh)||!(obj.material instanceof T.MeshStandardMaterial))return;
      const original=obj.geometry.clone().applyMatrix4(inverse.clone().multiply(obj.matrixWorld));
      const geo=original.index?original.toNonIndexed():original;if(geo!==original)original.dispose();
      const attr=geo.getAttribute('position'),colors=new Float32Array(attr.count*3);
      for(let i=0;i<attr.count;i++)obj.material.color.toArray(colors,i*3);
      geo.setAttribute('color',new T.BufferAttribute(colors,3));
      // Source primitives all have normals and UVs, but batching needs only position/normal/color.
      geo.deleteAttribute('uv');
      const glow=obj.material.emissive.getHex()!==0;const list=lists.get(glow)||[];list.push(geo);lists.set(glow,list);remove.push(obj);
    });
    remove.forEach(obj=>obj.removeFromParent());
    for(const [glow,list]of lists){
      const geo=mergeGeometries(list);list.forEach(g=>g.dispose());if(!geo)throw Error('Fair geometry batching failed');this.geos.add(geo);
      const mat=glow?new T.MeshBasicMaterial({vertexColors:true}):new T.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.03});this.mats.add(mat);
      const mesh=new T.Mesh(geo,mat);mesh.name=glow?'Fair decorative lights':'Fair modeled surfaces';root.add(mesh);
    }
  }
  resize(width: number,height: number) {
    this.width=width;this.height=height;this.renderer.setSize(width,height);
  }
  targetAt(clientX: number,clientY: number) {
    this.ray.setFromCamera(new T.Vector2(clientX/this.width*2-1,1-clientY/this.height*2),this.camera);
    const p=this.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());
    return p?T.MathUtils.clamp(p.x*100,100,3700):null;
  }
  update(x: number,time: number,step: number,moving: boolean,riding: boolean,reduced: boolean,dt: number) {
    if(this.lost)return;
    const mobile=this.width<700;
    const height=mobile?(riding?26:21):(x>1800&&x<2650?19.2:17.5), halfWidth=height*this.width/this.height/2;
    this.camera.left=-halfWidth;this.camera.right=halfWidth;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();
    const target=T.MathUtils.clamp(x/100,Math.min(7,halfWidth),Math.max(31,38-halfWidth));
    this.focus+=(target-this.focus)*Math.min(1,dt*7);
    this.camera.position.set(this.focus+3,11.2,18);this.camera.lookAt(this.focus,4.4,-1);this.camera.updateMatrixWorld();
    this.angle=reduced?0:time*.14;
    this.wheel.rotation.z=this.angle;
    this.cabins.forEach((c,i)=>{const a=i*Math.PI*2/12+this.angle;c.position.set(22+Math.cos(a)*4.65,6.5+Math.sin(a)*4.65-.8,-3.8);});
    if(riding){this.player.position.copy(this.cabins[9].position);this.player.position.y-=.52;this.player.position.z+=.18;this.player.scale.setScalar(.63);}
    else {this.player.position.set(x/100,.08,3.4);this.player.scale.setScalar(1);}
    this.player.rotation.y=moving?Math.sin(step)*.02:0;
    this.legs.forEach((leg,i)=>leg.rotation.x=moving&&!reduced?Math.sin(step+i*Math.PI)*.5:0);
    this.arms.forEach((arm,i)=>arm.rotation.x=moving&&!reduced?Math.sin(step+i*Math.PI)*-.32:0);
    this.crowd.update(dt,reduced);
    this.crowd.visitors.forEach((visitor,index)=>{
      this.crowdTemplate.position.set(visitor.x,.08,visitor.z);
      this.crowdTemplate.rotation.y=visitor.heading;
      this.crowdTemplate.scale.setScalar(.85+(index%4)*.055);
      this.crowdLegs.forEach((leg,i)=>leg.rotation.x=visitor.moving&&!reduced?Math.sin(visitor.phase+i*Math.PI)*.45:0);
      this.crowdArms.forEach((arm,i)=>arm.rotation.x=visitor.moving&&!reduced?Math.sin(visitor.phase+i*Math.PI)*-.3:0);
      this.crowdTemplate.updateMatrixWorld(true);
      for(const part of this.crowdParts)part.instances.setMatrixAt(index,part.source.matrixWorld);
    });
    for(const part of this.crowdParts)part.instances.instanceMatrix.needsUpdate=true;
    this.canvas.dataset.npcMotion=this.crowd.visitors.reduce((sum,v)=>sum+v.phase,0).toFixed(4);
    this.renderer.render(this.scene,this.camera);
    this.canvas.dataset.drawCalls=String(this.renderer.info.render.calls);
    this.canvas.dataset.triangles=String(this.renderer.info.render.triangles);
    this.canvas.dataset.wheelAngle=String(this.angle);
  }
  dispose() {
    this.disposed=true;this.image.onload=null;this.image.onerror=null;this.image.src='';
    this.canvas.removeEventListener('webglcontextlost',this.contextLost);this.canvas.removeEventListener('webglcontextrestored',this.contextRestored);
    this.crowdParts.forEach(part=>part.instances.dispose());
    this.geos.forEach(g=>g.dispose());this.mats.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.renderer.dispose();this.scene.clear();
  }
}
