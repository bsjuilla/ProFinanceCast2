/**
 * app.js — bootstrap. Runs after partials are injected by include.js.
 *
 * Responsibilities:
 *   - Mark active sidebar nav item from <body data-page="...">
 *   - Init aurora hue shift
 *   - Apply magnetic effect to all .btn--primary
 *   - Reveal-on-scroll for [data-reveal]
 *   - Cmd/Ctrl-K command stub
 *   - Toast helper: window.PFC.toast(msg, type, opts)
 *   - Theme toggle (dark default; light theme reserved for future)
 */
(function () {
  "use strict";

  const PFC = (window.PFC = window.PFC || {});

  // -------------- Toast --------------
  function ensureToastStack() {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    return stack;
  }
  PFC.toast = function (message, type = "info", opts = {}) {
    const { duration = 4000 } = opts;
    const stack = ensureToastStack();
    const t = document.createElement("div");
    t.className = `toast toast--${type}`;
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    t.innerHTML = `
      <span class="toast__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
      </span>
      <div class="toast__body">${message}</div>`;
    stack.appendChild(t);
    requestAnimationFrame(() => t.classList.add("is-visible"));
    setTimeout(() => {
      t.classList.remove("is-visible");
      setTimeout(() => t.remove(), 320);
    }, duration);
  };

  // -------------- Sidebar active state --------------
  function applyActiveNav() {
    const page = document.body.getAttribute("data-page");
    if (!page) return;
    document
      .querySelectorAll(`.sidebar__link[data-nav="${page}"]`)
      .forEach((el) => el.setAttribute("data-active", "true"));
  }

  // -------------- Theme --------------
  function applyTheme() {
    const saved = localStorage.getItem("pfc-theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
  }
  function bindThemeToggle() {
    document
      .querySelectorAll('[data-action="toggle-theme"]')
      .forEach((btn) =>
        btn.addEventListener("click", () => {
          const cur = document.documentElement.getAttribute("data-theme") || "dark";
          const next = cur === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", next);
          localStorage.setItem("pfc-theme", next);
          PFC.toast(`Switched to ${next} mode`, "info", { duration: 2000 });
        })
      );
  }

  // -------------- Command palette stub --------------
  function bindCommandK() {
    document.addEventListener("keydown", (e) => {
      const isK = e.key === "k" || e.key === "K";
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        PFC.toast("Command palette coming soon", "info", { duration: 1800 });
      }
    });
    document
      .querySelectorAll('[data-action="open-command"]')
      .forEach((b) =>
        b.addEventListener("click", () =>
          PFC.toast("Command palette coming soon", "info", { duration: 1800 })
        )
      );
  }

  // -------------- Boot --------------
  function boot() {
    applyTheme();
    applyActiveNav();
    bindThemeToggle();
    bindCommandK();

    if (window.PFC_MOTION) {
      window.PFC_MOTION.pageTransition();
      window.PFC_MOTION.auroraShift();
      window.PFC_MOTION.revealOnScroll("[data-reveal]");
      document
        .querySelectorAll(".btn--primary")
        .forEach((b) => window.PFC_MOTION.magnetic(b, { strength: 0.18, radius: 70 }));
    }
  }

  // Run after partials are injected. If include.js never fires (no includes
  // on this page), fall back to DOMContentLoaded.
  let booted = false;
  function once() {
    if (booted) return;
    booted = true;
    boot();
  }
  document.addEventListener("pfc:partials-ready", once);
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(once, 0);
  } else {
    document.addEventListener("DOMContentLoaded", () => setTimeout(once, 50));
  }
})();
