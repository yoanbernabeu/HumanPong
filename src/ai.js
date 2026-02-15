const AI_REACTION_SPEED = 0.04;
const AI_MAX_SPEED = 5;
const AI_ERROR_MARGIN = 30;

let targetY = 0;
let errorOffset = 0;
let errorTimer = 0;

export function updateAI(ball, paddle, canvasHeight) {
  errorTimer++;
  if (errorTimer > 60) {
    errorOffset = (Math.random() - 0.5) * AI_ERROR_MARGIN * 2;
    errorTimer = 0;
  }

  if (ball.vx > 0) {
    targetY = ball.y + errorOffset;
  } else {
    targetY = canvasHeight / 2 + errorOffset;
  }

  const diff = targetY - (paddle.y + paddle.height / 2);
  const move = diff * AI_REACTION_SPEED;
  const clampedMove = Math.max(-AI_MAX_SPEED, Math.min(AI_MAX_SPEED, move));

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
