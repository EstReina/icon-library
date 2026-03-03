import fs from "fs";
import path from "path";

const ICONS_DIR = path.resolve("icons");
const OUT_FILE = path.resolve("icons.json");

function listDirs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

function listSvgs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(f => f.isFile() && f.name.toLowerCase().endsWith(".svg"))
    .map(f => f.name);
}

const styles = listDirs(ICONS_DIR);

let icons = [];

for (const style of styles) {
  const styleDir = path.join(ICONS_DIR, style);
  const categories = listDirs(styleDir);

  for (const category of categories) {
    const catDir = path.join(styleDir, category);
    const files = listSvgs(catDir);

    for (const file of files) {
      const name = path.basename(file, ".svg");
      const rel = `${style}/${category}/${file}`.replaceAll("\\", "/");

      icons.push({
        name,         // alphabet-a
        style,        // Line
        category,     // Alphabet
        path: `icons/${rel}` // desde /site
      });
    }
  }
}

icons.sort((a, b) =>
  (a.style + a.category + a.name).localeCompare(b.style + b.category + b.name)
);

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify({ count: icons.length, icons }, null, 2), "utf8");

console.log(`OK -> ${icons.length} icons indexed into ${OUT_FILE}`);