import test from 'node:test';
import assert from 'node:assert/strict';
import { createPetMood, GRUMPY_DURATION_MS, shouldPetSleep, SLEEP_AFTER_MS } from '../src/features/pet-home/pet-mood.mjs';

test('five rapid clicks cause grumpiness; the first four do not', () => {
  const mood = createPetMood();
  for (const now of [0, 200, 400, 600]) assert.equal(mood.click(now).grumpy, false);
  assert.deepEqual(mood.click(800), { grumpy: true, duration: GRUMPY_DURATION_MS });
});

test('clicks outside the rolling three-second window do not accumulate', () => {
  const mood = createPetMood();
  for (const now of [0, 500, 1000, 1500, 3000]) assert.equal(mood.click(now).grumpy, false);
});

test('leaving the pet alone for four seconds restores its mood', () => {
  const mood = createPetMood();
  for (const now of [0, 100, 200, 300, 400]) mood.click(now);
  assert.equal(mood.click(4400).grumpy, false);
});

test('clicking while grumpy extends the recovery time', () => {
  const mood = createPetMood();
  for (const now of [0, 100, 200, 300, 400]) mood.click(now);
  assert.equal(mood.click(4000).grumpy, true);
  assert.equal(mood.click(7000).grumpy, true);
  assert.equal(mood.click(11000).grumpy, false);
});

test('sleep starts after exactly 72 hours without a visit', () => {
  const lastSeen = 1000;
  assert.equal(shouldPetSleep(lastSeen, lastSeen + SLEEP_AFTER_MS - 1), false);
  assert.equal(shouldPetSleep(lastSeen, lastSeen + SLEEP_AFTER_MS), true);
  assert.equal(shouldPetSleep(lastSeen, lastSeen + SLEEP_AFTER_MS * 2), true);
});

test('first visits, invalid timestamps and future timestamps do not cause sleep', () => {
  for (const value of [null, undefined, '123', NaN, Infinity, -1]) {
    assert.equal(shouldPetSleep(value, SLEEP_AFTER_MS * 2), false);
  }
  assert.equal(shouldPetSleep(5000, 4000), false);
  assert.equal(shouldPetSleep(5000, 5001), false);
});
