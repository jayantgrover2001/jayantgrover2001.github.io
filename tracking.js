(() => {
  // Prevent double-init
  if (window.__TRACKING_LOADED__) return;
  window.__TRACKING_LOADED__ = true;

  /** -----------------------------
   *  Add trackers below
   *  -----------------------------
   */

  const GA_ID = "G-78GM3EM9WE";
  if (GA_ID) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    gtag("js", new Date());
    gtag("config", GA_ID, { anonymize_ip: true });
  }

  // Add more trackers here (Meta Pixel, Clarity, etc.)
})();
