import { KEY, initialState, settle } from '../pomodoro/timer.mjs';
import { PET_BONUS_XP_KEY, PET_XP_BASELINE_KEY } from '../pet-home/pet-progress.mjs';
import { SHOP_KEY, shopView, purchaseItem } from './catalog.mjs';
const extension = Boolean(globalThis.chrome?.runtime?.id);
async function preview(action, itemId) {
  const raw = localStorage.getItem(KEY);
  const timer = settle(raw ? JSON.parse(raw) : initialState()).state;
  const bonus = Number(localStorage.getItem(PET_BONUS_XP_KEY));
  const baseline = Number(localStorage.getItem(PET_XP_BASELINE_KEY));
  let saved = JSON.parse(localStorage.getItem(SHOP_KEY) ?? 'null');
  if (action === 'buy') {
    saved = purchaseItem(itemId, timer.focusMinutes, bonus, baseline, saved);
    localStorage.setItem(SHOP_KEY, JSON.stringify(saved));
  }
  return shopView(timer.focusMinutes, bonus, baseline, saved);
}
export async function requestShop(action = 'read', itemId) {
  if (extension) {
    const response = await chrome.runtime.sendMessage({ target: 'shop', action, itemId });
    if (!response?.shop || response.error) throw new Error(response?.error || 'Shop unavailable. Reload the extension and try again.');
    return response.shop;
  }
  // Serialize purchases across preview tabs so two clicks cannot spend the same gold.
  if (navigator.locks) return navigator.locks.request('boi-shop', () => preview(action, itemId));
  if (action === 'buy') throw new Error('Purchases need a browser with Web Locks support.');
  return preview(action, itemId);
}
