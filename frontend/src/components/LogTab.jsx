import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import FormSheet from "./FormSheet";
import { Button, Card, Chip, Empty, SectionTitle, Segmented, Stat } from "./ui";
import { LOG_CATS, TRAVEL_MODES, logsInMonth, sumBy, toMXN, today } from "../lib/model";
import { ymAdd } from "../money/model";
import { dateLabel, fmtMoney, ymLabel } from "../lib/format";

export const LOG_FIELDS = [
  { key: "cat", label: "หมวด", type: "select", options: LOG_CATS, half: true },
  { key: "date", label: "วันที่", type: "date", half: true },
  { key: "title", label: "อะไร", placeholder: "ข้าวเที่ยง, DiDi ไป Centro, ซื้อของ Walmart" },
  { key: "amount", label: "จ่าย", type: "num", half: true },
  { key: "cur", label: "สกุลเงิน", type: "cur", half: true },
  { key: "mode", label: "เดินทางด้วย", type: "select", options: TRAVEL_MODES, allowEmpty: true, half: true, show: (d) => d.cat === "เดินทาง" },
  { key: "km", label: "ระยะ (กม.)", type: "num", half: true, show: (d) => d.cat === "เดินทาง" },
  { key: "from", label: "จาก", half: true, show: (d) => d.cat === "เดินทาง" },
  { key: "to", label: "ไป", half: true, show: (d) => d.cat === "เดินทาง" },
  { key: "place", label: "ที่ไหน (ร้าน / ตลาด)", show: (d) => d.cat !== "เดินทาง" },
  { key: "with", label: "กับใคร", placeholder: "คนเดียว, ภรรยา, เพื่อนร่วมงาน", half: true },
  { key: "pay", label: "จ่ายด้วย", type: "select", options: ["เงินสด", "บัตร", "Mercado Pago", "บริษัทจ่าย"], allowEmpty: true, half: true },
  { key: "note", label: "โน้ต", type: "textarea" },
];

const catLabel = Object.fromEntries(LOG_CATS.map((c) => [c.id, c.label]));
const CAT_EMOJI = { กิน: "🌮", เดินทาง: "🚶", ของใช้: "🧺", บ้าน: "🏠", เที่ยว: "📸", อื่น: "•" };

export default function LogTab({ mx, money }) {
  const { state, save, remove } = mx;
  const rate = money.summary?.rate || state.settings.rate;
  const [ym, setYm] = useState(today().slice(0, 7));
  const [cat, setCat] = useState("all");
  const [edit, setEdit] = useState(null);

  const monthLogs = useMemo(() => logsInMonth(state.logs, ym), [state.logs, ym]);
  const shown = (cat === "all" ? monthLogs : monthLogs.filter((l) => l.cat === cat)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const byCat = sumBy(monthLogs, (l) => l.cat, (l) => toMXN(l.amount, l.cur, rate));
  const total = Object.values(byCat).reduce((s, v) => s + v, 0);
  const trips = monthLogs.filter((l) => l.cat === "เดินทาง");
  const walked = trips.filter((l) => l.mode === "เดิน").reduce((s, l) => s + (Number(l.km) || 0), 0);

  // Budget from Kasidit Money for the same month (only when viewing this month).
  const isNow = ym === today().slice(0, 7);
  const budget = isNow && money.summary ? money.summary.byCat : null;

  const byDay = useMemo(() => {
    const g = {};
    for (const l of shown) (g[l.date || "–"] = g[l.date || "–"] || []).push(l);
    return Object.entries(g);
  }, [shown]);

  const quick = (c) => setEdit({ cat: c, date: today(), cur: "MXN", mode: c === "เดินทาง" ? "เดิน" : "" });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center rounded-xl border border-line bg-card p-0.5">
          <button type="button" onClick={() => setYm(ymAdd(ym, -1))} className="grid h-9 w-9 place-items-center rounded-lg text-dim hover:bg-inner" aria-label="เดือนก่อน">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="num w-24 text-center text-sm font-semibold">{ymLabel(ym)}</span>
          <button type="button" onClick={() => setYm(ymAdd(ym, 1))} className="grid h-9 w-9 place-items-center rounded-lg text-dim hover:bg-inner" aria-label="เดือนถัดไป">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button variant="primary" onClick={() => quick("กิน")}>
          <Plus className="h-4 w-4" /> บันทึก
        </Button>
      </div>

      <Card className="grid grid-cols-3 gap-3">
        <Stat label="จ่ายเดือนนี้" value={fmtMoney(total)} hint={`${monthLogs.length} รายการ`} />
        <Stat label="กิน" value={fmtMoney(byCat["กิน"] || 0)} hint={budget?.["กิน"] ? `งบ Money ${fmtMoney(budget["กิน"])}` : null} />
        <Stat
          label="เดินทาง"
          value={fmtMoney(byCat["เดินทาง"] || 0)}
          hint={walked ? `เดิน ${Math.round(walked * 10) / 10} กม.` : budget?.["เดินทาง"] ? `งบ Money ${fmtMoney(budget["เดินทาง"])}` : `${trips.length} เที่ยว`}
        />
      </Card>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {LOG_CATS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => quick(c.id)}
            className="flex flex-col items-center gap-1 rounded-xl border border-line bg-card py-2.5 text-xs font-medium text-dim transition hover:border-line-strong hover:text-ink"
          >
            <span className="text-lg" aria-hidden="true">
              {CAT_EMOJI[c.id]}
            </span>
            + {c.label}
          </button>
        ))}
      </div>

      <Card>
        <SectionTitle
          right={
            <Segmented
              size="sm"
              value={cat}
              onChange={setCat}
              options={[{ value: "all", label: "ทั้งหมด" }, ...LOG_CATS.filter((c) => byCat[c.id] != null).map((c) => ({ value: c.id, label: c.label }))]}
            />
          }
        >
          รายการ
        </SectionTitle>
        {shown.length === 0 ? <Empty>ยังไม่มีบันทึกเดือนนี้ · กดปุ่มด้านบนเพื่อเพิ่ม</Empty> : null}
        <div className="flex flex-col gap-3">
          {byDay.map(([day, list]) => (
            <div key={day}>
              <div className="mb-1 flex items-center justify-between text-xs text-dim">
                <span>{dateLabel(day)}</span>
                <span className="num">{fmtMoney(list.reduce((s, l) => s + toMXN(l.amount, l.cur, rate), 0))}</span>
              </div>
              <div className="divide-y divide-line rounded-xl border border-line bg-inner">
                {list.map((l) => (
                  <button key={l.id} type="button" onClick={() => setEdit(l)} className="flex w-full items-center gap-3 px-3 py-2 text-left">
                    <span className="text-base" aria-hidden="true">
                      {CAT_EMOJI[l.cat] || "•"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{l.title || catLabel[l.cat]}</div>
                      <div className="truncate text-xs text-dim">
                        {[l.mode, l.from && l.to ? `${l.from} → ${l.to}` : l.to || l.place, l.km ? `${l.km} กม.` : null, l.with, l.pay].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className="num shrink-0 text-sm font-semibold">{Number(l.amount) ? fmtMoney(l.amount, l.cur) : <Chip tone="good">ฟรี</Chip>}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <FormSheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "แก้บันทึก" : `บันทึก ${catLabel[edit?.cat] || ""}`}
        fields={LOG_FIELDS}
        value={edit}
        onSave={(v) => save("logs", v)}
        onDelete={edit?.id ? (v) => remove("logs", v.id) : null}
      />
    </div>
  );
}
