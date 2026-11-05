export const KEY = 'boiPomodoroV1';
export const MODES = { focus: 'Focus', short: 'Short break', long: 'Long break' };
export function initialState() {
  return { mode: 'focus', settings: { focus: 25, short: 5, long: 15 },
    remaining: 25 * 60, endAt: null, completed: 0, focusMinutes: 0, tasks: [] };
}
export function secondsLeft(state, now = Date.now()) {
  return state.endAt === null ? state.remaining : Math.max(0, Math.ceil((state.endAt - now) / 1000));
}
function nextMode(state) {
  return state.mode === 'focus' ? (state.completed > 0 && state.completed % 4 === 0 ? 'long' : 'short') : 'focus';
}
function select(state, mode) {
  return { ...state, mode, remaining: state.settings[mode] * 60, endAt: null };
}
export function settle(state, now = Date.now()) {
  if (state.endAt === null || state.endAt > now) return { state, finished: null };
  const finished = state.mode;
  if (finished === 'focus') state = { ...state, completed: state.completed + 1, focusMinutes: state.focusMinutes + state.settings.focus };
  return { state: select(state, nextMode(state)), finished };
}
export function transition(state, action, now = Date.now()) {
  state = settle(state, now).state;
  switch (action.type) {
    case 'start': return state.endAt === null ? { ...state, endAt: now + state.remaining * 1000 } : state;
    case 'pause': return { ...state, remaining: secondsLeft(state, now), endAt: null };
    case 'reset': return select(state, state.mode);
    case 'skip': return select(state, nextMode(state));
    case 'mode': return Object.hasOwn(MODES, action.mode) ? select(state, action.mode) : state;
    case 'settings': {
      if (!action.settings || !Object.keys(MODES).every(mode => Number.isInteger(action.settings[mode]) && action.settings[mode] >= 1 && action.settings[mode] <= 120)) throw new Error('Use whole minutes between 1 and 120.');
      return select({ ...state, settings: { ...action.settings } }, state.mode);
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
