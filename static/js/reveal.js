/* ============================================================================
 * reveal.js - IntersectionObserver-driven reveal-on-scroll.
 *
 * Adds `is-revealed` class to:
 *   - any element with [data-reveal]      (sections, stat blocks, prose)
 *   - any element with class "chart"      (hand-rolled SVG charts)
 *   - any element with class "rule--draw" (hairline divider draw)
 *
 * One-shot: once revealed, the observer disconnects from that node.
 * Honors prefers-reduced-motion globally by short-circuiting to immediate
 * reveal at script start.
 *
 * No dependencies. Under 2KB minified. Per RULING Q7 motion vocabulary.
 * ============================================================================ */
(function () {
  'use strict';

  var DOC = document;
  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SELECTORS = '[data-reveal], .chart, .rule--draw';

  function revealAll() {
    var nodes = DOC.querySelectorAll(SELECTORS);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.add('is-revealed');
    }
  }

  function init() {
    if (REDUCED || typeof IntersectionObserver === 'undefined') {
      revealAll();
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (e.isIntersecting) {
          e.target.classList.add('is-revealed');
          io.unobserve(e.target);
        }
      }
    }, {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.15
    });

    var nodes = DOC.querySelectorAll(SELECTORS);
    for (var j = 0; j < nodes.length; j++) {
      // If a chart sits above the fold already, reveal next tick so the
      // stroke-dasharray transition still has a state to animate from.
      io.observe(nodes[j]);
    }
  }

  if (DOC.readyState === 'loading') {
    DOC.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Re-scan after partials inject (header/footer/banner).
  DOC.addEventListener('pfc:partials-ready', init, { once: false });
})();
