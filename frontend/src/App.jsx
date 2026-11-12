import { useState } from "react";
import { Boxes, CloudOff, ExternalLink, Home, LayoutDashboard, MapPin, ReceiptText, RefreshCw } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useMexico, useMoneyLink } from "./hooks/useMexico";
import { APP_VERSION, today } from "./lib/model";
import { cn } from "./lib/utils";
import LoginScreen from "./components/LoginScreen";
import AccountSheet from "./components/AccountSheet";
import OverviewTab from "./components/OverviewTab";
import HomeTab from "./components/HomeTab";
import ItemsTab from "./components/ItemsTab";
import LogTab from "./components/LogTab";
import PlacesTab from "./components/PlacesTab";

const TABS = [
  { id: "overview", label: "ภาพรวม", icon: LayoutDashboard },
  { id: "home", label: "บ้าน·ซิม", icon: Home },
  { id: "items", label: "ของ", icon: Boxes },
  { id: "log", label: "กิน·เดินทาง", icon: ReceiptText },
  { id: "places", label: "ที่เที่ยว", icon: MapPin },
];

function Shell({ user }) {
  const mx = useMexico(user.uid);
  const ym = today().slice(0, 7);
  const money = useMoneyLink(user.uid, ym);
  const [tab, setTab] = useState(() => {
    try {
      return sessionStorage.getItem("kmx_tab") || "overview";
    } catch {
      return "overview";
    }
  });
  const [account, setAccount] = useState(false);

  const goTab = (t) => {
    setTab(t);
    try {
      sessionStorage.setItem("kmx_tab", t);
    } catch {}
    window.scrollTo({ top: 0 });
  };

  const localOnly = user.isGuest || mx.syncStatus === "readonly";
  const badge = localOnly || mx.syncStatus === "offline" ? "warn" : mx.syncStatus === "syncing" ? "sync" : null;

  return (
    <div className="min-h-screen pb-[calc(88px+env(safe-area-inset-bottom))] sm:pb-12">
      <div className="sticky top-0 z-20 pt-[env(safe-area-inset-top)]">
        <header className="border-b border-line bg-bg/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3">
            <span className="text-xl" aria-hidden="true">
              🇲🇽
            </span>
            <span className="num text-base font-bold tracking-tight">Kasidit Mexico</span>
            <a
              href="https://money.kasion.dev"
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 text-xs font-semibold text-dim hover:text-ink"
            >
              Money <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setAccount(true)}
              aria-label="บัญชีและตั้งค่า"
              title={localOnly ? "ข้อมูลอยู่ในเครื่องนี้เท่านั้น" : user.email}
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-card"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xs font-bold uppercase text-dim">{user.isGuest ? "?" : (user.email || "?").slice(0, 1)}</span>
              )}
              {badge ? (
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-bg",
                    badge === "warn" ? "bg-warn text-[#0b0e14]" : "bg-inner text-dim"
                  )}
                  aria-hidden="true"
                >
                  {badge === "warn" ? <CloudOff className="h-2.5 w-2.5" /> : <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                </span>
              ) : null}
            </button>
          </div>
        </header>
        <nav className="hidden border-b border-line bg-bg/85 backdrop-blur sm:block" aria-label="เมนูหลัก">
          <div className="mx-auto flex max-w-5xl gap-1 px-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => goTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap px-3.5 text-sm font-medium text-dim transition hover:text-ink",
                  tab === t.id && "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent"
                )}
              >
                <t.icon className="h-4 w-4" aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-5">
        {tab === "overview" && <OverviewTab mx={mx} money={money} goTab={goTab} ym={ym} />}
        {tab === "home" && <HomeTab mx={mx} />}
        {tab === "items" && <ItemsTab mx={mx} />}
        {tab === "log" && <LogTab mx={mx} money={money} />}
        {tab === "places" && <PlacesTab mx={mx} />}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
        aria-label="เมนูหลัก"
      >
        <div className="grid grid-cols-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn("flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition", tab === t.id ? "text-ink" : "text-dim")}
            >
              <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", tab === t.id && "bg-accent/15 text-accent")}>
                <t.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <AccountSheet open={account} onClose={() => setAccount(false)} mx={mx} money={money} />
      <div className="num pointer-events-none fixed bottom-2 right-3 hidden text-[10px] text-faint sm:block">v{APP_VERSION}</div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-dim">
        <span className="animate-pulse">กำลังตรวจสอบการเข้าสู่ระบบ…</span>
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  return <Shell user={user} />;
}
