let vocabulary = [];
let filteredVocabulary = [];

const STORAGE_KEY = "conlang_vocabulary";

// Canonical vocabulary fields. `locale` is optional metadata retained for the
// manager UI and for backwards compatibility with entries that already have it.
const CANONICAL_PROPERTIES = [
    "id",
    "concept",
    "category",
    "word_type",
    "semantic_group",
    "scope",
    "tags",
    "features",
    "relations"
];

const UI_PROPERTIES = ["locale"];

const FILTER_PROPERTIES = [
    "category",
    "word_type",
    "semantic_group",
    "scope",
    "locale",
    "tags",
    "features"
];

const SORT_PROPERTIES = [
    "id",
    "concept",
    "category",
    "word_type",
    "semantic_group",
    "scope",
    "locale",
    "tags",
    "features"
];

let pendingAppendEntries = null;
let editingEntryId = null;

// ============================================================
// CANONICAL DATABASE VALIDATION
// ============================================================

function assertCanonicalVocabulary(data, sourceName = "vocabulary.json") {
    if (!data || Array.isArray(data) || !Array.isArray(data.vocabulary)) {
        throw new Error(
            `${sourceName}: unsupported JSON structure. Expected { "vocabulary": [...] }.`
        );
    }

    validateEntries(data.vocabulary, sourceName);
    return data.vocabulary;
}

function validateEntries(entries, sourceName = "vocabulary") {
    if (!Array.isArray(entries)) {
        throw new Error(`${sourceName}: "vocabulary" must be an array.`);
    }

    const ids = new Set();
    const errors = [];

    entries.forEach((entry, index) => {
        const label = `${sourceName}, entry ${index + 1}`;

        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            errors.push(`${label}: entry must be an object.`);
            return;
        }

        for (const field of CANONICAL_PROPERTIES) {
            if (!(field in entry)) {
                errors.push(`${label}: missing "${field}".`);
            }
        }

        if (typeof entry.id !== "string" || !entry.id.trim()) {
            errors.push(`${label}: "id" must be a non-empty string.`);
        } else if (ids.has(entry.id)) {
            errors.push(`${label}: duplicate ID "${entry.id}".`);
        } else {
            ids.add(entry.id);
        }

        if (typeof entry.concept !== "string" || !entry.concept.trim()) {
            errors.push(`${label}: "concept" must be a non-empty string.`);
        }

        if (typeof entry.category !== "string" || !entry.category.trim()) {
            errors.push(`${label}: "category" must be a non-empty string.`);
        }

        if (typeof entry.word_type !== "string" || !entry.word_type.trim()) {
            errors.push(`${label}: "word_type" must be a non-empty string.`);
        }

        if (
            entry.word_type === "verb" &&
            !entry.concept.trim().toLowerCase().startsWith("to ")
        ) {
            errors.push(`${label}: verb concept must begin with "to ".`);
        }

        if (typeof entry.semantic_group !== "string" || !entry.semantic_group.trim()) {
            errors.push(`${label}: "semantic_group" must be a non-empty string.`);
        }

        if (entry.scope !== "universal" && entry.scope !== "domain") {
            errors.push(`${label}: "scope" must be "universal" or "domain".`);
        }

        if (!Array.isArray(entry.tags)) {
            errors.push(`${label}: "tags" must be an array.`);
        }

        if (!Array.isArray(entry.features)) {
            errors.push(`${label}: "features" must be an array.`);
        }

        if (
            !entry.relations ||
            typeof entry.relations !== "object" ||
            Array.isArray(entry.relations)
        ) {
            errors.push(`${label}: "relations" must be an object.`);
        }

        if ("locale" in entry && entry.locale !== undefined && entry.locale !== null && typeof entry.locale !== "string") {
            errors.push(`${label}: optional "locale" must be a string when present.`);
        }
    });

    if (errors.length) {
        throw new Error(errors.join("\n"));
    }
}

