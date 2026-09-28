let vocabulary = [];
let filteredVocabulary = [];

const STORAGE_KEY = "conlang_vocabulary";


// ============================================================
// DATABASE NORMALIZATION
// ============================================================

function flattenVocabulary(data) {
    if (Array.isArray(data)) {
        return data.map(entry => ({ ...entry }));
    }

    const result = [];

    for (const [group, entries] of Object.entries(data || {})) {
        if (!Array.isArray(entries)) continue;

        for (const entry of entries) {
            const item = { ...entry };

            // If the JSON is grouped by scope, use the group
            // as scope when the entry does not already define one.
            if (!item.scope) {
                item.scope = group;
            }

            result.push(item);
        }
    }

    return result;
}


function groupVocabulary(entries) {
    const data = {};

    for (const entry of entries) {
        const group = entry.scope || "common";

        if (!data[group]) {
            data[group] = [];
        }

        const copy = { ...entry };
        delete copy.scope;

        data[group].push(copy);
    }

    return data;
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

    vocabulary = flattenVocabulary(data);
}


async function loadVocabulary() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
            vocabulary = JSON.parse(stored);
            setDatabaseStatus("Local working copy");
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
        JSON.stringify(vocabulary, null, 2)
    );
}


// ============================================================
// RELOAD
// ============================================================

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

    const file = event.target.files[0];

    // Reset input so that the same file can be selected again.
    event.target.value = "";

    if (!file) return;

    try {

        const text = await file.text();

        let parsed;

        try {
            parsed = JSON.parse(text);
        } catch (error) {
            throw new Error(
                "The selected file is not valid JSON.\n\n" +
                error.message
            );
        }

        const imported =
            flattenVocabulary(parsed);

        validateImportedEntries(imported);

        const existingIds =
            new Set(
                vocabulary.map(entry => entry.id)
            );

        const duplicateIds =
            imported
                .filter(entry =>
                    existingIds.has(entry.id)
                )
                .map(entry => entry.id);

        const newEntries =
            imported.filter(entry =>
                !existingIds.has(entry.id)
            );

        pendingAppendEntries = {
            fileName: file.name,
            imported,
            newEntries,
            duplicateIds
        };

        showAppendModal();

    } catch (error) {

        alert(
            "The selected file could not be appended.\n\n" +
            error.message
        );
    }
}


function validateImportedEntries(entries) {

    if (!Array.isArray(entries)) {
        throw new Error(
            "The imported JSON does not contain vocabulary entries."
        );
    }

    const invalid = [];

    entries.forEach((entry, index) => {

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
    });

    if (invalid.length) {

        throw new Error(
            "Invalid vocabulary entries:\n\n" +
            invalid.join("\n")
        );
    }


    // Check for duplicate IDs inside the imported file.

    const ids = new Set();

    const internalDuplicates = [];

    entries.forEach(entry => {

        if (ids.has(entry.id)) {
            internalDuplicates.push(entry.id);
        }

        ids.add(entry.id);
    });


    if (internalDuplicates.length) {

        throw new Error(
            "The imported file contains duplicate IDs:\n\n" +
            [...new Set(internalDuplicates)].join("\n")
        );
    }
}


function showAppendModal() {

    const modal =
        document.getElementById("appendModal");

    const summary =
        document.getElementById("appendSummary");

    const errors =
        document.getElementById("appendErrors");

    const confirmButton =
        document.getElementById("confirmAppend");


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

    if (!pendingAppendEntries) return;


    const {
        newEntries
    } = pendingAppendEntries;


    vocabulary.push(...newEntries);

    saveVocabulary();


    setDatabaseStatus(
        `${newEntries.length} entries appended locally`
    );


    pendingAppendEntries = null;


    closeModal("appendModal");


    refreshInterface();
}


// ============================================================
// EXPORT
// ============================================================

