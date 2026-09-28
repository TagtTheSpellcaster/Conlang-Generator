let vocabulary = [];
let filteredVocabulary = [];

const STORAGE_KEY = "conlang_vocabulary";


// ============================================================
// DATABASE NORMALIZATION
// ============================================================

/*
 * Canonical database format:
 *
 * {
 *   "vocabulary": [
 *     { ...entry... },
 *     { ...entry... }
 *   ]
 * }
 *
 * The application never assigns semantic meaning to top-level JSON
 * groups. All filtering is based on fields inside each entry.
 */

function cleanEntry(entry) {
    const cleaned = { ...entry };

    // Legacy field: semantic distinctions are now represented by tags.
    delete cleaned.type;

    const tags = Array.isArray(cleaned.tags)
        ? [...cleaned.tags]
        : [];

    const addTag = tag => {
        if (!tags.includes(tag)) tags.push(tag);
    };

    // Normalize legacy technology/fantasy markers.
    const hasScienceFiction = tags.includes("science_fiction");
    const hasFantasy = tags.includes("fantasy");

    if (hasScienceFiction) {
        addTag("sci-fi");
    }

    // Existing legacy type values are converted to tags
    // before the field is removed.
    if (entry.type === "natural") {
        addTag("natural");
    }

    if (entry.type === "monster") {
        addTag("fantasy");
    }

    if (
        entry.type === "fictional" &&
        !hasScienceFiction &&
        !hasFantasy
    ) {
        addTag("fantasy");
    }

    // Normalize old spelling.
    const normalizedTags = tags
        .filter(tag => tag !== "science_fiction")
        .map(tag => tag === "science-fiction" ? "sci-fi" : tag);

    // Universal is represented primarily by scope,
    // but is also retained as a tag for backward compatibility.
    if (cleaned.scope === "universal") {
        if (!normalizedTags.includes("universal")) {
            normalizedTags.push("universal");
        }
    }

    cleaned.tags = [...new Set(normalizedTags)];

    // Repair the known malformed animal ID.
    if (
        cleaned.id === "animal_ant" &&
        cleaned.concept === "ant"
    ) {
        cleaned.id = "animal.ant";
    }

    return cleaned;
}


function normalizeVocabularyData(data) {

    // New canonical format.
    if (
        data &&
        !Array.isArray(data) &&
        Array.isArray(data.vocabulary)
    ) {
        return data.vocabulary.map(cleanEntry);
    }

    // Plain array is also accepted.
    if (Array.isArray(data)) {
        return data.map(cleanEntry);
    }

    // Backward compatibility:
    // accept the old grouped format and flatten it.
    if (data && typeof data === "object") {

        const result = [];

        for (const [group, entries] of Object.entries(data)) {

            if (!Array.isArray(entries)) {
                continue;
            }

            for (const entry of entries) {

                const item = {
                    ...entry
                };

                if (!item.scope) {
                    item.scope =
                        group === "universal"
                            ? "universal"
                            : "domain";
                }

                result.push(cleanEntry(item));
            }
        }

        return result;
    }

    throw new Error(
        "Unsupported vocabulary JSON structure."
    );
}


function serializeVocabulary() {

    return {
        vocabulary: vocabulary.map(entry => ({
            ...entry
        }))
    };
}


// ============================================================
// LOAD / SAVE
// ============================================================

async function loadVocabularyFromJSON() {

    const response = await fetch(
        "vocabulary.json?cacheBust=" + Date.now()
    );

    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    vocabulary =
        normalizeVocabularyData(data);
}


async function loadVocabulary() {

    try {

        const stored =
            localStorage.getItem(STORAGE_KEY);

        if (stored) {

            const parsed = JSON.parse(stored);

            /*
             * localStorage contains the canonical vocabulary array.
             * Normalize it again so legacy fields such as "type"
             * cannot survive indefinitely in the working copy.
             */
            vocabulary =
                normalizeVocabularyData(parsed);

            saveVocabulary();

            setDatabaseStatus(
                "Local working copy"
            );

        } else {

            await loadVocabularyFromJSON();

            saveVocabulary();

            setDatabaseStatus(
                "Loaded from vocabulary.json"
            );
        }

        refreshInterface();

    } catch (error) {

        console.error(error);

        showError(
            "Unable to load vocabulary.json: " +
            error.message
        );
    }
}