function validateRelationTargets(entries, sourceName = "vocabulary") {
    const ids = new Set(entries.map(entry => entry.id));
    const errors = [];

    entries.forEach(entry => {
        for (const [relation, rawValue] of Object.entries(entry.relations || {})) {
            const values = Array.isArray(rawValue) ? rawValue : [rawValue];

            if (relation === "grammatical_roles") continue;

            for (const target of values) {
                if (typeof target !== "string" || !ids.has(target)) {
                    errors.push(
                        `${sourceName}: ${entry.id}.${relation} references unknown ID "${target}".`
                    );
                }

                if (target === entry.id) {
                    errors.push(
                        `${sourceName}: ${entry.id}.${relation} references itself.`
                    );
                }
            }
        }
    });

    if (errors.length) {
        throw new Error(errors.join("\n"));
    }
}

function cloneEntry(entry) {
    const cloned = {
        id: entry.id,
        concept: entry.concept,
        category: entry.category,
        word_type: entry.word_type,
        semantic_group: entry.semantic_group,
        scope: entry.scope,
        tags: [...entry.tags],
        features: [...entry.features],
        relations: JSON.parse(JSON.stringify(entry.relations))
    };

    // Preserve locale when it exists, but do not add an empty locale property
    // to canonical entries that do not define one.
    if (Object.prototype.hasOwnProperty.call(entry, "locale")) {
        cloned.locale = entry.locale;
    }

    return cloned;
}

function serializeVocabulary() {
    return {
        vocabulary: vocabulary.map(cloneEntry)
    };
}

// ============================================================
// LOAD / SAVE
// ============================================================

async function loadVocabularyFromJSON() {
    const response = await fetch(`vocabulary.json?cacheBust=${Date.now()}`);

    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    const entries = assertCanonicalVocabulary(data, "vocabulary.json");
    validateRelationTargets(entries, "vocabulary.json");

    vocabulary = entries.map(cloneEntry);
}

async function loadVocabulary() {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            const entries = assertCanonicalVocabulary(parsed, "localStorage");
            validateRelationTargets(entries, "localStorage");
            vocabulary = entries.map(cloneEntry);
            setDatabaseStatus("Local working copy");
            refreshInterface();
            return;
        } catch (error) {
            console.warn("Ignoring incompatible local vocabulary:", error);
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    try {
        await loadVocabularyFromJSON();
        saveVocabulary();
        setDatabaseStatus("Loaded from vocabulary.json");
        refreshInterface();
    } catch (error) {
        console.error(error);
        showError("Unable to load vocabulary.json:\n\n" + error.message);
    }
}

function saveVocabulary() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(serializeVocabulary(), null, 2)
    );
}

async function reloadVocabularyFromJSON() {
    if (!confirm(
        "Reload vocabulary.json from the server?\n\n" +
        "All local changes stored in this browser will be discarded."
    )) {
        return;
    }

    try {
        localStorage.removeItem(STORAGE_KEY);
        await loadVocabularyFromJSON();
        saveVocabulary();
        setDatabaseStatus("Reloaded from vocabulary.json");
        refreshInterface();
    } catch (error) {
        alert("Unable to reload vocabulary.json:\n\n" + error.message);
    }
}

function resetLocalVocabulary() {
    if (!confirm(
        "Reset local changes and reload vocabulary.json?\n\n" +
        "All changes stored in this browser will be discarded."
    )) {
        return;
    }

    localStorage.removeItem(STORAGE_KEY);
    loadVocabulary();
}

// ============================================================
// APPEND JSON
// ============================================================

function openAppendPicker() {
    document.getElementById("appendFileInput").click();
}

async function handleAppendFile(event) {
    const file = event.target.files[0];
    event.target.value = "";

    if (!file) return;

    try {
        const parsed = JSON.parse(await file.text());
        const imported = assertCanonicalVocabulary(parsed, file.name).map(cloneEntry);

        const existingIds = new Set(vocabulary.map(entry => entry.id));
        const duplicateIds = imported
            .filter(entry => existingIds.has(entry.id))
            .map(entry => entry.id);
        const newEntries = imported.filter(entry => !existingIds.has(entry.id));
        const combined = [...vocabulary, ...newEntries];

        validateRelationTargets(combined, file.name);

        pendingAppendEntries = {
            fileName: file.name,
            imported,
            newEntries,
            duplicateIds: [...new Set(duplicateIds)]
        };

        showAppendModal();
    } catch (error) {
        alert("The selected file could not be appended.\n\n" + error.message);
    }
}

