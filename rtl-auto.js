(() => {
  const rtlLangs = new Set(["ar", "he", "fa", "ur", "ps", "dv", "ku", "yi", "ug"]);
  const html = document.documentElement;

  const bsLtr = document.getElementById("bs-ltr");
  const bsRtl = document.getElementById("bs-rtl");

  let lastMode = null;      // "rtl" or "ltr"
  let lastLang = null;      // last detected language (if any)
  let scheduled = false;    // debounce flag

  function getGoogTransCookieLang() {
    // GT widget cookie format often: googtrans=/en/ar
    const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
    if (!match) return null;

    const val = decodeURIComponent(match[1]); // "/en/ar"
    const parts = val.split("/");
    const lang = parts[parts.length - 1];
    return lang || null;
  }

  function getComboLang() {
    const combo = document.querySelector("select.goog-te-combo");
    return combo?.value || null;
  }

  function getHtmlLang() {
    return html.getAttribute("lang") || null;
  }

  function isRtlLang(lang) {
    if (!lang) return false;
    const base = lang.toLowerCase().split("-")[0];
    return rtlLangs.has(base);
  }

  // Heuristic for browser translate: sample visible text and detect RTL scripts
  function isRtlByTextSample() {
    // Keep it cheap: read a slice of innerText
    const text = (document.body?.innerText || "").slice(0, 2000);
    if (!text) return false;

    // Arabic + Hebrew ranges (basic coverage)
    const rtlChar = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFB4F\uFB50-\uFDFF\uFE70-\uFEFF]/g;
    const matches = text.match(rtlChar);
    const rtlCount = matches ? matches.length : 0;

    // Require a minimum count to avoid false positives
    return rtlCount >= 20;
  }

  function applyMode(mode) {
    if (mode === lastMode) return;
    lastMode = mode;

    html.setAttribute("dir", mode);

    if (bsLtr && bsRtl) {
      const rtlOn = mode === "rtl";
      bsLtr.disabled = rtlOn;
      bsRtl.disabled = !rtlOn;
    }
  }

  function detectAndApply() {
    // 1) GT widget cookie
    const cookieLang = getGoogTransCookieLang();
    if (cookieLang) {
      lastLang = cookieLang;
      applyMode(isRtlLang(cookieLang) ? "rtl" : "ltr");
      return;
    }

    // 2) GT widget dropdown
    const comboLang = getComboLang();
    if (comboLang) {
      lastLang = comboLang;
      applyMode(isRtlLang(comboLang) ? "rtl" : "ltr");
      return;
    }

    // 3) html lang attribute (sometimes changes)
    const htmlLang = getHtmlLang();
    if (htmlLang && htmlLang !== lastLang) {
      lastLang = htmlLang;
      applyMode(isRtlLang(htmlLang) ? "rtl" : "ltr");
      return;
    }

    // 4) Browser translate fallback: detect by text
    applyMode(isRtlByTextSample() ? "rtl" : "ltr");
  }

  // Debounced scheduler to avoid thrashing
  function scheduleDetect() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      detectAndApply();
    }, 300);
  }

  // Observe major DOM changes (browser translate rewrites lots of text)
  const obs = new MutationObserver(scheduleDetect);
  obs.observe(document.body, { childList: true, subtree: true });

  // Cookie/lang changes aren’t always observable; gentle polling as backup
  setInterval(detectAndApply, 2000);

  // Initial
  detectAndApply();

  // Newsletter demo (optional)
  const form = document.getElementById("newsletterForm");
  const statusEl = document.getElementById("formStatus");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (statusEl) statusEl.textContent = "Thanks! You’re subscribed (demo).";
    form.reset();
  });
})();
