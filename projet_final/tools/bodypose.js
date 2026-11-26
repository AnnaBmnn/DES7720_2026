let detector, video, canvas, ctx;
let isRunning = false;
let rafId;

const WIDTH = 640, HEIGHT = 480;

// Synchronous: returns the canvas immediately, starts loading in the background
export function createBody() {
  canvas = document.getElementById('canvasBodypose');
  canvas.width = WIDTH;          // final size now, before three.js sees it
  canvas.height = HEIGHT;
  ctx = canvas.getContext('2d');
  video = document.getElementById('video');

  init();                        // not awaited
  return canvas;
}

async function init() {
  try {
    await tf.ready();
    await Promise.all([startCamera(), loadModel()]);
    isRunning = true;
    detectPose();
  } catch (err) {
    console.error('Bodypose init failed:', err);
  }
}

async function loadModel() {
  detector?.dispose();
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
  );
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: WIDTH, height: HEIGHT },
  });
  video.srcObject = stream;
  await new Promise(r => (video.onloadedmetadata = r));
  video.width = video.videoWidth;   // needed by pose-detection
  video.height = video.videoHeight;
//   video.style.display = 'none';
  await video.play();
}

export function stopBody() {
  isRunning = false;
  video.srcObject?.getTracks().forEach(t => t.stop());
  video.srcObject = null;
  if (rafId) cancelAnimationFrame(rafId);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function detectPose() {
  if (!isRunning) return;
  if (video.readyState === 4) {
    // On ne dessine plus la vidéo mais un fond sur le canavs
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const poses = await detector.estimatePoses(video);
      drawPoses(poses);
    } catch (err) {
      console.error('Error detecting poses:', err);
    }
  }
  rafId = requestAnimationFrame(detectPose);
}

// Draw detected poses on the canvas
function drawPoses(poses) {

    // For each detected pose
    for (const pose of poses) {
        // Draw keypoints
        for (const keypoint of pose.keypoints) {
            if (keypoint.score > 0.3) {
                // ctx.beginPath();
                // ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                // ctx.fillStyle = 'red';
                // ctx.fill();

                // Optionally draw keypoint name
                ctx.fillStyle = 'white';
                //ctx.fillText(keypoint.name, keypoint.x + 10, keypoint.y + 5);
            }
        }

        // Draw skeleton (if available)
        if (pose.keypoints.length > 5) { // Basic check to ensure we have enough keypoints
            drawSkeleton(pose);
        }
    }
}

// Draw the skeleton connecting keypoints
function drawSkeleton(pose) {
    // Define connections for a human skeleton
    const connections = [
        ['nose', 'left_eye'], ['nose', 'right_eye'],
        ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
        ['nose', 'left_shoulder'], ['nose', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
        ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
        ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
    ];

    // Create a map for fast keypoint lookup
    const keypointMap = {};
    pose.keypoints.forEach(keypoint => {
        keypointMap[keypoint.name] = keypoint;
    });

    // Draw connections
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 4;

    for (const [p1Name, p2Name] of connections) {

        const p1 = keypointMap[p1Name];
        const p2 = keypointMap[p2Name];

        if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }
}