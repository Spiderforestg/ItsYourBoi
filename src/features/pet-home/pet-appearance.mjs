export const PET_COLOR_KEY = 'boiPetColorV1';
export const PET_SECONDARY_COLOR_KEY = 'boiPetSecondaryColorV1';
export const PET_COLORS = [
  { id: 'blue', label: 'Blue', hex: '#a8f8f8', hue: null },
  { id: 'pink', label: 'Pink', hex: '#f8a8d0', hue: 330 },
  { id: 'mint', label: 'Mint', hex: '#a8f8bc', hue: 135 },
  { id: 'gold', label: 'Gold', hex: '#f8e4a8', hue: 45 },
  { id: 'lilac', label: 'Lilac', hex: '#d0a8f8', hue: 270 },
];

// Identify both regions from the original pixels so overlapping chosen hues
// never affect the other region. Preserve shading, eyes, outlines and opacity.
export function recolorPetPixels(source, colorId, secondaryId = 'gold') {
  const result = new Uint8ClampedArray(source);
  const color = PET_COLORS.find(item => item.id === colorId) ?? PET_COLORS[0];
  const secondary = PET_COLORS.find(item => item.id === secondaryId) ?? PET_COLORS[3];
  for (let i = 0; i < result.length; i += 4) {
    const [r, g, b, a] = source.subarray(i, i + 4);
    if (!a) continue;
    const primaryPixel = g - r >= 20 && b - r >= 20;
    const secondaryPixel = r - b >= 20 && g - b >= 20;
    const target = primaryPixel ? color : secondaryPixel ? secondary : null;
    if (!target || (primaryPixel && target.id === 'blue') || (secondaryPixel && target.id === 'gold')) continue;
    const hue = (target.hue ?? 180) / 60;
    const low = Math.min(r, g, b);
    const chroma = Math.max(r, g, b) - low;
    const middle = chroma * (1 - Math.abs(hue % 2 - 1));
    const channels = hue < 1 ? [chroma, middle, 0]
      : hue < 2 ? [middle, chroma, 0]
        : hue < 3 ? [0, chroma, middle]
          : hue < 4 ? [0, middle, chroma]
            : hue < 5 ? [middle, 0, chroma] : [chroma, 0, middle];
    for (let channel = 0; channel < 3; channel++) {
      result[i + channel] = Math.round(channels[channel] + low);
    }
  }
  return result;
}
