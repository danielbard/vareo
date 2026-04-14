/**
 * Vareo main.js
 * - Keep this file pure JS (no <script> tags, no HTML comments)
 * - External libs (gsap, ScrollTrigger, SplitText, ...) are loaded in Webflow
 */

function waitForGsap(cb, tries = 80) {
  if (window.gsap && window.ScrollTrigger && window.SplitText) return cb();
  if (tries <= 0) return console.warn("GSAP / Plugins not loaded");
  setTimeout(() => waitForGsap(cb, tries - 1), 50);
}

function init() {
  // Runs immediately after DOM is ready
  initTwostepScalingNavigation();
  initDirectionalButtonHover();
  initWhatsAppModal();
  initNavImageHover();

  // Runs only when GSAP + plugins are present
  waitForGsap(() => {
    // Register once, when we know gsap exists
    if (window.gsap?.registerPlugin) {
      gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin, Physics2DPlugin);
    }

    initVariableFontWeightHover();
    initFooterParallax();
    init404Minigame();
    document.fonts.ready.then(() => {
      initHighlightMarkerTextReveal();
      initLineRevealTestimonials();
      initHighlightText();
    });
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
   Nav Image Hover
----------------------------- */
function initNavImageHover() {
  const links = document.querySelectorAll('[data-nav-image]');
  const images = document.querySelectorAll('.twostep-nav__visual-img');
  if (!links.length || !images.length) return;

  // Default image = current page link (w--current), fallback to first image
  const currentLink = document.querySelector('[data-nav-image].w--current');
  const defaultIndex = currentLink ? currentLink.getAttribute('data-nav-image') : '1';

  function showImage(index) {
    images.forEach(img => {
      img.style.opacity = img.classList.contains(`is-img-${index}`) ? '1' : '0';
    });
  }

  // Set default image on load
  showImage(defaultIndex);

  // Hover over link → show matching image, restore default on leave
  links.forEach(link => {
    if (link.classList.contains('w--current')) return;

    link.addEventListener('mouseenter', () => {
      showImage(link.getAttribute('data-nav-image'));
    });

    link.addEventListener('mouseleave', () => {
      showImage(defaultIndex);
    });
  });
}



/* -----------------------------
   Directional Button Hover
----------------------------- */
function initDirectionalButtonHover() {
  if (window.matchMedia('(hover: none)').matches) return;

  // Button hover animation
  document.querySelectorAll('[data-btn-hover]').forEach(button => {
    button.addEventListener('mouseenter', handleHover);
    button.addEventListener('mouseleave', handleHover);
  });

  function handleHover(event) {
    const button = event.currentTarget;
    const buttonRect = button.getBoundingClientRect();

    const buttonWidth = buttonRect.width;
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // Position of circle center as % of button dimensions
    const offsetXFromLeft = ((mouseX - buttonRect.left) / buttonWidth) * 100;
    const offsetYFromTop = ((mouseY - buttonRect.top) / buttonRect.height) * 100;

    // Max distance from mouse to any corner → minimum required radius
    const dx = Math.max(mouseX - buttonRect.left, buttonRect.right - mouseX);
    const dy = Math.max(mouseY - buttonRect.top, buttonRect.bottom - mouseY);
    const maxDist = Math.sqrt(dx * dx + dy * dy);

    // Diameter as % of button width, with 5% buffer
    const sizePercent = (maxDist * 2 / buttonWidth) * 100 * 1.05;

    const circle = button.querySelector('.btn__circle');
    if (circle) {
      circle.style.left = `${offsetXFromLeft.toFixed(1)}%`;
      circle.style.top = `${offsetYFromTop.toFixed(1)}%`;
      circle.style.width = `${sizePercent.toFixed(1)}%`;
    }
  }
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
   headline reveal (GSAP + ScrollTrigger + SplitText)
----------------------------- */
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
    orange: "#EC5B19",
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
          gsap.set(line, { position: "relative", overflow: "visible" });

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

/* -----------------------------
   Line Reveal Testimonials (GSAP + SplitText)
----------------------------- */
function initLineRevealTestimonials() {
  const wraps = document.querySelectorAll("[data-testimonial-wrap]");
  if (!wraps.length) return;

  wraps.forEach((wrap) => {
    const list = wrap.querySelector("[data-testimonial-list]");
    if (!list) return;

    const items = Array.from(list.querySelectorAll("[data-testimonial-item]"));
    if (!items.length) return;

    const btnPrev = wrap.querySelector("[data-prev]");
    const btnNext = wrap.querySelector("[data-next]");
    const elCurrent = wrap.querySelector("[data-current]");
    const elTotal = wrap.querySelector("[data-total]");

    if (elTotal) elTotal.textContent = String(items.length);

    let activeIndex = items.findIndex((el) => el.classList.contains("is--active"));
    if (activeIndex < 0) activeIndex = 0;

    let isAnimating = false;
    let reduceMotion = false;
    
    const autoplayEnabled = wrap.getAttribute("data-autoplay") === "true";
    const autoplayDuration = parseInt(wrap.getAttribute("data-autoplay-duration"), 10) || 4000;
    
    let autoplayCall = null;
    let isInView = true;

    const slides = items.map((item) => ({
      item,
      image: item.querySelector("[data-testimonial-img]"),
      
      splitTargets: [
        item.querySelector("[data-testimonial-text]"),
        ...item.querySelectorAll("[data-testimonial-split]"),
      ].filter(Boolean),
      
      splitInstances: [],
      
      getLines() {
        return this.splitInstances.flatMap((instance) => instance.lines);
      },
      
    }));

    function setSlideState(slideIndex, isActive) {
      const { item } = slides[slideIndex];
      item.classList.toggle("is--active", isActive);
      item.setAttribute("aria-hidden", String(!isActive));
      gsap.set(item, {
        autoAlpha: isActive ? 1 : 0,
        pointerEvents: isActive ? "auto" : "none",
      });
    }

    function updateCounter() {
      if (elCurrent) elCurrent.textContent = String(activeIndex + 1);
    }
    
    function startAutoplay() {
      if (!autoplayEnabled) return;
      if (autoplayCall) autoplayCall.kill();
    
      autoplayCall = gsap.delayedCall(autoplayDuration / 1000, () => {
        if (!isInView || isAnimating) {
          startAutoplay();
          return;
        }
        goTo((activeIndex + 1) % slides.length);
        startAutoplay();
      });
    }
    
    function pauseAutoplay() {
      if (autoplayCall) autoplayCall.pause();
    }
    
    function resumeAutoplay() {
      if (!autoplayEnabled) return;
      if (!autoplayCall) startAutoplay();
      else autoplayCall.resume();
    }
    
    function resetAutoplay() {
      if (!autoplayEnabled) return;
      startAutoplay();
    }

    // Set initial state
    slides.forEach((_, i) => setSlideState(i, i === activeIndex));
    updateCounter();

    // Handle reduced motion preference
    gsap.matchMedia().add(
      { reduce: "(prefers-reduced-motion: reduce)" },
      (context) => {
        reduceMotion = context.conditions.reduce;
      }
    );

    // Create SplitText instances
    slides.forEach((slide, slideIndex) => {
      slide.splitInstances = slide.splitTargets.map((el) =>
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "text-line",
          autoSplit: true,
          onSplit(self) {
            if (reduceMotion) return;

            const isActive = slideIndex === activeIndex;
            gsap.set(self.lines, { yPercent: isActive ? 0 : 110 });

            if (slide.image) {
              gsap.set(slide.image, {
                clipPath: isActive ? "circle(50% at 50% 50%)" : "circle(0% at 50% 50%)",
              });
            }
          },
        })
      );
    });

    function goTo(nextIndex) {
      if (isAnimating || nextIndex === activeIndex) return;
      isAnimating = true;

      const outgoingSlide = slides[activeIndex];
      const incomingSlide = slides[nextIndex];

      const tl = gsap.timeline({
        onComplete: () => {
          setSlideState(activeIndex, false);
          setSlideState(nextIndex, true);
          activeIndex = nextIndex;
          updateCounter();
          isAnimating = false;
        },
      });

      if (reduceMotion) {
        tl.to(outgoingSlide.item, { 
            autoAlpha: 0,
            duration: 0.4,
            ease: "power2"
          }, 0)
          .fromTo(incomingSlide.item, {
            autoAlpha: 0
          }, {
            autoAlpha: 1,
            duration: 0.4,
            ease: "power2"
          }, 0);
          
        return;
      }

      const outgoingLines = outgoingSlide.getLines();
      const incomingLines = incomingSlide.getLines();

      gsap.set(incomingSlide.item, { autoAlpha: 1, pointerEvents: "auto" });
      gsap.set(incomingLines, { yPercent: 110 });
  
      if (incomingSlide.image) gsap.set(incomingSlide.image, { clipPath: "circle(0% at 50% 50%)" });
      if (outgoingSlide.image) gsap.set(outgoingSlide.image, { clipPath: "circle(50% at 50% 50%)" });

      tl.to(outgoingLines, {
        yPercent: -110,
        duration: 0.6,
        ease: "power4.inOut",
        stagger: { amount: 0.25 },
      }, 0);

      if (outgoingSlide.image) {
        tl.to(outgoingSlide.image, {
          clipPath: "circle(0% at 50% 50%)",
          duration: 0.6,
          ease: "power4.inOut",
        }, 0);
      }

      tl.to(incomingLines, {
        yPercent: 0,
        duration: 0.7,
        ease: "power4.inOut",
        stagger: { amount: 0.4 },
      }, ">-=0.3");

      if (incomingSlide.image) {
        tl.to(incomingSlide.image, {
          clipPath: "circle(50% at 50% 50%)",
          duration: 0.75,
          ease: "power4.inOut",
        }, "<");
      }

      tl.set(outgoingSlide.item, { autoAlpha: 0 }, ">");
    }
  
    // Start autoplay on the wrap (only works if autoplay is set to 'true')
    startAutoplay();

    if (btnNext) {
      btnNext.addEventListener("click", () => {
        resetAutoplay();
        goTo((activeIndex + 1) % slides.length);
      });
    }
    
    if (btnPrev) {
      btnPrev.addEventListener("click", () => {
        resetAutoplay();
        goTo((activeIndex - 1 + slides.length) % slides.length);
      });
    }
        
    function onKeyDown(e) {
      if (!isInView) return;
    
      // Don't hijack arrow keys while user is typing.
      const t = e.target;
      const isTypingTarget =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
    
      if (isTypingTarget) return;
    
      if (e.key === "ArrowRight") {
        e.preventDefault();
        resetAutoplay();
        goTo((activeIndex + 1) % slides.length);
      }
    
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        resetAutoplay();
        goTo((activeIndex - 1 + slides.length) % slides.length);
      }
    }
    
    // Listen for left/right arrows
    window.addEventListener("keydown", onKeyDown);
    
    // Enable/disable keyboard + autoplay depending on scroll position
    ScrollTrigger.create({
      trigger: wrap,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => {
        isInView = true;
        resumeAutoplay();
      },
      onEnterBack: () => {
        isInView = true;
        resumeAutoplay();
      },
      onLeave: () => {
        isInView = false;
        pauseAutoplay();
      },
      onLeaveBack: () => {
        isInView = false;
        pauseAutoplay();
      },
    });

  });
}

