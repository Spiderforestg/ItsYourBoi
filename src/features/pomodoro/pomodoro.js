import { KEY, MODES, initialState, secondsLeft, settle, transition } from './timer.mjs';

const $ = selector => document.querySelector(selector);
const extension = Boolean(globalThis.chrome?.runtime?.id);
let state = initialState();
let busy = false;

// Keep timer changes on the same extension state as the full Pomodoro page.
function showMessage(text) {
  const message = $('#message');
  message.textContent = text;
  message.hidden = !text;
}

async function dispatch(action) {
  if (busy) return false;
  busy = true;
  try {
    if (extension) {
      const response = await chrome.runtime.sendMessage({ target: 'pomodoro', action });
      if (!response?.state || response.error) {
        throw new Error(response?.error || 'Timer is unavailable. Reload the extension and try again.');
      }
      state = response.state;
    } else {
      const saved = localStorage.getItem(KEY);
      state = settle(saved ? JSON.parse(saved) : state).state;
      if (action) state = transition(state, action);
      localStorage.setItem(KEY, JSON.stringify(state));
    }
    render();
    return true;
  } catch (error) {
    showMessage(error.message || 'Could not save your timer. Please try again.');
    return false;
  } finally {
    busy = false;
  }
}

// Draw the current session, progress arc, cycle count, and available settings.
function render() {
  const remaining = secondsLeft(state);
  const duration = state.settings[state.mode] * 60;
  const elapsedDegrees = Math.min(360, Math.max(0, (1 - remaining / duration) * 360));
  const completedInCycle = state.completed % 4;
  const nextBreak = completedInCycle === 3 ? 'long break' : 'short break';
  const isPaused = state.endAt === null && remaining < duration;

  $('#time').textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  $('#dial').style.setProperty('--progress', `${elapsedDegrees}deg`);
  $('#phase').textContent = state.mode === 'focus' ? 'TIME TO LOCK IN' : 'TAKE A BREATHER';
  $('#timer-hint').textContent = `Next: ${state.mode === 'focus' ? nextBreak : 'focus'}`;
  document.title = `${$('#time').textContent} · ${MODES[state.mode]} · It's Your Boi`;

  const start = $('#start');
  start.replaceChildren(document.createTextNode(
    state.endAt !== null ? 'Pause session'
      : isPaused ? 'Resume session'
        : state.mode === 'focus' ? 'Start focusing' : 'Start break'
  ));
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = state.endAt !== null ? 'Ⅱ' : '▶';
  start.append(icon);

  document.querySelectorAll('[data-mode]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
  });
  document.querySelectorAll('.cycle-dot').forEach((dot, index) => {
    dot.classList.toggle('filled', index < completedInCycle);
  });
  $('#cycle .cycle-label').textContent = `${completedInCycle}/4 to a long break`;
}

// Wire timer, session selection, and settings controls to the shared timer state.
$('#start').addEventListener('click', () => {
  dispatch({ type: state.endAt !== null ? 'pause' : 'start' });
});
$('#reset').addEventListener('click', () => dispatch({ type: 'reset' }));
document.querySelectorAll('[data-mode]').forEach(button => {
  button.addEventListener('click', () => dispatch({ type: 'mode', mode: button.dataset.mode }));
});
$('#settings-toggle').addEventListener('click', () => {
  const opening = $('#settings').hidden;
  $('#settings').hidden = !opening;
  $('#settings-toggle').setAttribute('aria-expanded', String(opening));
  if (opening) {
    for (const mode of Object.keys(MODES)) {
      $('#settings-form').elements[mode].value = state.settings[mode];
    }
  }
});
$('#settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const settings = Object.fromEntries(
    Object.keys(MODES).map(mode => [mode, Number(event.currentTarget.elements[mode].value)])
  );
  if (await dispatch({ type: 'settings', settings })) {
    $('#settings').hidden = true;
    $('#settings-toggle').setAttribute('aria-expanded', 'false');
    showMessage('Lengths saved. Your timer is ready.');
  }
});

// Follow timer updates from other extension pages, with local preview sync as a fallback.
if (extension) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[KEY]?.newValue) {
      state = changes[KEY].newValue;
      render();
    }
  });
} else {
  window.addEventListener('storage', event => {
    if (event.key === KEY && event.newValue) {
      try {
        state = JSON.parse(event.newValue);
        render();
      } catch (error) {
        showMessage(error.message || 'Could not load the saved timer.');
      }
    }
  });
}

// Refresh the countdown and let the background worker settle expired sessions.
await dispatch();
window.setInterval(() => {
  if (state.endAt !== null && secondsLeft(state) === 0 && !busy) {
    dispatch();
  } else {
    render();
  }
}, 250);
