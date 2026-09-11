(function () {
    "use strict";

    const elements = {
        method: document.getElementById("method"),
        filterButton: document.getElementById("filterButton"),
        pinButton: document.getElementById("pinButton"),
        reloadButton: document.getElementById("reloadButton"),
        blocklistButton: document.getElementById("blocklistButton"),
        status: document.getElementById("status"),
        metricEngineOnly: document.getElementById("metricEngineOnly"),
        metricMatches: document.getElementById("metricMatches")
    };

    function setStatus(text) {
        elements.status.textContent = text;
    }

    function isExtensionPageUrl(url) {
        if (!url) return false;

        const api = (typeof chrome !== "undefined") ? chrome : browser;
        const extensionRoot = api.runtime.getURL("");
        return url.startsWith(extensionRoot);
    }

    function isSupportedTabUrl(url) {
        if (!url) return false;
        return /^(https?:|file:)/i.test(url);
    }

    function pickMostRecentPageTab(tabs) {
        const candidates = tabs.filter((tab) => (
            typeof tab.id === "number"
            && isSupportedTabUrl(tab.url)
            && !isExtensionPageUrl(tab.url)
        ));

        if (!candidates.length) return null;

        const sorted = candidates
            .slice()
            .sort((a, b) => (Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0)));

        return sorted[0] || candidates[0];
    }

    function queryTabs(queryInfo) {
        return new Promise((resolve, reject) => {
            const api = (typeof chrome !== "undefined") ? chrome : browser;
            api.tabs.query(queryInfo, (tabs) => {
                if (api.runtime.lastError) {
                    reject(new Error(api.runtime.lastError.message));
                    return;
                }

                resolve(Array.isArray(tabs) ? tabs : []);
            });
        });
    }

    function toMs(value) {
        return `${Number(value).toFixed(3)} ms`;
    }

    function updateMetrics(result) {
        elements.metricEngineOnly.textContent = toMs(result.timing.engineOnlyMs);
        elements.metricMatches.textContent = String(result.metrics.matchesFound);
    }

    async function getActiveTab() {
        const activeCurrent = await queryTabs({ active: true, currentWindow: true });
        const first = activeCurrent[0];

        if (first && typeof first.id === "number" && isSupportedTabUrl(first.url) && !isExtensionPageUrl(first.url)) {
            return first;
        }

        const allTabs = await queryTabs({});
        const fallback = pickMostRecentPageTab(allTabs);

        if (fallback) return fallback;

        throw new Error("open a regular http(s) or file page, then try again");
    }

    function isMissingReceiverError(message) {
        return /receiving end does not exist|could not establish connection/i.test(String(message || ""));
    }

    function ensureContentScript(tabId) {
        return new Promise((resolve, reject) => {
            const api = (typeof chrome !== "undefined") ? chrome : browser;

            if (api.scripting && api.scripting.executeScript) {
                api.scripting.executeScript({
                    target: { tabId },
                    files: ["src/content.js"]
                }, () => {
                    if (api.runtime.lastError) {
                        reject(new Error(api.runtime.lastError.message));
                        return;
                    }

                    resolve();
                });
                return;
            }

            // fallback for firefox mv2
            if (api.tabs && api.tabs.executeScript) {
                api.tabs.executeScript(tabId, { file: "src/content.js" }, () => {
                    if (api.runtime.lastError) {
                        reject(new Error(api.runtime.lastError.message));
                        return;
                    }

                    resolve();
                });
                return;
            }

            reject(new Error("content script injection is not supported in this browser"));
        });
    }

    function sendMessageToTab(tabId, message) {
        return new Promise((resolve, reject) => {
            const api = (typeof chrome !== "undefined") ? chrome : browser;
            api.tabs.sendMessage(tabId, message, (response) => {
                if (api.runtime.lastError) {
                    reject(new Error(api.runtime.lastError.message));
                    return;
                }

                if (!response) {
                    reject(new Error("no response from content script"));
                    return;
                }

                resolve(response);
            });
        });
    }

    async function sendRunMessage(tabId, method) {
        try {
            return await sendMessageToTab(tabId, { type: "RUN_FILTER", method });
        } catch (error) {
            if (!isMissingReceiverError(error && error.message)) throw error;

            await ensureContentScript(tabId);
            return sendMessageToTab(tabId, { type: "RUN_FILTER", method });
        }
    }

    async function openPinnedPopup() {
        if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.open) {
            const tab = await getActiveTab();
            await chrome.sidePanel.open({ windowId: tab.windowId });
            return;
        }

        return new Promise((resolve, reject) => {
            const api = (typeof chrome !== "undefined") ? chrome : browser;
            const popupUrl = api.runtime.getURL("popup/popup.html");
            const createData = {
                url: popupUrl,
                type: "popup",
                width: 420,
                height: 620
            };

            if (typeof chrome !== "undefined" && chrome.windows && chrome.windows.create) {
                chrome.windows.create(createData, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    resolve();
                });
                return;
            }

            if (api.windows && api.windows.create) {
                api.windows.create(createData)
                    .then(() => resolve())
                    .catch((error) => reject(error));
                return;
            }

            reject(new Error("pinning is not supported in this browser"));
        });
    }

    async function runFilterFromPopup() {
        elements.filterButton.disabled = true;
        const method = elements.method.value;

        setStatus(`running ${method}...`);

        try {
            const tab = await getActiveTab();
            const result = await sendRunMessage(tab.id, method);

            if (!result.ok) throw new Error(result.error || "filter failed");

            updateMetrics(result);
            setStatus(`completed with ${result.method}`);
        } catch (error) {
            setStatus(`error: ${error.message}`);
        } finally {
            elements.filterButton.disabled = false;
        }
    }

    async function pinPopupWindow() {
        elements.pinButton.disabled = true;
        setStatus("opening pinned view...");

        try {
            await openPinnedPopup();
            setStatus("pinned view opened");
            window.close();
        } catch (error) {
            setStatus(`error: ${error.message}`);
            elements.pinButton.disabled = false;
        }
    }

    async function reloadCurrentPage() {
        elements.reloadButton.disabled = true;
        setStatus("reloading...");

        try {
            const tab = await getActiveTab();
            const api = (typeof chrome !== "undefined") ? chrome : browser;

            await new Promise((resolve, reject) => {
                api.tabs.reload(tab.id, {}, () => {
                    if (api.runtime.lastError) {
                        reject(new Error(api.runtime.lastError.message));
                        return;
                    }

                    resolve();
                });
            });

            setStatus("page reloaded");
        } catch (error) {
            setStatus(`error: ${error.message}`);
        } finally {
            elements.reloadButton.disabled = false;
        }
    }

    function openBlocklistPage() {
        const api = (typeof chrome !== "undefined") ? chrome : browser;

        // openOptionsPage is the mv3 way, but fall back to a plain tab just in case
        if (api.runtime.openOptionsPage) {
            api.runtime.openOptionsPage();
            return;
        }

        api.tabs.create({ url: api.runtime.getURL("options/options.html") });
    }

    elements.filterButton.addEventListener("click", runFilterFromPopup);
    elements.pinButton.addEventListener("click", pinPopupWindow);
    elements.reloadButton.addEventListener("click", reloadCurrentPage);
    elements.blocklistButton.addEventListener("click", openBlocklistPage);
})();
