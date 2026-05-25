/**
 * IndexedDB adapter for the workspace blob. Mirrors LibraryIndexedDBAdapter
 * in data/LocalData.ts so we use the same idb-keyval store pattern.
 */
import { createStore, get, set } from "idb-keyval";

import { debounce } from "@excalidraw/common";

import { SAVE_TO_LOCAL_STORAGE_TIMEOUT } from "../app_constants";

import type { WorkspaceState } from "./types";

const IDB_NAME = "excalidraw-workspace";
const KEY = "workspace";

const store = createStore(`${IDB_NAME}-db`, `${IDB_NAME}-store`);

export const WorkspaceStorage = {
  async load(): Promise<WorkspaceState | null> {
    try {
      const data = await get<WorkspaceState>(KEY, store);
      return data ?? null;
    } catch (err) {
      console.warn("[workspace] failed to load from IndexedDB", err);
      return null;
    }
  },

  async save(state: WorkspaceState): Promise<void> {
    try {
      await set(KEY, state, store);
    } catch (err) {
      console.warn("[workspace] failed to save to IndexedDB", err);
    }
  },
};

/**
 * Debounced wrapper. The 300ms matches SAVE_TO_LOCAL_STORAGE_TIMEOUT used by
 * the rest of the app so the workspace doesn't fight the legacy save loop.
 */
export const saveWorkspaceDebounced = debounce(
  (state: WorkspaceState) => WorkspaceStorage.save(state),
  SAVE_TO_LOCAL_STORAGE_TIMEOUT,
);
