import { useCallback, useEffect, useMemo, useState } from "react";
import { useSyncedState, getAuthToken } from "./useSyncedState";
import { KV_KEY, makeBlank, normalize, removeRow, upsert, uid as newId } from "../lib/model";
import { clampYm, getMonth, normalize as normalizeMoney, makeBlank as blankMoney, summarize } from "../money/model";

export function useMexico(userId) {
  const blank = useMemo(() => makeBlank(), []);
  const [raw, setRaw, syncStatus] = useSyncedState(KV_KEY, blank, userId);
  const state = useMemo(() => normalize(raw), [raw]);

  const setState = useCallback((fn) => setRaw((prev) => fn(normalize(prev))), [setRaw]);
  const save = useCallback(
    (list, item) => setState((s) => upsert(s, list, { ...item, id: item.id || newId(), updatedAt: Date.now() })),
    [setState]
  );
  const remove = useCallback((list, id) => setState((s) => removeRow(s, list, id)), [setState]);

  return { state, setState, save, remove, syncStatus };
}

/**
 * Read-only view of Kasidit Money (money.kasion.dev) for the same Gmail
 * account. Fetched from the shared D1 row "money_state"; never written here.
 */
export function useMoneyLink(userId, ym) {
  const [moneyRaw, setMoneyRaw] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | none | readonly | error | guest

  const load = useCallback(async () => {
    if (!userId || userId === "guest") {
      setStatus("guest");
      return;
    }
    setStatus("loading");
    try {
      const token = await getAuthToken();
      if (!token) return setStatus("guest");
      const res = await fetch("/api/kv/money_state", { headers: { Authorization: "Bearer " + token } });
      if (!res.ok) throw new Error("http " + res.status);
      const data = await res.json();
      if (data.owner === false) return setStatus("readonly");
      if (!data.value) return setStatus("none");
      setMoneyRaw(data.value);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    if (!moneyRaw) return null;
    try {
      const st = normalizeMoney(moneyRaw, blankMoney());
      const month = getMonth(st, clampYm(ym));
      const sum = summarize(month, st);
      return { ...sum, spendItems: month.spend };
    } catch {
      return null;
    }
  }, [moneyRaw, ym]);

  return { summary, status, reload: load };
}
