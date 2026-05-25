/**
 * Per-scene thumbnail cache, keyed by SceneId. Lives in a separate IDB
 * store so we don't bloat the workspace blob with binary data.
 */
import { createStore, del, get, set } from "idb-keyval";

import type { SceneId } from "./types";

const IDB_NAME = "excalidraw-thumbnails";
const store = createStore(`${IDB_NAME}-db`, `${IDB_NAME}-store`);

export type ThumbnailRecord = {
  /** PNG data-URL. */
  dataUrl: string;
  /** scene.updatedAt at generation time — for cache invalidation. */
  generatedFor: number;
};

export const ThumbnailStorage = {
  async load(id: SceneId): Promise<ThumbnailRecord | null> {
    try {
      const r = await get<ThumbnailRecord>(id, store);
      return r ?? null;
    } catch (err) {
      console.warn("[thumbnails] load failed", err);
      return null;
    }
  },

  async loadMany(
    ids: SceneId[],
  ): Promise<Record<SceneId, ThumbnailRecord | null>> {
    const out: Record<SceneId, ThumbnailRecord | null> = {};
    await Promise.all(
      ids.map(async (id) => {
        out[id] = await ThumbnailStorage.load(id);
      }),
    );
    return out;
  },

  async save(id: SceneId, record: ThumbnailRecord): Promise<void> {
    try {
      await set(id, record, store);
    } catch (err) {
      console.warn("[thumbnails] save failed", err);
    }
  },

  async remove(id: SceneId): Promise<void> {
    try {
      await del(id, store);
    } catch (err) {
      console.warn("[thumbnails] remove failed", err);
    }
  },
};
