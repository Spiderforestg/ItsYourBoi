const petNameDisplay = document.getElementById('petNameDisplay');
const resetStorageButton = document.getElementById('resetStorageButton');

async function loadPetName() {
    try {
        const { petName } = await chrome.storage.sync.get('petName');
        petNameDisplay.textContent = petName
            ? `Your pet's name is ${petName}.`
            : 'No pet name is saved.';
    } catch (error) {
        console.error('Could not load the pet name:', error);
        petNameDisplay.textContent = 'Could not load the pet name.';
    }
}

resetStorageButton.addEventListener('click', async () => {
    const shouldReset = window.confirm(
        'Are you sure you want to clear all synced extension storage?'
    );

    if (!shouldReset) return;

    try {
        await chrome.storage.sync.clear();
        petNameDisplay.textContent = 'Sync storage has been reset. No pet name is saved.';
    } catch (error) {
        console.error('Could not reset sync storage:', error);
        petNameDisplay.textContent = 'Could not reset sync storage.';
    }
});

loadPetName();
