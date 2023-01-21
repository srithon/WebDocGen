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
await highlight(searchBarSelector, true);
await screenshot("Search bar");

await click(searchBarSelector);
```

## Clicking on suggestions
When you click on the search bar, Google gives you a list of suggestions that you can click on.

```javascript
const selector = "li.sbct:nth-child(1)";
await hover(selector);

const optionsSelector = ".UUbT9";
await highlight(optionsSelector, true);
await screenshot("Hovering over first item");
await unhighlight([optionsSelector, window.searchBarSelector], true);

click(selector, { newPage: true });
```

### Let's click on the first one!

{{div class="html-example"}}
```javascript
await screenshot("Result of clicking on first item");
```
{{/div}}
