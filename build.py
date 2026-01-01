#!/usr/bin/env python3
"""
Brutalist Blog static generator (SEO-first).

Reads:  /assets/data/posts.json
Writes:
  - /posts/<slug>.html (full SEO tags + Article/FAQ JSON-LD)
  - /categories/<category>.html skeletons if missing
  - /sitemap.xml
  - /robots.txt

Usage:
  python3 build.py --site-url https://your-domain.com

Notes:
- Header/footer are shared single-source components injected by /assets/js/site.js from /assets/partials/*.html.
- Homepage + category pages render listings dynamically from posts.json (no markup edits needed).
- Post pages are generated statically for best SEO + performance.
"""
import argparse, json, html, datetime, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def format_date(iso: str) -> str:
    try:
        d = datetime.date.fromisoformat(iso)
        return d.strftime("%b %d, %Y")
    except Exception:
        return iso

def cat_slug(cat: str) -> str:
    return cat.lower().strip().replace(" ", "-")

def extract_linkedin_svg() -> str:
    footer = (ROOT / "assets/partials/footer.html").read_text(encoding="utf-8")
    m = re.search(r'aria-label="LinkedIn"[^>]*>\s*(<svg class="icon".*?</svg>)', footer, re.S)
    return m.group(1) if m else '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9v11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'

def base_head(site_url: str, title: str, desc: str, path: str, og_type: str="website", og_image: str|None=None) -> str:
    canonical = f"{site_url}{path}"
    og_image = og_image or f"{site_url}/assets/images/logo-round.svg"
    return f"""
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#000000">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="{html.escape(canonical)}">
<link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/images/favicon.svg">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:type" content="{html.escape(og_type)}">
<meta property="og:url" content="{html.escape(canonical)}">
<meta property="og:image" content="{html.escape(og_image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html.escape(title)}">
<meta name="twitter:description" content="{html.escape(desc)}">
<meta name="twitter:image" content="{html.escape(og_image)}">
<link rel="preload" href="/assets/css/styles.css" as="style">
<link rel="stylesheet" href="/assets/css/styles.css">
<script defer src="/assets/js/site.js"></script>
<link rel="preconnect" href="https://picsum.photos">
""".strip()

def render_faqs(faqs: list[dict]) -> str:
    if not faqs:
        return '<div class="muted">No FAQs for this post yet.</div>'
    items = []
    for i, f in enumerate(faqs):
        open_cls = " is-open" if i == 0 else ""
        q = html.escape(f.get("q",""))
        a = html.escape(f.get("a",""))
        items.append(f"""
<div class="acc-item{open_cls}">
  <button class="acc-btn" type="button">
    <span>{q}</span>
    <span aria-hidden="true">⌄</span>
  </button>
  <div class="acc-panel"><div class="inner">{a}</div></div>
</div>""".strip())
    joined = "\n".join(items)
    return f"""<div class="accordion" role="region" aria-label="FAQs">
{joined}
</div>"""

def render_sources(sources: list[dict]) -> str:
    if not sources:
        body = '<div class="muted">No sources listed yet.</div>'
    else:
        lis = []
        for s in sources:
            label = html.escape(s.get("label","Source"))
            url = html.escape(s.get("url","#"))
            lis.append(f'<li><a href="{url}" target="_blank" rel="noopener noreferrer">{label}</a></li>')
        body = "<ol>\n" + "".join(lis) + "\n</ol>"
    return f"""<details class="sources" open>
  <summary>Sources <span aria-hidden="true">⌄</span></summary>
  <div class="body">{body}</div>
</details>"""

def render_author(author: dict, linkedin_svg: str) -> str:
    name = html.escape(author.get("name","Author"))
    bio = html.escape(author.get("bio",""))
    linkedin = html.escape(author.get("linkedin","#"))
    return f"""<section class="author-box">
  <div>
    <h3>{name}</h3>
    <p>{bio}</p>
  </div>
  <div class="author-actions">
    <a class="small-icon-link" href="{linkedin}" target="_blank" rel="noopener noreferrer" aria-label="Author LinkedIn">
      {linkedin_svg}
    </a>
  </div>
</section>"""