function saveVocabulary() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            vocabulary,
            null,
            2
        )
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

        await loadVocabularyFromJSON();

        saveVocabulary();

        setDatabaseStatus(
            "Reloaded from vocabulary.json"
        );

        refreshInterface();

    } catch (error) {

        alert(
            "Unable to reload vocabulary.json:\n\n" +
            error.message
        );
    }
}


// ============================================================
// APPEND JSON
// ============================================================

let pendingAppendEntries = null;


function openAppendPicker() {

    document
        .getElementById("appendFileInput")
        .click();
}


async function handleAppendFile(event) {

    const file =
        event.target.files[0];

    event.target.value = "";

    if (!file) return;

    try {

        const text =
            await file.text();

        const parsed =
            JSON.parse(text);

        const imported =
            flattenVocabulary(parsed);

        validateImportedEntries(
            imported
        );

        const existingIds =
            new Set(
                vocabulary.map(
                    entry => entry.id
                )
            );

        const duplicateIds =
            imported
                .filter(
                    entry =>
                        existingIds.has(entry.id)
                )
                .map(
                    entry => entry.id
                );

        /*
         * Normalize imported entries before they are added.
         * This ensures that appended files using old fields such as
         * "type" are converted to the current canonical structure.
         */
        const normalizedImported =
            imported.map(cleanEntry);

        const normalizedExistingIds =
            new Set(
                vocabulary.map(
                    entry => entry.id
                )
            );

        const normalizedDuplicateIds =
            normalizedImported
                .filter(
                    entry =>
                        normalizedExistingIds.has(entry.id)
                )
                .map(
                    entry => entry.id
                );

        const newEntries =
            normalizedImported.filter(
                entry =>
                    !normalizedExistingIds.has(
                        entry.id
                    )
            );

        pendingAppendEntries = {

            fileName: file.name,

            imported: normalizedImported,

            newEntries,

            duplicateIds:
                [
                    ...new Set(
                        [
                            ...duplicateIds,
                            ...normalizedDuplicateIds
                        ]
                    )
                ]
        };

        showAppendModal();

    } catch (error) {

        alert(
            "The selected file could not be appended.\n\n" +
            error.message
        );
    }
}


function flattenVocabulary(data) {

    // Canonical format:
    // { vocabulary: [...] }

    if (
        data &&
        !Array.isArray(data) &&
        Array.isArray(data.vocabulary)
    ) {
        return data.vocabulary;
    }

    // Plain array.

    if (Array.isArray(data)) {
        return data;
    }

    // Legacy grouped format.

    if (
        data &&
        typeof data === "object"
    ) {

        const result = [];

        for (
            const [group, entries]
            of Object.entries(data)
        ) {

            if (!Array.isArray(entries)) {
                continue;
            }

            for (const entry of entries) {

                const item = {
                    ...entry
                };

                if (!item.scope) {

                    item.scope =
                        group === "universal"
                            ? "universal"
                            : "domain";
                }

                result.push(item);
            }
        }

        return result;
    }

    throw new Error(
        "Unsupported vocabulary JSON structure."
    );
}


function validateImportedEntries(entries) {

    if (!Array.isArray(entries)) {

        throw new Error(
            "The imported JSON does not contain vocabulary entries."
        );
    }

    const invalid = [];

    entries.forEach(
        (entry, index) => {

            if (
                !entry ||
                typeof entry !== "object" ||
                Array.isArray(entry)
            ) {

                invalid.push(
                    `Entry ${index + 1}: not an object`
                );

                return;
            }

            if (!entry.id) {

                invalid.push(
                    `Entry ${index + 1}: missing "id"`
                );
            }

            if (!entry.concept) {

                invalid.push(
                    `Entry ${index + 1}: missing "concept"`
                );
            }
        }
    );

    if (invalid.length) {

        throw new Error(
            "Invalid vocabulary entries:\n\n" +
            invalid.join("\n")
        );
    }

    const ids = new Set();

    const internalDuplicates = [];

    entries.forEach(entry => {

        if (ids.has(entry.id)) {

            internalDuplicates.push(
                entry.id
            );
        }

        ids.add(entry.id);
    });

    if (internalDuplicates.length) {

        throw new Error(
            "The imported file contains duplicate IDs:\n\n" +
            [
                ...new Set(
                    internalDuplicates
                )
            ].join("\n")
        );
    }
}


