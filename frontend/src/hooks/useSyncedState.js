import { useCallback, useEffect, useRef, useState } from "react";
import { getCachedIdToken, getFreshIdToken } from "./useAuth";

export async function getAuthToken() {
  return getCachedIdToken() || (await getFreshIdToken());
}

function readLocal(storageKey, defaultValue) {
  if (!storageKey) return defaultValue;
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return defaultValue;
    const parsed = JSON.parse(stored);
    return parsed == null ? defaultValue : parsed;
  } catch {
    return defaultValue;
  }
}

/**
 * useState backed by localStorage (namespaced per Firebase uid, instant and
 * offline-friendly) and kept in sync with the Worker's `/api/kv/:key`.
 *
 *  - Initial state is read synchronously from localStorage.
 *  - On mount / user change, the server value is fetched and wins. If the
 *    server has nothing yet, the local value is pushed up (first device).
 *  - Every update writes localStorage immediately and PUTs to the server
 *    after a short debounce (typing in an input shouldn't spam the API).
 *  - The server may answer `owner: false` (or 403 on PUT): this account is
 *    not allowed to store data. The hook then stays local-only and reports
 *    status "readonly".
 *
 * Returns [value, update, status] with status "idle" | "syncing" | "offline" | "readonly".
 */
export function useSyncedState(key, defaultValue, uid) {
  const storageKey = uid ? `u:${uid}:${key}` : null;
  const [value, setValue] = useState(() => readLocal(storageKey, defaultValue));
  const [status, setStatus] = useState("idle");
  const timer = useRef(null);
  const latest = useRef(value);
  const readonly = useRef(false);
  latest.current = value;

  // cdmx.kasion.dev writes the same record: re-read the server copy whenever
  // this tab comes back into view (unless an edit is still waiting to be sent),
  // so a stale copy here never overwrites changes made on the other site.
  const [pullTick, setPullTick] = useState(0);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && !timer.current) setPullTick((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    let cancelled = false;
    readonly.current = false;
    const local = readLocal(storageKey, defaultValue);
    setValue(local);
    setStatus("idle");
    if (!storageKey) return;

    (async () => {
      const token = await getAuthToken();
      if (!token || cancelled) return;
      setStatus("syncing");
      try {
        const res = await fetch("/api/kv/" + key, { headers: { Authorization: "Bearer " + token } });
        if (!res.ok) throw new Error("http " + res.status);
        const data = await res.json();
        if (cancelled) return;
        if (data && data.owner === false) {
          readonly.current = true;
          setStatus("readonly");
          return;
        }
        if (data && data.value != null) {
          setValue(data.value);
          localStorage.setItem(storageKey, JSON.stringify(data.value));
        } else {
          // Nothing on the server yet: seed it with whatever this device has.
          await fetch("/api/kv/" + key, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify(local),
          });
        }
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, pullTick]);

  const push = useCallback(
    async (next) => {
      if (readonly.current) return;
      const token = await getAuthToken();
      if (!token) return;
      setStatus("syncing");
      try {
        const res = await fetch("/api/kv/" + key, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify(next),
        });
        if (res.status === 403) {
          readonly.current = true;
          setStatus("readonly");
          return;
        }
        setStatus(res.ok ? "idle" : "offline");
      } catch {
        setStatus("offline");
      }
    },
    [key]
  );

  const update = useCallback(
    (nextOrFn) => {
      const next = typeof nextOrFn === "function" ? nextOrFn(latest.current) : nextOrFn;
      latest.current = next;
      setValue(next);
      if (!storageKey) return;
      localStorage.setItem(storageKey, JSON.stringify(next));
      if (readonly.current) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        push(next);
      }, 600);
    },
    [storageKey, push]
  );

  return [value, update, status];
}
