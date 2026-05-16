/* =============================================================================
   pfc-include.js — tiny partial loader.
   Scans for <div data-include="/partials/foo.html"></div>, fetches and injects
   the markup, then dispatches `pfc:partials-ready` once every include resolves.
   ============================================================================= */
(function () {
  "use strict";

  function injectPartial(host) {
    var url = host.getAttribute("data-include");
    if (!url) return Promise.resolve();

    return fetch(url, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("pfc-include: failed to fetch " + url + " (" + res.status + ")");
        }
        return res.text();
      })
      .then(function (html) {
        host.innerHTML = html;
        host.setAttribute("data-included", "true");
      })
      .catch(function (err) {
        host.innerHTML = "";
        host.setAttribute("data-include-error", err.message);
        if (window.console && console.warn) {
          console.warn(err);
        }
      });
  }

  function run() {
    var hosts = Array.prototype.slice.call(
      document.querySelectorAll("[data-include]:not([data-included])")
    );
    if (!hosts.length) {
      document.dispatchEvent(new CustomEvent("pfc:partials-ready"));
      return;
    }
    Promise.all(hosts.map(injectPartial)).then(function () {
      document.dispatchEvent(new CustomEvent("pfc:partials-ready"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  window.PFC_INCLUDE = { run: run };
})();
