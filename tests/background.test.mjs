import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOP_KEY } from '../src/features/shop/catalog.mjs';
import { KEY, initialState } from '../src/features/pomodoro/timer.mjs';

test('worker restores an expired session once, persists actions, and serializes messages', async () => {
  const listeners = {};
  const event = name => ({ addListener(fn) { listeners[name] = fn; } });
  const localSaved = { [KEY]: { ...initialState(), endAt: Date.now() - 1000 } };
  const syncSaved = {};
  const notifications = [], alarms = new Map();
  globalThis.chrome = {
    storage: {
      onChanged: event('storageChanged'),
      local: {
        async get() { return structuredClone(localSaved); },
        async set(value) { Object.assign(localSaved, structuredClone(value)); }
      },
      sync: {
        async get() { return structuredClone(syncSaved); },
        async set(value) { Object.assign(syncSaved, structuredClone(value)); }
      }
    },
    alarms: { async clear(name) { alarms.delete(name); }, async create(name, info) { alarms.set(name, info); }, onAlarm: event('alarm') },
    action: { async setBadgeText() {}, async setBadgeBackgroundColor() {} },
    notifications: { async create(id, options) { notifications.push(options); } },
    runtime: { id: 'test', onMessage: event('message'), onStartup: event('startup'), onInstalled: event('installed') }
  };
  await import('../src/features/main/background.js');
  const send = action => new Promise(resolve => listeners.message({ target: 'pomodoro', action }, { id: 'test' }, resolve));
  let result = await send();
  assert.equal(result.state.completed, 1);
  assert.equal(syncSaved[KEY].completed, 1);
  assert.equal(result.state.mode, 'short');
  assert.equal(result.state.endAt, null);
  assert.equal(notifications.length, 1);
  await send(); assert.equal(notifications.length, 1);
  result = await send({ type: 'start' });
  assert.equal(alarms.get('boi-session-end').when, result.state.endAt);
  // No popup needs to remain open: an alarm acts against persisted state.
  syncSaved[KEY].endAt = Date.now() - 1;
  listeners.alarm({ name: 'boi-session-end' });
  result = await send();
  assert.equal(result.state.mode, 'focus'); assert.equal(result.state.completed, 1);
  assert.equal(notifications.length, 2); assert.equal(alarms.size, 0);
  await Promise.all([send({ type: 'addTask', id: 'a', title: 'First' }), send({ type: 'addTask', id: 'b', title: 'Second' })]);
  assert.equal(syncSaved[KEY].tasks.length, 2);
  await send({ type: 'start' }); await send({ type: 'pause' });
  assert.equal(alarms.size, 0); assert.equal(syncSaved[KEY].endAt, null);

  syncSaved[KEY] = { ...syncSaved[KEY], endAt: Date.now() + 60_000 };
  listeners.storageChanged({ [KEY]: { newValue: syncSaved[KEY] } }, 'sync');
  await send();
  assert.equal(alarms.get('boi-session-end').when, syncSaved[KEY].endAt);
  const shop = (action = 'read', itemId) => new Promise(resolve => listeners.message({ target: 'shop', action, itemId }, { id: 'test' }, resolve));
  syncSaved[KEY] = { ...initialState(), focusMinutes: 45 };
  const legacyShop = { spent: 5, inventory: { apple: 1 } };
  syncSaved[SHOP_KEY] = structuredClone(legacyShop);
  assert.equal((await shop()).shop.gold, 40);
  assert.deepEqual(localSaved[SHOP_KEY], legacyShop);
  const purchases = await Promise.all([shop('buy', 'cap'), shop('buy', 'cap')]);
  assert.equal(purchases.filter(result => result.shop).length, 1);
  assert.equal(localSaved[SHOP_KEY].inventory.cap, 1);
  assert.equal((await shop()).shop.gold, 10);
  const snacks = await Promise.all([shop('buy', 'apple'), shop('buy', 'apple'), shop('buy', 'apple')]);
  assert.equal(snacks.filter(result => result.shop).length, 2);
  assert.equal(localSaved[SHOP_KEY].inventory.apple, 3);
  assert.equal((await shop()).shop.gold, 0);
  assert.match((await shop('feed', 'cap')).error, /Only food/);
  const feedAttempts = await Promise.all(Array.from({ length: 4 }, () => shop('feed', 'apple')));
  assert.equal(feedAttempts.filter(result => result.shop).length, 3);
  assert.equal(localSaved[SHOP_KEY].inventory.apple, 0);
  assert.equal(localSaved[SHOP_KEY].inventory.cap, 1);
  assert.equal((await shop()).shop.gold, 0);
  assert.deepEqual(syncSaved[SHOP_KEY], legacyShop);
  assert.match((await shop('buy', 'wizard')).error, /level 4/);
  syncSaved[KEY].focusMinutes = 100;
  assert.equal((await shop()).shop.gold, 55);
  assert.equal((await shop()).shop.level, 2);
  delete globalThis.chrome;
});
