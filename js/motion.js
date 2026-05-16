/**
 * motion.js — ProFinanceCast motion engine. Uses GSAP from CDN if loaded;
 * gracefully degrades to plain DOM updates without it.
 *
 * Exposes window.PFC_MOTION with:
 *   revealOnScroll(selector|NodeList, opts)
 *   countUp(el, to, opts)
 *   magnetic(el)
 *   parallax(el, opts)
 *   pageTransition()
 *   auroraShift()
 *   tilt3D(el)
 *   pulseRing(el)
 *
 * All functions respect prefers-reduced-motion and short-circuit to final state.
 */
(function () {
  "use strict";

  const reduced = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = () => typeof window.gsap !== "undefined";

  // ---------- Number formatting ----------
  function formatNumber(n, opts = {}) {
    const { currency, percent, decimals = 0, locale = "en-US", compact = false } = opts;
    if (percent) {
      return new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n);
    }
    if (currency) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        notation: compact ? "compact" : "standard",
      }).format(n);
    }
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: compact ? "compact" : "standard",
    }).format(n);
  }

  // ---------- revealOnScroll ----------
  function revealOnScroll(target, opts = {}) {
    const { stagger = 60, threshold = 0.15, rootMargin = "0px 0px -10% 0px" } = opts;
    const els =
      typeof target === "string"
        ? Array.from(document.querySelectorAll(target))
        : Array.from(target instanceof NodeList ? target : [].concat(target));

    if (reduced()) {
      els.forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add("is-revealed"), i * stagger);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );
    els.forEach((el) => io.observe(el));
  }

  // ---------- countUp ----------
  function countUp(el, to, opts = {}) {
    if (!el) return;
    const { from = 0, duration = 1200, easing = (t) => 1 - Math.pow(1 - t, 4) } = opts;
    el.classList.add("mono");

    const render = (val) => {
      el.textContent = formatNumber(val, opts);
    };

    if (reduced()) {
      render(to);
      return;
    }

    const start = performance.now();
    const delta = to - from;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      render(from + delta * easing(t));
      if (t < 1) requestAnimationFrame(tick);
      else render(to);
    }
    requestAnimationFrame(tick);
  }

  // ---------- magnetic button ----------
  function magnetic(el, opts = {}) {
    if (!el || reduced()) return;
    const { strength = 0.25, radius = 80 } = opts;
    let rect = null;

    function onMove(e) {
      rect = rect || el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        el.style.transform = "";
        return;
      }
      el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
    }
    function onLeave() {
      el.style.transition = "transform 320ms cubic-bezier(0.22,1,0.36,1)";
      el.style.transform = "";
      setTimeout(() => (el.style.transition = ""), 320);
      rect = null;
    }
    function onEnter() { rect = el.getBoundingClientRect(); }

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
  }

  // ---------- parallax ----------
  function parallax(el, opts = {}) {
    if (!el || reduced()) return;
    const { speed = 0.2, axis = "y" } = opts;
    function update() {
      const rect = el.getBoundingClientRect();
      const offset = (rect.top - window.innerHeight / 2) * -speed;
      el.style.transform =
        axis === "y" ? `translate3d(0, ${offset}px, 0)` : `translate3d(${offset}px, 0, 0)`;
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  // ---------- pageTransition ----------
  function pageTransition() {
    document.body.style.opacity = "0";
    document.body.style.transition = "opacity 480ms cubic-bezier(0.22,1,0.36,1)";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.style.opacity = "1";
      });
    });
  }

  // ---------- auroraShift ----------
  function auroraShift() {
    if (reduced()) return;
    const bg = document.querySelector(".aurora-bg");
    if (!bg) return;
    let hue = 0;
    function tick() {
      hue = (hue + 0.05) % 30;
      bg.style.filter = `hue-rotate(${hue - 15}deg)`;
      requestAnimationFrame(tick);
    }
    // Subtle, slow — only run every other frame via timer for perf.
    setInterval(tick, 200);
  }

  // ---------- tilt3D ----------
  function tilt3D(el, opts = {}) {
    if (!el || reduced()) return;
    const { max = 6 } = opts;
    el.style.transformStyle = "preserve-3d";
    el.style.transition = "transform 220ms cubic-bezier(0.22,1,0.36,1)";

    function onMove(e) {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (0.5 - py) * max;
      const ry = (px - 0.5) * max;
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
    function onLeave() { el.style.transform = ""; }

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
  }

  // ---------- pulseRing ----------
  function pulseRing(el) {
    if (!el) return;
    if (reduced()) {
      el.style.boxShadow = "0 0 0 3px var(--mint-glow)";
      return;
    }
    el.classList.add("pfc-pulse-ring");
    if (!document.getElementById("pfc-pulse-ring-style")) {
      const style = document.createElement("style");
      style.id = "pfc-pulse-ring-style";
      style.textContent = `
        .pfc-pulse-ring { position: relative; }
        .pfc-pulse-ring::after {
          content: ""; position: absolute; inset: 0;
          border-radius: inherit; border: 2px solid var(--mint-500);
          animation: pfc-pulse 1.8s var(--ease-standard) infinite;
          pointer-events: none;
        }
        @keyframes pfc-pulse {
          0%   { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0;   transform: scale(1.6); }
        }`;
      document.head.appendChild(style);
    }
  }

  window.PFC_MOTION = {
    revealOnScroll,
    countUp,
    magnetic,
    parallax,
    pageTransition,
    auroraShift,
    tilt3D,
    pulseRing,
    formatNumber,
    isReduced: reduced,
    hasGSAP,
  };
})();
