import test from 'node:test';
import assert from 'node:assert/strict';
import { createRadioPlayer, RADIO_TRACKS } from '../src/features/main/music/radio-player.mjs';

class FakeAudio extends EventTarget {
  constructor() {
    super();
    this.paused = true;
    this.ended = false;
    this.volume = 1;
    this.source = null;
  }
  get src() { return this.source; }
  set src(value) { this.source = value; this.ended = false; }
  getAttribute(name) { return name === 'src' ? this.source : null; }
  hasAttribute(name) { return name === 'src' && this.source !== null; }
  removeAttribute(name) { if (name === 'src') this.source = null; }
  load() { this.paused = true; this.ended = false; }
  async play() {
    this.paused = false;
    this.ended = false;
    this.dispatchEvent(new Event('play'));
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
  finish() {
    this.paused = true;
    this.ended = true;
    this.dispatchEvent(new Event('ended'));
  }
}

test('radio starts lazily and keeps playing while changing tracks in either direction', async () => {
  const audio = new FakeAudio();
  const player = createRadioPlayer(audio);

  assert.equal(audio.src, null);
  assert.equal((await player.handle('state')).state.trackName, 'A Taste Of Spring');

  const started = await player.handle('toggle');
  assert.equal(started.state.playing, true);
  assert.equal(audio.src, RADIO_TRACKS[0].url);

  const previous = await player.handle('previous');
  assert.equal(previous.state.trackName, 'Aurora On Mute');
  assert.equal(previous.state.playing, true);
  assert.equal(audio.src, RADIO_TRACKS.at(-1).url);

  const next = await player.handle('next');
  assert.equal(next.state.trackName, 'A Taste Of Spring');
  assert.equal(next.state.playing, true);
});

test('paused track changes do not load audio, and volume is preserved by the player', async () => {
  const audio = new FakeAudio();
  const player = createRadioPlayer(audio);
  await player.handle('toggle');
  await player.handle('toggle');

  const previous = await player.handle('previous');
  assert.equal(previous.state.trackName, 'Aurora On Mute');
  assert.equal(previous.state.playing, false);
  assert.equal(audio.src, null);

  const volume = await player.handle('volume', 0.35);
  assert.equal(volume.state.volume, 0.35);
  assert.equal((await player.handle('state')).state.volume, 0.35);
});

test('radio automatically starts the next track when a track ends', async () => {
  const audio = new FakeAudio();
  const player = createRadioPlayer(audio);
  await player.handle('toggle');

  audio.finish();
  await new Promise(resolve => setImmediate(resolve));

  const state = await player.handle('state');
  assert.equal(state.state.trackName, 'After School Rain');
  assert.equal(state.state.playing, true);
});
