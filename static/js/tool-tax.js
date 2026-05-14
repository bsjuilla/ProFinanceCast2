/* ============================================================================
 * tool-tax.js - wire /tools/take-home-pay.html to PFC_TAX.takeHome().
 *
 * Behavior:
 *   - On DOMContentLoaded, read country (US/UK), gross, state, filing and
 *     compute via PFC_TAX.takeHome({ gross, filing, state, country }).
 *   - Render headline ($X / mo), sub-line (annual net + effective), the
 *     3-stat strip (effective / marginal / monthly), the hand-rolled donut
 *     SVG with center label, and the breakdown table.
 *   - Debounce input changes at 240ms.
 *   - "Clear and use your own numbers" wipes fields and shows a zeroed-out
 *     result panel.
 *   - For UK, the donut becomes 3 slices (Net / Income tax / NI) and the
 *     breakdown collapses to those rows. The currency symbol switches to GBP
 *     and the state/filing rows hide.
 *   - First paint preserves the locked R9 values in static HTML; the JS then
 *     replaces with the simulator's truth (which calibrates within ~0.07%
 *     of the locked example per calc-tax's note).
 *   - Honors prefers-reduced-motion via tools-app.css (the donut grow short-
 *     circuits to instant).
 *   - Inline `console.assert()` sanity checks gated behind window.PFC_DEV.
 * ============================================================================ */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var DEBOUNCE_MS = 240;

  var form = document.getElementById('tax-form');
  if (!form || !window.PFC_TAX) return;

  // ── DOM ─────────────────────────────────────────────────────────
  var grossInp   = document.getElementById('tax-gross');
  var stateSel   = document.getElementById('tax-state');
  var filingSel  = document.getElementById('tax-filing');
  var clearBtn   = document.querySelector('[data-tax-clear]');
  var donutHost  = document.getElementById('tax-donut');
  var usSections = form.querySelectorAll('[data-tax-us]');
  var currencyEl = document.querySelector('[data-tax-currency]');

  var $headline       = form.querySelector('[data-tax-headline]');
  var $sub            = form.querySelector('[data-tax-sub]');
  var $netAnnual      = form.querySelector('[data-tax-net-annual]');
  var $effective      = form.querySelector('[data-tax-effective]');
  var $statEffective  = form.querySelector('[data-tax-stat-effective]');
  var $statMarginal   = form.querySelector('[data-tax-stat-marginal]');
  var $statMonthly    = form.querySelector('[data-tax-stat-monthly]');

  var $legNet           = form.querySelector('[data-tax-leg-net]');
  var $legFederal       = form.querySelector('[data-tax-leg-federal]');
  var $legFederalLabel  = form.querySelector('[data-tax-leg-federal-label]');
  var $legState         = form.querySelector('[data-tax-leg-state]');
  var $legStateLabel    = form.querySelector('[data-tax-leg-state-label]');
  var $legStateRow      = form.querySelector('[data-tax-leg="state"]');
  var $legFica          = form.querySelector('[data-tax-leg-fica]');
  var $legFicaLabel     = form.querySelector('[data-tax-leg-fica-label]');
  var $legFicaRow       = form.querySelector('[data-tax-leg="fica"]');

  var $rowFederal       = form.querySelector('[data-tax-row-federal]');
  var $rowFederalLabel  = form.querySelector('[data-tax-row-federal-label]');
  var $rowStateLabel    = form.querySelector('[data-tax-row-state-label]');
  var $rowState         = form.querySelector('[data-tax-row-state]');
  var $rowSsLabel       = form.querySelector('[data-tax-row-ss-label]');
  var $rowSs            = form.querySelector('[data-tax-row-ss]');
  var $rowMed           = form.querySelector('[data-tax-row-med]');
  var $rowNet           = form.querySelector('[data-tax-row-net]');
  var $rowStateTr       = form.querySelector('[data-tax-row="state"]');
  var $rowMedTr         = form.querySelector('[data-tax-row="med"]');

  // ── helpers ─────────────────────────────────────────────────────
  function fmt(n, sym) {
    if (!isFinite(n)) n = 0;
    var s = Math.round(Math.abs(n)).toLocaleString('en-US');
    return (n < 0 ? '-' : '') + (sym || '$') + s;
  }
  function pct1(n) {
    if (!isFinite(n)) n = 0;
    return n.toFixed(1) + '%';
  }
  function clearKids(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }

  function country() {
    var c = form.querySelector('input[name="country"]:checked');
    return c ? c.value : 'US';
  }
  function stateLabel(code) {
    return ({ CA: 'California', NY: 'New York', TX: 'Texas',
              FL: 'Florida', WA: 'Washington' })[code] || code;
  }

  // ── marginal-bracket lookup (presentational only) ──────────────
  function usMarginalRate(gross, filing) {
    var FED_STD = { single: 14600, married: 29200, head: 21900 };
    var taxable = Math.max(0, gross - (FED_STD[filing] || 0));
    var br = filing === 'married'
      ? [[23850,0.10],[96950,0.12],[206700,0.22],[394600,0.24],[501050,0.32],[751600,0.35],[Infinity,0.37]]
      : filing === 'head'
      ? [[17000,0.10],[64850,0.12],[103350,0.22],[197300,0.24],[250500,0.32],[626350,0.35],[Infinity,0.37]]
      : [[11925,0.10],[48475,0.12],[103350,0.22],[197300,0.24],[250500,0.32],[626350,0.35],[Infinity,0.37]];
    for (var i = 0; i < br.length; i++) {
      if (taxable <= br[i][0]) return br[i][1];
    }
    return br[br.length - 1][1];
  }
  function ukMarginalRate(gross) {
    if (gross > 125140) return 0.45;
    if (gross > 50270)  return 0.40;
    if (gross > 12570)  return 0.20;
    return 0;
  }

  // ── donut renderer (centered at 50,50, viewBox 0..100) ─────────
  function renderDonut(slices, centerText, centerSub) {
    if (!donutHost) return;
    clearKids(donutHost);

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('role', 'img');

    var cx = 50, cy = 50;
    var rOuter = 42, rInner = 28;

    var total = slices.reduce(function (s, x) { return s + Math.max(0, x.value); }, 0);
    if (total <= 0) { donutHost.appendChild(svg); return; }

    var startAngle = -Math.PI / 2;
    slices.forEach(function (slice) {
      var v = Math.max(0, slice.value);
      if (v <= 0) return;
      var sweep = (v / total) * Math.PI * 2;
      var endAngle = startAngle + sweep;

      var x1 = cx + rOuter * Math.cos(startAngle);
      var y1 = cy + rOuter * Math.sin(startAngle);
      var x2 = cx + rOuter * Math.cos(endAngle);
      var y2 = cy + rOuter * Math.sin(endAngle);

      var x3 = cx + rInner * Math.cos(endAngle);
      var y3 = cy + rInner * Math.sin(endAngle);
      var x4 = cx + rInner * Math.cos(startAngle);
      var y4 = cy + rInner * Math.sin(startAngle);

      var largeArc = sweep > Math.PI ? 1 : 0;

      var d =
        'M ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' ' +
        'A ' + rOuter + ' ' + rOuter + ' 0 ' + largeArc + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' ' +
        'L ' + x3.toFixed(2) + ' ' + y3.toFixed(2) + ' ' +
        'A ' + rInner + ' ' + rInner + ' 0 ' + largeArc + ' 0 ' + x4.toFixed(2) + ' ' + y4.toFixed(2) + ' Z';

      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('class', 'donut-arc');
      p.setAttribute('d', d);
      p.setAttribute('fill', slice.color);
      p.setAttribute('stroke', 'var(--canvas)');
      p.setAttribute('stroke-width', '0.6');
      svg.appendChild(p);

      startAngle = endAngle;
    });

    // center label
    var c1 = document.createElementNS(SVG_NS, 'text');
    c1.setAttribute('class', 'donut-center');
    c1.setAttribute('x', cx);
    c1.setAttribute('y', cy);
    c1.setAttribute('text-anchor', 'middle');
    c1.setAttribute('dominant-baseline', 'central');
    c1.textContent = centerText || '';
    svg.appendChild(c1);

    if (centerSub) {
      var c2 = document.createElementNS(SVG_NS, 'text');
      c2.setAttribute('class', 'donut-center-sub');
      c2.setAttribute('x', cx);
      c2.setAttribute('y', cy + 8);
      c2.setAttribute('text-anchor', 'middle');
      c2.setAttribute('dominant-baseline', 'central');
      c2.textContent = centerSub;
      svg.appendChild(c2);
    }

    donutHost.appendChild(svg);

    // Re-trigger reveal class for animation refresh
    if (donutHost.classList.contains('is-revealed')) {
      donutHost.classList.remove('is-revealed');
      void donutHost.offsetWidth;
      donutHost.classList.add('is-revealed');
    }
  }

  // ── show/hide US-only sections ──────────────────────────────────
  function applyCountryVisibility() {
    var c = country();
    usSections.forEach(function (el) {
      el.style.display = (c === 'US') ? '' : 'none';
    });
    if (currencyEl) currencyEl.textContent = (c === 'UK') ? '£' : '$';
  }

  // ── render ──────────────────────────────────────────────────────
  function render() {
    applyCountryVisibility();

    var c      = country();
    var gross  = +grossInp.value || 0;
    var state  = stateSel  ? stateSel.value  : 'CA';
    var filing = filingSel ? filingSel.value : 'single';
    var sym    = (c === 'UK') ? '£' : '$';

    if (gross <= 0) { renderZeroed(sym); return; }

    var r = window.PFC_TAX.takeHome({
      country: c, gross: gross, state: state, filing: filing
    });

    // headline + sub
    if ($headline) $headline.textContent = fmt(r.netMonthly, sym);
    if ($netAnnual) $netAnnual.textContent = fmt(r.net, sym) + '/yr';
    if ($effective) $effective.textContent = pct1(r.effective);
    if ($sub) {
      $sub.innerHTML =
        'per month &middot; ' +
        '<span class="mono">' + fmt(r.net, sym) + '/yr</span> net &middot; ' +
        'effective rate <span class="mono">' + pct1(r.effective) + '</span>';
    }

    // 3-stat strip
    if ($statEffective) $statEffective.textContent = pct1(r.effective);
    if ($statMonthly)   $statMonthly.textContent   = fmt(r.netMonthly, sym);
    if ($statMarginal) {
      var marginal = (c === 'UK') ? ukMarginalRate(gross) : usMarginalRate(gross, filing);
      $statMarginal.textContent = (marginal * 100).toFixed(0) + '%';
    }

    if (c === 'US') {
      // ── breakdown rows: federal, state, SS, Medicare, net ──
      if ($rowFederalLabel) $rowFederalLabel.textContent = 'Federal income';
      if ($rowFederal)      $rowFederal.textContent = fmt(r.federal, sym);
      if ($rowStateLabel)   $rowStateLabel.textContent = 'State income (' + state + ')';
      if ($rowState)        $rowState.textContent = fmt(r.state, sym);
      if ($rowStateTr)      $rowStateTr.style.display = '';
      if ($rowSsLabel)      $rowSsLabel.textContent = 'Social Security';
      if ($rowSs)           $rowSs.textContent = fmt(r.ss, sym);
      if ($rowMed)          $rowMed.textContent = fmt(r.medicare, sym);
      if ($rowMedTr)        $rowMedTr.style.display = '';
      if ($rowNet)          $rowNet.textContent = fmt(r.net, sym);

      // ── donut: 4 slices ──
      var fica = r.ss + r.medicare;
      renderDonut([
        { key: 'net',     value: r.net,     color: 'var(--c-gold)' },
        { key: 'federal', value: r.federal, color: 'var(--c-ink-ivory-80)' },
        { key: 'state',   value: r.state,   color: 'var(--c-ink-ivory-50)' },
        { key: 'fica',    value: fica,      color: 'var(--c-gold-deep)' }
      ], pct1(r.effective), 'TAX');

      // ── legend ──
      if ($legNet)          $legNet.textContent = fmt(r.net, sym);
      if ($legFederalLabel) $legFederalLabel.textContent = 'Federal';
      if ($legFederal)      $legFederal.textContent = fmt(r.federal, sym);
      if ($legStateLabel)   $legStateLabel.textContent = 'State (' + state + ')';
      if ($legState)        $legState.textContent = fmt(r.state, sym);
      if ($legStateRow)     $legStateRow.style.display = '';
      if ($legFicaLabel)    $legFicaLabel.textContent = 'Social Security + Medicare';
      if ($legFica)         $legFica.textContent = fmt(fica, sym);
      if ($legFicaRow)      $legFicaRow.style.display = '';

    } else {
      // ── UK ──
      var incomeTax = r.federal;   // calc-tax reuses .federal for UK income tax
      var ni        = r.ss;        // calc-tax reuses .ss for NI

      if ($rowFederalLabel) $rowFederalLabel.textContent = 'Income tax';
      if ($rowFederal)      $rowFederal.textContent = fmt(incomeTax, sym);
      if ($rowStateTr)      $rowStateTr.style.display = 'none';
      if ($rowSsLabel)      $rowSsLabel.textContent = 'National Insurance';
      if ($rowSs)           $rowSs.textContent = fmt(ni, sym);
      if ($rowMedTr)        $rowMedTr.style.display = 'none';
      if ($rowNet)          $rowNet.textContent = fmt(r.net, sym);

      renderDonut([
        { key: 'net',     value: r.net,     color: 'var(--c-gold)' },
        { key: 'income',  value: incomeTax, color: 'var(--c-ink-ivory-80)' },
        { key: 'ni',      value: ni,        color: 'var(--c-gold-deep)' }
      ], pct1(r.effective), 'TAX');

      if ($legNet)          $legNet.textContent = fmt(r.net, sym);
      if ($legFederalLabel) $legFederalLabel.textContent = 'Income tax';
      if ($legFederal)      $legFederal.textContent = fmt(incomeTax, sym);
      if ($legStateRow)     $legStateRow.style.display = 'none';
      if ($legFicaLabel)    $legFicaLabel.textContent = 'National Insurance';
      if ($legFica)         $legFica.textContent = fmt(ni, sym);
      if ($legFicaRow)      $legFicaRow.style.display = '';
    }
  }

  function renderZeroed(sym) {
    sym = sym || '$';
    if ($headline)     $headline.textContent     = sym + '0';
    if ($sub)          $sub.innerHTML            = 'Enter a salary to see take-home.';
    if ($netAnnual)    $netAnnual.textContent    = sym + '0/yr';
    if ($effective)    $effective.textContent    = '0.0%';
    if ($statEffective)$statEffective.textContent= '0.0%';
    if ($statMonthly)  $statMonthly.textContent  = sym + '0';
    if ($statMarginal) $statMarginal.textContent = '—';

    if ($rowFederal) $rowFederal.textContent = sym + '0';
    if ($rowState)   $rowState.textContent   = sym + '0';
    if ($rowSs)      $rowSs.textContent      = sym + '0';
    if ($rowMed)     $rowMed.textContent     = sym + '0';
    if ($rowNet)     $rowNet.textContent     = sym + '0';

    if ($legNet)     $legNet.textContent     = sym + '0';
    if ($legFederal) $legFederal.textContent = sym + '0';
    if ($legState)   $legState.textContent   = sym + '0';
    if ($legFica)    $legFica.textContent    = sym + '0';

    if (donutHost) clearKids(donutHost);
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

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (grossInp)  grossInp.value  = '';
      if (stateSel)  stateSel.value  = 'CA';
      if (filingSel) filingSel.value = 'single';
      var us = document.getElementById('country-us');
      if (us) us.checked = true;
      applyCountryVisibility();
      renderZeroed((country() === 'UK') ? '£' : '$');
      if (grossInp) grossInp.focus();
    });
  }

  // ── initial paint ───────────────────────────────────────────────
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(render);
  } else {
    render();
  }

  // ── dev-only sanity checks (TDD discipline) ─────────────────────
  if (window.PFC_DEV) {
    // 1. zero gross => zero net.
    var z = window.PFC_TAX.takeHome({ country: 'US', gross: 0, state: 'CA', filing: 'single' });
    console.assert(z.net === 0, 'tool-tax: zero gross should yield zero net, got ' + z.net);

    // 2. $95k single CA should be within ~1% of locked R9 ($5,847/mo, 26.1%).
    var calib = window.PFC_TAX.takeHome({ country: 'US', gross: 95000, state: 'CA', filing: 'single' });
    var locked = window.PFC_TAX.LOCKED_DISPLAY.netMonthly;
    var diff = Math.abs(calib.netMonthly - locked) / locked;
    console.assert(diff < 0.01,
      'tool-tax: $95k/CA/single calibration drifted from locked $' + locked +
      '/mo, got $' + calib.netMonthly.toFixed(2) + ' (diff ' + (diff * 100).toFixed(2) + '%)');

    // 3. UK 30k should produce positive net less than gross.
    var uk = window.PFC_TAX.takeHome({ country: 'UK', gross: 30000 });
    console.assert(uk.net > 0 && uk.net < uk.gross, 'tool-tax: UK 30k net should be 0 < net < gross');
  }
})();
