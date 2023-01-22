---
url: https://google.com
---

> WebDocGen requires YAML frontmatter specifying a `url` parameter

# Intro

This is Google.
Google has a search bar in the middle of the screen.

> You can have things run in the browser using Javascript code blocks.
> Note that the `javascript` tag is required for WebDocGen to run them.
```javascript
const searchBarSelector = ".RNNXgb";
// to persist variables across code blocks, you can set them on `window`
window.searchBarSelector = searchBarSelector;

// `hover` is one of the exposed functions from puppeteer; given a selector, it
// will scroll it into view and hover over it
await hover(searchBarSelector);
// `withHighlight` is a custom function that performs an action while dimming the
// webpage, keeping the given selector visible. after `withHighlight` finishes
// running the action, it will undo the highlight. it takes the selector as the
// first parameter, the action to perform as the second, and an optional boolean
// parameter signalling if the background should be dark (true) or light (false)
// when dimming. it defaults to `false`
await withHighlight(
  searchBarSelector,
  async () => {
    // `screenshot` is a function that takes in Alt Text, screenshots the page in
    // its current state, writing a png file into the target directory, and
    // interpolates a link to the image within the output markdown file.
    await screenshot("Search bar");
  },
  // make the background dark instead of light
  true
);

// `click` is another puppeteer function that scrolls a selector into view and
// clicks on it.
await click(".gLFyf");
```

# Clicking on suggestions

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

// when clicking "within the page", like in the previous example, the click will
// happen immediately. however, when clicking into a new page (clicking on
// something that will go to another page), it will not get executed until after
// the code block ends, and so it should typically be at the end of the code
// block. notice that I omitted the await since it doesn't make a difference here.
click(selector, { newPage: true });
```

## Let's click on the first one!

> This is the syntax for adding HTML in the document. For technical details on
> why you can't just use angle brackets, see the source code, towards the end of
> the file. If you want to have literal double curly braces in the output, then
> use three instead of two. If you want three then use four, etc. If there is
> only one curly brace, it is untouched.

{{div class="html-example"}}

```javascript
await screenshot("Result of clicking on first item");
```

{{/div}}
