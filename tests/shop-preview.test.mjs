import test from 'node:test';
import assert from 'node:assert/strict';
import { KEY, initialState } from '../src/features/pomodoro/timer.mjs';
import { SHOP_KEY } from '../src/features/shop/catalog.mjs';
import { requestShop } from '../src/features/shop/shop-store.mjs';

test('preview purchases serialize across tabs, persist, and preserve inventory on failed saves', async () => {
  const data = new Map([[KEY, JSON.stringify({ ...initialState(), focusMinutes: 35 })]]);
  let fail = false, queue = Promise.resolve();
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { if (fail) throw new Error('Storage full'); data.set(key, value); },
  }});
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: {
    request: (_, action) => { const result = queue.then(action); queue = result.catch(() => {}); return result; },
  }}});
  try {
    assert.equal((await requestShop()).gold, 35);
    const results = await Promise.allSettled([requestShop('buy', 'cap'), requestShop('buy', 'cap')]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await requestShop()).inventory.cap, 1);
    assert.equal((await requestShop()).gold, 5);
    const before = data.get(SHOP_KEY);
    fail = true;
    await assert.rejects(requestShop('buy', 'apple'), /Storage full/);
    assert.equal(data.get(SHOP_KEY), before);
    fail = false;
    await requestShop('buy', 'apple');
    assert.equal((await requestShop()).gold, 0);
    assert.equal((await requestShop()).inventory.apple, 1);
    const bought = data.get(SHOP_KEY);
    fail = true;
    await assert.rejects(requestShop('feed', 'apple'), /Storage full/);
    assert.equal(data.get(SHOP_KEY), bought);
    fail = false;
    const feedAttempts = await Promise.allSettled([requestShop('feed', 'apple'), requestShop('feed', 'apple')]);
    assert.equal(feedAttempts.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await requestShop()).inventory.apple, 0);
    assert.equal((await requestShop()).gold, 0);
    delete navigator.locks;
    await assert.rejects(requestShop('buy', 'apple'), /Web Locks/);
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator);
    else delete globalThis.navigator;
  }
});
