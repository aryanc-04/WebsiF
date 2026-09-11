(function () {
    "use strict";

    // load and store the base list
    let cachedWords = null;

    async function loadBlocklist() {
        if (cachedWords) {
            return { words: cachedWords };
        }

        const runtimeApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : chrome.runtime;
        const url = runtimeApi.getURL("assets/blocklist.txt");
        const response = await fetch(url);

        if (!response.ok) throw new Error("failed to load blocklist");

        const text = await response.text();
        const set = new Set();

        text.split(/\r?\n/).forEach((line) => {
            const normalized = line.trim().toLowerCase();
            if (normalized) set.add(normalized);
        });

        cachedWords = Array.from(set);

        return { words: cachedWords };
    }

    globalThis.WebsiFBlocklist = {
        loadBlocklist
    };
})();
