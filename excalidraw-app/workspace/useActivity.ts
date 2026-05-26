import { useCallback, useEffect, useRef, useState } from "react";

import { ActivityStorage } from "./ActivityStorage";

import type { ActivityEvent, ActivityKind } from "./ActivityStorage";
import type { SceneId } from "./types";

/** Coalesce repeated 'edited' events within this window into one. */
const EDIT_COALESCE_MS = 10 * 60 * 1000; // 10 minutes

const newId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export type ActivityAPI = {
  events: ActivityEvent[];
  record: (
    kind: ActivityKind,
    sceneId: SceneId,
    sceneName: string,
    extra?: Partial<ActivityEvent>,
  ) => void;
};

/**
 * Activity log hook. Loads events from IDB once, exposes them + a record()
 * function that appends a new event. 'edited' events within EDIT_COALESCE_MS
 * for the same scene are coalesced (only timestamp updates).
 */
export const useActivity = (): ActivityAPI => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const ref = useRef<ActivityEvent[]>([]);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    ActivityStorage.load().then((loaded) => {
      if (cancelled) {
        return;
      }
      ref.current = loaded;
      setEvents(loaded);
      hydratedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const record = useCallback<ActivityAPI["record"]>(
    (kind, sceneId, sceneName, extra) => {
      if (!hydratedRef.current) {
        // Don't drop events before hydration — buffer them.
        ActivityStorage.load().then((loaded) => {
          ref.current = loaded;
          hydratedRef.current = true;
          record(kind, sceneId, sceneName, extra);
        });
        return;
      }
      const now = Date.now();
      const list = ref.current;
      // Coalesce 'edited' for the same scene inside the window.
      if (kind === "edited") {
        const last = list[0];
        if (
          last &&
          last.kind === "edited" &&
          last.sceneId === sceneId &&
          now - last.ts < EDIT_COALESCE_MS
        ) {
          const updated = { ...last, ts: now, sceneName };
          const next = [updated, ...list.slice(1)];
          ref.current = next;
          setEvents(next);
          ActivityStorage.save(next);
          return;
        }
      }
      const ev: ActivityEvent = {
        id: newId(),
        ts: now,
        kind,
        sceneId,
        sceneName,
        ...extra,
      };
      const next = [ev, ...list];
      ref.current = next;
      setEvents(next);
      ActivityStorage.save(next);
    },
    [],
  );

  return { events, record };
};
