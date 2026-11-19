import test from 'node:test';
import assert from 'node:assert/strict';
import { PET_COLORS, recolorPetPixels } from '../src/features/pet-home/pet-appearance.mjs';

const pixels = new Uint8ClampedArray([
  115, 62, 57, 255, // brown feathers
  115, 62, 57, 255, // brown wing
  255, 255, 255, 255, // white eye
  62, 39, 49, 255, // dark outline
  254, 231, 97, 255, // gold detail
  115, 62, 57, 0, // transparent pixel
]);

test('default and unknown colors preserve the original pixels', () => {
  assert.deepEqual(recolorPetPixels(pixels, 'brown'), pixels);
  assert.deepEqual(recolorPetPixels(pixels, 'missing'), pixels);
});

test('palette changes body hue while preserving shading, details and transparency', () => {
  for (const color of PET_COLORS.slice(1)) {
    const output = recolorPetPixels(pixels, color.id);
    assert.notDeepEqual(output.slice(0, 3), pixels.slice(0, 3));
    assert.equal(Math.max(...output.slice(0, 3)), 115);
    assert.equal(Math.min(...output.slice(0, 3)), 57);
    assert.equal(Math.max(...output.slice(4, 7)), 115);
    assert.deepEqual(output.slice(8), pixels.slice(8));
    assert.equal(output[3], 255);
    assert.equal(output[7], 255);
  }
});

test('recoloring never mutates the original; brown restores exact original color', () => {
  const original = pixels.slice();
  recolorPetPixels(pixels, 'pink');
  assert.deepEqual(pixels, original);
  assert.deepEqual(recolorPetPixels(pixels, 'brown'), original);
});

test('primary and secondary colors change independent original regions in every combination', () => {
  for (const primary of PET_COLORS) for (const secondary of PET_COLORS) {
    const output = recolorPetPixels(pixels, primary.id, secondary.id);
    assert.deepEqual(output.slice(0, 8), recolorPetPixels(pixels, primary.id).slice(0, 8));
    assert.deepEqual(output.slice(16, 20), recolorPetPixels(pixels, 'brown', secondary.id).slice(16, 20));
    assert.deepEqual(output.slice(8, 16), pixels.slice(8, 16));
    assert.deepEqual(output.slice(20), pixels.slice(20));
    if (secondary.id !== 'gold') assert.notDeepEqual(output.slice(16, 19), pixels.slice(16, 19));
    assert.equal(Math.max(...output.slice(16, 19)), 254);
    assert.equal(Math.min(...output.slice(16, 19)), 97);
  }
  assert.deepEqual(recolorPetPixels(pixels, 'brown', 'gold'), pixels);
  assert.deepEqual(recolorPetPixels(pixels, 'missing', 'missing'), pixels);
});
