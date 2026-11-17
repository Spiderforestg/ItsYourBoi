const form = document.getElementById('nameForm');
const nameInput = document.getElementById('petName');
const greeting = document.getElementById('greeting');
const extension = Boolean(globalThis.chrome?.runtime?.id);
const petHomeUrl = extension
    ? chrome.runtime.getURL('src/features/pet-home/pet-home.html')
    : new URL('../../pet-home/pet-home.html', window.location.href).href;
const submitButton = form.querySelector('button[type="submit"]');

// Use the same first sprite frame as Pet Home.
const pet = document.querySelector('.welcome-pet');
const sprite = new Image();
sprite.addEventListener('load', () => {
    const context = pet.getContext('2d');
    context.imageSmoothingEnabled = false;
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

    context.putImageData(frame, 0, 0);
});
sprite.src = '../../../assets/pets/placeholder-sprite-sheet.png';

async function loadSavedName() {
    try {
        const { petName } = extension
            ? await chrome.storage.sync.get('petName')
            : { petName: localStorage.getItem('petName') };

        if (petName) {
            window.location.href = petHomeUrl;
            return;
        }
    } catch (error) {
        console.error('Could not load sync storage:', error);
        greeting.textContent = 'Could not load your pet data. Check that extension sync storage is available and try again.';
    }
}

form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const enteredName = nameInput.value.trim();
    if (!enteredName) {
        nameInput.setCustomValidity('Please enter a pet name.');
        nameInput.reportValidity();
        return;
    }

    nameInput.setCustomValidity('');
    greeting.textContent = '';
    submitButton.disabled = true;
    try {
        if (extension) await chrome.storage.sync.set({ petName: enteredName });
        else localStorage.setItem('petName', enteredName);
        window.location.href = petHomeUrl;
    } catch (error) {
        console.error('Could not save the pet name to sync storage:', error);
        greeting.textContent = 'Could not save your pet name. Check your connection and try again.';
        submitButton.disabled = false;
    }
});

nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));

loadSavedName();