function showAppendModal() {
    const modal = document.getElementById("appendModal");
    const summary = document.getElementById("appendSummary");
    const errors = document.getElementById("appendErrors");
    const confirmButton = document.getElementById("confirmAppend");

    const { fileName, imported, newEntries, duplicateIds } = pendingAppendEntries;

    document.getElementById("appendFilename").textContent = `File: ${fileName}`;
    summary.textContent =
        `Entries found: ${imported.length}\n` +
        `New entries: ${newEntries.length}\n` +
        `Existing IDs: ${duplicateIds.length}`;

    errors.hidden = duplicateIds.length === 0;
    errors.textContent = duplicateIds.length
        ? "The following IDs already exist and will not be appended:\n\n" + duplicateIds.join("\n")
        : "";

    confirmButton.disabled = newEntries.length === 0;
    modal.hidden = false;
}

function confirmAppend() {
    if (!pendingAppendEntries) return;

    const candidate = [
        ...vocabulary,
        ...pendingAppendEntries.newEntries.map(cloneEntry)
    ];

    validateEntries(candidate, "Appended vocabulary");
    validateRelationTargets(candidate, "Appended vocabulary");

    vocabulary = candidate;
    saveVocabulary();
    setDatabaseStatus(`${pendingAppendEntries.newEntries.length} entries appended locally`);
    pendingAppendEntries = null;
    closeModal("appendModal");
    refreshInterface();
}

// ============================================================
// EXPORT
// ============================================================

