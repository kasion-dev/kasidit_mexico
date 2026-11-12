import { useMemo, useState } from "react";
import { ExternalLink, Minus, Plus, Search } from "lucide-react";
import FormSheet from "./FormSheet";
import { Button, Card, Chip, Empty, Field, Segmented, Stat } from "./ui";
import { ITEM_CATS, ITEM_STATUS, ROOMS, num, toMXN, today } from "../lib/model";
import { dateLabel, fmtMoney } from "../lib/format";

export const ITEM_FIELDS = [
  { key: "name", label: "ชื่อของ" },
  { key: "status", label: "สถานะ", type: "select", options: ITEM_STATUS, half: true },
  { key: "qty", label: "จำนวน", type: "num", half: true },
  { key: "cat", label: "หมวด", type: "select", options: ITEM_CATS, half: true },
  { key: "room", label: "อยู่ที่ไหน", type: "select", options: ROOMS, allowEmpty: true, half: true },
  { key: "price", label: "ราคา (ต่อชิ้น)", type: "num", half: true },
  { key: "cur", label: "สกุลเงิน", type: "cur", half: true },
  { key: "shop", label: "ซื้อที่", placeholder: "Mercado Libre, Walmart", half: true },
  { key: "date", label: "วันที่ซื้อ / สั่ง", type: "date", half: true },
  { key: "url", label: "ลิงก์สินค้า", type: "url" },
  { key: "note", label: "โน้ต", type: "textarea", placeholder: "ประกัน, ขนาด, ร้านส่งวันไหน" },
];

const statusLabel = Object.fromEntries(ITEM_STATUS.map((s) => [s.id, s.label]));
const statusTone = { have: "good", ordered: "accent", want: "warn", gone: "dim" };

export default function ItemsTab({ mx }) {
  const { state, save, remove } = mx;
  const rate = state.settings.rate;
  const [filter, setFilter] = useState("have");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("room");
  const [edit, setEdit] = useState(null);

  const counts = useMemo(() => {
    const c = { all: state.items.length };
    for (const s of ITEM_STATUS) c[s.id] = state.items.filter((i) => (i.status || "have") === s.id).length;
    return c;
  }, [state.items]);

  const rows = state.items.filter((i) => {
    if (filter !== "all" && (i.status || "have") !== filter) return false;
    if (q && !`${i.name} ${i.cat} ${i.room} ${i.shop} ${i.note}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const value = (list) => list.reduce((s, i) => s + toMXN(num(i.price) * (num(i.qty) || 1), i.cur, rate), 0);
  const haveValue = value(state.items.filter((i) => (i.status || "have") === "have"));
  const wantValue = value(state.items.filter((i) => i.status === "want" || i.status === "ordered"));
  const pieces = state.items.filter((i) => (i.status || "have") === "have").reduce((s, i) => s + (num(i.qty) || 1), 0);

  const groups = useMemo(() => {
    const g = {};
    for (const i of rows) {
      const k = (group === "room" ? i.room : i.cat) || "ไม่ระบุ";
      (g[k] = g[k] || []).push(i);
    }
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0], "th"));
  }, [rows, group]);

  const bump = (i, d) => save("items", { ...i, qty: Math.max(0, (num(i.qty) || 1) + d) });

  return (
    <div className="flex flex-col gap-4">
      <Card className="grid grid-cols-3 gap-3">
        <Stat label="ของที่มี" value={`${pieces} ชิ้น`} hint={`${counts.have} รายการ`} />
        <Stat label="มูลค่าที่มี" value={fmtMoney(haveValue)} />
        <Stat label="ยังต้องซื้อ" value={fmtMoney(wantValue)} hint={`${counts.want + counts.ordered} รายการ`} tone="var(--color-warn)" />
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[...ITEM_STATUS.map((s) => ({ value: s.id, label: s.label, count: counts[s.id] })), { value: "all", label: "ทั้งหมด", count: counts.all }]}
        />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Field value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาของ" className="pl-8" />
        </div>
        <div className="flex gap-2">
          <Segmented
            size="sm"
            value={group}
            onChange={setGroup}
            options={[
              { value: "room", label: "ตามห้อง" },
              { value: "cat", label: "ตามหมวด" },
            ]}
          />
          <Button
            variant="primary"
            size="sm"
            className="h-8"
            onClick={() => setEdit({ status: filter === "all" || filter === "gone" ? "have" : filter, qty: 1, cur: "MXN", cat: ITEM_CATS[0], date: today() })}
          >
            <Plus className="h-3.5 w-3.5" /> เพิ่มของ
          </Button>
        </div>
      </div>

      {rows.length === 0 ? <Empty>{q ? "ไม่เจอ" : "ยังไม่มีของในหมวดนี้"}</Empty> : null}

      {groups.map(([name, list]) => (
        <Card key={name} className="p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold">{name}</span>
            <span className="num text-xs text-dim">
              {list.reduce((s, i) => s + (num(i.qty) || 1), 0)} ชิ้น · {fmtMoney(value(list))}
            </span>
          </div>
          <div className="divide-y divide-line">
            {list.map((i) => (
              <div key={i.id} className="flex items-center gap-2 px-4 py-2.5">
                <button type="button" onClick={() => setEdit(i)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{i.name || "–"}</span>
                    {filter === "all" ? <Chip tone={statusTone[i.status || "have"]}>{statusLabel[i.status || "have"]}</Chip> : null}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-dim">
                    {[group === "room" ? i.cat : i.room, i.price ? fmtMoney(i.price, i.cur) : null, i.shop, i.date ? dateLabel(i.date) : null, i.note]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </button>
                {i.url ? (
                  <a href={i.url} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-md text-dim hover:text-ink" aria-label="เปิดลิงก์สินค้า">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                <div className="flex items-center rounded-lg border border-line bg-inner">
                  <button type="button" className="grid h-8 w-8 place-items-center text-dim" onClick={() => bump(i, -1)} aria-label="ลดจำนวน">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="num w-6 text-center text-sm font-semibold">{num(i.qty) || 1}</span>
                  <button type="button" className="grid h-8 w-8 place-items-center text-dim" onClick={() => bump(i, 1)} aria-label="เพิ่มจำนวน">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <FormSheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "แก้ของ" : "เพิ่มของ"}
        fields={ITEM_FIELDS}
        value={edit}
        onSave={(v) => save("items", v)}
        onDelete={edit?.id ? (v) => remove("items", v.id) : null}
      />
    </div>
  );
}
