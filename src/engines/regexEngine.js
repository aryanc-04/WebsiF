(function () {
    "use strict";

    // regex has a limit on how many alternatives it likes in one pattern
    // so we split the word list into chunks and run each chunk separately
    const REGEX_CHUNK_SIZE = 450;

    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function buildChunkPattern(words) {
        return words.map(escapeRegex).join("|");
    }

    function buildRegexEngine(words) {
        const chunks = [];

        for (let index = 0; index < words.length; index += REGEX_CHUNK_SIZE) {
            chunks.push(words.slice(index, index + REGEX_CHUNK_SIZE));
        }

        const patterns = chunks.map((chunk) => {
            const pattern = buildChunkPattern(chunk);
            return new RegExp(`(^|[^A-Za-z0-9_])(${pattern})(?=$|[^A-Za-z0-9_])`, "gi");
        });

        return {
            patterns
        };
    }

    function filterTextWithRegex(text, prepared) {
        let updatedText = text;
        let replacedCount = 0;

        prepared.patterns.forEach((pattern) => {
            updatedText = updatedText.replace(pattern, (fullMatch, prefix) => {
                replacedCount += 1;
                return `${prefix}${globalThis.WebsiFMask.maskMatch()}`;
            });
        });

        return {
            text: updatedText,
            replacedCount
        };
    }

    globalThis.WebsiFRegexEngine = {
        buildRegexEngine,
        filterTextWithRegex
    };
})();
