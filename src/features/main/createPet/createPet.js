import { drawOwlPose, owlSpriteUrl, startOwlIdle } from '../../pet-home/pet-art.mjs';

const form = document.getElementById('nameForm');
const nameInput = document.getElementById('petName');
const greeting = document.getElementById('greeting');
const extension = Boolean(globalThis.chrome?.runtime?.id);
const petHomeUrl = extension
    ? chrome.runtime.getURL('src/features/pet-home/pet-home.html')
    : new URL('../../pet-home/pet-home.html', window.location.href).href;
const submitButton = form.querySelector('button[type="submit"]');

const pet = document.querySelector('.welcome-pet');
const sprite = new Image();
sprite.addEventListener('load', () => {
    const context = pet.getContext('2d');
    drawOwlPose(context, sprite);
    startOwlIdle(frame => drawOwlPose(context, sprite, 'neutral', frame));
});
sprite.src = owlSpriteUrl;

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
