import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, secondsLeft, settle, transition } from '../src/features/pomodoro/timer.mjs';

test('pause and resume preserve remaining time using a deadline', () => {
  let s = transition(initialState(), { type: 'start' }, 1000);
  assert.equal(secondsLeft(s, 61000), 1440);
  s = transition(s, { type: 'pause' }, 61000);
  assert.equal(secondsLeft(s, 999999), 1440);
  s = transition(s, { type: 'start' }, 1000000);
  assert.equal(s.endAt, 2440000);
});
test('closing the popup or sleeping completes exactly one session, then waits', () => {
  let s = transition(initialState(), { type: 'start' }, 0);
  const result = settle(s, 20_000_000);
  assert.equal(result.finished, 'focus');
  s = result.state;
  assert.equal(s.completed, 1); assert.equal(s.focusMinutes, 25);
  assert.equal(s.mode, 'short'); assert.equal(s.endAt, null);
  assert.equal(settle(s, 30_000_000).state.completed, 1);
});
test('every fourth completed focus session earns a long break', () => {
  let s = initialState();
  for (let i = 1; i <= 8; i++) {
    s = transition(s, { type: 'start' }, 0);
    s = settle(s, s.endAt).state;
    assert.equal(s.mode, i % 4 === 0 ? 'long' : 'short');
    s = transition(s, { type: 'start' }, 0);
    s = settle(s, s.endAt).state;
    assert.equal(s.mode, 'focus');
  }
  assert.equal(s.completed, 8); assert.equal(s.focusMinutes, 200);
});
test('skip, reset and mode changes do not earn focus credit', () => {
  for (const action of [{ type: 'skip' }, { type: 'reset' }, { type: 'mode', mode: 'long' }]) {
    const s = transition(transition(initialState(), { type: 'start' }, 0), action, 6000);
    assert.equal(s.completed, 0); assert.equal(s.focusMinutes, 0); assert.equal(s.endAt, null);
  }
});
test('settings validation and reset preserve lifetime totals', () => {
  let s = { ...initialState(), completed: 7, focusMinutes: 175 };
  for (const focus of [0, -1, 121, 1.5, NaN, '25']) assert.throws(() => transition(s, { type: 'settings', settings: { focus, short: 5, long: 15 } }));
  s = transition(s, { type: 'settings', settings: { focus: 40, short: 10, long: 20 } });
  assert.equal(s.remaining, 2400); assert.equal(s.completed, 7);
});
test('task titles are capped and completion and deletion persist in state', () => {
  let s = transition(initialState(), { type: 'addTask', id: 'one', title: '  Ship timer  ' });
  assert.equal(s.tasks[0].title, 'Ship timer');
  s = transition(s, { type: 'toggleTask', id: 'one' }); assert.equal(s.tasks[0].done, true);
  s = transition(s, { type: 'deleteTask', id: 'one' }); assert.deepEqual(s.tasks, []);
});
