"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./status.module.css";

type ServiceRow = {
  id: string;
  name: string;
  configured: boolean;
  ok: boolean | null;
  ms?: number;
  detail: string;
};

type Payload = {
  summary: {
    total: number;
    configured: number;
    passed: number;
    allConfiguredServicesOk: boolean;
  };
  services: ServiceRow[];
  note: string;
};

export default function StatusPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(
              "This diagnostic page is off in production because STATUS_PAGE_ENABLED=false. Unset it or set STATUS_PAGE_ENABLED=true to turn it back on."
            );
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const j = (await res.json()) as Payload;
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Service status</h1>
        <p className={styles.lead}>
          Live checks for AI copy, stock photo APIs, and Pollinations. Keys are read from{" "}
          <code className={styles.code}>.env.local</code> in the project root.
        </p>
        <Link href="/" className={styles.back}>
          ← Back to studio
        </Link>
      </header>

      {loading && <p className={styles.muted}>Running checks…</p>}
      {err && <p className={styles.error}>{err}</p>}

      {data && (
        <>
          <div
            className={
              data.summary.allConfiguredServicesOk
                ? styles.bannerOk
                : styles.bannerWarn
            }
          >
            {data.summary.configured === 0 ? (
              <>No API keys set — the app uses local heuristics and free image fallbacks.</>
            ) : data.summary.allConfiguredServicesOk ? (
              <>
                All configured services responded OK ({data.summary.passed}/
                {data.summary.configured}).
              </>
            ) : (
              <>
                Some configured services failed — see rows below. Fix keys or quotas, then
                refresh.
              </>
            )}
          </div>
          <p className={styles.note}>{data.note}</p>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Key</th>
                <th>Status</th>
                <th>Time</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.services.map((s) => (
                <tr key={s.id}>
                  <td className={styles.name}>{s.name}</td>
                  <td>{s.configured ? "Set" : "—"}</td>
                  <td>
                    {s.ok === null ? (
                      <span className={styles.skip}>skipped</span>
                    ) : s.ok ? (
                      <span className={styles.ok}>ok</span>
                    ) : (
                      <span className={styles.fail}>fail</span>
                    )}
                  </td>
                  <td className={styles.ms}>{s.ms != null ? `${s.ms} ms` : "—"}</td>
                  <td className={styles.detail}>{s.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className={styles.hint}>
            JSON: <code className={styles.code}>/api/status</code> for scripts or monitoring.
          </p>
        </>
      )}
    </main>
  );
}
