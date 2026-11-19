import { KEY, MODES, initialState, settle, transition } from '../pomodoro/timer.mjs';
import { createRadioPlayer } from './music/radio-player.mjs';

const ALARM = 'boi-session-end';
const RADIO_OFFSCREEN_PATH = 'src/features/main/music/radio-offscreen.html';
function broadcastRadioState(response) {
  chrome.runtime.sendMessage({ target: 'radio-state', response }).catch(error => {
    console.debug('No radio menu is open to receive the state update:', error);
  });
}
const firefoxRadioPlayer = typeof document === 'undefined'
  ? null
  : createRadioPlayer(document.createElement('audio'), broadcastRadioState);
let radioOffscreenCreating;
let queue = Promise.resolve();
function enqueue(work) {
  const result = queue.then(work);
  queue = result.catch(console.error);
  return result;
}
async function radioOffscreenExists() {
  const url = chrome.runtime.getURL(RADIO_OFFSCREEN_PATH);
  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [url],
    });
    return contexts.length > 0;
  }
  const clients = await self.clients.matchAll();
  return clients.some(client => client.url === url);
}
async function ensureRadioOffscreen() {
  if (firefoxRadioPlayer || await radioOffscreenExists()) return;
  if (!chrome.offscreen?.createDocument) throw new Error('Background audio is unavailable in this browser.');
  if (!radioOffscreenCreating) {
    radioOffscreenCreating = chrome.offscreen.createDocument({
      url: RADIO_OFFSCREEN_PATH,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Keep radio music playing after the popup closes.',
    });
  }
  try {
    await radioOffscreenCreating;
  } catch (error) {
    if (!await radioOffscreenExists()) throw error;
  } finally {
    radioOffscreenCreating = null;
  }
}
async function handleRadio(message) {
  if (firefoxRadioPlayer) return firefoxRadioPlayer.handle(message.action, message.volume);
  await ensureRadioOffscreen();
  const response = await chrome.runtime.sendMessage({
    target: 'radio-offscreen',
    action: message.action,
    volume: message.volume,
  });
  if (!response) throw new Error('The background radio did not respond.');
  return response;
}
async function loadState() {
  const synced = await chrome.storage.sync.get(KEY);
  if (synced[KEY]) return synced[KEY];

  const local = await chrome.storage.local.get(KEY);
  return local[KEY] || initialState();
}
async function update(action) {
  const expired = settle(await loadState());
  const state = action ? transition(expired.state, action) : expired.state;
  await chrome.storage.sync.set({ [KEY]: state });
  await chrome.alarms.clear(ALARM);
  if (state.endAt !== null) await chrome.alarms.create(ALARM, { when: state.endAt });
  await chrome.action.setBadgeText({ text: state.endAt !== null ? (state.mode === 'focus' ? 'ON' : 'REST') : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#48735b' });
  if (expired.finished) {
    try {
      await chrome.notifications.create('boi-session-complete', {
        type: 'basic', iconUrl: 'src/assets/pomodoro/timer-icon.png',
        title: `${MODES[expired.finished]} complete!`,
        message: `${MODES[expired.state.mode]} is ready. Open your timer when you’re ready to start.`
      });
    } catch (error) { console.warn('Notification unavailable:', error); }
  }
  return state;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return;
  if (message?.target === 'radio') {
    handleRadio(message).then(respond, error => {
      console.error('Could not control background radio:', error);
      respond({ error: 'Could not connect to the radio player. Try again.' });
    });
    return true;
  }
  if (message?.target !== 'pomodoro') return;
  enqueue(() => update(message.action)).then(state => respond({ state }), error => respond({ error: error.message }));
  return true;
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM) enqueue(() => update());
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[KEY]?.newValue) enqueue(() => update());
});
chrome.runtime.onStartup.addListener(() => enqueue(() => update()));
chrome.runtime.onInstalled.addListener(() => enqueue(() => update()));
// Recover the persisted deadline whenever Chrome restarts this worker.
enqueue(() => update());
