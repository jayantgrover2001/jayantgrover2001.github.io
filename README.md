# Brutalist Modern Blog (Static-Friendly)

## Run locally
Because header/footer are shared via injected partials (fetch), run a local server from the project root:

```bash
python3 -m http.server 8080
```

Open: `http://localhost:8080/`

## Add a new post
1. Add a new object inside: `assets/data/posts.json` → `posts[]`
2. (Optional but recommended for SEO) Generate the post HTML + sitemap:

```bash
python3 build.py --site-url https://example.com
```

This regenerates:
- `posts/<slug>.html` for every post (with full SEO + Article/FAQ JSON-LD)
- `sitemap.xml` and `robots.txt`

Homepage + category pages + search automatically read `posts.json`, so you never edit homepage markup to list new posts.

## Notes
- Color palette is strictly: black/white + accents `#ff751f` and `#ffde59`.
- Header/footer are single-source components in:
  - `assets/partials/header.html`
  - `assets/partials/footer.html`
