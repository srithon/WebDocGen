import { ArgumentParser } from "argparse";
import { promises as fs } from "fs";
import * as puppeteer from "puppeteer";

const frontMatter = require("front-matter");
import { marked } from "marked";
import { strict as assert } from "assert";

interface Arguments {
  markdownFile: string;
  targetDir: string;
  viewport?: string;
}

// first, CLI
const parser = new ArgumentParser();
parser.add_argument("markdownFile", {
  type: "str",
  help: "The markdown file to process",
});
parser.add_argument("targetDir", {
  type: "str",
  help: "The directory to output the markdown and screenshots",
});
parser.add_argument("--viewport", {
  type: "str",
  help: "The width, height and device scale factor of the viewport for taking screenshots: '<WIDTH>x<HEIGHT>[x<SCALE_FACTOR>]'. If unspecified, the scale factor will default to 1. Note that the scale factor effectively acts as a zoom, and so doubling the width and height has a different effect than doubling the scale factor.",
  required: false,
});

(async () => {
  const args: Arguments = parser.parse_args();

  if (args.markdownFile === undefined) {
    console.log("Please pass in a markdownFile parameter!");
    process.exit(1);
  }

  // first, let's read the file
  const data = await fs.readFile(args.markdownFile, "utf8");

  const { body: markdown, attributes } = frontMatter(data);

  if (!("url" in attributes)) {
    console.log(
      `Please add YAML frontmatter to ${args.markdownFile} with a "url" parameter.`
    );
    process.exit(1);
  }

  const baseURL = attributes.url;

  const tokens = marked.lexer(markdown);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  if (args.viewport) {
    // https://raddevon.com/articles/cant-use-parseint-map-javascript/
    // It turns out that `map` passes 3 arguments into the callable: the value, the index and the Array.
    // since parseInt takes in an optional radix parameter, the index was being passed in for the radix andd it was resulting in the height not being parsed properly
    let [width, height, deviceScaleFactor] = args.viewport
      .split("x")
      .map((n) => parseInt(n));

    await page.setViewport({
      width,
      height,
      deviceScaleFactor: deviceScaleFactor || 1,
    });
  }

  await page.goto(baseURL);

  const makeImageLink = (href: string, altText: string) => {
    return `![${altText}](${href})\n`;
  };

  let result = "";
  const screenshot = async (altText: string) => {
    const imagePath = `${args.targetDir}/screenshot-${currentCodeBlock}.png`;
    console.log(`Screenshotting to ${imagePath}`);
    const screenShotRes = await page.screenshot();
    await fs.writeFile(imagePath, screenShotRes, { encoding: "binary" });
    result += makeImageLink(imagePath, altText);
  };

  const reset = async () => {
    await page.goto(baseURL);
  };

  // echo browser console to terminal
  page.on("console", (msg) => console.log(msg.text()));

  // my mistake was not realizing that these were promises, so I didn't await
  // them
  let usefulPageFunctions = ["screenshot", "reset"];
  await page.exposeFunction("screenshot", screenshot);
  await page.exposeFunction("reset", reset);

  // expose some useful functions from puppeteer so they can be used from the
  // document code
  for (const func of ["click", "select", "hover"]) {
    usefulPageFunctions.push(func);
    await page.exposeFunction(func, (selector: string) =>
      (page as any)[func](selector)
    );
  }

  usefulPageFunctions.push("waitForNavigation");
  await page.exposeFunction("waitForNavigation", () =>
    page.waitForNavigation()
  );

  // put them in global scope for convenience
  for (const exposedFunction of usefulPageFunctions) {
    await page.evaluate(`var ${exposedFunction} = window.${exposedFunction}`);
  }

  let currentCodeBlock = 0;
  for (const token of tokens) {
    if ("type" in token) {
      const type = token.type;
      if (type === "code" && token.lang === "javascript") {
        // first, let's wrap the code in a function that takes in `WebDocGen`.
        // note that the text itself does not get evaluated.
        const arrowFunc = eval("async () => {\n" + token.text + "\n}");
        await page.evaluate(arrowFunc);

        currentCodeBlock += 1;
      } else {
        result += token.raw;
      }
    }
  }

  // finally, write result markdown file
  await fs.writeFile(`${args.targetDir}/output.md`, result, {
    encoding: "utf8",
  });

  await page.close();
  await browser.close();
})();
