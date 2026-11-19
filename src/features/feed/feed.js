import { ITEMS, SHOP_KEY } from '../shop/catalog.mjs';
import { illustration } from '../shop/item-art.mjs';
import { requestShop } from '../shop/shop-store.mjs';
import { drawOwlPose, owlSpriteUrl, startOwlIdle } from '../pet-home/pet-art.mjs';
import { PET_COLOR_KEY, PET_SECONDARY_COLOR_KEY, recolorPetPixels } from '../pet-home/pet-appearance.mjs';
import { getRoomScene } from '../pet-home/room-scene.mjs';

const extension = Boolean(globalThis.chrome?.runtime?.id);
const list = document.getElementById('feed-items');
const target = document.getElementById('feed-target');
const status = document.getElementById('feed-status');
const empty = document.getElementById('feed-empty');
const context = target.querySelector('canvas').getContext('2d');
const sprite = new Image();
const food = ITEMS.filter(item => item.category === 'food');
const tiles = new Map();
let bag;
let petName = 'Boi';
let colors = {};
let selected;
let dragged;
let feeding = false;
let refreshPending = false;
let refreshVersion = 0;
let idleFrame;
let reactionTimer;

function drawOwl() {
  if (!sprite.naturalWidth) return;
  drawOwlPose(context, sprite, target.dataset.reaction ? 'happy' : 'neutral', idleFrame);
  const { width, height } = context.canvas;
  const pixels = context.getImageData(0, 0, width, height);
  pixels.data.set(recolorPetPixels(pixels.data, colors[PET_COLOR_KEY], colors[PET_SECONDARY_COLOR_KEY]));
  context.putImageData(pixels, 0, 0);
}

sprite.addEventListener('load', () => {
  drawOwl();
  startOwlIdle(frame => {
    idleFrame = frame;
    drawOwl();
  }, () => !target.dataset.reaction);
});
sprite.src = owlSpriteUrl;

async function loadPet() {
  const keys = [PET_COLOR_KEY, PET_SECONDARY_COLOR_KEY];
  petName = (extension ? (await chrome.storage.sync.get('petName')).petName
    : localStorage.getItem('petName')) || 'Boi';
  document.getElementById('feed-pet-name').textContent = petName;
  target.setAttribute('aria-label', `Feed ${petName}`);
  colors = extension ? await chrome.storage.local.get(keys)
    : Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
  drawOwl();
}
loadPet().catch(error => console.warn('Could not load pet appearance:', error));
Object.assign(document.querySelector('.window').dataset, getRoomScene(new Date()));

function renderBag() {
  if (!bag?.inventory[selected]) selected = undefined;
  for (const [id, { row, button, count }] of tiles) {
    const quantity = bag?.inventory[id] ?? 0;
    if (!quantity && row.contains(document.activeElement)) target.focus();
    row.hidden = !quantity;
    count.textContent = `×${quantity}`;
    button.draggable = Boolean(quantity) && !feeding;
    button.setAttribute('aria-pressed', String(selected === id));
    button.setAttribute('aria-disabled', String(feeding));
  }
  empty.hidden = !bag || food.some(item => bag.inventory[item.id] > 0);
  target.toggleAttribute('data-drop-ready', !feeding && Boolean(selected || dragged));
}

for (const item of food) {
  const row = document.createElement('li');
  const button = document.createElement('button');
  const count = document.createElement('span');
  button.className = 'feed-item';
  button.type = 'button';
  button.append(illustration(item), item.name, count);
  button.addEventListener('click', () => {
    if (feeding || !bag?.inventory[item.id]) return;
    selected = selected === item.id ? undefined : item.id;
    status.textContent = selected ? `Select ${petName} to feed it.` : '';
    renderBag();
  });
  button.addEventListener('dragstart', event => {
    if (feeding || !bag?.inventory[item.id]) { event.preventDefault(); return; }
    dragged = item.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragged);
    target.setAttribute('data-drop-ready', '');
  });
  button.addEventListener('dragend', () => {
    dragged = undefined;
    delete target.dataset.dropOver;
    renderBag();
  });
  row.hidden = true;
  row.append(button);
  list.append(row);
  tiles.set(item.id, { row, button, count });
}

async function refreshBag() {
  if (feeding) { refreshPending = true; return; }
  const version = ++refreshVersion;
  try {
    const next = await requestShop();
    if (version !== refreshVersion) return;
    bag = next;
    if (status.hasAttribute('data-load-message')) status.textContent = '';
    delete status.dataset.loadMessage;
  } catch {
    if (version !== refreshVersion) return;
    bag = undefined;
    status.textContent = 'Could not load your food. Reopen Feed to try again.';
    status.dataset.loadMessage = '';
  }
  renderBag();
}

async function feed(id) {
  const item = food.find(entry => entry.id === id);
  if (feeding || !item || !bag?.inventory[id]) return;
  feeding = true;
  ++refreshVersion;
  status.textContent = '';
  renderBag();
  try {
    bag = await requestShop('feed', id);
    selected = undefined;
    status.textContent = `${petName} ate a ${item.name.toLowerCase()}!`;
    clearTimeout(reactionTimer);
    delete target.dataset.reaction;
    void target.offsetWidth;
    target.dataset.reaction = 'happy';
    drawOwl();
    reactionTimer = setTimeout(() => {
      delete target.dataset.reaction;
      drawOwl();
    }, 700);
  } catch (error) {
    status.textContent = error.message;
    refreshPending = true;
  } finally {
    feeding = false;
    renderBag();
    if (refreshPending) {
      refreshPending = false;
      refreshBag();
    }
  }
}

target.addEventListener('click', () => {
  if (selected) feed(selected);
  else if (bag && !feeding && empty.hidden) status.textContent = 'Select food from your bag first.';
});
target.addEventListener('dragover', event => {
  if (!dragged || feeding) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  target.setAttribute('data-drop-over', '');
});
target.addEventListener('dragleave', () => { delete target.dataset.dropOver; });
target.addEventListener('drop', event => {
  if (!dragged) return;
  event.preventDefault();
  delete target.dataset.dropOver;
  if (event.dataTransfer.getData('text/plain') === dragged) feed(dragged);
});

if (extension) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && SHOP_KEY in changes) refreshBag();
  });
} else {
  window.addEventListener('storage', event => {
    if (event.key === SHOP_KEY || event.key === null) refreshBag();
  });
}
window.addEventListener('focus', refreshBag);
status.dataset.loadMessage = '';
refreshBag();
