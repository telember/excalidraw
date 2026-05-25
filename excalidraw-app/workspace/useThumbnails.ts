import { useCallback, useEffect, useRef, useState } from "react";

import { exportToCanvas } from "@excalidraw/excalidraw";

import { ThumbnailStorage, type ThumbnailRecord } from "./ThumbnailStorage";

import type { WorkspaceScene, SceneId } from "./types";

const THUMB_W = 320;
const THUMB_H = 200;

const generate = async (scene: WorkspaceScene): Promise<string | null> => {
  // Empty scenes get a uniform placeholder instead of running exportToCanvas
  // (which throws on empty element arrays in some cases).
  if (!scene.elements || scene.elements.length === 0) {
    return null;
  }
  try {
    const canvas = await exportToCanvas({
      elements: scene.elements as any,
      appState: {
        ...(scene.appState as any),
        exportBackground: true,
        exportWithDarkMode: scene.appState?.theme === "dark",
      },
      files: null,
      getDimensions: () => ({ width: THUMB_W, height: THUMB_H }),
    });
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("[thumbnails] generate failed for", scene.id, err);
    return null;
  }
};

/**
 * Lazily generates + caches thumbnails for the scenes we ask about.
 *
 * - `request(scene)` schedules a generate during idle time if the cached
 *   record is older than scene.updatedAt or absent.
 * - On scene mutation (updatedAt change) the new thumbnail is queued.
 * - Cache lives in IndexedDB so a refresh doesn't re-rasterize everything.
 */
export const useThumbnails = (scenes: WorkspaceScene[]) => {
  const [thumbs, setThumbs] = useState<Record<SceneId, ThumbnailRecord | null>>(
    {},
  );
  const pendingRef = useRef<Set<SceneId>>(new Set());
  const lastScheduled = useRef<Record<SceneId, number>>({});

  // Load any cached thumbnails on mount / when the scene set changes.
  useEffect(() => {
    const ids = scenes.map((s) => s.id);
    if (ids.length === 0) {
      return;
    }
    let cancelled = false;
    ThumbnailStorage.loadMany(ids).then((loaded) => {
      if (cancelled) {
        return;
      }
      setThumbs((prev) => ({ ...prev, ...loaded }));
    });
    return () => {
      cancelled = true;
    };
  }, [scenes]);

  // Schedule (re)generation for any scene whose cached entry is stale.
  useEffect(() => {
    const schedule = (cb: () => void) => {
      const ric = (window as any).requestIdleCallback as
        | ((cb: () => void, opts?: { timeout: number }) => number)
        | undefined;
      if (ric) {
        ric(cb, { timeout: 2000 });
      } else {
        setTimeout(cb, 200);
      }
    };

    for (const scene of scenes) {
      const cached = thumbs[scene.id];
      const lastTry = lastScheduled.current[scene.id] ?? 0;
      const needsRegen = !cached || cached.generatedFor < scene.updatedAt;
      // Don't schedule the same scene twice in flight; also bail if we just
      // tried for this updatedAt.
      if (
        needsRegen &&
        !pendingRef.current.has(scene.id) &&
        lastTry < scene.updatedAt
      ) {
        pendingRef.current.add(scene.id);
        lastScheduled.current[scene.id] = scene.updatedAt;
        schedule(async () => {
          const dataUrl = await generate(scene);
          pendingRef.current.delete(scene.id);
          if (!dataUrl) {
            return;
          }
          const record: ThumbnailRecord = {
            dataUrl,
            generatedFor: scene.updatedAt,
          };
          await ThumbnailStorage.save(scene.id, record);
          setThumbs((prev) => ({ ...prev, [scene.id]: record }));
        });
      }
    }
  }, [scenes, thumbs]);

  const remove = useCallback((id: SceneId) => {
    ThumbnailStorage.remove(id);
    setThumbs((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  return { thumbs, remove };
};
