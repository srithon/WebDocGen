import { ArgumentParser } from "argparse";
import { promises as fs } from "fs";
import * as puppeteer from "puppeteer";

const frontMatter = require("front-matter");
import { marked } from "marked";
import { strict as assert } from "assert";

interface Arguments {
  markdownFile: string;
  targetDir: string;
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
  console.log(tokens);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(baseURL);

  // run the code, passing in a handle to a WebDocGen interface
  interface WebDocGen {
    // yield screenshot of current viewport in output
    screenshot: (altText: string) => Promise<void>;
    // go back to original URL
    reset: () => Promise<void>;
  }

  const makeImageLink = (href: string, altText: string) => {
    return `![${altText}](${href})\n`;
  };

  const webDocGen: WebDocGen = {
    screenshot: async (altText: string) => {
      const imagePath = `${args.targetDir}/screenshot-${currentCodeBlock}.png`;
      console.log(`Screenshotting to ${imagePath}`);
      const screenShotRes = await page.screenshot();
      await fs.writeFile(imagePath, screenShotRes, { encoding: "binary" });
      result += makeImageLink(imagePath, altText);
    },
    reset: async () => {
      await page.goto(baseURL);
    },
  };

  // echo browser console to terminal
  page.on("console", (msg) => console.log(msg.text()));

  // my mistake was not realizing that these were promises, so I didn't await
  // them
  await page.exposeFunction("screenshot", webDocGen.screenshot);
  await page.exposeFunction("reset", webDocGen.reset);

  // expose some useful functions from puppeteer so they can be used from the
  // document code
  let usefulPageFunctions = ["click", "select", "hover"];
  for (const func of usefulPageFunctions) {
    await page.exposeFunction(func, (selector: string) =>
      (page as any)[func](selector)
    );
  }

  usefulPageFunctions.push("waitForNavigation");
  await page.exposeFunction("waitForNavigation", () =>
    page.waitForNavigation()
  );

  // put them in global scope for convenience
  for (const exposedFunction of usefulPageFunctions.concat([
    "screenshot",
    "reset",
  ])) {
    await page.evaluate(`var ${exposedFunction} = window.${exposedFunction}`);
  }

  let currentCodeBlock = 0;
  let result = "";
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
