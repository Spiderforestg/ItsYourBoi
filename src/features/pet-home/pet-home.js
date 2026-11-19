import { SHOP_KEY, shopView } from '../shop/catalog.mjs';
import { drawOwlPose, owlSpriteUrl, startOwlIdle } from './pet-art.mjs';
import { getRoomScene } from './room-scene.mjs';
import { DEFAULT_PET_COLOR, DEFAULT_PET_SECONDARY_COLOR, PET_COLOR_KEY, PET_SECONDARY_COLOR_KEY, PET_COLORS, recolorPetPixels } from './pet-appearance.mjs';
import { createPetMood, PET_LAST_SEEN_KEY, shouldPetSleep } from './pet-mood.mjs';
import { KEY, initialState, settle } from '../pomodoro/timer.mjs';
import { getPetProgress, PET_BONUS_XP_KEY, PET_XP_BASELINE_KEY } from './pet-progress.mjs';

const extension = Boolean(globalThis.chrome?.runtime?.id);
const levelLabel = document.querySelector('.pet-level');
const xpCount = document.querySelector('.xp-count');
const xpBar = document.querySelector('.xp-bar');
const xpDetail = document.querySelector('.xp-detail');
let progressState;
let shopData;
let prototypeXP = 0;
let focusBaseline = 0;

let petName = 'Boi';

const petNameElement = document.querySelector('.pet-name');
const petButton = document.querySelector('.pet-interact');

async function loadPetName() {
  try {
    const savedName = extension
      ? (await chrome.storage.sync.get('petName')).petName
      : localStorage.getItem('petName');
    petName = savedName || 'Boi';
    petNameElement.textContent = petName;
    petButton.setAttribute('aria-label', `Play with ${petName}`);
    petButton.title = `Click to play with ${petName}`;
  } catch (error) {
    console.error('Could not load pet name:', error);
  }
}

loadPetName();

function renderProgress(state, bonusXP = prototypeXP, baseline = focusBaseline) {
  progressState = state;
  prototypeXP = bonusXP;
  focusBaseline = baseline;
  const { level, xp, totalXP, requiredXP } = getPetProgress(state?.focusMinutes, bonusXP, baseline);
  levelLabel.textContent = `Lv. ${level}`;
  xpCount.textContent = `${xp} / ${requiredXP} XP`;
  xpBar.max = requiredXP;
  xpBar.value = xp;
  xpBar.setAttribute('aria-valuetext', `Level ${level}, ${xp} of ${requiredXP} XP toward next level`);
  xpDetail.textContent = '';
  xpBar.title = `Total: ${totalXP} XP`;
  const { gold } = shopView(state?.focusMinutes, bonusXP, baseline, shopData);
  document.querySelector('.coin-count').textContent = gold;
  document.querySelector('.pet-wallet').setAttribute('aria-label', `Gold: ${gold}`);
}

async function refreshProgress() {
  try {
    if (extension) {
      const response = await chrome.runtime.sendMessage({ target: 'pomodoro' });
      if (!response?.state || response.error) throw new Error('Timer unavailable');
      const saved = await chrome.storage.local.get([SHOP_KEY, PET_BONUS_XP_KEY, PET_XP_BASELINE_KEY]);
      shopData = saved[SHOP_KEY] ?? (await chrome.storage.sync.get(SHOP_KEY))[SHOP_KEY];
      renderProgress(response.state, saved[PET_BONUS_XP_KEY], saved[PET_XP_BASELINE_KEY]);
    } else {
      const saved = localStorage.getItem(KEY);
      shopData = JSON.parse(localStorage.getItem(SHOP_KEY) ?? 'null');
      renderProgress(settle(saved ? JSON.parse(saved) : initialState()).state,
        Number(localStorage.getItem(PET_BONUS_XP_KEY)), Number(localStorage.getItem(PET_XP_BASELINE_KEY)));
    }
  } catch {
    xpDetail.textContent = 'Could not load XP. Reopen this screen to retry.';
  }
}

if (extension) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if ((area === 'sync' && (changes[KEY] || changes[SHOP_KEY])) ||
        (area === 'local' && (changes[SHOP_KEY] || changes[PET_BONUS_XP_KEY] || changes[PET_XP_BASELINE_KEY]))) {
      refreshProgress();
    }
  });
} else {
  window.addEventListener('storage', event => {
    if ([KEY, SHOP_KEY, PET_BONUS_XP_KEY, PET_XP_BASELINE_KEY, null].includes(event.key)) refreshProgress();
  });
}
refreshProgress();

