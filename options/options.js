(function () {
    "use strict";

    const api = (typeof chrome !== "undefined") ? chrome : browser;

    const elements = {
        wordInput: document.getElementById("wordInput"),
        addButton: document.getElementById("addButton"),
        wordList: document.getElementById("wordList"),
        emptyMessage: document.getElementById("emptyMessage"),
        updateListButton: document.getElementById("updateListButton"),
        status: document.getElementById("status")
    };

    function setStatus(text) {
        elements.status.textContent = text;
    }

    // draws the current word list into list
    function renderWords(words) {
        elements.wordList.innerHTML = "";

        elements.emptyMessage.style.display = words.length ? "none" : "block";

        words.forEach((word) => {
            const item = document.createElement("li");

            const label = document.createElement("span");
            label.textContent = word;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.textContent = "remove";
            removeButton.addEventListener("click", () => handleRemove(word));

            item.appendChild(label);
            item.appendChild(removeButton);
            elements.wordList.appendChild(item);
        });
    }

    async function loadAndRender() {
        const words = await globalThis.WebsiFCustomBlocklist.getCustomWords();
        renderWords(words);
    }

    async function handleAdd() {
        const value = elements.wordInput.value;

        if (!value || !value.trim()) {
            setStatus("type a word first");
            return;
        }

        const updated = await globalThis.WebsiFCustomBlocklist.addCustomWord(value);
        elements.wordInput.value = "";
        renderWords(updated);
        setStatus("word added");
    }

    async function handleRemove(word) {
        const updated = await globalThis.WebsiFCustomBlocklist.removeCustomWord(word);
        renderWords(updated);
        setStatus("word removed");
    }

    function sendUpdateListMessage() {
        return new Promise((resolve, reject) => {
            api.runtime.sendMessage({ type: "UPDATE_LIST" }, (response) => {
                if (api.runtime.lastError) {
                    reject(new Error(api.runtime.lastError.message));
                    return;
                }

                if (!response || !response.ok) {
                    reject(new Error(response ? response.error : "rebuild failed"));
                    return;
                }

                resolve(response);
            });
        });
    }

    async function handleUpdateList() {
        elements.updateListButton.disabled = true;
        setStatus("updating list...");

        try {
            const response = await sendUpdateListMessage();
            setStatus(`list updated with ${response.wordCount} words`);
        } catch (error) {
            setStatus(`error: ${error.message}`);
        } finally {
            elements.updateListButton.disabled = false;
        }
    }

    elements.addButton.addEventListener("click", handleAdd);
    elements.updateListButton.addEventListener("click", handleUpdateList);

    // let enter key add a word too, without needing a form submit
    elements.wordInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") handleAdd();
    });

    loadAndRender();
})();
