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
   Highlight Marker Text Reveal (GSAP + SplitText + ScrollTrigger)
----------------------------- 
function initHighlightMarkerTextReveal() {
  const defaults = {
    direction: "right",
    theme: "pink",
    scrollStart: "top 90%",
    staggerStart: "start",
    stagger: 100,
    barDuration: 0.6,
    barEase: "power3.inOut",
  };

  const colorMap = {
    pink: "#C700EF",
    orange: "#EC5B19"
    white: "#FFFFFF",
  };

  const directionMap = {
    right: { prop: "scaleX", origin: "right center" },
    left: { prop: "scaleX", origin: "left center" },
    up: { prop: "scaleY", origin: "center top" },
    down: { prop: "scaleY", origin: "center bottom" },
  };

  function resolveColor(value) {
    if (colorMap[value]) return colorMap[value];
    if (value.startsWith("--")) {
      return getComputedStyle(document.body).getPropertyValue(value).trim() || value;
    }
    return value;
  }

  function createBar(color, origin) {
    const bar = document.createElement("div");
    bar.className = "highlight-marker-bar";
    Object.assign(bar.style, {
      backgroundColor: color,
      transformOrigin: origin,
    });
    return bar;
  }

  function cleanupElement(el) {
    if (!el._highlightMarkerReveal) return;
    el._highlightMarkerReveal.timeline?.kill();
    el._highlightMarkerReveal.scrollTrigger?.kill();
    el._highlightMarkerReveal.split?.revert();
    el.querySelectorAll(".highlight-marker-bar").forEach((bar) => bar.remove());
    delete el._highlightMarkerReveal;
  }

  let reduceMotion = false;

  gsap.matchMedia().add(
    { reduce: "(prefers-reduced-motion: reduce)" },
    (context) => {
      reduceMotion = context.conditions.reduce;
    }
  );

  // Reduced motion: no animation at all
  if (reduceMotion) {
    document.querySelectorAll("[data-highlight-marker-reveal]").forEach((el) => {
      gsap.set(el, { autoAlpha: 1 });
    });
    return;
  }

  // Cleanup previous instances
  document.querySelectorAll("[data-highlight-marker-reveal]").forEach(cleanupElement);

  const elements = document.querySelectorAll("[data-highlight-marker-reveal]");
  if (!elements.length) return;

  elements.forEach((el) => {
    const direction = el.getAttribute("data-marker-direction") || defaults.direction;
    const theme = el.getAttribute("data-marker-theme") || defaults.theme;
    const scrollStart = el.getAttribute("data-marker-scroll-start") || defaults.scrollStart;
    const staggerStart = el.getAttribute("data-marker-stagger-start") || defaults.staggerStart;
    const staggerOffset = (parseFloat(el.getAttribute("data-marker-stagger")) || defaults.stagger) / 1000;

    const color = resolveColor(theme);
    const dirConfig = directionMap[direction] || directionMap.right;

    el._highlightMarkerReveal = {};

    const split = SplitText.create(el, {
      type: "lines",
      linesClass: "highlight-marker-line",
      autoSplit: true,
      onSplit(self) {
        const instance = el._highlightMarkerReveal;

        // Teardown previous build
        instance.timeline?.kill();
        instance.scrollTrigger?.kill();
        el.querySelectorAll(".highlight-marker-bar").forEach((bar) => bar.remove());

        // Build bars and timeline
        const lines = self.lines;
        const tl = gsap.timeline({ paused: true });

        lines.forEach((line, i) => {
          gsap.set(line, { position: "relative", overflow: "hidden" });

          const bar = createBar(color, dirConfig.origin);
          line.appendChild(bar);

          const staggerIndex = staggerStart === "end" ? lines.length - 1 - i : i;

          tl.to(bar, {
            [dirConfig.prop]: 0,
            duration: defaults.barDuration,
            ease: defaults.barEase,
          }, staggerIndex * staggerOffset);
        });

        // Reveal parent — bars are covering the text
        gsap.set(el, { autoAlpha: 1 });

        // ScrollTrigger
        const st = ScrollTrigger.create({
          trigger: el,
          start: scrollStart,
          once: true,
          onEnter: () => tl.play(),
        });

        instance.timeline = tl;
        instance.scrollTrigger = st;
      },
    });

    el._highlightMarkerReveal.split = split;
  });
}

// Initialize Highlight Marker Text Reveal
document.addEventListener("DOMContentLoaded", () => {
  document.fonts.ready.then(() => {
    initHighlightMarkerTextReveal();
  });
});
*/
