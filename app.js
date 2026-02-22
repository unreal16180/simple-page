/* =========================
   Documento infinito + panel
   ========================= */

const reader = document.getElementById("reader");
const content = document.getElementById("content");

const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const btnTools = document.getElementById("btnTools");

const panel = document.getElementById("panel");
const btnClosePanel = document.getElementById("btnClosePanel");

const searchInput = document.getElementById("searchInput");
const btnSearchPrev = document.getElementById("btnSearchPrev");
const btnSearchNext = document.getElementById("btnSearchNext");
const searchMeta = document.getElementById("searchMeta");

const pageInput = document.getElementById("pageInput");
const btnGoPage = document.getElementById("btnGoPage");
const pageCountEl = document.getElementById("pageCount");

const fontSize = document.getElementById("fontSize");
const fontSizeVal = document.getElementById("fontSizeVal");
const fontWeight = document.getElementById("fontWeight");

const btnTheme = document.getElementById("btnTheme");

let pageCount = 0;
let loading = false;

// Búsqueda
let hits = [];
let hitIndex = -1;
let lastQuery = "";

// ===== CARGAR TEXTO DESDE ARCHIVO TXT =====

async function cargarLibro() {
  const res = await fetch("libro.txt");
  const texto = await res.text();

  const parrafos = texto.split(/\n\s*\n/);

  content.innerHTML = "";

  parrafos.forEach(p => {
    const el = document.createElement("p");
    el.textContent = p.trim();
    content.appendChild(el);
  });
}

// cargar al iniciar
cargarLibro();

function makeLoremBlock(mult = 1){
  const base = [
    "findel texto"
  ];
  let out = [];
  for(let i=0;i<3*mult;i++){
    out.push(base[i % base.length]);
  }
  return out;
}

function buildPage(pageNum){
  const section = document.createElement("section");
  section.className = "page";
  section.id = `page-${pageNum}`;

  const title = document.createElement("div");
  title.className = "page-title";
  title.textContent = `Página ${pageNum}`;
  section.appendChild(title);

  const paragraphs = (pageNum === 1)
    ? demoParagraphs.concat(makeLoremBlock(2))
    : makeLoremBlock(3);

  for(const pText of paragraphs){
    const p = document.createElement("p");
    p.textContent = pText;
    section.appendChild(p);
  }

  return section;
}

function appendPages(n=3){
  for(let i=0;i<n;i++){
    pageCount++;
    content.appendChild(buildPage(pageCount));
  }
  pageCountEl.textContent = String(pageCount);
}

function nearBottom(){
  // cuando queda poco por bajar
  const threshold = 900; // px
  return (reader.scrollHeight - (reader.scrollTop + reader.clientHeight)) < threshold;
}

function loadMoreIfNeeded(){
  if(loading) return;
  if(!nearBottom()) return;

  loading = true;
  // pequeño delay para sensación de carga (y evitar múltiples triggers)
  setTimeout(() => {
    appendPages(3);
    // si hay búsqueda activa, refrescar hits (porque el DOM cambió)
    if(lastQuery.trim()) runSearch(lastQuery.trim());
    loading = false;
  }, 120);
}

/* ==========
   Scroll por pantalla visible (NO “salto gigante”)
   ========== */
function scrollByOneScreen(direction /* -1 o +1 */){
  const margin = 16; // pequeño margen para no “cortar” igual
  const delta = Math.max(120, reader.clientHeight - margin);
  reader.scrollBy({ top: direction * delta, left: 0, behavior: "smooth" });
}

btnPrev.addEventListener("click", () => scrollByOneScreen(-1));
btnNext.addEventListener("click", () => scrollByOneScreen(1));

/* Teclas útiles */
reader.addEventListener("keydown", (e) => {
  if(e.key === "PageDown" || e.key === " "){
    e.preventDefault();
    scrollByOneScreen(1);
  } else if(e.key === "PageUp" || (e.key === " " && e.shiftKey)){
    e.preventDefault();
    scrollByOneScreen(-1);
  }
});

/* ==========
   Panel
   ========== */
function openPanel(){
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  searchInput.focus();
}
function closePanel(){
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
  reader.focus();
}
btnTools.addEventListener("click", () => {
  panel.classList.contains("open") ? closePanel() : openPanel();
});
btnClosePanel.addEventListener("click", closePanel);

