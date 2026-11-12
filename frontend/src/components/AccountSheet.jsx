import { useRef } from "react";
import { Download, LogOut, Upload } from "lucide-react";
import { toast } from "sonner";
import Sheet from "./Sheet";
import { Button, Chip, NumField } from "./ui";
import { useAuth } from "../hooks/useAuth";
import { normalize, today } from "../lib/model";

const SYNC_TEXT = {
  idle: ["ซิงก์แล้ว", "good"],
  syncing: ["กำลังซิงก์…", "dim"],
  offline: ["ออฟไลน์ · บันทึกในเครื่องแล้ว", "warn"],
  readonly: ["บัญชีนี้ไม่ซิงก์ · เก็บในเครื่องนี้", "warn"],
};

const MONEY_TEXT = {
  ok: ["เชื่อม Money แล้ว", "good"],
  loading: ["กำลังโหลด Money…", "dim"],
  none: ["Money ยังไม่มีข้อมูล", "warn"],
  readonly: ["บัญชีนี้ไม่ซิงก์กับ Money", "warn"],
  error: ["โหลด Money ไม่ได้", "bad"],
  guest: ["ไม่ได้ล็อกอิน", "warn"],
  idle: ["–", "dim"],
};

export default function AccountSheet({ open, onClose, mx, money }) {
  const { user, signOutUser } = useAuth();
  const file = useRef(null);
  const [syncText, syncTone] = user?.isGuest ? ["ไม่ได้ล็อกอิน · เก็บในเครื่องนี้", "warn"] : SYNC_TEXT[mx.syncStatus] || SYNC_TEXT.idle;
  const [moneyText, moneyTone] = MONEY_TEXT[money.status] || MONEY_TEXT.idle;

  function exportJson() {
    const blob = new Blob([JSON.stringify(mx.state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kasidit-mexico-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJson(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!window.confirm("แทนที่ข้อมูลทั้งหมดด้วยไฟล์นี้? (ข้อมูลเดิมจะหาย ให้ export เก็บไว้ก่อน)")) return;
      mx.setState(() => normalize(data));
      toast.success("นำเข้าแล้ว");
    } catch {
      toast.error("ไฟล์ไม่ถูกต้อง");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="บัญชี">
      <div className="flex items-center gap-3">
        {user?.photoURL ? <img src={user.photoURL} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" /> : null}
        <div className="min-w-0">
          <div className="truncate font-semibold">{user?.isGuest ? "ไม่ได้ล็อกอิน" : user?.displayName || user?.email}</div>
          {!user?.isGuest ? <div className="truncate text-xs text-dim">{user?.email}</div> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip tone={syncTone}>{syncText}</Chip>
        <Chip tone={moneyTone}>{moneyText}</Chip>
      </div>
      <p className="text-xs text-dim">
        ข้อมูลเก็บในฐานข้อมูลเดียวกับ money.kasion.dev แยกคนละก้อน ล็อกอิน Gmail เดียวกันแล้วหน้าภาพรวมจะดึงยอดเงินเดือนนี้จาก Money มาแสดง (อ่านอย่างเดียว ไม่แก้ข้อมูล Money)
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-dim">อัตราแลก สำรอง (MXN ต่อ 1 THB) · ใช้เมื่อ Money ไม่มีเรท</span>
        <NumField
          value={mx.state.settings.rate}
          onChange={(v) => mx.setState((s) => ({ ...s, settings: { ...s.settings, rate: v || 0.5134 } }))}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={exportJson}>
          <Download className="h-4 w-4" /> Export JSON
        </Button>
        <Button onClick={() => file.current?.click()}>
          <Upload className="h-4 w-4" /> Import JSON
        </Button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={importJson} />
      </div>
      <Button variant="danger" onClick={signOutUser}>
        <LogOut className="h-4 w-4" /> {user?.isGuest ? "ออกจากโหมดไม่ล็อกอิน" : "ออกจากระบบ"}
      </Button>
    </Sheet>
  );
}
