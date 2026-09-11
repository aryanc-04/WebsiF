(function () {
    "use strict";

    const STORAGE_KEY_CUSTOM = "websif_custom_words";
    const STORAGE_KEY_ACTIVE = "websif_active_words";

    function storageGet(key) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([key], (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                resolve(result[key]);
            });
        });
    }

    function storageSet(key, value) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [key]: value }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                resolve();
            });
        });
    }

    async function getCustomWords() {
        const stored = await storageGet(STORAGE_KEY_CUSTOM);
        return Array.isArray(stored) ? stored : [];
    }

    async function saveCustomWords(words) {
        await storageSet(STORAGE_KEY_CUSTOM, words);
    }

    // adds a word to the custom list - ignore duplicate, save them
    async function addCustomWord(word) {
        const normalized = word.trim().toLowerCase();
        if (!normalized) return getCustomWords();

        const current = await getCustomWords();
        if (current.includes(normalized)) return current;

        const updated = current.concat([normalized]);
        await saveCustomWords(updated);

        return updated;
    }

    async function removeCustomWord(word) {
        const current = await getCustomWords();
        const updated = current.filter((w) => w !== word);

        await saveCustomWords(updated);

        return updated;
    }

    async function getActiveWords() {
        const stored = await storageGet(STORAGE_KEY_ACTIVE);
        return Array.isArray(stored) ? stored : null;
    }

    async function rebuildActiveWords(baseWords) {
        const customWords = await getCustomWords();
        const merged = new Set();

        baseWords.forEach((w) => merged.add(w.trim().toLowerCase()));
        customWords.forEach((w) => merged.add(w.trim().toLowerCase()));

        const activeWords = Array.from(merged).filter(Boolean);
        await storageSet(STORAGE_KEY_ACTIVE, activeWords);

        return activeWords;
    }

    globalThis.WebsiFCustomBlocklist = {
        getCustomWords,
        saveCustomWords,
        addCustomWord,
        removeCustomWord,
        getActiveWords,
        rebuildActiveWords
    };
})();
