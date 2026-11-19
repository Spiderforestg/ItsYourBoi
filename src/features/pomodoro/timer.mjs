export const KEY = 'boiPomodoroV1';
export const MODES = { focus: 'Focus', short: 'Short break', long: 'Long break' };
export function initialState() {
  return { mode: 'focus', settings: { focus: 25, short: 5, long: 15 },
    remaining: 25 * 60, endAt: null, completed: 0, focusMinutes: 0, focusSessionMinutesCredited: 0, tasks: [] };
}
export function secondsLeft(state, now = Date.now()) {
  return state.endAt === null ? state.remaining : Math.max(0, Math.ceil((state.endAt - now) / 1000));
}
function elapsedFocusMinutes(state, now) {
  if (state?.mode !== 'focus') return 0;
  const elapsed = Math.max(0, state.settings.focus * 60 - secondsLeft(state, now));
  return Math.floor(elapsed / 60);
}
export function focusMinutesEarned(state, now = Date.now()) {
  const savedMinutes = Number.isFinite(state?.focusMinutes) ? Math.max(0, Math.floor(state.focusMinutes)) : 0;
  if (!state || state.mode !== 'focus') return savedMinutes;
  const creditedMinutes = Number.isFinite(state.focusSessionMinutesCredited)
    ? Math.max(0, Math.floor(state.focusSessionMinutesCredited))
    : 0;
  return savedMinutes + Math.max(0, elapsedFocusMinutes(state, now) - creditedMinutes);
}
function bankFocusMinutes(state, now) {
  if (state.mode !== 'focus') return state;
  const elapsedMinutes = elapsedFocusMinutes(state, now);
  const savedMinutes = Number.isFinite(state.focusMinutes) ? Math.max(0, Math.floor(state.focusMinutes)) : 0;
  const creditedMinutes = Number.isFinite(state.focusSessionMinutesCredited)
    ? Math.max(0, Math.floor(state.focusSessionMinutesCredited))
    : 0;
  const newlyEarned = Math.max(0, elapsedMinutes - creditedMinutes);
  return newlyEarned > 0
    ? {
      ...state,
      focusMinutes: savedMinutes + newlyEarned,
      focusSessionMinutesCredited: elapsedMinutes,
    }
    : state;
}
function nextMode(state) {
  return state.mode === 'focus' ? (state.completed > 0 && state.completed % 4 === 0 ? 'long' : 'short') : 'focus';
}
function select(state, mode) {
  return { ...state, mode, remaining: state.settings[mode] * 60, endAt: null, focusSessionMinutesCredited: 0 };
}
export function settle(state, now = Date.now()) {
  if (state.endAt === null || state.endAt > now) return { state, finished: null };
  const finished = state.mode;
  if (finished === 'focus') {
    state = bankFocusMinutes(state, now);
    state = { ...state, completed: state.completed + 1 };
  }
  return { state: select(state, nextMode(state)), finished };
}
export function transition(state, action, now = Date.now()) {
  state = settle(state, now).state;
  switch (action.type) {
    case 'start': return state.endAt === null ? { ...state, endAt: now + state.remaining * 1000 } : state;
    case 'pause': return { ...bankFocusMinutes(state, now), remaining: secondsLeft(state, now), endAt: null };
    case 'reset': return select(bankFocusMinutes(state, now), state.mode);
    case 'skip': {
      state = bankFocusMinutes(state, now);
      return select(state, nextMode(state));
    }
    case 'mode': return Object.hasOwn(MODES, action.mode) ? select(bankFocusMinutes(state, now), action.mode) : state;
    case 'settings': {
      if (!action.settings || !Object.keys(MODES).every(mode => Number.isInteger(action.settings[mode]) && action.settings[mode] >= 1 && action.settings[mode] <= 120)) throw new Error('Use whole minutes between 1 and 120.');
      return select({ ...bankFocusMinutes(state, now), settings: { ...action.settings } }, state.mode);
    }
    case 'addTask': {
      const title = String(action.title || '').trim().slice(0, 120);
      if (!title || state.tasks.length >= 20) return state;
      return { ...state, tasks: [...state.tasks, { id: action.id, title, done: false }] };
    }
    case 'toggleTask': return { ...state, tasks: state.tasks.map(t => t.id === action.id ? { ...t, done: !t.done } : t) };
    case 'deleteTask': return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) };
    default: return state;
  }
}