// cerrar si clic fuera
document.addEventListener("click", (e) => {
  const isClickOnTools = btnTools.contains(e.target);
  const isClickInsidePanel = panel.contains(e.target);
  if(panel.classList.contains("open") && !isClickInsidePanel && !isClickOnTools){
    closePanel();
  }
});

/* ==========
   Tipografía
   ========== */
function setFontSize(px){
  document.documentElement.style.setProperty("--font-size", `${px}px`);
  fontSizeVal.textContent = String(px);
}
function setFontWeight(w){
  document.documentElement.style.setProperty("--font-weight", String(w));
}

fontSize.addEventListener("input", () => setFontSize(fontSize.value));
fontWeight.addEventListener("change", () => setFontWeight(fontWeight.value));

/* ==========
   Tema (oscuro por defecto)
   ========== */
function syncThemeButton(){
  const isLight = document.body.classList.contains("theme-light");
  btnTheme.textContent = isLight ? "Cambiar a oscuro" : "Cambiar a claro";
}
btnTheme.addEventListener("click", () => {
  document.body.classList.toggle("theme-light");
  document.body.classList.toggle("theme-dark");
  syncThemeButton();
});
syncThemeButton();

/* ==========
   Ir a página
   ========== */
function goToPage(n){
  if(!Number.isFinite(n) || n < 1) return;

  // Si la página no existe aún, cargar hasta llegar
  while(pageCount < n){
    appendPages(3);
    if(pageCount >= n) break;
  }

  const el = document.getElementById(`page-${n}`);
  if(el){
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

btnGoPage.addEventListener("click", () => {
  const n = parseInt(pageInput.value, 10);
  goToPage(n);
});

pageInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter"){
    const n = parseInt(pageInput.value, 10);
    goToPage(n);
  }
});

/* ==========
   Buscador con resaltado
   - Evita romper el texto: reconstruye HTML solo dentro de <p>
   ========== */
function escapeRegExp(str){
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clearHighlights(){
  // Restaurar texto original: guardamos en dataset la primera vez
  const paragraphs = content.querySelectorAll("p");
  paragraphs.forEach(p => {
    if(p.dataset.rawText){
      p.textContent = p.dataset.rawText;
    }else{
      p.dataset.rawText = p.textContent;
    }
  });
  hits = [];
  hitIndex = -1;
  searchMeta.textContent = "0 coincidencias";
}

function runSearch(query){
  const q = query.trim();
  lastQuery = q;
  clearHighlights();

  if(!q){
    return;
  }

  const re = new RegExp(escapeRegExp(q), "gi");
  const paragraphs = content.querySelectorAll("p");

  paragraphs.forEach(p => {
    if(!p.dataset.rawText) p.dataset.rawText = p.textContent;
    const raw = p.dataset.rawText;

    if(!re.test(raw)) return;
    // reset regex state
    re.lastIndex = 0;

    const html = raw.replace(re, (m) => `<mark class="search-hit">${m}</mark>`);
    p.innerHTML = html;
  });

  hits = Array.from(content.querySelectorAll("mark.search-hit"));
  hitIndex = hits.length ? 0 : -1;
  searchMeta.textContent = `${hits.length} coincidencia(s)`;

  if(hits.length){
    focusHit(0);
  }
}

function focusHit(index){
  if(!hits.length) return;
  hitIndex = (index + hits.length) % hits.length;

  const el = hits[hitIndex];
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  // pequeño “flash” visual sin cambiar colores globales
  el.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], {
    duration: 240
  });
}

searchInput.addEventListener("input", () => {
  runSearch(searchInput.value);
});

btnSearchNext.addEventListener("click", () => {
  if(!hits.length) return;
  focusHit(hitIndex + 1);
});

btnSearchPrev.addEventListener("click", () => {
  if(!hits.length) return;
  focusHit(hitIndex - 1);
});

searchInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter"){
    // Enter = siguiente coincidencia
    if(hits.length) focusHit(hitIndex + 1);
  }
});

/* ==========
   Infinite scrolling
   ========== */
// reader.addEventListener("scroll", () => {
//   loadMoreIfNeeded();
// });

/* ==========
   Init
   ========== */
function init(){
  // páginas iniciales
  appendPages(5);

  // defaults de tipografía
  setFontSize(parseInt(fontSize.value, 10));
  setFontWeight(fontWeight.value);

  // foco para teclas
  reader.focus();
}
init();