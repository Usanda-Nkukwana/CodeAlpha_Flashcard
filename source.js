import {
  getDocuments,
  addDocument,
  removeDocument,
  getCategories,
} from "./store.js";

const form = document.querySelector("#upload-form");
const status = document.querySelector("#status");
const uploadButton = document.querySelector("#upload-button");
const documentList = document.querySelector("#document-list");
const categoryOptions = document.querySelector("#category-options");

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 25);
}

function getConcept(sentence) {
  const definition = sentence.match(
    /^(.{2,90}?)\s+(?:is|are|means|refers to|describes)\b/i
  );
  if (definition) return definition[1].replace(/^[\W\d]+|[\W\d]+$/g, "").trim();

  const words = sentence.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  return words.slice(0, Math.min(5, words.length)).join(" ");
}

function generateStudyItems(text) {
  const sentences = splitSentences(text);
  const concepts = [];
  const cards = [];

  sentences.forEach((sentence, index) => {
    const concept = getConcept(sentence);
    if (!concept) return;
    concepts.push(concept);
    cards.push({
      id: `${Date.now()}-${index}`,
      question: `What does the document explain about ${concept}?`,
      answer: sentence,
      concept,
    });
  });

  return { concepts: [...new Set(concepts)], cards };
}

async function extractText(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "txt") return file.text();
  if (extension === "pdf") {
    if (!window.pdfjsLib)
      throw new Error("The PDF reader could not load. Make sure vendor/pdf.min.js exists.");

    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "vendor/pdf.worker.min.js",
      window.location.href
    ).href;

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;

    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, index) => {
        const page = await pdf.getPage(index + 1);
        const content = await page.getTextContent();
        return content.items.map((item) => item.str).join(" ");
      })
    );
    return pages.join("\n");
  }

  if (extension === "docx") {
    if (!window.mammoth)
      throw new Error(
        "The DOCX reader could not load. Check your internet connection and try again."
      );
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    return result.value;
  }

  throw new Error("Choose a TXT, PDF, or DOCX file.");
}

function renderDocuments() {
  const documents = getDocuments();
  documentList.replaceChildren();

  categoryOptions.replaceChildren(
    ...getCategories().map((category) => {
      const option = document.createElement("option");
      option.value = category;
      return option;
    })
  );

  if (!documents.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No documents uploaded yet.";
    documentList.append(empty);
    return;
  }

  const groupedDocuments = documents.reduce((groups, documentItem) => {
    const category = documentItem.category || "Uncategorized";
    (groups[category] ||= []).push(documentItem);
    return groups;
  }, {});

  Object.entries(groupedDocuments)
    .sort(([first], [second]) => first.localeCompare(second))
    .forEach(([category, categoryDocuments]) => {
      const group = document.createElement("section");
      group.className = "category-group";

      const heading = document.createElement("h3");
      heading.textContent = category;

      const list = document.createElement("div");
      list.className = "document-list";

      categoryDocuments.forEach((documentItem) => {
        const row = document.createElement("article");
        row.className = "document";

        const title = document.createElement("h3");
        title.textContent = documentItem.name;

        const details = document.createElement("p");
        details.textContent = `${documentItem.concepts.length} concepts · ${documentItem.cards.length} cards`;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Remove";
        removeButton.setAttribute("aria-label", `Remove ${documentItem.name}`);
        removeButton.addEventListener("click", () => {
          removeDocument(documentItem.id);
          renderDocuments();
        });

        row.append(title, details, removeButton);
        list.append(row);
      });

      group.append(heading, list);
      documentList.append(group);
    });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = document.querySelector("#document-file").files[0];
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) {
    status.textContent = "Please choose a file smaller than 15 MB.";
    return;
  }

  uploadButton.disabled = true;
  status.textContent = "Reading document and generating study cards...";
  try {
    const text = (await extractText(file)).trim();
    if (!text) throw new Error("No readable text was found in this file.");

    const { concepts, cards } = generateStudyItems(text);
    if (!cards.length)
      throw new Error(
        "Text was extracted, but no complete sentences were found to turn into cards."
      );

    const requestedCategory = form.elements.category.value.trim();
    const existingCategory = getDocuments().find(
      (item) =>
        (item.category || "").toLowerCase() === requestedCategory.toLowerCase()
    )?.category;

    const savedDocument = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: form.elements.name.value.trim(),
      category: existingCategory || requestedCategory,
      fileName: file.name,
      text,
      concepts,
      cards,
    };

    addDocument(savedDocument);
    renderDocuments();
    form.reset();
    status.textContent = `Saved “${savedDocument.name}” with ${concepts.length} concepts and ${cards.length} flashcards.`;
  } catch (error) {
    status.textContent =
      error.message || "The document could not be processed.";
  } finally {
    uploadButton.disabled = false;
  }
});

renderDocuments();