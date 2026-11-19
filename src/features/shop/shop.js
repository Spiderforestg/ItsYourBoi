import { illustration } from './item-art.mjs';
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
