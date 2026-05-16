/**
 * include.js — tiny HTML partial loader.
 *
 * Usage:  <div data-include="/partials/sidebar.html"></div>
 *
 * Scans on DOMContentLoaded, fetches each unique partial (cached), injects markup,
 * then dispatches `pfc:partials-ready` on document so other scripts can hook in.
 *
 * Relative paths are resolved against document base. Absolute paths (starting with /)
 * work at any URL depth as long as the site is served from root.
 */
(function () {
  "use strict";

  const cache = new Map();

  async function fetchPartial(url) {
    if (cache.has(url)) return cache.get(url);
    const p = fetch(url, { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
        return r.text();
      })
      .catch((err) => {
        console.error("[include]", err);
        return `<!-- include failed: ${url} -->`;
      });
    cache.set(url, p);
    return p;
  }

  async function processIncludes(root = document) {
    const nodes = Array.from(root.querySelectorAll("[data-include]"));
    if (!nodes.length) return;

    await Promise.all(
      nodes.map(async (node) => {
        const url = node.getAttribute("data-include");
        if (!url) return;
        const html = await fetchPartial(url);
        // Insert and replace placeholder div with the partial markup.
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        const frag = document.createDocumentFragment();
        while (tmp.firstChild) frag.appendChild(tmp.firstChild);
        node.replaceWith(frag);
      })
    );

    // Recurse — partials may themselves include partials.
    if (root.querySelector("[data-include]")) {
      await processIncludes(root);
    }
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(async () => {
    await processIncludes(document);
    document.dispatchEvent(
      new CustomEvent("pfc:partials-ready", { bubbles: true })
    );
  });

  // Expose for manual re-runs (e.g. after dynamic page swaps).
  window.PFC_INCLUDE = { process: processIncludes };
})();
