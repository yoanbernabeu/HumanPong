import { getHandPositions } from './hand.js';
import { getHeadPosition } from './head.js';
import { updateAI, resetAI } from './ai.js';
import { renderGame, renderCountdown } from './render.js';
import { playWallBounce, playPaddleBounce, playScore, playStart } from './sound.js';

const WINNING_SCORE = 11;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 100;
const PADDLE_MARGIN = 20;
const BALL_RADIUS = 8;
const BALL_INITIAL_SPEED = 5;
const BALL_SPEED_INCREMENT = 0.3;
const BALL_MAX_SPEED = 12;

let canvas, ctx;
let gameState = null;
let gameMode = '2p';
let animFrameId = null;
let countdownValue = 0;
let countdownTimer = null;
let onGameEndCallback = null;
let paused = false;

export function initGame(canvasEl, mode, onEnd) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  gameMode = mode;
  onGameEndCallback = onEnd;
  paused = false;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  resetGameState();
  startCountdown();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function resetGameState() {
  gameState = {
    ball: {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: BALL_INITIAL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      vy: (Math.random() - 0.5) * BALL_INITIAL_SPEED,
      radius: BALL_RADIUS,
      speed: BALL_INITIAL_SPEED,
    },
    paddle1: {
      x: PADDLE_MARGIN,
      y: canvas.height / 2 - PADDLE_HEIGHT / 2,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    },
    paddle2: {
      x: canvas.width - PADDLE_MARGIN - PADDLE_WIDTH,
      y: canvas.height / 2 - PADDLE_HEIGHT / 2,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    },
    score1: 0,
    score2: 0,
    state: 'countdown',
  };

  resetAI();
}

function startCountdown() {
  countdownValue = 3;
  gameState.state = 'countdown';

  renderCountdown(ctx, canvas, countdownValue);

  countdownTimer = setInterval(() => {
    countdownValue--;
    if (countdownValue <= 0) {
      clearInterval(countdownTimer);
      gameState.state = 'playing';
      playStart();
      gameLoop();
    } else {
      renderCountdown(ctx, canvas, countdownValue);
    }
  }, 800);
}

function gameLoop() {
  if (gameState.state === 'ended' || paused) return;

  update();
  renderGame(ctx, canvas, gameState);

  animFrameId = requestAnimationFrame(gameLoop);
}

function update() {
  if (gameState.state !== 'playing') return;

  updatePaddles();
  updateBall();
  checkCollisions();
  checkScore();
}

function updatePaddles() {
  let leftY, rightY;

  if (gameMode === 'head') {
    leftY = getHeadPosition();
    rightY = null;
  } else {
    [leftY, rightY] = getHandPositions();
  }

  if (leftY !== null) {
    const targetY = leftY * canvas.height - gameState.paddle1.height / 2;
    gameState.paddle1.y = clampPaddle(targetY);
  }

  if (gameMode === '2p') {
    if (rightY !== null) {
      const targetY = rightY * canvas.height - gameState.paddle2.height / 2;
      gameState.paddle2.y = clampPaddle(targetY);
    }
  } else {
    updateAI(gameState.ball, gameState.paddle2, canvas.height);
  }
}

function clampPaddle(y) {
  return Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, y));
}

function updateBall() {
  gameState.ball.x += gameState.ball.vx;
  gameState.ball.y += gameState.ball.vy;

  if (gameState.ball.y - gameState.ball.radius <= 0) {
    gameState.ball.y = gameState.ball.radius;
    gameState.ball.vy = Math.abs(gameState.ball.vy);
    playWallBounce();
  }
  if (gameState.ball.y + gameState.ball.radius >= canvas.height) {
    gameState.ball.y = canvas.height - gameState.ball.radius;
    gameState.ball.vy = -Math.abs(gameState.ball.vy);
    playWallBounce();
  }
}

function checkCollisions() {
  const ball = gameState.ball;
  const p1 = gameState.paddle1;
  const p2 = gameState.paddle2;

  if (
    ball.vx < 0 &&
    ball.x - ball.radius <= p1.x + p1.width &&
    ball.x + ball.radius >= p1.x &&
    ball.y >= p1.y &&
    ball.y <= p1.y + p1.height
  ) {
    bounceBallOffPaddle(p1, 1);
  }

  if (
    ball.vx > 0 &&
    ball.x + ball.radius >= p2.x &&
    ball.x - ball.radius <= p2.x + p2.width &&
    ball.y >= p2.y &&
    ball.y <= p2.y + p2.height
  ) {
    bounceBallOffPaddle(p2, -1);
  }
}

function bounceBallOffPaddle(paddle, directionX) {
  const ball = gameState.ball;

  const relativeHit = (ball.y - paddle.y) / paddle.height;
  const angle = (relativeHit - 0.5) * (Math.PI / 3);

  ball.speed = Math.min(ball.speed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED);

  ball.vx = directionX * ball.speed * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);

  if (directionX > 0) {
    ball.x = paddle.x + paddle.width + ball.radius;
  } else {
    ball.x = paddle.x - ball.radius;
  }

  playPaddleBounce();
}

function checkScore() {
  const ball = gameState.ball;

  if (ball.x + ball.radius < 0) {
    gameState.score2++;
    onScored();
  } else if (ball.x - ball.radius > canvas.width) {
    gameState.score1++;
    onScored();
  }
}

function onScored() {
  playScore();

  if (gameState.score1 >= WINNING_SCORE || gameState.score2 >= WINNING_SCORE) {
    gameState.state = 'ended';
    cancelAnimationFrame(animFrameId);

    const winner = gameState.score1 >= WINNING_SCORE ? 1 : 2;
    if (onGameEndCallback) {
      onGameEndCallback(winner, gameState.score1, gameState.score2);
    }
    return;
  }

  gameState.ball.x = canvas.width / 2;
  gameState.ball.y = canvas.height / 2;
  gameState.ball.speed = BALL_INITIAL_SPEED;

  const dir = gameState.ball.vx > 0 ? -1 : 1;
  gameState.ball.vx = BALL_INITIAL_SPEED * dir;
  gameState.ball.vy = (Math.random() - 0.5) * BALL_INITIAL_SPEED;
}

export function pauseGame() {
  paused = true;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

export function resumeGame() {
  if (!paused) return;
  paused = false;
  if (gameState && gameState.state === 'playing') {
    gameLoop();
  }
}

export function isGamePaused() {
  return paused;
}

export function isGameRunning() {
  return gameState && (gameState.state === 'playing' || gameState.state === 'countdown');
}

export function stopGame() {
  paused = false;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  window.removeEventListener('resize', resizeCanvas);
}
