import * as THREE from "three";

const linear = Float32Array.from({ length: 256 }, (_, value) => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
});

export function createPNGExporter(renderer, width, height) {
  const gl = renderer.getContext();
  const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  const maximum = Math.min(renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
  if (width > maximum || height > maximum || width > viewport[0] || height > viewport[1]) {
    throw new Error(`This device cannot render ${width} × ${height}`);
  }

  const target = new THREE.WebGLRenderTarget(width, height);
  target.texture.colorSpace = THREE.SRGBColorSpace;
  let pixels = new Uint8Array(width * height * 4);
  let row = new Uint8Array(width * 4);
  let image = new ImageData(new Uint8ClampedArray(pixels.buffer), width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  return {
    render(scene, camera) {
      const previous = renderer.getRenderTarget();
      try {
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
      } finally {
        renderer.setRenderTarget(previous);
      }
    },

    async png() {
      renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
      const stride = width * 4;
      for (let y = 0; y < Math.floor(height / 2); y++) {
        const top = y * stride;
        const bottom = (height - y - 1) * stride;
        row.set(pixels.subarray(top, top + stride));
        pixels.copyWithin(top, bottom, bottom + stride);
        pixels.set(row, bottom);
      }
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        if (alpha === 0 || alpha === 255) continue;
        for (let channel = 0; channel < 3; channel++) {
          const value = Math.min(1, linear[pixels[index + channel]] * 255 / alpha);
          pixels[index + channel] = Math.round(255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055));
        }
      }
      context.putImageData(image, 0, 0);
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png");
      });
    },

    dispose() {
      target.dispose();
      canvas.width = canvas.height = 0;
      pixels = row = image = null;
    }
  };
}
