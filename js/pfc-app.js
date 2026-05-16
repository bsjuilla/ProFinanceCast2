/* =============================================================================
   pfc-app.js — shared app helpers.
   - PFC.setTopbar({title, subtitle, actions})  fills the included topbar slots.
   - PFC.reveal()  IntersectionObserver-driven reveal with 60ms stagger.
   - PFC.markActiveNav()  applies aria-current to the matching sidebar item.
   - PFC_DATA  shared sample data for Tools Group B pages.
   ============================================================================= */
(function () {
  "use strict";

  var PFC = window.PFC || {};

  PFC.setTopbar = function (opts) {
    opts = opts || {};
    var root = document;
    var t = root.querySelector('[data-slot="title"]');
    var s = root.querySelector('[data-slot="subtitle"]');
    var a = root.querySelector('[data-slot="actions"]');
    if (t && opts.title) t.textContent = opts.title;
    if (s && opts.subtitle) s.textContent = opts.subtitle;
    if (a && opts.actions) a.innerHTML = opts.actions;
  };

  PFC.markActiveNav = function () {
    var page = (document.body && document.body.getAttribute("data-page")) || "";
    if (!page) return;
    var item = document.querySelector('.app-sidebar__item[data-page="' + page + '"]');
    if (item) item.setAttribute("aria-current", "page");
    var tab = document.querySelector('.bottom-tabs__item[data-page="' + page + '"]');
    if (tab) tab.setAttribute("aria-current", "page");
  };

  PFC.reveal = function () {
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hosts = Array.prototype.slice.call(
      document.querySelectorAll("[data-reveal], [data-reveal-stagger]")
    );
    if (reduced) {
      hosts.forEach(function (host) {
        host.classList.add("is-revealed");
        Array.prototype.forEach.call(host.children, function (c) { c.classList.add("is-revealed"); });
      });
      return;
    }
    if (!("IntersectionObserver" in window)) {
      hosts.forEach(function (h) { h.classList.add("is-revealed"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var host = e.target;
        if (host.hasAttribute("data-reveal-stagger")) {
          var kids = Array.prototype.slice.call(host.children).slice(0, 6);
          kids.forEach(function (k, i) {
            setTimeout(function () { k.classList.add("is-revealed"); }, i * 60);
          });
          Array.prototype.slice.call(host.children).slice(6).forEach(function (k) {
            k.classList.add("is-revealed");
          });
        } else {
          host.classList.add("is-revealed");
        }
        io.unobserve(host);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    hosts.forEach(function (h) { io.observe(h); });
  };

  /* ----------------------------------------------------------------------------
     PFC_DATA — sample data shared by Tools Group B
     ---------------------------------------------------------------------------- */
  var months = [
    "Jun 26","Jul 26","Aug 26","Sep 26","Oct 26","Nov 26",
    "Dec 26","Jan 27","Feb 27","Mar 27","Apr 27","May 27",
    "Jun 27","Jul 27","Aug 27","Sep 27","Oct 27","Nov 27",
    "Dec 27","Jan 28","Feb 28","Mar 28","Apr 28","May 28"
  ];
  var forecast = months.map(function (m, i) {
    var base = 8400 + Math.sin(i / 3) * 240;
    var income = Math.round(base + (i % 6 === 0 ? 1200 : 0));
    var expenses = Math.round(4800 + Math.cos(i / 4) * 380 + (i === 11 ? 2600 : 0));
    var events = [];
    if (i === 0)  events.push({ label: "Bonus", amount: 4200 });
    if (i === 5)  events.push({ label: "Property tax", amount: -3100 });
    if (i === 11) events.push({ label: "Vacation", amount: -2600 });
    if (i === 14) events.push({ label: "Bonus", amount: 4500 });
    if (i === 20) events.push({ label: "Tuition", amount: -2200 });
    return { month: m, income: income, expenses: expenses, net: income - expenses, events: events };
  });

  var plannedEvents = [
    { date: "Jun 12, 2026", desc: "Annual bonus",            cat: "Income",      amount:  4200 },
    { date: "Nov 03, 2026", desc: "Property tax — county",    cat: "Tax",         amount: -3100 },
    { date: "Dec 21, 2026", desc: "Family vacation, Lisbon", cat: "Discretionary", amount: -2600 },
    { date: "Mar 15, 2027", desc: "Federal tax payment",     cat: "Tax",         amount: -1850 },
    { date: "May 22, 2027", desc: "Roof repair",             cat: "Home",        amount: -4200 },
    { date: "Aug 09, 2027", desc: "Annual bonus",            cat: "Income",      amount:  4500 },
    { date: "Feb 14, 2028", desc: "Tuition installment",     cat: "Education",   amount: -2200 },
    { date: "Apr 30, 2028", desc: "Vehicle service",         cat: "Transport",   amount:  -780 }
  ];

  /* Scenarios: 10-year projection sample */
  var horizon = 120; // months
  function projectScenario(opts) {
    var base = opts.startingSavings || 28000;
    var monthlyContribution = opts.monthlyContribution || 1800;
    var monthlyReturn = (opts.realReturn || 0.058) / 12;
    var raiseAtMonth = opts.raiseAtMonth || null;
    var raisePct = opts.raisePct || 0;
    var data = [];
    var bal = base;
    for (var i = 0; i < horizon; i++) {
      var c = monthlyContribution;
      if (raiseAtMonth !== null && i >= raiseAtMonth) c = monthlyContribution * (1 + raisePct);
      bal = bal * (1 + monthlyReturn) + c;
      data.push(Math.round(bal));
    }
    return data;
  }

  var baseCase = projectScenario({});
  var raiseCase = projectScenario({ raiseAtMonth: 24, raisePct: 0.20 });

  /* Report-card dimensions */
  var dimensions = [
    { label: "Savings rate",        score: 87, note: "32% of net pay this year." },
    { label: "Debt management",     score: 81, note: "Mortgage is the only liability." },
    { label: "Goal progress",       score: 76, note: "On pace for 4 of 5 active goals." },
    { label: "Diversification",     score: 62, note: "84% in US equity index. Concentrated." },
    { label: "Emergency runway",    score: 84, note: "5.8 months at current burn." }
  ];

  /* Sage panel insights */
  var sageInsights = [
    { text: "Your savings rate climbed from 28% to 32% over the last six months." },
    { text: "Diversification is your lowest dimension. A target-date fund would lift it eight points." },
    { text: "The Lisbon trip in December is fully absorbed by surplus. No cash buffer hit." },
    { text: "At current pace you reach the house downpayment in 41 months, three months ahead of plan." }
  ];

  var sageConversations = [
    {
      q: "Can I afford a $720,000 house in NYC in three years?",
      a: "Yes, with a 20% down. You will have $164,300 saved by then, which clears the downpayment and closing costs. Monthly payment fits within 31% of projected net pay."
    },
    {
      q: "Should I pay off the credit card before contributing more to the brokerage?",
      a: "Pay the card. The balance carries 22.4% APR. Your brokerage real return assumption is 5.8%. The arithmetic is not close."
    },
    {
      q: "What happens to my forecast if I take a six-month sabbatical in 2028?",
      a: "Your projected 2036 net worth drops by $48,700 and your emergency runway shortens to 2.1 months at the trough. The plan recovers by Q3 2029."
    },
    {
      q: "Am I overpaying on insurance?",
      a: "Likely yes on auto. Your premium is 1.4x the median for your ZIP and driving profile. Term life looks correctly priced for a 20-year ladder at your age."
    }
  ];

  window.PFC_DATA = {
    months: months,
    forecast: forecast,
    plannedEvents: plannedEvents,
    baseCase: baseCase,
    raiseCase: raiseCase,
    dimensions: dimensions,
    sageInsights: sageInsights,
    sageConversations: sageConversations
  };

  document.addEventListener("pfc:partials-ready", function () {
    PFC.markActiveNav();
    if (window.PFC_PAGE_INIT) {
      try { window.PFC_PAGE_INIT(); } catch (e) { if (window.console) console.warn(e); }
    }
    PFC.reveal();
  });

  window.PFC = PFC;
})();
