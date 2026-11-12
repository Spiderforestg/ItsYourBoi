const form = document.getElementById('nameForm');
const nameInput = document.getElementById('petName');
const greeting = document.getElementById('greeting');
const indexUrl = chrome.runtime.getURL('index.html');

async function loadSavedName() {
    try {
        const syncedStorage = await chrome.storage.sync.get(null);
        const { petName } = syncedStorage;

        if (petName) {
            window.location.href = indexUrl;
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
    try {
        await chrome.storage.sync.set({ petName: enteredName });
        window.location.href = indexUrl;
    } catch (error) {
        console.error('Could not save the pet name to sync storage:', error);
        greeting.textContent = 'Could not save your pet name. Check your connection and try again.';
    }
});

nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));

loadSavedName();
