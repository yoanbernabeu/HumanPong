const AI_REACTION_SPEED = 0.04;

let targetY = 0;
let errorOffset = 0;
let errorTimer = 0;

export function updateAI(ball, paddle, canvasHeight) {
  const aiMaxSpeed = canvasHeight * 0.007;
  const aiErrorMargin = canvasHeight * 0.04;

  errorTimer++;
  if (errorTimer > 60) {
    errorOffset = (Math.random() - 0.5) * aiErrorMargin * 2;
    errorTimer = 0;
  }

  if (ball.vx > 0) {
    targetY = ball.y + errorOffset;
  } else {
    targetY = canvasHeight / 2 + errorOffset;
  }

  const diff = targetY - (paddle.y + paddle.height / 2);
  const move = diff * AI_REACTION_SPEED;
  const clampedMove = Math.max(-aiMaxSpeed, Math.min(aiMaxSpeed, move));

  paddle.y += clampedMove;

  if (paddle.y < 0) paddle.y = 0;
  if (paddle.y + paddle.height > canvasHeight) {
    paddle.y = canvasHeight - paddle.height;
  }
}

export function resetAI() {
  targetY = 0;
  errorOffset = 0;
  errorTimer = 0;
}
