// ---------------------------------------------------------------------------
// Kasidit Mexico — one JSON blob per account, stored under key "mexico_state"
// in the same D1 table as Kasidit Money. Every account starts blank; nothing
// personal ships in the bundle.
// ---------------------------------------------------------------------------

export const KV_KEY = "mexico_state";
export const APP_VERSION = "1.0.0";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local

export const HOME_STATUS = [
  { id: "current", label: "อยู่ตอนนี้" },
  { id: "next", label: "กำลังจะย้ายเข้า" },
  { id: "past", label: "เคยอยู่" },
];

export const SERVICE_KINDS = [
  { id: "sim", label: "ซิม / มือถือ" },
  { id: "internet", label: "อินเทอร์เน็ต" },
  { id: "utility", label: "ไฟ / น้ำ / แก๊ส" },
  { id: "app", label: "แอป / สมาชิก" },
  { id: "doc", label: "เอกสาร / วีซ่า" },
  { id: "other", label: "อื่น ๆ" },
];

export const ITEM_STATUS = [
  { id: "have", label: "มีแล้ว" },
  { id: "ordered", label: "สั่งแล้ว รอส่ง" },
  { id: "want", label: "อยากได้" },
  { id: "gone", label: "ขาย / ทิ้งแล้ว" },
];

export const ITEM_CATS = ["เฟอร์นิเจอร์", "เครื่องใช้ไฟฟ้า", "ครัว", "ห้องนอน", "ห้องน้ำ", "เสื้อผ้า", "ไอที", "เอกสาร", "อื่น ๆ"];
export const ROOMS = ["ห้องนั่งเล่น", "ห้องนอน 1", "ห้องนอน 2", "ครัว", "ห้องน้ำ", "ระเบียง", "ติดตัว"];

export const LOG_CATS = [
  { id: "กิน", label: "กิน", money: "กิน" },
  { id: "เดินทาง", label: "เดินทาง", money: "เดินทาง" },
  { id: "ของใช้", label: "ของใช้", money: "อื่น" },
  { id: "บ้าน", label: "บ้าน / บิล", money: "ยูทิลิตี้" },
  { id: "เที่ยว", label: "เที่ยว", money: "อื่น" },
  { id: "อื่น", label: "อื่น ๆ", money: "อื่น" },
];

export const PLAN_STATUS = [
  { id: "todo", label: "ต้องทำ" },
  { id: "doing", label: "กำลังทำ" },
  { id: "done", label: "เสร็จแล้ว" },
  { id: "skip", label: "ยกเลิก" },
];

export const PLAN_CATS = ["บ้าน", "ซื้อของ", "เน็ต·ซิม", "เงิน", "เอกสาร", "งาน", "อื่น ๆ"];

/** "label | url" or bare url per line → [{ label, url }] */
export function parseLinks(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bar = line.lastIndexOf("|");
      const label = bar > -1 ? line.slice(0, bar).trim() : "";
      let url = (bar > -1 ? line.slice(bar + 1) : line).trim();
      if (!/^(https?:|mailto:|tel:)/i.test(url)) url = url.includes("@") && !url.includes("/") ? "mailto:" + url : "https://" + url;
      return { label, url };
    });
}

export const TRAVEL_MODES = ["เดิน", "Metro", "Metrobús", "DiDi", "Uber", "inDrive", "แท็กซี่", "รถเมล์", "Ecobici", "อื่น ๆ"];

export const PLACE_AREAS = {
  A: "Chapultepec และ Polanco",
  B: "Reforma และ Centro",
  C: "Roma, Condesa, Juárez",
  D: "Coyoacán และย่านใต้",
  E: "นอกย่านกลาง",
  X: "อื่น ๆ",
};

export function makeBlank() {
  return {
    v: 1,
    homes: [],
    contacts: [],
    services: [],
    items: [],
    logs: [],
    places: [],
    plans: [],
    settings: { rate: 0.5134 }, // MXN per 1 THB, used only when Money has no rate
  };
}

export function normalize(raw) {
  const b = makeBlank();
  if (!raw || typeof raw !== "object") return b;
  const arr = (x) => (Array.isArray(x) ? x : []);
  return {
    ...b,
    ...raw,
    homes: arr(raw.homes),
    contacts: arr(raw.contacts),
    services: arr(raw.services),
    items: arr(raw.items),
    logs: arr(raw.logs),
    places: arr(raw.places),
    plans: arr(raw.plans),
    settings: { ...b.settings, ...(raw.settings || {}) },
  };
}

// Generic list helpers: state[list] is an array of objects with `id`.
export function upsert(state, list, item) {
  const rows = state[list] || [];
  const exists = rows.some((r) => r.id === item.id);
  return { ...state, [list]: exists ? rows.map((r) => (r.id === item.id ? item : r)) : [item, ...rows] };
}

export function removeRow(state, list, id) {
  return { ...state, [list]: (state[list] || []).filter((r) => r.id !== id) };
}

export const num = (v) => (v === "" || v == null ? 0 : Number(v) || 0);

export function toMXN(amount, cur, rate) {
  return cur === "THB" ? num(amount) * rate : num(amount);
}

// Monthly cost of a service in MXN (cycle: month | year | once).
export function serviceMonthly(s, rate) {
  const v = toMXN(s.cost, s.cur, rate);
  if (s.cycle === "year") return v / 12;
  if (s.cycle === "once") return 0;
  return v;
}

export function logsInMonth(logs, ym) {
  return logs.filter((l) => (l.date || "").slice(0, 7) === ym);
}

export function sumBy(rows, keyFn, valFn) {
  const out = {};
  for (const r of rows) {
    const k = keyFn(r);
    out[k] = (out[k] || 0) + valFn(r);
  }
  return out;
}

export function mapsUrl(q) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
}

// Phone → international digits for wa.me / tel:. 10-digit numbers are
// Mexican (+52); Thai numbers written with a leading 0 become +66.
export function intlDigits(phone) {
  if (!phone) return "";
  const raw = String(phone).trim();
  let d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (raw.startsWith("+")) return d.replace(/^521(\d{10})$/, "52$1");
  if (d.length === 10 && d.startsWith("0")) return "66" + d.slice(1);
  if (d.length === 10) return "52" + d;
  if (d.length === 9 && /^[689]/.test(d)) return "66" + d;
  return d.replace(/^521(\d{10})$/, "52$1");
}

export function waUrl(phone, text) {
  const d = intlDigits(phone);
  if (!d) return null;
  return "https://wa.me/" + d + (text ? "?text=" + encodeURIComponent(text) : "");
}

export function daysUntil(iso) {
  if (!iso) return null;
  const a = new Date(today() + "T00:00:00");
  const b = new Date(iso + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

// Next date (YYYY-MM-DD) for a monthly due day, from today.
export function nextDueDate(day) {
  const d = Number(day);
  if (!d) return null;
  const t = new Date(today() + "T00:00:00");
  let y = t.getFullYear();
  let m = t.getMonth();
  if (t.getDate() > d) m += 1;
  const last = new Date(y, m + 1, 0).getDate();
  const dt = new Date(y, m, Math.min(d, last));
  return dt.toLocaleDateString("en-CA");
}
