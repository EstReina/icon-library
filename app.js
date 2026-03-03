const qEl = document.getElementById("q");
const styleEl = document.getElementById("style");
const categoryEl = document.getElementById("category");
const grid = document.getElementById("grid");
const tpl = document.getElementById("cardTpl");
const countEl = document.getElementById("count");

let all = [];
let styles = [];
let categoriesByStyle = new Map();

function uniq(arr) { return Array.from(new Set(arr)); }

async function loadIndex() {
  const res = await fetch("./icons.json", { cache: "no-store" });
  const data = await res.json();
  all = data.icons;

  styles = uniq(all.map(i => i.style)).sort();
  categoriesByStyle = new Map();
  for (const s of styles) {
    categoriesByStyle.set(s, uniq(all.filter(i => i.style === s).map(i => i.category)).sort());
  }

  styleEl.innerHTML = [`<option value="(todos)">(todos)</option>`, ...styles.map(s => `<option value="${s}">${s}</option>`)].join("");
  syncCategories();
  render();
}

function syncCategories() {
  const s = styleEl.value;
  let cats = [];
  if (s === "(todos)") cats = uniq(all.map(i => i.category)).sort();
  else cats = categoriesByStyle.get(s) || [];
  categoryEl.innerHTML = [`<option value="(todas)">(todas)</option>`, ...cats.map(c => `<option value="${c}">${c}</option>`)].join("");
}

function matches(icon, q, s, c) {
  if (s !== "(todos)" && icon.style !== s) return false;
  if (c !== "(todas)" && icon.category !== c) return false;
  if (!q) return true;
  return icon.name.toLowerCase().includes(q);
}

function absoluteUrl(relPath) {
  return new URL(relPath, window.location.href).toString();
}

async function render() {
  const q = qEl.value.trim().toLowerCase();
  const s = styleEl.value;
  const c = categoryEl.value;

  const filtered = all.filter(i => matches(i, q, s, c));
  countEl.textContent = `${filtered.length} / ${all.length}`;

  grid.innerHTML = "";

  // Evita congelar el navegador: fuerza búsqueda/filtrado si es demasiado
  const limit = 120;
  const slice = filtered.slice(0, limit);

  const frag = document.createDocumentFragment();

  for (const icon of slice) {
    const node = tpl.content.cloneNode(true);
    const preview = node.querySelector(".preview");
    const name = node.querySelector(".name");
    const sub = node.querySelector(".sub");
    const copySvgBtn = node.querySelector(".copySvg");
    const copyUrlBtn = node.querySelector(".copyUrl");
    const openA = node.querySelector(".open");

    name.textContent = icon.name;
    sub.textContent = `${icon.style} • ${icon.category}`;
    openA.href = icon.path;

    fetch(icon.path).then(r => r.text()).then(svg => {
      preview.innerHTML = svg;
    }).catch(() => preview.textContent = "⚠️");

    copySvgBtn.addEventListener("click", async () => {
      const svg = await (await fetch(icon.path)).text();
      await navigator.clipboard.writeText(svg);
      copySvgBtn.textContent = "Copiado";
      setTimeout(() => (copySvgBtn.textContent = "Copiar SVG"), 800);
    });

    copyUrlBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(absoluteUrl(icon.path));
      copyUrlBtn.textContent = "Copiado";
      setTimeout(() => (copyUrlBtn.textContent = "Copiar URL"), 800);
    });

    frag.appendChild(node);
  }

  grid.appendChild(frag);

  if (filtered.length > limit) {
    const note = document.createElement("div");
    note.style.opacity = ".8";
    note.style.padding = "8px 16px 24px";
    note.textContent = `Mostrando ${limit} de ${filtered.length}. Afina la búsqueda o filtra por estilo/categoría.`;
    grid.parentElement.appendChild(note);
  }
}

qEl.addEventListener("input", render);
styleEl.addEventListener("change", () => { syncCategories(); render(); });
categoryEl.addEventListener("change", render);

loadIndex();
styleEl.value = "Line"; // o el que más uses
syncCategories();
render();