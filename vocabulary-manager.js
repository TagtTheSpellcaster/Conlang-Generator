let vocabulary = [];
let filteredVocabulary = [];

const STORAGE_KEY = "conlang_vocabulary";

async function loadVocabulary() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
            vocabulary = JSON.parse(stored);
            console.log("Vocabulary loaded from localStorage.");
        } else {
            const response = await fetch("vocabulary.json");

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();

            // Supports:
            // { "universal": [...] }
            // and directly [...]
            if (Array.isArray(data)) {
                vocabulary = data;
            } else {
                vocabulary = flattenVocabulary(data);
            }

            saveVocabulary();
        }

        filteredVocabulary = [...vocabulary];

        populateFilters();
        renderVocabulary();

    } catch (error) {
        console.error("Unable to load vocabulary:", error);
        showError("Unable to load vocabulary.json");
    }
}


function flattenVocabulary(data) {
    const result = [];

    for (const [group, entries] of Object.entries(data)) {

        if (!Array.isArray(entries)) {
            continue;
        }

        for (const entry of entries) {

            const item = {
                ...entry
            };

            // Preserve the database group.
            if (!item.scope) {
                item.scope = group;
            }

            result.push(item);
        }
    }

    return result;
}


function saveVocabulary() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(vocabulary, null, 2)
    );
}


function getAllAttributes() {
    const attributes = new Set();

    vocabulary.forEach(word => {
        Object.keys(word).forEach(key => {
            attributes.add(key);
        });
    });

    return [...attributes].sort();
}


