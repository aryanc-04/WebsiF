importScripts(
    "src/engines/normalizer.js",
    "src/utils/textBoundary.js",
    "src/engines/trieEngine.js",
    "src/engines/regexEngine.js",
    "src/utils/mask.js",
    "src/blocklist/loadBlocklist.js",
    "src/blocklist/customBlocklist.js"
);

const api = (typeof chrome !== "undefined") ? chrome : browser;

// picks the word list filtering should run against
// active list (base + custom, from the last rebuild) if it exists,
// otherwise we just fall back to the base blocklist on its own

async function getWordsForFiltering() {
    const active = await globalThis.WebsiFCustomBlocklist.getActiveWords();
    if (active && active.length) return active;

    const base = await globalThis.WebsiFBlocklist.loadBlocklist();
    return base.words;
}

async function handleFilterMessage(message) {
    const words = await getWordsForFiltering();

    let prepared;
    if (message.method === "trie") 
           prepared = globalThis.WebsiFTrieEngine.buildTrie(words);
    else prepared = globalThis.WebsiFRegexEngine.buildRegexEngine(words);

    const updates = [];
    let engineOnlyMs = 0;

    for (let i = 0; i < message.texts.length; i += 1) {
        const original = message.texts[i];
        const engineStart = performance.now();

        let result;
        if (message.method === "trie") 
                result = globalThis.WebsiFTrieEngine.
                            filterTextWithTrie(original, prepared);
        else result = globalThis.WebsiFRegexEngine.
                            filterTextWithRegex(original, prepared);

        engineOnlyMs += performance.now() - engineStart;

        if (result.replacedCount > 0) {
            updates.push({
                index: i,
                text: result.text,
                replacedCount: result.replacedCount
            });
        }
    }

    return {
        ok: true,
        updates,
        timing: { engineOnlyMs }
    };
}

async function handleUpdateListMessage() {
    const base = await globalThis.WebsiFBlocklist.loadBlocklist();
    const activeWords = await globalThis.WebsiFCustomBlocklist.rebuildActiveWords(base.words);

    return {
        ok: true,
        wordCount: activeWords.length
    };
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "BACKGROUND_FILTER") {
        handleFilterMessage(message)
            .then(sendResponse)
            .catch((error) => sendResponse({ ok: false, error: error.message }));

        return true;
    }

    if (message.type === "UPDATE_LIST") {
        handleUpdateListMessage()
            .then(sendResponse)
            .catch((error) => sendResponse({ ok: false, error: error.message }));

        return true;
    }

    return false;
});
