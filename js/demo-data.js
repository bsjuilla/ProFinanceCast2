/**
 * demo-data.js — window.PFC_DATA. Deterministic, illustrative figures for a
 * 30-something professional. Never call APIs; pages render from this object.
 *
 * Numbers chosen to feel organic, not round (per gpt-taste anti-slop).
 */
(function () {
  "use strict";

  // 24-month net-worth history (oldest → newest), ramping with realistic noise.
  const netWorthHistory = [
    52140, 53880, 55420, 54910, 57380, 59640, 61120, 60480, 62980, 65240,
    67510, 69830, 71240, 70180, 72860, 75410, 77930, 79480, 81260, 83120,
    84540, 85910, 86640, 87420,
  ].map((value, i) => ({
    label: `Mo ${i + 1}`,
    value,
  }));

  // 60-month forward forecast (linear-ish growth with milestones)
  const forecastMonths = [];
  let nw = 87420;
  for (let i = 1; i <= 60; i++) {
    nw += 850 + Math.sin(i / 4) * 240 + (i > 30 ? 240 : 0);
    forecastMonths.push({ label: `+${i}mo`, value: Math.round(nw) });
  }

  window.PFC_DATA = {
    profile: {
      name: "Alex Morgan",
      initials: "AM",
      currency: "USD",
      locale: "en-US",
      joinedAt: "2024-09-12",
      plan: "Pro",
    },

    netWorth: {
      current: 87420,
      threeMonthDelta: 4280,
      threeMonthDeltaPct: 0.052,
      twelveMonthForecast: 142800,
      tenYearForecast: 612400,
      history: netWorthHistory,
    },

    income: {
      monthly: 7800,
      annual: 93600,
      takeHomePct: 0.71,
      sources: [
        { label: "Primary salary", value: 7200 },
        { label: "Side consulting", value: 480 },
        { label: "Dividends", value: 120 },
      ],
    },

    expenses: {
      monthly: 4218,
      categories: [
        { label: "Housing", value: 1850 },
        { label: "Food & dining", value: 624 },
        { label: "Transport", value: 382 },
        { label: "Subscriptions", value: 187 },
        { label: "Health", value: 244 },
        { label: "Entertainment", value: 312 },
        { label: "Personal", value: 419 },
        { label: "Other", value: 200 },
      ],
    },

    savings: {
      monthly: 1642,
      rate: 0.21,
      emergencyFundMonths: 4.2,
      emergencyTargetMonths: 6,
    },

    debts: [
      { name: "Chase Sapphire", balance: 4280, apr: 0.2249, minPayment: 128, type: "credit-card" },
      { name: "Federal Student Loan", balance: 18460, apr: 0.0568, minPayment: 215, type: "student-loan" },
      { name: "Auto loan (Civic)", balance: 9120, apr: 0.0489, minPayment: 312, type: "car-loan" },
    ],

    debtStrategy: {
      method: "avalanche",
      monthsToFreedom: 18,
      interestSaved: 4127,
      monthlyAllocation: 980,
    },

    goals: [
      { id: "house", name: "House down payment", target: 65000, current: 23840, deadline: "2027-06-01", icon: "home", color: "var(--mint-500)" },
      { id: "emergency", name: "Emergency fund (6mo)", target: 25308, current: 17712, deadline: "2026-09-01", icon: "shield", color: "var(--lavender-500)" },
      { id: "vacation", name: "Iceland trip", target: 4800, current: 1920, deadline: "2026-08-15", icon: "compass", color: "var(--coral-500)" },
      { id: "retire-boost", name: "Retirement boost", target: 12000, current: 4380, deadline: "2026-12-31", icon: "trend", color: "var(--amber-400)" },
    ],

    forecast: {
      months: forecastMonths,
      milestones: [
        { atMonth: 9,  label: "Credit card paid off", value: 91200 },
        { atMonth: 18, label: "Auto loan cleared",    value: 102400 },
        { atMonth: 24, label: "Emergency fund full",  value: 109800 },
        { atMonth: 42, label: "House down payment",   value: 132600 },
      ],
    },

    sageInsights: [
      {
        id: "insight-1",
        kind: "opportunity",
        title: "Avalanche your card first",
        body: "Your Chase Sapphire at 22.49% APR is the most expensive money in your stack. Redirecting $260/mo from the student loan minimum saves $1,180 in interest.",
        action: "Open Debt Optimizer",
      },
      {
        id: "insight-2",
        kind: "watchout",
        title: "Subscriptions are creeping",
        body: "Recurring software charges grew 18% over 90 days. Three of seven services overlap. A 12-minute review could free up $46/month.",
        action: "Review subscriptions",
      },
      {
        id: "insight-3",
        kind: "win",
        title: "Savings rate at a 12-month high",
        body: "You crossed 21% this month, up from 16% in January. At this pace your 6-month emergency fund completes 4 months ahead of schedule.",
        action: "See projection",
      },
    ],

    healthScore: {
      score: 78,
      grade: "B+",
      trend: 0.04,
      dimensions: {
        savings:    { label: "Savings",         score: 82 },
        debt:       { label: "Debt control",    score: 71 },
        spending:   { label: "Spending",        score: 76 },
        emergency:  { label: "Emergency fund",  score: 68 },
        investing:  { label: "Investing",       score: 84 },
        protection: { label: "Protection",      score: 79 },
      },
    },

    activity: [
      { id: "a1",  at: "2026-05-15T18:42", type: "expense", label: "Whole Foods Market",      amount: -84.18, category: "Food & dining" },
      { id: "a2",  at: "2026-05-15T09:12", type: "income",  label: "Bi-weekly paycheck",      amount: 3214.06, category: "Salary" },
      { id: "a3",  at: "2026-05-14T20:08", type: "expense", label: "Spotify Premium Family",  amount: -16.99, category: "Subscriptions" },
      { id: "a4",  at: "2026-05-14T08:31", type: "transfer",label: "To house down payment",   amount: -420.00, category: "Savings" },
      { id: "a5",  at: "2026-05-13T19:55", type: "expense", label: "Shell Gas Station",       amount: -47.32, category: "Transport" },
      { id: "a6",  at: "2026-05-12T14:20", type: "expense", label: "Brooklyn Roasting Co.",   amount: -6.45,  category: "Food & dining" },
      { id: "a7",  at: "2026-05-12T11:02", type: "income",  label: "Consulting — Lumen Co.",  amount: 480.00, category: "Side income" },
      { id: "a8",  at: "2026-05-11T22:14", type: "expense", label: "Uber",                    amount: -22.18, category: "Transport" },
      { id: "a9",  at: "2026-05-11T16:48", type: "expense", label: "Apple One",               amount: -19.95, category: "Subscriptions" },
      { id: "a10", at: "2026-05-10T13:30", type: "transfer",label: "Credit card payment",     amount: -385.00, category: "Debt" },
    ],

    cashForecast: {
      currentBalance: 6240,
      thirtyDayMin:   4180,
      thirtyDayMax:   9120,
      events: [
        { atDay: 1,  label: "Paycheck",         delta:  3214 },
        { atDay: 3,  label: "Rent",             delta: -1850 },
        { atDay: 5,  label: "Utilities",        delta:  -184 },
        { atDay: 12, label: "Credit card due",  delta:  -385 },
        { atDay: 15, label: "Paycheck",         delta:  3214 },
        { atDay: 20, label: "Student loan",     delta:  -215 },
        { atDay: 22, label: "Auto loan",        delta:  -312 },
        { atDay: 28, label: "Goal transfer",    delta:  -420 },
      ],
    },
  };
})();
