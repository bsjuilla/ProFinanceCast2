/* ============================================================================
 * partials.js - runtime injection of header / footer / banner / sidebar.
 *
 * Usage in HTML:
 *   <div data-include="header"></div>
 *   <div data-include="banner"></div>
 *   <div data-include="sidebar"></div>
 *   <div data-include="footer"></div>
 *
 * Each placeholder is replaced by the matching /static/partials/<name>.html.
 * Inside the partials, the literal token {{ROOT}} is substituted with the
 * computed path prefix so links resolve from any depth (/blog/, /tools/).
 *
 * Active-link marking: <a data-href="dashboard.html"> becomes aria-current
 * when the current URL path ends with that href. data-href is preferred over
 * href so {{ROOT}} resolution and active-marking remain independent.
 *
 * Emits CustomEvent "pfc:partials-ready" on document when complete (used by
 * reveal.js to re-scan injected nodes).
 * ============================================================================ */
(function () {
  'use strict';

  var DOC = document;
  var SCRIPT = DOC.currentScript;

  // Resolve the static root from the running script's src.
  // Example: /static/js/partials.js -> root = "/"
  // Example: blog/post.html that loads "../static/js/partials.js" -> root = "../"
  function computeRoot() {
    if (SCRIPT && SCRIPT.src) {
      var src = SCRIPT.getAttribute('src') || '';
      // Strip "static/js/partials.js" tail to get the project root prefix.
      var marker = 'static/js/partials.js';
      var i = src.lastIndexOf(marker);
      if (i >= 0) return src.slice(0, i);
    }
    // Fallback: relative depth from URL pathname.
    var path = location.pathname.replace(/[^/]+$/, '');
    var depth = path.split('/').filter(Boolean).length;
    if (depth <= 0) return '';
    var up = '';
    for (var k = 0; k < depth; k++) up += '../';
    return up;
  }

  var ROOT = computeRoot();

  function fetchPartial(name) {
    return fetch(ROOT + 'static/partials/' + name + '.html', {
      credentials: 'same-origin'
    }).then(function (r) {
      if (!r.ok) throw new Error('partial ' + name + ' ' + r.status);
      return r.text();
    });
  }

  function substituteRoot(html) {
    return html.replace(/\{\{ROOT\}\}/g, ROOT);
  }

  function markActive(container) {
    var current = location.pathname.split('/').pop() || 'index.html';
    var links = container.querySelectorAll('a[data-href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var target = a.getAttribute('data-href');
      if (!target) continue;
      // Tools/blog sub-pages should still light up their hub link.
      var match =
        target === current ||
        (target === 'tools/index.html' && /^tools\//.test(location.pathname.replace(/^\/+/, ''))) ||
        (target === 'blog/index.html' && /^blog\//.test(location.pathname.replace(/^\/+/, '')));
      if (match) {
        a.setAttribute('aria-current', 'page');
        a.classList.add('is-active');
      }
    }
  }

  function wireBannerDismiss(container) {
    var btn = container.querySelector('[data-banner-dismiss]');
    if (!btn) return;
    var banner = btn.closest('.banner');
    if (!banner) return;
    // Session-only - clears on full reload.
    try {
      if (sessionStorage.getItem('pfc:banner-dismissed') === '1') {
        banner.hidden = true;
      }
    } catch (e) { /* sessionStorage blocked - banner just persists */ }
    btn.addEventListener('click', function () {
      banner.hidden = true;
      try { sessionStorage.setItem('pfc:banner-dismissed', '1'); } catch (e) {}
    });
  }

  function wireSidebarToggle() {
    var trigger = DOC.querySelector('[data-sidebar-toggle]');
    var sidebar = DOC.querySelector('.sidebar');
    if (!trigger || !sidebar) return;
    trigger.addEventListener('click', function () {
      sidebar.classList.toggle('is-open');
    });
  }

  function injectAll() {
    var slots = DOC.querySelectorAll('[data-include]');
    if (!slots.length) {
      DOC.dispatchEvent(new CustomEvent('pfc:partials-ready'));
      return;
    }

    var promises = [];
    for (var i = 0; i < slots.length; i++) {
      (function (slot) {
        var name = slot.getAttribute('data-include');
        if (!name) return;
        promises.push(
          fetchPartial(name).then(function (html) {
            var temp = DOC.createElement('div');
            temp.innerHTML = substituteRoot(html);
            // Replace the slot with its children.
            var parent = slot.parentNode;
            while (temp.firstChild) {
              parent.insertBefore(temp.firstChild, slot);
            }
            parent.removeChild(slot);
          }).catch(function (err) {
            console.warn('[pfc partials]', err);
          })
        );
      })(slots[i]);
    }

    Promise.all(promises).then(function () {
      // After injection: mark active links + wire dismiss/toggle.
      markActive(DOC);
      wireBannerDismiss(DOC);
      wireSidebarToggle();
      DOC.dispatchEvent(new CustomEvent('pfc:partials-ready'));
    });
  }

  if (DOC.readyState === 'loading') {
    DOC.addEventListener('DOMContentLoaded', injectAll, { once: true });
  } else {
    injectAll();
  }

  // Expose for advanced callers (rare).
  window.PFC_PARTIALS = { root: ROOT };
})();
