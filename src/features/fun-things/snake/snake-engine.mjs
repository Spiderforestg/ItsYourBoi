export const SIZE = 16;
const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const same = (a, b) => a.x === b.x && a.y === b.y;

export function spawnFood(snake, random = Math.random) {
  const empty = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (!snake.some(part => same(part, { x, y }))) empty.push({ x, y });
  }
  return empty.length ? empty[Math.floor(random() * empty.length)] : null;
}

export function createSnake(random = Math.random) {
  const snake = [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }];
  return { snake, direction: 'right', queued: 'right', food: spawnFood(snake, random), score: 0, status: 'ready' };
}

export function turnSnake(state, direction) {
  if (state.status !== 'running' || !directions[direction] || state.queued !== state.direction) return state;
  const current = directions[state.direction];
  const next = directions[direction];
  if (current[0] + next[0] === 0 && current[1] + next[1] === 0) return state;
  return { ...state, queued: direction };
}

export function stepSnake(state, random = Math.random) {
  if (state.status !== 'running') return state;
  const [dx, dy] = directions[state.queued];
  const head = { x: state.snake[0].x + dx, y: state.snake[0].y + dy };
  const eating = same(head, state.food);
  // Moving onto the departing tail is legal unless this step grows the snake.
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE || body.some(part => same(part, head))) {
    return { ...state, status: 'over' };
  }
  const snake = [head, ...state.snake];
  if (!eating) snake.pop();
  const food = eating ? spawnFood(snake, random) : state.food;
  return { ...state, snake, food, direction: state.queued, score: state.score + Number(eating), status: food ? 'running' : 'won' };
}
