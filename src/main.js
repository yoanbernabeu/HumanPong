import './style.css';
import { initHandTracking, stopHandTracking, getHandPositions, getLastResults } from './hand.js';
import { initHeadTracking, stopHeadTracking, getHeadPosition, getLastHeadResults } from './head.js';
import { initGame, stopGame, pauseGame, resumeGame, isGamePaused, isGameRunning } from './game.js';
import { resumeAudio, playWin, playLock } from './sound.js';
import { startMenuBg, stopMenuBg } from './menu-bg.js';

// Screens
const menuScreen = document.getElementById('menu-screen');
const calibScreen = document.getElementById('calibration-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const pauseOverlay = document.getElementById('pause-overlay');

// Buttons
const btn2Players = document.getElementById('btn-2players');
const btnVsAI = document.getElementById('btn-vs-ai');
const btnHead = document.getElementById('btn-head');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnReplay = document.getElementById('btn-replay');
const btnMenu = document.getElementById('btn-menu');

// Elements
const menuCanvas = document.getElementById('menu-canvas');
const canvas = document.getElementById('game-canvas');
const webcam = document.getElementById('webcam');
const handCanvas = document.getElementById('hand-canvas');
const handCtx = handCanvas.getContext('2d');
const winnerText = document.getElementById('winner-text');
const finalScore = document.getElementById('final-score');

// Calibration UI
const calibTitle = document.getElementById('calib-title');
const calibLeft = document.getElementById('calib-left');
const calibRight = document.getElementById('calib-right');
const calibHead = document.getElementById('calib-head');
const calibLeftStatus = document.getElementById('calib-left-status');
const calibRightStatus = document.getElementById('calib-right-status');
const calibHeadStatus = document.getElementById('calib-head-status');
const calibHint = document.getElementById('calib-hint');

// Pause UI
const pauseText = document.getElementById('pause-text');
const pauseHint = document.getElementById('pause-hint');

let currentMode = '2p';
let calibrationFrameId = null;
let calibrationAborted = false;
let monitorFrameId = null;
let pauseRecoveryFrameId = null;

// Hand skeleton connections
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

// Face wireframe connections
const FACE_CONNECTIONS = [
  [4, 0], [0, 1], [1, 5],
  [0, 2], [1, 2], [2, 3],
];

// -- Tracking helpers --
function isHeadMode() {
  return currentMode === 'head';
}

function getPlayerPosition() {
  if (isHeadMode()) {
    return [getHeadPosition(), null];
  }
  return getHandPositions();
}

async function initCurrentTracking() {
  if (isHeadMode()) {
    return initHeadTracking(webcam);
  }
  return initHandTracking(webcam);
}

function stopCurrentTracking() {
  if (isHeadMode()) {
    stopHeadTracking();
  } else {
    stopHandTracking();
  }
}

// -- Fullscreen --
function toggleFullscreen() {
  const el = document.documentElement;
  const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

  if (isFullscreen) {
    (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
  } else {
    const requestFs = el.requestFullscreen || el.webkitRequestFullscreen;
    if (requestFs) {
      requestFs.call(el).catch(() => {});
    }
  }
}

// -- Webcam visibility --
function showCam() {
  document.body.classList.add('cam-visible');
}

function hideCam() {
  document.body.classList.remove('cam-visible');
}

// -- Screen navigation --
function showScreen(screen) {
  menuScreen.classList.remove('active');
  calibScreen.classList.remove('active');
  gameScreen.classList.remove('active');
  endScreen.classList.remove('active');
  pauseOverlay.classList.remove('active');
  screen.classList.add('active');
}

// -- Start: enter calibration --
async function startGame(mode) {
  currentMode = mode;
  calibrationAborted = false;
  resumeAudio();
  stopMenuBg();

  calibLeft.classList.remove('detected', 'locked');
  calibRight.classList.remove('detected', 'locked');
  calibHead.classList.remove('detected', 'locked');
  calibLeftStatus.textContent = 'SCANNING...';
  calibRightStatus.textContent = 'SCANNING...';
  calibHeadStatus.textContent = 'SCANNING...';
  calibHint.textContent = 'Loading camera...';

  if (mode === 'head') {
    calibTitle.textContent = 'Show your face';
    calibLeft.style.display = 'none';
    calibRight.style.display = 'none';
    calibHead.style.display = '';
  } else {
    calibTitle.textContent = 'Show your hands';
    calibLeft.style.display = '';
    calibRight.style.display = mode === 'ai' ? 'none' : '';
    calibHead.style.display = 'none';
  }

  showScreen(calibScreen);
  showCam();

  await initCurrentTracking();

  calibHint.textContent = 'Waiting for detection...';

  startCalibrationLoop();
}

// -- Calibration loop --
function startCalibrationLoop() {
  let leftDetectedFrames = 0;
  let rightDetectedFrames = 0;
  const DETECT_FRAMES = 15;
  let leftLocked = false;
  let rightLocked = false;
  let allLockedTime = null;
  const LOCKED_DURATION = 2500;

  const calibP1 = isHeadMode() ? calibHead : calibLeft;
  const calibP1Status = isHeadMode() ? calibHeadStatus : calibLeftStatus;

  function loop() {
    if (calibrationAborted) return;

    resizeHandCanvas();

    const [leftY, rightY] = getPlayerPosition();

    if (isHeadMode()) {
      drawFaceLandmarks(leftLocked);
    } else {
      drawHandLandmarks(leftLocked, rightLocked);
    }

    const leftOk = leftY !== null;
    if (!leftLocked) {
      leftDetectedFrames = leftOk ? leftDetectedFrames + 1 : Math.max(0, leftDetectedFrames - 2);
      calibP1.classList.toggle('detected', leftOk);
      calibP1Status.textContent = leftOk ? 'TRACKING...' : 'SCANNING...';

      if (leftDetectedFrames >= DETECT_FRAMES) {
        leftLocked = true;
        calibP1.classList.remove('detected');
        calibP1.classList.add('locked');
        calibP1Status.textContent = 'LOCKED';
        playLock();
      }
    }

    if (currentMode === '2p') {
      const rightOk = rightY !== null;
      if (!rightLocked) {
        rightDetectedFrames = rightOk ? rightDetectedFrames + 1 : Math.max(0, rightDetectedFrames - 2);
        calibRight.classList.toggle('detected', rightOk);
        calibRightStatus.textContent = rightOk ? 'TRACKING...' : 'SCANNING...';

        if (rightDetectedFrames >= DETECT_FRAMES) {
          rightLocked = true;
          calibRight.classList.remove('detected');
          calibRight.classList.add('locked');
          calibRightStatus.textContent = 'LOCKED';
          playLock();
        }
      }
    } else {
      rightLocked = true;
    }

    const allLocked = leftLocked && rightLocked;

    if (allLocked && !allLockedTime) {
      allLockedTime = performance.now();
      calibTitle.textContent = isHeadMode() ? 'Head locked' : 'Hands locked';
      calibHint.textContent = 'Get ready...';
    }

    if (allLocked && allLockedTime) {
      if (leftY === null) {
        leftLocked = false;
        leftDetectedFrames = 0;
        allLockedTime = null;
        calibP1.classList.remove('locked', 'detected');
        calibP1Status.textContent = 'SCANNING...';
        calibTitle.textContent = isHeadMode() ? 'Show your face' : 'Show your hands';
        calibHint.textContent = isHeadMode() ? 'Face lost! Show it again...' : 'Hand lost! Show it again...';
      }
      if (currentMode === '2p' && rightY === null) {
        rightLocked = false;
        rightDetectedFrames = 0;
        allLockedTime = null;
        calibRight.classList.remove('locked', 'detected');
        calibRightStatus.textContent = 'SCANNING...';
        calibTitle.textContent = 'Show your hands';
        calibHint.textContent = 'Hand lost! Show it again...';
      }
    }

    if (allLockedTime && performance.now() - allLockedTime >= LOCKED_DURATION) {
      calibTitle.textContent = 'Let\'s go!';
      calibHint.textContent = '';
      cancelAnimationFrame(calibrationFrameId);
      calibrationFrameId = null;

      setTimeout(() => {
        if (!calibrationAborted) {
          hideCam();
          showScreen(gameScreen);
          initGame(canvas, currentMode, onGameEnd);
          startTrackingMonitor();
        }
      }, 500);
      return;
    }

    if (allLockedTime) {
      const elapsed = performance.now() - allLockedTime;
      const remaining = Math.ceil((LOCKED_DURATION - elapsed) / 1000);
      calibHint.textContent = `Starting in ${remaining}...`;
    } else if (!leftLocked || (currentMode === '2p' && !rightLocked)) {
      if (leftDetectedFrames > 0 || rightDetectedFrames > 0) {
        calibHint.textContent = 'Hold steady...';
      }
    }

    calibrationFrameId = requestAnimationFrame(loop);
  }

  calibrationFrameId = requestAnimationFrame(loop);
}

// -- Tracking monitor during game --
function startTrackingMonitor() {
  let lostFrames = 0;
  const LOST_THRESHOLD = 45;

  function monitor() {
    if (!isGameRunning() || isGamePaused()) {
      monitorFrameId = null;
      return;
    }

    const [leftY, rightY] = getPlayerPosition();

    const leftLost = leftY === null;
    const rightLost = currentMode === '2p' && rightY === null;

    if (leftLost || rightLost) {
      lostFrames++;
    } else {
      lostFrames = 0;
    }

    if (lostFrames >= LOST_THRESHOLD) {
      lostFrames = 0;
      triggerPause(leftLost, rightLost);
      return;
    }

    monitorFrameId = requestAnimationFrame(monitor);
  }

  monitorFrameId = requestAnimationFrame(monitor);
}

function stopTrackingMonitor() {
  if (monitorFrameId) {
    cancelAnimationFrame(monitorFrameId);
    monitorFrameId = null;
  }
}

// -- Pause + recovery --
function triggerPause(leftLost, rightLost) {
  pauseGame();

  showCam();
  pauseOverlay.classList.add('active');

  if (isHeadMode()) {
    pauseText.textContent = 'Head lost!';
  } else if (leftLost && rightLost) {
    pauseText.textContent = 'Both hands lost!';
  } else if (leftLost) {
    pauseText.textContent = 'Left hand lost!';
  } else {
    pauseText.textContent = 'Right hand lost!';
  }
  pauseHint.textContent = 'SCANNING...';

  startPauseRecovery();
}

function startPauseRecovery() {
  let recoveryFrames = 0;
  const RECOVERY_NEEDED = 20;

  function loop() {
    resizeHandCanvas();

    if (isHeadMode()) {
      drawFaceLandmarks(false);
    } else {
      drawHandLandmarks(false, false);
    }

    const [leftY, rightY] = getPlayerPosition();

    const leftOk = leftY !== null;
    const rightOk = currentMode === '2p' ? rightY !== null : true;

    if (leftOk && rightOk) {
      recoveryFrames++;
      pauseHint.textContent = 'TRACKING... Hold steady';
    } else {
      recoveryFrames = Math.max(0, recoveryFrames - 2);
      pauseHint.textContent = 'SCANNING...';
    }

    if (recoveryFrames >= RECOVERY_NEEDED) {
      playLock();
      pauseOverlay.classList.remove('active');
      hideCam();
      handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
      cancelAnimationFrame(pauseRecoveryFrameId);
      pauseRecoveryFrameId = null;

      resumeGame();
      startTrackingMonitor();
      return;
    }

    pauseRecoveryFrameId = requestAnimationFrame(loop);
  }

  pauseRecoveryFrameId = requestAnimationFrame(loop);
}

function stopPauseRecovery() {
  if (pauseRecoveryFrameId) {
    cancelAnimationFrame(pauseRecoveryFrameId);
    pauseRecoveryFrameId = null;
  }
}

// -- Drawing --
function resizeHandCanvas() {
  if (handCanvas.width !== window.innerWidth || handCanvas.height !== window.innerHeight) {
    handCanvas.width = window.innerWidth;
    handCanvas.height = window.innerHeight;
  }
}

function drawHandLandmarks(leftLocked, rightLocked) {
  const results = getLastResults();
  handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

  if (!results || !results.multiHandLandmarks) return;

  const w = handCanvas.width;
  const h = handCanvas.height;

  for (let hi = 0; hi < results.multiHandLandmarks.length; hi++) {
    const landmarks = results.multiHandLandmarks[hi];
    const handedness = results.multiHandedness[hi]?.label;

    const isLeft = handedness === 'Right';
    const isLocked = isLeft ? leftLocked : rightLocked;

    const lineColor = isLocked ? 'rgba(0, 255, 0, 0.9)' : 'rgba(0, 255, 0, 0.4)';
    const dotColor = isLocked ? '#0f0' : 'rgba(0, 255, 0, 0.6)';
    const dotRadius = isLocked ? 6 : 4;
    const lineWidth = isLocked ? 4 : 2;
    const glowBlur = isLocked ? 15 : 5;

    handCtx.strokeStyle = lineColor;
    handCtx.lineWidth = lineWidth;
    handCtx.shadowColor = '#0f0';
    handCtx.shadowBlur = glowBlur;

    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = landmarks[a];
      const pb = landmarks[b];
      handCtx.beginPath();
      handCtx.moveTo((1 - pa.x) * w, pa.y * h);
      handCtx.lineTo((1 - pb.x) * w, pb.y * h);
      handCtx.stroke();
    }

    handCtx.fillStyle = dotColor;
    handCtx.shadowBlur = glowBlur;

    for (const lm of landmarks) {
      handCtx.beginPath();
      handCtx.arc((1 - lm.x) * w, lm.y * h, dotRadius, 0, Math.PI * 2);
      handCtx.fill();
    }

    if (isLocked) {
      drawReticle((1 - landmarks[0].x) * w, landmarks[0].y * h, 50);
    }

    handCtx.shadowBlur = 0;
  }
}

function drawFaceLandmarks(locked) {
  const results = getLastHeadResults();
  handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

  if (!results || !results.detections || results.detections.length === 0) return;

  const w = handCanvas.width;
  const h = handCanvas.height;
  const landmarks = results.detections[0].landmarks;

  if (!landmarks || landmarks.length === 0) return;

  const lineColor = locked ? 'rgba(0, 255, 0, 0.9)' : 'rgba(0, 255, 0, 0.4)';
  const dotColor = locked ? '#0f0' : 'rgba(0, 255, 0, 0.6)';
  const dotRadius = locked ? 8 : 5;
  const lineWidth = locked ? 4 : 2;
  const glowBlur = locked ? 15 : 5;

  handCtx.strokeStyle = lineColor;
  handCtx.lineWidth = lineWidth;
  handCtx.shadowColor = '#0f0';
  handCtx.shadowBlur = glowBlur;

  for (const [a, b] of FACE_CONNECTIONS) {
    if (a >= landmarks.length || b >= landmarks.length) continue;
    const pa = landmarks[a];
    const pb = landmarks[b];
    handCtx.beginPath();
    handCtx.moveTo((1 - pa.x) * w, pa.y * h);
    handCtx.lineTo((1 - pb.x) * w, pb.y * h);
    handCtx.stroke();
  }

  handCtx.fillStyle = dotColor;
  handCtx.shadowBlur = glowBlur;

  for (const lm of landmarks) {
    handCtx.beginPath();
    handCtx.arc((1 - lm.x) * w, lm.y * h, dotRadius, 0, Math.PI * 2);
    handCtx.fill();
  }

  if (locked && landmarks.length > 2) {
    const nose = landmarks[2];
    drawReticle((1 - nose.x) * w, nose.y * h, 70);
  }

  handCtx.shadowBlur = 0;
}

function drawReticle(cx, cy, size) {
  const cornerLen = 14;
  const t = performance.now() / 1000;
  const pulse = 1 + Math.sin(t * 3) * 0.08;

  handCtx.save();
  handCtx.translate(cx, cy);
  handCtx.scale(pulse, pulse);

  handCtx.strokeStyle = '#0f0';
  handCtx.lineWidth = 2;
  handCtx.shadowColor = '#0f0';
  handCtx.shadowBlur = 12;

  handCtx.beginPath();
  handCtx.moveTo(-size, -size + cornerLen);
  handCtx.lineTo(-size, -size);
  handCtx.lineTo(-size + cornerLen, -size);
  handCtx.stroke();

  handCtx.beginPath();
  handCtx.moveTo(size - cornerLen, -size);
  handCtx.lineTo(size, -size);
  handCtx.lineTo(size, -size + cornerLen);
  handCtx.stroke();

  handCtx.beginPath();
  handCtx.moveTo(-size, size - cornerLen);
  handCtx.lineTo(-size, size);
  handCtx.lineTo(-size + cornerLen, size);
  handCtx.stroke();

  handCtx.beginPath();
  handCtx.moveTo(size - cornerLen, size);
  handCtx.lineTo(size, size);
  handCtx.lineTo(size, size - cornerLen);
  handCtx.stroke();

  handCtx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
  handCtx.lineWidth = 1;
  handCtx.shadowBlur = 0;

  handCtx.beginPath();
  handCtx.moveTo(-size * 0.5, 0);
  handCtx.lineTo(-10, 0);
  handCtx.moveTo(10, 0);
  handCtx.lineTo(size * 0.5, 0);
  handCtx.moveTo(0, -size * 0.5);
  handCtx.lineTo(0, -10);
  handCtx.moveTo(0, 10);
  handCtx.lineTo(0, size * 0.5);
  handCtx.stroke();

  handCtx.restore();
}

// -- Game end --
function onGameEnd(winner, score1, score2) {
  stopTrackingMonitor();
  playWin();

  const winnerLabel =
    (currentMode === 'ai' || currentMode === 'head') && winner === 2
      ? 'Computer wins!'
      : `Player ${winner} wins!`;

  winnerText.textContent = winnerLabel;
  finalScore.textContent = `${score1} - ${score2}`;

  setTimeout(() => {
    showScreen(endScreen);
  }, 1500);
}

// -- Return to menu --
function goToMenu() {
  calibrationAborted = true;
  if (calibrationFrameId) {
    cancelAnimationFrame(calibrationFrameId);
    calibrationFrameId = null;
  }
  stopTrackingMonitor();
  stopPauseRecovery();
  pauseOverlay.classList.remove('active');
  stopGame();
  stopCurrentTracking();
  hideCam();
  handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
  showScreen(menuScreen);
  startMenuBg(menuCanvas);
}

// -- Replay --
function replay() {
  calibrationAborted = true;
  if (calibrationFrameId) {
    cancelAnimationFrame(calibrationFrameId);
    calibrationFrameId = null;
  }
  stopTrackingMonitor();
  stopPauseRecovery();
  pauseOverlay.classList.remove('active');
  stopGame();
  stopCurrentTracking();
  hideCam();
  startGame(currentMode);
}

// Button events
btn2Players.addEventListener('click', () => startGame('2p'));
btnVsAI.addEventListener('click', () => startGame('ai'));
btnHead.addEventListener('click', () => startGame('head'));
btnFullscreen.addEventListener('click', toggleFullscreen);
btnReplay.addEventListener('click', replay);
btnMenu.addEventListener('click', goToMenu);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    goToMenu();
  }
  if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
  }
});

// Start menu background animation
startMenuBg(menuCanvas);
