import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createScene } from "../sceneMaster.js";
import { createDomePreview } from "./domePreview.js";
// import { createPNGExporter } from "./pngExporter.js";

const form = document.querySelector("form");
const view = document.querySelector("main");
const mode = document.querySelector("#mode");
const inside = document.querySelector("#inside");
const size = document.querySelector("#size");
const fov = document.querySelector("#fov");
const fps = document.querySelector("#fps");
const frames = document.querySelector("#frames");
const renderCamera = document.querySelector("#camera");
const quality = document.querySelector("#quality");
const alpha = document.querySelector("#alpha");
const pngPath = document.querySelector("#png-path");
const sequencePath = document.querySelector("#sequence-path");
const pause = document.querySelector("#pause");
const cancel = document.querySelector("#cancel");
const status = document.querySelector("#status");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
view.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const animate = createScene(scene);
const grid = new THREE.GridHelper(12, 24);
grid.layers.set(1);
scene.add(grid);

const preview = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
preview.position.set(3, 3, 4);
preview.layers.enable(1);
const controls = new OrbitControls(preview, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
controls.update();
controls.saveState();

const target = new THREE.WebGLCubeRenderTarget(512);
target.texture.colorSpace = THREE.LinearSRGBColorSpace;
const camera = new THREE.CubeCamera(0.1, 500, target);
const domePreview = createDomePreview(renderer, target.texture, Number(fov.value));

const material = new THREE.ShaderMaterial({
  uniforms: {
    envMap: { value: target.texture },
    fov: { value: THREE.MathUtils.degToRad(Number(fov.value)) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    uniform samplerCube envMap;
    uniform float fov;
    varying vec2 vUv;
    void main() {
      vec2 p = vUv * 2.0 - 1.0;
      p.y *= -1.0;
      float r = length(p);
      if (r > 1.0) discard;
      float theta = r * fov * 0.5;
      float phi = atan(p.y, p.x);
      vec3 direction = vec3(sin(theta) * cos(phi), cos(theta), sin(theta) * sin(phi));
      gl_FragColor = textureCube(envMap, direction);
      #include <colorspace_fragment>
    }
  `,
  depthTest: false,
  depthWrite: false
});

const output = new THREE.Scene();
output.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
const outputCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const backgroundColor = new THREE.Color("#2b2b2b");
let playing = true;
let capturing = false;
let cancelled = false;
let elapsed = 0;
let previous = 0;
let cubeTime = NaN;
let isInside = false;
let exporter = null;

function update(time) {
  animate(time);
  scene.background = alpha.checked ? null : backgroundColor;
}

function setCubeSize(side) {
  if (target.width === side) return;
  target.setSize(side, side);
  cubeTime = NaN;
}

function liveCubeSize(pixels) {
  const wanted = THREE.MathUtils.ceilPowerOfTwo(Math.max(512, Math.round(pixels / 2)));
  return Math.min(wanted, renderer.capabilities.maxCubemapSize);
}

function resize() {
  const dome = mode.value === "dome";
  const width = Math.max(1, view.clientWidth);
  const height = Math.max(1, view.clientHeight);
  const side = Math.min(width, height);
  const scale = Number(quality.value);
  if (mode.value !== "viewport") setCubeSize(liveCubeSize(side * scale));
  renderer.setSize(Math.round((dome ? side : width) * scale), Math.round((dome ? side : height) * scale), false);
  const gl = renderer.getContext();
  renderer.setViewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  renderer.domElement.style.width = `${dome ? side : width}px`;
  renderer.domElement.style.height = `${dome ? side : height}px`;
  renderer.domElement.style.clipPath = dome ? "circle(50%)" : "none";
  renderer.domElement.style.background = dome ? "#000" : "transparent";
  preview.aspect = width / height;
  preview.updateProjectionMatrix();
  domePreview.camera.aspect = preview.aspect;
  domePreview.camera.updateProjectionMatrix();
  controls.enabled = mode.value === "viewport";
  domePreview.controls.enabled = mode.value === "dome-preview";
  inside.hidden = mode.value !== "dome-preview";
}

function updateCube(time) {
  update(time);
  if (cubeTime === time) return;
  camera.update(renderer, scene);
  cubeTime = time;
}

function applyBackground() {
  scene.background = alpha.checked ? null : backgroundColor;
  domePreview.scene.background = scene.background;
  renderer.setClearColor(backgroundColor, alpha.checked ? 0 : 1);
  cubeTime = NaN;
}

function lock(locked) {
  for (const element of form.querySelectorAll("input, select, button")) {
    if (element !== cancel) element.disabled = locked;
  }
  cancel.hidden = !locked;
}

function prepareExport() {
  const side = Number(size.value);
  const ratio = renderCamera.value === "dome" ? 1 : view.clientWidth / Math.max(1, view.clientHeight);
  const width = Math.round(ratio >= 1 ? side : side * ratio);
  const height = Math.round(ratio >= 1 ? side / ratio : side);
  exporter = createPNGExporter(renderer, width, height);
  if (renderCamera.value !== "viewport") {
    if (side / 2 > renderer.capabilities.maxCubemapSize) throw new Error("Render size exceeds this device's cube texture limit");
    setCubeSize(side / 2);
  }
  preview.aspect = width / height;
  preview.updateProjectionMatrix();
  domePreview.camera.aspect = width / height;
  domePreview.camera.updateProjectionMatrix();
  controls.enabled = false;
  domePreview.controls.enabled = false;
  inside.hidden = true;
  grid.visible = false;
}

function exportFrame(time) {
  if (renderCamera.value === "viewport") {
    update(time);
    exporter.render(scene, preview);
  } else {
    updateCube(time);
    if (renderCamera.value === "dome") exporter.render(output, outputCamera);
    else exporter.render(domePreview.scene, domePreview.camera);
  }
  return exporter.png();
}

function finishExport() {
  exporter?.dispose();
  exporter = null;
  capturing = false;
  grid.visible = true;
  lock(false);
  resize();
}

document.querySelector("#still").onclick = async () => {
  if (!form.reportValidity()) return;
  capturing = true;
  lock(true);
  cancel.hidden = true;
  status.value = "Rendering PNG…";
  try {
    prepareExport();
    const body = await exportFrame(elapsed);
    const file = await savePNG(`/still?camera=${renderCamera.value}`, body);
    status.value = `Saved: ${file}`;
  } catch (error) {
    status.value = error.message;
  } finally {
    finishExport();
  }
};

document.querySelector("#render").onclick = async () => {
  if (!form.reportValidity()) return;
  const rate = Number(fps.value);
  const totalFrames = Number(frames.value);
  const shot = `render_${Date.now()}`;
  capturing = true;
  cancelled = false;
  lock(true);
  status.value = `Rendering 0/${totalFrames}`;
  let saved = 0;
  let folder = "";
  try {
    prepareExport();
    for (let frame = 0; frame < totalFrames && !cancelled; frame++) {
      const body = await exportFrame(frame / rate);
      folder = await savePNG(`/frame?shot=${shot}&frame=${frame}`, body);
      saved++;
      status.value = `Rendering ${saved}/${totalFrames}`;
    }
    status.value = `${cancelled ? "Cancelled" : "Saved"}: ${saved} ${saved === 1 ? "frame" : "frames"}${folder ? ` in ${folder}` : ""}`;
  } catch (error) {
    status.value = error.message;
  } finally {
    finishExport();
  }
};

cancel.onclick = () => { cancelled = true; };
pause.onclick = () => {
  playing = !playing;
  pause.textContent = playing ? "Pause" : "Play";
};
document.querySelector("#reset").onclick = () => {
  elapsed = 0;
  controls.reset();
  domePreview.reset();
  isInside = false;
  inside.textContent = "Inside";
};
inside.onclick = () => {
  isInside = !isInside;
  domePreview.setInside(isInside);
  inside.textContent = isInside ? "Outside" : "Inside";
};
mode.onchange = resize;
quality.onchange = resize;
alpha.onchange = applyBackground;
fov.onchange = () => {
  if (!fov.reportValidity()) return;
  material.uniforms.fov.value = THREE.MathUtils.degToRad(Number(fov.value));
  domePreview.setFov(Number(fov.value));
};
window.addEventListener("resize", () => { if (!capturing) resize(); });
window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() !== "m" || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.isContentEditable || event.target.matches("textarea, input[type=text]:not([readonly])")) return;
  event.preventDefault();
  form.hidden = !form.hidden;
  if (!capturing) resize();
});
applyBackground();
resize();
loadPaths();

async function savePNG(url, body) {
  const response = await fetch(url, { method: "POST", body });
  if (!response.ok) throw new Error(await response.text() || "Could not save PNG");
  return response.text();
}

function showPaths(paths) {
  pngPath.value = pngPath.title = paths.png;
  sequencePath.value = sequencePath.title = paths.sequence;
}

async function loadPaths() {
  try {
    const response = await fetch("/paths");
    if (!response.ok) throw new Error("Restart the server to load folder controls");
    showPaths(await response.json());
  } catch (error) {
    status.value = error.message;
  }
}

async function chooseFolder(kind) {
  lock(true);
  cancel.hidden = true;
  try {
    const response = await fetch(`/folder?kind=${kind}`, { method: "POST" });
    if (!response.ok) throw new Error((await response.json()).error || "Could not choose folder");
    const paths = await response.json();
    showPaths(paths);
    if (!paths.cancelled) status.value = `${kind === "png" ? "PNG" : "Sequence"} folder selected`;
  } catch (error) {
    status.value = error.message;
  } finally {
    lock(false);
  }
}

document.querySelector("#png-folder").onclick = () => chooseFolder("png");
document.querySelector("#sequence-folder").onclick = () => chooseFolder("sequence");

renderer.setAnimationLoop((time) => {
  const delta = previous ? (time - previous) / 1000 : 0;
  previous = time;
  if (capturing) return;
  if (playing) elapsed += delta;
  if (mode.value === "dome") {
    updateCube(elapsed);
    renderer.render(output, outputCamera);
  } else if (mode.value === "dome-preview") {
    updateCube(elapsed);
    domePreview.controls.update();
    renderer.render(domePreview.scene, domePreview.camera);
  } else {
    controls.update();
    update(elapsed);
    renderer.render(scene, preview);
  }
});
