export const BRICK_WIDTH = 240;
export const BRICK_HEIGHT = 224;
export const PADDLE_Y = 204;
export const PADDLE_WIDTH = 44;
export const BALL_RADIUS = 3;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function createBrickBreaker() {
  const bricks = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) {
    bricks.push({ x: 14 + col * 36, y: 24 + row * 14, width: 32, height: 10, row });
  }
  return { paddle: 98, ball: { x: 120, y: 200, vx: 65, vy: -115 }, bricks, score: 0, lives: 3, status: 'ready' };
}

function tick(state, input, dt) {
  if (!['running', 'ready', 'serve'].includes(state.status)) return state;
  const paddle = clamp(state.paddle + clamp(input, -1, 1) * 180 * dt, 0, BRICK_WIDTH - PADDLE_WIDTH);
  if (state.status !== 'running') return { ...state, paddle, ball: { ...state.ball, x: paddle + PADDLE_WIDTH / 2, y: 200 } };
  const previous = state.ball;
  const ball = { ...previous, x: previous.x + previous.vx * dt, y: previous.y + previous.vy * dt };
  if (ball.x < BALL_RADIUS) { ball.x = BALL_RADIUS; ball.vx = Math.abs(ball.vx); }
  if (ball.x > BRICK_WIDTH - BALL_RADIUS) { ball.x = BRICK_WIDTH - BALL_RADIUS; ball.vx = -Math.abs(ball.vx); }
  if (ball.y < BALL_RADIUS) { ball.y = BALL_RADIUS; ball.vy = Math.abs(ball.vy); }
  if (ball.vy > 0 && previous.y + BALL_RADIUS <= PADDLE_Y && ball.y + BALL_RADIUS >= PADDLE_Y) {
    const fraction = (PADDLE_Y - BALL_RADIUS - previous.y) / (ball.y - previous.y);
    const contactX = previous.x + (ball.x - previous.x) * fraction;
    if (contactX + BALL_RADIUS >= paddle && contactX - BALL_RADIUS <= paddle + PADDLE_WIDTH) {
      const offset = clamp((contactX - paddle - PADDLE_WIDTH / 2) / (PADDLE_WIDTH / 2), -1, 1);
      ball.y = PADDLE_Y - BALL_RADIUS;
      ball.vx = offset * 105;
      ball.vy = -Math.sqrt(135 ** 2 - ball.vx ** 2);
    }
  }
  let hit = -1;
  for (let i = 0; i < state.bricks.length; i++) {
    const brick = state.bricks[i];
    const dx = ball.x - clamp(ball.x, brick.x, brick.x + brick.width);
    const dy = ball.y - clamp(ball.y, brick.y, brick.y + brick.height);
    if (dx * dx + dy * dy > BALL_RADIUS ** 2) continue;
    hit = i;
    if (previous.y + BALL_RADIUS <= brick.y || previous.y - BALL_RADIUS >= brick.y + brick.height) {
      ball.vy *= -1;
      ball.y = previous.y < brick.y ? brick.y - BALL_RADIUS : brick.y + brick.height + BALL_RADIUS;
    } else {
      ball.vx *= -1;
      ball.x = previous.x < brick.x ? brick.x - BALL_RADIUS : brick.x + brick.width + BALL_RADIUS;
    }
    break;
  }
  const bricks = hit < 0 ? state.bricks : state.bricks.filter((_, i) => i !== hit);
  const next = { ...state, paddle, ball, bricks, score: state.score + (hit < 0 ? 0 : 10) };
  if (!bricks.length) return { ...next, status: 'won' };
  if (ball.y - BALL_RADIUS > BRICK_HEIGHT) {
    const lives = state.lives - 1;
    return { ...next, lives, status: lives ? 'serve' : 'over', ball: { x: paddle + PADDLE_WIDTH / 2, y: 200, vx: 65, vy: -115 } };
  }
  return next;
}

export function stepBrickBreaker(state, input = 0, seconds = 1 / 120) {
  const duration = Number.isFinite(seconds) ? clamp(seconds, 0, 0.05) : 0;
  const steps = Math.ceil(duration * 120);
  let next = state;
  for (let i = 0; i < steps; i++) next = tick(next, input, duration / steps);
  return next;
}