const addXPButton = document.querySelector('.prototype-xp');
const resetXPButton = document.querySelector('.prototype-reset');
addXPButton.addEventListener('click', async () => {
  addXPButton.disabled = true;
  resetXPButton.disabled = true;
  try {
    const saved = extension
      ? (await chrome.storage.local.get(PET_BONUS_XP_KEY))[PET_BONUS_XP_KEY]
      : Number(localStorage.getItem(PET_BONUS_XP_KEY));
    const nextXP = getPetProgress(0, saved).totalXP + 50;
    if (extension) await chrome.storage.local.set({ [PET_BONUS_XP_KEY]: nextXP });
    else localStorage.setItem(PET_BONUS_XP_KEY, String(nextXP));
    await refreshProgress();
  } catch {
    xpDetail.textContent = 'Could not save test XP. Please try again.';
  } finally {
    addXPButton.disabled = false;
    resetXPButton.disabled = false;
  }
});

resetXPButton.addEventListener('click', async () => {
  addXPButton.disabled = resetXPButton.disabled = true;
  try {
    let state;
    if (extension) {
      const response = await chrome.runtime.sendMessage({ target: 'pomodoro' });
      if (!response?.state || response.error) throw new Error('Timer unavailable');
      state = response.state;
    } else {
      const saved = localStorage.getItem(KEY);
      state = settle(saved ? JSON.parse(saved) : initialState()).state;
    }
    const baseline = getPetProgress(state.focusMinutes).totalXP;
    if (extension) {
      await chrome.storage.local.set({ [PET_BONUS_XP_KEY]: 0, [PET_XP_BASELINE_KEY]: baseline });
    } else {
      localStorage.setItem(PET_XP_BASELINE_KEY, String(baseline));
      localStorage.setItem(PET_BONUS_XP_KEY, '0');
    }
    renderProgress(state, 0, baseline);
  } catch {
    xpDetail.textContent = 'Could not reset XP. Please try again.';
  } finally {
    addXPButton.disabled = resetXPButton.disabled = false;
  }
});

const roomWindow = document.querySelector('.window');
const clock = document.querySelector('.room-clock');
const pad = value => String(value).padStart(2, '0');

