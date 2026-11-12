import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui";

export default function LoginScreen() {
  const { signInWithGoogle, enterGuest, firebaseConfigured } = useAuth();

  async function handleLogin() {
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error("เข้าสู่ระบบไม่สำเร็จ: " + (err?.code || err?.message || "unknown error"));
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-line bg-card text-3xl" aria-hidden="true">
        🇲🇽
      </div>
      <div>
        <h1 className="num text-2xl font-bold">Kasidit Mexico</h1>
        <p className="mt-1 text-sm text-dim">ที่พัก · ซิมและบิล · ของในบ้าน · กิน · เดินทาง · ที่เที่ยว</p>
      </div>

      {!firebaseConfigured ? (
        <div className="flex max-w-sm items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 p-3 text-left text-xs text-warn">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ยังไม่ได้ตั้งค่า Firebase
        </div>
      ) : (
        <Button variant="primary" onClick={handleLogin} className="h-11 px-5 text-base">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.6C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
          </svg>
          เข้าสู่ระบบด้วย Gmail
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={enterGuest}>
        ดูแบบไม่ล็อกอิน · เก็บในเครื่องนี้เท่านั้น
      </Button>
      <p className="max-w-xs text-xs text-faint">
        ใช้ Gmail เดียวกับ money.kasion.dev แล้วข้อมูลสองเว็บจะผูกกัน · บัญชีใหม่เริ่มจากข้อมูลว่าง · เฉพาะ Gmail ของเจ้าของซิงก์ข้ามเครื่อง
      </p>
    </div>
  );
}
