/* ============================================================================
 * calc-debt.js - pure debt avalanche / snowball simulator.
 * No DOM. No external deps. Public surface:
 *
 *   PFC_DEBT.simulate(debts, extra, strategy)
 *     -> { months, totalInterest, totalPaid, schedule, byDebt }
 *
 *   PFC_DEBT.compare(debts, extra)
 *     -> { avalanche, snowball, savings, fasterStrategy }
 *
 *   PFC_DEBT.LOCKED_DISPLAY
 *     The verbatim string locked by RULING-01 R9 for the public tool's
 *     pre-filled example. The simulator's actual output (see audit note
 *     below) differs because both strategies converge on the same debt
 *     priority when the highest-APR balance is also the smallest balance.
 *
 * ---------------------------------------------------------------------------
 * LEDGER NOTE (RULING-03, 2026-05-14):
 *   The R9 locked inputs (CC $3,200 @24.9% / SL $5,380 @6.1% / extra $270)
 *   converge under avalanche and snowball because the highest-APR debt is
 *   also the smallest balance. The CEO ruled Path B in RULING-03: the locked
 *   example is formally blessed as illustrative, the tool page carries an
 *   "Illustrative example" footnote under the result panel, and the live
 *   calculator continues to recompute from real inputs. LOCKED_DISPLAY is
 *   the source of truth for the masthead strings; do not regenerate it from
 *   the simulator. See: profinancecast2-planning/RULING-03-r9-resolution.md
 * ---------------------------------------------------------------------------
 *
 * Conventions:
 *   - balance accrues interest monthly at apr / 12 BEFORE that month's payment
 *   - minimums are paid first to every debt with a non-zero balance
 *   - any extra payment is steered entirely to the priority debt
 *   - when the priority debt is cleared mid-month, the leftover from extra
 *     waterfalls to the next priority in the SAME month
 *   - schedule is a per-month array of { month, totalBalance, interestPaid,
 *     principalPaid, debts: [{id, balance}] }
 * ============================================================================ */
(function (global) {
  'use strict';

  function clone(debts) {
    return debts.map(function (d) {
      return {
        id: d.id,
        name: d.name,
        balance: +d.balance,
        apr: +d.apr,
        minPayment: +d.minPayment,
        paidOffMonth: null
      };
    });
  }

  function priorityIndex(debts, strategy) {
    var idx = -1;
    var best = strategy === 'snowball' ? Infinity : -Infinity;
    for (var i = 0; i < debts.length; i++) {
      if (debts[i].balance <= 0.005) continue;
      var v = strategy === 'snowball' ? debts[i].balance : debts[i].apr;
      var better = strategy === 'snowball' ? (v < best) : (v > best);
      if (better) { best = v; idx = i; }
    }
    return idx;
  }

  function simulate(rawDebts, extra, strategy) {
    var MAX_MONTHS = 600;
    var debts = clone(rawDebts);
    extra = +extra || 0;
    strategy = strategy === 'snowball' ? 'snowball' : 'avalanche';

    var month = 0;
    var totalInterest = 0;
    var totalPaid = 0;
    var schedule = [];

    while (debts.some(function (d) { return d.balance > 0.005; })) {
      month++;
      if (month > MAX_MONTHS) break;

      var monthInterest = 0;
      var monthPrincipal = 0;

      // Accrue interest on every active balance.
      for (var a = 0; a < debts.length; a++) {
        var d = debts[a];
        if (d.balance <= 0) continue;
        var iAmt = d.balance * (d.apr / 12);
        d.balance += iAmt;
        monthInterest += iAmt;
        totalInterest += iAmt;
      }

      // Pay minimums.
      var pool = extra;
      for (var b = 0; b < debts.length; b++) {
        var dd = debts[b];
        if (dd.balance <= 0) continue;
        var pay = Math.min(dd.minPayment, dd.balance);
        dd.balance -= pay;
        monthPrincipal += pay;
        totalPaid += pay;
        if (dd.balance <= 0.005 && dd.paidOffMonth === null) {
          dd.paidOffMonth = month;
        }
      }

      // Sweep extra into priority debt; waterfall if it clears.
      while (pool > 0.005) {
        var p = priorityIndex(debts, strategy);
        if (p < 0) break;
        var target = debts[p];
        var hit = Math.min(pool, target.balance);
        target.balance -= hit;
        pool -= hit;
        monthPrincipal += hit;
        totalPaid += hit;
        if (target.balance <= 0.005 && target.paidOffMonth === null) {
          target.paidOffMonth = month;
        }
      }

      var snapshot = {
        month: month,
        totalBalance: 0,
        interestPaid: +monthInterest.toFixed(2),
        principalPaid: +monthPrincipal.toFixed(2),
        debts: []
      };
      for (var c = 0; c < debts.length; c++) {
        var dc = debts[c];
        var bal = dc.balance < 0.005 ? 0 : dc.balance;
        snapshot.totalBalance += bal;
        snapshot.debts.push({
          id: dc.id,
          balance: +bal.toFixed(2)
        });
      }
      snapshot.totalBalance = +snapshot.totalBalance.toFixed(2);
      schedule.push(snapshot);
    }

    var byDebt = debts.map(function (d) {
      return { id: d.id, name: d.name, paidOffMonth: d.paidOffMonth };
    });

    return {
      months: month,
      totalInterest: +totalInterest.toFixed(2),
      totalPaid: +totalPaid.toFixed(2),
      schedule: schedule,
      byDebt: byDebt,
      strategy: strategy
    };
  }

  function compare(rawDebts, extra) {
    var a = simulate(rawDebts, extra, 'avalanche');
    var s = simulate(rawDebts, extra, 'snowball');
    var interestSavings = +(s.totalInterest - a.totalInterest).toFixed(2);
    var monthsSavings = s.months - a.months;
    var fasterStrategy = monthsSavings > 0 ? 'avalanche'
                       : monthsSavings < 0 ? 'snowball'
                       : 'tie';
    return {
      avalanche: a,
      snowball:  s,
      savings: {
        interest: interestSavings,
        months:   monthsSavings
      },
      fasterStrategy: fasterStrategy
    };
  }

  global.PFC_DEBT = {
    simulate: simulate,
    compare:  compare,
    // RULING R9 locked display strings (see LEDGER NOTE above and RULING-03).
    LOCKED_DISPLAY: {
      summary: 'Avalanche pays this off in month 14, saves $487 in interest vs snowball.',
      payoffMonth: 14,
      interestSaved: 487
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
