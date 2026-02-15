// Animated background for menu: ghost Pong game + neon particles

const NEON = '#0f0';
const NEON_DIM = 'rgba(0, 255, 0, 0.15)';
const NEON_MID = 'rgba(0, 255, 0, 0.3)';

let canvas, ctx;
let animId = null;
let ball, paddle1, paddle2, particles;

const PADDLE_W = 10;
const PADDLE_H = 80;
const PADDLE_MARGIN = 16;
const BALL_R = 6;
const BALL_SPEED = 3;
const AI_SPEED = 2.5;
const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const PARTICLE_COUNT = IS_MOBILE ? 15 : 35;

// -- Particles --
function createParticle() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    size: Math.random() * 2 + 0.5,
    alpha: Math.random() * 0.3 + 0.05,
    pulse: Math.random() * Math.PI * 2,
  };
}

function initParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(createParticle());
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.pulse += 0.02;

    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
    ctx.fillStyle = `rgba(0, 255, 0, ${a})`;
    ctx.shadowColor = NEON;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// -- Ghost Pong --
function resetBall() {
  ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    vy: (Math.random() - 0.5) * BALL_SPEED,
  };
}

function initPong() {
  paddle1 = { x: PADDLE_MARGIN, y: canvas.height / 2 - PADDLE_H / 2 };
  paddle2 = { x: canvas.width - PADDLE_MARGIN - PADDLE_W, y: canvas.height / 2 - PADDLE_H / 2 };
  resetBall();
}

function aiMove(paddle) {
  const center = paddle.y + PADDLE_H / 2;
  const diff = ball.y - center;
  const move = Math.min(AI_SPEED, Math.abs(diff)) * Math.sign(diff);
  paddle.y = Math.max(0, Math.min(canvas.height - PADDLE_H, paddle.y + move));
}

function updatePong() {
  // AI paddles
  aiMove(paddle1);
  aiMove(paddle2);

  // Ball
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall bounce
  if (ball.y - BALL_R <= 0 || ball.y + BALL_R >= canvas.height) {
    ball.vy *= -1;
    ball.y = Math.max(BALL_R, Math.min(canvas.height - BALL_R, ball.y));
  }

  // Paddle bounce
  if (
    ball.vx < 0 &&
    ball.x - BALL_R <= paddle1.x + PADDLE_W &&
    ball.y >= paddle1.y && ball.y <= paddle1.y + PADDLE_H
  ) {
    ball.vx = Math.abs(ball.vx);
    ball.vy += (Math.random() - 0.5) * 1.5;
  }

  if (
    ball.vx > 0 &&
    ball.x + BALL_R >= paddle2.x &&
    ball.y >= paddle2.y && ball.y <= paddle2.y + PADDLE_H
  ) {
    ball.vx = -Math.abs(ball.vx);
    ball.vy += (Math.random() - 0.5) * 1.5;
  }

  // Score — just reset silently
  if (ball.x < -BALL_R * 2 || ball.x > canvas.width + BALL_R * 2) {
    resetBall();
  }
}

function drawPong() {
  // Center line
  ctx.strokeStyle = NEON_DIM;
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Paddles
  ctx.fillStyle = NEON_MID;
  ctx.shadowColor = NEON;
  ctx.shadowBlur = 8;
  ctx.fillRect(paddle1.x, paddle1.y, PADDLE_W, PADDLE_H);
  ctx.fillRect(paddle2.x, paddle2.y, PADDLE_W, PADDLE_H);

  // Ball
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  // Ball trail
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(ball.x - ball.vx * 3, ball.y - ball.vy * 3, BALL_R * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

// -- Main loop --
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Re-position paddles on resize
  if (paddle2) {
    paddle2.x = canvas.width - PADDLE_MARGIN - PADDLE_W;
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePong();
  drawPong();
  updateParticles();
  drawParticles();

  animId = requestAnimationFrame(loop);
}

export function startMenuBg(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');

  resize();
  window.addEventListener('resize', resize);

  initPong();
  initParticles();
  loop();
}

export function stopMenuBg() {
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
  window.removeEventListener('resize', resize);
}
