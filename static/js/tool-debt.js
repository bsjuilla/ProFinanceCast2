/* ============================================================================
 * tool-debt.js - wire /tools/debt-strategy.html to PFC_DEBT.simulate().
 *
 * Behavior:
 *   - On DOMContentLoaded, read the pre-filled debts + extra payment + strategy,
 *     compute BOTH avalanche AND snowball (so the savings delta is real), and
 *     render: headline (Month N), savings vs alternative, 3-stat strip, the
 *     hand-rolled inline SVG payoff-curve chart, and the debt-by-debt table.
 *   - On any input/change inside the form (debounced 240ms), recompute and
 *     re-render. Window resize re-renders the chart at the new viewBox width.
 *   - "+ Add another debt" appends a blank row; remove buttons strip a row
 *     (the form always retains at least one row).
 *   - "Clear and use your own numbers" wipes every input and shows a zeroed
 *     result panel.
 *   - Locked R9: the page's STATIC HTML keeps PFC_DEBT.LOCKED_DISPLAY values
 *     verbatim for first paint (so no-JS visitors see RULING R9). Once JS runs
 *     the simulator's truth replaces the locked numbers via DOM updates -
 *     for the locked example inputs that DOES diverge (Month 26 / $0 savings
 *     vs Month 14 / $487), which is the honest answer per calc-debt's audit
 *     note. We prefer the simulator over the locked display once JS is live.
 *   - Honors prefers-reduced-motion via tools-app.css (stroke-dashoffset
 *     transitions short-circuit; chart still draws final state).
 *   - Inline `console.assert()` sanity checks gated behind window.PFC_DEV.
 * ============================================================================ */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var DEBOUNCE_MS = 240;

  var form = document.getElementById('debt-form');
  if (!form || !window.PFC_DEBT) return;

  // ── DOM handles ─────────────────────────────────────────────────
  var rowsHost  = document.getElementById('debt-rows');
  var addBtn    = form.querySelector('[data-debt-add]');
  var clearBtn  = document.querySelector('[data-debt-clear]');
  var extraInp  = document.getElementById('debt-extra');
  var chartHost = document.getElementById('debt-chart');

  var $headline   = form.querySelector('[data-debt-headline]');
  var $savings    = form.querySelector('[data-debt-savings]');
  var $months     = form.querySelector('[data-debt-months]');
  var $intTotal   = form.querySelector('[data-debt-interest-total]');
  var $delta      = form.querySelector('[data-debt-delta]');
  var $sub        = form.querySelector('[data-debt-sub]');
  var $breakdown  = form.querySelector('[data-debt-breakdown]');

  // ── helpers ─────────────────────────────────────────────────────
  function fmtUSD(n) {
    if (!isFinite(n)) n = 0;
    var s = Math.round(Math.abs(n)).toLocaleString('en-US');
    return (n < 0 ? '-' : '') + '$' + s;
  }
  function fmtUSDk(n) {
    if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
    return '$' + Math.round(n);
  }
  function clearKids(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }

  function readDebts() {
    // Pass debts in the shape calc-debt.js expects: balance, apr (decimal),
    // minPayment. The form stores APR as a percentage; convert here.
    var rows = rowsHost.querySelectorAll('[data-debt-row]');
    var out = [];
    rows.forEach(function (row, i) {
      var name = (row.querySelector('[data-debt-input="name"]') || {}).value || ('Debt ' + (i + 1));
      var bal  = +(row.querySelector('[data-debt-input="balance"]') || {}).value || 0;
      var apr  = +(row.querySelector('[data-debt-input="apr"]') || {}).value || 0;
      var min  = +(row.querySelector('[data-debt-input="min"]') || {}).value || 0;
      out.push({
        id: 'd' + i,
        name: name,
        balance: bal,
        apr: apr / 100,
        minPayment: min
      });
    });
    return out;
  }

  function activeStrategy() {
    var s = form.querySelector('input[name="strategy"]:checked');
    return s ? s.value : 'avalanche';
  }
  function altOf(s) { return s === 'avalanche' ? 'snowball' : 'avalanche'; }

  // ── chart: combined balance over time, featured + alt ──────────
  function totalsSeries(sim, initialTotal) {
    var arr = [initialTotal];
    sim.schedule.forEach(function (s) { arr.push(s.totalBalance); });
    return arr;
  }

  function renderChart(featured, alt, initialTotal) {
    if (!chartHost) return;
    clearKids(chartHost);

    var w = chartHost.clientWidth || 520;
    var h = 240;
    var pad = { t: 18, r: 16, b: 30, l: 58 };
    var iw = Math.max(50, w - pad.l - pad.r);
    var ih = h - pad.t - pad.b;

    var sF = totalsSeries(featured, initialTotal);
    var sA = totalsSeries(alt,      initialTotal);
    var maxMonths = Math.max(sF.length, sA.length);
    var maxVal = Math.max(initialTotal, 1);

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('role', 'img');
    svg.setAttribute('preserveAspectRatio', 'none');

    function xAt(m) { return pad.l + (m / Math.max(1, maxMonths - 1)) * iw; }
    function yAt(v) { return pad.t + (1 - v / maxVal) * ih; }

    // baseline (zero axis) - the single horizontal $0 rule per RULING Q6
    var base = document.createElementNS(SVG_NS, 'line');
    base.setAttribute('class', 'axis-line');
    base.setAttribute('x1', pad.l);
    base.setAttribute('x2', pad.l + iw);
    base.setAttribute('y1', pad.t + ih);
    base.setAttribute('y2', pad.t + ih);
    svg.appendChild(base);

    // y-axis ticks (0, mid, max), labels only - no gridlines.
    [0, maxVal / 2, maxVal].forEach(function (v) {
      var t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('class', 'tick tick--y');
      t.setAttribute('x', pad.l - 8);
      t.setAttribute('y', yAt(v));
      t.setAttribute('text-anchor', 'end');
      t.setAttribute('dominant-baseline', 'middle');
      t.textContent = fmtUSDk(v);
      svg.appendChild(t);
    });

    // x-axis labels: Now and Month N
    var xLabels = [
      { m: 0, txt: 'Now', anchor: 'start' },
      { m: maxMonths - 1, txt: 'Month ' + (maxMonths - 1), anchor: 'end' }
    ];
    xLabels.forEach(function (lbl) {
      var t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('class', 'tick tick--x');
      t.setAttribute('x', xAt(lbl.m));
      t.setAttribute('y', pad.t + ih + 18);
      t.setAttribute('text-anchor', lbl.anchor);
      t.textContent = lbl.txt;
      svg.appendChild(t);
    });

    // build a path string for a balance series
    function pathFor(arr) {
      var d = '';
      for (var i = 0; i < arr.length; i++) {
        d += (i === 0 ? 'M' : ' L') + xAt(i).toFixed(1) + ' ' + yAt(arr[i]).toFixed(1);
      }
      return d;
    }

    // alt line (snowball when avalanche is featured) - drawn first so featured
    // sits on top.
    if (sA.length > 1) {
      var pA = document.createElementNS(SVG_NS, 'path');
      pA.setAttribute('class', 'line-alt');
      pA.setAttribute('d', pathFor(sA));
      // length estimate for stroke-dasharray transition - a slight overshoot
      // is fine; the path will fully reveal.
      pA.style.setProperty('--chart-len', String(Math.round(iw + ih)));
      svg.appendChild(pA);
    }

    if (sF.length > 1) {
      var pF = document.createElementNS(SVG_NS, 'path');
      pF.setAttribute('class', 'line-featured');
      pF.setAttribute('d', pathFor(sF));
      pF.style.setProperty('--chart-len', String(Math.round(iw + ih)));
      svg.appendChild(pF);
    }

    chartHost.appendChild(svg);

    // If reveal.js already revealed this node (above the fold), re-trigger
    // by toggling the class so the new path animates.
    if (chartHost.classList.contains('is-revealed')) {
      chartHost.classList.remove('is-revealed');
      // force layout flush so the dashoffset reset takes effect
      // eslint-disable-next-line no-unused-expressions
      void chartHost.offsetWidth;
      chartHost.classList.add('is-revealed');
    }
  }

  // ── render ──────────────────────────────────────────────────────
  function render() {
    var debts = readDebts();
    var extra = +extraInp.value || 0;
    var strat = activeStrategy();
    var alt   = altOf(strat);

    var initialTotal = debts.reduce(function (s, d) { return s + d.balance; }, 0);
    var hasDebt = debts.length > 0 && initialTotal > 0.005;

    if (!hasDebt) { renderZeroed(); return; }

    var resF = window.PFC_DEBT.simulate(debts, extra, strat);
    var resA = window.PFC_DEBT.simulate(debts, extra, alt);

    var savedInterest = resA.totalInterest - resF.totalInterest;
    var savedMonths   = resA.months - resF.months;
    var sName = strat === 'avalanche' ? 'Avalanche' : 'Snowball';
    var aName = strat === 'avalanche' ? 'snowball'  : 'avalanche';

    // headline (Cormorant italic) - "Month N"
    if ($headline) $headline.textContent = 'Month ' + resF.months;
    if ($months)   $months.textContent   = String(resF.months);
    if ($intTotal) $intTotal.textContent = fmtUSD(resF.totalInterest);
    if ($savings)  $savings.textContent  = fmtUSD(Math.abs(savedInterest));

    // sub-line: real comparison
    if ($sub) {
      if (Math.abs(savedInterest) < 1 && savedMonths === 0) {
        $sub.innerHTML = sName + ' and ' + aName + ' tie on these inputs ' +
          '&mdash; both clear by <span class="mono">month ' + resF.months + '</span>.';
      } else if (savedInterest >= 0) {
        $sub.innerHTML = sName + ' saves <span class="mono">' +
          fmtUSD(savedInterest) + '</span> in interest vs ' + aName + '.';
      } else {
        $sub.innerHTML = sName + ' costs <span class="mono">' +
          fmtUSD(-savedInterest) + '</span> more in interest than ' + aName + '.';
      }
    }

    // 3-stat strip - delta cell
    if ($delta) {
      if (savedInterest > 0.5) {
        $delta.textContent = '+' + fmtUSD(savedInterest) + ' saved';
        $delta.classList.add('tool-stat__value--saved');
        $delta.classList.remove('tool-stat__value--cost');
      } else if (savedInterest < -0.5) {
        $delta.textContent = fmtUSD(savedInterest) + ' costlier';
        $delta.classList.remove('tool-stat__value--saved');
        $delta.classList.add('tool-stat__value--cost');
      } else {
        $delta.textContent = 'Tie';
        $delta.classList.remove('tool-stat__value--saved', 'tool-stat__value--cost');
      }
    }

    // debt-by-debt table
    if ($breakdown) {
      clearKids($breakdown);
      resF.byDebt.forEach(function (d, i) {
        var src = debts[i] || {};
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + (d.name || ('Debt ' + (i + 1))) + '</td>' +
          '<td class="mono">' + fmtUSD(src.balance || 0) + '</td>' +
          '<td class="mono">' + ((src.apr || 0) * 100).toFixed(1) + '%</td>' +
          '<td class="mono">' + (d.paidOffMonth ? 'Mo ' + d.paidOffMonth : '—') + '</td>';
        $breakdown.appendChild(tr);
      });
    }

    renderChart(resF, resA, initialTotal);
  }

  function renderZeroed() {
    if ($headline) $headline.textContent = '—';
    if ($months)   $months.textContent   = '—';
    if ($intTotal) $intTotal.textContent = '$0';
    if ($savings)  $savings.textContent  = '$0';
    if ($delta)    {
      $delta.textContent = '—';
      $delta.classList.remove('tool-stat__value--saved', 'tool-stat__value--cost');
    }
    if ($sub) $sub.innerHTML = 'Add at least one debt with a balance above zero to see a payoff plan.';
    if ($breakdown) {
      $breakdown.innerHTML =
        '<tr><td colspan="4" style="color: var(--ink-50); text-align:center;">No debts entered.</td></tr>';
    }
    if (chartHost) clearKids(chartHost);
  }

  // ── debt-row builder + remove-state ─────────────────────────────
  function buildRow(p) {
    p = p || { name: '', balance: '', apr: '', min: '' };
    var row = document.createElement('div');
    row.className = 'debt-row';
    row.setAttribute('data-debt-row', '');
    row.innerHTML =
      '<div class="field debt-row__name">' +
        '<label class="field__label">Name</label>' +
        '<input class="field__control" type="text" value="' + p.name + '" data-debt-input="name" autocomplete="off">' +
      '</div>' +
      '<div class="field debt-row__balance">' +
        '<label class="field__label">Balance</label>' +
        '<div class="field__group">' +
          '<span class="field__group__prefix">$</span>' +
          '<input class="field__control field__control--mono mono" type="number" value="' + p.balance + '" min="0" step="1" inputmode="decimal" data-debt-input="balance">' +
        '</div>' +
      '</div>' +
      '<div class="field debt-row__apr">' +
        '<label class="field__label">APR</label>' +
        '<div class="field__group">' +
          '<input class="field__control field__control--mono mono" type="number" value="' + p.apr + '" min="0" step="0.1" inputmode="decimal" data-debt-input="apr">' +
          '<span class="field__group__suffix">%</span>' +
        '</div>' +
      '</div>' +
      '<div class="field debt-row__min">' +
        '<label class="field__label">Min payment</label>' +
        '<div class="field__group">' +
          '<span class="field__group__prefix">$</span>' +
          '<input class="field__control field__control--mono mono" type="number" value="' + p.min + '" min="0" step="1" inputmode="decimal" data-debt-input="min">' +
        '</div>' +
      '</div>' +
      '<div class="debt-row__remove">' +
        '<button type="button" class="debt-row__remove-btn" aria-label="Remove debt" data-debt-remove>&times;</button>' +
      '</div>';
    return row;
  }
  function refreshRemoveStates() {
    var btns = rowsHost.querySelectorAll('[data-debt-remove]');
    btns.forEach(function (b) { b.disabled = btns.length <= 1; });
  }

  // ── debounce ────────────────────────────────────────────────────
  var debounceTimer = null;
  function scheduleRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, DEBOUNCE_MS);
  }

  // ── events ──────────────────────────────────────────────────────
  form.addEventListener('input', scheduleRender);
  form.addEventListener('change', scheduleRender);

  if (addBtn) {
    addBtn.addEventListener('click', function () {
      var row = buildRow({ name: '', balance: '', apr: '', min: '' });
      rowsHost.appendChild(row);
      refreshRemoveStates();
      var first = row.querySelector('input');
      if (first) first.focus();
      scheduleRender();
    });
  }

  rowsHost.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-debt-remove]');
    if (!btn) return;
    var row = btn.closest('[data-debt-row]');
    if (row && rowsHost.querySelectorAll('[data-debt-row]').length > 1) {
      row.parentNode.removeChild(row);
      refreshRemoveStates();
      scheduleRender();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      clearKids(rowsHost);
      rowsHost.appendChild(buildRow({ name: '', balance: '', apr: '', min: '' }));
      refreshRemoveStates();
      if (extraInp) extraInp.value = '';
      var av = document.getElementById('strat-avalanche');
      if (av) av.checked = true;
      renderZeroed();
      var first = rowsHost.querySelector('input');
      if (first) first.focus();
    });
  }

  // ── initial paint (RAF so chart can size to container width) ────
  refreshRemoveStates();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(render);
  } else {
    render();
  }

  // Re-render the chart on resize (viewBox recompute).
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 200);
  });

  // ── dev-only sanity checks (TDD discipline) ─────────────────────
  if (window.PFC_DEV) {
    // 1. all-zero balances => simulator returns 0 months and 0 interest.
    var z = window.PFC_DEBT.simulate(
      [{ id: 'z', name: 'z', balance: 0, apr: 0, minPayment: 0 }], 0, 'avalanche'
    );
    console.assert(z.months === 0, 'tool-debt: zero-balance case should return 0 months, got ' + z.months);
    console.assert(z.totalInterest === 0, 'tool-debt: zero-balance case should return 0 interest, got ' + z.totalInterest);

    // 2. single debt with apr 0 and a positive payment clears in ceil(balance/payment).
    var single = window.PFC_DEBT.simulate(
      [{ id: 's', name: 's', balance: 100, apr: 0, minPayment: 25 }], 0, 'avalanche'
    );
    console.assert(single.months === 4, 'tool-debt: 100 / 25 / 0%apr should clear in 4 months, got ' + single.months);
  }
})();