/* -----------------------------
   Highlight Text on Scroll (GSAP + SplitText)
----------------------------- */
function initHighlightText() {
  const headings = document.querySelectorAll("[data-highlight-text]");
  if (!headings.length) return;

  headings.forEach((heading) => {
    const scrollStart  = heading.getAttribute("data-highlight-scroll-start")  || "top 90%";
    const scrollEnd    = heading.getAttribute("data-highlight-scroll-end")    || "center 40%";
    const fadedValue   = heading.getAttribute("data-highlight-fade")          || 0.2;
    const staggerValue = heading.getAttribute("data-highlight-stagger")       || 0.1;

    new SplitText(heading, {
      type: "words, chars",
      autoSplit: true,
      onSplit(self) {
        const ctx = gsap.context(() => {
          const tl = gsap.timeline({
            scrollTrigger: {
              scrub: true,
              trigger: heading,
              start: scrollStart,
              end: scrollEnd,
            },
          });
          tl.from(self.chars, {
            autoAlpha: fadedValue,
            stagger: staggerValue,
            ease: "linear",
          });
        });
        return ctx;
      },
    });
  });
}

/* -----------------------------
   WhatsApp Modal
----------------------------- */
function initWhatsAppModal() {
  const modal = document.querySelector('[data-whatsapp-modal]');
  if (!modal) return;

  // QR-code generation
  const url = (modal.getAttribute('data-whatsapp-modal') || '').trim();
  if (!url) return;

  // Generate an SVG QR via kjua
  const svg = kjua({
    text: url,
    render: 'svg',
    crisp: true,
    minVersion: 1,
    ecLevel: 'M',
    size: 540,
    fill: '#000000',
    back: '#FFFFFF',
    rounded: 0
  });

  // Let CSS control sizing
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.removeAttribute('style');

  // Insert into canvas (or multiple if needed)
  modal.querySelectorAll('[data-whatsapp-modal-qr-canvas]').forEach((placeholder, i) => {
    const node = i === 0 ? svg : svg.cloneNode(true);
    placeholder.appendChild(node);
  });

  // Add the link to all elements with [data-whatsapp-modal-link] attribute
  document.querySelectorAll('[data-whatsapp-modal-link]').forEach(linkEl => {
    linkEl.setAttribute('href', url);
    linkEl.setAttribute('target', '_blank');
  });

  // Toggle open/close the modal - capture phase ensures it fires before nav handlers
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-whatsapp-modal-toggle]')) {
      const isActive = modal.getAttribute('data-whatsapp-modal-status') === 'active';
      modal.setAttribute('data-whatsapp-modal-status', isActive ? 'not-active' : 'active');

      // Close navigation when modal opens
      if (!isActive) {
        const navStatusEl = document.querySelector('[data-nav-status]');
        if (navStatusEl) navStatusEl.setAttribute('data-nav-status', 'not-active');
      }
    }
  }, true);

  // Close on ESC key
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.keyCode === 27) {
      modal.setAttribute('data-whatsapp-modal-status', 'not-active');
    }
  });

  // Make component visible after JS init (prevents flash on load)
  const comp = document.querySelector('.whatsapp_component');
  if (comp) comp.style.opacity = '1';
}