function showAppendModal() {

    const modal =
        document.getElementById(
            "appendModal"
        );

    const summary =
        document.getElementById(
            "appendSummary"
        );

    const errors =
        document.getElementById(
            "appendErrors"
        );

    const confirmButton =
        document.getElementById(
            "confirmAppend"
        );

    const {
        fileName,
        imported,
        newEntries,
        duplicateIds
    } = pendingAppendEntries;

    document.getElementById(
        "appendFilename"
    ).textContent =
        `File: ${fileName}`;

    summary.textContent =
        `Entries found: ${imported.length}\n` +
        `New entries: ${newEntries.length}\n` +
        `Existing IDs: ${duplicateIds.length}`;

    errors.hidden = true;

    errors.textContent = "";

    if (duplicateIds.length) {

        errors.hidden = false;

        errors.textContent =
            "The following IDs already exist and will not be appended:\n\n" +
            duplicateIds.join("\n");
    }

    confirmButton.disabled =
        newEntries.length === 0;

    modal.hidden = false;
}


function confirmAppend() {

    if (!pendingAppendEntries) {
        return;
    }

    const {
        newEntries
    } = pendingAppendEntries;

    vocabulary.push(
        ...newEntries
    );

    saveVocabulary();

    setDatabaseStatus(
        `${newEntries.length} entries appended locally`
    );

    pendingAppendEntries = null;

    closeModal(
        "appendModal"
    );

    refreshInterface();
}


// ============================================================
// EXPORT
// ============================================================

