(async () => {
  const mount = document.getElementById("postsMount");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (!mount) return;

  const data = await window.AH.loadPosts();
  const posts = (data.posts || []).slice().sort((a,b) => (a.date < b.date ? 1 : -1));

  let shown = 0;
  const pageSize = 10;

  const renderChunk = () => {
    const chunk = posts.slice(shown, shown + pageSize);
    shown += chunk.length;

    const html = chunk.map(p => {
      const catUrl = window.AH.slugToPathCategory(p.category);
      return `
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
              <a class="chip category" href="${catUrl}" aria-label="View category ${escapeHtml(p.category)}">${escapeHtml(p.category)}</a>
            </div>
          </div>
        </article>
      `;
    }).join("");

    mount.insertAdjacentHTML("beforeend", html);
    window.AH.bindReveals();

    if (shown >= posts.length){
      loadMoreBtn?.setAttribute("disabled","disabled");
      loadMoreBtn && (loadMoreBtn.textContent = "No more posts");
    }
  };

  loadMoreBtn?.addEventListener("click", renderChunk);

  renderChunk();

  function escapeHtml(s){
    return (s || "").replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }
})();
