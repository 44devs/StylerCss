const CONFIG = {
  owner: "44devs",
  repo: "StylerCss",
  branch: "main",
  root: "CodesIThink",
  categories: [
    { folder: "Buttons", label: "buttons" },
    { folder: "Loaders", label: "loaders" },
    { folder: "Inputs", label: "inputs" },
    { folder: "Toggles", label: "toggles" },
    { folder: "Cards", label: "cards" }
  ],
  htmlExtensions: [".html", ".htm", ".style"],
  cssExtensions: [".css"],
  jsExtensions: [".js"]
};

const CACHE_KEY = "stylercss_files_cache";
const CACHE_MAX_AGE = 1000 * 60 * 30;

const grid = document.getElementById("grid");
const q = document.getElementById("q");
const filters = document.getElementById("filters");
const sheet = document.getElementById("sheet");
const modal = document.getElementById("modal");
const mstage = document.getElementById("mstage");
const mtitle = document.getElementById("mtitle");
const mcat = document.getElementById("mcat");
const code = document.getElementById("code");
const mgrab = document.getElementById("mgrab");
const mode = document.getElementById("mode");
const homeBtn = document.getElementById("homeBtn");
const infoBtn = document.getElementById("infoBtn");
const homeView = document.getElementById("homeView");
const infoView = document.getElementById("infoView");
const brand = document.getElementById("brand");

let components = [];
let active = null;
let tab = "html";
let view = "home";
let currentCategory = "all";

const copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5.5A2.5 2.5 0 0 1 7.5 3H17"/></svg>';
const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>';
const moonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.8A8.6 8.6 0 0 1 9.2 3.5a6.9 6.9 0 1 0 11.3 11.3Z"/></svg>';

async function fetchFileList() {
  const url = "https://api.github.com/repos/" + CONFIG.owner + "/" + CONFIG.repo + "/git/trees/" + CONFIG.branch + "?recursive=1";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("API " + res.status);
    const data = await res.json();
    const files = data.tree
      .filter(function (item) { return item.type === "blob"; })
      .map(function (item) { return "/" + item.path; });
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), files: files }));
    } catch (e) {}
    return files;
  } catch (e) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.files;
      }
    } catch (err) {}
    throw e;
  }
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Cannot fetch " + url);
  return res.text();
}

function cleanHtml(raw) {
  const hasDoc = /<html[\s>]/i.test(raw) || /<body[\s>]/i.test(raw);
  if (!hasDoc) return raw.trim();
  const doc = new DOMParser().parseFromString(raw, "text/html");
  const styles = Array.from(doc.querySelectorAll("style")).map(function (s) { return s.textContent; }).join("\n");
  const body = doc.body ? doc.body.innerHTML : raw;
  return { html: body.trim(), inlineCss: styles };
}

async function loadComponents() {
  let allFiles;
  try {
    allFiles = await fetchFileList();
  } catch (e) {
    console.error("Could not fetch file list:", e);
    return;
  }

  const baseUrl = "https://cdn.jsdelivr.net/gh/" + CONFIG.owner + "/" + CONFIG.repo + "@" + CONFIG.branch;

  for (const cat of CONFIG.categories) {
    const prefix = "/" + CONFIG.root + "/" + cat.folder + "/";
    const catFiles = allFiles.filter(function (f) {
      return f.indexOf(prefix) === 0;
    });

    const folderMap = {};
    for (const file of catFiles) {
      const relative = file.substring(prefix.length);
      const parts = relative.split("/");
      if (parts.length !== 2) continue;
      const folderName = parts[0];
      const fileName = parts[1];
      if (!folderMap[folderName]) folderMap[folderName] = [];
      folderMap[folderName].push(fileName);
    }

    for (const folderName in folderMap) {
      const files = folderMap[folderName];
      const htmlFile = files.find(function (f) { return CONFIG.htmlExtensions.some(function (e) { return f.toLowerCase().endsWith(e); }); });
      const cssFile = files.find(function (f) { return CONFIG.cssExtensions.some(function (e) { return f.toLowerCase().endsWith(e); }); });
      const jsFile = files.find(function (f) { return CONFIG.jsExtensions.some(function (e) { return f.toLowerCase().endsWith(e); }); });

      if (!htmlFile) continue;

      const folderUrl = baseUrl + "/" + CONFIG.root + "/" + cat.folder + "/" + folderName + "/";

      let html = "";
      let inlineCss = "";
      try {
        const rawHtml = await fetchText(folderUrl + htmlFile);
        const cleaned = cleanHtml(rawHtml);
        if (typeof cleaned === "object") {
          html = cleaned.html;
          inlineCss = cleaned.inlineCss;
        } else {
          html = cleaned;
        }
      } catch (e) {
        console.error("Failed to load HTML for " + folderName, e);
        continue;
      }

      let css = "";
      if (cssFile) {
        try {
          css = (await fetchText(folderUrl + cssFile)).trim();
        } catch (e) {}
      }
      if (inlineCss) {
        css = (css ? css + "\n\n" : "") + inlineCss;
      }

      let js = "";
      if (jsFile) {
        try {
          js = (await fetchText(folderUrl + jsFile)).trim();
        } catch (e) {}
      }

      components.push({
        title: folderName,
        cat: cat.label,
        tags: [cat.label, folderName.toLowerCase()],
        html: html,
        css: css,
        js: js
      });
    }
  }
}

function injectComponentStyles() {
  const existing = document.getElementById("stylercss-components");
  if (existing) existing.remove();
  
  let allCss = "";
  components.forEach(function (c) {
    if (c.css) allCss += c.css + "\n\n";
  });
  
  if (!allCss) return;
  
  const style = document.createElement("style");
  style.id = "stylercss-components";
  style.appendChild(document.createTextNode(allCss));
  document.head.appendChild(style);
}

