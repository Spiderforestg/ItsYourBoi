import { SHOP_KEY, shopView, purchaseItem } from '../shop/catalog.mjs';
import { PET_BONUS_XP_KEY, PET_XP_BASELINE_KEY } from '../pet-home/pet-progress.mjs';
import { KEY, MODES, initialState, settle, transition } from '../pomodoro/timer.mjs';

const ALARM = 'boi-session-end';
let queue = Promise.resolve();
function enqueue(work) {
  const result = queue.then(work);
  queue = result.catch(console.error);
  return result;
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
async function updateShop(message) {
  if (!['read', 'buy'].includes(message.action)) throw new Error('Unknown shop action.');
  const timer = settle(await loadState()).state;
  const synced = await chrome.storage.sync.get(SHOP_KEY);
  const local = await chrome.storage.local.get([PET_BONUS_XP_KEY, PET_XP_BASELINE_KEY]);
  const bonus = local[PET_BONUS_XP_KEY];
  const baseline = local[PET_XP_BASELINE_KEY];
  let saved = synced[SHOP_KEY];
  if (message.action === 'buy') {
    saved = purchaseItem(message.itemId, timer.focusMinutes, bonus, baseline, saved);
    await chrome.storage.sync.set({ [SHOP_KEY]: saved });
  }
  return shopView(timer.focusMinutes, bonus, baseline, saved);
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return;
  // Both routes share one queue, so a purchase always validates the latest balance.
  if (message?.target === 'pomodoro') {
    enqueue(() => update(message.action)).then(state => respond({ state }), error => respond({ error: error.message }));
  } else if (message?.target === 'shop') {
    enqueue(() => updateShop(message)).then(shop => respond({ shop }), error => respond({ error: error.message }));
  } else return;
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
