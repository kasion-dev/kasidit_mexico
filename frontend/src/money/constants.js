// Bump on every deploy that ships a user-visible change (semver).
export const APP_VERSION = "1.5.0";

export const KV_KEY = "money_state";

// First month tracked. Months before this are not navigable.
export const START_MONTH = "2026-09";
// How many months forward the stepper allows.
export const MAX_MONTHS = 36;

export const CURRENCIES = ["MXN", "THB"];

// Income types. Existing items without a type count as salary.
export const INCOME_TYPES = [
  { id: "salary", label: "เงินเดือน" },
  { id: "kpi", label: "KPI" },
  { id: "bonus", label: "โบนัส" },
  { id: "extra", label: "พิเศษ" },
];
export const INCOME_TYPE_LABEL = Object.fromEntries(INCOME_TYPES.map((t) => [t.id, t.label]));

// How often a recurring bonus / KPI rule pays out.
export const BONUS_EVERY = [
  { id: "monthly", label: "ทุกเดือน" },
  { id: "quarterly", label: "ทุกไตรมาส" },
  { id: "yearly", label: "ทุกปี" },
  { id: "custom", label: "เดือนที่เลือก" },
];

// Spend categories (fixed order — also the order colors are assigned in).
export const SPEND_CATS = ["ที่พัก", "กิน", "เดินทาง", "ยูทิลิตี้", "อื่น", "เก็บ"];

// Categorical palette, assigned by category identity, never cycled.
export const CAT_COLORS = {
  ที่พัก: "#4f8ef7",
  หนี้: "#a78bfa",
  กิน: "#f472b6",
  เดินทาง: "#fb923c",
  ยูทิลิตี้: "#22c5d1",
  อื่น: "#94a3b8",
  เก็บ: "#facc15",
  รายได้: "#31c48d",
};

export const TABS = [
  { id: "dashboard", label: "ภาพรวม" },
  { id: "ledger", label: "รับ-จ่าย" },
  { id: "debts", label: "หนี้" },
  { id: "scenario", label: "สถานการณ์" },
  { id: "settings", label: "ตั้งค่า" },
];

export const TH_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
