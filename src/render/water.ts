import * as T from "three";
export function createWater() {
  const material = new T.ShaderMaterial({
    transparent: true,
    uniforms: { time: { value: 0 }, viewportHeight: { value: 1000 } },
    vertexShader: `
 uniform float time; varying vec3 p;
 void main(){vec3 v=position;v.z+=sin(v.x*1.6+time*.6)*.035+cos(v.y*2.8-time*.85)*.025;p=v;gl_Position=projectionMatrix*modelViewMatrix*vec4(v,1.);}`,
    fragmentShader: `
 uniform float time; uniform float viewportHeight; varying vec3 p;
 void main(){float w=sin(p.x*2.5-p.y*7.+time*1.1+sin(p.x*3.+time*.3))*sin(p.y*16.+time*.65);float fine=pow(max(0.,w),16.);vec3 col=mix(vec3(.035,.13,.16),vec3(.09,.29,.27),.5+.5*sin(p.y*.18));col+=fine*vec3(.14,.29,.25);float moon=exp(-pow((p.x-4.+sin(p.y*9.+time)*.45)/1.5,2.))*pow(max(0.,sin(p.y*18.+time)),12.);col+=moon*vec3(.32,.24,.10)*.6;float festive=exp(-abs(p.y-1.4)*.45)*pow(max(0.,sin(p.x*1.8+sin(p.y*6.+time*.6)*.3)),10.)*pow(max(0.,sin(p.y*18.+time*.8)),4.);col+=festive*vec3(.26,.13,.03);float alpha=1.-smoothstep(.63,.77,gl_FragCoord.y/viewportHeight);gl_FragColor=vec4(col,alpha);}`,
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(100, 100, 100, 100), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.06;
  return { mesh, material };
}
