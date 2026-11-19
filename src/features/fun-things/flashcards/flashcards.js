const STORAGE_KEY = 'flashcards';
const SETS_STORAGE_KEY = 'flashcardSets';
const extension = Boolean(globalThis.chrome?.runtime?.id && globalThis.chrome?.storage?.sync);

const setWindow = document.querySelector('.set-window');
const workspace = document.querySelector('.flashcard-workspace');
const setList = document.querySelector('.set-list');
const setForm = document.querySelector('.set-form');
const setNameInput = document.querySelector('#set-name');
const setStatus = document.querySelector('.set-status');
const activeSetName = document.querySelector('.active-set-name');
const changeSetButton = document.querySelector('.back-to-sets');
const importButton = document.querySelector('[data-action="import"]');
const exportButton = document.querySelector('[data-action="export"]');
const transferDialog = document.querySelector('.transfer-dialog');
const importForm = document.querySelector('.import-form');
const importText = document.querySelector('#import-text');
const importStatus = document.querySelector('.import-status');
const cancelImportButton = document.querySelector('.cancel-import-button');
const exportDialog = document.querySelector('.export-dialog');
const exportText = document.querySelector('.export-text');
const closeExportButton = document.querySelector('.close-export-button');
const copyExportButton = document.querySelector('.copy-export-button');
const form = document.querySelector('.flashcard-form');
const titleInput = document.querySelector('#card-title');
const descriptionInput = document.querySelector('#card-description');
const submitButton = form.querySelector('.create-button');
const formStatus = document.querySelector('.form-status');
const cardCount = document.querySelector('.card-count');
const cardList = document.querySelector('.card-list');
const emptyState = document.querySelector('.empty-state');

let sets = [];
let currentSet = null;
let cards = [];

function createCard(title, description) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    title,
    description,
  };
}

function parseStoredCards(stored) {
  if (Array.isArray(stored)) {
    return stored
      .filter(card => card && card.title && card.description)
      .map(card => createCard(card.title, card.description));
  }

  if (typeof stored !== 'string' || !stored.trim()) return [];

  return stored.split(/\r?\n/).flatMap(line => {
    const separator = line.indexOf(',');
    if (separator === -1) return [];
    const title = line.slice(0, separator).trim();
    const description = line.slice(separator + 1).trim();
    return title && description ? [createCard(title, description)] : [];
  });
}

function serializeCards() {
  return cards.map(card => {
    const title = card.title.replace(/\r?\n/g, ' ');
    const description = card.description.replace(/\r?\n/g, ' ');
    return `${title},${description}`;
  }).join('\n');
}

function parseStoredSets(stored) {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(set => set && set.id && set.name)
    .map(set => ({
      id: set.id,
      name: set.name,
      cards: parseStoredCards(set.cards),
    }));
}

function serializeSets() {
  return sets.map(set => ({
    id: set.id,
    name: set.name,
    cards: set.cards.map(card => {
      const title = card.title.replace(/\r?\n/g, ' ');
      const description = card.description.replace(/\r?\n/g, ' ');
      return `${title},${description}`;
    }).join('\n'),
  }));
}

async function loadSets() {
  try {
    let storedSets;
    if (extension) {
      const saved = await chrome.storage.sync.get([SETS_STORAGE_KEY, STORAGE_KEY]);
      storedSets = saved[SETS_STORAGE_KEY];
      if ((!storedSets || (Array.isArray(storedSets) && storedSets.length === 0)) && saved[STORAGE_KEY]) {
        sets = [{ id: 'my-flashcards', name: 'My Flashcards', cards: parseStoredCards(saved[STORAGE_KEY]) }];
      }
    } else {
      storedSets = localStorage.getItem(SETS_STORAGE_KEY) || '';
      let parsedSets;
      try {
        parsedSets = JSON.parse(storedSets);
      } catch {
        parsedSets = null;
      }
      if (parsedSets) storedSets = parsedSets;
      else {
        const legacy = localStorage.getItem(STORAGE_KEY) || '';
        let storedCards;
        try { storedCards = JSON.parse(legacy); } catch { storedCards = legacy; }
        if (legacy) sets = [{ id: 'my-flashcards', name: 'My Flashcards', cards: parseStoredCards(storedCards) }];
      }
    }
    if (!sets.length) sets = parseStoredSets(storedSets);
    await saveSets();
    renderSets();
  } catch (error) {
    console.error('Could not load flashcard sets:', error);
    setStatus.textContent = 'Could not load your sets. Try refreshing the page.';
  }
}

