import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UsageMap = Record<string, number>;

let cache: UsageMap | null = null;
const subscribers = new Set<(m: UsageMap) => void>();
let channelStarted = false;

async function loadAll() {
  const { data, error } = await supabase
    .from("persona_usage")
    .select("persona_id, count");
  if (error) {
    console.error("persona_usage select failed", error);
    return;
  }
  const m: UsageMap = {};
  for (const row of data ?? []) m[row.persona_id] = Number(row.count) || 0;
  cache = m;
  subscribers.forEach((s) => s(m));
}

function ensureChannel() {
  if (channelStarted) return;
  channelStarted = true;
  void loadAll();
  supabase
    .channel("persona-usage")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "persona_usage" },
      (payload) => {
        const next = { ...(cache ?? {}) };
        const row = (payload.new ?? payload.old) as
          | { persona_id: string; count: number }
          | undefined;
        if (!row) return;
        if (payload.eventType === "DELETE") {
          delete next[row.persona_id];
        } else {
          next[row.persona_id] = Number(row.count) || 0;
        }
        cache = next;
        subscribers.forEach((s) => s(next));
      },
    )
    .subscribe();
}

export function usePersonaUsage() {
  const [usage, setUsage] = useState<UsageMap>(cache ?? {});
  useEffect(() => {
    ensureChannel();
    subscribers.add(setUsage);
    if (cache) setUsage(cache);
    return () => {
      subscribers.delete(setUsage);
    };
  }, []);
  return usage;
}

export function getPersonaCount(usage: UsageMap, id: string): number {
  return usage[id] ?? 0;
}
