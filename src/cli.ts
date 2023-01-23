import { ArgumentParser, BooleanOptionalAction } from "argparse";
import { promises as fs } from "fs";
import * as path from "path";
import * as puppeteer from "puppeteer";

const frontMatter = require("front-matter");
import { marked } from "marked";
import { strict as assert } from "assert";

import { substituteDoubleCurliesForAngleBrackets } from "./util";
import * as yaml from "js-yaml";

const Walk = require("@root/walk");

enum FrontMatterOptions {
  Omit = "Omit",
  Keep = "Keep",
  KeepWithoutURL = "KeepWithoutURL",
}

interface Arguments {
  singleFile?: string;
  srcDir?: string;
  targetDir: string;
  viewport?: string;
  frontMatter?: FrontMatterOptions;
  url?: string;
  headful?: boolean;
  outputMarkdownFilename?: string;
  initMarkdownFile?: string;
}

// first, CLI
const parser = new ArgumentParser();

parser.add_argument("targetDir", {
  type: "str",
  help: "The directory to output the markdown and screenshots",
});

const srcGroup = parser.add_mutually_exclusive_group({ required: true });
srcGroup.add_argument("--singleFile", {
  type: "str",
  help: "A single markdown file to process",
});
srcGroup.add_argument("--srcDir", {
  type: "str",
  help: "The directory structure to mirror onto `targetDir`. WebDocGen will compile every markdown file in `srcDir` and its descendants into a corresponding file in `targetDir`. Note that `srcDir` and `targetDir` cannot match. Unless `--outputMarkdownFilename` is specified, the output markdown files will retain their names.",
});

parser.add_argument("--viewport", {
  type: "str",
  help: "The width, height and device scale factor of the viewport for taking screenshots: '<WIDTH>x<HEIGHT>[x<SCALE_FACTOR>]'. If unspecified, the scale factor will default to 1. Note that the scale factor effectively acts as a zoom, and so doubling the width and height has a different effect than doubling the scale factor.",
  required: false,
});
parser.add_argument("--frontMatter", {
  type: "str",
  help: "Allows customization of what to do with the frontmatter in the output.",
  choices: Object.values(FrontMatterOptions),
});
parser.add_argument("--url", {
  type: "str",
  help: "If specified, foregoes the frontmatter requirement, overriding the frontmatter's `webdocgen-url` value if specified.",
  required: false,
});
parser.add_argument("--headful", {
  help: "If headful, displays the Chromium browser instance. By default, runs headless",
  required: false,
  action: BooleanOptionalAction,
});
parser.add_argument("--outputMarkdownFilename", {
  type: "str",
  help: "Overrides the default `output.md` filename for the created file.",
  required: false,
});
parser.add_argument("--initMarkdownFile", {
  type: "str",
  help: "If specified, executes the given Markdown file without compiling it before compiling the main document(s). This can be useful to log into a website, for example.",
  required: false,
});

