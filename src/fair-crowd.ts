/** Decorative visitors use independent destinations, speeds and rest times. */
export class FairCrowd {
  readonly visitors: { x: number; z: number; targetX: number; targetZ: number; speed: number; rest: number; phase: number; heading: number; moving: boolean }[] = [];
  private random: () => number;
  constructor(random: () => number = Math.random) {
    this.random = random;
    for (let i = 0; i < 15; i++) {
      const x = 1.2 + i * 2.4 + random() * .8, z = .8 + random() * 4.9;
      this.visitors.push({x,z,targetX:x,targetZ:z,speed:.55+random()*.65,rest:random()*2,phase:random()*Math.PI*2,heading:random()*Math.PI*2,moving:false});
    }
  }
  update(dt: number, paused = false) {
    if (paused || !Number.isFinite(dt) || dt <= 0) return;
    for (let remaining = Math.min(dt, .2); remaining > 1e-8; remaining -= .025) {
      const step = Math.min(remaining,.025);
      for (const visitor of this.visitors) {
        visitor.moving = false;
        if (visitor.rest > 0) { visitor.rest -= step; continue; }
        const dx=visitor.targetX-visitor.x,dz=visitor.targetZ-visitor.z,distance=Math.hypot(dx,dz);
        if (distance < .08) {
          // Reserve distinct destinations and avoid reversing along the last segment.
          for(let attempt=0;attempt<40;attempt++) {
            const x=1.1+this.random()*35.8,z=.8+this.random()*4.9;
            const direction=Math.atan2(x-visitor.x,z-visitor.z);
            if(Math.hypot(x-visitor.x,z-visitor.z)<2 || Math.cos(direction-visitor.heading)<-.9 || this.visitors.some(other=>other!==visitor&&Math.hypot(x-other.targetX,z-other.targetZ)<.8))continue;
            visitor.targetX=x;visitor.targetZ=z;break;
          }
          visitor.rest=.25+this.random()*1.8;
          continue;
        }
        let vx=dx/distance,vz=dz/distance;
        for(const other of this.visitors) {
          if(other===visitor)continue;
          const sx=visitor.x-other.x,sz=visitor.z-other.z,d=Math.hypot(sx,sz);
          if(d>1e-5&&d<.65){vx+=sx/d*(.65-d)*3;vz+=sz/d*(.65-d)*3;}
        }
        const length=Math.hypot(vx,vz)||1,travel=Math.min(distance,visitor.speed*step);
        visitor.x=Math.max(1.1,Math.min(36.9,visitor.x+vx/length*travel));
        visitor.z=Math.max(.8,Math.min(5.7,visitor.z+vz/length*travel));
        visitor.heading=Math.atan2(vx,vz);visitor.phase+=travel*8;visitor.moving=true;
      }
    }
  }
}