function updateRoomScene() {
  const now = new Date();
  const { time, season } = getRoomScene(now);
  roomWindow.dataset.time = time;
  roomWindow.dataset.season = season;
  clock.dateTime = now.toISOString();
  clock.textContent = `${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

updateRoomScene();
window.setInterval(() => {
  if (!document.hidden) {
    updateRoomScene();
    if (!extension) refreshProgress();
  }
}, 60_000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateRoomScene();
    refreshProgress();
  }
});

const pet = document.querySelector('.pet');
const context = pet.getContext('2d');
const sprite = new Image();
let spriteReady = false;
let selectedColor = DEFAULT_PET_COLOR;
let selectedSecondaryColor = DEFAULT_PET_SECONDARY_COLOR;
let currentExpression = 'neutral';
let idleFrame;

function drawExpression(expression) {
  currentExpression = expression;
  if (!spriteReady) return;

  drawOwlPose(context, sprite, expression, idleFrame);
  if (selectedColor === DEFAULT_PET_COLOR && selectedSecondaryColor === DEFAULT_PET_SECONDARY_COLOR) return;
  const frame = context.getImageData(0, 0, pet.width, pet.height);
  frame.data.set(recolorPetPixels(frame.data, selectedColor, selectedSecondaryColor));
  context.putImageData(frame, 0, 0);
}

sprite.addEventListener('load', () => {
  spriteReady = true;
  drawExpression(currentExpression);
  startOwlIdle(frame => {
    idleFrame = frame;
    drawExpression('neutral');
  }, () => currentExpression === 'neutral');
});
sprite.addEventListener('error', () => {
  xpDetail.textContent = "Could not load Boi's image. Update and reload the extension.";
});
sprite.src = owlSpriteUrl;

function applyPetColor(colorId, secondaryId = selectedSecondaryColor) {
  selectedColor = PET_COLORS.some(color => color.id === colorId) ? colorId : DEFAULT_PET_COLOR;
  selectedSecondaryColor = PET_COLORS.some(color => color.id === secondaryId) ? secondaryId : DEFAULT_PET_SECONDARY_COLOR;
  drawExpression(currentExpression);
  for (const swatch of document.querySelectorAll('.color-swatch')) {
    const selected = swatch.dataset.region === 'primary' ? selectedColor : selectedSecondaryColor;
    swatch.setAttribute('aria-pressed', String(swatch.dataset.color === selected));
  }
}

const palette = document.querySelector('.color-palette');
const paletteStatus = document.querySelector('.palette-status');
const swatchGroups = document.querySelectorAll('.color-swatches');
let colorVersion = 0;
let colorSaveQueue = Promise.resolve();

for (const swatches of swatchGroups) {
 const region = swatches.dataset.region;
 for (const color of PET_COLORS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'color-swatch';
  button.dataset.color = color.id;
  button.dataset.region = region;
  button.style.setProperty('--swatch-color', color.hex);
  button.setAttribute('aria-pressed', String(color.id === (region === 'primary' ? selectedColor : selectedSecondaryColor)));
  button.textContent = color.label;
  button.addEventListener('click', () => {
    colorVersion++;
    if (region === 'primary') applyPetColor(color.id);
    else applyPetColor(selectedColor, color.id);
    paletteStatus.textContent = `${region === 'primary' ? 'Primary' : 'Secondary'}: ${color.label} selected.`;
    const colorKey = region === 'primary' ? PET_COLOR_KEY : PET_SECONDARY_COLOR_KEY;
    colorSaveQueue = colorSaveQueue.then(async () => {
      if (extension) await chrome.storage.local.set({ [colorKey]: color.id });
      else localStorage.setItem(colorKey, color.id);
      paletteStatus.textContent = 'Color saved.';
    }).catch(() => { paletteStatus.textContent = 'Color changed, but could not save it.'; });
  });
  swatches.append(button);
 }
}

document.querySelector('.dresser').addEventListener('click', () => palette.showModal());
document.querySelector('.palette-close').addEventListener('click', () => palette.close());

async function restorePetColor() {
  const version = colorVersion;
  try {
    const saved = extension
      ? await chrome.storage.local.get([PET_COLOR_KEY, PET_SECONDARY_COLOR_KEY])
      : { [PET_COLOR_KEY]: localStorage.getItem(PET_COLOR_KEY), [PET_SECONDARY_COLOR_KEY]: localStorage.getItem(PET_SECONDARY_COLOR_KEY) };
    if (version === colorVersion) applyPetColor(saved[PET_COLOR_KEY], saved[PET_SECONDARY_COLOR_KEY]);
  } catch {
    paletteStatus.textContent = 'Could not load saved color. Pick a color to try it on.';
  }
}
restorePetColor();

const mood = createPetMood();
const reactions = [
  { motion: 'hop', expression: 'surprised' },
  { motion: 'wiggle', expression: 'wink' },
  { motion: 'happy', expression: 'happy' },
];
let reactionTimer;
let sleeping = false;
let interactionVersion = 0;

petButton.addEventListener('click', () => {
  interactionVersion++;
  const waking = sleeping;
  sleeping = false;
  delete petButton.dataset.sleeping;
  petButton.setAttribute('aria-label', `Play with ${petName}`);
  petButton.title = `Click to play with ${petName}`;
  window.clearTimeout(reactionTimer);
  const { grumpy, duration } = mood.click();
  const reaction = grumpy ? { motion: 'grumpy', expression: 'grumpy' }
    : waking ? { motion: 'hop', expression: 'surprised' }
      : reactions[Math.floor(Math.random() * reactions.length)];
  // Restart even when repeated clicks pick the same motion.
  delete petButton.dataset.reaction;
  void petButton.offsetWidth;
  petButton.dataset.reaction = reaction.motion;
  drawExpression(reaction.expression);
  reactionTimer = window.setTimeout(() => {
    delete petButton.dataset.reaction;
    drawExpression('neutral');
  }, duration);
});

// Serialize presence reads and writes so a visibility change cannot overwrite
// the previous visit before the initial absence check finishes.
let presenceQueue = Promise.resolve();
function recordPresence(checkAbsence = false) {
  const version = interactionVersion;
  presenceQueue = presenceQueue.then(async () => {
    if (checkAbsence) {
      const previous = extension
        ? (await chrome.storage.local.get(PET_LAST_SEEN_KEY))[PET_LAST_SEEN_KEY]
        : JSON.parse(localStorage.getItem(PET_LAST_SEEN_KEY) ?? 'null');
      if (version === interactionVersion && shouldPetSleep(previous)) {
        window.clearTimeout(reactionTimer);
        delete petButton.dataset.reaction;
        sleeping = true;
        petButton.dataset.sleeping = 'true';
        petButton.setAttribute('aria-label', `Wake ${petName}`);
        petButton.title = `Click to wake ${petName}`;
        drawExpression('sleeping');
      }
    }
    const now = Date.now();
    if (extension) await chrome.storage.local.set({ [PET_LAST_SEEN_KEY]: now });
    else localStorage.setItem(PET_LAST_SEEN_KEY, JSON.stringify(now));
  }).catch(error => console.warn('Could not save pet visit time:', error));
}

if (!document.hidden) recordPresence(true);
window.setInterval(() => {
  if (!document.hidden) recordPresence();
}, 60_000);
document.addEventListener('visibilitychange', () => {
  recordPresence(!document.hidden);
});