function getAttributeValue(word, attribute) {

    const value = word[attribute];

    if (value === undefined || value === null) {
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

    const filterContainer =
        document.getElementById("attributeFilters");

    filterContainer.innerHTML = "";

    const attributes = getAllAttributes();

    attributes.forEach(attribute => {

        const values = new Set();

        vocabulary.forEach(word => {

            const value = word[attribute];

            if (Array.isArray(value)) {
                value.forEach(v => values.add(String(v)));
            } else if (
                value !== undefined &&
                value !== null &&
                typeof value !== "object"
            ) {
                values.add(String(value));
            }
        });

        if (values.size === 0) {
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "filter-group";

        const label = document.createElement("label");
        label.textContent = attribute;

        const select = document.createElement("select");

        select.dataset.attribute = attribute;

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "All";

        select.appendChild(allOption);

        [...values]
            .sort((a, b) => a.localeCompare(b))
            .forEach(value => {

                const option = document.createElement("option");

                option.value = value;
                option.textContent = value;

                select.appendChild(option);
            });

        select.addEventListener("change", applyFilters);

        wrapper.appendChild(label);
        wrapper.appendChild(select);

        filterContainer.appendChild(wrapper);
    });
}


function applyFilters() {

    const search =
        document
            .getElementById("searchVocabulary")
            .value
            .trim()
            .toLowerCase();

    const selects =
        document.querySelectorAll(
            "#attributeFilters select"
        );

    filteredVocabulary = vocabulary.filter(word => {

        // Global search
        if (search) {

            const text = JSON.stringify(word)
                .toLowerCase();

            if (!text.includes(search)) {
                return false;
            }
        }

        // Attribute filters
        for (const select of selects) {

            const attribute = select.dataset.attribute;
            const selectedValue = select.value;

            if (!selectedValue) {
                continue;
            }

            const value = word[attribute];

            if (Array.isArray(value)) {

                if (!value.map(String).includes(selectedValue)) {
                    return false;
                }

            } else {

                if (String(value) !== selectedValue) {
                    return false;
                }
            }
        }

        return true;
    });

    applySorting();
}


function applySorting() {

    const attribute =
        document.getElementById("sortAttribute").value;

    const direction =
        document.getElementById("sortDirection").value;

    if (!attribute) {
        renderVocabulary();
        return;
    }

    filteredVocabulary.sort((a, b) => {

        const valueA = getAttributeValue(a, attribute);
        const valueB = getAttributeValue(b, attribute);

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
    });

    renderVocabulary();
}


function renderVocabulary() {

    const tbody =
        document.getElementById("vocabularyBody");

    tbody.innerHTML = "";

    filteredVocabulary.forEach((word, index) => {

        const row = document.createElement("tr");

        const numberCell =
            document.createElement("td");

        numberCell.textContent = index + 1;

        row.appendChild(numberCell);

        const idCell =
            document.createElement("td");

        idCell.textContent = word.id || "";

        row.appendChild(idCell);

        const conceptCell =
            document.createElement("td");

        conceptCell.textContent =
            word.concept || "";

        row.appendChild(conceptCell);

        const categoryCell =
            document.createElement("td");

        categoryCell.textContent =
            word.category || "";

        row.appendChild(categoryCell);

        const typeCell =
            document.createElement("td");

        typeCell.textContent =
            word.word_type || "";

        row.appendChild(typeCell);

        const groupCell =
            document.createElement("td");

        groupCell.textContent =
            word.semantic_group || "";

        row.appendChild(groupCell);

        const featuresCell =
            document.createElement("td");

        featuresCell.textContent =
            Array.isArray(word.features)
                ? word.features.join(", ")
                : "";

        row.appendChild(featuresCell);

        const actionsCell =
            document.createElement("td");

        actionsCell.className = "actions";

        const editButton =
            document.createElement("button");

        editButton.textContent = "Edit";

        editButton.addEventListener(
            "click",
            () => editVocabularyEntry(word.id)
        );

        const deleteButton =
            document.createElement("button");

        deleteButton.textContent = "Delete";

        deleteButton.addEventListener(
            "click",
            () => deleteVocabularyEntry(word.id)
        );

        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);

        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });

    updateCounters();
}


function updateCounters() {

    document.getElementById("totalCount").textContent =
        vocabulary.length;

    document.getElementById("visibleCount").textContent =
        filteredVocabulary.length;
}


function populateSortAttributes() {

    const select =
        document.getElementById("sortAttribute");

    select.innerHTML = "";

    const none =
        document.createElement("option");

    none.value = "";
    none.textContent = "Default order";

    select.appendChild(none);

    getAllAttributes().forEach(attribute => {

        const option =
            document.createElement("option");

        option.value = attribute;
        option.textContent = attribute;

        select.appendChild(option);
    });
}


function editVocabularyEntry(id) {

    const word =
        vocabulary.find(entry => entry.id === id);

    if (!word) {
        return;
    }

    const json =
        JSON.stringify(word, null, 2);

    const edited =
        prompt(
            "Edit vocabulary entry as JSON:",
            json
        );

    if (edited === null) {
        return;
    }

    try {

        const newWord =
            JSON.parse(edited);

        if (!newWord.id) {
            throw new Error("Entry must have an id.");
        }

        const index =
            vocabulary.findIndex(
                entry => entry.id === id
            );

        vocabulary[index] = newWord;

        saveVocabulary();

        populateFilters();
        populateSortAttributes();
        filteredVocabulary = [...vocabulary];

        renderVocabulary();

    } catch (error) {

        alert(
            "Invalid JSON:\n\n" +
            error.message
        );
    }
}


function deleteVocabularyEntry(id) {

    const word =
        vocabulary.find(entry => entry.id === id);

    if (!word) {
        return;
    }

    const confirmed =
        confirm(
            `Delete "${word.concept}" (${id})?`
        );

    if (!confirmed) {
        return;
    }

    vocabulary =
        vocabulary.filter(
            entry => entry.id !== id
        );

    saveVocabulary();

    populateFilters();
    populateSortAttributes();

    applyFilters();
}


function addVocabularyEntry() {

    const template = {
        id: "example.new_word",
        category: "example",
        concept: "new word",
        word_type: "noun",
        semantic_group: "example",
        features: [],
        relations: {}
    };

    const json =
        prompt(
            "Enter the new vocabulary entry as JSON:",
            JSON.stringify(template, null, 2)
        );

    if (json === null) {
        return;
    }

    try {

        const newWord =
            JSON.parse(json);

        if (!newWord.id) {
            throw new Error("Entry must have an id.");
        }

        if (
            vocabulary.some(
                entry => entry.id === newWord.id
            )
        ) {
            throw new Error(
                `The ID "${newWord.id}" already exists.`
            );
        }

        vocabulary.push(newWord);

        saveVocabulary();

        populateFilters();
        populateSortAttributes();

        applyFilters();

    } catch (error) {

        alert(
            "Invalid vocabulary entry:\n\n" +
            error.message
        );
    }
}


function exportVocabulary() {

    const data = {};

    vocabulary.forEach(word => {

        const scope =
            word.scope || "universal";

        if (!data[scope]) {
            data[scope] = [];
        }

        const copy = {
            ...word
        };

        delete copy.scope;

        data[scope].push(copy);
    });

    const json =
        JSON.stringify(data, null, 2);

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
    link.download = "vocabulary.json";

    link.click();

    URL.revokeObjectURL(url);
}


function resetVocabulary() {

    const confirmed =
        confirm(
            "Clear local changes and reload vocabulary.json?"
        );

    if (!confirmed) {
        return;
    }

    localStorage.removeItem(STORAGE_KEY);

    location.reload();
}


function showError(message) {

    const error =
        document.getElementById("errorMessage");

    error.textContent = message;
    error.style.display = "block";
}


document.addEventListener("DOMContentLoaded", () => {

    document
        .getElementById("searchVocabulary")
        .addEventListener(
            "input",
            applyFilters
        );

    document
        .getElementById("sortAttribute")
        .addEventListener(
            "change",
            applySorting
        );

    document
        .getElementById("sortDirection")
        .addEventListener(
            "change",
            applySorting
        );

    document
        .getElementById("addVocabulary")
        .addEventListener(
            "click",
            addVocabularyEntry
        );

    document
        .getElementById("exportVocabulary")
        .addEventListener(
            "click",
            exportVocabulary
        );

    document
        .getElementById("resetVocabulary")
        .addEventListener(
            "click",
            resetVocabulary
        );

    loadVocabulary().then(() => {
        populateSortAttributes();
    });
});
