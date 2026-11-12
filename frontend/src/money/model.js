import { START_MONTH, MAX_MONTHS } from "./constants";

// ---------------------------------------------------------------------------
// Month keys ("YYYY-MM")
// ---------------------------------------------------------------------------

export function ymAdd(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function ymDiff(a, b) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return by * 12 + bm - (ay * 12 + am);
}

export function ymOfDate(iso) {
  return iso ? iso.slice(0, 7) : null;
}

export function ymRange(from, count) {
  return Array.from({ length: count }, (_, i) => ymAdd(from, i));
}

export function clampYm(ym) {
  if (ymDiff(START_MONTH, ym) < 0) return START_MONTH;
  const last = ymAdd(START_MONTH, MAX_MONTHS - 1);
  if (ymDiff(ym, last) < 0) return last;
  return ym;
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

/** rate = how many MXN one THB buys (e.g. 0.5134). */
export function toMXN(amount, cur, rate) {
  return cur === "THB" ? amount * rate : amount;
}

export function toTHB(amount, cur, rate) {
  return cur === "MXN" ? amount / rate : amount;
}

export function convert(amount, from, to, rate) {
  if (from === to) return amount;
  return to === "MXN" ? toMXN(amount, from, rate) : toTHB(amount, from, rate);
}

// ---------------------------------------------------------------------------
// Recurring bonus / KPI rules
//
// A rule pays out on a schedule (monthly / quarterly / yearly from `start`,
// or a fixed list of calendar months). The amount is either fixed or a
// percentage of that month's salary; KPI-type rules are further scaled by
// the achievement percentage. The result shows up in the month's income as
// an automatic row that can be overridden per month (month.bonus[ruleId]).
// ---------------------------------------------------------------------------

export function ruleFires(rule, ym) {
  const start = rule.start || START_MONTH;
  const d = ymDiff(start, ym);
  if (d < 0) return false;
  switch (rule.every) {
    case "quarterly":
      return d % 3 === 0;
    case "yearly":
      return d % 12 === 0;
    case "custom":
      return (rule.months || []).includes(Number(ym.slice(5)));
    default:
      return true;
  }
}

/** Amount in the rule's own currency for a month whose salary total is `salaryMXN`. */
export function ruleAmount(rule, salaryMXN, rate) {
  const cur = rule.cur || "MXN";
  let amt;
  if (rule.calc === "percent") {
    amt = convert((salaryMXN * (Number(rule.percent) || 0)) / 100, "MXN", cur, rate);
  } else {
    amt = Number(rule.amount) || 0;
  }
  if (rule.type === "kpi") {
    const kpi = rule.kpi == null || rule.kpi === "" ? 100 : Number(rule.kpi) || 0;
    amt *= kpi / 100;
  }
  return Math.max(0, amt);
}

/** First month >= fromYm (within the app horizon) in which the rule pays. */
export function nextRuleMonth(rule, fromYm) {
  for (let i = 0; i < MAX_MONTHS; i++) {
    const ym = ymAdd(fromYm, i);
    if (ruleFires(rule, ym)) return ym;
  }
  return null;
}

export function incomeTypeOf(item) {
  return item.type || "salary";
}

// ---------------------------------------------------------------------------
// Effective month schedule
//
// Only months the user has touched exist in `state.months`. Every other
// month is derived: income / spend / rate copy forward from the nearest
// earlier stored month; each debt's payment is min(regular monthly,
// remaining balance) so payments stop by themselves once a debt is paid off;
// recurring bonus rules are evaluated for the month. A stored month may
// override individual debt payments (`debts[id]`) and bonus amounts
// (`bonus[ruleId]`).
// ---------------------------------------------------------------------------

function cloneItems(items) {
  return (items || []).map((it) => ({ ...it }));
}

export function buildSchedule(state, untilYm) {
  const count = Math.max(1, ymDiff(START_MONTH, untilYm) + 1);
  const out = [];
  const remaining = {};
  for (const d of state.debts) remaining[d.id] = Number(d.balance) || 0;
  const rules = state.bonusRules || [];

  let last = null;
  for (let i = 0; i < count; i++) {
    const ym = ymAdd(START_MONTH, i);
    const stored = state.months[ym];
    const base = stored || last || { income: [], spend: [], rate: state.settings.defaultRate };

    const rate = Number(stored ? stored.rate : base.rate) || state.settings.defaultRate;
    // Items flagged `once` belong to their own month only and are not copied forward.
    const income = stored ? stored.income : cloneItems(base.income).filter((it) => !it.once);
    const spend = stored ? stored.spend : cloneItems(base.spend).filter((it) => !it.once);

    // Debts
    const before = { ...remaining };
    const debts = {};
    for (const d of state.debts) {
      const override = stored?.debts?.[d.id];
      const auto = Math.max(0, Math.min(Number(d.monthly) || 0, remaining[d.id]));
      const pay = override != null && override !== "" ? Math.max(0, Number(override) || 0) : auto;
      debts[d.id] = pay;
      remaining[d.id] = Math.max(0, remaining[d.id] - pay);
    }

    // Recurring bonus / KPI
    const salaryMXN = income.reduce((s, it) => (incomeTypeOf(it) === "salary" ? s + toMXN(Number(it.amount) || 0, it.cur, rate) : s), 0);
    const bonus = {};
    const routineIncome = [];
    for (const r of rules) {
      if (!ruleFires(r, ym)) continue;
      const override = stored?.bonus?.[r.id];
      const overridden = override != null && override !== "";
      const amt = overridden ? Math.max(0, Number(override) || 0) : ruleAmount(r, salaryMXN, rate);
      bonus[r.id] = amt;
      routineIncome.push({
        id: "rule:" + r.id,
        ruleId: r.id,
        name: r.name || (r.type === "kpi" ? "KPI" : "โบนัส"),
        type: r.type || "bonus",
        amount: amt,
        cur: r.cur || "MXN",
        auto: true,
        overridden,
      });
    }

    const month = {
      ym,
      stored: Boolean(stored),
      income,
      spend,
      rate,
      debts,
      overrides: stored?.debts || {},
      bonus,
      bonusOverrides: stored?.bonus || {},
      routineIncome,
      salaryMXN,
      remainingBefore: before,
      remainingAfter: { ...remaining },
    };
    out.push(month);
    last = month;
  }
  return out;
}

export function getMonth(state, ym) {
  const sched = buildSchedule(state, ym);
  return sched[sched.length - 1];
}

// ---------------------------------------------------------------------------
// Totals for one month (all in MXN, using that month's rate)
// ---------------------------------------------------------------------------

export function summarize(month, state) {
  const rate = month.rate;
  // Everything is one pool of money: THB and MXN move freely between the two
  // countries (e.g. via Bitcoin), so every amount is converted at this month's
  // rate and summed. Per-country flows are kept only to show how much has to
  // be moved across the border.
  const flow = { MXN: { in: 0, out: 0 }, THB: { in: 0, out: 0 } };
  const allIncome = [...month.income, ...(month.routineIncome || [])];
  const incomeByType = {};
  let income = 0;
  for (const it of allIncome) {
    const amt = Number(it.amount) || 0;
    const v = toMXN(amt, it.cur, rate);
    income += v;
    flow[it.cur === "THB" ? "THB" : "MXN"].in += amt;
    const t = incomeTypeOf(it);
    incomeByType[t] = (incomeByType[t] || 0) + v;
  }

  const byCat = {};
  for (const it of month.spend) {
    const amt = Number(it.amount) || 0;
    const v = toMXN(amt, it.cur, rate);
    byCat[it.cat] = (byCat[it.cat] || 0) + v;
    flow[it.cur === "THB" ? "THB" : "MXN"].out += amt;
  }
  const rent = byCat["ที่พัก"] || 0;
  const savings = byCat["เก็บ"] || 0;
  const other = Object.entries(byCat)
    .filter(([c]) => c !== "ที่พัก" && c !== "เก็บ")
    .reduce((s, [, v]) => s + v, 0);

  const debtTHB = Object.values(month.debts).reduce((s, v) => s + v, 0);
  const debtMXN = debtTHB * rate;
  byCat["หนี้"] = debtMXN;
  flow.THB.out += debtTHB;

  const outflowMXN = rent + other + savings + debtMXN;
  const remaining = income - outflowMXN;

  // > 0: send this much THB to Thailand; < 0: Thailand has extra to bring over.
  const transferTHB = flow.THB.out - flow.THB.in;
  const transferMXN = transferTHB * rate;

  const pctUsed = income > 0 ? (outflowMXN / income) * 100 : null;
  const status = remaining < 0 ? "bad" : income > 0 && remaining < income * 0.1 ? "warn" : "good";

  const totalDebtBefore = Object.values(month.remainingBefore).reduce((s, v) => s + v, 0);
  const totalDebtAfter = Object.values(month.remainingAfter).reduce((s, v) => s + v, 0);

  return {
    ym: month.ym,
    rate,
    income,
    incomeByType,
    rent,
    other,
    savings,
    debtTHB,
    debtMXN,
    outflow: outflowMXN,
    remaining,
    pctUsed,
    status,
    byCat,
    flow,
    transferTHB,
    transferMXN,
    totalDebtBefore,
    totalDebtAfter,
  };
}

export function yearSummary(state, fromYm, count) {
  const untilYm = ymAdd(fromYm, count - 1);
  const sched = buildSchedule(state, untilYm);
  const start = ymDiff(START_MONTH, fromYm);
  const rows = sched.slice(start).map((m) => ({ month: m, sum: summarize(m, state) }));
  const total = rows.reduce(
    (acc, r) => ({
      income: acc.income + r.sum.income,
      outflow: acc.outflow + r.sum.outflow,
      remaining: acc.remaining + r.sum.remaining,
      debtTHB: acc.debtTHB + r.sum.debtTHB,
    }),
    { income: 0, outflow: 0, remaining: 0, debtTHB: 0 }
  );
  return { rows, total };
}

// ---------------------------------------------------------------------------
// Debts
// ---------------------------------------------------------------------------

/** First month in which the debt's remaining balance reaches zero, or null. */
export function payoffMonth(schedule, debtId) {
  for (const m of schedule) {
    if (m.remainingBefore[debtId] > 0 && m.remainingAfter[debtId] <= 0) return m.ym;
  }
  return null;
}

export function monthsToPayoff(debt) {
  const monthly = Number(debt.monthly) || 0;
  const balance = Number(debt.balance) || 0;
  if (balance <= 0) return 0;
  if (monthly <= 0) return Infinity;
  return Math.ceil(balance / monthly);
}

/**
 * Which debt to attack first: highest interest, then the one that finishes
 * soonest (a quick win frees cash flow). An unknown rate is assumed to be
 * "some interest": it sorts below every known positive rate but above 0%
 * installments, which always go last.
 */
export function debtPriority(debts) {
  const rank = (d) => (d.apr == null ? 0.0001 : Number(d.apr) || 0);
  return [...debts]
    .filter((d) => (Number(d.balance) || 0) > 0)
    .sort((a, b) => {
      const diff = rank(b) - rank(a);
      if (diff !== 0) return diff;
      return monthsToPayoff(a) - monthsToPayoff(b);
    });
}

// ---------------------------------------------------------------------------
// Mutations (all return a new state object)
// ---------------------------------------------------------------------------

/** Ensure `ym` exists in state.months (copying the derived month forward). */
export function materialize(state, ym) {
  if (state.months[ym]) return state;
  const eff = getMonth(state, ym);
  return {
    ...state,
    months: {
      ...state.months,
      [ym]: { rate: eff.rate, income: cloneItems(eff.income), spend: cloneItems(eff.spend), debts: {}, bonus: {} },
    },
  };
}

export function updateMonth(state, ym, fn) {
  const s = materialize(state, ym);
  const cur = s.months[ym];
  return { ...s, months: { ...s.months, [ym]: fn(cur) } };
}

export function resetMonth(state, ym) {
  if (ym === START_MONTH) return state;
  const months = { ...state.months };
  delete months[ym];
  return { ...state, months };
}

export function updateDebt(state, id, patch) {
  return { ...state, debts: state.debts.map((d) => (d.id === id ? { ...d, ...patch } : d)) };
}

export function addDebt(state, debt) {
  return { ...state, debts: [...state.debts, debt] };
}

export function removeDebt(state, id) {
  const months = {};
  for (const [ym, m] of Object.entries(state.months)) {
    const debts = { ...(m.debts || {}) };
    delete debts[id];
    months[ym] = { ...m, debts };
  }
  return { ...state, debts: state.debts.filter((d) => d.id !== id), months };
}

export function addBonusRule(state, rule) {
  return { ...state, bonusRules: [...(state.bonusRules || []), rule] };
}

export function updateBonusRule(state, id, patch) {
  return { ...state, bonusRules: (state.bonusRules || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) };
}

export function removeBonusRule(state, id) {
  const months = {};
  for (const [ym, m] of Object.entries(state.months)) {
    const bonus = { ...(m.bonus || {}) };
    delete bonus[id];
    months[ym] = { ...m, bonus };
  }
  return { ...state, bonusRules: (state.bonusRules || []).filter((r) => r.id !== id), months };
}

export function updateSettings(state, patch) {
  return { ...state, settings: { ...state.settings, ...patch } };
}

// ---------------------------------------------------------------------------
// Data-completeness checklist (the questions still open in the spec)
// ---------------------------------------------------------------------------

export function missingChecklist(state, month) {
  const s = state.settings;
  const items = [];
  const noDay = month.income.some((i) => i.day == null || i.day === "");
  if (month.income.length && (noDay || s.incomeNet == null)) {
    items.push({ id: "income", tab: "ledger", text: "รายได้: วันเงินเข้า และสุทธิ/ก่อนหักภาษี" });
  }
  for (const d of state.debts) {
    if ((Number(d.balance) || 0) > 0 && !(Number(d.monthly) > 0)) {
      items.push({ id: "monthly:" + d.id, tab: "debts", text: `${d.name}: ผ่อนเดือนละเท่าไหร่` });
    }
    if (d.apr == null && (Number(d.balance) || 0) > 0) {
      items.push({ id: "apr:" + d.id, tab: "debts", text: `${d.name}: ดอกเบี้ยกี่ %` });
    }
  }
  if (month.spend.some((sp) => sp.estimate)) {
    items.push({ id: "spend", tab: "ledger", text: "แยกใช้จ่ายอื่น: น้ำไฟ เน็ต มือถือ กิน เดินทาง ประกัน" });
  }
  if (s.cashOnHand == null && s.cashTHB == null) {
    items.push({ id: "cash", tab: "settings", text: "เงินสด/เงินออมที่มีตอนนี้" });
  }
  if (s.depositPaid == null) {
    items.push({ id: "deposit", tab: "settings", text: "ค่ามัดจำห้อง + ค่าเข้าอยู่ที่จ่ายไปแล้ว" });
  }
  if (s.goalSave == null && !s.goalDebtId) {
    items.push({ id: "goal", tab: "settings", text: "เป้าหมาย: เก็บเดือนละเท่าไหร่ / ปิดหนี้ก้อนไหนก่อน" });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Blank state — what every account starts with. Real figures live only in
// the owner's D1 row, never in the public bundle.
// ---------------------------------------------------------------------------

export const DEFAULT_RATE = 0.5134; // 1 THB = 0.5134 MXN

export function makeBlank() {
  return {
    v: 2,
    settings: {
      display: "MXN",
      defaultRate: DEFAULT_RATE,
      horizon: 12,
      incomeNet: null,
      cashOnHand: null,
      cashTHB: null,
      depositPaid: null,
      goalSave: null,
      goalDebtId: "",
    },
    debts: [],
    bonusRules: [],
    months: {
      [START_MONTH]: { rate: DEFAULT_RATE, income: [], spend: [], debts: {}, bonus: {} },
    },
  };
}

// ---------------------------------------------------------------------------
// Load / migrate
// ---------------------------------------------------------------------------

/**
 * Old data had a "mode B" with a separate monthly Thai income kept in
 * settings and left out of the main total. Everything is one pool now, so
 * that income becomes an ordinary THB income line in every stored month
 * (later months copy it forward as usual). Idempotent: keyed by a fixed id.
 */
function migrateThaiIncome(state) {
  const st = state.settings || {};
  const amt = Number(st.thaiIncome) || 0;
  const { mode: _mode, thaiIncome: _ti, modeConfirmed: _mc, ...settings } = st;
  if (st.mode !== "B" || amt <= 0) return { ...state, settings };
  const months = {};
  for (const [ym, m] of Object.entries(state.months)) {
    const income = m.income || [];
    months[ym] = income.some((it) => it.id === "thai-income")
      ? m
      : { ...m, income: [...income, { id: "thai-income", name: "รายได้ฝั่งไทย", type: "salary", amount: amt, cur: "THB", day: null }] };
  }
  return { ...state, settings, months };
}

export function normalize(raw, seed) {
  if (!raw || typeof raw !== "object" || !raw.months) return seed;
  return migrateThaiIncome({
    ...seed,
    ...raw,
    v: 2,
    settings: { ...seed.settings, ...(raw.settings || {}) },
    debts: Array.isArray(raw.debts) ? raw.debts : seed.debts,
    bonusRules: Array.isArray(raw.bonusRules) ? raw.bonusRules : [],
    months: raw.months && raw.months[START_MONTH] ? raw.months : { ...seed.months, ...(raw.months || {}) },
  });
}
