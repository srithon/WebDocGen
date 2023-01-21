---
url: https://google.com
---

# Intro

This is Google.
Google has a search bar in the middle of the screen.

```javascript
const searchBarSelector = ".RNNXgb";
window.searchBarSelector = searchBarSelector;

await hover(searchBarSelector);
await withHighlight(
  searchBarSelector,
  async () => {
    await screenshot("Search bar");
  },
  // make the background dark instead of light
  true
);

await click(searchBarSelector);
```

## Clicking on suggestions

When you click on the search bar, Google gives you a list of suggestions that you can click on.

```javascript
const selector = "li.sbct:nth-child(1)";
await hover(selector);

const optionsSelector = ".UUbT9";
await withHighlight(
  // we can highlight multiple selectors at once
  [optionsSelector, window.searchBarSelector],
  // this returns the promise, which is effectively the same as the previous
  // async/await example with withHighlight.
  () => screenshot("Hovering over first item"),
  true
);

// when clicking into a new page, it should typically be at the end of the code
// block since it will not get executed until after the code block ends.
// notice that I omitted the await since it doesn't make a difference here.
click(selector, { newPage: true });
```

### Let's click on the first one!

<!--
this is the syntax for adding HTML in the document. for technical details on
why you can't just use angle brackets, see the source code, towards the end of
the file. if you want to have literal double curly braces in the output, then
use three instead of two. if you want three then use four, etc. if there is
only one curly brace, it is untouched.
-->
{{div class="html-example"}}

```javascript
await screenshot("Result of clicking on first item");
```

{{/div}}