(async () => {
  const args: Arguments = parser.parse_args();

  // first, make sure we have access to `targetDir`
  await fs.mkdir(args.targetDir).catch((err) => {
    // if the directory already exists, then make sure we can access it.
    // if we are doing multiple files then the target directory should not exist.
    if (err.code === "EEXIST" && args.singleFile) {
      return fs.access(
        args.targetDir,
        // access
        fs.constants.F_OK |
          // read
          fs.constants.R_OK |
          // write
          fs.constants.W_OK |
          // execute
          fs.constants.X_OK
      );
    } else {
      throw err;
    }
  });

  const initPage = async () => {
    await page.addStyleTag({
      // need to back out of directory because our typescript is being compiled
      // into javascript in the /lib directory
      content: (
        await fs.readFile(path.join(__dirname, "../src/injected_styles.css"))
      ).toString("utf8"),
    });

    await page.evaluate(
      (
        await fs.readFile(path.join(__dirname, "./injected_js.js"))
      ).toString("utf8")
    );
  };

  // have a single `result` variable that gets cleared each time
  let result = "";
  let baseURL = args.url;
  let currentCodeBlock = 0;
  let targetDir = args.targetDir;
  let taskQueue: (() => Promise<any>)[] = [];
  const compileSingleFile = async (
    inputFilename: string,
    screenshotTargetDir: string
  ) => {
    // first, let's read the file
    const data = await fs.readFile(inputFilename, "utf8");

    const { body: markdown, attributes, frontmatter } = frontMatter(data);

    const getBaseURL = () => {
      let baseURL = args.url;
      if (!baseURL) {
        if ("webdocgen-url" in attributes) {
          baseURL = attributes!["webdocgen-url"];
        } else {
          console.log(
            `Please add YAML frontmatter to ${args.singleFile} with a "webdocgen-url" parameter.`
          );

          process.exit(1);
        }
      }

      return baseURL;
    };

    // assert that it is none-null
    const baseURL = getBaseURL()!;

    // if it's null that means that we went to the same page, in which case you
    // don't have to reinit.
    if ((await page.goto(baseURL)) !== null) await initPage();

    if (args.frontMatter === FrontMatterOptions.KeepWithoutURL) {
      // then, remove `webdocgen-url` and remake YAML
      delete attributes["webdocgen-url"];
    }

    const tokens = marked.lexer(markdown);

    result = "";
    // don't create YAML if there are no attributes; it would just be empty then
    if (
      Object.keys(attributes).length &&
      args.frontMatter !== FrontMatterOptions.Omit
    ) {
      // recreate the YAML fences since the `frontmatter` field is only the inner text.
      result += "---\n";

      result += yaml.dump(attributes);

      result += "---\n";
    }

    for (const token of tokens) {
      if ("type" in token) {
        const type = token.type;
        if (type === "code" && token.lang === "javascript") {
          // wrap in an async function so that we can use `await` without getting
          // the "can't use await here" error.
          const arrowFunc = eval("async () => {\n" + token.text + "\n}");

          await page.evaluate(arrowFunc);

          // now, go through the task queue
          // NOTE: empty arrays are truthy
          while (taskQueue.length) {
            let nextTask = taskQueue.pop();
            await nextTask!();
          }

          currentCodeBlock += 1;
        } else {
          // as the name suggests, this function will transform {{foo}} for
          // <foo>; see the function's documentation for specific rules. this is
          // necessary because we need Marked to parse the codeblocks so we can
          // run them, but if it sees an HTML opening tag then everything between
          // that and its corresponding closing tag will be parsed as plain text
          // within an "html" element. therefore, we ask that users use double
          // curly braces instead of angle brackets when writing HTML in their
          // Markdown input files, so that Marked will not interpret them as html
          // tags, and will instead lump them in with regular text. then, we
          // process that "regular text" and replace the user-provided curly
          // braces with angle brackets so that in the output it will be parsed
          // as HTML.
          result += substituteDoubleCurliesForAngleBrackets(token.raw);
        }
      }
    }

    return result;
  };

  const browser = await puppeteer.launch({ headless: !args.headful });
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

  const makeImageLink = (href: string, altText: string) => {
    return `![${altText}](${href})\n`;
  };

  const screenshot = async (altText: string) => {
    const imagePath = `${targetDir}/screenshot-${currentCodeBlock}.png`;
    console.log(`Screenshotting to ${imagePath}`);
    const screenShotRes = await page.screenshot();
    await fs.writeFile(imagePath, screenShotRes, { encoding: "binary" });
    result += makeImageLink(imagePath, altText);
  };

  const reset = async () => {
    if (baseURL) await page.goto(baseURL);
  };

  interface ClickOptions {
    newPage?: boolean;
    waitForSelector?: string;
  }

  const click = async (selector: string, options?: ClickOptions) => {
    if (options && options.newPage) {
      // then, we have to execute this OUTSIDE of the context of the browser.
      // otherwise, we will get "Execution context was destroyed, most likely because of a navigation."
      // add the task to the queue
      taskQueue.push(() => {
        return Promise.all([
          click(selector),
          options.waitForSelector
            ? page.waitForSelector(options.waitForSelector)
            : page.waitForNavigation({ waitUntil: ["domcontentloaded"] }),
        ]);
      });
    } else {
      return Promise.all([
        options && options.waitForSelector
          ? page.waitForSelector(options.waitForSelector)
          : Promise.resolve(undefined),
        page.click(selector),
      ]);
    }
  };

  // echo browser console to terminal
  page.on("console", (msg) => console.log(msg.text()));

  // my mistake was not realizing that these were promises, so I didn't await
  // them
  let usefulPageFunctions = ["screenshot", "reset", "click"];
  await page.exposeFunction("screenshot", screenshot);
  await page.exposeFunction("reset", reset);
  await page.exposeFunction("click", click);

  // expose some useful functions from puppeteer so they can be used from the
  // document code
  for (const func of [
    "select",
    "hover",
    "waitForNavigation",
    "waitForSelector",
  ]) {
    usefulPageFunctions.push(func);
    await page.exposeFunction(func, (arg: string) => (page as any)[func](arg));
  }

  // put them in global scope for convenience
  for (const exposedFunction of usefulPageFunctions) {
    await page.evaluate(`const ${exposedFunction} = window.${exposedFunction}`);
  }

  if (args.initMarkdownFile) {
    await compileSingleFile(args.initMarkdownFile, args.targetDir);
  }

  if (args.singleFile) {
    const outputMarkdownFilename = args.outputMarkdownFilename || "output.md";
    // finally, write result markdown file
    await fs.writeFile(
      `${args.targetDir}/${outputMarkdownFilename}`,
      await compileSingleFile(args.singleFile, args.targetDir),
      {
        encoding: "utf8",
      }
    );
  } else {
    // first, ensure that the target directory does not exist
    // first, copy over the source directory to the target directory
    await fs.cp(args.srcDir!, args.targetDir, {
      filter: (src) => path.extname(src) != ".md",
      recursive: true,
      preserveTimestamps: true,
    });

    const walkFunc = async (err: any, pathname: string, dirEntry: any) => {
      if (err) {
        // throw an error to stop walking
        // (or return to ignore and keep going)
        throw new Error(`fs stat error for ${pathname}: ${err.message}`);
      }

      // return false to skip a directory
      // (ex: skipping "dot file" directories)
      // if (dirEntry.isDirectory() && dirEntry.name.startsWith(".")) {
      //   return Promise.resolve(false);
      // }

      if (path.extname(dirEntry.name) == ".md") {
        // then, let's process it
        const currentPath = path.dirname(pathname);
        const relativePathFromRoot = path.relative(args.srcDir!, currentPath);
        const targetPath = path.join(args.targetDir, relativePathFromRoot);

        // this is so screenshots go into the directory
        targetDir = targetPath;

        // now, compile
        const res = await compileSingleFile(pathname, targetPath);

        const outputMarkdownFilename =
          args.outputMarkdownFilename || dirEntry.name;
        // finally, write result markdown file
        await fs.writeFile(`${targetDir}/${outputMarkdownFilename}`, res, {
          encoding: "utf8",
        });
      }

      return Promise.resolve();
    };

    // now, lets walk through `srcDir` and find all of the markdown files to compile
    await Walk.walk(args.srcDir, walkFunc);
  }

  await page.close();
  await browser.close();
})();
