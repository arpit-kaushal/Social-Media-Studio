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
};

type HfImageProbe = {
  ok: boolean;
  ms: number;
  detail: string;
  model?: string;
};

export default function StatusPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hfProbeLoading, setHfProbeLoading] = useState(false);
  const [hfProbe, setHfProbe] = useState<HfImageProbe | null>(null);

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

  async function runHfImageTest() {
    setHfProbeLoading(true);
    setHfProbe(null);
    try {
      const res = await fetch("/api/status/hf-image-test", {
        method: "POST",
        cache: "no-store",
      });
      if (res.status === 404) {
        setHfProbe({
          ok: false,
          ms: 0,
          detail: "Status diagnostics are disabled (STATUS_PAGE_ENABLED=false).",
        });
        return;
      }
      const j = (await res.json()) as HfImageProbe;
      setHfProbe(j);
    } catch {
      setHfProbe({
        ok: false,
        ms: 0,
        detail: "Request failed. Check the dev server console and network tab.",
      });
    } finally {
      setHfProbeLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Service status</h1>
        <p className={styles.lead}>Internal diagnostics for this deployment.</p>
        <Link href="/" className={styles.back}>
          ← Back to home
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

          <section className={styles.hfProbe} aria-labelledby="hf-probe-title">
            <h2 id="hf-probe-title" className={styles.hfProbeTitle}>
              Hugging Face · live image test
            </h2>
            <p className={styles.hfProbeLead}>
              The table row above only checks your token against the Hub. This button runs a real{" "}
              <code className={styles.code}>text-to-image</code> call with your configured model (up
              to ~90 seconds, queues on cold start).
            </p>
            <button
              type="button"
              className={styles.hfProbeBtn}
              onClick={() => void runHfImageTest()}
              disabled={hfProbeLoading}
            >
              {hfProbeLoading ? "Running image test…" : "Test image generation"}
            </button>
            {hfProbe && (
              <div
                className={`${styles.hfProbeResult} ${hfProbe.ok ? styles.hfProbeResultOk : styles.hfProbeResultFail}`}
              >
                <span className={styles.hfProbeStatus}>{hfProbe.ok ? "Success" : "Failed"}</span>
                {hfProbe.ms > 0 ? ` · ${hfProbe.ms} ms` : ""}
                {hfProbe.model ? ` · model ${hfProbe.model}` : ""}
                <br />
                {hfProbe.detail}
              </div>
            )}
          </section>

          <p className={styles.hint}>
            JSON: <code className={styles.code}>/api/status</code> for scripts or monitoring.
          </p>
        </>
      )}
    </main>
  );
}
