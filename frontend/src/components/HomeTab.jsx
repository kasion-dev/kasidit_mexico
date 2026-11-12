import { useState } from "react";
import { MapPin, Phone, Plus } from "lucide-react";
import FormSheet from "./FormSheet";
import { Button, Card, Chip, Empty, SectionTitle } from "./ui";
import { HOME_STATUS, SERVICE_KINDS, daysUntil, intlDigits, mapsUrl, nextDueDate, serviceMonthly, waUrl } from "../lib/model";
import { dateLabel, fmtMoney, relDays } from "../lib/format";

export const HOME_FIELDS = [
  { key: "name", label: "ชื่อเรียก", placeholder: "เช่น ห้องใหม่" },
  { key: "status", label: "สถานะ", type: "select", options: HOME_STATUS, half: true },
  { key: "address", label: "ที่อยู่", type: "textarea", placeholder: "ถนน เลขที่ ตึก ห้อง colonia CP" },
  { key: "rent", label: "ค่าเช่า / เดือน", type: "num", half: true },
  { key: "cur", label: "สกุลเงิน", type: "cur", half: true },
  { key: "rentDay", label: "จ่ายทุกวันที่", type: "num", half: true },
  { key: "deposit", label: "มัดจำ", type: "num", half: true },
  { key: "moveIn", label: "รับกุญแจ / ย้ายเข้า", type: "date", half: true },
  { key: "leaseStart", label: "สัญญาเริ่ม", type: "date", half: true },
  { key: "leaseEnd", label: "สัญญาสิ้นสุด", type: "date", half: true },
  { key: "payTo", label: "จ่ายค่าเช่าทาง", placeholder: "เงินสด / โอน", half: true },
  { key: "included", label: "รวมในค่าเช่า / เจ้าของจ่าย", placeholder: "น้ำ ค่าส่วนกลาง ม่าน" },
  { key: "tenantPays", label: "ผู้เช่าจ่ายเอง", placeholder: "ไฟ แก๊ส เน็ต" },
  { key: "note", label: "โน้ต", type: "textarea" },
];

export const SERVICE_FIELDS = [
  { key: "kind", label: "ประเภท", type: "select", options: SERVICE_KINDS, half: true },
  { key: "provider", label: "ผู้ให้บริการ", placeholder: "Megacable, Telcel, CFE", half: true },
  { key: "name", label: "แพ็กเกจ / ชื่อ", placeholder: "200 Mbps, ซิมบริษัท" },
  { key: "number", label: "เบอร์ / เลขสมาชิก / เลขบัญชี", half: true },
  { key: "phone", label: "เบอร์ติดต่อผู้ให้บริการ", type: "tel", half: true },
  { key: "cost", label: "ค่าใช้จ่าย", type: "num", half: true },
  { key: "cur", label: "สกุลเงิน", type: "cur", half: true },
  {
    key: "cycle",
    label: "รอบจ่าย",
    type: "select",
    options: [
      { id: "month", label: "รายเดือน" },
      { id: "year", label: "รายปี" },
      { id: "once", label: "ครั้งเดียว" },
      { id: "free", label: "ฟรี / บริษัทจ่าย" },
    ],
    half: true,
  },
  { key: "dueDay", label: "ตัดเงินทุกวันที่", type: "num", half: true },
  { key: "start", label: "เริ่ม", type: "date", half: true },
  { key: "end", label: "หมดสัญญา / หมดอายุ", type: "date", half: true },
  { key: "note", label: "โน้ต", type: "textarea" },
];

export const CONTACT_FIELDS = [
  { key: "name", label: "ชื่อ" },
  { key: "role", label: "เป็นใคร", placeholder: "นายหน้า, เจ้าของห้อง, ช่าง", half: true },
  { key: "phone", label: "เบอร์ / WhatsApp", type: "tel", placeholder: "55 1234 5678 หรือ +66…", half: true },
  { key: "note", label: "โน้ต", type: "textarea" },
];

