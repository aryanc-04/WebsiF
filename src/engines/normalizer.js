(function () {
    "use strict";

    const MAX_DIGIT_SUBSTITUTIONS_PER_WORD = 5;
    const SUBSTITUTION_MAP = Object.create(null);

    // digits
    SUBSTITUTION_MAP["0"] = ["o"];
    SUBSTITUTION_MAP["1"] = ["i", "l"];
    SUBSTITUTION_MAP["2"] = ["z", "r"];
    SUBSTITUTION_MAP["3"] = ["e"];
    SUBSTITUTION_MAP["4"] = ["a"];
    SUBSTITUTION_MAP["5"] = ["s"];
    SUBSTITUTION_MAP["6"] = ["g", "b"];
    SUBSTITUTION_MAP["7"] = ["t", "l"];
    SUBSTITUTION_MAP["8"] = ["b"];
    SUBSTITUTION_MAP["9"] = ["g", "q"];

    // alternative characters
    SUBSTITUTION_MAP["@"] = ["a"];
    SUBSTITUTION_MAP["$"] = ["s"];
    SUBSTITUTION_MAP["+"] = ["t"];
    SUBSTITUTION_MAP["\u0430"] = ["a"]; // а
    SUBSTITUTION_MAP["\u0435"] = ["e"]; // е
    SUBSTITUTION_MAP["\u043E"] = ["o"]; // о
    SUBSTITUTION_MAP["\u0440"] = ["p"]; // р
    SUBSTITUTION_MAP["\u0441"] = ["c"]; // с
    SUBSTITUTION_MAP["\u0443"] = ["y"]; // у
    SUBSTITUTION_MAP["\u0445"] = ["x"]; // х
    SUBSTITUTION_MAP["\u00e1"] = ["a"]; // á
    SUBSTITUTION_MAP["\u00e0"] = ["a"]; // à
    SUBSTITUTION_MAP["\u00e4"] = ["a"]; // ä
    SUBSTITUTION_MAP["\u00e9"] = ["e"]; // é
    SUBSTITUTION_MAP["\u00e8"] = ["e"]; // è
    SUBSTITUTION_MAP["\u00eb"] = ["e"]; // ë
    SUBSTITUTION_MAP["\u00ed"] = ["i"]; // í
    SUBSTITUTION_MAP["\u00f3"] = ["o"]; // ó
    SUBSTITUTION_MAP["\u00f6"] = ["o"]; // ö
    SUBSTITUTION_MAP["\u00fa"] = ["u"]; // ú
    SUBSTITUTION_MAP["\u00fc"] = ["u"]; // ü
    SUBSTITUTION_MAP["\u00f1"] = ["n"]; // ñ
    SUBSTITUTION_MAP["\u00e7"] = ["c"]; // ç


    // for tracking wordChar in utils textBoundary
    const SUBSTITUTION_KEY_SET = new Set(Object.keys(SUBSTITUTION_MAP));



    function isDigitSubstitution(ch) {
        if (!ch) return false;
        const code = ch.charCodeAt(0);
        return code >= 48 && code <= 57;
    }

    function isSubstitutionKey(ch) {
        if (!ch) return false;
        return SUBSTITUTION_KEY_SET.has(ch);
    }

    function getCandidates(ch) {
        if (SUBSTITUTION_MAP[ch]) return SUBSTITUTION_MAP[ch];
        return [ch];
    }

    function normalizeHomoglyphs(text) {
        let out = "";
        for (let i = 0; i < text.length; i += 1) {
            const ch = text[i];
            const candidates = SUBSTITUTION_MAP[ch];
            const nonDigit = candidates && candidates.length === 1 && !isDigitSubstitution(ch);
            out += nonDigit ? candidates[0] : ch;
        }
        return out;
    }

    globalThis.WebsiFNormalizer = {
        MAX_DIGIT_SUBSTITUTIONS_PER_WORD,
        isDigitSubstitution,
        isSubstitutionKey,
        getCandidates,
        normalizeHomoglyphs
    };
})();