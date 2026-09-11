# WebsiF

A browser extension that filters inappropriate text on web pages. It scans the visible text on a page, checks it against a blocklist of words, and masks anything that matches.

## Why

Most word filter extensions do one of two things: they either rely on regex/keyword matching that's slow once your blocklist gets big, or they don't tell you anything about how they work at all (no source, no idea what's happening to the page content). I wanted something that's open, fast, and doesn't just fall over as the blocklist grows.

That's the main thing WebsiF tries to do differently: instead of matching words with regex, it builds a trie (prefix tree) out of the blocklist and walks the page text against that. A regex alternation (`word1|word2|word3|...`) has to check against more alternatives as the list grows, so matching cost scales with the size of the blocklist. A trie doesn't have that problem, a lookup only depends on the length of the word being checked, not on how many words are stored in the trie. It was tested with a 10,000+ word blocklist on my machine and the trie came out roughly 3.5x faster on average than the regex engine. The exact numbers will differ on other hardware, but the trie should stay ahead of regex by a growing margin as the blocklist gets bigger, due to the algorithmic difference.

## How it works

1. `src/content.js` runs on every page and walks the DOM text nodes (skipping scripts, inputs, textareas etc).
2. That text gets sent to the background service worker.
3. The background worker builds a trie from the current blocklist, checks each chunk of text against it, and sends back any replacements.
4. The content script writes the replacements back into the page, so matched words show up as a block character (█) instead of the original text.

### Catching obfuscated words

People don't usually type banned words plainly, they swap letters for numbers or use lookalike characters. `normalizer.js` handles this by mapping common substitutions back to their original letter before matching:

- digits: `0`→o, `1`→i/l, `3`→e, `4`→a, `5`→s, `7`→t, and a few more
- symbols: `@`→a, `$`→s, `+`→t
- a set of Cyrillic and accented Latin characters that look like Latin letters (а→a, é→e, etc)

Work In Progress: There's currently a cap of 7 digit substitutions per word so the current solution to obfuscation don't degrade to poor performance on hude words.

## Project structure

```
manifest.json                MV3 manifest
scripts.js                   service worker entry point
background.js                handles messages, runs the filter, rebuilds the blocklist
src/
  content.js                 injected into pages, collects text and applies masks
  engines/
    regexEngine.js           regex based filter
    trieEngine.js             trie based filter
    normalizer.js             leetspeak / homoglyph substitution table
  blocklist/
    loadBlocklist.js          loads assets/blocklist.txt
    customBlocklist.js        user added words, stored with chrome.storage.local
  utils/
    mask.js                   returns the mask character
    textBoundary.js           word boundary checks used by the trie engine
popup/                        popup UI, pick a method and run the filter
options/                      page for adding/removing custom blocklist words
assets/blocklist.txt          base word list
test-page.html                sample page with clean, toxic, and obfuscated text for manual testing
```

## Running it

1. Clone this repo.
2. Open `chrome://extensions` (or the equivalent for your browser).
3. Turn on developer mode.
4. Click "Load unpacked" and select the project folder.
5. Open any page, click the extension icon, pick regex or trie, and hit "Filter current page."

To add your own words to the blocklist, open the popup and click "Manage blocklist." Add words there and click "Update List" for them to actually apply.


