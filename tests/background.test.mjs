import test from 'node:test';
import assert from 'node:assert/strict';
import { KEY, initialState } from '../src/timer.mjs';

test('worker restores an expired session once, persists actions, and serializes messages', async () => {
  const listeners = {};
  const event = name => ({ addListener(fn) { listeners[name] = fn; } });
  const saved = { [KEY]: { ...initialState(), endAt: Date.now() - 1000 } };
  const notifications = [], alarms = new Map();
  globalThis.chrome = {
    storage: { local: { async get() { return structuredClone(saved); }, async set(value) { Object.assign(saved, structuredClone(value)); } } },
    alarms: { async clear(name) { alarms.delete(name); }, async create(name, info) { alarms.set(name, info); }, onAlarm: event('alarm') },
    action: { async setBadgeText() {}, async setBadgeBackgroundColor() {} },
    notifications: { async create(id, options) { notifications.push(options); } },
    runtime: { id: 'test', onMessage: event('message'), onStartup: event('startup'), onInstalled: event('installed') }
  };
  await import('../src/background.js');
  const send = action => new Promise(resolve => listeners.message({ target: 'pomodoro', action }, { id: 'test' }, resolve));
  let result = await send();
  assert.equal(result.state.completed, 1);
  assert.equal(result.state.mode, 'short');
  assert.equal(result.state.endAt, null);
  assert.equal(notifications.length, 1);
  await send(); assert.equal(notifications.length, 1);
  result = await send({ type: 'start' });
  assert.equal(alarms.get('boi-session-end').when, result.state.endAt);
  // No popup needs to remain open: an alarm acts against persisted state.
  saved[KEY].endAt = Date.now() - 1;
  listeners.alarm({ name: 'boi-session-end' });
  result = await send();
  assert.equal(result.state.mode, 'focus'); assert.equal(result.state.completed, 1);
  assert.equal(notifications.length, 2); assert.equal(alarms.size, 0);
  await Promise.all([send({ type: 'addTask', id: 'a', title: 'First' }), send({ type: 'addTask', id: 'b', title: 'Second' })]);
  assert.equal(saved[KEY].tasks.length, 2);
  await send({ type: 'start' }); await send({ type: 'pause' });
  assert.equal(alarms.size, 0); assert.equal(saved[KEY].endAt, null);
  delete globalThis.chrome;
});
