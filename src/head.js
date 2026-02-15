import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

const SMOOTHING_FRAMES = 5;
const Y_MIN = 0.15;
const Y_MAX = 0.85;
const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const FRAME_INTERVAL = IS_MOBILE ? 50 : 33;

let faceDetector = null;
let headPosition = null;
let smoothBuffer = [];
let sendingFrames = false;
let videoEl = null;
let lastResults = null;
let lastFrameTime = 0;

export async function initHeadTracking(videoElement) {
  videoEl = videoElement;

  const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');

  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    minDetectionConfidence: 0.4,
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
  if (!sendingFrames || !videoEl || !faceDetector) return;

  const now = performance.now();
  if (now - lastFrameTime < FRAME_INTERVAL) {
    if (sendingFrames) requestAnimationFrame(sendFrame);
    return;
  }
  lastFrameTime = now;

  try {
    const results = faceDetector.detectForVideo(videoEl, now);
    processResults(results);
  } catch (e) {
    // Ignore occasional errors
  }

  if (sendingFrames) {
    requestAnimationFrame(sendFrame);
  }
}

function processResults(results) {
  // Convert keypoints to legacy "landmarks" format for drawing code in main.js
  lastResults = {
    detections: results.detections?.map((d) => ({
      landmarks: d.keypoints,
    })),
  };

  if (!results.detections || results.detections.length === 0) {
    headPosition = null;
    smoothBuffer = [];
    return;
  }

  // Keypoint 2 = nose tip
  const nose = results.detections[0].keypoints[2];
  headPosition = smoothPosition(nose.y);
}

function smoothPosition(rawY) {
  const mapped = Math.max(0, Math.min(1, (rawY - Y_MIN) / (Y_MAX - Y_MIN)));

  smoothBuffer.push(mapped);
  if (smoothBuffer.length > SMOOTHING_FRAMES) {
    smoothBuffer.shift();
  }

  const sum = smoothBuffer.reduce((a, b) => a + b, 0);
  return sum / smoothBuffer.length;
}

export function getHeadPosition() {
  return headPosition;
}

export function getLastHeadResults() {
  return lastResults;
}

export function stopHeadTracking() {
  sendingFrames = false;

  if (videoEl && videoEl.srcObject) {
    videoEl.srcObject.getTracks().forEach((track) => track.stop());
    videoEl.srcObject = null;
  }

  headPosition = null;
  smoothBuffer = [];
  lastResults = null;
}
