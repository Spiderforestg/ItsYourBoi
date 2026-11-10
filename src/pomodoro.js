import { KEY, MODES, initialState, secondsLeft, settle, transition } from './timer.mjs';

const $ = selector => document.querySelector(selector);
const extension = Boolean(globalThis.chrome?.runtime?.id);
let state = initialState();
let busy = false;
let taskSnapshot = '';
const message = text => { $('#message').textContent = text; };

async function dispatch(action) {
  if (busy) return false;
  busy = true;
  try {
    if (extension) {
      const response = await chrome.runtime.sendMessage({ target: 'pomodoro', action });
      if (!response || response.error) throw new Error(response?.error || 'Timer is unavailable. Reload the extension and try again.');
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
    message(error.message || 'Could not save your timer. Please try again.');
    return false;
  } finally { busy = false; }
}

function render() {
  const remaining = secondsLeft(state);
  const time = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  $('#time').textContent = time;
  document.title = `${time} · ${MODES[state.mode]} · It's Your Boi`;
  $('#dial').style.setProperty('--progress', `${Math.min(360, Math.max(0, 1 - remaining / (state.settings[state.mode] * 60)) * 360)}deg`);
  $('#phase').textContent = state.mode === 'focus' ? 'TIME TO LOCK IN' : 'TAKE A BREATHER';
  $('#timer-hint').textContent = state.endAt !== null ? (state.mode === 'focus' ? 'You’ve got this, boi.' : 'Rest is part of the process.') : (remaining < state.settings[state.mode] * 60 ? 'Paused. Take your time.' : 'Ready when you are.');
  $('#start').replaceChildren(document.createTextNode(state.endAt !== null ? 'Pause session' : remaining < state.settings[state.mode] * 60 ? 'Resume session' : state.mode === 'focus' ? 'Start focusing' : 'Start break'));
  const icon = document.createElement('span'); icon.textContent = state.endAt !== null ? 'Ⅱ' : '▶'; $('#start').append(icon);
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
  $('#completed').textContent = state.completed;
  $('#minutes').replaceChildren(document.createTextNode(state.focusMinutes));
  const unit = document.createElement('span'); unit.textContent = ' min'; $('#minutes').append(unit);
  const count = state.completed % 4;
  $('#cycle').replaceChildren();
  for (let i = 0; i < 4; i++) { const dot = document.createElement('i'); dot.classList.toggle('filled', i < count); $('#cycle').append(dot); }
  const cycleText = document.createElement('span'); cycleText.textContent = `${count}/4 to a long break`; $('#cycle').append(cycleText);
  $('#next').textContent = state.mode !== 'focus' ? 'Your next focus session is a fresh start.' : count === 3 ? 'A long break follows this focus session.' : 'A short break follows your focus session.';
  const tasks = JSON.stringify(state.tasks);
  if (tasks !== taskSnapshot) {
    taskSnapshot = tasks;
    $('#task-list').replaceChildren();
    for (const task of state.tasks) {
      const li = document.createElement('li');
      const label = document.createElement('label'); label.classList.toggle('done', task.done);
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = task.done;
      check.addEventListener('change', () => dispatch({ type: 'toggleTask', id: task.id }));
      const text = document.createElement('span'); text.textContent = task.title; label.append(check, text);
      const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', `Delete ${task.title}`);
      remove.addEventListener('click', () => dispatch({ type: 'deleteTask', id: task.id }));
      li.append(label, remove); $('#task-list').append(li);
    }
  }
  $('#task-count').textContent = `${state.tasks.filter(task => task.done).length}/${state.tasks.length} done`;
  $('#empty-tasks').hidden = state.tasks.length > 0;
}

$('#start').addEventListener('click', () => dispatch({ type: state.endAt !== null ? 'pause' : 'start' }));
$('#reset').addEventListener('click', async () => { if (await dispatch({ type: 'reset' })) message('Current session reset.'); });
$('#skip').addEventListener('click', async () => { if (await dispatch({ type: 'skip' })) message('Session skipped. Skipped sessions don’t count toward your progress.'); });
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => dispatch({ type: 'mode', mode: button.dataset.mode })));
$('#settings-toggle').addEventListener('click', () => {
  const opening = $('#settings').hidden;
  $('#settings').hidden = !opening;
  $('#settings-toggle').setAttribute('aria-expanded', String(opening));
  if (opening) for (const mode of Object.keys(MODES)) $('#settings-form').elements[mode].value = state.settings[mode];
});
$('#settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const settings = Object.fromEntries(Object.keys(MODES).map(mode => [mode, Number(event.currentTarget.elements[mode].value)]));
  if (await dispatch({ type: 'settings', settings })) {
    $('#settings').hidden = true; $('#settings-toggle').setAttribute('aria-expanded', 'false'); message('Lengths saved. Your timer is ready.');
  }
});
$('#task-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (state.tasks.length >= 20) return message('Your game plan holds up to 20 tasks. Clear one to make room.');
  if (await dispatch({ type: 'addTask', title: $('#task-title').value, id: crypto.randomUUID() })) $('#task-title').value = '';
});
$('#open-tab').addEventListener('click', () => {
  if (extension) chrome.tabs.create({ url: chrome.runtime.getURL('src/pomodoro.html') });
  else window.open('pomodoro.html', '_blank', 'noopener');
});
if (extension) chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[KEY]?.newValue) { state = changes[KEY].newValue; render(); }
});
else {
  $('#environment').textContent = 'Web preview · keep this tab open for alerts.';
  window.addEventListener('storage', event => { if (event.key === KEY && event.newValue) { state = JSON.parse(event.newValue); render(); } });
}
await dispatch();
setInterval(() => {
  if (state.endAt !== null && secondsLeft(state) === 0 && !busy) {
    dispatch().then(ok => { if (ok) message(`${MODES[state.mode]} is ready. Start when you’re ready.`); });
  } else render();
}, 250);
