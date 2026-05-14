/* ============================================================================
 * demo-data.js - the canonical example household (RULING-01 Q4).
 *
 * Single source of truth. Hardcoded. Do NOT regenerate. Every authenticated
 * page reads from window.PFC_DATA so charts cross-reference cleanly.
 *
 * Locked figures:
 *   netWorthToday      $87,420
 *   liquidAssets       $24,800
 *   retirement         $71,200
 *   totalDebt           $8,580 (CC $3,200 @24.9%, SL $5,380 @6.1%)
 *   monthlyIncome       $7,400
 *   monthlyExpenses     $5,180
 *   forecast10yEnd    $412,000
 *   debtFreeMonth          14
 *   healthScore            72
 *
 * Derived series (deterministic, not random):
 *   netWorthSeries  : 120 monthly values from $87,420 -> $412,000
 *   cashFlow12m     : 12-month income/expense pairs (slight seasonal)
 *   recurring       : 8 recurring transactions (rent, utilities, etc.)
 *   activityLog     : 10 recent activity entries
 *   goals           : 3 named goals with progress
 * ============================================================================ */
(function (global) {
  'use strict';

  // ---- Locked headline figures -----------------------------------------
  var netWorthToday   = 87420;
  var liquidAssets    = 24800;
  var retirement      = 71200;
  var totalDebt       = 8580;
  var monthlyIncome   = 7400;
  var monthlyExpenses = 5180;
  var forecast10yEnd  = 412000;
  var debtFreeMonth   = 14;
  var healthScore     = 72;

  // ---- 120-month net-worth series (deterministic geometric path) -------
  // We want series[0] === 87420 and series[119] === 412000.
  // Use a smooth exponential ramp + tiny deterministic ripple (sin) so
  // the chart reads as "lived" without looking random.
  var netWorthSeries = (function () {
    var months = 120;
    var start = netWorthToday;
    var end   = forecast10yEnd;
    var r = Math.pow(end / start, 1 / (months - 1));
    var out = new Array(months);
    for (var i = 0; i < months; i++) {
      var smooth = start * Math.pow(r, i);
      // Ripple amplitude scales with smooth so it stays visually faithful.
      var ripple = Math.sin(i * 0.7) * smooth * 0.012;
      out[i] = Math.round(smooth + ripple);
    }
    // Pin endpoints exactly.
    out[0] = start;
    out[months - 1] = end;
    return out;
  })();

  // ---- 12-month cash-flow series ---------------------------------------
  // Income is flat $7,400. Expenses have mild seasonality (holidays Dec)
  // averaging $5,180. Net savings cycle but always positive.
  var cashFlow12m = (function () {
    var months = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'];
    // Expense modifiers sum to 0 so monthly average stays at $5,180.
    var em = [ 60, -80, -120, -40, 20, 100, 320, -60, -100, -80, -20, 0 ];
    var out = [];
    for (var i = 0; i < 12; i++) {
      out.push({
        month: months[i],
        income: monthlyIncome,
        expenses: monthlyExpenses + em[i]
      });
    }
    return out;
  })();

  // ---- Debts (the inputs for calc-debt RULING R9) ----------------------
  var debts = [
    {
      id: 'cc',
      name: 'Credit card',
      balance: 3200,
      apr: 0.249,
      minPayment: 80
    },
    {
      id: 'sl',
      name: 'Student loan',
      balance: 5380,
      apr: 0.061,
      minPayment: 60
    }
  ];
  var debtExtra = 270;     // monthly extra above the minimums
  var debtMonthly = 410;   // total monthly cash to debt (80 + 60 + 270)

  // ---- Goals (3 named) -------------------------------------------------
  var goals = [
    {
      id: 'emergency',
      name: 'Emergency fund (6 months)',
      target: 31080,
      current: 24800,
      etaMonths: 9
    },
    {
      id: 'down-payment',
      name: 'House down payment',
      target: 60000,
      current: 12400,
      etaMonths: 42
    },
    {
      id: 'sabbatical',
      name: 'Sabbatical fund (3 months)',
      target: 15540,
      current: 3200,
      etaMonths: 28
    }
  ];

  // ---- Recurring transactions ------------------------------------------
  var recurring = [
    { name: 'Rent',                 amount: 1850, cadence: 'monthly', category: 'housing'   },
    { name: 'Utilities',            amount:  185, cadence: 'monthly', category: 'utilities' },
    { name: 'Internet',             amount:   72, cadence: 'monthly', category: 'utilities' },
    { name: 'Phone',                amount:   45, cadence: 'monthly', category: 'utilities' },
    { name: 'Health insurance',     amount:  380, cadence: 'monthly', category: 'insurance' },
    { name: 'Groceries',            amount:  640, cadence: 'monthly', category: 'food'      },
    { name: 'Gym membership',       amount:   38, cadence: 'monthly', category: 'wellness'  },
    { name: 'Streaming services',   amount:   54, cadence: 'monthly', category: 'leisure'   }
  ];

  // ---- Activity log ----------------------------------------------------
  var activityLog = [
    { when: '2026-05-09', kind: 'income',  detail: 'Salary',                 amount:  3700 },
    { when: '2026-05-07', kind: 'expense', detail: 'Grocery run',            amount:  -148 },
    { when: '2026-05-06', kind: 'debt',    detail: 'Credit card payment',   amount:  -350 },
    { when: '2026-05-05', kind: 'expense', detail: 'Utilities (April)',      amount:  -185 },
    { when: '2026-05-03', kind: 'expense', detail: 'Restaurant',             amount:   -52 },
    { when: '2026-05-02', kind: 'income',  detail: 'Freelance invoice',      amount:   840 },
    { when: '2026-04-30', kind: 'save',    detail: 'Transfer to emergency',  amount:  -400 },
    { when: '2026-04-29', kind: 'expense', detail: 'Rent (May)',             amount: -1850 },
    { when: '2026-04-28', kind: 'expense', detail: 'Gym membership',         amount:   -38 },
    { when: '2026-04-25', kind: 'income',  detail: 'Salary',                 amount:  3700 }
  ];

  // ---- Sparkline 12-cell series (small mini for tables) ----------------
  var sparkline12 = netWorthSeries.filter(function (_, i) {
    return i % 10 === 0;
  }).slice(0, 12);

  // ---- Export ----------------------------------------------------------
  global.PFC_DATA = {
    /* headline figures */
    netWorthToday:   netWorthToday,
    liquidAssets:    liquidAssets,
    retirement:      retirement,
    totalDebt:       totalDebt,
    monthlyIncome:   monthlyIncome,
    monthlyExpenses: monthlyExpenses,
    forecast10yEnd:  forecast10yEnd,
    debtFreeMonth:   debtFreeMonth,
    healthScore:     healthScore,
    debtMonthly:     debtMonthly,
    debtExtra:       debtExtra,

    /* series */
    netWorthSeries:  netWorthSeries,
    cashFlow12m:     cashFlow12m,
    sparkline12:     sparkline12,

    /* collections */
    debts:           debts,
    goals:           goals,
    recurring:       recurring,
    activityLog:     activityLog,

    /* household identity (banner-friendly) */
    household: {
      label: 'Example household',
      members: 1,
      currency: 'USD',
      country: 'US',
      state: 'CA'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
