(function () {
    "use strict";

    const EXCLUDED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "OPTION"]);

    function getApi() {
        return (typeof chrome !== "undefined") ? chrome : browser;
    }

    function collectTextNodes() {
        const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
        const nodes = [];

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const parent = node.parentElement;

            if (!parent) continue;
            if (EXCLUDED_TAGS.has(parent.tagName)) continue;
            if (parent.isContentEditable) continue;

            const value = node.nodeValue;
            if (!value || !value.trim()) continue;

            nodes.push(node);
        }

        return nodes;
    }

    function roundMs(value) {
        return Number(value.toFixed(3));
    }

    async function runFilter(method) {
        const nodes = collectTextNodes();
        const texts = nodes.map((n) => n.nodeValue);

        const response = await new Promise((resolve, reject) => {
            const api = getApi();
            api.runtime.sendMessage({ type: "BACKGROUND_FILTER", method, texts }, (resp) => {
                if (api.runtime.lastError) 
                    reject(new Error(api.runtime.lastError.message));
                else if (!resp || !resp.ok) 
                    reject(new Error(resp ? resp.error : "background error"));
                else resolve(resp);
            });
        });

        let matchesFound = 0;

        for (let i = 0; i < response.updates.length; i += 1) {
            const u = response.updates[i];
            nodes[u.index].nodeValue = u.text;
            matchesFound += u.replacedCount;
        }

        return {
            ok: true,
            method,
            timing: {
                engineOnlyMs: 
                    roundMs(response.timing ? response.timing.engineOnlyMs : 0)
            },
            metrics: {
                matchesFound
            }
        };
    }

    function installListener() {
        const api = getApi();

        api.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!message) return;

            if (message.type === "RUN_FILTER") {
                runFilter(message.method)
                    .then((result) => sendResponse(result))
                    .catch((error) => sendResponse({
                        ok: false,
                        error: error && error.message ? error.message : "filter failed"
                    }));

                return true;
            }

            return false;
        });
    }

    installListener();
})();
