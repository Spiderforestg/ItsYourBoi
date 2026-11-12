import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrickBreaker, stepBrickBreaker } from '../src/features/fun-things/brick-breaker/brick-engine.mjs';

const running = ball => ({ ...createBrickBreaker(), status: 'running', ball });

test('paddle stays on board and moves the attached ball before launch', () => {
  let state = createBrickBreaker();
  for (let i = 0; i < 100; i++) state = stepBrickBreaker(state, 1, 0.05);
  assert.equal(state.paddle, 196);
  assert.equal(state.ball.x, 218);
  for (let i = 0; i < 100; i++) state = stepBrickBreaker(state, -1, 0.05);
  assert.equal(state.paddle, 0);
});

test('ball bounces off walls and paddle; paddle position controls bounce angle', () => {
  assert.ok(stepBrickBreaker(running({ x: 3, y: 100, vx: -65, vy: -100 })).ball.vx > 0);
  assert.ok(stepBrickBreaker(running({ x: 237, y: 100, vx: 65, vy: -100 })).ball.vx < 0);
  const clear = { ...running({ x: 120, y: 3, vx: 65, vy: -100 }), bricks: [] };
  assert.ok(stepBrickBreaker(clear).ball.vy > 0);
  const hit = stepBrickBreaker(running({ x: 132, y: 200, vx: 0, vy: 120 }));
  assert.ok(hit.ball.vy < 0);
  assert.ok(hit.ball.vx > 0);
});

test('brick hits remove one brick, score points, and clearing the last brick wins', () => {
  const state = running({ x: 30, y: 38, vx: 0, vy: -120 });
  const hit = stepBrickBreaker(state);
  assert.equal(hit.bricks.length, 23);
  assert.equal(hit.score, 10);
  assert.ok(hit.ball.vy > 0);
  assert.equal(state.bricks.length, 24);
  assert.equal(stepBrickBreaker({ ...state, bricks: [state.bricks[0]] }).status, 'won');
  const side = stepBrickBreaker(running({ x: 10.5, y: 29, vx: 120, vy: 0 }));
  assert.equal(side.score, 10);
  assert.ok(side.ball.vx < 0);
});

test('missing costs a life, keeps broken bricks, and ends after the last life', () => {
  const state = { ...running({ x: 20, y: 228, vx: 0, vy: 120 }), score: 30 };
  const lost = stepBrickBreaker(state);
  assert.equal(lost.lives, 2);
  assert.equal(lost.status, 'serve');
  assert.equal(lost.score, 30);
  assert.equal(lost.ball.y, 200);
  assert.equal(stepBrickBreaker({ ...state, lives: 1 }).status, 'over');
});

test('paused and finished games freeze; long frames use small collision steps', () => {
  for (const status of ['paused', 'over', 'won']) {
    const state = { ...createBrickBreaker(), status };
    assert.equal(stepBrickBreaker(state, 1, 0.05), state);
  }
  const state = running({ x: 30, y: 41, vx: 0, vy: -120 });
  const hit = stepBrickBreaker({ ...state, bricks: [state.bricks[0], state.bricks[5]] }, 0, 0.05);
  assert.equal(hit.score, 10);
});
