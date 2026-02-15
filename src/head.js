import { FaceDetection } from '@mediapipe/face_detection';

const SMOOTHING_FRAMES = 5;
const Y_MIN = 0.15;
const Y_MAX = 0.85;
const FRAME_INTERVAL = 33;

let faceDetection = null;
let headPosition = null;
let smoothBuffer = [];
let isReady = false;
let sendingFrames = false;
let videoEl = null;
let lastResults = null;
let lastFrameTime = 0;

export function initHeadTracking(videoElement) {
  return new Promise((resolve, reject) => {
    videoEl = videoElement;

    faceDetection = new FaceDetection({
      locateFile: (file) => `/mediapipe/face_detection/${file}`,
    });

    faceDetection.setOptions({
      model: 'short',
      minDetectionConfidence: 0.4,
    });

    faceDetection.onResults(onFaceResults);

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        videoElement.srcObject = stream;
        videoElement.onloadeddata = () => {
          isReady = true;
          sendingFrames = true;
          sendFrame();
          resolve();
        };
      })
      .catch((err) => {
        console.error('Webcam error:', err);
        reject(err);
      });
  });
}

async function sendFrame() {
  if (!sendingFrames || !videoEl || !faceDetection) return;

  const now = performance.now();
  if (now - lastFrameTime < FRAME_INTERVAL) {
    if (sendingFrames) requestAnimationFrame(sendFrame);
    return;
  }
  lastFrameTime = now;

  try {
    await faceDetection.send({ image: videoEl });
  } catch (e) {
    // Ignore occasional errors
  }

  if (sendingFrames) {
    requestAnimationFrame(sendFrame);
  }
}

function onFaceResults(results) {
  lastResults = results;

  if (!results.detections || results.detections.length === 0) {
    headPosition = null;
    smoothBuffer = [];
    return;
  }

  const nose = results.detections[0].landmarks[2];
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
  isReady = false;
  lastResults = null;
}
