// Variables
var detector;
let model = 'movenet';
let video;
let canvas;
let ctx;
let isRunning = false;
let rafId;

export async function createBody(scene) {


    console.log(scene);

    // Make sure TF.js is loaded
    await tf.ready();

    // Setup canvas
    canvas = document.getElementById('canvasBodypose');
    ctx = canvas.getContext('2d');

    // Get camera element
    video = document.getElementById('video');

    startCamera()

    // Load the initial model
    await loadModel();

    // console.log(ml5);
    return 'coucu';
}

// Load the selected pose detection model
async function loadModel() {
    if (detector) {
        detector.dispose();
    }
    console.log('loading')

    try {
        let modelConfig;

        if (model === 'movenet') {
            modelConfig = {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
            };
        } 
        detector = await poseDetection.createDetector(
            model === 'movenet'
                ? poseDetection.SupportedModels.MoveNet
                : model === 'blazepose'
                    ? poseDetection.SupportedModels.BlazePose
                    : poseDetection.SupportedModels.PoseNet,
            modelConfig
        );

    } catch (error) {
        console.error(error);
    }
}

// Start the camera and pose detection
async function startCamera() {
    try {
        const constraints = {
            video: {
                width: 640,
                height: 480
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            // Required by pose-detection: it uses video.width/height, not videoWidth/videoHeight
            video.width = video.videoWidth;
            video.height = video.videoHeight;

            // Make the canvas match the video so keypoint coords line up 1:1
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.style.opacity = 0.3;

            video.play();
            video.style.display = 'none';
            isRunning = true;
            detectPose();
        };
    } catch (error) {
        console.error(error);
    }
}
// Stop the camera and pose detection
function stopCamera() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }

    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    startBtn.disabled = false;
    stopBtn.disabled = true;
    modelSelect.disabled = false;
    isRunning = false;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Continuously detect poses
async function detectPose() {
    if (!isRunning) return;

    if (video.readyState === 4) {
        // Draw the video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Detect poses
        try {
            if(detector){
                const poses = await detector.estimatePoses(video);

                // Draw the poses
                drawPoses(poses);

                // statusDiv.textContent = `Detecting poses using ${model}...`;
            }

        } catch (error) {
            console.error('Error detecting poses:', error);
        }
    }

    // Continue detection loop
    rafId = requestAnimationFrame(detectPose);
}
// Draw detected poses on the canvas
function drawPoses(poses) {

    // For each detected pose
    for (const pose of poses) {
        // Draw keypoints
        for (const keypoint of pose.keypoints) {
            if (keypoint.score > 0.3) {
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'red';
                ctx.fill();

                // Optionally draw keypoint name
                ctx.fillStyle = 'white';
                ctx.fillText(keypoint.name, keypoint.x + 10, keypoint.y + 5);
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
            console.log(p1.x)
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 10);
            ctx.lineTo(30, 30);
            ctx.stroke();
        }
    }
}