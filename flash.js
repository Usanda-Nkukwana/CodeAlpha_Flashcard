import { getDocuments } from "./store.js";

const categorySelect = document.querySelector("#category-select");
const documentSelect = document.querySelector("#document-select");
const emptyState = document.querySelector("#empty-state");
const studyArea = document.querySelector("#study-area");
const cardLabel = document.querySelector("#card-label");
const cardText = document.querySelector("#card-text");
const conceptLabel = document.querySelector("#concept-label");
const cardCount = document.querySelector("#card-count");
const revealButton = document.querySelector("#reveal-button");
const previousButton = document.querySelector("#previous-button");
const nextButton = document.querySelector("#next-button");

let documents = [];
let currentCards = [];
let currentCardIndex = 0;
let showingAnswer = false;

function getCategory(documentItem) {
  return documentItem.category?.trim() || "Uncategorized";
}

function renderCard() {
  const card = currentCards[currentCardIndex];
  if (!card) return;

  showingAnswer = false;
  cardLabel.textContent = "Question";
  cardText.textContent = card.question || "Question unavailable.";
  conceptLabel.textContent = card.concept || "";
  cardCount.textContent = `${currentCardIndex + 1} / ${currentCards.length}`;
  revealButton.textContent = "Reveal answer";
  previousButton.disabled = currentCardIndex === 0;
  nextButton.disabled = currentCardIndex === currentCards.length - 1;
}

function loadSelectedDocument() {
  const selectedDocument = documents.find(
    (item) => item.id === documentSelect.value
  );

  currentCards = Array.isArray(selectedDocument?.cards)
    ? selectedDocument.cards
    : [];
  currentCardIndex = 0;

  if (currentCards.length) {
    renderCard();
  }
}

function populateDocuments() {
  const category = categorySelect.value;
  documents = getDocuments().filter(
    (item) =>
      getCategory(item) === category &&
      Array.isArray(item.cards) &&
      item.cards.length
  );

  documentSelect.replaceChildren();

  documents.forEach((documentItem) => {
    const option = document.createElement("option");
    option.value = documentItem.id;
    option.textContent =
      documentItem.name || documentItem.fileName || "Untitled document";
    documentSelect.append(option);
  });

  if (documents.length) {
    documentSelect.value = documents[0].id;
    loadSelectedDocument();
  }
}

function initialize() {
  const savedDocuments = getDocuments().filter(
    (item) => Array.isArray(item.cards) && item.cards.length
  );

  const categories = [...new Set(savedDocuments.map(getCategory))].sort(
    (a, b) => a.localeCompare(b)
  );

  categorySelect.replaceChildren();

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);
  });

  const hasCards = categories.length > 0;
  emptyState.hidden = hasCards;
  studyArea.hidden = !hasCards;

  if (hasCards) {
    categorySelect.value = categories[0];
    populateDocuments();
  }
}

categorySelect.addEventListener("change", populateDocuments);
documentSelect.addEventListener("change", loadSelectedDocument);

revealButton.addEventListener("click", () => {
  const card = currentCards[currentCardIndex];
  if (!card) return;

  showingAnswer = !showingAnswer;
  cardLabel.textContent = showingAnswer ? "Answer" : "Question";
  cardText.textContent = showingAnswer
    ? card.answer || "Answer unavailable."
    : card.question || "Question unavailable.";
  revealButton.textContent = showingAnswer ? "Show question" : "Reveal answer";
});

previousButton.addEventListener("click", () => {
  if (currentCardIndex > 0) {
    currentCardIndex--;
    renderCard();
  }
});

nextButton.addEventListener("click", () => {
  if (currentCardIndex < currentCards.length - 1) {
    currentCardIndex++;
    renderCard();
  }
});

initialize();