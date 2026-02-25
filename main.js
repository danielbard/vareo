/**
 * Vareo main.js
 * - Keep this file pure JS (no <script> tags, no HTML comments)
 * - External libs (gsap, ScrollTrigger, SplitText) are loaded in Webflow
 */

function waitForGsap(cb, tries = 80) {
  if (window.gsap && window.ScrollTrigger && window.SplitText) return cb();
  if (tries <= 0) return console.warn("GSAP / Plugins not loaded");
  setTimeout(() => waitForGsap(cb, tries - 1), 50);
}

function init() {
  // Runs immediately after DOM is ready
  initTwostepScalingNavigation();

  // Runs only when GSAP + plugins are present
  waitForGsap(() => {
    // Register once, when we know gsap exists
    if (window.gsap?.registerPlugin) {
      gsap.registerPlugin(ScrollTrigger);
    }

    initVariableFontWeightHover();
    initFooterParallax();
    initTabSystem();
  });
}

// Ensure init runs once
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

/* -----------------------------
   Navigation
----------------------------- */
function initTwostepScalingNavigation() {
  const navElement = document.querySelector("[data-twostep-nav]");
  const navStatusEl = document.querySelector("[data-nav-status]");
  if (!navElement || !navStatusEl) return;

  const setNavStatus = (status) => navStatusEl.setAttribute("data-nav-status", status);
  const isActive = () => navStatusEl.getAttribute("data-nav-status") === "active";

  const openNav = () => setNavStatus("active");
  const closeNav = () => setNavStatus("not-active");
  const toggleNav = () => (isActive() ? closeNav() : openNav());

  document.querySelectorAll('[data-nav-toggle="toggle"]').forEach((btn) => {
    btn.addEventListener("click", toggleNav);
  });

  document.querySelectorAll('[data-nav-toggle="close"]').forEach((btn) => {
    btn.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isActive()) closeNav();
  });
}

/* -----------------------------
   Variable Font Weight Hover (GSAP + SplitText)
----------------------------- */
function initVariableFontWeightHover() {
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (isTouch || reduceMotion) return;

  const targets = document.querySelectorAll("[data-font-weight-hover]");
  if (!targets.length) return;

  const rangeDefault = 400;
  const mouse = { x: 0, y: 0 };
  let hasPointer = false;
  let isActive = false;

  const chars = [];

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function numAttr(el, key, fallback) {
    const v = parseFloat(el.dataset[key]);
    return Number.isFinite(v) ? v : fallback;
  }

  function readFontWeight(el) {
    const fw = getComputedStyle(el).fontWeight;
    const parsed = parseFloat(fw);
    if (Number.isFinite(parsed)) return parsed;
    if (fw === "bold") return 700;
    return 400;
  }

  function weightFromDistance(dist, minw, maxw, range) {
    if (dist >= range) return minw;
    const t = 1 - dist / range;
    return minw + (maxw - minw) * t;
  }

  function calculatePositions() {
    for (let i = 0; i < chars.length; i++) {
      const r = chars[i].el.getBoundingClientRect();
      chars[i].cx = r.left + r.width / 2 + window.scrollX;
      chars[i].cy = r.top + r.height / 2 + window.scrollY;
    }
  }

  function splitChars(el) {
    if (el.dataset.fontWeightHoverInit === "true") return null;
    el.dataset.fontWeightHoverInit = "true";

    el.fontWeightHoverSplit =
      el.fontWeightHoverSplit || new SplitText(el, { type: "chars,words", charsClass: "char" });

    return el.fontWeightHoverSplit.chars || [];
  }

  function activate() {
    if (isActive) return;
    isActive = true;

    for (let i = 0; i < chars.length; i++) {
      const d = chars[i];
      d.el.style.setProperty("--wght", d.startw);
      d.el.style.fontVariationSettings = "'wght' var(--wght)";
    }

    calculatePositions();
  }

  targets.forEach((el) => {
    const minw = numAttr(el, "min", 300);
    const maxw = numAttr(el, "max", 700);
    const range = numAttr(el, "range", rangeDefault);

    const split = splitChars(el);
    if (!split) return;

    split.forEach((ch) => {
      const startw = readFontWeight(ch);

      chars.push({
        el: ch,
        cx: 0,
        cy: 0,
        startw,
        minw,
        maxw,
        range,
        setw: gsap.quickTo(ch, "--wght", {
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto",
        }),
      });
    });
  });

  window.addEventListener(
    "pointermove",
    (e) => {
      hasPointer = true;
      mouse.x = e.pageX;
      mouse.y = e.pageY;
      if (!isActive) activate();
    },
    { passive: true }
  );

  window.addEventListener("resize", () => isActive && calculatePositions(), { passive: true });
  window.addEventListener("scroll", () => isActive && calculatePositions(), { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => isActive && calculatePositions()).catch(() => {});
  }

  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => isActive && calculatePositions());
    targets.forEach((el) => ro.observe(el));
  }

  gsap.ticker.add(() => {
    if (!hasPointer || !isActive) return;

    for (let i = 0; i < chars.length; i++) {
      const d = chars[i];
      const dist = Math.hypot(mouse.x - d.cx, mouse.y - d.cy);
      const w = weightFromDistance(dist, d.minw, d.maxw, d.range);
      d.setw(clamp(w, d.minw, d.maxw));
    }
  });
}

