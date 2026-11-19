import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, normalizeShop, shopView, purchaseItem } from '../src/features/shop/catalog.mjs';

test('gold comes from completed focus, independent of level bonuses and resets', () => {
  assert.equal(shopView(60, 500, 0).gold, 60);
  assert.equal(shopView(60, 500, 0).level, 3);
  assert.equal(shopView(60, 0, 60, { spent: 15 }).gold, 45);
  assert.equal(shopView(60, 0, 60).level, 1);
  assert.equal(shopView(0, 500, 0).gold, 0);
});
test('purchases deduct price, persist inventory and prevent duplicate wearables', () => {
  const saved = purchaseItem('tee', 50, 0, 0);
  assert.equal(shopView(50, 0, 0, saved).gold, 30);
  assert.equal(saved.inventory.tee, 1);
  assert.throws(() => purchaseItem('tee', 50, 0, 0, saved), /already own/);
  const food = purchaseItem('apple', 50, 0, 0, purchaseItem('apple', 50, 0, 0, saved));
  assert.equal(food.inventory.apple, 2);
  assert.equal(food.spent, 30);
  assert.equal(saved.inventory.apple, 0);
});
test('level and affordability checks reject without mutating stored data', () => {
  const saved = normalizeShop();
  const before = structuredClone(saved);
  assert.throws(() => purchaseItem('crown', 1000, 0, 1000, saved), /level 5/);
  assert.throws(() => purchaseItem('apple', 4, 0, 0, saved), /Not enough gold/);
  assert.throws(() => purchaseItem('unknown', 1000, 0, 0, saved), /unavailable/);
  assert.deepEqual(saved, before);
  assert.equal(purchaseItem('cookie', 100, 0, 0).inventory.cookie, 1);
});
test('invalid storage cannot create gold or ownership', () => {
  assert.equal(shopView(NaN, 0, 0, { spent: -100 }).gold, 0);
  assert.equal(shopView(10, 0, 0, { spent: 30 }).gold, 0);
  assert.equal(normalizeShop({ inventory: { tee: -1, cap: Infinity } }).inventory.tee, 0);
  assert.equal(new Set(ITEMS.map(item => item.id)).size, ITEMS.length);
});
