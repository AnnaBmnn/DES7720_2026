import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function createDomePreview(renderer, texture, fovDegrees) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 0.03;
  controls.maxDistance = 30;
  controls.enabled = false;
  let isInside = false;

  const material = new THREE.ShaderMaterial({
    uniforms: { envMap: { value: texture } },
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform samplerCube envMap;
      varying vec3 direction;
      void main() {
        gl_FragColor = vec4(textureCube(envMap, normalize(direction)).rgb, 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide
  });
  const cap = new THREE.Mesh(new THREE.BufferGeometry(), material);
  const wire = new THREE.Mesh(cap.geometry, new THREE.MeshBasicMaterial({
    color: 0x91a3b8,
    wireframe: true,
    transparent: true,
    opacity: 0.025,
    side: THREE.DoubleSide,
    depthWrite: false
  }));
  const rim = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
    color: 0x91a3b8,
    transparent: true,
    opacity: 0.5
  }));
  scene.add(cap, wire, rim);

  function setFov(degrees) {
    const angle = THREE.MathUtils.degToRad(degrees) / 2;
    cap.geometry.dispose();
    cap.geometry = new THREE.SphereGeometry(3, 48, 32, 0, Math.PI * 2, 0, angle);
    wire.geometry = cap.geometry;
    const points = [];
    for (let index = 0; index < 96; index++) {
      const phi = index / 96 * Math.PI * 2;
      points.push(new THREE.Vector3(3 * Math.sin(angle) * Math.cos(phi), 3 * Math.cos(angle), 3 * Math.sin(angle) * Math.sin(phi)));
    }
    rim.geometry.dispose();
    rim.geometry = new THREE.BufferGeometry().setFromPoints(points);
    rim.visible = degrees < 360;
  }

  function setInside(inside) {
    isInside = inside;
    wire.visible = !inside;
    controls.enableZoom = !inside;
    camera.fov = 60;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    camera.position.set(...(inside ? [0, -0.05, 0.001] : [4, -2, 5]));
    controls.update();
  }

  renderer.domElement.addEventListener("wheel", (event) => {
    if (!isInside || !controls.enabled) return;
    event.preventDefault();
    camera.fov = THREE.MathUtils.clamp(camera.fov + event.deltaY * 0.04, 30, 110);
    camera.updateProjectionMatrix();
  }, { passive: false });

  setFov(fovDegrees);
  setInside(false);

  return { scene, camera, controls, setFov, setInside, reset: () => setInside(false) };
}
