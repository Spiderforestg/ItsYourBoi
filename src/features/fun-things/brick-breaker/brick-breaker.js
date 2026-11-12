import { createBrickBreaker, stepBrickBreaker, PADDLE_Y, PADDLE_WIDTH, BALL_RADIUS } from './brick-engine.mjs';

const board = document.querySelector('.brick-board');
const context = board.getContext('2d');
const start = document.querySelector('.brick-start');
const pause = document.querySelector('.brick-pause');
const score = document.querySelector('.brick-score');
const lives = document.querySelector('.brick-lives');
const message = document.querySelector('.brick-message');
const keys = new Set();
let state = createBrickBreaker();
let active = false;
let frame;
let previousTime;

function render() {
  context.fillStyle = '#edf1d9';
  context.fillRect(0, 0, board.width, board.height);
  const colors = ['#a26e58', '#bc9470', '#8aa173', '#627c4f'];
  for (const brick of state.bricks) {
    context.fillStyle = colors[brick.row];
    context.fillRect(brick.x, brick.y, brick.width, brick.height);
    context.fillStyle = '#ffffff55';
    context.fillRect(brick.x + 1, brick.y + 1, brick.width - 2, 2);
  }
  context.fillStyle = '#454b3f';
  context.fillRect(state.paddle, PADDLE_Y, PADDLE_WIDTH, 6);
  context.beginPath();
  context.arc(state.ball.x, state.ball.y, BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  score.textContent = state.score;
  lives.textContent = state.lives;
  const text = { ready: 'Left / Right or A / D · Space to launch', running: 'Break all bricks! Space to pause.', paused: 'Paused · Space to resume', serve: 'Ball lost! Space to launch again.', over: 'Game over! Try again.', won: 'All bricks cleared. You win!' }[state.status];
  if (message.textContent !== text) message.textContent = text;
  start.textContent = ['ready', 'serve'].includes(state.status) ? (state.status === 'serve' ? 'LAUNCH' : 'START') : 'RESTART';
  pause.disabled = !['running', 'paused'].includes(state.status);
  pause.textContent = state.status === 'paused' ? 'RESUME' : 'PAUSE';
}

function animate(time) {
  if (!active) return;
  const dt = previousTime === undefined ? 0 : (time - previousTime) / 1000;
  previousTime = time;
  const input = Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a'));
  state = stepBrickBreaker(state, input, dt);
  render();
  frame = requestAnimationFrame(animate);
}

function launch() {
  if (!['ready', 'serve'].includes(state.status)) state = createBrickBreaker();
  state = { ...state, status: 'running' };
  previousTime = undefined;
  render(); board.focus();
}

function togglePause() {
  if (!['running', 'paused'].includes(state.status)) return;
  state = { ...state, status: state.status === 'running' ? 'paused' : 'running' };
  keys.clear(); previousTime = undefined;
  render();
}

start.addEventListener('click', launch);
pause.addEventListener('click', togglePause);
const keyName = event => event.key.length === 1 ? event.key.toLowerCase() : event.key;
document.addEventListener('keydown', event => {
  if (!active || event.altKey || event.ctrlKey || event.metaKey) return;
  const key = keyName(event);
  if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(key)) { event.preventDefault(); keys.add(key); }
  if (event.code === 'Space' && event.target.tagName !== 'BUTTON') {
    event.preventDefault();
    if (event.repeat) return;
    if (['ready', 'serve', 'won', 'over'].includes(state.status)) launch(); else togglePause();
  }
});
document.addEventListener('keyup', event => keys.delete(keyName(event)));
function suspend() {
  keys.clear();
  if (active && state.status === 'running') togglePause();
}
window.addEventListener('blur', suspend);
document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });

export function openBrickBreaker() {
  cancelAnimationFrame(frame);
  state = createBrickBreaker(); active = true; keys.clear(); previousTime = undefined;
  render(); board.focus();
  frame = requestAnimationFrame(animate);
}

export function closeBrickBreaker() {
  active = false; keys.clear(); cancelAnimationFrame(frame);
}
