(async () => {
  const root = document.getElementById("postRoot");
  if (!root) return;

  const slug = (window.location.pathname.split("/").pop() || "").replace(".html","");
  const data = await window.AH.loadPosts();
  const posts = data.posts || [];
  const post = posts.find(p => p.slug === slug);

  if (!post){
    root.innerHTML = `
      <div class="wrap">
        <div class="hero">
          <div class="kicker"><span class="dot"></span>Not found</div>
          <h1>Post not found</h1>
          <p class="muted">This page exists, but the post data doesn’t. Check <code>/assets/data/posts.json</code>.</p>
          <div class="section"><a class="btn a2" href="/">Back to home</a></div>
        </div>
      </div>
    `;
    window.AH.setTitle("Post not found | AmpereHour");
    return;
  }

  // SEO
  const url = (data.site?.url || "https://example.com").replace(/\/$/,"") + `/posts/${post.slug}.html`;
  const title = `${post.title} | ${data.site?.name || "AmpereHour"}`;
  const desc = post.excerpt || "Read the latest on cards, banking hacks, and personal finance.";
  window.AH.setTitle(title);
  window.AH.setCanonical(url);
  window.AH.setMeta("description", desc);
  window.AH.setMeta("robots", "index,follow");
  window.AH.setMeta("og:title", title, true);
  window.AH.setMeta("og:description", desc, true);
  window.AH.setMeta("og:type", "article", true);
  window.AH.setMeta("og:url", url, true);
  window.AH.setMeta("og:image", post.thumbnail, true);
  window.AH.setMeta("twitter:card", "summary_large_image");
  window.AH.setMeta("twitter:title", title);
  window.AH.setMeta("twitter:description", desc);
  window.AH.setMeta("twitter:image", post.thumbnail);

  // Article schema
  window.AH.injectJsonLd("ld-article", {
    "@context":"https://schema.org",
    "@type":"Article",
    "headline": post.title,
    "description": desc,
    "image": [post.thumbnail],
    "datePublished": post.date,
    "dateModified": post.date,
    "author": {"@type":"Person","name": post.author?.name || "Author"},
    "publisher": {
      "@type":"Organization",
      "name": data.site?.name || "AmpereHour",
      "logo": {
        "@type":"ImageObject",
        "url": (data.site?.url || "https://example.com").replace(/\/$/,"") + "/assets/images/logo-round.svg"
      }
    },
    "mainEntityOfPage": {"@type":"WebPage","@id": url}
  });

  // FAQ schema if exists
  if (Array.isArray(post.faqs) && post.faqs.length){
    window.AH.injectJsonLd("ld-faq", {
      "@context":"https://schema.org",
      "@type":"FAQPage",
      "mainEntity": post.faqs.map(f => ({
        "@type":"Question",
        "name": f.q,
        "acceptedAnswer": {"@type":"Answer","text": f.a}
      }))
    });
  } else {
    const old = document.getElementById("ld-faq");
    old && old.remove();
  }

  // Render page
  root.innerHTML = `
    <div class="wrap">
      <div class="section">
        <a class="category-label tap" href="${window.AH.slugToPathCategory(post.category)}">${escapeHtml(post.category)}</a>
      </div>

      <article class="post-hero">
        <div class="thumb">
          <img src="${escapeHtml(post.thumbnail)}" alt="" width="1200" height="750" decoding="async">
        </div>
        <div class="content">
          <h1>${escapeHtml(post.title)}</h1>
          <div class="meta-row">
            <div class="meta-date">${escapeHtml(window.AH.formatDate(post.date))}</div>
            <div class="author-link" id="authorJump" role="link" tabindex="0" aria-label="Jump to author section">
              <span class="avatar">${post.author?.avatar ? `<img src="${escapeHtml(post.author.avatar)}" alt="" width="80" height="80" decoding="async">` : ``}</span>
              <span>By: ${escapeHtml(post.author?.name || "Author")}</span>
            </div>
          </div>
        </div>
      </article>

      <div class="post-body" id="postBody">
        ${post.bodyHtml}
      </div>

      <div class="end-sections">
        <div class="end-title">FAQs</div>
        ${renderFaqs(post.faqs)}

        <div class="end-title" id="author">Author</div>
        ${renderAuthor(post.author)}

        <div class="end-title">Sources</div>
        ${renderSources(post.sources)}

        <div class="end-title">Related Posts</div>
        <div class="related" id="related"></div>
      </div>
    </div>
  `;

  // Jump to author section
  const jump = document.getElementById("authorJump");
  const goAuthor = () => document.getElementById("author")?.scrollIntoView({behavior:"smooth", block:"start"});
  jump?.addEventListener("click", goAuthor);
  jump?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goAuthor(); }
  });

  // Accordion behavior (one open at a time)
  bindAccordion();

  // Related posts (latest 3 same category, excluding current, open new tab)
  const relatedMount = document.getElementById("related");
  const related = posts
    .filter(p => p.category === post.category && p.slug !== post.slug)
    .slice()
    .sort((a,b) => (a.date < b.date ? 1 : -1))
    .slice(0,3);

  relatedMount.innerHTML = related.map(p => `
    <a class="tap" href="/posts/${p.slug}.html" target="_blank" rel="noopener noreferrer">
      <div class="title">${escapeHtml(p.title)}</div>
      <div class="meta">${escapeHtml(window.AH.formatDate(p.date))} • ${escapeHtml(p.category)}</div>
    </a>
  `).join("") || `<div class="muted">No related posts yet.</div>`;

  function bindAccordion(){
    const items = Array.from(document.querySelectorAll(".acc-item"));
    items.forEach(it => {
      const btn = it.querySelector(".acc-btn");
      btn?.addEventListener("click", () => {
        const isOpen = it.classList.contains("is-open");
        items.forEach(x => x.classList.remove("is-open"));
        if (!isOpen) it.classList.add("is-open");
      });
    });
  }

  function renderFaqs(faqs){
    if (!Array.isArray(faqs) || !faqs.length){
      return `<div class="muted">No FAQs for this post yet.</div>`;
    }
    return `
      <div class="accordion" role="region" aria-label="FAQs">
        ${faqs.map((f, i) => `
          <div class="acc-item ${i===0 ? "is-open" : ""}">
            <button class="acc-btn" type="button" aria-expanded="${i===0 ? "true" : "false"}">
              <span>${escapeHtml(f.q)}</span>
              <span aria-hidden="true">⌄</span>
            </button>
            <div class="acc-panel"><div class="inner">${escapeHtml(f.a)}</div></div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderAuthor(author){
    const name = author?.name || "Author";
    const bio = author?.bio || "";
    const linkedin = author?.linkedin || "#";
    return `
      <section class="author-box">
        <div>
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(bio)}</p>
        </div>
        <div class="author-actions">
          <a class="small-icon-link" href="${escapeHtml(linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="Author LinkedIn">
            ${window.__AH_SVG_LINKEDIN || ""}
          </a>
        </div>
      </section>
    `;
  }

  function renderSources(sources){
    if (!Array.isArray(sources) || !sources.length){
      return `
        <details class="sources" open>
          <summary>Sources <span aria-hidden="true">⌄</span></summary>
          <div class="body"><div class="muted">No sources listed yet.</div></div>
        </details>
      `;
    }
    return `
      <details class="sources" open>
        <summary>Sources <span aria-hidden="true">⌄</span></summary>
        <div class="body">
          <ol>
            ${sources.map(s => `
              <li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a></li>
            `).join("")}
          </ol>
        </div>
      </details>
    `;
  }

  function escapeHtml(s){
    return (s || "").replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }
})();
