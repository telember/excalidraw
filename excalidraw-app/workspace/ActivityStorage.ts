/**
 * Per-workspace activity event log. Lives in its own IDB store so it doesn't
 * inflate the main workspace blob.
 *
 * One key, one array of events (ordered newest-first). Capped at 500 to keep
 * the read fast and storage bounded.
 */
import { createStore, get, set } from "idb-keyval";

import type { SceneId } from "./types";

const IDB_NAME = "excalidraw-activity";
const KEY = "events";
const MAX_EVENTS = 500;

const store = createStore(`${IDB_NAME}-db`, `${IDB_NAME}-store`);

export type ActivityKind =
  | "created"
  | "renamed"
  | "edited"
  | "deleted"
  | "restored"
  | "duplicated"
  | "moved";

export type ActivityEvent = {
  id: string;
  ts: number;
  kind: ActivityKind;
  sceneId: SceneId;
  sceneName: string;
  oldName?: string;
  newName?: string;
  fromFolderId?: string | null;
  toFolderId?: string | null;
};

export const ActivityStorage = {
  async load(): Promise<ActivityEvent[]> {
    try {
      return (await get<ActivityEvent[]>(KEY, store)) ?? [];
    } catch (err) {
      console.warn("[activity] load failed", err);
      return [];
    }
  },

  async save(events: ActivityEvent[]): Promise<void> {
    try {
      const trimmed =
        events.length > MAX_EVENTS ? events.slice(0, MAX_EVENTS) : events;
      await set(KEY, trimmed, store);
    } catch (err) {
      console.warn("[activity] save failed", err);
    }
  },
};
