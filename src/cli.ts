import * as puppeteer from "puppeteer";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { promises as fs } from "fs";

// first, CLI
const parser = yargs(hideBin(process.argv)).command('* [markdownFile]', "Default command", (yargs => {
  yargs.positional('markdownFile', {
    describe: 'Markdown file to parse',
    type: 'string',
    demandOption: true
  })
}));

(async () => {
  const argv = await parser.argv;

  if (argv.markdownFile === undefined) {
    console.log("Please pass in a markdownFile parameter!");
    return;
  }

  console.log(argv);

  console.log(argv.$0)

  // first, let's read the file
  const data = await fs.readFile(argv!.markdownFile, "utf8");
  console.log(data);

  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  // await page.goto('');
})();
