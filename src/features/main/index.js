const petNameDisplay = document.getElementById('petNameDisplay');
const resetStorageButton = document.getElementById('resetStorageButton');
const resetStatus = document.getElementById('resetStatus');
const buddyLink = document.getElementById('buddyLink');
const buddyLinkLabel = document.getElementById('buddyLinkLabel');
const extension = Boolean(globalThis.chrome?.runtime?.id);

if (!extension) {
    resetStorageButton.textContent = 'Reset pet name';
    document.getElementById('resetDescription').textContent = 'Clear your pet name from this browser preview.';
}

async function loadPetName() {
    try {
        const { petName } = extension
            ? await chrome.storage.sync.get('petName')
            : { petName: localStorage.getItem('petName') };
        petNameDisplay.textContent = petName
            ? `${petName} is ready for some company.`
            : 'Your new study buddy is waiting.';
        buddyLink.href = petName
            ? 'src/features/pet-home/pet-home.html'
            : 'src/features/main/createPet/createPet.html';
        buddyLinkLabel.textContent = petName ? 'Visit your boi' : 'Meet your boi';
    } catch (error) {
        console.error('Could not load the pet name:', error);
        petNameDisplay.textContent = 'Could not load your buddy. Reopen this page to retry.';
    }
}

resetStorageButton.addEventListener('click', async () => {
    const shouldReset = window.confirm(extension
        ? 'Clear all synced extension data, including your pet name and focus progress? This cannot be undone.'
        : 'Clear your pet name from this browser preview?');
    if (!shouldReset) return;

    resetStorageButton.disabled = true;
    try {
        if (extension) await chrome.storage.sync.clear();
        else localStorage.removeItem('petName');
        await loadPetName();
        resetStatus.textContent = extension ? 'Synced data has been reset.' : 'Your pet name has been reset.';
    } catch (error) {
        console.error('Could not reset saved data:', error);
        resetStatus.textContent = 'Could not reset saved data. Please try again.';
    } finally {
        resetStorageButton.disabled = false;
    }
});

if (extension) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.petName) loadPetName();
    });
} else {
    window.addEventListener('storage', event => {
        if (event.key === 'petName' || event.key === null) loadPetName();
    });
}

loadPetName();
