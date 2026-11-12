import { useMemo, useState } from "react";
import { ExternalLink, ListPlus, MapPin, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import FormSheet from "./FormSheet";
import { Button, Card, Chip, Empty, Field, Segmented, Stat } from "./ui";
import { PLACE_AREAS, mapsUrl, num, today, uid } from "../lib/model";
import { CDMX_PLACES } from "../data/places";
import { dateLabel, fmtMoney } from "../lib/format";

export const PLACE_FIELDS = [
  { key: "name", label: "ชื่อสถานที่" },
  {
    key: "status",
    label: "สถานะ",
    type: "select",
    options: [
      { id: "want", label: "อยากไป" },
      { id: "been", label: "ไปแล้ว" },
    ],
    half: true,
  },
  { key: "area", label: "ย่าน", type: "select", options: Object.entries(PLACE_AREAS).map(([id, label]) => ({ id, label })), half: true },
  { key: "date", label: "ไปวันที่", type: "date", half: true, show: (d) => d.status === "been" },
  { key: "cost", label: "ใช้เงินรวม (MXN)", type: "num", half: true, show: (d) => d.status === "been" },
  { key: "rating", label: "ให้คะแนน", type: "rating", show: (d) => d.status === "been" },
  { key: "with", label: "ไปกับใคร", half: true, show: (d) => d.status === "been" },
  { key: "query", label: "คำค้นใน Google Maps", placeholder: "ถ้าว่าง ใช้ชื่อสถานที่", half: true },
  { key: "note", label: "โน้ต", type: "textarea", placeholder: "ปิดวันจันทร์, ค่าเข้า, ร้านอร่อยแถวนั้น" },
];

export default function PlacesTab({ mx }) {
  const { state, save, remove, setState } = mx;
  const [filter, setFilter] = useState("want");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);

  const been = state.places.filter((p) => p.status === "been");
  const want = state.places.filter((p) => p.status !== "been");
  const spent = been.reduce((s, p) => s + num(p.cost), 0);
  const visits = been.reduce((s, p) => s + (p.visits?.length || 1), 0);

  const rows = useMemo(() => {
    const base = filter === "been" ? been : filter === "want" ? want : state.places;
    const list = q ? base.filter((p) => `${p.name} ${p.note}`.toLowerCase().includes(q.toLowerCase())) : base;
    return [...list].sort((a, b) =>
      filter === "been" ? (b.date || "").localeCompare(a.date || "") : (a.area || "X").localeCompare(b.area || "X") || a.name.localeCompare(b.name)
    );
  }, [state.places, filter, q, been, want]);

  function importCdmx() {
    const have = new Set(state.places.map((p) => p.name));
    const add = CDMX_PLACES.filter(([, name]) => !have.has(name)).map(([area, name, query]) => ({ id: uid(), name, area, query, status: "want" }));
    if (!add.length) return toast("มีครบแล้ว");
    setState((s) => ({ ...s, places: [...s.places, ...add] }));
    toast.success(`เพิ่ม ${add.length} ที่จากแผนเที่ยว CDMX`);
  }

  const markBeen = (p) => save("places", { ...p, status: "been", date: p.date || today() });

  return (
    <div className="flex flex-col gap-4">
      <Card className="grid grid-cols-3 gap-3">
        <Stat label="ไปแล้ว" value={`${been.length} ที่`} hint={`${visits} ครั้ง`} tone="var(--color-good)" />
        <Stat label="อยากไป" value={`${want.length} ที่`} />
        <Stat label="ใช้เงินเที่ยว" value={fmtMoney(spent)} />
      </Card>

      <a
        href="https://cdmx.kasion.dev"
        className="flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm"
      >
        <span>
          <b className="text-accent">cdmx.kasion.dev</b>
          <span className="text-dim"> · เส้นทางเดิน 3 วัน + คิดงบเที่ยว · ข้อมูลชุดเดียวกับหน้านี้</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-accent" />
      </a>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "want", label: "อยากไป", count: want.length },
            { value: "been", label: "ไปแล้ว", count: been.length },
            { value: "all", label: "ทั้งหมด", count: state.places.length },
          ]}
        />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Field value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาที่" className="pl-8" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-8" onClick={importCdmx} title="เพิ่ม 40 ที่จาก cdmx.kasion.dev">
            <ListPlus className="h-3.5 w-3.5" /> ดึงจากแผน CDMX
          </Button>
          <Button variant="primary" size="sm" className="h-8" onClick={() => setEdit({ status: filter === "been" ? "been" : "want", area: "X", date: today() })}>
            <Plus className="h-3.5 w-3.5" /> เพิ่มที่
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty>{state.places.length ? "ไม่มีในหมวดนี้" : "ยังไม่มีสถานที่ · กด \"ดึงจากแผน CDMX\" เพื่อเริ่มจาก 40 ที่"}</Empty>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((p) => (
          <Card key={p.id} className="flex items-start gap-3 p-3">
            <button type="button" onClick={() => setEdit(p)} className="min-w-0 flex-1 text-left">
              <div className="font-medium leading-snug">{p.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-dim">
                <Chip>{PLACE_AREAS[p.area] || PLACE_AREAS.X}</Chip>
                {p.status === "been" ? (
                  <>
                    <Chip tone="good">{dateLabel(p.date)}</Chip>
                    {p.rating ? <span className="text-warn">{"★".repeat(p.rating)}</span> : null}
                    {num(p.cost) ? <span className="num">{fmtMoney(p.cost)}</span> : null}
                  </>
                ) : null}
              </div>
              {p.note ? <div className="mt-1 line-clamp-2 text-xs text-faint">{p.note}</div> : null}
            </button>
            <div className="flex shrink-0 flex-col gap-1.5">
              <a
                href={mapsUrl((p.query || p.name) + ", Ciudad de México")}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 place-items-center rounded-md border border-line text-accent"
                aria-label={`แผนที่ ${p.name}`}
              >
                <MapPin className="h-4 w-4" />
              </a>
              {p.status !== "been" ? (
                <button type="button" onClick={() => markBeen(p)} className="h-8 rounded-md border border-good/30 px-2 text-[11px] font-semibold text-good" aria-label={`ไปแล้ว ${p.name}`}>
                  ไปแล้ว
                </button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <FormSheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "แก้สถานที่" : "เพิ่มสถานที่"}
        fields={PLACE_FIELDS}
        value={edit}
        onSave={(v) => save("places", v)}
        onDelete={edit?.id ? (v) => remove("places", v.id) : null}
      />
    </div>
  );
}
