export const CLICK_WINDOW_MS = 3000;
export const GRUMPY_CLICK_COUNT = 5;
export const GRUMPY_DURATION_MS = 4000;
export const PET_LAST_SEEN_KEY = 'boiPetLastSeenV1';
export const SLEEP_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

export function shouldPetSleep(lastSeen, now = Date.now()) {
  return Number.isFinite(lastSeen) && lastSeen >= 0
    && now - lastSeen >= SLEEP_AFTER_MS;
}

// Temporary mood belongs to this open home screen, not the saved XP record.
export function createPetMood() {
  let clicks = [];
  let grumpyUntil = -Infinity;
  return {
    click(now = performance.now()) {
      clicks = clicks.filter(time => now - time < CLICK_WINDOW_MS);
      clicks.push(now);
      clicks = clicks.slice(-GRUMPY_CLICK_COUNT);
      const grumpy = now < grumpyUntil || clicks.length >= GRUMPY_CLICK_COUNT;
      if (grumpy) grumpyUntil = now + GRUMPY_DURATION_MS;
      return { grumpy, duration: grumpy ? GRUMPY_DURATION_MS : 950 };
    },
  };
}
