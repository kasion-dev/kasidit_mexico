export const TH_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const nf0 = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

export function fmtNum(n) {
  if (n == null || Number.isNaN(n)) return "–";
  return nf0.format(Math.round(n));
}

export function fmtMoney(n, cur = "MXN", { sign = false } = {}) {
  if (n == null || Number.isNaN(n)) return "–";
  const s = sign && n > 0 ? "+" : n < 0 ? "−" : "";
  return `${s}${cur === "THB" ? "฿" : "$"}${fmtNum(Math.abs(n))}`;
}

export function dateLabel(iso, { year = true } = {}) {
  if (!iso) return "–";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${TH_MONTHS_SHORT[m - 1]}${year ? " " + String(y).slice(2) : ""}`;
}

export function ymLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return `${TH_MONTHS_SHORT[m - 1]} ${y}`;
}

export function relDays(n) {
  if (n == null) return "";
  if (n === 0) return "วันนี้";
  if (n === 1) return "พรุ่งนี้";
  if (n > 0) return `อีก ${n} วัน`;
  return `${-n} วันก่อน`;
}
