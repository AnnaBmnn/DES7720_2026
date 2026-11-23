import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
// scène de dé template : - )
export function createScene(scene) {
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(3, 5, 2);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(-4, 2, -3);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35), key, fill);

  const pips = [
    [[0, 0]],
    [[-1, -1], [1, 1]],
    [[-1, -1], [0, 0], [1, 1]],
    [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]]
  ];

  const materials = [1, 6, 2, 5, 3, 4].map((face) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, 256, 256);
    context.fillStyle = "#111";
    for (const [x, y] of pips[face - 1]) {
      context.beginPath();
      context.arc(128 + x * 72, 128 + y * 72, 22, 0, Math.PI * 2);
      context.fill();
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map, roughness: 0.35 });
  });

  const dice = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 10, 0.12), materials);
  scene.add(dice);

  return (time) => {
    const phase = (time % 5) / 5;
    dice.position.y = 1.2 + Math.sin(Math.PI * phase) * 0.6;
    dice.rotation.y = phase * Math.PI * 2;
  };
}
