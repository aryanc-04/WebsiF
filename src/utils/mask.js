(function () {
    "use strict";

    const BLOCK_SYMBOL = "█";

    function maskMatch() {
        return BLOCK_SYMBOL;
    }

    globalThis.WebsiFMask = {
        BLOCK_SYMBOL,
        maskMatch
    };
})();
