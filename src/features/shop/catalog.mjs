import { getPetProgress } from '../pet-home/pet-progress.mjs';

export const SHOP_KEY = 'boiShopV1';
export const ITEMS = [
  { id: 'apple', name: 'Crisp apple', category: 'food', price: 5, level: 1, description: 'A crunchy little treat.', icon: 'apple' },
  { id: 'tee', name: 'Everyday tee', category: 'clothes', price: 20, level: 1, description: 'Comfy clothes for focus days.', icon: 'tee' },
  { id: 'cap', name: 'Sunny cap', category: 'hats', price: 30, level: 1, description: 'A little shade for your boi.', icon: 'cap' },
  { id: 'cookie', name: 'Star cookie', category: 'food', price: 15, level: 2, description: 'A sweet reward for small wins.', icon: 'cookie' },
  { id: 'overalls', name: 'Garden overalls', category: 'clothes', price: 65, level: 2, description: 'Made for a growing buddy.', icon: 'overalls' },
  { id: 'beanie', name: 'Cozy beanie', category: 'hats', price: 50, level: 2, description: 'Keep those big ideas warm.', icon: 'beanie' },
  { id: 'cake', name: 'Berry cake', category: 'food', price: 35, level: 3, description: 'A tiny slice of celebration.', icon: 'cake' },
  { id: 'sweater', name: 'Cloud sweater', category: 'clothes', price: 120, level: 3, description: 'Soft as an afternoon cloud.', icon: 'sweater' },
  { id: 'wizard', name: 'Wizard hat', category: 'hats', price: 150, level: 4, description: 'For a truly magical study buddy.', icon: 'wizard' },
  { id: 'crown', name: 'Little crown', category: 'hats', price: 250, level: 5, description: 'A crown for your focus champion.', icon: 'crown' },
];
const whole = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export function normalizeShop(saved) {
  return { spent: whole(saved?.spent), inventory: Object.fromEntries(ITEMS.map(item => [item.id, whole(saved?.inventory?.[item.id])])) };
}
export function shopView(focusMinutes, bonusXP, baseline, saved) {
  const shop = normalizeShop(saved);
  return { ...shop, gold: Math.max(0, whole(focusMinutes) - shop.spent), level: getPetProgress(focusMinutes, bonusXP, baseline).level };
}
export function purchaseItem(id, focusMinutes, bonusXP, baseline, saved) {
  const item = ITEMS.find(item => item.id === id);
  if (!item) throw new Error('This item is unavailable.');
  const view = shopView(focusMinutes, bonusXP, baseline, saved);
  if (view.level < item.level) throw new Error(`Unlocks at level ${item.level}.`);
  if (item.category !== 'food' && view.inventory[id]) throw new Error('You already own this item.');
  if (view.gold < item.price) throw new Error('Not enough gold. Complete a focus session to earn more.');
  return { spent: view.spent + item.price, inventory: { ...view.inventory, [id]: view.inventory[id] + 1 } };
}

export function consumeFood(id, saved) {
  const item = ITEMS.find(item => item.id === id && item.category === 'food');
  if (!item) throw new Error('Only food can be fed to your pet.');
  const shop = normalizeShop(saved);
  if (!shop.inventory[id]) throw new Error(`You’re out of ${item.name.toLowerCase()}.`);
  shop.inventory[id]--;
  return shop;
}