function exportVocabulary() {

    /*
     * Reconstruct the grouped JSON structure.
     * JSON.stringify guarantees valid JSON syntax.
     */

    const data =
        groupVocabulary(vocabulary);


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
// FILTERS
// ============================================================

function getAllAttributes() {

    const attributes =
        new Set();


    vocabulary.forEach(entry => {

        Object.keys(entry)
            .forEach(key =>
                attributes.add(key)
            );
    });


    return [...attributes].sort();
}


function valueToArray(value) {

    if (Array.isArray(value)) {

        return value.map(String);
    }


    if (
        value !== undefined &&
        value !== null &&
        typeof value !== "object"
    ) {

        return [String(value)];
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

        return value.join(", ");
    }


    if (typeof value === "object") {

        return JSON.stringify(value);
    }


    return String(value);
}


function populateFilters() {

    const container =
        document.getElementById(
            "attributeFilters"
        );


    container.innerHTML = "";


    const attributes =
        getAllAttributes();


    attributes.forEach(attribute => {

        const values =
            new Set();


        vocabulary.forEach(entry => {

            valueToArray(
                entry[attribute]
            ).forEach(value =>
                values.add(value)
            );
        });


        if (!values.size) return;


        const wrapper =
            document.createElement("div");


        wrapper.className =
            "filter-group";


        const label =
            document.createElement("label");


        label.textContent =
            formatAttributeName(
                attribute
            );


        const select =
            document.createElement("select");


        select.dataset.attribute =
            attribute;


        const all =
            document.createElement("option");


        all.value = "";

        all.textContent = "All";


        select.appendChild(all);


        [...values]
            .sort((a, b) =>
                a.localeCompare(
                    b,
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                )
            )
            .forEach(value => {

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
            });


        select.addEventListener(
            "change",
            applyFilters
        );


        wrapper.appendChild(label);

        wrapper.appendChild(select);

        container.appendChild(wrapper);
    });
}


function formatAttributeName(attribute) {

    return attribute
        .replace(/_/g, " ")
        .replace(
            /\b\w/g,
            char => char.toUpperCase()
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
        vocabulary.filter(entry => {

            /*
             * General text search.
             */

            if (search) {

                const text =
                    JSON.stringify(
                        entry
                    ).toLowerCase();


                if (
                    !text.includes(search)
                ) {
                    return false;
                }
            }


            /*
             * Attribute filters.
             */

            for (
                const select of selects
            ) {

                const selected =
                    select.value;


                if (!selected) {
                    continue;
                }


                const values =
                    valueToArray(
                        entry[
                            select.dataset
                                .attribute
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
        });


    applySorting();
}


// ============================================================
// SORTING
// ============================================================

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


    select.appendChild(none);


    getAllAttributes()
        .forEach(attribute => {

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
        });
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

                entry.id || "",

                entry.concept || "",

                entry.category || "",

                entry.word_type || "",

                entry.semantic_group || "",

                entry.scope || "",

                entry.locale || "",

                getAttributeValue(
                    entry,
                    "tags"
                ),

                getAttributeValue(
                    entry,
                    "features"
                )
            ];


            cells.forEach(value => {

                const cell =
                    document.createElement(
                        "td"
                    );


                cell.textContent =
                    value;


                row.appendChild(cell);
            });


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


            actions.appendChild(edit);

            actions.appendChild(remove);


            row.appendChild(actions);

            tbody.appendChild(row);
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

            scope: "common",

            type: "",

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
        "entryType"
    ).value =
        values.type || "";


    document.getElementById(
        "entryLocale"
    ).value =
        values.locale || "";


    document.getElementById(
        "entryTags"
    ).value =
        Array.isArray(values.tags)
            ? values.tags.join(", ")
            : "";


    document.getElementById(
        "entryFeatures"
    ).value =
        Array.isArray(values.features)
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
        document
            .getElementById(
                "entryRelations"
            )
            .value
            .trim();


    let relations = {};


    if (relationsText) {

        try {

            relations =
                JSON.parse(
                    relationsText
                );

        } catch (error) {

            throw new Error(
                "Relations must contain valid JSON."
            );
        }
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
            document
                .getElementById(
                    "entryId"
                )
                .value
                .trim(),

        concept:
            document
                .getElementById(
                    "entryConcept"
                )
                .value
                .trim(),

        category:
            document
                .getElementById(
                    "entryCategory"
                )
                .value
                .trim(),

        word_type:
            document
                .getElementById(
                    "entryWordType"
                )
                .value
                .trim(),

        semantic_group:
            document
                .getElementById(
                    "entrySemanticGroup"
                )
                .value
                .trim(),

        scope:
            document
                .getElementById(
                    "entryScope"
                )
                .value
                .trim(),

        type:
            document
                .getElementById(
                    "entryType"
                )
                .value
                .trim(),

        locale:
            document
                .getElementById(
                    "entryLocale"
                )
                .value
                .trim(),

        tags:
            splitList(
                document
                    .getElementById(
                        "entryTags"
                    )
                    .value
            ),

        features:
            splitList(
                document
                    .getElementById(
                        "entryFeatures"
                    )
                    .value
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
            readEntryForm();


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
                    existing.id ===
                        entry.id &&
                    existing.id !==
                        editingId
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
                        item.id ===
                        editingId
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

        errorBox.hidden =
            false;

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


// ============================================================
// REFRESH
// ============================================================

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
                                button.dataset
                                    .closeModal
                            )
                    );
                }
            );


        loadVocabulary();
    }
);
