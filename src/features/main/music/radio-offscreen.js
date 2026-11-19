import { createRadioPlayer } from './radio-player.mjs';

const player = createRadioPlayer(document.querySelector('audio'), response => {
  chrome.runtime.sendMessage({ target: 'radio-state', response }).catch(error => {
    console.debug('No radio menu is open to receive the state update:', error);
  });
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.target !== 'radio-offscreen') return;
  player.handle(message.action, message.volume).then(respond, error => {
    console.error('Could not handle radio command:', error);
    respond({ state: player.getState(), error: 'Could not control the radio. Try again.' });
  });
  return true;
});
