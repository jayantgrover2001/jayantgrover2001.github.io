(async () => {
  const mount = document.getElementById("categoryMount");
  if (!mount) return;

  const path = window.location.pathname.split("/").pop() || "";
  const categorySlug = path.replace(".html","");
  const category = categorySlug.replace(/-/g, " ").replace(/\b\w/g, m => m.toUpperCase());

  const data = await window.AH.loadPosts();
  const posts = (data.posts || []).filter(p => p.category.toLowerCase() === category.toLowerCase())
    .slice()
    .sort((a,b) => (a.date < b.date ? 1 : -1));

  // SEO
  const url = (data.site?.url || "https://example.com").replace(/\/$/,"") + `/categories/${categorySlug}.html`;
  const title = `${category} | ${data.site?.name || "AmpereHour"}`;
  const desc = `Browse all posts in ${category}.`;
  window.AH.setTitle(title);
  window.AH.setCanonical(url);
  window.AH.setMeta("description", desc);
  window.AH.setMeta("robots", "index,follow");
  window.AH.setMeta("og:title", title, true);
  window.AH.setMeta("og:description", desc, true);
  window.AH.setMeta("og:type", "website", true);
  window.AH.setMeta("og:url", url, true);
  window.AH.setMeta("twitter:card", "summary");
  window.AH.setMeta("twitter:title", title);
  window.AH.setMeta("twitter:description", desc);

  const list = posts.map(p => `
    <article class="card tap" data-reveal>
      <a href="/posts/${p.slug}.html" aria-label="${escapeHtml(p.title)}">
        <div class="card-thumb">
          <img src="${escapeHtml(p.thumbnail)}" alt="" loading="lazy" decoding="async" width="1200" height="750">
        </div>
      </a>
      <div class="card-body">
        <a href="/posts/${p.slug}.html"><h2 class="card-title">${escapeHtml(p.title)}</h2></a>
        <p class="card-excerpt">${escapeHtml(p.excerpt)}</p>
        <div class="card-meta">
          <span class="chip date">${escapeHtml(window.AH.formatDate(p.date))}</span>
          <span class="chip category">${escapeHtml(p.category)}</span>
        </div>
      </div>
    </article>
  `).join("");

  mount.innerHTML = list || `<div class="muted">No posts in this category yet.</div>`;
  window.AH.bindReveals();

  const h1 = document.getElementById("categoryTitle");
  const sub = document.getElementById("categorySub");
  h1 && (h1.textContent = category);
  sub && (sub.textContent = `${posts.length} post${posts.length===1?"":"s"}`);

  function escapeHtml(s){
    return (s || "").replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }
})();