function exportVocabulary() {

    /*
     * Always export the canonical format.
     * JSON.stringify guarantees valid JSON syntax.
     */

    const data =
        serializeVocabulary();

    const json =
        JSON.stringify(
            data,
            null,
            2
        );

    const blob =
        new Blob(
            [json],
            {
                type: "application/json"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "vocabulary.json";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}


// ============================================================
// FILTERS / SORTING
// ============================================================

/*
 * Canonical entry properties.
 *
 * These are the properties that the application recognizes.
 *
 * "type" is deliberately excluded.
 *
 * Semantic distinctions such as:
 *
 * natural
 * monster
 * fictional
 *
 * are now represented through tags.
 */

const CANONICAL_PROPERTIES = [

    "id",

    "concept",

    "category",

    "word_type",

    "semantic_group",

    "scope",

    "locale",

    "tags",

    "features",

    "relations"

];


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


function getAllAttributes() {

    return [
        ...CANONICAL_PROPERTIES
    ];
}


function valueToArray(value) {

    if (Array.isArray(value)) {

        return value.map(
            String
        );
    }

    if (
        value !== undefined &&
        value !== null &&
        typeof value !== "object"
    ) {

        return [
            String(value)
        ];
    }

    return [];
}


function getAttributeValue(
    entry,
    attribute
) {

    const value =
        entry[attribute];

    if (
        value === undefined ||
        value === null
    ) {

        return "";
    }

    if (Array.isArray(value)) {

        return value.join(
            ", "
        );
    }

    if (
        typeof value === "object"
    ) {

        return JSON.stringify(
            value
        );
    }

    return String(value);
}


function populateFilters() {

    const container =
        document.getElementById(
            "attributeFilters"
        );

    container.innerHTML = "";

    FILTER_PROPERTIES.forEach(
        attribute => {

            const values =
                new Set();

            vocabulary.forEach(
                entry => {

                    valueToArray(
                        entry[attribute]
                    ).forEach(
                        value => {

                            if (
                                value !== ""
                            ) {
                                values.add(
                                    value
                                );
                            }
                        }
                    );
                }
            );

            if (!values.size) {
                return;
            }

            const wrapper =
                document.createElement(
                    "div"
                );

            wrapper.className =
                "filter-group";

            const label =
                document.createElement(
                    "label"
                );

            label.textContent =
                formatAttributeName(
                    attribute
                );

            const select =
                document.createElement(
                    "select"
                );

            select.dataset.attribute =
                attribute;

            const all =
                document.createElement(
                    "option"
                );

            all.value = "";

            all.textContent =
                "All";

            select.appendChild(
                all
            );

            [
                ...values
            ]
                .sort(
                    (a, b) =>
                        a.localeCompare(
                            b,
                            undefined,
                            {
                                numeric: true,
                                sensitivity: "base"
                            }
                        )
                )
                .forEach(
                    value => {

                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            value;

                        option.textContent =
                            value;

                        select.appendChild(
                            option
                        );
                    }
                );

            select.addEventListener(
                "change",
                applyFilters
            );

            wrapper.appendChild(
                label
            );

            wrapper.appendChild(
                select
            );

            container.appendChild(
                wrapper
            );
        }
    );
}


function formatAttributeName(
    attribute
) {

    const labels = {

        id: "ID",

        concept: "Concept",

        category: "Category",

        word_type: "Word Type",

        semantic_group:
            "Semantic Group",

        scope: "Scope",

        locale: "Locale",

        tags: "Tags",

        features: "Features",

        relations: "Relations"
    };

    return (
        labels[attribute] ||
        attribute
            .replace(
                /_/g,
                " "
            )
            .replace(
                /\b\w/g,
                char =>
                    char.toUpperCase()
            )
    );
}


function applyFilters() {

    const search =
        document
            .getElementById(
                "searchVocabulary"
            )
            .value
            .trim()
            .toLowerCase();

    const selects =
        document.querySelectorAll(
            "#attributeFilters select"
        );

    filteredVocabulary =
        vocabulary.filter(
            entry => {

                if (search) {

                    const text =
                        JSON.stringify(
                            entry
                        ).toLowerCase();

                    if (
                        !text.includes(
                            search
                        )
                    ) {
                        return false;
                    }
                }

                for (
                    const select
                    of selects
                ) {

                    const selected =
                        select.value;

                    if (!selected) {
                        continue;
                    }

                    const values =
                        valueToArray(
                            entry[
                                select.dataset.attribute
                            ]
                        );

                    if (
                        !values.includes(
                            selected
                        )
                    ) {

                        return false;
                    }
                }

                return true;
            }
        );

    applySorting();
}


function populateSortAttributes() {

    const select =
        document.getElementById(
            "sortAttribute"
        );

    select.innerHTML = "";

    const none =
        document.createElement(
            "option"
        );

    none.value = "";

    none.textContent =
        "Default order";

    select.appendChild(
        none
    );

    SORT_PROPERTIES.forEach(
        attribute => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                attribute;

            option.textContent =
                formatAttributeName(
                    attribute
                );

            select.appendChild(
                option
            );
        }
    );
}


function applySorting() {

    const attribute =
        document.getElementById(
            "sortAttribute"
        ).value;

    const direction =
        document.getElementById(
            "sortDirection"
        ).value;

    if (!attribute) {

        renderVocabulary();

        return;
    }

    filteredVocabulary.sort(
        (a, b) => {

            const valueA =
                getAttributeValue(
                    a,
                    attribute
                );

            const valueB =
                getAttributeValue(
                    b,
                    attribute
                );

            const comparison =
                valueA.localeCompare(
                    valueB,
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                );

            return direction === "desc"
                ? -comparison
                : comparison;
        }
    );

    renderVocabulary();
}


// ============================================================
// TABLE
// ============================================================

function renderVocabulary() {

    const tbody =
        document.getElementById(
            "vocabularyBody"
        );

    tbody.innerHTML = "";

    filteredVocabulary.forEach(
        (entry, index) => {

            const row =
                document.createElement(
                    "tr"
                );

            const cells = [

                index + 1,

                getAttributeValue(
                    entry,
                    "id"
                ),

                getAttributeValue(
                    entry,
                    "concept"
                ),

                getAttributeValue(
                    entry,
                    "category"
                ),

                getAttributeValue(
                    entry,
                    "word_type"
                ),

                getAttributeValue(
                    entry,
                    "semantic_group"
                ),

                getAttributeValue(
                    entry,
                    "scope"
                ),

                getAttributeValue(
                    entry,
                    "locale"
                ),

                getAttributeValue(
                    entry,
                    "tags"
                ),

                getAttributeValue(
                    entry,
                    "features"
                )
            ];

            cells.forEach(
                value => {

                    const cell =
                        document.createElement(
                            "td"
                        );

                    cell.textContent =
                        value;

                    row.appendChild(
                        cell
                    );
                }
            );

            const actions =
                document.createElement(
                    "td"
                );

            actions.className =
                "actions";

            const edit =
                document.createElement(
                    "button"
                );

            edit.textContent =
                "Edit";

            edit.addEventListener(
                "click",
                () =>
                    editVocabularyEntry(
                        entry.id
                    )
            );

            const remove =
                document.createElement(
                    "button"
                );

            remove.textContent =
                "Delete";

            remove.addEventListener(
                "click",
                () =>
                    deleteVocabularyEntry(
                        entry.id
                    )
            );

            actions.appendChild(
                edit
            );

            actions.appendChild(
                remove
            );

            row.appendChild(
                actions
            );

            tbody.appendChild(
                row
            );
        }
    );

    updateCounters();
}


function updateCounters() {

    document.getElementById(
        "totalCount"
    ).textContent =
        vocabulary.length;

    document.getElementById(
        "visibleCount"
    ).textContent =
        filteredVocabulary.length;
}


// ============================================================
// ADD / EDIT
// ============================================================

let editingId = null;


function openEntryModal(
    entry = null
) {

    editingId =
        entry
            ? entry.id
            : null;

    document.getElementById(
        "entryModalTitle"
    ).textContent =
        entry
            ? "Edit vocabulary entry"
            : "Add vocabulary entry";

    const values =
        entry || {

            id: "",

            concept: "",

            category: "",

            word_type: "noun",

            semantic_group: "",

            scope: "domain",

            locale: "",

            tags: [],

            features: [],

            relations: {}
        };

    document.getElementById(
        "entryId"
    ).value =
        values.id || "";

    document.getElementById(
        "entryConcept"
    ).value =
        values.concept || "";

    document.getElementById(
        "entryCategory"
    ).value =
        values.category || "";

    document.getElementById(
        "entryWordType"
    ).value =
        values.word_type || "";

    document.getElementById(
        "entrySemanticGroup"
    ).value =
        values.semantic_group || "";

    document.getElementById(
        "entryScope"
    ).value =
        values.scope || "";

    document.getElementById(
        "entryLocale"
    ).value =
        values.locale || "";

    document.getElementById(
        "entryTags"
    ).value =
        Array.isArray(
            values.tags
        )
            ? values.tags.join(", ")
            : "";

    document.getElementById(
        "entryFeatures"
    ).value =
        Array.isArray(
            values.features
        )
            ? values.features.join(", ")
            : "";

    document.getElementById(
        "entryRelations"
    ).value =
        JSON.stringify(
            values.relations || {},
            null,
            2
        );

    document.getElementById(
        "entryFormError"
    ).hidden = true;

    document.getElementById(
        "entryModal"
    ).hidden = false;
}


function readEntryForm() {

    const relationsText =
        document.getElementById(
            "entryRelations"
        ).value.trim();

    let relations = {};

    if (relationsText) {

        relations =
            JSON.parse(
                relationsText
            );
    }

    const splitList =
        value =>
            value
                .split(",")
                .map(
                    item =>
                        item.trim()
                )
                .filter(Boolean);

    return {

        id:
            document.getElementById(
                "entryId"
            ).value.trim(),

        concept:
            document.getElementById(
                "entryConcept"
            ).value.trim(),

        category:
            document.getElementById(
                "entryCategory"
            ).value.trim(),

        word_type:
            document.getElementById(
                "entryWordType"
            ).value.trim(),

        semantic_group:
            document.getElementById(
                "entrySemanticGroup"
            ).value.trim(),

        scope:
            document.getElementById(
                "entryScope"
            ).value.trim(),

        locale:
            document.getElementById(
                "entryLocale"
            ).value.trim(),

        tags:
            splitList(
                document.getElementById(
                    "entryTags"
                ).value
            ),

        features:
            splitList(
                document.getElementById(
                    "entryFeatures"
                ).value
            ),

        relations
    };
}


function submitEntryForm(event) {

    event.preventDefault();

    const errorBox =
        document.getElementById(
            "entryFormError"
        );

    try {

        const entry =
            cleanEntry(
                readEntryForm()
            );

        if (
            !entry.id ||
            !entry.concept ||
            !entry.category
        ) {

            throw new Error(
                "ID, concept and category are required."
            );
        }

        const duplicate =
            vocabulary.some(
                existing =>
                    existing.id === entry.id &&
                    existing.id !== editingId
            );

        if (duplicate) {

            throw new Error(
                `The ID "${entry.id}" already exists.`
            );
        }

        if (editingId) {

            const index =
                vocabulary.findIndex(
                    item =>
                        item.id === editingId
                );

            if (index === -1) {

                throw new Error(
                    "Entry not found."
                );
            }

            vocabulary[index] =
                entry;

        } else {

            vocabulary.push(
                entry
            );
        }

        saveVocabulary();

        closeModal(
            "entryModal"
        );

        refreshInterface();

    } catch (error) {

        errorBox.hidden = false;

        errorBox.textContent =
            error.message;
    }
}


function addVocabularyEntry() {

    openEntryModal();
}


function editVocabularyEntry(id) {

    const entry =
        vocabulary.find(
            item =>
                item.id === id
        );

    if (entry) {

        openEntryModal(
            entry
        );
    }
}


function deleteVocabularyEntry(id) {

    const entry =
        vocabulary.find(
            item =>
                item.id === id
        );

    if (!entry) return;

    if (!confirm(
        `Delete "${entry.concept}" (${id})?`
    )) {

        return;
    }

    vocabulary =
        vocabulary.filter(
            item =>
                item.id !== id
        );

    saveVocabulary();

    refreshInterface();
}


// ============================================================
// MODALS / UI
// ============================================================

function closeModal(id) {

    document.getElementById(
        id
    ).hidden = true;
}


function setDatabaseStatus(text) {

    document.getElementById(
        "databaseStatus"
    ).textContent = text;
}


function showError(message) {

    const element =
        document.getElementById(
            "errorMessage"
        );

    element.hidden = false;

    element.textContent =
        message;
}


function refreshInterface() {

    populateFilters();

    populateSortAttributes();

    applyFilters();
}


// ============================================================
// RESET
// ============================================================

function resetVocabulary() {

    if (!confirm(
        "Clear local changes and reload vocabulary.json?"
    )) {

        return;
    }

    localStorage.removeItem(
        STORAGE_KEY
    );

    location.reload();
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        document
            .getElementById(
                "searchVocabulary"
            )
            .addEventListener(
                "input",
                applyFilters
            );

        document
            .getElementById(
                "sortAttribute"
            )
            .addEventListener(
                "change",
                applySorting
            );

        document
            .getElementById(
                "sortDirection"
            )
            .addEventListener(
                "change",
                applySorting
            );

        document
            .getElementById(
                "reloadVocabulary"
            )
            .addEventListener(
                "click",
                reloadVocabularyFromJSON
            );

        document
            .getElementById(
                "appendVocabulary"
            )
            .addEventListener(
                "click",
                openAppendPicker
            );

        document
            .getElementById(
                "appendFileInput"
            )
            .addEventListener(
                "change",
                handleAppendFile
            );

        document
            .getElementById(
                "confirmAppend"
            )
            .addEventListener(
                "click",
                confirmAppend
            );

        document
            .getElementById(
                "cancelAppend"
            )
            .addEventListener(
                "click",
                () =>
                    closeModal(
                        "appendModal"
                    )
            );

        document
            .getElementById(
                "addVocabulary"
            )
            .addEventListener(
                "click",
                addVocabularyEntry
            );

        document
            .getElementById(
                "exportVocabulary"
            )
            .addEventListener(
                "click",
                exportVocabulary
            );

        document
            .getElementById(
                "resetVocabulary"
            )
            .addEventListener(
                "click",
                resetVocabulary
            );

        document
            .getElementById(
                "entryForm"
            )
            .addEventListener(
                "submit",
                submitEntryForm
            );

        document
            .querySelectorAll(
                "[data-close-modal]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () =>
                            closeModal(
                                button.dataset.closeModal
                            )
                    );
                }
            );

        loadVocabulary();
    }
);
