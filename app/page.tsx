"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { PromptInput } from "@/components/PromptInput/PromptInput";
import type { StudioFormat } from "@/lib/types";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<StudioFormat>("carousel");
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || startingRef.current) return;

    startingRef.current = true;
    setStarting(true);
    try {
      const res = await fetch("/api/studio-session/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, format }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        alert(j.error ?? "Could not start a new deck. Check that MongoDB is configured.");
        startingRef.current = false;
        setStarting(false);
        return;
      }

      const j = (await res.json()) as { id?: string };
      const id = typeof j.id === "string" ? j.id.trim() : "";
      if (!id) {
        alert("Could not start a new deck. Try again.");
        startingRef.current = false;
        setStarting(false);
        return;
      }

      router.push(`/studio/${encodeURIComponent(id)}`);
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Check your connection and try again.");
      startingRef.current = false;
      setStarting(false);
    }
  }, [prompt, format, router]);

  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Social Media Studio</p>
        <h1 className={styles.title}>Carousels that feel designed, not templated.</h1>
        <p className={styles.sub}>
          Describe your idea, pick a format, and tweak copy and visuals in the editor.
        </p>
      </header>

      <div className={styles.promptStage}>
        <PromptInput
          value={prompt}
          onChange={setPrompt}
          format={format}
          onFormatChange={setFormat}
          onGenerate={handleGenerate}
          disabled={starting}
          loading={starting}
        />
      </div>
    </main>
  );
}
