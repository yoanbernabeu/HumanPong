import { Hands } from '@mediapipe/hands';

const SMOOTHING_FRAMES = 5;
const Y_MIN = 0.08;
const Y_MAX = 0.92;
const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const FRAME_INTERVAL = IS_MOBILE ? 50 : 33;

let hands = null;
let handPositions = [null, null];
let smoothBuffers = [[], []];
let isReady = false;
let sendingFrames = false;
let videoEl = null;
let lastResults = null;
let lastFrameTime = 0;

export function initHandTracking(videoElement) {
  return new Promise((resolve, reject) => {
    videoEl = videoElement;

    hands = new Hands({
      locateFile: (file) => `/mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0,
      minDetectionConfidence: 0.4,
      minTrackingConfidence: 0.3,
    });

    hands.onResults(onHandResults);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const videoConstraints = {
      facingMode: 'user',
      width: { ideal: isMobile ? 480 : 640 },
      height: { ideal: isMobile ? 360 : 480 },
    };

    navigator.mediaDevices
      .getUserMedia({ video: videoConstraints })
      .then((stream) => {
        videoElement.srcObject = stream;
        videoElement.onloadeddata = () => {
          isReady = true;
          sendingFrames = true;
          sendFrame();
          resolve();
        };
        // iOS Safari needs explicit play after srcObject assignment
        videoElement.play().catch(() => {});
      })
      .catch((err) => {
        console.error('Webcam error:', err);
        reject(err);
      });
  });
}

async function sendFrame() {
  if (!sendingFrames || !videoEl || !hands) return;

  const now = performance.now();
  if (now - lastFrameTime < FRAME_INTERVAL) {
    if (sendingFrames) requestAnimationFrame(sendFrame);
    return;
  }
  lastFrameTime = now;

  try {
    await hands.send({ image: videoEl });
  } catch (e) {
    // Ignore occasional errors
  }

  if (sendingFrames) {
    requestAnimationFrame(sendFrame);
  }
}

function onHandResults(results) {
  lastResults = results;

  let leftHand = null;
  let rightHand = null;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    if (results.multiHandLandmarks.length === 1) {
      const wrist = results.multiHandLandmarks[0][0];
      const handedness = results.multiHandedness[0].label;
      if (handedness === 'Right') {
        leftHand = wrist;
      } else {
        rightHand = wrist;
      }
    } else if (results.multiHandLandmarks.length >= 2) {
      for (let i = 0; i < results.multiHandedness.length; i++) {
        const wrist = results.multiHandLandmarks[i][0];
        if (results.multiHandedness[i].label === 'Right') {
          leftHand = wrist;
        } else {
          rightHand = wrist;
        }
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
  isReady = false;
  lastResults = null;
}
