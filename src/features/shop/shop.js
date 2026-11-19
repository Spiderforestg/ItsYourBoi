import { ITEMS, SHOP_KEY } from './catalog.mjs';
import { requestShop } from './shop-store.mjs';
import { KEY } from '../pomodoro/timer.mjs';
import { PET_BONUS_XP_KEY, PET_XP_BASELINE_KEY } from '../pet-home/pet-progress.mjs';

const list = document.getElementById('shop-items');
const status = document.getElementById('shop-status');
let filter = 'all';
let state;
let buying = false;
let refreshVersion = 0;
// Small, code-drawn pixel illustrations share the room's palette and dark outlines.
const drawings = {
  apple: '<path fill="#cf8064" d="M5 7h14v3h2v9h-3v3H6v-3H3v-9h2z"/><path fill="#627c4f" d="M11 3h2v5h-2zM13 2h5v3h-5z"/><path fill="#f4c39a" d="M6 10h3v6H6z"/>',
  tee: '<path fill="#a8bbcd" d="M7 4h3v3h4V4h3l6 5-4 5-2-2v10H7V12l-2 2-4-5z"/>',
  cap: '<path fill="#88a86c" d="M5 7h3V4h9v3h3v10H4V7z"/><path fill="#d7e6c7" d="M4 15h18v4H2v-3h2z"/>',
  cookie: '<path fill="#cf9d7c" d="M7 3h10v3h4v14h-4v3H7v-3H3V6h4z"/><path fill="#87664f" d="M7 7h3v3H7zM14 12h3v3h-3zM7 17h3v3H7zM16 5h3v3h-3z"/>',
  overalls: '<path fill="#a8bbcd" d="M5 3h4v7h6V3h4v20h-6v-7h-2v7H5z"/><path fill="#f0d69f" d="M7 10h2v2H7zM15 10h2v2h-2z"/><path fill="#bdd7d5" d="M10 12h4v3h-4z"/>',
  beanie: '<path fill="#cf9d7c" d="M5 9h3V5h8v4h3v12H5z"/><path fill="#f0d69f" d="M10 1h4v4h-4zM3 16h18v6H3z"/>',
  cake: '<path fill="#cf8064" d="M4 9h16v12H4z"/><path fill="#f9f5e7" d="M3 8h18v5H3zM4 16h16v3H4z"/><path fill="#cf8064" d="M10 3h5v5h-5z"/><path fill="#627c4f" d="M12 1h2v3h-2z"/>',
  sweater: '<path fill="#bdd7d5" d="M7 4h3v3h4V4h3l6 5-3 6-3-2v9H7v-9l-3 2-3-6z"/><path fill="#f9f5e7" d="M7 14h10v3H7z"/>',
  wizard: '<path fill="#a8bbcd" d="M11 2h3v4h3v6h3v8H5v-6h3V7h3z"/><path fill="#d0a8f8" d="M2 20h20v3H2z"/><path fill="#f0d69f" d="M12 10h3v3h-3zM7 17h3v3H7z"/>',
  crown: '<path fill="#e8c469" d="M3 5h3v4h3V3h6v6h3V5h3v16H3z"/><path fill="#cf8064" d="M10 14h4v4h-4z"/><path fill="#fff0a4" d="M4 19h16v2H4z"/>',
};
function illustration(item) {
  const wrapper = document.createElement('div');
  wrapper.className = 'item-art';
  wrapper.setAttribute('aria-hidden', 'true');
  // All SVG markup comes from the fixed catalog above, never saved/user data.
  wrapper.innerHTML = `<svg viewBox="0 0 24 26" xmlns="http://www.w3.org/2000/svg"><g stroke="#454b3f" stroke-width="1" stroke-linejoin="miter">${drawings[item.icon]}</g></svg>`;
  return wrapper;
}
function text(tag, className, value) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
}
function render() {
  document.getElementById('shop-level').textContent = `Lv. ${state.level}`;
  document.getElementById('shop-gold').textContent = state.gold;
  const cards = ITEMS.filter(item => filter === 'all' || item.category === filter).map(item => {
    const locked = state.level < item.level;
    const count = state.inventory[item.id];
    const owned = item.category !== 'food' && count > 0;
    const affordable = state.gold >= item.price;
    const card = document.createElement('li');
    card.className = 'item-card';
    card.dataset.locked = locked;
    const details = document.createElement('div');
    const heading = text('div', 'item-heading', '');
    heading.append(text('h2', '', item.name), text('span', 'item-level', locked ? `LOCKED · Lv. ${item.level}` : `Lv. ${item.level}`));
    details.append(heading, text('p', 'item-description', item.description));
    if (count) details.append(text('p', 'item-owned', `IN YOUR BAG: ${count}`));
    const buy = text('button', 'item-buy', '');
    buy.type = 'button';
    buy.dataset.item = item.id;
    const label = owned ? 'OWNED' : locked ? `LEVEL ${item.level} NEEDED` : !affordable ? 'NEED GOLD' : 'BUY';
    buy.append(text('span', '', label), text('span', '', `${item.price} G`));
    buy.disabled = buying || owned || locked || !affordable;
    buy.setAttribute('aria-label', `${item.name}, ${item.price} gold. ${label}.`);
    details.append(buy);
    card.append(illustration(item), details);
    return card;
  });
  list.replaceChildren(...cards);
}
async function refresh() {
  const version = ++refreshVersion;
  try {
    const next = await requestShop();
    if (version !== refreshVersion || buying) return;
    state = next;
    render();
    status.textContent = 'Find a little something. Scroll to browse.';
  } catch {
    if (version !== refreshVersion || buying) return;
    // Stop purchases against a stale balance if storage is unavailable.
    state = null;
    list.querySelectorAll('button').forEach(button => button.disabled = true);
    status.textContent = 'Could not load the shop. Reopen this screen to retry.';
  }
}
list.addEventListener('click', async event => {
  const button = event.target.closest('button[data-item]');
  if (!button || button.disabled || buying) return;
  const id = button.dataset.item;
  buying = true;
  ++refreshVersion;
  render();
  status.textContent = 'Adding to your bag...';
  try {
    state = await requestShop('buy', id);
    status.textContent = `${ITEMS.find(item => item.id === id).name} added to your bag!`;
  } catch (error) {
    status.textContent = error.message;
    // Reload current affordability after another tab spends gold or changes level.
    try { state = await requestShop(); } catch { state = null; }
  } finally {
    buying = false;
    if (state) {
      render();
      // Preserve keyboard position after rebuilding the purchased row.
      const next = list.querySelector(`button[data-item="${id}"]`);
      if (next && !next.disabled) next.focus({ preventScroll: true });
      else list.closest('.shop-shelf').focus({ preventScroll: true });
    } else {
      list.replaceChildren();
    }
  }
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
  if (state) render();
  document.querySelector('.shop-shelf').scrollTop = 0;
}));
const relevant = [KEY, SHOP_KEY, PET_BONUS_XP_KEY, PET_XP_BASELINE_KEY];
if (globalThis.chrome?.runtime?.id) {
  chrome.storage.onChanged.addListener(changes => {
    if (relevant.some(key => key in changes) && !buying) refresh();
  });
} else {
  window.addEventListener('storage', event => {
    if ((event.key === null || relevant.includes(event.key)) && !buying) refresh();
  });
}
window.addEventListener('focus', () => { if (!buying) refresh(); });
refresh();
