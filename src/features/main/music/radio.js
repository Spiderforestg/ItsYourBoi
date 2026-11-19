import { createRadioPlayer } from './radio-player.mjs';

const audio = document.querySelector('.radio-audio');
const trackLabel = document.querySelector('.radio-track');
const status = document.querySelector('.radio-status');
const playButton = document.querySelector('.radio-play');
const volume = document.querySelector('#radio-volume');
const volumeValue = document.querySelector('.volume-value');
const extension = Boolean(globalThis.chrome?.runtime?.id);

function render(response) {
  const state = response?.state;
  if (state) {
    trackLabel.textContent = state.trackName;
    trackLabel.title = state.trackName;
    playButton.textContent = state.playing ? 'PAUSE' : 'PLAY';
    playButton.setAttribute('aria-pressed', String(state.playing));
    if (Number(volume.value) !== state.volume) volume.value = String(state.volume);
    volumeValue.value = `${Math.round(state.volume * 100)}%`;
  }
  status.hidden = !response?.error;
  if (response?.error) status.textContent = response.error;
}

const localPlayer = extension ? null : createRadioPlayer(audio, render);

async function sendCommand(action, value) {
  try {
    const response = extension
      ? await chrome.runtime.sendMessage({ target: 'radio', action, volume: value })
      : await localPlayer.handle(action, value);
    render(response);
  } catch (error) {
    console.error('Could not send radio command:', error);
    render({ error: 'Could not connect to the radio player. Try again.' });
  }
}

playButton.addEventListener('click', () => sendCommand('toggle'));
document.querySelector('.radio-previous').addEventListener('click', () => sendCommand('previous'));
document.querySelector('.radio-skip').addEventListener('click', () => sendCommand('next'));
volume.addEventListener('input', () => {
  volumeValue.value = `${Math.round(Number(volume.value) * 100)}%`;
  sendCommand('volume', Number(volume.value));
});

document.querySelector('.radio-close').addEventListener('click', () => {
  window.parent.postMessage({ type: 'radio:close' }, '*');
});

sendCommand('state');
if (extension) {
  chrome.runtime.onMessage.addListener(message => {
    if (message?.target === 'radio-state') render(message.response);
  });
}
