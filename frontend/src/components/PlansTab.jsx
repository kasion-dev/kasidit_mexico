import { useMemo, useState } from "react";
import { Check, Clock, ExternalLink, Plus } from "lucide-react";
import FormSheet from "./FormSheet";
import { Button, Card, Chip, Empty, LinkText, Segmented, Stat } from "./ui";
import { PLAN_CATS, PLAN_STATUS, daysUntil, parseLinks, today } from "../lib/model";
import { dateLabel, relDays } from "../lib/format";
import { cn } from "../lib/utils";

export const PLAN_FIELDS = [
  { key: "title", label: "ต้องทำอะไร" },
  { key: "date", label: "วันที่", type: "date", half: true },
  { key: "time", label: "เวลา", type: "time", half: true },
  { key: "status", label: "สถานะ", type: "select", options: PLAN_STATUS, half: true },
  { key: "cat", label: "หมวด", type: "select", options: PLAN_CATS, half: true },
  { key: "links", label: "ลิงก์ (บรรทัดละลิงก์ · ชื่อ | url)", type: "textarea", placeholder: "ตะกร้า ML | https://www.mercadolibre.com.mx/gz/cart/v2" },
  { key: "note", label: "โน้ต", type: "textarea", placeholder: "รายละเอียด, เช็กลิสต์, ลิงก์ก็ได้" },
];

const statusLabel = Object.fromEntries(PLAN_STATUS.map((s) => [s.id, s.label]));
const isOpen = (p) => p.status !== "done" && p.status !== "skip";

function hostLabel(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "mailto:") return u.pathname;
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function PlansTab({ mx }) {
  const { state, save, remove } = mx;
  const [filter, setFilter] = useState("open");
  const [edit, setEdit] = useState(null);
  const t = today();

  const plans = state.plans;
  const counts = useMemo(
    () => ({
      open: plans.filter(isOpen).length,
      done: plans.filter((p) => !isOpen(p)).length,
      all: plans.length,
      overdue: plans.filter((p) => isOpen(p) && p.date && p.date < t).length,
    }),
    [plans, t]
  );

  const next = useMemo(
    () => plans.filter((p) => isOpen(p) && p.date && p.date >= t).sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))[0],
    [plans, t]
  );

  const groups = useMemo(() => {
    const rows = plans.filter((p) => (filter === "open" ? isOpen(p) : filter === "done" ? !isOpen(p) : true));
    const g = {};
    for (const p of rows) (g[p.date || ""] = g[p.date || ""] || []).push(p);
    for (const k of Object.keys(g)) g[k].sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    const keys = Object.keys(g).sort((a, b) => (a === "" ? 1 : b === "" ? -1 : filter === "done" ? b.localeCompare(a) : a.localeCompare(b)));
    return keys.map((k) => [k, g[k]]);
  }, [plans, filter]);

  const toggle = (p) => save("plans", { ...p, status: isOpen(p) ? "done" : "todo", doneAt: isOpen(p) ? t : "" });

  return (
    <div className="flex flex-col gap-4">
      <Card className="grid grid-cols-3 gap-3">
        <Stat label="ต้องทำ" value={`${counts.open} เรื่อง`} hint={counts.overdue ? `เลยกำหนด ${counts.overdue}` : "ไม่มีค้าง"} tone={counts.overdue ? "var(--color-bad)" : undefined} />
        <Stat label="ถัดไป" value={next ? dateLabel(next.date, { year: false }) : "–"} hint={next ? `${relDays(daysUntil(next.date))} · ${next.title}` : ""} tone="var(--color-accent)" />
        <Stat label="เสร็จแล้ว" value={`${counts.done} เรื่อง`} />
      </Card>

      <div className="flex items-center gap-2">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "ยังไม่เสร็จ", count: counts.open },
            { value: "done", label: "เสร็จ / ยกเลิก", count: counts.done },
            { value: "all", label: "ทั้งหมด", count: counts.all },
          ]}
        />
        <Button variant="primary" size="sm" className="ml-auto h-8" onClick={() => setEdit({ status: "todo", cat: PLAN_CATS[0], date: t })}>
          <Plus className="h-3.5 w-3.5" /> เพิ่มแผน
        </Button>
      </div>

      {groups.length === 0 ? <Empty>{filter === "open" ? "ไม่มีเรื่องค้าง 🎉" : "ยังไม่มีแผน"}</Empty> : null}

      <ol className="relative flex flex-col gap-5 border-l border-line pl-5 sm:ml-2">
        {groups.map(([date, list]) => {
          const d = date ? daysUntil(date) : null;
          const isToday = d === 0;
          const past = d != null && d < 0;
          return (
            <li key={date || "nodate"} className="relative">
              <span
                className={cn(
                  "absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-bg",
                  isToday ? "bg-accent" : past ? "bg-faint" : "bg-line-strong"
                )}
                aria-hidden="true"
              />
              <div className="mb-2 flex items-baseline gap-2">
                <span className={cn("text-sm font-semibold", isToday && "text-accent")}>{date ? dateLabel(date) : "ไม่กำหนดวัน"}</span>
                {date ? <span className="text-xs text-dim">{relDays(d)}</span> : null}
              </div>
              <div className="flex flex-col gap-2">
                {list.map((p) => {
                  const open = isOpen(p);
                  const overdue = open && past;
                  const links = parseLinks(p.links);
                  return (
                    <Card key={p.id} className={cn("p-3", !open && "opacity-60", overdue && "border-bad/40")}>
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggle(p)}
                          aria-label={open ? "ทำเครื่องหมายว่าเสร็จ" : "ทำเครื่องหมายว่ายังไม่เสร็จ"}
                          className={cn(
                            "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition",
                            open ? "border-line-strong bg-inner hover:border-good/50" : "border-good/50 bg-good/15 text-good"
                          )}
                        >
                          {open ? null : <Check className="h-4 w-4" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => setEdit(p)} className="w-full text-left">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={cn("font-medium", !open && "line-through")}>{p.title || "–"}</span>
                              {p.time ? (
                                <span className="num inline-flex items-center gap-1 text-xs text-dim">
                                  <Clock className="h-3 w-3" />
                                  {p.time}
                                </span>
                              ) : null}
                              {p.cat ? <Chip>{p.cat}</Chip> : null}
                              {p.status === "doing" ? <Chip tone="accent">{statusLabel.doing}</Chip> : null}
                              {p.status === "skip" ? <Chip>{statusLabel.skip}</Chip> : null}
                              {overdue ? <Chip tone="bad">เลยกำหนด</Chip> : null}
                            </div>
                          </button>
                          {p.note ? <LinkText text={p.note} className="mt-1 block whitespace-pre-line text-xs text-dim" /> : null}
                          {links.length ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {links.map((l, i) => (
                                <a
                                  key={i}
                                  href={l.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-inner px-2 py-1 text-xs text-accent hover:border-accent/40"
                                >
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{l.label || hostLabel(l.url)}</span>
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <FormSheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "แก้แผน" : "เพิ่มแผน"}
        fields={PLAN_FIELDS}
        value={edit}
        onSave={(v) => save("plans", v)}
        onDelete={edit?.id ? (v) => remove("plans", v.id) : null}
      />
    </div>
  );
}
