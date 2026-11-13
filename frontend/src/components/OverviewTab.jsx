import { useMemo } from "react";
import { CalendarClock, ExternalLink, Home } from "lucide-react";
import { Card, Chip, Empty, SectionTitle, Stat } from "./ui";
import { daysUntil, logsInMonth, nextDueDate, num, serviceMonthly, sumBy, toMXN, today } from "../lib/model";
import { dateLabel, fmtMoney, relDays, ymLabel } from "../lib/format";

const STATUS_TONE = { good: "var(--color-good)", warn: "var(--color-warn)", bad: "var(--color-bad)" };

export default function OverviewTab({ mx, money, goTab, ym }) {
  const { state } = mx;
  const sum = money.summary;
  const rate = sum?.rate || state.settings.rate;

  const current = state.homes.find((h) => h.status === "current");
  const next = state.homes.find((h) => h.status === "next");

  const monthLogs = logsInMonth(state.logs, ym);
  const byCat = sumBy(monthLogs, (l) => l.cat, (l) => toMXN(l.amount, l.cur, rate));
  const logged = Object.values(byCat).reduce((s, v) => s + v, 0);
  const services = state.services.reduce((s, x) => s + (x.cycle === "free" ? 0 : serviceMonthly(x, rate)), 0);

  const itemsHave = state.items.filter((i) => (i.status || "have") === "have").reduce((s, i) => s + (num(i.qty) || 1), 0);
  const itemsWant = state.items.filter((i) => i.status === "want" || i.status === "ordered");
  const wantCost = itemsWant.reduce((s, i) => s + toMXN(num(i.price) * (num(i.qty) || 1), i.cur, rate), 0);
  const placesBeen = state.places.filter((p) => p.status === "been").length;

  // Trip budget: settings.trip is written by cdmx.kasion.dev (its rate = THB per 1 MXN).
  const trip = state.settings.trip;
  const tripPlan = trip ? num(trip.countA) * num(trip.costA) + num(trip.countB) * num(trip.costB) : 0;
  const tripPlaces = state.places
    .filter((p) => p.status === "been" && (p.date || "").slice(0, 7) === ym && num(p.cost))
    .reduce((s, p) => s + num(p.cost), 0);
  const tripLogs = byCat["เที่ยว"] || 0;
  const tripSpent = tripLogs + tripPlaces;
  const tripLeft = tripPlan - tripSpent;
  const toTHB = (mxn) => (rate ? mxn / rate : mxn * num(trip?.rate));

  const upcoming = useMemo(() => {
    const ev = [];
    for (const h of state.homes) {
      if (h.status === "past") continue;
      const label = h.name || "ที่พัก";
      if (h.moveIn) ev.push({ date: h.moveIn, text: `รับกุญแจ / ย้ายเข้า ${label}`, tab: "home" });
      if (h.leaseStart) ev.push({ date: h.leaseStart, text: `สัญญาเช่าเริ่ม ${label}`, tab: "home" });
      if (h.leaseEnd) ev.push({ date: h.leaseEnd, text: `สัญญาเช่าหมด ${label}`, tab: "home" });
      const due = nextDueDate(h.rentDay);
      if (due && (!h.leaseStart || due >= h.leaseStart)) ev.push({ date: due, text: `จ่ายค่าเช่า ${fmtMoney(h.rent, h.cur)}`, tab: "home" });
    }
    for (const s of state.services) {
      const name = s.provider || s.name;
      if (s.start) ev.push({ date: s.start, text: `เริ่ม ${name}`, tab: "home" });
      if (s.end) ev.push({ date: s.end, text: `หมด ${name}`, tab: "home" });
      if (s.dueDay && s.cycle !== "free") ev.push({ date: nextDueDate(s.dueDay), text: `ตัดเงิน ${name} ${fmtMoney(s.cost, s.cur)}`, tab: "home" });
    }
    for (const p of state.plans) {
      if (p.date && p.status !== "done" && p.status !== "skip") ev.push({ date: p.date, text: (p.time ? p.time + " · " : "") + p.title, tab: "plans" });
    }
    for (const i of state.items) {
      if (i.status === "ordered" && i.date) ev.push({ date: i.date, text: `สั่ง ${i.name} (รอของ)`, tab: "items" });
    }
    return ev
      .map((e) => ({ ...e, days: daysUntil(e.date) }))
      .filter((e) => e.days != null && e.days >= -3 && e.days <= 60)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [state.homes, state.services, state.items, state.plans]);

  const recent = [...state.logs].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle right={<button type="button" onClick={() => goTab("home")} className="font-semibold text-accent">จัดการ</button>}>
            <span className="inline-flex items-center gap-2">
              <Home className="h-4 w-4 text-accent" /> ที่พัก
            </span>
          </SectionTitle>
          {!current && !next ? <Empty>ยังไม่ได้ใส่ที่พัก</Empty> : null}
          {[current, next].filter(Boolean).map((h) => {
            const due = h.status === "current" ? nextDueDate(h.rentDay) : null;
            const keys = h.status === "next" ? daysUntil(h.moveIn) : null;
            return (
              <div key={h.id} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{h.name}</span>
                  <Chip tone={h.status === "current" ? "good" : "accent"}>{h.status === "current" ? "อยู่ตอนนี้" : "กำลังย้ายเข้า"}</Chip>
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs text-dim">{h.address}</div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-xs">
                  {h.rent ? <span className="num">ค่าเช่า {fmtMoney(h.rent, h.cur)}</span> : null}
                  {due ? <span className="text-dim">งวดถัดไป {dateLabel(due)} · {relDays(daysUntil(due))}</span> : null}
                  {keys != null ? <span className="text-accent">รับกุญแจ {dateLabel(h.moveIn)} · {relDays(keys)}</span> : null}
                </div>
              </div>
            );
          })}
        </Card>

        <Card>
          <SectionTitle
            right={
              <a href="https://money.kasion.dev" className="inline-flex items-center gap-1 font-semibold text-accent">
                เปิด Money <ExternalLink className="h-3 w-3" />
              </a>
            }
          >
            เงิน {ymLabel(ym)}
          </SectionTitle>
          {sum ? (
            <div className="grid grid-cols-3 gap-3">
              <Stat label="รายรับ" value={fmtMoney(sum.income)} />
              <Stat label="ออกตามแผน" value={fmtMoney(sum.outflow)} />
              <Stat label="เหลือ" value={fmtMoney(sum.remaining, "MXN", { sign: true })} tone={STATUS_TONE[sum.status]} />
            </div>
          ) : (
            <div className="text-sm text-dim">
              {money.status === "loading"
                ? "กำลังโหลดจาก Money…"
                : money.status === "none"
                  ? "Money ยังไม่มีข้อมูลของบัญชีนี้"
                  : money.status === "guest"
                    ? "ล็อกอิน Gmail เดียวกับ Money เพื่อดึงยอดเงิน"
                    : money.status === "readonly"
                      ? "บัญชีนี้ไม่ได้ซิงก์กับ Money"
                      : "โหลดยอดจาก Money ไม่ได้"}
            </div>
          )}
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3">
            <Stat label="จ่ายจริง (บันทึก)" value={fmtMoney(logged)} hint={`${monthLogs.length} รายการ`} />
            <Stat label="กิน" value={fmtMoney(byCat["กิน"] || 0)} hint={sum?.byCat?.["กิน"] ? `แผน ${fmtMoney(sum.byCat["กิน"])}` : null} />
            <Stat label="บริการ/เดือน" value={fmtMoney(services)} hint="ซิม เน็ต บิล" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tap onClick={() => goTab("items")} label="ของที่มี" value={`${itemsHave} ชิ้น`} />
        <Tap onClick={() => goTab("items")} label="ยังต้องซื้อ" value={fmtMoney(wantCost)} hint={`${itemsWant.length} รายการ`} />
        <Tap onClick={() => goTab("places")} label="ที่เที่ยวไปแล้ว" value={`${placesBeen} ที่`} hint={`อยากไปอีก ${state.places.length - placesBeen}`} />
        <Tap onClick={() => goTab("home")} label="ซิม / บริการ" value={`${state.services.length} รายการ`} />
      </div>

      <Card>
        <SectionTitle
          right={
            <a href="https://cdmx.kasion.dev" className="inline-flex items-center gap-1 font-semibold text-accent">
              {trip ? "แก้แผน" : "ตั้งงบ"} <ExternalLink className="h-3 w-3" />
            </a>
          }
        >
          งบเที่ยว {ymLabel(ym)}
        </SectionTitle>
        {trip ? (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="งบตามแผน" value={fmtMoney(tripPlan)} hint={fmtMoney(toTHB(tripPlan), "THB")} />
            <Stat label="ใช้ไปแล้ว" value={fmtMoney(tripSpent)} hint={`บันทึก ${fmtMoney(tripLogs)} · สถานที่ ${fmtMoney(tripPlaces)}`} />
            <Stat
              label={tripLeft < 0 ? "เกินงบ" : "เหลือ"}
              value={fmtMoney(tripLeft, "MXN", { sign: true })}
              hint={fmtMoney(toTHB(tripLeft), "THB", { sign: true })}
              tone={tripLeft < 0 ? STATUS_TONE.bad : STATUS_TONE.good}
            />
          </div>
        ) : (
          <div className="text-sm text-dim">
            ยังไม่ได้ตั้งงบเที่ยว ·{" "}
            <a href="https://cdmx.kasion.dev" className="font-semibold text-accent">
              ตั้งงบที่ cdmx.kasion.dev
            </a>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-accent" /> ใกล้ถึง (60 วัน)
            </span>
          </SectionTitle>
          {upcoming.length === 0 ? <Empty>ไม่มีนัดหรือวันครบกำหนด</Empty> : null}
          <div className="divide-y divide-line">
            {upcoming.map((e, i) => (
              <button key={i} type="button" onClick={() => goTab(e.tab)} className="flex w-full items-center gap-3 py-2 text-left">
                <div className="num w-14 shrink-0 text-xs font-semibold text-dim">{dateLabel(e.date, { year: false })}</div>
                <div className="min-w-0 flex-1 truncate text-sm">{e.text}</div>
                <Chip tone={e.days < 0 ? "dim" : e.days <= 3 ? "warn" : "dim"}>{relDays(e.days)}</Chip>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle right={<button type="button" onClick={() => goTab("log")} className="font-semibold text-accent">ดูทั้งหมด</button>}>บันทึกล่าสุด</SectionTitle>
          {recent.length === 0 ? <Empty>ยังไม่มีบันทึกกิน / เดินทาง</Empty> : null}
          <div className="divide-y divide-line">
            {recent.map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-2">
                <div className="num w-14 shrink-0 text-xs text-dim">{dateLabel(l.date, { year: false })}</div>
                <div className="min-w-0 flex-1 truncate text-sm">{l.title || l.cat}</div>
                <div className="num text-sm font-semibold">{Number(l.amount) ? fmtMoney(l.amount, l.cur) : "ฟรี"}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <p className="text-center text-xs text-faint">อัปเดต {dateLabel(today())} · ยอดเงินอ่านจาก money.kasion.dev (Gmail เดียวกัน)</p>
    </div>
  );
}

function Tap({ label, value, hint, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-line bg-card p-3 text-left transition hover:border-line-strong">
      <Stat label={label} value={value} hint={hint} />
    </button>
  );
}