async function saveSets() {
  if (extension) {
    await chrome.storage.sync.set({ [SETS_STORAGE_KEY]: serializeSets() });
  } else {
    localStorage.setItem(SETS_STORAGE_KEY, JSON.stringify(serializeSets()));
  }
}

function renderSets() {
  setList.replaceChildren();
  for (const set of sets) {
    const openButton = document.createElement('button');
    openButton.className = 'set-option';
    openButton.type = 'button';
    const name = document.createElement('span');
    name.textContent = set.name;
    const count = document.createElement('small');
    count.textContent = `${set.cards.length} ${set.cards.length === 1 ? 'CARD' : 'CARDS'}`;
    openButton.append(name, count);
    openButton.addEventListener('click', () => openSet(set.id));
    setList.append(openButton);
  }
}

function openSet(id) {
  currentSet = sets.find(set => set.id === id);
  if (!currentSet) return;
  cards = currentSet.cards;
  activeSetName.textContent = currentSet.name;
  setWindow.hidden = true;
  workspace.hidden = false;
  renderCards();
}

setForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = setNameInput.value.trim();
  if (!name) return;
  const newSet = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, name, cards: [] };
  sets.push(newSet);
  try {
    await saveSets();
    setForm.reset();
    setStatus.textContent = '';
    renderSets();
    openSet(newSet.id);
  } catch (error) {
    sets.pop();
    console.error('Could not save flashcard set:', error);
    setStatus.textContent = 'Could not save your set. Please try again.';
  }
});

changeSetButton.addEventListener('click', () => {
  currentSet.cards = cards;
  renderSets();
  workspace.hidden = true;
  setWindow.hidden = false;
});

importButton.addEventListener('click', () => {
  importText.value = '';
  importStatus.textContent = '';
  transferDialog.showModal();
  importText.focus();
});

cancelImportButton.addEventListener('click', () => transferDialog.close());

importForm.addEventListener('submit', async event => {
  event.preventDefault();
  const importedCards = parseStoredCards(importText.value);
  if (!importedCards.length) {
    importStatus.textContent = 'Paste at least one card in the requested format.';
    return;
  }

  cards.push(...importedCards);
  try {
    await saveSets();
    renderCards();
    transferDialog.close();
  } catch (error) {
    cards.splice(-importedCards.length, importedCards.length);
    console.error('Could not import flashcards:', error);
    importStatus.textContent = 'Could not import your cards. Please try again.';
  }
});

exportButton.addEventListener('click', () => {
  if (!currentSet) return;
  exportText.value = serializeCards();
  exportDialog.showModal();
  exportText.focus();
});

closeExportButton.addEventListener('click', () => exportDialog.close());

copyExportButton.addEventListener('click', async () => {
  exportText.focus();
  exportText.select();
  exportText.setSelectionRange(0, exportText.value.length);
  try {
    await navigator.clipboard.writeText(exportText.value);
  } catch {
    document.execCommand('copy');
  }
  copyExportButton.textContent = 'COPIED';
  setTimeout(() => { copyExportButton.textContent = 'COPY'; }, 1200);
});