export function WaIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

/** Call + WhatsApp buttons for a phone number (opens the WhatsApp app via wa.me). */
export function ContactButtons({ phone, name }) {
  const d = intlDigits(phone);
  if (!d) return null;
  return (
    <div className="flex shrink-0 gap-1.5">
      <a href={waUrl(phone)} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-lg border border-[#25d366]/40 text-[#25d366]" aria-label={`WhatsApp ${name || ""}`}>
        <WaIcon className="h-[18px] w-[18px]" />
      </a>
      <a href={`tel:+${d}`} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-accent" aria-label={`โทร ${name || ""}`}>
        <Phone className="h-4 w-4" />
      </a>
    </div>
  );
}

const kindLabel =Object.fromEntries(SERVICE_KINDS.map((k) => [k.id, k.label]));
const homeLabel = Object.fromEntries(HOME_STATUS.map((k) => [k.id, k.label]));

export default function HomeTab({ mx }) {
  const { state, save, remove } = mx;
  const rate = state.settings.rate;
  const [edit, setEdit] = useState(null); // { list, value }

  const order = { current: 0, next: 1, past: 2 };
  const homes = [...state.homes].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
  const services = [...state.services].sort((a, b) => (a.kind || "").localeCompare(b.kind || ""));
  const monthlyTotal = services.reduce((s, x) => s + (x.cycle === "free" ? 0 : serviceMonthly(x, rate)), 0);

  const schema = { homes: HOME_FIELDS, services: SERVICE_FIELDS, contacts: CONTACT_FIELDS };
  const titles = { homes: "ที่พัก", services: "ซิม / บริการ / บิล", contacts: "ผู้ติดต่อ" };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle
          right={
            <Button size="sm" variant="subtle" onClick={() => setEdit({ list: "homes", value: { status: "current", cur: "MXN" } })}>
              <Plus className="h-3.5 w-3.5" /> เพิ่ม
            </Button>
          }
        >
          ที่พัก
        </SectionTitle>
        {homes.length === 0 ? <Empty>ยังไม่มีที่พัก</Empty> : null}
        <div className="flex flex-col gap-3">
          {homes.map((h) => {
            const due = h.status === "past" ? null : nextDueDate(h.rentDay);
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setEdit({ list: "homes", value: h })}
                className="rounded-xl border border-line bg-inner p-3 text-left transition hover:border-line-strong"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold">{h.name || "ที่พัก"}</div>
                    <div className="mt-0.5 whitespace-pre-line text-xs text-dim">{h.address}</div>
                  </div>
                  <Chip tone={h.status === "current" ? "good" : h.status === "next" ? "accent" : "dim"}>{homeLabel[h.status] || "–"}</Chip>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
                  {h.rent ? (
                    <span>
                      ค่าเช่า <b className="num text-ink">{fmtMoney(h.rent, h.cur)}</b>
                      {h.rentDay ? ` · ทุกวันที่ ${h.rentDay}` : ""}
                    </span>
                  ) : null}
                  {due && h.status !== "past" ? (
                    <span>
                      งวดถัดไป {dateLabel(due)} ({relDays(daysUntil(due))})
                    </span>
                  ) : null}
                  {h.moveIn ? <span>ย้ายเข้า {dateLabel(h.moveIn)}</span> : null}
                  {h.leaseStart || h.leaseEnd ? (
                    <span>
                      สัญญา {dateLabel(h.leaseStart)} – {dateLabel(h.leaseEnd)}
                    </span>
                  ) : null}
                </div>
                {h.included || h.tenantPays ? (
                  <div className="mt-2 grid gap-1 text-xs">
                    {h.included ? <div className="text-good">เจ้าของจ่าย: {h.included}</div> : null}
                    {h.tenantPays ? <div className="text-warn">เราจ่าย: {h.tenantPays}</div> : null}
                  </div>
                ) : null}
                {h.note ? <div className="mt-2 whitespace-pre-line text-xs text-faint">{h.note}</div> : null}
                {h.address ? (
                  <a
                    href={mapsUrl(h.address)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent"
                  >
                    <MapPin className="h-3.5 w-3.5" /> แผนที่
                  </a>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle
          right={
            <>
              <span className="num">{fmtMoney(monthlyTotal)}/ด.</span>
              <Button size="sm" variant="subtle" onClick={() => setEdit({ list: "services", value: { kind: "sim", cur: "MXN", cycle: "month" } })}>
                <Plus className="h-3.5 w-3.5" /> เพิ่ม
              </Button>
            </>
          }
        >
          ซิม · เน็ต · บิล · เอกสาร
        </SectionTitle>
        {services.length === 0 ? <Empty>ยังไม่มีบริการ เพิ่มซิม เน็ต ค่าไฟ วีซ่า</Empty> : null}
        <div className="divide-y divide-line">
          {services.map((s) => {
            const left = daysUntil(s.end);
            return (
              <div key={s.id} className="flex items-center gap-2 py-2.5">
              <button type="button" onClick={() => setEdit({ list: "services", value: s })} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">{s.provider || s.name || "บริการ"}</span>
                    <Chip>{kindLabel[s.kind] || s.kind}</Chip>
                    {left != null && left <= 30 ? <Chip tone={left < 0 ? "bad" : "warn"}>{left < 0 ? "หมดแล้ว" : `หมดใน ${left} วัน`}</Chip> : null}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-dim">
                    {[s.name && s.provider ? s.name : null, s.number, s.dueDay ? `ตัดวันที่ ${s.dueDay}` : null].filter(Boolean).join(" · ")}
                  </div>
                  {s.note ? <div className="mt-0.5 line-clamp-2 text-xs text-faint">{s.note}</div> : null}
                </div>
                <div className="num shrink-0 text-right text-sm font-semibold">
                  {s.cycle === "free" ? <span className="text-good">ฟรี</span> : s.cost ? fmtMoney(s.cost, s.cur) : "–"}
                  <div className="text-[11px] font-normal text-dim">{s.cycle === "year" ? "/ปี" : s.cycle === "once" ? "ครั้งเดียว" : s.cycle === "free" ? "" : "/เดือน"}</div>
                </div>
              </button>
              <ContactButtons phone={s.phone} name={s.provider} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle
          right={
            <Button size="sm" variant="subtle" onClick={() => setEdit({ list: "contacts", value: {} })}>
              <Plus className="h-3.5 w-3.5" /> เพิ่ม
            </Button>
          }
        >
          ผู้ติดต่อ
        </SectionTitle>
        {state.contacts.length === 0 ? <Empty>นายหน้า เจ้าของห้อง ช่าง ฝ่ายบริการลูกค้า</Empty> : null}
        <div className="divide-y divide-line">
          {state.contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <button type="button" onClick={() => setEdit({ list: "contacts", value: c })} className="min-w-0 flex-1 text-left">
                <div className="font-semibold">{c.name}</div>
                <div className="truncate text-xs text-dim">{[c.role, c.note].filter(Boolean).join(" · ")}</div>
              </button>
              <ContactButtons phone={c.phone} name={c.name} />
              {!c.phone ? (
                <button type="button" onClick={() => setEdit({ list: "contacts", value: c })} className="text-xs font-semibold text-accent">
                  + เบอร์
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <FormSheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.value?.id ? `แก้ ${titles[edit.list]}` : `เพิ่ม ${titles[edit?.list] || ""}`}
        fields={edit ? schema[edit.list] : []}
        value={edit?.value}
        onSave={(v) => save(edit.list, v)}
        onDelete={edit?.value?.id ? (v) => remove(edit.list, v.id) : null}
      />
    </div>
  );
}
