import { getRoomScene } from './room-scene.mjs';
import { PET_COLOR_KEY, PET_SECONDARY_COLOR_KEY, PET_COLORS, recolorPetPixels } from './pet-appearance.mjs';
import { createPetMood, PET_LAST_SEEN_KEY, shouldPetSleep } from './pet-mood.mjs';
import { KEY, initialState, settle } from '../../timer.mjs';
import { getPetProgress, PET_BONUS_XP_KEY, PET_XP_BASELINE_KEY } from './pet-progress.mjs';

const extension = Boolean(globalThis.chrome?.runtime?.id);
const levelLabel = document.querySelector('.pet-level');
const xpCount = document.querySelector('.xp-count');
const xpBar = document.querySelector('.xp-bar');
const xpDetail = document.querySelector('.xp-detail');
let progressState;
let prototypeXP = 0;
let focusBaseline = 0;

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
  xpDetail.textContent = 'Completed focus: 1 min = 1 XP';
  xpBar.title = `Total: ${totalXP} XP`;
}

async function refreshProgress() {
  try {
    if (extension) {
      const response = await chrome.runtime.sendMessage({ target: 'pomodoro' });
      if (!response?.state || response.error) throw new Error('Timer unavailable');
      const saved = await chrome.storage.local.get([PET_BONUS_XP_KEY, PET_XP_BASELINE_KEY]);
      renderProgress(response.state, saved[PET_BONUS_XP_KEY], saved[PET_XP_BASELINE_KEY]);
    } else {
      const saved = localStorage.getItem(KEY);
      renderProgress(settle(saved ? JSON.parse(saved) : initialState()).state,
        Number(localStorage.getItem(PET_BONUS_XP_KEY)), Number(localStorage.getItem(PET_XP_BASELINE_KEY)));
    }
  } catch {
    xpDetail.textContent = 'Could not load XP. Reopen this screen to retry.';
  }
}

if (extension) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes[KEY] || changes[PET_BONUS_XP_KEY] || changes[PET_XP_BASELINE_KEY])) {
      renderProgress(changes[KEY] ? changes[KEY].newValue : progressState,
        changes[PET_BONUS_XP_KEY] ? changes[PET_BONUS_XP_KEY].newValue : prototypeXP,
        changes[PET_XP_BASELINE_KEY] ? changes[PET_XP_BASELINE_KEY].newValue : focusBaseline);
    }
  });
} else {
  window.addEventListener('storage', event => {
    if ([KEY, PET_BONUS_XP_KEY, PET_XP_BASELINE_KEY, null].includes(event.key)) refreshProgress();
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
let neutralFrame;
let originalFrame;
let selectedColor = 'blue';
let selectedSecondaryColor = 'gold';
let currentExpression = 'neutral';

function drawExpression(expression) {
  currentExpression = expression;
  if (!neutralFrame) return;
  context.putImageData(neutralFrame, 0, 0);
  if (expression === 'neutral') return;

  // Replace only the eye pixels, using the original skin color on each row.
  // The body, outline and palette remain from the original sprite.
  function clearEye(x) {
    for (let y = 8; y <= 13; y++) {
      const offset = (y * pet.width + 11) * 4;
      const [r, g, b] = neutralFrame.data.slice(offset, offset + 3);
      context.fillStyle = `rgb(${r}, ${g}, ${b})`;
      context.fillRect(x, y, 4, 1);
    }
  }

  function smilingEye(x) {
    context.fillStyle = '#28515d';
    context.fillRect(x, 10, 1, 1);
    context.fillRect(x + 1, 9, 2, 1);
    context.fillRect(x + 3, 10, 1, 1);
  }

  if (expression === 'happy' || expression === 'wink') {
    clearEye(6);
    smilingEye(6);
    if (expression === 'happy') {
      clearEye(13);
      smilingEye(13);
    }
    context.fillStyle = '#28515d';
    context.fillRect(10, 14, 3, 1);
    context.fillRect(11, 15, 1, 1);
    context.fillStyle = '#ef9eaa';
    context.fillRect(4, 13, 2, 1);
    context.fillRect(17, 13, 2, 1);
  } else if (expression === 'sleeping') {
    clearEye(6);
    clearEye(13);
    context.fillStyle = '#28515d';
    context.fillRect(6, 11, 4, 1);
    context.fillRect(13, 11, 4, 1);
    context.fillRect(10, 15, 2, 1);
  } else if (expression === 'grumpy') {
    clearEye(6);
    clearEye(13);
    context.fillStyle = '#28515d';
    // Inward-slanting brows, narrowed eyes and a small frown.
    for (let i = 0; i < 4; i++) {
      context.fillRect(6 + i, 8 + Math.floor(i / 2), 1, 1);
      context.fillRect(13 + i, 9 - Math.floor(i / 2), 1, 1);
    }
    context.fillRect(7, 12, 2, 1);
    context.fillRect(14, 12, 2, 1);
    context.fillRect(10, 15, 1, 1);
    context.fillRect(11, 14, 1, 1);
    context.fillRect(12, 15, 1, 1);
  } else if (expression === 'surprised') {
    context.fillStyle = '#28515d';
    context.fillRect(7, 10, 1, 2);
    context.fillRect(14, 10, 1, 2);
    context.fillRect(10, 14, 3, 2);
    context.fillStyle = '#ef9eaa';
    context.fillRect(11, 15, 1, 1);
  }
}

sprite.addEventListener('load', () => {
  // Draw the neutral pose at its original resolution; CSS enlarges the pixels.
  context.drawImage(sprite, 0, 21, 22, 25, 0, 0, 22, 25);
  const frame = context.getImageData(0, 0, pet.width, pet.height);
  const { data, width, height } = frame;
  const visited = new Uint8Array(width * height);
  const pending = [];

  // Remove only white pixels connected to the crop's edge. Enclosed whites
  // (such as eyes) and all character colors keep their original values.
  for (let x = 0; x < width; x++) {
    pending.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    pending.push(y * width, y * width + width - 1);
  }

  while (pending.length) {
    const pixel = pending.pop();
    if (visited[pixel]) continue;
    visited[pixel] = 1;
    const offset = pixel * 4;
    const transparent = data[offset + 3] === 0;
    const white = data[offset] === 255
      && data[offset + 1] === 255 && data[offset + 2] === 255;
    if (!transparent && !white) continue;

    data[offset + 3] = 0;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) pending.push(pixel - 1);
    if (x < width - 1) pending.push(pixel + 1);
    if (y > 0) pending.push(pixel - width);
    if (y < height - 1) pending.push(pixel + width);
  }

  originalFrame = frame;
  applyPetColor(selectedColor);
});
sprite.src = new URL('../../assets/pet/placeholder-sprite-sheet.png', import.meta.url).href;

function applyPetColor(colorId, secondaryId = selectedSecondaryColor) {
  selectedColor = PET_COLORS.some(color => color.id === colorId) ? colorId : 'blue';
  selectedSecondaryColor = PET_COLORS.some(color => color.id === secondaryId) ? secondaryId : 'gold';
  if (originalFrame) {
    neutralFrame = new ImageData(
      recolorPetPixels(originalFrame.data, selectedColor, selectedSecondaryColor), originalFrame.width, originalFrame.height,
    );
    drawExpression(currentExpression);
  }
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

const petButton = document.querySelector('.pet-interact');
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
  petButton.setAttribute('aria-label', 'Play with Boi');
  petButton.title = 'Click to play with Boi';
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
        petButton.setAttribute('aria-label', 'Wake Boi');
        petButton.title = 'Click to wake Boi';
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
