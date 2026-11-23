import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from
    "three/addons/utils/BufferGeometryUtils.js";
// scène de dé template : - )
export function createScene(scene) {
  let progress = 0;
  let isMorph = false
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(3, 5, 2);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(-4, 2, -3);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35), key, fill);


  const geometry = mergeVertices(
    new THREE.BoxGeometry(12, 12, 12, 30, 30, 30)
  );
  const { originalPositions, spherePositions } =
    calculateSpherePosition(geometry);
  console.log(spherePositions)

  const material = new THREE.ShaderMaterial( {
    uniforms: {
      time: { value: 1.0 },
      resolution: { value: new THREE.Vector2() }
    },
    side: THREE.DoubleSide,
    vertexShader: 
    `
      #define PI 3.14159265358979323846;

      varying vec3 vPosition;
      varying vec3 vNormal;
      varying float vTime;

      uniform float time;

      void main()
      {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          vec4 viewPosition = viewMatrix * modelPosition;

          gl_Position = projectionMatrix * viewPosition;

          vPosition = position;
          vNormal = normal;
          vTime = time;
      }
    `
    ,
    fragmentShader: `
      #define PI 3.1415926535897932384626433832795
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying float vTime;

      //  Classic Perlin 2D Noise 
      //  by Stefan Gustavson
      //
      vec4 permute(vec4 x)
      {
          return mod(((x*34.0)+1.0)*x, 289.0);
      }


      vec2 fade(vec2 t)
      {
          return t*t*t*(t*(t*6.0-15.0)+10.0);
      }

      float cnoise(vec2 P)
      {
          vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
          vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
          Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
          vec4 ix = Pi.xzxz;
          vec4 iy = Pi.yyww;
          vec4 fx = Pf.xzxz;
          vec4 fy = Pf.yyww;
          vec4 i = permute(permute(ix) + iy);
          vec4 gx = 2.0 * fract(i * 0.0243902439 ) - 1.0; // 1/41 = 0.024...
          vec4 gy = abs(gx) - 0.5;
          vec4 tx = floor(gx + 0.5);
          gx = gx - tx;
          vec2 g00 = vec2(gx.x,gy.x);
          vec2 g10 = vec2(gx.y,gy.y);
          vec2 g01 = vec2(gx.z,gy.z);
          vec2 g11 = vec2(gx.w,gy.w);
          vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
          g00 *= norm.x;
          g01 *= norm.y;
          g10 *= norm.z;
          g11 *= norm.w;
          float n00 = dot(g00, vec2(fx.x, fy.x));
          float n10 = dot(g10, vec2(fx.y, fy.y));
          float n01 = dot(g01, vec2(fx.z, fy.z));
          float n11 = dot(g11, vec2(fx.w, fy.w));
          vec2 fade_xy = fade(Pf.xy);
          vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
          float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
          return 2.3 * n_xy;
      }
      void main()
      {
        vec3 normal = normalize(vNormal);

        // Blend weights based on surface orientation
        vec3 blend = abs(normal);

        blend = pow(blend, vec3(4.0));
        blend /= (blend.x + blend.y + blend.z);

        // Sample noise from three projections


        vec2 wavedPosX = vec2(
            vPosition.y,
            vPosition.z  + sin(vPosition.z * 101.0 + vTime * 0.01 ) * 0.5 * cos(vPosition.y * 5.0  + vTime * 2.1) + cnoise(vPosition.yz * 10.0) 
        );
        vec2 wavedPosY = vec2(
            vPosition.x,
            vPosition.z  + sin(vPosition.z * 101.0 + vTime * 0.01 ) * 0.5 * cos(vPosition.z * 5.0  + vTime * 2.1) + cnoise(vPosition.xz * 10.0) 
        );
        vec2 wavedPosZ = vec2(
            vPosition.x,
            vPosition.y  + sin(vPosition.x * 101.0 + vTime * 0.01 ) * 0.5 * cos(vPosition.y * 5.0  + vTime * 2.1) + cnoise(vPosition.xy * 10.0) 
        );
        float noiseX = cnoise(wavedPosX.xy * 1.0 + vTime * 1.1);
        float noiseY = cnoise(wavedPosY.xy * 1.0 + vTime * 1.1);
        float noiseZ = cnoise(wavedPosZ.xy * 1.0 + vTime * 1.1);

        // Blend the three projections
        float noise =
            noiseX * blend.x +
            noiseY * blend.y +
            noiseZ * blend.z;

        float color = noise * 1.0 + 0.5;

        gl_FragColor = vec4(vec3(color) , 1.0);

      }

    `
  } );

// const material = new THREE.MeshNormalMaterial({
//     side: THREE.DoubleSide,
//     flatShading: false
// });
  const cube = new THREE.Mesh( geometry, material );
  // cube.scale.x = 12;
  // cube.scale.z = 12;
  // cube.scale.y = 12;
  cube.position.y = 2;
  scene.add( cube );

  // Event
  document.addEventListener('keydown', (e)=>{
    console.log(e.code)
    // A
    if(e.code =='KeyQ'){
      isMorph = true
    }
  })

  return (time) => {
    const phase = (time % 20) / 20;
    // cube.position.y = 1.2 + Math.sin(Math.PI * phase) * 0.6;
    // cube.rotation.z = phase * Math.PI * 2;
    // cube.rotation.x = phase * Math.PI * 2;
    material.uniforms.time.value = time
    if(isMorph){
      progress += 0.05;

      progress = Math.min(progress, 1);
      morph(easeInOut(progress), geometry, originalPositions, spherePositions);
    }

  };
}

function easeInOut(t) {
    return t * t * (3 - 2 * t);
}

function calculateSpherePosition(geometry){
  const positions = geometry.attributes.position;
  const originalPositions = positions.array.slice();

  const spherePositions = [];

  const radius = 6;

  for (let i = 0; i < positions.count; i++) {

      const x = originalPositions[i * 3];
      const y = originalPositions[i * 3 + 1];
      const z = originalPositions[i * 3 + 2];

      const direction = new THREE.Vector3(x, y, z).normalize();

      spherePositions.push(
          direction.x * radius,
          direction.y * radius,
          direction.z * radius
      );
  }
  return {originalPositions, spherePositions};
}

function morph(progress, geometry, originalPositions, spherePositions) {

  const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {

        const j = i * 3;

        positions.array[j] = THREE.MathUtils.lerp(
            originalPositions[j],
            spherePositions[j],
            progress
        );

        positions.array[j + 1] = THREE.MathUtils.lerp(
            originalPositions[j + 1],
            spherePositions[j + 1],
            progress
        );

        positions.array[j + 2] = THREE.MathUtils.lerp(
            originalPositions[j + 2],
            spherePositions[j + 2],
            progress
        );
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
}