/* -----------------------------
   Footer Parallax (GSAP + ScrollTrigger)
----------------------------- */
function initFooterParallax() {
  document.querySelectorAll("[data-footer-parallax]").forEach((el) => {
    const inner = el.querySelector("[data-footer-parallax-inner]");
    const dark = el.querySelector("[data-footer-parallax-dark]");

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "clamp(top bottom)",
        end: "clamp(top top)",
        scrub: true,
      },
    });

    if (inner) tl.from(inner, { yPercent: -25, ease: "linear" });
    if (dark) tl.from(dark, { opacity: 0.5, ease: "linear" }, "<");
  });
}

/* -----------------------------
   Tabs Autoplay (GSAP)
----------------------------- */
function initTabSystem() {
  const wrappers = document.querySelectorAll('[data-tabs="wrapper"]');

  wrappers.forEach((wrapper) => {
    const contentItems = wrapper.querySelectorAll('[data-tabs="content-item"]');
    const visualItems = wrapper.querySelectorAll('[data-tabs="visual-item"]');

    if (!contentItems.length || !visualItems.length) return;

    const autoplay = wrapper.dataset.tabsAutoplay === "true";
    const autoplayDuration = parseInt(wrapper.dataset.tabsAutoplayDuration, 10) || 5000;

    let activeContent = null;
    let activeVisual = null;
    let isAnimating = false;
    let progressBarTween = null;

    function startProgressBar(index) {
      if (progressBarTween) progressBarTween.kill();
      const bar = contentItems[index].querySelector('[data-tabs="item-progress"]');
      if (!bar) return;

      gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
      progressBarTween = gsap.to(bar, {
        scaleX: 1,
        duration: autoplayDuration / 1000,
        ease: "power1.inOut",
        onComplete: () => {
          if (!isAnimating) switchTab((index + 1) % contentItems.length);
        },
      });
    }

    function switchTab(index) {
      if (isAnimating || contentItems[index] === activeContent) return;

      isAnimating = true;
      if (progressBarTween) progressBarTween.kill();

      const outgoingContent = activeContent;
      const outgoingVisual = activeVisual;
      const outgoingBar = outgoingContent?.querySelector('[data-tabs="item-progress"]');

      const incomingContent = contentItems[index];
      const incomingVisual = visualItems[index];
      const incomingBar = incomingContent.querySelector('[data-tabs="item-progress"]');

      const tl = gsap.timeline({
        defaults: { duration: 0.65, ease: "power3" },
        onComplete: () => {
          activeContent = incomingContent;
          activeVisual = incomingVisual;
          isAnimating = false;
          if (autoplay) startProgressBar(index);
        },
      });

      if (outgoingContent) {
        tl.set(outgoingBar, { transformOrigin: "right center" })
          .to(outgoingBar, { scaleX: 0, duration: 0.3 }, 0)
          .to(outgoingVisual, { autoAlpha: 0, xPercent: 3 }, 0)
          .to(outgoingContent.querySelector('[data-tabs="item-details"]'), { height: 0 }, 0);
      }

      tl.fromTo(incomingVisual, { autoAlpha: 0, xPercent: 3 }, { autoAlpha: 1, xPercent: 0 }, 0.3)
        .fromTo(incomingContent.querySelector('[data-tabs="item-details"]'), { height: 0 }, { height: "auto" }, 0)
        .set(incomingBar, { scaleX: 0, transformOrigin: "left center" }, 0);

      incomingContent.classList.add("active");
      incomingVisual.classList.add("active");
      outgoingContent?.classList.remove("active");
      outgoingVisual?.classList.remove("active");
    }

    switchTab(0);

    contentItems.forEach((item, i) =>
      item.addEventListener("click", () => {
        if (item === activeContent) return;
        switchTab(i);
      })
    );
  });
}