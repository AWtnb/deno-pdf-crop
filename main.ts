import { parseArgs } from "jsr:@std/cli/parse-args";
import {
  PDFDocument,
  PDFPage,
  rectanglesAreEqual,
} from "https://cdn.skypack.dev/pdf-lib?dts";

const withSuffix = (path: string, suffix: string): string => {
  const parts = path.split(".");
  const extension = parts.pop() || "pdf";
  return parts.join(".") + suffix + "." + extension;
};

const cropTrimbox = async (
  path: string,
): Promise<number> => {
  const data = await Deno.readFile(path);
  const srcDoc = await PDFDocument.load(data);
  const outDoc = await PDFDocument.create();
  const range = srcDoc.getPageIndices();
  const pages = await outDoc.copyPages(srcDoc, range);

  pages.forEach((page: PDFPage, idx: number) => {
    const mbox = page.getMediaBox();
    const tbox = page.getTrimBox();
    if (rectanglesAreEqual(mbox, tbox)) {
      console.log(`UNCHANGED: page ${idx + 1} has no trimbox.`);
    } else {
      page.setMediaBox(tbox.x, tbox.y, tbox.width, tbox.height);
      page.setCropBox(tbox.x, tbox.y, tbox.width, tbox.height);
      page.setBleedBox(tbox.x, tbox.y, tbox.width, tbox.height);
    }
    outDoc.addPage(page);
  });
  const bytes = await outDoc.save();
  const outPath = withSuffix(path, "_crop");
  await Deno.writeFile(outPath, bytes);
  return 0;
};

const main = async () => {
  const flags = parseArgs(Deno.args, {
    string: ["path"],
    default: {
      path: "",
    },
  });
  const result = await cropTrimbox(flags.path);
  Deno.exit(result);
};

main();