/* -----------------------------
   404 Error Minigame
----------------------------- */
function initConfettiExplosion(x, y) {
  const container = document.querySelector('[data-minigame-init]');
  if (!container) return;

  const dotCount = gsap.utils.random(10, 20, 1);
  const colors   = ["#FEEADC ", "#F79E6E", "#E35205", "#CB5425", "#A6441D", "#4E1804"];

  for (let i = 0; i < dotCount; i++) {
    const dot = document.createElement("div");
    dot.classList.add("dot");
    container.appendChild(dot);

    gsap.set(dot, {
      left:  `${x}px`,
      top:   `${y}px`,
      scale: 0,
      backgroundColor: gsap.utils.random(colors)
    });

    gsap.timeline({ onComplete: () => dot.remove() })
      .to(dot, {
        scale:    gsap.utils.random(0.3, 1),
        duration: 0.3,
        ease:     "power3.out"
      })
      .to(dot, {
        duration: 2,
        physics2D: {
          velocity: gsap.utils.random(500, 1000),
          angle:    gsap.utils.random(0, 360),
          gravity:  500
        },
        autoAlpha: 0,
        ease:      "none"
      }, "<");
  }
}

function init404Minigame() {
  const CONFIG = {
    dragToVelocityRatio: 0.01,
    inertiaResistance:   20,
    pullReset:           { duration: 0.8, ease: 'elastic.out(1,0.5)' },
    rocketFadeOut:       { duration: 0.5 },
    maxSpeed:            2000,
    flyMinDuration:      1.5,
    flyMaxDuration:      3,
    flyRotateDuration:   1
  };

  const container = document.querySelector('[data-minigame-init]');
  if (!container) return;

  const pull          = container.querySelector('[data-minigame-pull]');
  const rocket        = container.querySelector('[data-minigame-rocket]');
  const line          = container.querySelector('[data-minigame-line]');
  const statusEl      = container.querySelector('[data-minigame-status]');
  const scoreTimeSpan = container.querySelector('[data-minigame-score-time]');
  const resetButton   = container.querySelector('[data-minigame-reset]');
  const flies         = Array.from(container.querySelectorAll('[data-minigame-fly]'));

  let dragStart, rocketTween, isFlying = false;
  let containerRect, origin;
  let startTime = null;

  const rawTargets = [
    ...container.querySelectorAll('[data-minigame-target]'),
    ...flies
  ];
  const allTargets = rawTargets.filter(el => el && window.getComputedStyle(el).display !== 'none');
  const totalTargets = allTargets.length;
  console.log(`🎯 Targets on load: ${totalTargets}`);
  const hitTargets   = new Set();
  const flyTweens    = new Map();

  function resetGame() {
    hitTargets.clear();
    allTargets.forEach(el => {
      el.style.visibility    = '';
      el.style.opacity       = '';
      el.style.pointerEvents = '';
    });

    startTime = null;
    statusEl.setAttribute('data-minigame-status','ready');
    scoreTimeSpan.textContent = '0.00';

    gsap.set([pull, rocket, line], {
      clearProps: 'all',
      x: 0, y: 0,
      opacity: 1,
      rotation: 0
    });
    isFlying = false;
    if (rocketTween) rocketTween.kill();

    containerRect = container.getBoundingClientRect();

    flies.forEach(fly => {
      if (flyTweens.has(fly)) flyTweens.get(fly).kill();

      const maxX = containerRect.width  - fly.offsetWidth;
      const maxY = containerRect.height - fly.offsetHeight;
      const startX = gsap.utils.random(0, maxX);
      const startY = gsap.utils.random(0, maxY);

      gsap.set(fly, { clearProps: 'x,y,rotation' });
      fly.style.left      = `${startX}px`;
      fly.style.top       = `${startY}px`;
      fly.style.transform = 'rotate(0deg)';

      moveFly(fly);
    });
  }

  resetButton.addEventListener('click', () => {
    console.log('🔄 Resetting game');
    resetGame();
  });
  resetGame();

  function moveFly(fly) {
    const maxX = containerRect.width  - fly.offsetWidth;
    const maxY = containerRect.height - fly.offsetHeight;
    const newX = gsap.utils.random(0, maxX);
    const newY = gsap.utils.random(0, maxY);

    const cur = fly.getBoundingClientRect();
    const curX = cur.left - containerRect.left;
    const curY = cur.top  - containerRect.top;
    const dx = newX - curX;
    const dy = newY - curY;
    const targetAngle = Math.atan2(dy, dx) * 180 / Math.PI + 90;

    gsap.to(fly, {
      rotation: targetAngle,
      duration: CONFIG.flyRotateDuration,
      ease:     'elastic.out(1,0.75)'
    });

    const tween = gsap.to(fly, {
      left:     `${newX}px`,
      top:      `${newY}px`,
      duration: gsap.utils.random(CONFIG.flyMinDuration, CONFIG.flyMaxDuration),
      ease:     'power1.inOut',
      onComplete: () => moveFly(fly)
    });
    flyTweens.set(fly, tween);
  }

  function rectsOverlap(r1, r2) {
    return !(
      r2.left   > r1.right ||
      r2.right  < r1.left  ||
      r2.top    > r1.bottom||
      r2.bottom < r1.top
    );
  }

  function onRocketUpdate() {
    const rRect = rocket.getBoundingClientRect();
    const cRect = containerRect;
    if (
      rRect.right  < cRect.left   ||
      rRect.left   > cRect.right  ||
      rRect.bottom < cRect.top    ||
      rRect.top    > cRect.bottom
    ) {
      rocketTween.kill();
      isFlying = false;
      gsap.set(rocket, { opacity: 0 });
      return;
    }
    for (let t of allTargets) {
      if (hitTargets.has(t)) continue;
      const tRect = t.getBoundingClientRect();
      if (rectsOverlap(rRect, tRect)) {
        hitTargets.add(t);
        console.log(`🏹 Hit ${hitTargets.size}/${totalTargets}`);
        if (flies.includes(t) && flyTweens.has(t)) flyTweens.get(t).kill();
        explodeTarget(t, tRect);
        onHit();
        break;
      }
    }
  }

  function onHit() {
    if (hitTargets.size === totalTargets) {
      console.log('✅ All targets hit!');
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      statusEl.setAttribute('data-minigame-status','finished');
      scoreTimeSpan.textContent = elapsed;
    }
  }

  function explodeTarget(el, tRect) {
    gsap.to(el, {
      scale:    0.95,
      opacity:  0.1,
      duration: 0.2,
      pointerEvents: 'none'
    });
    const cx = tRect.left + tRect.width/2  + window.scrollX;
    const cy = tRect.top  + tRect.height/2 + window.scrollY;
    initConfettiExplosion(cx, cy);
  }

  Draggable.create(pull, {
    type: 'x,y',
    bounds: container,

    onPress() {
      if (isFlying) return this.endDrag();
      if (!startTime) {
        startTime = Date.now();
        statusEl.setAttribute('data-minigame-status','running');
      }
      if (rocketTween) { rocketTween.kill(); isFlying = false; }
      gsap.set(rocket, { clearProps:'all', x:0, y:0, opacity:0, rotation:0 });

      containerRect         = container.getBoundingClientRect();
      this.hasDraggedEnough = false;

      const rb = rocket.getBoundingClientRect();
      origin = {
        x: (rb.left + rb.width/2) - containerRect.left,
        y: (rb.top  + rb.height/2) - containerRect.top
      };

      Object.assign(line.style, {
        left:            `${origin.x}px`,
        top:             `${origin.y}px`,
        width:           '0px',
        transform:       'rotate(0deg)',
        transformOrigin: '0 50%',
        opacity:         '0'
      });

      const pr = pull.getBoundingClientRect();
      dragStart = {
        x: pr.left + pr.width/2,
        y: pr.top  + pr.height/2
      };
      pull.classList.add('is--drag');
      pull.style.cursor = 'grabbing';
    },

    onDrag() {
      const pr = pull.getBoundingClientRect();
      const px = (pr.left + pr.width/2) - containerRect.left;
      const py = (pr.top  + pr.height/2) - containerRect.top;
      const dx = px - origin.x, dy = py - origin.y;
      const len = Math.hypot(dx, dy);
      if (len >= 24) this.hasDraggedEnough = true;

      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      line.style.width     = `${len}px`;
      line.style.transform = `rotate(${ang}deg)`;
      line.style.opacity   = '1';
      gsap.set(pull, { rotation: ang - 90 });
    },

    onRelease() {
      pull.style.cursor = 'grab';
      pull.classList.remove('is--drag');

      if (!this.hasDraggedEnough || isFlying) {
        gsap.to(pull, { x:0, y:0, rotate:0, ...CONFIG.pullReset });
        gsap.to(line, { opacity:0, duration:0.2 });
        return;
      }

      gsap.to(line, { opacity:0, duration:0.2 });

      const pr   = pull.getBoundingClientRect();
      const dx0  = dragStart.x - (pr.left + pr.width/2);
      const dy0  = dragStart.y - (pr.top  + pr.height/2);
      const avg  = (containerRect.width + containerRect.height)/2;
      const scale= CONFIG.dragToVelocityRatio * avg;
      let vx = dx0 * scale, vy = dy0 * scale;
      const speed = Math.hypot(vx, vy);
      if (speed > CONFIG.maxSpeed) {
        const f = CONFIG.maxSpeed/speed;
        vx *= f; vy *= f;
      }

      const launchAngle = Math.atan2(vy, vx) * 180 / Math.PI;
      gsap.set(rocket, { rotation: launchAngle + 90 });
      gsap.to(pull, { x:0, y:0, rotate:0, ...CONFIG.pullReset });
      gsap.set(rocket, { x:0, y:0, opacity:1 });
      isFlying = true;

      rocketTween = gsap.to(rocket, {
        inertia: {
          x: { velocity: vx },
          y: { velocity: vy },
          resistance: CONFIG.inertiaResistance
        },
        onUpdate: onRocketUpdate,
        onComplete: () => {
          isFlying = false;
          gsap.to(rocket, { opacity:0, duration: CONFIG.rocketFadeOut.duration });
        }
      });
    }
  });
}

/* -----------------------------
   Change Page Title on Leave
----------------------------- */
const documentTitleStore = document.title;
const documentTitleOnBlur = "Komm zurück! Wir vermissen dich"; // Define your custom title here

// Set original title if user is on the site
window.addEventListener("focus", () => {
  document.title = documentTitleStore;
});

// If user leaves tab, set the alternative title
window.addEventListener("blur", () => {
  document.title = documentTitleOnBlur;
});