function exportVocabulary() {
    const json = JSON.stringify(serializeVocabulary(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "vocabulary.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

// ============================================================
// FILTERS / SORTING
// ============================================================

function getAllAttributes() {
    return [...CANONICAL_PROPERTIES, ...UI_PROPERTIES];
}

function valueToArray(value) {
    if (Array.isArray(value)) return value.map(String);
    if (value !== undefined && value !== null && typeof value !== "object") {
        return [String(value)];
    }
    return [];
}

function getAttributeValue(entry, attribute) {
    const value = entry[attribute];

    if (value === undefined || value === null) return "";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function populateFilters() {
    const container = document.getElementById("attributeFilters");
    container.innerHTML = "";

    FILTER_PROPERTIES.forEach(attribute => {
        const values = new Set();

        vocabulary.forEach(entry => {
            valueToArray(entry[attribute]).forEach(value => {
                if (value !== "") values.add(value);
            });
        });

        const wrapper = document.createElement("div");
        wrapper.className = "filter-group";

        const label = document.createElement("label");
        label.textContent = attribute;
        label.htmlFor = `filter-${attribute}`;

        const select = document.createElement("select");
        select.id = `filter-${attribute}`;
        select.dataset.attribute = attribute;

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = `All ${attribute}`;
        select.appendChild(allOption);

        [...values].sort((a, b) => a.localeCompare(b)).forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

        select.addEventListener("change", applyFiltersAndSort);
        wrapper.append(label, select);
        container.appendChild(wrapper);
    });
}

function populateSortOptions() {
    const select = document.getElementById("sortAttribute");
    select.innerHTML = "";

    SORT_PROPERTIES.forEach(attribute => {
        const option = document.createElement("option");
        option.value = attribute;
        option.textContent = attribute;
        select.appendChild(option);
    });
}

function matchesSearch(entry, query) {
    if (!query) return true;

    return [...CANONICAL_PROPERTIES, ...UI_PROPERTIES].some(attribute => {
        return getAttributeValue(entry, attribute).toLowerCase().includes(query);
    });
}

function applyFiltersAndSort() {
    const query = document.getElementById("searchVocabulary").value.trim().toLowerCase();

    filteredVocabulary = vocabulary.filter(entry => {
        if (!matchesSearch(entry, query)) return false;

        return FILTER_PROPERTIES.every(attribute => {
            const select = document.getElementById(`filter-${attribute}`);
            if (!select || !select.value) return true;
            return valueToArray(entry[attribute]).includes(select.value);
        });
    });

    const attribute = document.getElementById("sortAttribute").value || "id";
    const direction = document.getElementById("sortDirection").value || "asc";
    const factor = direction === "desc" ? -1 : 1;

    filteredVocabulary.sort((a, b) => {
        const av = getAttributeValue(a, attribute).toLowerCase();
        const bv = getAttributeValue(b, attribute).toLowerCase();
        return av.localeCompare(bv, undefined, { numeric: true }) * factor;
    });

    renderVocabulary();
}

// ============================================================
// TABLE RENDERING
// ============================================================

function renderVocabulary() {
    const body = document.getElementById("vocabularyBody");
    body.innerHTML = "";

    filteredVocabulary.forEach((entry, index) => {
        const row = document.createElement("tr");

        const values = [
            index + 1,
            entry.id,
            entry.concept,
            entry.category,
            entry.word_type,
            entry.semantic_group,
            entry.scope,
            entry.locale || "",
            entry.tags.join(", "),
            entry.features.join(", ")
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actions = document.createElement("td");
        actions.className = "row-actions";

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => openEditModal(entry.id));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteEntry(entry.id));

        actions.append(editButton, deleteButton);
        row.appendChild(actions);
        body.appendChild(row);
    });

    document.getElementById("totalCount").textContent = vocabulary.length;
    document.getElementById("visibleCount").textContent = filteredVocabulary.length;
}

function refreshInterface() {
    populateFilters();
    populateSortOptions();
    applyFiltersAndSort();
}

// ============================================================
// ADD / EDIT / DELETE
// ============================================================

function openAddModal() {
    editingEntryId = null;
    document.getElementById("entryModalTitle").textContent = "Add vocabulary entry";
    document.getElementById("entryForm").reset();
    document.getElementById("entryRelations").value = "{}";
    document.getElementById("entryFormError").hidden = true;
    document.getElementById("entryFormError").textContent = "";
    document.getElementById("entryModal").hidden = false;
}

function openEditModal(id) {
    const entry = vocabulary.find(item => item.id === id);
    if (!entry) return;

    editingEntryId = id;
    document.getElementById("entryModalTitle").textContent = "Edit vocabulary entry";
    document.getElementById("entryId").value = entry.id;
    document.getElementById("entryConcept").value = entry.concept;
    document.getElementById("entryCategory").value = entry.category;
    document.getElementById("entryWordType").value = entry.word_type;
    document.getElementById("entrySemanticGroup").value = entry.semantic_group;
    document.getElementById("entryScope").value = entry.scope;
    document.getElementById("entryLocale").value = entry.locale || "";
    document.getElementById("entryTags").value = entry.tags.join(", ");
    document.getElementById("entryFeatures").value = entry.features.join(", ");
    document.getElementById("entryRelations").value = JSON.stringify(entry.relations, null, 2);
    document.getElementById("entryFormError").hidden = true;
    document.getElementById("entryFormError").textContent = "";
    document.getElementById("entryModal").hidden = false;
}

function splitList(value) {
    return value
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
}

function readEntryForm() {
    let relations;

    try {
        relations = JSON.parse(document.getElementById("entryRelations").value || "{}");
    } catch (error) {
        throw new Error(`Relations are not valid JSON: ${error.message}`);
    }

    const entry = {
        id: document.getElementById("entryId").value.trim(),
        concept: document.getElementById("entryConcept").value.trim(),
        category: document.getElementById("entryCategory").value.trim(),
        word_type: document.getElementById("entryWordType").value.trim(),
        semantic_group: document.getElementById("entrySemanticGroup").value.trim(),
        scope: document.getElementById("entryScope").value.trim(),
        tags: splitList(document.getElementById("entryTags").value),
        features: splitList(document.getElementById("entryFeatures").value),
        relations
    };

    const locale = document.getElementById("entryLocale").value.trim();
    if (locale) entry.locale = locale;

    return entry;
}

function saveEntryFromForm(event) {
    event.preventDefault();

    const errorBox = document.getElementById("entryFormError");
    errorBox.hidden = true;
    errorBox.textContent = "";

    try {
        const entry = readEntryForm();
        const candidate = editingEntryId
            ? vocabulary.map(item => item.id === editingEntryId ? entry : item)
            : [...vocabulary, entry];

        validateEntries(candidate, "Entry form");
        validateRelationTargets(candidate, "Entry form");

        if (editingEntryId && entry.id !== editingEntryId) {
            for (const item of candidate) {
                for (const [relation, rawValue] of Object.entries(item.relations || {})) {
                    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
                    if (values.includes(editingEntryId)) {
                        throw new Error(
                            `Cannot change ID "${editingEntryId}" because it is referenced by ${item.id}.${relation}.`
                        );
                    }
                }
            }
        }

        vocabulary = candidate.map(cloneEntry);
        saveVocabulary();
        setDatabaseStatus("Local working copy");
        closeModal("entryModal");
        refreshInterface();
    } catch (error) {
        errorBox.hidden = false;
        errorBox.textContent = error.message;
    }
}

function deleteEntry(id) {
    const entry = vocabulary.find(item => item.id === id);
    if (!entry) return;

    const references = [];

    vocabulary.forEach(item => {
        for (const [relation, rawValue] of Object.entries(item.relations || {})) {
            const values = Array.isArray(rawValue) ? rawValue : [rawValue];
            if (values.includes(id)) {
                references.push(`${item.id}.${relation}`);
            }
        }
    });

    if (references.length) {
        alert(
            `Cannot delete "${id}" because it is referenced by:\n\n` +
            references.join("\n")
        );
        return;
    }

    if (!confirm(`Delete vocabulary entry "${entry.concept}"?`)) return;

    vocabulary = vocabulary.filter(item => item.id !== id);
    saveVocabulary();
    setDatabaseStatus("Local working copy");
    refreshInterface();
}

// ============================================================
// UI HELPERS / EVENTS
// ============================================================

function setDatabaseStatus(text) {
    const element = document.getElementById("databaseStatus");
    if (element) element.textContent = text;
}

function showError(message) {
    const element = document.getElementById("errorMessage");
    element.textContent = message;
    element.hidden = false;
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;
}

function initializeVocabularyManager() {
    document.getElementById("searchVocabulary").addEventListener("input", applyFiltersAndSort);
    document.getElementById("sortAttribute").addEventListener("change", applyFiltersAndSort);
    document.getElementById("sortDirection").addEventListener("change", applyFiltersAndSort);

    document.getElementById("reloadVocabulary").addEventListener("click", reloadVocabularyFromJSON);
    document.getElementById("appendVocabulary").addEventListener("click", openAppendPicker);
    document.getElementById("addVocabulary").addEventListener("click", openAddModal);
    document.getElementById("exportVocabulary").addEventListener("click", exportVocabulary);
    document.getElementById("resetVocabulary").addEventListener("click", resetLocalVocabulary);
    document.getElementById("appendFileInput").addEventListener("change", handleAppendFile);
    document.getElementById("confirmAppend").addEventListener("click", confirmAppend);
    document.getElementById("cancelAppend").addEventListener("click", () => closeModal("appendModal"));
    document.getElementById("entryForm").addEventListener("submit", saveEntryFromForm);

    document.querySelectorAll("[data-close-modal]").forEach(button => {
        button.addEventListener("click", () => closeModal(button.dataset.closeModal));
    });

    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeModal(modal.id);
        });
    });

    loadVocabulary();
}

document.addEventListener("DOMContentLoaded", initializeVocabularyManager);
