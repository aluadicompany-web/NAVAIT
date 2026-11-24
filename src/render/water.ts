import * as T from "three";
import { NIGHT_BACKDROP_URL } from "./night-sky";

export function createWater() {
  const ready = { value: 0 };
  const texture = new T.TextureLoader().load(NIGHT_BACKDROP_URL, () => { ready.value = 1; });
  texture.colorSpace = T.SRGBColorSpace;
  const material = new T.ShaderMaterial({
    transparent: true, toneMapped: false,
    uniforms: {
      time: { value: 0 }, viewportHeight: { value: 1000 }, viewportWidth: { value: 1000 },
      backdrop: { value: texture }, backdropReady: ready,
    },
    vertexShader: `
      uniform float time; varying vec3 p;
      void main(){vec3 v=position;v.z+=sin(v.x*1.6+time*.6)*.018+cos(v.y*2.8-time*.85)*.012;p=v;gl_Position=projectionMatrix*modelViewMatrix*vec4(v,1.);}`,
    fragmentShader: `
      uniform float time; uniform float viewportHeight; uniform float viewportWidth;
      uniform sampler2D backdrop; uniform float backdropReady; varying vec3 p;
      void main(){
        vec2 screen=gl_FragCoord.xy/vec2(viewportWidth,viewportHeight);
        float aspect=viewportWidth/viewportHeight;
        vec2 cover=vec2(min(1.,aspect/2.),min(1.,2./aspect));
        vec2 uv=vec2(screen.x*cover.x+(1.-cover.x)*.55,1.-(1.-screen.y+.045)*cover.y);
        float ripple=sin(p.x*3.2+p.y*10.-time*.85)+sin(p.x*8.-p.y*19.+time*.65)*.35;
        uv.x+=ripple*.0018;
        uv.y+=sin(p.y*22.+p.x*2.+time*.7)*.0009;
        vec3 photograph=texture2D(backdrop,uv).rgb;
        vec3 col=mix(vec3(.0015,.008,.018),photograph,backdropReady);
        col*=.96+.04*sin(p.y*13.+time*.6)*sin(p.x*2.4-time*.4);
        float glint=pow(max(0.,sin(p.x*5.2+p.y*24.-time*1.1)*sin(p.y*37.+time*.7)),18.);
        col+=glint*vec3(.003,.006,.009);
        float moon=exp(-pow((uv.x-.47+sin(p.y*9.+time)*.007)/.035,2.))*pow(max(0.,sin(p.y*32.+time*.65)),14.);
        col+=moon*vec3(.009,.013,.019);
        float festive=exp(-abs(p.y-1.4)*.5)*pow(max(0.,sin(p.x*1.8+sin(p.y*6.+time*.6)*.3)),12.)*pow(max(0.,sin(p.y*21.+time*.8)),6.);
        col+=festive*vec3(.025,.012,.003);
        float alpha=smoothstep(.32,.48,1.-screen.y);
        gl_FragColor=vec4(col,alpha);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(100, 100, 80, 80), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.06;
  return { mesh, material, texture };
}
