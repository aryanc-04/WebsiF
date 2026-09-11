(function () {
    "use strict";

    const MAX_BACKTRACK_DEPTH = 64;

    function createTrieNode() {
        return {
            children: Object.create(null),
            terminal: false
        };
    }

    // true if index starts a new word
    function isWordStart(lowerText, index) {
        const startIsWord = globalThis.WebsiFBoundary.isWordChar(lowerText[index]);
        const prevIsWord = index > 0 && globalThis.WebsiFBoundary.isWordChar(lowerText[index - 1]);
        return startIsWord && !prevIsWord;
    }

     // moves cursor past the rest of the current word
    function skipWord(lowerText, index) {
        let cursor = index;
        while (!globalThis.WebsiFBoundary.isBoundary(lowerText, cursor)) {
            cursor += 1;
        }
        return cursor;
    }


    function candidatesFor(ch) {
        return globalThis.WebsiFNormalizer.isSubstitutionKey(ch)
            ? globalThis.WebsiFNormalizer.getCandidates(ch)
            : [ch];
    }



    function scanWord(lowerText, root, startIndex) {
        let node = root;
        let cursor = startIndex;
        let digitCount = 0;
        let substitutionCount = 0;
        let stillOnTrie = true;

        while (!globalThis.WebsiFBoundary.isBoundary(lowerText, cursor)) {
            const ch = lowerText[cursor];

            if (globalThis.WebsiFNormalizer.isDigitSubstitution(ch)) 
                digitCount += 1;
            if (globalThis.WebsiFNormalizer.isSubstitutionKey(ch)) 
                substitutionCount += 1;

            if (stillOnTrie) {
                const child = node.children[ch];
                if (child) node = child;
                else stillOnTrie = false;
            }

            cursor += 1;
        }

        const matchEnd = (stillOnTrie && node.terminal) ? cursor : -1;
        return { matchEnd, digitCount, substitutionCount, wordEnd: cursor };
    }

    function matchFrom(lowerText, node, cursor, depth, digitCount) {
        if (depth > MAX_BACKTRACK_DEPTH) 
            return -1;

        if (globalThis.WebsiFBoundary.isBoundary(lowerText, cursor)) 
            return node.terminal ? cursor : -1;

        const rawChar = lowerText[cursor];
        let nextDigit = digitCount;

        if (globalThis.WebsiFNormalizer.isDigitSubstitution(rawChar)) {
            nextDigit += 1;
            if (nextDigit > globalThis.WebsiFNormalizer.MAX_DIGIT_SUBSTITUTIONS_PER_WORD) {
                return -1;
            }
        }

        const candidates = candidatesFor(rawChar);

        for (let i = 0; i < candidates.length; i += 1) {
            const child = node.children[candidates[i]];
            if (!child) continue;

            const result = 
                matchFrom(lowerText, child, cursor + 1, depth + 1, nextDigit);
            if (result !== -1) return result;
        }

        return -1;
    }


    function walkWordMatch(lowerText, startIndex, root) {
        const literal = scanWord(lowerText, root, startIndex);
        if (literal.matchEnd !== -1) 
            return literal.matchEnd;

        const tooManyDigits = literal.digitCount > globalThis.WebsiFNormalizer.MAX_DIGIT_SUBSTITUTIONS_PER_WORD;
        const hasSubstitutions = literal.substitutionCount > 0;

        if (tooManyDigits || !hasSubstitutions) return -1;
        return matchFrom(lowerText, root, startIndex, 0, 0);
    }



    function buildTrie(words) {
        const root = createTrieNode();
        if (!Array.isArray(words)) return { trie: root };

        words.forEach((word) => {
            const lowerWord = word.toLowerCase();
            let node = root;

            for (let index = 0; index < lowerWord.length; index += 1) {
                const char = lowerWord[index];
                if (!node.children[char]) {
                    node.children[char] = createTrieNode();
                }
                node = node.children[char];
            }

            node.terminal = true;
        });

        return { trie: root };
    }

    function filterTextWithTrie(text, prepared) {
        if (!prepared || !prepared.trie) {
            return { text, replacedCount: 0 };
        }

        // scan the lowercase copy bt keep original thing for  output
        const lowerText = text.toLowerCase();
        const root = prepared.trie;

        let output = "";
        let index = 0;
        let lastCopyIndex = 0;
        let replacedCount = 0;

        while (index < lowerText.length) {
            if (!isWordStart(lowerText, index)) {
                index += 1;
                continue;
            }

            const matchEnd = walkWordMatch(lowerText, index, root);

            if (matchEnd !== -1) {
                output += text.substring(lastCopyIndex, index);
                output += globalThis.WebsiFMask.maskMatch();
                replacedCount += 1;
                index = matchEnd;
                lastCopyIndex = index;
            } else {
                index = skipWord(lowerText, index + 1);
            }
        }

        if (replacedCount === 0) {
            return { text, replacedCount: 0 };
        }

        output += text.substring(lastCopyIndex);
        return { text: output, replacedCount };
    }

    globalThis.WebsiFTrieEngine = {
        buildTrie,
        filterTextWithTrie
    };
})();