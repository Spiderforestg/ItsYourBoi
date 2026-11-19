export const owlSpriteUrl = new URL('../../assets/pets/ItsYourOwl.png', import.meta.url).href;
const geminiSpriteUrl = new URL('../../assets/pets/ItsYourOwl_gemini.png', import.meta.url).href;
const frameWidth = 22;
const frameHeight = 25;

// Coordinates in the owl sheet's 32 px cells. Every pose shares a foot line.
const owlPoses = {
  neutral: [2, 0],
  happy: [0, 2],
  wink: [2, 2],
  sleeping: [0, 0],
  grumpy: [3, 0],
  surprised: [1, 0],
};

// Use the forward pose, blink, and head turns. The sheet also contains props.
const idlePoses = [owlPoses.neutral, [0, 0], [2, 2], [3, 2]];

function originalFrame([column, row]) {
  return { x: column * 32 + 5, y: row * 32 + 4 };
}

function loadGeminiFrames(frames) {
  const image = new Image();
  image.addEventListener('load', () => {
    // Crop the upper and lower owls, then align their feet to the original poses.
    for (const [top, sourceHeight, height] of [[40, 580, 18], [908, 452, 14]]) {
      const canvas = document.createElement('canvas');
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 144, top, 388, sourceHeight, 5, frameHeight - height, 12, height);

      // The Gemini sheet has an opaque charcoal background.
      const pixels = context.getImageData(0, 0, frameWidth, frameHeight);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const [r, g, b] = pixels.data.subarray(i, i + 3);
        if (Math.max(r, g, b) <= 38) pixels.data[i + 3] = 0;
      }
      context.putImageData(pixels, 0, 0);
      frames.push({ image: canvas, x: 0, y: 0 });
    }
  });
  image.src = geminiSpriteUrl;
}

export function startOwlIdle(showFrame, isIdle = () => true) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frames = idlePoses.map(originalFrame);
  loadGeminiFrames(frames);
  let frame = 0;
  window.setInterval(() => {
    if (document.hidden || reducedMotion.matches || !isIdle()) return;
    const next = Math.floor(Math.random() * (frames.length - 1));
    frame = next < frame ? next : next + 1;
    showFrame(frames[frame]);
  }, 1_500);
}

export function drawOwlPose(context, sprite, expression = 'neutral', idleFrame) {
  const { image = sprite, x, y } = expression === 'neutral' && idleFrame
    ? idleFrame
    : originalFrame(owlPoses[expression] ?? owlPoses.neutral);
  const { width, height } = context.canvas;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, x, y, frameWidth, frameHeight, 0, 0, width, height);
}