function showLoading() {
  grid.innerHTML = '<div class="loading"><div class="spinner"></div>Loading components...</div>';
}

function draw() {
  grid.innerHTML = "";

  if (components.length === 0) {
    grid.innerHTML = '<div class="none"><b>No components yet</b></div>';
    return;
  }

  const filtered = components.filter(function (item) {
    const catOk = currentCategory === "all" || item.cat === currentCategory;
    const term = q.value.trim().toLowerCase();
    const textOk = !term ||
      item.title.toLowerCase().indexOf(term) > -1 ||
      item.cat.indexOf(term) > -1 ||
      (item.tags && item.tags.some(function (t) { return t.indexOf(term) > -1; }));
    return catOk && textOk;
  });

  if (!filtered.length) {
    grid.innerHTML = '<div class="none"><b>Nothing found</b>Try another word or category.</div>';
    return;
  }

  filtered.forEach(function (item, i) {
    const card = document.createElement("article");
    card.className = "tile";
    card.style.animationDelay = (i * 35) + "ms";
    card.innerHTML =
      '<div class="stage">' + item.html + '</div>' +
      '<div class="tile-foot">' +
        '<div class="tile-meta">' +
          '<h3>' + item.title + '</h3>' +
          '<span class="tag">' + item.cat + '</span>' +
        '</div>' +
        '<button class="grab" aria-label="Copy">' + copyIcon + '</button>' +
      '</div>';

    card.querySelector(".stage").addEventListener("click", function () {
      openModal(item);
    });

    const grab = card.querySelector(".grab");
    grab.addEventListener("click", function (e) {
      e.stopPropagation();
      put(item.html + "\n\n" + item.css);
      grab.innerHTML = checkIcon;
      grab.classList.add("ok");
      setTimeout(function () {
        grab.innerHTML = copyIcon;
        grab.classList.remove("ok");
      }, 1300);
    });

    grid.appendChild(card);
  });
}

filters.addEventListener("click", function (e) {
  const b = e.target.closest(".pill");
  if (!b) return;
  filters.querySelectorAll(".pill").forEach(function (p) { p.classList.remove("on"); });
  b.classList.add("on");
  currentCategory = b.dataset.cat;
  draw();
});

q.addEventListener("input", draw);

function showView(v) {
  if (v === view) return;
  view = v;
  if (v === "home") {
    infoView.hidden = true;
    homeView.hidden = false;
    homeView.style.animation = "none";
    void homeView.offsetWidth;
    homeView.style.animation = "";
    homeBtn.classList.add("active");
    infoBtn.classList.remove("active");
  } else {
    homeView.hidden = true;
    infoView.hidden = false;
    infoView.style.animation = "none";
    void infoView.offsetWidth;
    infoView.style.animation = "";
    infoBtn.classList.add("active");
    homeBtn.classList.remove("active");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

homeBtn.addEventListener("click", function () {
  if (view === "home") {
    location.reload();
  } else {
    showView("home");
  }
});

infoBtn.addEventListener("click", function () {
  showView("info");
});

brand.addEventListener("click", function () {
  if (view === "home") {
    location.reload();
  } else {
    showView("home");
  }
});

function openModal(item) {
  active = item;
  mstage.innerHTML = item.html;
  mtitle.textContent = item.title;
  mcat.textContent = item.cat;
  setTab("html");
  sheet.classList.add("open");
  document.body.style.overflow = "hidden";
  if (item.js) {
    const oldScript = mstage.querySelector("script");
    if (oldScript) oldScript.remove();
    const script = document.createElement("script");
    script.textContent = "(function(){\n" + item.js + "\n})();";
    mstage.appendChild(script);
  }
}

function shut() {
  sheet.classList.remove("open");
  document.body.style.overflow = "";
  active = null;
}

function setTab(t) {
  tab = t;
  document.querySelectorAll(".tab").forEach(function (el) {
    el.classList.toggle("on", el.dataset.t === t);
  });
  if (!active) return;
  if (t === "html") code.textContent = active.html || "No HTML provided.";
  else if (t === "css") code.textContent = active.css || "No CSS provided.";
  else if (t === "js") code.textContent = active.js || "No JavaScript provided.";
}

document.querySelectorAll(".tab").forEach(function (el) {
  el.addEventListener("click", function () { setTab(el.dataset.t); });
});

document.getElementById("close").addEventListener("click", shut);
sheet.addEventListener("click", function (e) { if (e.target === sheet) shut(); });
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && sheet.classList.contains("open")) shut();
});

mgrab.addEventListener("click", function () {
  if (!active) return;
  let output = "";
  if (tab === "html") output = active.html;
  else if (tab === "css") output = active.css;
  else if (tab === "js") output = active.js;
  put(output);
  mgrab.textContent = "Copied!";
  mgrab.classList.add("ok");
  setTimeout(function () {
    mgrab.textContent = "Copy";
    mgrab.classList.remove("ok");
  }, 1300);
});

function put(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(function () { fallback(text); });
  } else {
    fallback(text);
  }
}

function fallback(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(ta);
}

function paintMode(t) {
  mode.innerHTML = t === "dark" ? moonIcon : sunIcon;
}

mode.addEventListener("click", function () {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  paintMode(next);
  try { localStorage.setItem("stylercss-theme", next); } catch (e) {}
});

(function () {
  let saved = null;
  try { saved = localStorage.getItem("stylercss-theme"); } catch (e) {}
  const t = saved || "dark";
  document.documentElement.dataset.theme = t;
  paintMode(t);
})();

async function init() {
  showLoading();
  await loadComponents();
  injectComponentStyles();
  draw();
}

init();
