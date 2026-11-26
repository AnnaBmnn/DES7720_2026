/*
*
* https://codelabs.developers.google.com/codelabs/tensorflowjs-object-detection#4
*
*/

let video, canvas, ctx;
let model
let previousDetections = {};
const SMOOTHING = 0.2;

const WIDTH = 640, HEIGHT = 480;

export function createObjectDetection() {
  video = document.getElementById('video');
  canvas = document.getElementById('canvasBodypose');
  canvas.width = WIDTH;          // final size now, before three.js sees it
  canvas.height = HEIGHT;
  ctx = canvas.getContext('2d');

  // Before we can use COCO-SSD class we must wait for it to finish
  // loading. Machine Learning models can be large and take a moment 
  // to get everything needed to run.
  // Note: cocoSsd is an external object loaded from our index.html
  // script tag import so ignore any warning in Glitch.
  cocoSsd.load().then(function (loadedModel) {
    model = loadedModel;
    startCamera()
  });
  return canvas;
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: WIDTH, height: HEIGHT },
  });

  video.srcObject = stream;

  await new Promise(r => (video.onloadedmetadata = r));

  video.width = video.videoWidth;
  video.height = video.videoHeight;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // video.style.display = 'none';

  await video.play();

  detectAndDraw();
}



async function detectAndDraw() {
  const predictions = await model.detect(video);
  drawPredictions(predictions);
  requestAnimationFrame(detectAndDraw);
}

function drawPredictions(predictions) {

  //ctx.clearRect(0, 0, canvas.width, canvas.height);
  //ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  predictions.forEach((prediction) => {
    console.log(prediction.class)
    // We store the cell bounding box in the red channel
    // often cell is detected as remote or skate, so we include it in the search
    if (['cell', 'remote', 'skate', 'glass','cup', 'bowl'].includes(prediction.class)) {
      const [x, y, width, height] = smoothDetection(prediction);

      ctx.beginPath();
      ctx.fillStyle = 'red';
      ctx.lineWidth = 2;
      ctx.rect(x, y, width, height);
      ctx.fill(); // Render the path
    }
    if (['person'].includes(prediction.class)) {
      // We store the person bounding box in the green channel
      const [x, y, width, height] = smoothDetection(prediction);
      ctx.beginPath();
      ctx.fillStyle = 'green';
      ctx.lineWidth = 2;
      ctx.rect(x, y, width, height);
      ctx.fill(); // Render the path
    }

  });

}

function smoothDetection(prediction) {
  const [x, y, width, height] = prediction.bbox;
  const key = prediction.class;

  if (!previousDetections[key]) {
    previousDetections[key] = [x, y, width, height];
    return prediction.bbox;
  }

  const previous = previousDetections[key];

  const smoothed = [
    x * SMOOTHING + previous[0] * (1 - SMOOTHING),
    y * SMOOTHING + previous[1] * (1 - SMOOTHING),
    width * SMOOTHING + previous[2] * (1 - SMOOTHING),
    height * SMOOTHING + previous[3] * (1 - SMOOTHING)
  ];

  previousDetections[key] = smoothed;

  return smoothed;
}