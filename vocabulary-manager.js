let vocabulary = [];
let filteredVocabulary = [];
let pendingAppendEntries = null;
let editingId = null;

const STORAGE_KEY = "conlang_vocabulary";

const ARRAY_FIELDS = [
    "region",
    "culture",
    "biome",
    "temporal_setting",
    "tags",
    "features"
];

const REQUIRED_FIELDS = [
    "id",
    "concept",
    "category",
    "word_type",
    "semantic_group",
    "scope",
    ...ARRAY_FIELDS,
    "relations"
];

const FILTER_FIELDS = [
    "category",
    "word_type",
    "semantic_group",
    "scope",
    "region",
    "culture",
    "biome",
    "temporal_setting",
    "tags",
    "features"
];

const SORT_FIELDS = [
    "id",
    "concept",
    "category",
    "word_type",
    "semantic_group",
    "scope",
    "region",
    "culture",
    "biome",
    "temporal_setting",
    "tags",
    "features"
];

function assertCanonicalVocabulary(data, sourceName = "vocabulary.json") {
    if (!data || Array.isArray(data) || !Array.isArray(data.vocabulary)) {
        throw new Error(`${sourceName}: unsupported JSON structure. Expected { "vocabulary": [...] }.`);
    }
    validateEntries(data.vocabulary, sourceName);
    return data.vocabulary;
}

function validateEntries(entries, sourceName = "vocabulary") {
    if (!Array.isArray(entries)) throw new Error(`${sourceName}: "vocabulary" must be an array.`);

    const ids = new Set();
    const errors = [];

    entries.forEach((entry, index) => {
        const label = `${sourceName}, entry ${index + 1}`;
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            errors.push(`${label}: entry must be an object.`);
            return;
        }

        REQUIRED_FIELDS.forEach(field => {
            if (!(field in entry)) errors.push(`${label}: missing "${field}".`);
        });

        if (typeof entry.id !== "string" || !entry.id.trim()) {
            errors.push(`${label}: "id" must be a non-empty string.`);
        } else if (ids.has(entry.id)) {
            errors.push(`${label}: duplicate ID "${entry.id}".`);
        } else {
            ids.add(entry.id);
        }

        ["concept", "category", "word_type", "semantic_group"].forEach(field => {
            if (typeof entry[field] !== "string" || !entry[field].trim()) {
                errors.push(`${label}: "${field}" must be a non-empty string.`);
            }
        });

        if (entry.word_type === "verb" && typeof entry.concept === "string" && !entry.concept.trim().toLowerCase().startsWith("to ")) {
            errors.push(`${label}: verb concept must begin with "to ".`);
        }

        if (entry.scope !== "universal" && entry.scope !== "domain") {
            errors.push(`${label}: "scope" must be "universal" or "domain".`);
        }

        ARRAY_FIELDS.forEach(field => {
            if (!Array.isArray(entry[field])) errors.push(`${label}: "${field}" must be an array.`);
        });

        if (!entry.relations || typeof entry.relations !== "object" || Array.isArray(entry.relations)) {
            errors.push(`${label}: "relations" must be an object.`);
        }

        if ("locale" in entry || "type" in entry) {
            errors.push(`${label}: legacy field detected (locale/type). Use region/culture/biome/temporal_setting instead.`);
        }
    });

    if (errors.length) throw new Error(errors.join("\n"));
}

function validateRelationTargets(entries, sourceName = "vocabulary") {
    const ids = new Set(entries.map(entry => entry.id));
    const errors = [];

    entries.forEach(entry => {
        Object.entries(entry.relations || {}).forEach(([relation, rawValue]) => {
            if (relation === "grammatical_roles") return;
            const values = Array.isArray(rawValue) ? rawValue : [rawValue];
            values.forEach(target => {
                if (typeof target !== "string" || !ids.has(target)) {
                    errors.push(`${sourceName}: ${entry.id}.${relation} references unknown ID "${target}".`);
                } else if (target === entry.id) {
                    errors.push(`${sourceName}: ${entry.id}.${relation} references itself.`);
                }
            });
        });
    });

    if (errors.length) throw new Error(errors.join("\n"));
}

