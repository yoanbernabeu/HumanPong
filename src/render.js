const NEON_GREEN = '#0f0';
const NEON_GREEN_DIM = 'rgba(0, 255, 0, 0.5)';

export function renderGame(ctx, canvas, state) {
  const { ball, paddle1, paddle2, score1, score2 } = state;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCenterLine(ctx, canvas);
  drawScore(ctx, canvas, score1, score2);
  drawPaddle(ctx, paddle1);
  drawPaddle(ctx, paddle2);
  drawBall(ctx, ball);
}

function drawCenterLine(ctx, canvas) {
  const segmentHeight = 15;
  const gap = 10;
  const x = canvas.width / 2;

  ctx.strokeStyle = NEON_GREEN_DIM;
  ctx.lineWidth = 2;
  ctx.setLineDash([segmentHeight, gap]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawScore(ctx, canvas, score1, score2) {
  ctx.font = '48px "Press Start 2P"';
  ctx.fillStyle = NEON_GREEN;
  ctx.textAlign = 'center';

  ctx.shadowColor = NEON_GREEN;
  ctx.shadowBlur = 20;

  ctx.fillText(String(score1), canvas.width / 4, 70);
  ctx.fillText(String(score2), (canvas.width / 4) * 3, 70);

  ctx.shadowBlur = 0;
}

function drawPaddle(ctx, paddle) {
  ctx.fillStyle = NEON_GREEN;
  ctx.shadowColor = NEON_GREEN;
  ctx.shadowBlur = 15;

  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

  ctx.shadowBlur = 0;
}

function drawBall(ctx, ball) {
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 20;

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(ball.x - ball.vx * 2, ball.y - ball.vy * 2, ball.radius * 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

export function renderCountdown(ctx, canvas, count) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCenterLine(ctx, canvas);

  ctx.font = '80px "Press Start 2P"';
  ctx.fillStyle = NEON_GREEN;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = NEON_GREEN;
  ctx.shadowBlur = 30;

  ctx.fillText(String(count), canvas.width / 2, canvas.height / 2);

  ctx.shadowBlur = 0;
  ctx.textBaseline = 'alphabetic';
}
