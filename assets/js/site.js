/* AmpereHour brutalist blog — small, fast, static-friendly JS */
(() => {

  function loadTrackingOnce(){
  if (document.querySelector('script[data-tracking="1"]')) return;

  const s = document.createElement("script");
  s.src = "/assets/js/tracking.js";
  s.defer = true;
  s.dataset.tracking = "1";
  document.head.appendChild(s);
}

// call it early
loadTrackingOnce();

async function injectBodyOpen(){
  if (document.getElementById("bodyOpenInjected")) return;
  const html = await fetch("/assets/partials/body-open.html", { cache: "no-store" }).then(r => r.text());
  const marker = document.createElement("div");
  marker.id = "bodyOpenInjected";
  marker.innerHTML = html;
  document.body.prepend(marker);
}
injectBodyOpen();
  
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const state = {
    posts: null,
    menuOpen: false,
    searchOpen: false,
  };

  const lockScroll = (locked) => {
    document.documentElement.style.overflow = locked ? "hidden" : "";
    document.body.style.overflow = locked ? "hidden" : "";
  };

  const setAriaHidden = (el, hidden) => {
    if (!el) return;
    el.setAttribute("aria-hidden", hidden ? "true" : "false");
  };

  async function injectPartials(){
    const headerMount = document.getElementById("siteHeader");
    const footerMount = document.getElementById("siteFooter");
    if (headerMount) {
      const res = await fetch("/assets/partials/header.html", {cache:"no-store"});
      headerMount.innerHTML = await res.text();
    }
    if (footerMount) {
      const res = await fetch("/assets/partials/footer.html", {cache:"no-store"});
      footerMount.innerHTML = await res.text();
    }
    bindHeaderFooter();
  }

  async function loadPosts(){
    if (state.posts) return state.posts;
    const res = await fetch("/assets/data/posts.json", {cache:"no-store"});
    state.posts = await res.json();
    return state.posts;
  }

  function bindHeaderFooter(){
    const menuSheet = $("#menuSheet");
    const openMenu = $("#openMenu");
    const closeMenu = $("#closeMenu");
    const openSearch = $("#openSearch");
    const closeSearch = $("#closeSearch");
    const searchOverlay = $("#searchOverlay");
    const categoriesToggle = $("#categoriesToggle");
    const categoriesSubmenu = $("#categoriesSubmenu");

    const openMenuFn = () => {
      if (!menuSheet) return;
      menuSheet.classList.add("is-open");
      state.menuOpen = true;
      setAriaHidden(menuSheet, false);
      lockScroll(true);
      requestAnimationFrame(() => closeMenu?.focus());
    };
    const closeMenuFn = () => {
      if (!menuSheet) return;
      menuSheet.classList.remove("is-open");
      state.menuOpen = false;
      setAriaHidden(menuSheet, true);
      lockScroll(false);
      requestAnimationFrame(() => openMenu?.focus());
    };

    const openSearchFn = async () => {
      if (!searchOverlay) return;
      searchOverlay.classList.add("is-open");
      state.searchOpen = true;
      setAriaHidden(searchOverlay, false);
      lockScroll(true);
      await loadPosts();
      requestAnimationFrame(() => $("#searchInput")?.focus());
      renderSearchResults(""); // empty state
    };
    const closeSearchFn = () => {
      if (!searchOverlay) return;
      searchOverlay.classList.remove("is-open");
      state.searchOpen = false;
      setAriaHidden(searchOverlay, true);
      lockScroll(false);
      requestAnimationFrame(() => openSearch?.focus());
    };

    openMenu?.addEventListener("click", openMenuFn);
    closeMenu?.addEventListener("click", closeMenuFn);
    menuSheet?.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close === "menu") closeMenuFn();
    });

    openSearch?.addEventListener("click", openSearchFn);
    closeSearch?.addEventListener("click", closeSearchFn);
    searchOverlay?.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close === "search") closeSearchFn();
    });

    // Categories submenu (mobile-friendly)
    const toggleCats = () => {
      if (!categoriesToggle || !categoriesSubmenu) return;
      const expanded = categoriesToggle.getAttribute("aria-expanded") === "true";
      categoriesToggle.setAttribute("aria-expanded", String(!expanded));
      categoriesSubmenu.hidden = expanded;
    };
    categoriesToggle?.addEventListener("click", toggleCats);
    categoriesToggle?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCats(); }
    });

    // ESC closes overlays
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (state.searchOpen) closeSearchFn();
      if (state.menuOpen) closeMenuFn();
    });

    // Search input logic
    const input = $("#searchInput");
    input?.addEventListener("input", () => renderSearchResults(input.value));

    // Micro-interaction "tap glow"
    $$("[data-tap]").forEach(el => el.classList.add("tap"));
    document.addEventListener("pointerdown", (e) => {
      const target = e.target.closest(".tap");
      if (!target) return;
      const r = target.getBoundingClientRect();
      target.style.setProperty("--x", ((e.clientX - r.left) / r.width) * 100 + "%");
      target.style.setProperty("--y", ((e.clientY - r.top) / r.height) * 100 + "%");
    }, {passive:true});
  }

  function normalize(str){
    return (str || "").toLowerCase().trim();
  }

  function highlight(text, q){
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return escapeHtml(text);
    const before = escapeHtml(text.slice(0, idx));
    const match = escapeHtml(text.slice(idx, idx + q.length));
    const after = escapeHtml(text.slice(idx + q.length));
    return `${before}<mark>${match}</mark>${after}`;
  }

  function escapeHtml(s){
    return (s || "").replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function extractText(html){
    // lightweight stripping (safe enough for search indexing)
    return (html || "")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatDate(iso){
    try{
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString(undefined, {year:"numeric", month:"short", day:"2-digit"});
    }catch{ return iso; }
  }

  function slugToPathCategory(cat){
    return "/categories/" + cat.toLowerCase().replace(/\s+/g, "-") + ".html";
  }

  function renderSearchResults(raw){
    const resultsMount = document.getElementById("searchResults");
    if (!resultsMount || !state.posts) return;
    const q = normalize(raw);
    if (!q){
      resultsMount.innerHTML = `
        <div class="wrap">
          <div class="badge a2">Tip</div>
          <p class="muted" style="margin:10px 0 0; line-height:1.6;">Search starts with <strong>titles</strong>. If nothing matches, we’ll scan post content.</p>
        </div>
      `;
      return;
    }

    const posts = state.posts.posts || [];
    const titleMatches = posts.filter(p => normalize(p.title).includes(q));

    let matches = titleMatches;
    let mode = "Title matches";
    if (titleMatches.length === 0){
      mode = "Body matches";
      matches = posts.filter(p => extractText(p.bodyHtml).toLowerCase().includes(q));
    }

    if (matches.length === 0){
      resultsMount.innerHTML = `
        <div class="wrap">
          <div class="badge a1">No results</div>
          <p class="muted" style="margin:10px 0 0; line-height:1.6;">Try a simpler keyword (e.g., <em>fees</em>, <em>savings</em>, <em>budget</em>).</p>
        </div>
      `;
      return;
    }

    // newest first
    matches = matches.slice().sort((a,b) => (a.date < b.date ? 1 : -1));

    const cards = matches.map(p => {
      const title = highlight(p.title, q);
      const snippet = mode === "Body matches"
        ? escapeHtml(extractText(p.bodyHtml).slice(0, 120)) + "…"
        : escapeHtml(p.excerpt || "");
      return `
        <a class="card tap is-in" href="/posts/${p.slug}.html" style="margin:12px 0;">
          <div class="card-body">
            <h3 class="card-title">${title}</h3>
            <p class="card-excerpt">${snippet}</p>
            <div class="card-meta">
              <span class="chip date">${escapeHtml(formatDate(p.date))}</span>
              <span class="chip category">${escapeHtml(p.category)}</span>
            </div>
          </div>
        </a>
      `;
    }).join("");

    resultsMount.innerHTML = `
      <div class="wrap">
        <div class="badge a2">${escapeHtml(mode)}</div>
        ${cards}
      </div>
    `;
  }

  // Reveal animations
  function bindReveals(){
    const cards = $$(".card[data-reveal]");
    if (!cards.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(ent => {
        if (ent.isIntersecting){
          ent.target.classList.add("is-in");
          io.unobserve(ent.target);
        }
      });
    }, {threshold:0.16});
    cards.forEach(c => io.observe(c));
  }

  // SEO meta helpers
  function setMeta(nameOrProp, content, isProperty=false){
    const sel = isProperty ? `meta[property="${nameOrProp}"]` : `meta[name="${nameOrProp}"]`;
    let el = document.head.querySelector(sel);
    if (!el){
      el = document.createElement("meta");
      if (isProperty) el.setAttribute("property", nameOrProp);
      else el.setAttribute("name", nameOrProp);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }
  function setCanonical(url){
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link){
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;
  }
  function setTitle(t){
    document.title = t;
  }
  function injectJsonLd(id, obj){
    let script = document.getElementById(id);
    if (!script){
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(obj);
  }

  // Expose for page scripts
  window.AH = {
    injectPartials,
    loadPosts,
    bindReveals,
    formatDate,
    slugToPathCategory,
    setMeta,
    setCanonical,
    setTitle,
    injectJsonLd,
  };

  // Boot
  document.addEventListener("DOMContentLoaded", async () => {
    await injectPartials();
    bindReveals();
  });
})();
