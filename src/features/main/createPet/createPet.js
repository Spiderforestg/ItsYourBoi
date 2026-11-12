const form = document.getElementById('nameForm');
const nameInput = document.getElementById('petName');
const greeting = document.getElementById('greeting');

async function loadSavedName() {
    try {
        const { petName } = await chrome.storage.sync.get('petName');
        if (petName) {
            nameInput.value = petName;
            greeting.textContent = `Welcome back, ${petName}!`;
            return;
        }

        const legacyName = localStorage.getItem('petName');
        if (legacyName) {
            await chrome.storage.sync.set({ petName: legacyName });
            localStorage.removeItem('petName');
            nameInput.value = legacyName;
            greeting.textContent = `Welcome back, ${legacyName}!`;
        }
    } catch (error) {
        console.error('Could not load the saved pet name:', error);
        greeting.textContent = 'Could not load your pet name. Check that extension sync storage is available and try again.';
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
        localStorage.removeItem('petName');
        greeting.textContent = `Saved! Hello, ${enteredName}.`;
    } catch (error) {
        console.error('Could not save the pet name to sync storage:', error);
        greeting.textContent = 'Could not save your pet name. Check your connection and try again.';
    }
});

nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));

loadSavedName();