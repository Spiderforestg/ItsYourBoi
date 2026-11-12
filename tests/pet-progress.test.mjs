import test from 'node:test';
import assert from 'node:assert/strict';
import { getPetProgress } from '../src/features/pet-home/pet-progress.mjs';

test('level costs grow by 100 XP and surplus carries into the next level', () => {
  for (const [total, level, xp, requiredXP] of [
    [0, 1, 0, 100], [50, 1, 50, 100], [99, 1, 99, 100],
    [100, 2, 0, 200], [150, 2, 50, 200], [299, 2, 199, 200],
    [300, 3, 0, 300], [599, 3, 299, 300], [600, 4, 0, 400],
    [650, 4, 50, 400], [1000, 5, 0, 500],
  ]) {
    assert.deepEqual(getPetProgress(total), { level, xp, requiredXP, totalXP: total });
  }
});

test('prototype XP combines with earned XP without changing focus time', () => {
  assert.deepEqual(getPetProgress(75, 50), { level: 2, xp: 25, requiredXP: 200, totalXP: 125 });
  assert.equal(getPetProgress(75).totalXP, 75);
  assert.deepEqual(getPetProgress(-5, NaN), getPetProgress(0));
  assert.deepEqual(getPetProgress(Infinity, -50), getPetProgress(0));
  assert.equal(getPetProgress(50.9, 50.9).totalXP, 100);
});

test('reset baseline clears pet XP and only future focus minutes earn XP', () => {
  assert.deepEqual(getPetProgress(375, 0, 375), getPetProgress(0));
  assert.deepEqual(getPetProgress(375, 50, 375), getPetProgress(50));
  assert.deepEqual(getPetProgress(425, 50, 375), getPetProgress(100));
  assert.deepEqual(getPetProgress(10, 0, 375), getPetProgress(0));
});
