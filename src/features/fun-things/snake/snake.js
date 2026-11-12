import { createSnake, turnSnake, stepSnake, SIZE } from './snake-engine.mjs';

const board = document.querySelector('.snake-board');
const context = board.getContext('2d');
const pause = document.querySelector('.snake-pause');
const start = document.querySelector('.snake-start');
let state = createSnake();
let active = false;
let timer;

function render() {
  const cell = board.width / SIZE;
  context.fillStyle = '#edf1d9';
  context.fillRect(0, 0, board.width, board.height);
  context.fillStyle = '#e0e7cf';
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if ((x + y) % 2 === 0) context.fillRect(x * cell, y * cell, cell, cell);
  }
  if (state.food) {
    context.fillStyle = '#b76b4d';
    context.fillRect(state.food.x * cell + 2, state.food.y * cell + 2, cell - 4, cell - 4);
  }
  state.snake.forEach((part, i) => {
    context.fillStyle = i === 0 ? '#343b36' : '#627c4f';
    context.fillRect(part.x * cell + 1, part.y * cell + 1, cell - 2, cell - 2);
  });
  document.querySelector('.snake-score').textContent = state.score;
  document.querySelector('.snake-message').textContent = {
    ready: 'Eat snacks. Avoid walls and yourself!', running: 'Arrows / WASD to move · Space to pause',
    paused: 'Paused. Press RESUME to continue.', over: 'Game over! Press RESTART to try again.', won: 'You filled the board. You win!',
  }[state.status];
  pause.disabled = !['running', 'paused'].includes(state.status);
  pause.textContent = state.status === 'paused' ? 'RESUME' : 'PAUSE';
  start.textContent = state.status === 'ready' ? 'START' : 'RESTART';
}

function schedule() {
  clearInterval(timer);
  if (state.status === 'running') timer = setInterval(() => {
    state = stepSnake(state);
    if (state.status !== 'running') clearInterval(timer);
    render();
  }, 150);
}

function startGame() {
  state = { ...createSnake(), status: 'running' };
  schedule(); render(); board.focus();
}

function togglePause() {
  if (!['running', 'paused'].includes(state.status)) return;
  state = { ...state, status: state.status === 'running' ? 'paused' : 'running' };
  schedule(); render();
}

start.addEventListener('click', startGame);
pause.addEventListener('click', togglePause);
document.addEventListener('keydown', event => {
  if (!active || event.altKey || event.ctrlKey || event.metaKey) return;
  const direction = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[event.key.length === 1 ? event.key.toLowerCase() : event.key];
  if (direction) { event.preventDefault(); state = turnSnake(state, direction); }
  if (event.code === 'Space' && event.target.tagName !== 'BUTTON') {
    event.preventDefault();
    if (event.repeat) return;
    if (state.status === 'ready') startGame(); else togglePause();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.status === 'running') togglePause();
});
window.addEventListener('blur', () => {
  if (state.status === 'running') togglePause();
});

export function openSnake() {
  active = true;
  state = createSnake();
  clearInterval(timer);
  render(); board.focus();
}

export function closeSnake() {
  active = false;
  clearInterval(timer);
  state = createSnake();
}