function cloneEntry(entry) {
    return {
        id: entry.id,
        concept: entry.concept,
        category: entry.category,
        word_type: entry.word_type,
        semantic_group: entry.semantic_group,
        scope: entry.scope,
        region: [...entry.region],
        culture: [...entry.culture],
        biome: [...entry.biome],
        temporal_setting: [...entry.temporal_setting],
        tags: [...entry.tags],
        features: [...entry.features],
        relations: JSON.parse(JSON.stringify(entry.relations))
    };
}

function serializeVocabulary() {
    return { vocabulary: vocabulary.map(cloneEntry) };
}

async function loadVocabularyFromJSON() {
    const response = await fetch(`vocabulary.json?cacheBust=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeVocabulary(), null, 2));
}

async function reloadVocabularyFromJSON() {
    if (!confirm("Reload vocabulary.json from the server?\n\nAll local changes stored in this browser will be discarded.")) return;
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

function resetVocabulary() {
    if (!confirm("Clear local changes and reload vocabulary.json?")) return;
    localStorage.removeItem(STORAGE_KEY);
    loadVocabulary();
}

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
        const duplicateIds = [...new Set(imported.filter(entry => existingIds.has(entry.id)).map(entry => entry.id))];
        const newEntries = imported.filter(entry => !existingIds.has(entry.id));
        validateRelationTargets([...vocabulary, ...newEntries], file.name);
        pendingAppendEntries = { fileName: file.name, imported, newEntries, duplicateIds };
        showAppendModal();
    } catch (error) {
        alert("The selected file could not be appended.\n\n" + error.message);
    }
}

function showAppendModal() {
    const { fileName, imported, newEntries, duplicateIds } = pendingAppendEntries;
    document.getElementById("appendFilename").textContent = `File: ${fileName}`;
    document.getElementById("appendSummary").textContent = `Entries found: ${imported.length}\nNew entries: ${newEntries.length}\nExisting IDs: ${duplicateIds.length}`;

    const errors = document.getElementById("appendErrors");
    errors.hidden = duplicateIds.length === 0;
    errors.textContent = duplicateIds.length ? "The following IDs already exist and will not be appended:\n\n" + duplicateIds.join("\n") : "";
    document.getElementById("confirmAppend").disabled = newEntries.length === 0;
    document.getElementById("appendModal").hidden = false;
}

function confirmAppend() {
    if (!pendingAppendEntries) return;
    const candidate = [...vocabulary, ...pendingAppendEntries.newEntries.map(cloneEntry)];
    validateEntries(candidate, "Appended vocabulary");
    validateRelationTargets(candidate, "Appended vocabulary");
    vocabulary = candidate;
    saveVocabulary();
    setDatabaseStatus(`${pendingAppendEntries.newEntries.length} entries appended locally`);
    pendingAppendEntries = null;
    closeModal("appendModal");
    refreshInterface();
}

function exportVocabulary() {
    const blob = new Blob([JSON.stringify(serializeVocabulary(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vocabulary.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function valueToArray(value) {
    if (Array.isArray(value)) return value.map(String);
    if (value !== undefined && value !== null && typeof value !== "object") return [String(value)];
    return [];
}

function getAttributeValue(entry, attribute) {
    const value = entry[attribute];
    if (value === undefined || value === null) return "";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function formatAttributeName(attribute) {
    return attribute.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

function populateFilters() {
    const container = document.getElementById("attributeFilters");
    container.innerHTML = "";

    FILTER_FIELDS.forEach(attribute => {
        const values = new Set();
        vocabulary.forEach(entry => valueToArray(entry[attribute]).forEach(value => { if (value) values.add(value); }));

        const wrapper = document.createElement("div");
        wrapper.className = "filter-group";
        const label = document.createElement("label");
        label.textContent = formatAttributeName(attribute);
        label.htmlFor = `filter-${attribute}`;

        const select = document.createElement("select");
        select.id = `filter-${attribute}`;
        select.dataset.attribute = attribute;
        const all = document.createElement("option");
        all.value = "";
        all.textContent = `All ${formatAttributeName(attribute)}`;
        select.appendChild(all);

        [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })).forEach(value => {
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
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "Default order";
    select.appendChild(none);

    SORT_FIELDS.forEach(attribute => {
        const option = document.createElement("option");
        option.value = attribute;
        option.textContent = formatAttributeName(attribute);
        select.appendChild(option);
    });
}

function matchesSearch(entry, query) {
    if (!query) return true;
    return [...SORT_FIELDS, "relations"].some(attribute => getAttributeValue(entry, attribute).toLowerCase().includes(query));
}

function applyFiltersAndSort() {
    const query = document.getElementById("searchVocabulary").value.trim().toLowerCase();

    filteredVocabulary = vocabulary.filter(entry => {
        if (!matchesSearch(entry, query)) return false;
        return FILTER_FIELDS.every(attribute => {
            const select = document.getElementById(`filter-${attribute}`);
            if (!select || !select.value) return true;
            return valueToArray(entry[attribute]).includes(select.value);
        });
    });

    const attribute = document.getElementById("sortAttribute").value;
    const direction = document.getElementById("sortDirection").value;
    if (attribute) {
        const factor = direction === "desc" ? -1 : 1;
        filteredVocabulary.sort((a, b) => getAttributeValue(a, attribute).localeCompare(getAttributeValue(b, attribute), undefined, { numeric: true, sensitivity: "base" }) * factor);
    }
    renderVocabulary();
}

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
            getAttributeValue(entry, "region"),
            getAttributeValue(entry, "culture"),
            getAttributeValue(entry, "biome"),
            getAttributeValue(entry, "temporal_setting"),
            getAttributeValue(entry, "tags"),
            getAttributeValue(entry, "features")
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actions = document.createElement("td");
        actions.className = "row-actions";
        const edit = document.createElement("button");
        edit.textContent = "Edit";
        edit.addEventListener("click", () => editVocabularyEntry(entry.id));
        const remove = document.createElement("button");
        remove.textContent = "Delete";
        remove.addEventListener("click", () => deleteVocabularyEntry(entry.id));
        actions.append(edit, remove);
        row.appendChild(actions);
        body.appendChild(row);
    });

    updateCounters();
}

function updateCounters() {
    document.getElementById("totalCount").textContent = vocabulary.length;
    document.getElementById("visibleCount").textContent = filteredVocabulary.length;
}

function openEntryModal(entry = null) {
    editingId = entry ? entry.id : null;
    document.getElementById("entryModalTitle").textContent = entry ? "Edit vocabulary entry" : "Add vocabulary entry";

    const values = entry || {
        id: "", concept: "", category: "", word_type: "noun", semantic_group: "", scope: "domain",
        region: [], culture: [], biome: [], temporal_setting: [], tags: [], features: [], relations: {}
    };

    document.getElementById("entryId").value = values.id || "";
    document.getElementById("entryConcept").value = values.concept || "";
    document.getElementById("entryCategory").value = values.category || "";
    document.getElementById("entryWordType").value = values.word_type || "";
    document.getElementById("entrySemanticGroup").value = values.semantic_group || "";
    document.getElementById("entryScope").value = values.scope || "domain";
    document.getElementById("entryRegion").value = (values.region || []).join(", ");
    document.getElementById("entryCulture").value = (values.culture || []).join(", ");
    document.getElementById("entryBiome").value = (values.biome || []).join(", ");
    document.getElementById("entryTemporalSetting").value = (values.temporal_setting || []).join(", ");
    document.getElementById("entryTags").value = (values.tags || []).join(", ");
    document.getElementById("entryFeatures").value = (values.features || []).join(", ");
    document.getElementById("entryRelations").value = JSON.stringify(values.relations || {}, null, 2);
    document.getElementById("entryFormError").hidden = true;
    document.getElementById("entryModal").hidden = false;
}

function readEntryForm() {
    const relationsText = document.getElementById("entryRelations").value.trim();
    const relations = relationsText ? JSON.parse(relationsText) : {};
    if (!relations || typeof relations !== "object" || Array.isArray(relations)) throw new Error("Relations must be a JSON object.");
    const splitList = value => value.split(",").map(item => item.trim()).filter(Boolean);

    return {
        id: document.getElementById("entryId").value.trim(),
        concept: document.getElementById("entryConcept").value.trim(),
        category: document.getElementById("entryCategory").value.trim(),
        word_type: document.getElementById("entryWordType").value.trim(),
        semantic_group: document.getElementById("entrySemanticGroup").value.trim(),
        scope: document.getElementById("entryScope").value.trim(),
        region: splitList(document.getElementById("entryRegion").value),
        culture: splitList(document.getElementById("entryCulture").value),
        biome: splitList(document.getElementById("entryBiome").value),
        temporal_setting: splitList(document.getElementById("entryTemporalSetting").value),
        tags: splitList(document.getElementById("entryTags").value),
        features: splitList(document.getElementById("entryFeatures").value),
        relations
    };
}

function submitEntryForm(event) {
    event.preventDefault();
    const errorBox = document.getElementById("entryFormError");

    try {
        const entry = readEntryForm();
        const candidate = vocabulary.map(cloneEntry);

        if (editingId) {
            const index = candidate.findIndex(item => item.id === editingId);
            if (index === -1) throw new Error("Entry not found.");
            if (entry.id !== editingId && candidate.some(item => item.id === entry.id)) throw new Error(`The ID "${entry.id}" already exists.`);
            candidate[index] = entry;
        } else {
            if (candidate.some(item => item.id === entry.id)) throw new Error(`The ID "${entry.id}" already exists.`);
            candidate.push(entry);
        }

        validateEntries(candidate, "Vocabulary");
        validateRelationTargets(candidate, "Vocabulary");
        vocabulary = candidate;
        saveVocabulary();
        closeModal("entryModal");
        refreshInterface();
    } catch (error) {
        errorBox.hidden = false;
        errorBox.textContent = error.message;
    }
}

function addVocabularyEntry() { openEntryModal(); }
function editVocabularyEntry(id) {
    const entry = vocabulary.find(item => item.id === id);
    if (entry) openEntryModal(entry);
}

function deleteVocabularyEntry(id) {
    const entry = vocabulary.find(item => item.id === id);
    if (!entry) return;

    const dependents = vocabulary.filter(item => Object.entries(item.relations || {}).some(([relation, rawValue]) => {
        if (relation === "grammatical_roles") return false;
        const values = Array.isArray(rawValue) ? rawValue : [rawValue];
        return values.includes(id);
    }));

    if (dependents.length) {
        alert(`Cannot delete "${entry.concept}" (${id}) because it is referenced by:\n\n` + dependents.map(item => `${item.id} — ${item.concept}`).join("\n"));
        return;
    }

    if (!confirm(`Delete "${entry.concept}" (${id})?`)) return;
    vocabulary = vocabulary.filter(item => item.id !== id);
    saveVocabulary();
    refreshInterface();
}

function closeModal(id) { document.getElementById(id).hidden = true; }
function setDatabaseStatus(text) { document.getElementById("databaseStatus").textContent = text; }
function showError(message) {
    const element = document.getElementById("errorMessage");
    element.hidden = false;
    element.textContent = message;
}
function refreshInterface() {
    populateFilters();
    populateSortOptions();
    applyFiltersAndSort();
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("searchVocabulary").addEventListener("input", applyFiltersAndSort);
    document.getElementById("sortAttribute").addEventListener("change", applyFiltersAndSort);
    document.getElementById("sortDirection").addEventListener("change", applyFiltersAndSort);
    document.getElementById("reloadVocabulary").addEventListener("click", reloadVocabularyFromJSON);
    document.getElementById("appendVocabulary").addEventListener("click", openAppendPicker);
    document.getElementById("appendFileInput").addEventListener("change", handleAppendFile);
    document.getElementById("confirmAppend").addEventListener("click", confirmAppend);
    document.getElementById("cancelAppend").addEventListener("click", () => closeModal("appendModal"));
    document.getElementById("addVocabulary").addEventListener("click", addVocabularyEntry);
    document.getElementById("exportVocabulary").addEventListener("click", exportVocabulary);
    document.getElementById("resetVocabulary").addEventListener("click", resetVocabulary);
    document.getElementById("entryForm").addEventListener("submit", submitEntryForm);
    document.querySelectorAll("[data-close-modal]").forEach(button => {
        button.addEventListener("click", () => closeModal(button.dataset.closeModal));
    });
    loadVocabulary();
});
