import * as puppeteer from "puppeteer";
import { ArgumentParser } from "argparse";
import { promises as fs } from "fs";

interface Arguments {
  markdownFile: string;
}

// first, CLI
const parser = new ArgumentParser();
parser.add_argument("markdownFile", {
  type: "str",
  help: "The markdown file to process",
});

(async () => {
  const args: Arguments = parser.parse_args();

  if (args.markdownFile === undefined) {
    console.log("Please pass in a markdownFile parameter!");
    process.exit(1);
  }

  // first, let's read the file
  const data = await fs.readFile(args.markdownFile, "utf8");

  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  // await page.goto('');
})();
