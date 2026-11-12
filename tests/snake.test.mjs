import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnake, turnSnake, stepSnake, spawnFood, SIZE } from '../src/features/fun-things/snake/snake-engine.mjs';

const running = () => ({ ...createSnake(() => 0), status: 'running' });

test('snake moves, grows on food, and spawns snacks outside its body', () => {
  const state = running();
  const moved = stepSnake(state);
  assert.deepEqual(moved.snake[0], { x: 8, y: 8 });
  assert.equal(moved.snake.length, 3);
  const ate = stepSnake({ ...state, food: { x: 8, y: 8 } }, () => 0);
  assert.equal(ate.score, 1);
  assert.equal(ate.snake.length, 4);
  assert.ok(!ate.snake.some(p => p.x === ate.food.x && p.y === ate.food.y));
  assert.equal(state.snake.length, 3);
});

test('reverse and multiple turns per tick cannot bypass collision rules', () => {
  const state = running();
  assert.equal(turnSnake(state, 'left'), state);
  const up = turnSnake(state, 'up');
  assert.equal(turnSnake(up, 'left'), up);
  assert.deepEqual(stepSnake(up).snake[0], { x: 7, y: 7 });
});

test('walls and body end the game, while moving onto departing tail is legal', () => {
  const state = running();
  assert.equal(stepSnake({ ...state, snake: [{ x: 15, y: 8 }] }).status, 'over');
  const loop = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 1 }];
  assert.equal(stepSnake({ ...state, snake: loop }).status, 'running');
  assert.equal(stepSnake({ ...state, snake: [...loop, { x: 3, y: 1 }] }).status, 'over');
});

test('paused and finished games do not move; filling the board wins', () => {
  for (const status of ['ready', 'paused', 'over', 'won']) {
    const state = { ...running(), status };
    assert.equal(stepSnake(state), state);
  }
  const full = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) full.push({ x, y });
  assert.equal(spawnFood(full), null);
  const food = { x: 1, y: 0 };
  const snake = [{ x: 0, y: 0 }, ...full.filter(p => !(p.y === 0 && p.x <= 1))];
  const won = stepSnake({ ...running(), snake, food });
  assert.equal(won.status, 'won');
  assert.equal(won.snake.length, SIZE * SIZE);
});
