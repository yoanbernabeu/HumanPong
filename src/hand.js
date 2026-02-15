import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const SMOOTHING_FRAMES = 5;
const Y_MIN = 0.08;
const Y_MAX = 0.92;
const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const FRAME_INTERVAL = IS_MOBILE ? 50 : 33;

let handLandmarker = null;
let handPositions = [null, null];
let smoothBuffers = [[], []];
let sendingFrames = false;
let videoEl = null;
let lastResults = null;
let lastFrameTime = 0;

export async function initHandTracking(videoElement) {
  videoEl = videoElement;

  const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
      delegate: 'GPU',
    },
    numHands: 2,
    runningMode: 'VIDEO',
    minHandDetectionConfidence: 0.4,
    minHandPresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  });

  const videoConstraints = {
    facingMode: 'user',
    width: { ideal: IS_MOBILE ? 480 : 640 },
    height: { ideal: IS_MOBILE ? 360 : 480 },
  };

  const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
  videoElement.srcObject = stream;
  await new Promise((resolve) => {
    videoElement.onloadeddata = resolve;
  });
  videoElement.play().catch(() => {});

  sendingFrames = true;
  sendFrame();
}

function sendFrame() {
  if (!sendingFrames || !videoEl || !handLandmarker) return;

  const now = performance.now();
  if (now - lastFrameTime < FRAME_INTERVAL) {
    if (sendingFrames) requestAnimationFrame(sendFrame);
    return;
  }
  lastFrameTime = now;

  try {
    const results = handLandmarker.detectForVideo(videoEl, now);
    processResults(results);
  } catch (e) {
    // Ignore occasional errors
  }

  if (sendingFrames) {
    requestAnimationFrame(sendFrame);
  }
}

function processResults(results) {
  // Convert to legacy-compatible format for drawing code in main.js
  lastResults = {
    multiHandLandmarks: results.landmarks,
    multiHandedness: results.handedness?.map((h) => ({ label: h[0]?.categoryName })),
  };

  let leftHand = null;
  let rightHand = null;

  if (results.landmarks && results.landmarks.length > 0) {
    for (let i = 0; i < results.landmarks.length; i++) {
      const wrist = results.landmarks[i][0];
      const handedness = results.handedness[i]?.[0]?.categoryName;
      if (handedness === 'Right') {
        leftHand = wrist;
      } else {
        rightHand = wrist;
      }
    }
  }

  if (leftHand !== null) {
    handPositions[0] = smoothPosition(0, leftHand.y);
  } else {
    handPositions[0] = null;
    smoothBuffers[0] = [];
  }

  if (rightHand !== null) {
    handPositions[1] = smoothPosition(1, rightHand.y);
  } else {
    handPositions[1] = null;
    smoothBuffers[1] = [];
  }
}

function smoothPosition(index, rawY) {
  const mapped = Math.max(0, Math.min(1, (rawY - Y_MIN) / (Y_MAX - Y_MIN)));

  smoothBuffers[index].push(mapped);
  if (smoothBuffers[index].length > SMOOTHING_FRAMES) {
    smoothBuffers[index].shift();
  }

  const sum = smoothBuffers[index].reduce((a, b) => a + b, 0);
  return sum / smoothBuffers[index].length;
}

export function getHandPositions() {
  return handPositions;
}

export function getLastResults() {
  return lastResults;
}

export function stopHandTracking() {
  sendingFrames = false;

  if (videoEl && videoEl.srcObject) {
    videoEl.srcObject.getTracks().forEach((track) => track.stop());
    videoEl.srcObject = null;
  }

  handPositions = [null, null];
  smoothBuffers = [[], []];
  lastResults = null;
}
