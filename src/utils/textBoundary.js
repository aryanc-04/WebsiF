(function () {
    "use strict";

    function isAsciiWordCode(code) {
        return (code >= 97 && code <= 122) 
            || (code >= 48 && code <= 57) || code === 95;
    }

    function isWordChar(ch) {
        if (!ch) return false;
        const code = ch.charCodeAt(0);
        if (isAsciiWordCode(code)) return true;
        if (code < 128 && code !== 64 && code !== 36 && code !== 43) return false;
        return globalThis.WebsiFNormalizer.isSubstitutionKey(ch);
    }
    

    function isBoundary(lowerText, index) {
        if (index >= lowerText.length) return true;
        return !isWordChar(lowerText[index]);
    }

    globalThis.WebsiFBoundary = {
        isWordChar,
        isBoundary
    };
})();