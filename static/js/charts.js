/* ============================================================================
 * charts.js - hand-rolled SVG chart renderers. NO Chart.js / D3 / uPlot.
 *
 * Mount via:
 *   <div class="chart" data-chart="line"
 *        data-chart-opts='{"source":"netWorthSeries"}'></div>
 *
 * Renderer types:
 *   line       single-series stroke-draw forecast line (1600ms one-shot)
 *   area       line + filled area
 *   bars       12-bar income/expense or single-series vertical bars
 *   waterfall  horizontal debt-by-debt bars with payoff month labels
 *   radial     donut arc (health score) - takes value (0..100)
 *   sparkline  inline mini line (no axes)
 *   hbar       single horizontal bar (used for goal progress)
 *
 * All renderers respect viewBox so resize is automatic. Animation is
 * triggered by reveal.js adding `.is-revealed` to the wrapper. We never
 * animate layout properties (top/left/width/height).
 *
 * Per RULING Q6: 1px hairline axes, JetBrains Mono labels, no gridlines
 * except a $0 dashed rule, no chart titles inside the SVG.
 * ============================================================================ */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // ---- helpers ---------------------------------------------------------
  function el(name, attrs, children) {
    var n = document.createElementNS(SVG_NS, name);
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) {
      n.setAttribute(k, attrs[k]);
    }
    if (children) for (var i = 0; i < children.length; i++) {
      if (children[i] != null) n.appendChild(children[i]);
    }
    return n;
  }
  function text(content, attrs) {
    var t = el('text', attrs || {});
    t.textContent = content;
    return t;
  }
  function fmt(n) {
    if (n == null || isNaN(n)) return '';
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(Math.round(n));
    return sign + '$' + abs.toLocaleString('en-US');
  }
  function fmtShort(n) {
    if (n == null) return '';
    var abs = Math.abs(n);
    if (abs >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (abs >= 1000)    return '$' + Math.round(n / 1000) + 'k';
    return '$' + Math.round(n);
  }
  function readSource(opts) {
    if (!opts) return null;
    if (Array.isArray(opts.values)) return opts.values;
    if (opts.source && global.PFC_DATA && global.PFC_DATA[opts.source]) {
      return global.PFC_DATA[opts.source];
    }
    return null;
  }

  // ---- LINE chart ------------------------------------------------------
  function renderLine(node, opts) {
    var data = readSource(opts);
    if (!data || !data.length) return;

    var W = 800, H = 320;
    var pad = { t: 16, r: 16, b: 28, l: 56 };
    var iw = W - pad.l - pad.r;
    var ih = H - pad.t - pad.b;

    var values = data.map(function (d) {
      return (typeof d === 'object') ? +d.value : +d;
    });
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var pad_v = (max - min) * 0.06 || 1;
    min = Math.max(0, min - pad_v);
    max = max + pad_v;

    function x(i) { return pad.l + (i / (values.length - 1)) * iw; }
    function y(v) { return pad.t + ih - ((v - min) / (max - min)) * ih; }

    // Build path d-string + measure approximate length for the dasharray.
    var d = '';
    var len = 0;
    for (var i = 0; i < values.length; i++) {
      var px = x(i), py = y(values[i]);
      if (i === 0) {
        d += 'M' + px.toFixed(2) + ' ' + py.toFixed(2);
      } else {
        d += ' L' + px.toFixed(2) + ' ' + py.toFixed(2);
        var prevX = x(i - 1), prevY = y(values[i - 1]);
        len += Math.hypot(px - prevX, py - prevY);
      }
    }
    len = Math.ceil(len);

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': opts && opts.label ? opts.label : 'Forecast line chart'
    });

    // Axis baseline
    svg.appendChild(el('line', {
      x1: pad.l, x2: W - pad.r, y1: pad.t + ih, y2: pad.t + ih,
      class: 'axis-line'
    }));

    // Y-axis ticks (4 segments)
    var ticks = 4;
    for (var t = 0; t <= ticks; t++) {
      var tv = min + (max - min) * (t / ticks);
      var ty = pad.t + ih - (t / ticks) * ih;
      svg.appendChild(text(fmtShort(tv), {
        x: pad.l - 8, y: ty + 4, class: 'tick tick--y'
      }));
    }

    // X-axis ticks (5 labels: months as "M1", "M30", ...)
    var labels = (opts && opts.xLabels) || null;
    var xTickCount = Math.min(5, values.length);
    for (var k = 0; k < xTickCount; k++) {
      var idx = Math.round((values.length - 1) * (k / (xTickCount - 1)));
      var lbl = labels ? labels[idx] : ('M' + (idx + 1));
      svg.appendChild(text(lbl, {
        x: x(idx), y: pad.t + ih + 18, class: 'tick tick--x'
      }));
    }

    // Optional filled area (if requested)
    if (opts && opts.area) {
      var areaPath = d +
        ' L' + x(values.length - 1).toFixed(2) + ' ' + (pad.t + ih).toFixed(2) +
        ' L' + x(0).toFixed(2) + ' ' + (pad.t + ih).toFixed(2) + ' Z';
      svg.appendChild(el('path', { d: areaPath, class: 'area' }));
    }

    // The line itself (draw-animated)
    var path = el('path', { d: d, class: 'line line--draw' });
    path.style.setProperty('--chart-len', len);
    svg.appendChild(path);

    // Endpoint dot
    svg.appendChild(el('circle', {
      cx: x(values.length - 1),
      cy: y(values[values.length - 1]),
      r: 3.5,
      class: 'dot'
    }));

    node.innerHTML = '';
    node.appendChild(svg);
  }

  // ---- BARS chart (12-month cash flow or single series) ---------------
  function renderBars(node, opts) {
    var data = readSource(opts);
    if (!data || !data.length) return;

    var W = 800, H = 280;
    var pad = { t: 16, r: 16, b: 30, l: 56 };
    var iw = W - pad.l - pad.r;
    var ih = H - pad.t - pad.b;

    // If cashFlow-shaped, render twin bars; else single bars from numbers.
    var isCashflow = data[0] && typeof data[0] === 'object' && 'income' in data[0];

    var values = isCashflow
      ? data.map(function (d) { return Math.max(d.income, d.expenses); })
      : data.map(function (v) { return (typeof v === 'object') ? v.value : v; });
    var max = Math.max.apply(null, values);
    max = max + max * 0.08;

    function y(v) { return pad.t + ih - (v / max) * ih; }

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': opts && opts.label ? opts.label : 'Bar chart'
    });

    // Baseline
    svg.appendChild(el('line', {
      x1: pad.l, x2: W - pad.r, y1: pad.t + ih, y2: pad.t + ih,
      class: 'axis-line'
    }));

    // Y ticks
    for (var t = 0; t <= 4; t++) {
      var tv = max * (t / 4);
      var ty = pad.t + ih - (t / 4) * ih;
      svg.appendChild(text(fmtShort(tv), {
        x: pad.l - 8, y: ty + 4, class: 'tick tick--y'
      }));
    }

    var n = data.length;
    var slot = iw / n;

    if (isCashflow) {
      var barW = Math.min(14, slot * 0.32);
      for (var i = 0; i < n; i++) {
        var cx = pad.l + slot * (i + 0.5);
        var inc = data[i].income;
        var exp = data[i].expenses;
        var iy = y(inc), ey = y(exp);
        svg.appendChild(el('rect', {
          x: cx - barW - 1, y: iy,
          width: barW, height: (pad.t + ih - iy),
          class: 'bar bar--income'
        }));
        svg.appendChild(el('rect', {
          x: cx + 1, y: ey,
          width: barW, height: (pad.t + ih - ey),
          class: 'bar bar--expense'
        }));
        svg.appendChild(text(data[i].month, {
          x: cx, y: pad.t + ih + 18, class: 'tick tick--x'
        }));
      }
    } else {
      var barW2 = Math.min(28, slot * 0.6);
      for (var j = 0; j < n; j++) {
        var v = (typeof data[j] === 'object') ? data[j].value : data[j];
        var by = y(v);
        var bx = pad.l + slot * (j + 0.5) - barW2 / 2;
        svg.appendChild(el('rect', {
          x: bx, y: by, width: barW2, height: (pad.t + ih - by),
          class: 'bar'
        }));
        if (data[j].label) {
          svg.appendChild(text(data[j].label, {
            x: pad.l + slot * (j + 0.5),
            y: pad.t + ih + 18,
            class: 'tick tick--x'
          }));
        }
      }
    }

    node.innerHTML = '';
    node.appendChild(svg);
  }

  // ---- WATERFALL (debt by debt) ---------------------------------------
  function renderWaterfall(node, opts) {
    var data = readSource(opts) ||
      (global.PFC_DATA ? global.PFC_DATA.debts : []);
    if (!data || !data.length) return;

    var W = 800;
    var rowH = 44;
    var H = data.length * rowH + 24;
    var pad = { t: 12, r: 80, b: 12, l: 140 };
    var iw = W - pad.l - pad.r;

    var max = Math.max.apply(null, data.map(function (d) { return d.balance; }));

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Debt balance waterfall'
    });

    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      var y = pad.t + i * rowH + rowH / 2 - 10;
      var w = (d.balance / max) * iw;
      svg.appendChild(text(d.name, {
        x: pad.l - 12, y: y + 14, class: 'tick tick--y'
      }));
      svg.appendChild(el('rect', {
        x: pad.l, y: y, width: w, height: 20, rx: 2,
        class: 'hbar ' + (i === 0 ? 'hbar--credit' : 'hbar--loan')
      }));
      svg.appendChild(text(fmt(d.balance), {
        x: pad.l + w + 8, y: y + 14, class: 'tick tick--y',
        style: 'text-anchor:start;'
      }));
    }

    node.innerHTML = '';
    node.appendChild(svg);
  }

  // ---- RADIAL (health score donut) ------------------------------------
  function renderRadial(node, opts) {
    var value = (opts && typeof opts.value === 'number') ? opts.value
              : (global.PFC_DATA ? global.PFC_DATA.healthScore : 0);
    var maxV = (opts && opts.max) || 100;
    var label = (opts && opts.label) || 'Health';

    var S = 200;
    var cx = S / 2, cy = S / 2;
    var r = 72;
    var circ = 2 * Math.PI * r;
    var arc = (value / maxV) * circ;

    var svg = el('svg', {
      viewBox: '0 0 ' + S + ' ' + S,
      role: 'img',
      'aria-label': label + ' score ' + value
    });

    // Track
    svg.appendChild(el('circle', {
      cx: cx, cy: cy, r: r, class: 'radial-track'
    }));
    // Arc (rotated to start at top)
    var arcEl = el('circle', {
      cx: cx, cy: cy, r: r, class: 'radial-arc',
      transform: 'rotate(-90 ' + cx + ' ' + cy + ')'
    });
    arcEl.style.setProperty('--arc-len', arc);
    arcEl.setAttribute('stroke-dasharray', arc + ' ' + (circ * 2));
    svg.appendChild(arcEl);

    svg.appendChild(text(String(value), {
      x: cx, y: cy + 2, class: 'radial-figure'
    }));
    svg.appendChild(text(label, {
      x: cx, y: cy + 28, class: 'radial-label'
    }));

    node.innerHTML = '';
    node.appendChild(svg);
  }

  // ---- AREA ------------------------------------------------------------
  function renderArea(node, opts) {
    var merged = Object.assign({ area: true }, opts || {});
    renderLine(node, merged);
  }

  // ---- SPARKLINE (no axes, table cell sized) --------------------------
  function renderSparkline(node, opts) {
    var data = readSource(opts);
    if (!data || !data.length) return;
    var W = 96, H = 24;
    var values = data.map(function (d) { return (typeof d === 'object') ? d.value : d; });
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = (max - min) || 1;

    function x(i) { return (i / (values.length - 1)) * (W - 2) + 1; }
    function y(v) { return H - 2 - ((v - min) / range) * (H - 4); }

    var d = '';
    for (var i = 0; i < values.length; i++) {
      d += (i === 0 ? 'M' : ' L') + x(i).toFixed(2) + ' ' + y(values[i]).toFixed(2);
    }

    var cls = values[values.length - 1] >= values[0] ? 'is-positive' : 'is-negative';
    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'sparkline',
      role: 'img',
      'aria-label': opts && opts.label ? opts.label : 'Sparkline'
    });
    svg.appendChild(el('path', { d: d, class: cls }));
    node.innerHTML = '';
    node.appendChild(svg);
  }

  // ---- HBAR (single horizontal progress bar) --------------------------
  function renderHBar(node, opts) {
    var value = (opts && typeof opts.value === 'number') ? opts.value : 0;
    var max = (opts && opts.max) || 100;
    var pct = Math.max(0, Math.min(1, value / max));

    var W = 320, H = 8;
    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': (opts && opts.label) || 'Progress'
    });
    svg.appendChild(el('rect', {
      x: 0, y: 0, width: W, height: H, rx: 4, class: 'radial-track'
    }));
    svg.appendChild(el('rect', {
      x: 0, y: 0, width: (W * pct).toFixed(2), height: H, rx: 4,
      class: 'hbar'
    }));
    node.innerHTML = '';
    node.appendChild(svg);
  }

  // ---- Dispatcher ------------------------------------------------------
  var RENDERERS = {
    line:      renderLine,
    area:      renderArea,
    bars:      renderBars,
    waterfall: renderWaterfall,
    radial:    renderRadial,
    sparkline: renderSparkline,
    hbar:      renderHBar
  };

  function mountAll() {
    var nodes = document.querySelectorAll('[data-chart]');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.dataset.chartMounted === '1') continue;
      var type = node.getAttribute('data-chart');
      var fn = RENDERERS[type];
      if (!fn) continue;
      var opts = {};
      var raw = node.getAttribute('data-chart-opts');
      if (raw) {
        try { opts = JSON.parse(raw); } catch (e) { /* ignore malformed opts */ }
      }
      try {
        fn(node, opts);
        node.dataset.chartMounted = '1';
      } catch (e) {
        console.warn('[pfc charts] failed to render', type, e);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll, { once: true });
  } else {
    mountAll();
  }

  global.PFC_CHARTS = {
    mount: mountAll,
    render: function (node, type, opts) {
      var fn = RENDERERS[type];
      if (fn) fn(node, opts || {});
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
