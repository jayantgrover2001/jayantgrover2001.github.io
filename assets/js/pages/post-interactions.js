(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  function bindAccordion(){
    const items = $$(".acc-item");
    if (!items.length) return;
    items.forEach(it => {
      const btn = it.querySelector(".acc-btn");
      if (!btn) return;
      btn.addEventListener("click", () => {
        const wasOpen = it.classList.contains("is-open");
        items.forEach(x => x.classList.remove("is-open"));
        if (!wasOpen) it.classList.add("is-open");
      });
    });
  }

  function bindAuthorJump(){
    const link = $("#authorJump");
    const target = $("#author");
    if (!link || !target) return;
    const go = (e) => {
      e?.preventDefault?.();
      target.scrollIntoView({behavior:"smooth", block:"start"});
    };
    link.addEventListener("click", go);
    link.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(e); }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindAccordion();
    bindAuthorJump();
  });
})();
