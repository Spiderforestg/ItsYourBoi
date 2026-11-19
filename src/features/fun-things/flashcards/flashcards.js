const STORAGE_KEY = 'flashcards';
const extension = Boolean(globalThis.chrome?.runtime?.id && globalThis.chrome?.storage?.sync);

const form = document.querySelector('.flashcard-form');
const titleInput = document.querySelector('#card-title');
const descriptionInput = document.querySelector('#card-description');
const submitButton = form.querySelector('.create-button');
const formStatus = document.querySelector('.form-status');
const cardCount = document.querySelector('.card-count');
const cardList = document.querySelector('.card-list');
const emptyState = document.querySelector('.empty-state');

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
  return cards.map(card => `${card.title},${card.description}`).join('\n');
}

async function loadCards() {
  try {
    if (extension) {
      const saved = await chrome.storage.sync.get(STORAGE_KEY);
      cards = parseStoredCards(saved[STORAGE_KEY]);
    } else {
      const saved = localStorage.getItem(STORAGE_KEY) || '';
      let stored;
      try {
        stored = JSON.parse(saved);
      } catch {
        stored = saved;
      }
      cards = parseStoredCards(stored);
    }
    await saveCards();
    renderCards();
  } catch (error) {
    console.error('Could not load flashcards:', error);
    formStatus.textContent = 'Could not load your cards. Try refreshing the page.';
  }
}

async function saveCards() {
  const serializedCards = serializeCards();
  if (extension) {
    await chrome.storage.sync.set({ [STORAGE_KEY]: serializedCards });
  } else {
    localStorage.setItem(STORAGE_KEY, serializedCards);
  }
}

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
    await saveCards();
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
    await saveCards();
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
    await saveCards();
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

loadCards();