def article_schema(site_url: str, site_name: str, post: dict) -> dict:
    url = f"{site_url}/posts/{post['slug']}.html"
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post["title"],
        "description": post.get("excerpt",""),
        "image": [post.get("thumbnail","")],
        "datePublished": post["date"],
        "dateModified": post["date"],
        "author": {"@type":"Person","name": (post.get("author") or {}).get("name","Author")},
        "publisher": {
            "@type":"Organization",
            "name": site_name,
            "logo": {"@type":"ImageObject","url": f"{site_url}/assets/images/logo-round.svg"}
        },
        "mainEntityOfPage": {"@type":"WebPage","@id": url}
    }

def faq_schema(faqs: list[dict]) -> dict:
    return {
        "@context":"https://schema.org",
        "@type":"FAQPage",
        "mainEntity":[
            {"@type":"Question","name": f.get("q",""),
             "acceptedAnswer":{"@type":"Answer","text": f.get("a","")}}
            for f in faqs
        ]
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-url", required=True, help="Production site URL, e.g. https://amperehour.com")
    args = ap.parse_args()
    site_url = args.site_url.rstrip("/")

    data = json.loads((ROOT / "assets/data/posts.json").read_text(encoding="utf-8"))
    posts = sorted(data["posts"], key=lambda p: p["date"], reverse=True)
    site = data.get("site") or {}
    site_name = site.get("name","AmpereHour")

    categories = list(dict.fromkeys((data.get("categories") or []) + [p["category"] for p in posts]))
    linkedin_svg = extract_linkedin_svg()

    # Ensure category skeleton pages exist (JS populates listing)
    (ROOT / "categories").mkdir(parents=True, exist_ok=True)
    for cat in categories:
        slug = cat_slug(cat)
        cat_file = ROOT / "categories" / f"{slug}.html"
        if cat_file.exists():
            continue
        title = f"{cat} | {site_name}"
        desc = f"Browse all posts in {cat}."
        path = f"/categories/{slug}.html"
        cat_file.write_text(f"""<!doctype html>
<html lang="en" class="bg-grid">
<head>
{base_head(site_url, title, desc, path)}
</head>
<body>
  <div class="shell">
    <div id="siteHeader"></div>
    <main id="main">
      <div class="wrap">
        <section class="hero">
          <div class="kicker"><span class="dot"></span>Category</div>
          <h1 id="categoryTitle">{html.escape(cat)}</h1>
          <p class="muted"><span id="categorySub">0 posts</span> • Brutal clarity for better decisions.</p>
        </section>
        <div class="section" id="categoryMount" aria-label="Category posts"></div>
      </div>
    </main>
    <div id="siteFooter"></div>
  </div>
  <script defer src="/assets/js/pages/category.js"></script>
</body>
</html>
""".strip() + "\n", encoding="utf-8")

    # Generate post pages (static SEO + schemas)
    (ROOT / "posts").mkdir(parents=True, exist_ok=True)
    for post in posts:
        slug = post["slug"]
        path = f"/posts/{slug}.html"
        title = f"{post['title']} | {site_name}"
        desc = post.get("excerpt") or "Brutal clarity for better decisions—cards, banking hacks, and personal finance."
        og_image = post.get("thumbnail") or f"{site_url}/assets/images/logo-round.svg"

        author = post.get("author") or {}
        author_name = html.escape(author.get("name","Author"))
        avatar = author.get("avatar","")
        avatar_html = f'<span class="avatar"><img src="{html.escape(avatar)}" alt="" width="80" height="80" decoding="async"></span>' if avatar else '<span class="avatar"></span>'

        cat = post.get("category","")
        cat_url = f"/categories/{cat_slug(cat)}.html"

        article_ld = json.dumps(article_schema(site_url, site_name, post), ensure_ascii=False)
        faqs = post.get("faqs") or []
        faq_script = ""
        if faqs:
            faq_ld = json.dumps(faq_schema(faqs), ensure_ascii=False)
            faq_script = f'<script type="application/ld+json">{faq_ld}</script>'

        related = [p for p in posts if p["category"] == post["category"] and p["slug"] != post["slug"]]
        related = sorted(related, key=lambda p: p["date"], reverse=True)[:3]
        if not related:
            related_html = '<div class="muted">No related posts yet.</div>'
        else:
            related_html = "\n".join([
                f"""<a class="tap" href="/posts/{html.escape(p['slug'])}.html" target="_blank" rel="noopener noreferrer">
  <div class="title">{html.escape(p["title"])}</div>
  <div class="meta">{html.escape(format_date(p["date"]))} • {html.escape(p["category"])}</div>
</a>""" for p in related
            ])

        html_out = f"""<!doctype html>
<html lang="en" class="bg-grid">
<head>
{base_head(site_url, title, desc, path, og_type="article", og_image=og_image)}
<script type="application/ld+json">{article_ld}</script>
{faq_script}
</head>
<body>
  <div class="shell">
    <div id="siteHeader"></div>

    <main id="main">
      <div class="wrap">
        <div class="section">
          <a class="category-label tap" href="{cat_url}">{html.escape(cat)}</a>
        </div>

        <article class="post-hero">
          <div class="thumb">
            <img src="{html.escape(post.get("thumbnail",""))}" alt="" width="1200" height="750" decoding="async">
          </div>
          <div class="content">
            <h1>{html.escape(post["title"])}</h1>
            <div class="meta-row">
              <div class="meta-date">{html.escape(format_date(post["date"]))}</div>
              <a class="author-link" id="authorJump" href="#author" aria-label="Jump to author section">
                {avatar_html}
                <span>By: {author_name}</span>
              </a>
            </div>
          </div>
        </article>

        <div class="post-body" id="postBody">
          {post.get("bodyHtml","")}
        </div>

        <div class="end-sections">
          <div class="end-title">FAQs</div>
          {render_faqs(faqs)}

          <div class="end-title" id="author">Author</div>
          {render_author(author, linkedin_svg)}

          <div class="end-title">Sources</div>
          {render_sources(post.get("sources") or [])}

          <div class="end-title">Related Posts</div>
          <div class="related">
            {related_html}
          </div>
        </div>
      </div>
    </main>

    <div id="siteFooter"></div>
  </div>

  <script defer src="/assets/js/pages/post-interactions.js"></script>
</body>
</html>
"""
        (ROOT / "posts" / f"{slug}.html").write_text(html_out.strip() + "\n", encoding="utf-8")

    # Sitemap
    def url_entry(loc: str, priority: str) -> str:
        return f"""  <url>
    <loc>{html.escape(loc)}</loc>
    <priority>{priority}</priority>
  </url>"""

    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm.append(url_entry(f"{site_url}/", "1.0"))
    sm.append(url_entry(f"{site_url}/about.html", "0.7"))
    sm.append(url_entry(f"{site_url}/contact.html", "0.7"))
    sm.append(url_entry(f"{site_url}/card-comparisons.html", "0.5"))
    for cat in sorted(set(categories)):
        sm.append(url_entry(f"{site_url}/categories/{cat_slug(cat)}.html", "0.8"))
    for p in posts:
        sm.append(url_entry(f"{site_url}/posts/{p['slug']}.html", "0.9"))
    sm.append("</urlset>")

    (ROOT / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {site_url}/sitemap.xml\n", encoding="utf-8")

    print("Done. Generated post pages + sitemap/robots.")
    print("Tip: commit /posts/*.html, /sitemap.xml, /robots.txt")

if __name__ == "__main__":
    main()
