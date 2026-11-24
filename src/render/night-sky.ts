import * as T from "three";
import backdropUrl from "../assets/scenery/river-night.webp?url";
export { backdropUrl as NIGHT_BACKDROP_URL };

/** A photographic background plate plus one screen-space star draw. */
export class NightSky {
  readonly group = new T.Group();
  readonly material: T.ShaderMaterial;
  readonly stars: T.Points;
  private image = new Image();
  constructor(private host: HTMLElement) {
    host.style.backgroundImage = `url("${backdropUrl}")`;
    this.image.onload = () => { host.dataset.backgroundReady = "true"; };
    this.image.onerror = () => { host.dataset.backgroundReady = "failed"; };
    this.image.src = backdropUrl;
    let seed = 2411;
    const random = () => { seed = Math.imul(seed, 1664525) + 1013904223; return (seed >>> 0) / 4294967296; };
    const positions: number[] = [], phases: number[] = [], sizes: number[] = [], rates: number[] = [];
    for (let i = 0; i < 104; i++) {
      positions.push(random() * 1.94 - .97, .96 - random() * .53, 0);
      phases.push(random() * Math.PI * 2);
      sizes.push(i % 13 === 0 ? 3.6 : 1 + random() * 1.8);
      rates.push(.45 + random() * 1.35);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("phase", new T.Float32BufferAttribute(phases, 1));
    geometry.setAttribute("size", new T.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute("rate", new T.Float32BufferAttribute(rates, 1));
    this.material = new T.ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false,
      blending: T.AdditiveBlending, toneMapped: false,
      uniforms: { time: { value: 0 }, pixelRatio: { value: 1 }, aspect: { value: 1 }, moon: { value: new T.Vector2(.47, .1) } },
      vertexShader: `
        attribute float phase; attribute float size; attribute float rate;
        uniform float time; uniform float pixelRatio; uniform float aspect; uniform vec2 moon;
        varying float brightness; varying float sparkle;
        void main() {
          vec2 uv=vec2(position.x*.5+.5, .5-position.y*.5);
          float away=smoothstep(.045,.08,length(vec2((uv.x-moon.x)*aspect,uv.y-moon.y)));
          brightness=(.1+.8*pow(.5+.5*sin(time*rate+phase),3.))*away;
          sparkle=step(3.,size);
          gl_PointSize=size*pixelRatio;
          gl_Position=vec4(position.xy,.999,1.);
        }`,
      fragmentShader: `
        varying float brightness; varying float sparkle;
        void main() {
          vec2 p=gl_PointCoord-.5;
          float core=exp(-dot(p,p)*25.);
          float cross=(exp(-abs(p.x)*38.)*exp(-abs(p.y)*5.)+exp(-abs(p.y)*38.)*exp(-abs(p.x)*5.))*.25*sparkle;
          float alpha=(core+cross)*brightness*.65;
          gl_FragColor=vec4(vec3(.78,.87,1.),alpha);
        }`,
    });
    this.stars = new T.Points(geometry, this.material);
    this.stars.name = "Twinkling river stars";
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -100;
    this.group.add(this.stars);
  }
  resize(width: number, height: number, pixelRatio: number) {
    const scale = Math.max(width / 1774, height / 887);
    this.material.uniforms.aspect.value = width / height;
    this.material.uniforms.pixelRatio.value = pixelRatio;
    this.material.uniforms.moon.value.set((.47 * 1774 * scale - (1774 * scale - width) * .55) / width, .1 * 887 * scale / height);
    this.stars.geometry.setDrawRange(0, width < 760 ? 60 : 104);
  }
  update(time: number) { this.material.uniforms.time.value = time; }
  dispose() {
    this.image.onload = this.image.onerror = null;
    this.stars.geometry.dispose(); this.material.dispose();
    this.host.style.backgroundImage = "";
    delete this.host.dataset.backgroundReady;
  }
}
