import { KEY, MODES, initialState, settle, transition } from './timer.mjs';

const ALARM = 'boi-session-end';
let queue = Promise.resolve();
function enqueue(work) {
  const result = queue.then(work);
  queue = result.catch(console.error);
  return result;
}
async function update(action) {
  const saved = await chrome.storage.local.get(KEY);
  const expired = settle(saved[KEY] || initialState());
  const state = action ? transition(expired.state, action) : expired.state;
  await chrome.storage.local.set({ [KEY]: state });
  await chrome.alarms.clear(ALARM);
  if (state.endAt !== null) await chrome.alarms.create(ALARM, { when: state.endAt });
  await chrome.action.setBadgeText({ text: state.endAt !== null ? (state.mode === 'focus' ? 'ON' : 'REST') : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#48735b' });
  if (expired.finished) {
    try {
      await chrome.notifications.create('boi-session-complete', {
        type: 'basic', iconUrl: 'src/assets/timer-icon.png',
        title: `${MODES[expired.finished]} complete!`,
        message: `${MODES[expired.state.mode]} is ready. Open your timer when you’re ready to start.`
      });
    } catch (error) { console.warn('Notification unavailable:', error); }
  }
  return state;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.target !== 'pomodoro') return;
  enqueue(() => update(message.action)).then(state => respond({ state }), error => respond({ error: error.message }));
  return true;
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM) enqueue(() => update());
});
chrome.runtime.onStartup.addListener(() => enqueue(() => update()));
chrome.runtime.onInstalled.addListener(() => enqueue(() => update()));
// Recover the persisted deadline whenever Chrome restarts this worker.
enqueue(() => update());