function renderCards() {
  cardList.replaceChildren();
  emptyState.hidden = cards.length > 0;
  cardCount.textContent = `${cards.length} ${cards.length === 1 ? 'CARD' : 'CARDS'}`;

  for (const card of cards) {
    const cardElement = document.createElement('article');
    cardElement.className = 'flashcard';
    cardElement.dataset.cardId = card.id;

    const actions = document.createElement('div');
    actions.className = 'flashcard-actions';

    const editButton = document.createElement('button');
    editButton.className = 'flashcard-action';
    editButton.type = 'button';
    editButton.textContent = 'EDIT';
    editButton.addEventListener('click', () => editCard(card.id));

    const deleteButton = document.createElement('button');
    deleteButton.className = 'flashcard-action delete-action';
    deleteButton.type = 'button';
    deleteButton.textContent = 'DELETE';
    deleteButton.addEventListener('click', () => deleteCard(card.id));

    actions.append(editButton, deleteButton);

    const cardView = document.createElement('div');
    cardView.className = 'flashcard-view';
    const title = document.createElement('h3');
    title.textContent = card.title;
    const description = document.createElement('p');
    description.textContent = card.description;
    cardView.append(title, description);

    const editor = document.createElement('div');
    editor.className = 'flashcard-editor';
    editor.hidden = true;

    const titleInput = document.createElement('input');
    titleInput.className = 'inline-title-input';
    titleInput.type = 'text';
    titleInput.value = card.title;
    titleInput.setAttribute('aria-label', 'Flashcard title');
    titleInput.required = true;

    const descriptionInput = document.createElement('textarea');
    descriptionInput.className = 'inline-description-input';
    descriptionInput.rows = 4;
    descriptionInput.value = card.description;
    descriptionInput.setAttribute('aria-label', 'Flashcard description');
    descriptionInput.required = true;

    const editorActions = document.createElement('div');
    editorActions.className = 'editor-actions';
    const saveButton = document.createElement('button');
    saveButton.className = 'editor-button save-card-button';
    saveButton.type = 'button';
    saveButton.textContent = 'SAVE';
    saveButton.addEventListener('click', () => saveEditedCard(
      card.id, titleInput, descriptionInput, saveButton
    ));
    const cancelButton = document.createElement('button');
    cancelButton.className = 'editor-button cancel-card-button';
    cancelButton.type = 'button';
    cancelButton.textContent = 'CANCEL';
    cancelButton.addEventListener('click', () => {
      titleInput.value = card.title;
      descriptionInput.value = card.description;
      editor.hidden = true;
      cardView.hidden = false;
    });
    editorActions.append(saveButton, cancelButton);
    editor.append(titleInput, descriptionInput, editorActions);

    cardElement.append(actions, cardView, editor);
    cardList.append(cardElement);
  }
}

function editCard(id) {
  const card = cards.find(item => item.id === id);
  if (!card) return;

  const cardElement = [...cardList.children].find(element => element.dataset.cardId === id);
  if (!cardElement) return;
  cardElement.querySelector('.flashcard-view').hidden = true;
  const editor = cardElement.querySelector('.flashcard-editor');
  editor.hidden = false;
  editor.querySelector('.inline-title-input').focus();
}

async function saveEditedCard(id, titleInput, descriptionInput, saveButton) {
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  if (!title || !description) {
    titleInput.reportValidity();
    descriptionInput.reportValidity();
    return;
  }

  const card = cards.find(item => item.id === id);
  if (!card) return;
  const originalCard = { ...card };
  card.title = title;
  card.description = description;
  saveButton.disabled = true;

  try {
    await saveSets();
    renderCards();
  } catch (error) {
    Object.assign(card, originalCard);
    console.error('Could not save edited flashcard:', error);
    formStatus.textContent = 'Could not save your card. Please try again.';
    saveButton.disabled = false;
  }
}

async function deleteCard(id) {
  const cardIndex = cards.findIndex(item => item.id === id);
  if (cardIndex === -1 || !window.confirm('Delete this flashcard?')) return;

  const deletedCard = cards[cardIndex];
  cards.splice(cardIndex, 1);
  try {
    await saveSets();
    renderCards();
  } catch (error) {
    cards.splice(cardIndex, 0, deletedCard);
    console.error('Could not delete flashcard:', error);
    formStatus.textContent = 'Could not delete your card. Please try again.';
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  if (!title || !description) return;

  submitButton.disabled = true;
  formStatus.textContent = '';
  const originalCards = cards.map(card => ({ ...card }));
  cards.unshift(createCard(title, description));

  try {
    await saveSets();
    renderCards();
    form.reset();
    titleInput.focus();
  } catch (error) {
    cards = originalCards;
    console.error('Could not save flashcard:', error);
    formStatus.textContent = 'Could not save your card. Please try again.';
  } finally {
    submitButton.disabled = false;
  }
});

loadSets();
