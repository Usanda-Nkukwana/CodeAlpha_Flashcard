// Shared in-memory data store.
// Logic operates on a plain JS array. sessionStorage is only a serialization
// shim so data survives page navigation in the same browser tab.
const STORAGE_KEY = "flashcardDocuments";

function loadFromSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  } catch {
    // Storage blocked/full — in-memory copy still works for this page.
  }
}

let documents = loadFromSession();

export function getDocuments() {
  return documents;
}

export function addDocument(doc) {
  documents = [...documents, doc];
  persist();
  return doc;
}

export function removeDocument(id) {
  documents = documents.filter((d) => d.id !== id);
  persist();
}

export function getCategories() {
  return [...new Set(documents.map((d) => d.category || "Uncategorized"))].sort(
    (a, b) => a.localeCompare(b)
  );
}