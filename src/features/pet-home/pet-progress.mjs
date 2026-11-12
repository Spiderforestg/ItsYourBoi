export const XP_PER_LEVEL = 100;
export const PET_BONUS_XP_KEY = 'petPrototypeBonusXP';
export const PET_XP_BASELINE_KEY = 'petXPFocusBaseline';

export function getPetProgress(focusMinutes = 0, bonusXP = 0, focusBaseline = 0) {
  const normalize = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const totalXP = Math.max(0, normalize(focusMinutes) - normalize(focusBaseline)) + normalize(bonusXP);
  // Reaching level L costs 100 * (1 + 2 + ... + (L - 1)) total XP.
  const level = Math.floor((1 + Math.sqrt(1 + 8 * totalXP / XP_PER_LEVEL)) / 2);
  return {
    level,
    xp: totalXP - XP_PER_LEVEL * level * (level - 1) / 2,
    requiredXP: XP_PER_LEVEL * level,
    totalXP,
  };
}
