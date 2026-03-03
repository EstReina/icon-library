// app.js (completo)
// Requiere en index.html: #q, #style, #category, #color, #hex, #grid, #cardTpl, #count

const qEl = document.getElementById("q");
const styleEl = document.getElementById("style");
const categoryEl = document.getElementById("category");
const colorEl = document.getElementById("color");
const hexEl = document.getElementById("hex");
const grid = document.getElementById("grid");
const tpl = document.getElementById("cardTpl");
const countEl = document.getElementById("count");

let all = [];
let styles = [];
let categoriesByStyle = new Map();

// Cache de SVG para no refetchear lo mismo al cambiar filtros
const svgCache = new Map(); // path -> svg text

function uniq(arr) {
  return Array.from(new Set(arr));
}

function absoluteUrl(relPath) {
  return new URL(relPath, window.location.href).toString();
}

function applyLineColor(hex) {
  document.documentElement.style.setProperty("--icon-color", hex);
}

function normalizeHex(v) {
  let x = (v || "").trim().toUpperCase();
  if (!x.startsWith("#")) x = "#" + x;
  if (!/^#[0-9A-F]{6}$/.test(x)) return null;
  return x;
}

function setColor(hex) {
  applyLineColor(hex);
  if (colorEl) colorEl.value = hex;
  if (hexEl) hexEl.value = hex;
}

async function loadIndex() {
  const res = await fetch("./icons.json", { cache: "no-store" });
  const data = await res.json();
  all = data.icons;

  styles = uniq(all.map((i) => i.style)).sort();
  categoriesByStyle = new Map();

  for (const s of styles) {
    categoriesByStyle.set(
      s,
      uniq(all.filter((i) => i.style === s).map((i) => i.category)).sort()
    );
  }

  styleEl.innerHTML = [
    `<option value="(todos)">(todos)</option>`,
    ...styles.map((s) => `<option value="${s}">${s}</option>`),
  ].join("");

  // Default: Line si existe
  if (styles.includes("Line")) styleEl.value = "Line";

  syncCategories();

  // Default color visible y sincronizado
  setColor((colorEl?.value || "#EAF2FF").toUpperCase());

  render();
}

function syncCategories() {
  const s = styleEl.value;

  const cats =
    s === "(todos)"
      ? uniq(all.map((i) => i.category)).sort()
      : categoriesByStyle.get(s) || [];

  categoryEl.innerHTML = [
    `<option value="(todas)">(todas)</option>`,
    ...cats.map((c) => `<option value="${c}">${c}</option>`),
  ].join("");
}

function matches(icon, q, s, c) {
  if (s !== "(todos)" && icon.style !== s) return false;
  if (c !== "(todas)" && icon.category !== c) return false;
  if (!q) return true;
  return icon.name.toLowerCase().includes(q);
}

async function render() {
  const q = qEl.value.trim().toLowerCase();
  const s = styleEl.value;
  const c = categoryEl.value;

  // Marca estilo en body para CSS (Line vs Duocolor/Gestalt)
  document.body.dataset.style = s;

  // No renderices TODO sin intención
  if (!q && s === "(todos)" && c === "(todas)") {
    grid.innerHTML = `<div class="empty">Escribe algo o filtra por estilo/categoría.</div>`;
    countEl.textContent = `0 / ${all.length}`;
    return;
  }

  const filtered = all.filter((i) => matches(i, q, s, c));
  countEl.textContent = `${filtered.length} / ${all.length}`;

  grid.innerHTML = "";

  const limit = 150;
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

    // Preview (cacheado)
    if (svgCache.has(icon.path)) {
      preview.innerHTML = svgCache.get(icon.path);
    } else {
      fetch(icon.path)
        .then((r) => r.text())
        .then((svg) => {
          svgCache.set(icon.path, svg);
          preview.innerHTML = svg;
        })
        .catch(() => {
          preview.textContent = "⚠️";
        });
    }

    copySvgBtn.addEventListener("click", async () => {
      const svg = svgCache.get(icon.path) ?? (await (await fetch(icon.path)).text());
      svgCache.set(icon.path, svg);
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
    note.className = "note";
    note.textContent = `Mostrando ${limit} de ${filtered.length}. Afina la búsqueda o filtra por estilo/categoría.`;
    grid.appendChild(note);
  }
}

// Eventos
qEl.addEventListener("input", render);

styleEl.addEventListener("change", () => {
  syncCategories();
  render();
});

categoryEl.addEventListener("change", render);

// Color picker: sincroniza hex y CSS var
if (colorEl) {
  colorEl.addEventListener("input", () => {
    setColor(colorEl.value.toUpperCase());
  });
}

// HEX input: valida al salir (blur) o Enter
if (hexEl) {
  hexEl.addEventListener("blur", () => {
    const hex = normalizeHex(hexEl.value);
    if (hex) setColor(hex);
    else setColor((colorEl?.value || "#EAF2FF").toUpperCase());
  });

  hexEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      hexEl.blur();
    }
  });
}

loadIndex();