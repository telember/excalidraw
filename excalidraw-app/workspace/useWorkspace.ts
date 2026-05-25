import { useCallback, useEffect, useRef, useState } from "react";

import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import { getDefaultAppState } from "@excalidraw/excalidraw/appState";

import type { OrderedExcalidrawElement } from "@excalidraw/element/types";
import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

import { STORAGE_KEYS } from "../app_constants";

import { saveWorkspaceDebounced, WorkspaceStorage } from "./WorkspaceStorage";

import { WORKSPACE_VERSION } from "./types";

import type {
  FolderId,
  PersistedSceneAppState,
  SceneId,
  WorkspaceFolder,
  WorkspaceScene,
  WorkspaceState,
} from "./types";

const uuid = (): string => {
  // crypto.randomUUID is widely available; fall back to a Math.random id.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

const pickAppState = (appState: AppState): PersistedSceneAppState => ({
  viewBackgroundColor: appState.viewBackgroundColor,
  gridSize: appState.gridSize,
  zoom: appState.zoom,
  scrollX: appState.scrollX,
  scrollY: appState.scrollY,
  theme: appState.theme,
});

const readLegacyScene = (): {
  elements: readonly OrderedExcalidrawElement[];
  appState: PersistedSceneAppState;
} | null => {
  try {
    const rawElements = localStorage.getItem(
      STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS,
    );
    const rawAppState = localStorage.getItem(
      STORAGE_KEYS.LOCAL_STORAGE_APP_STATE,
    );
    const elements = rawElements ? JSON.parse(rawElements) : [];
    const appState = rawAppState ? JSON.parse(rawAppState) : {};
    if (!Array.isArray(elements) || elements.length === 0) {
      return null;
    }
    return {
      elements,
      appState: pickAppState({
        ...getDefaultAppState(),
        ...appState,
      } as AppState),
    };
  } catch (err) {
    console.warn("[workspace] legacy localStorage migration failed", err);
    return null;
  }
};

const makeEmptyScene = (
  folderId: FolderId = null,
  name = "Untitled",
): WorkspaceScene => {
  const now = Date.now();
  return {
    id: uuid(),
    name,
    folderId,
    elements: [],
    appState: {},
    createdAt: now,
    updatedAt: now,
  };
};

const createInitialWorkspace = (): WorkspaceState => {
  const legacy = readLegacyScene();
  const scene: WorkspaceScene = legacy
    ? {
        id: uuid(),
        name: "Untitled",
        folderId: null,
        elements: legacy.elements,
        appState: legacy.appState,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    : makeEmptyScene();

  return {
    version: WORKSPACE_VERSION,
    scenes: { [scene.id]: scene },
    folders: {},
    openTabs: [scene.id],
    activeTab: scene.id,
  };
};

export type WorkspaceAPI = {
  state: WorkspaceState;
  activeScene: WorkspaceScene | null;
  /** Called from <Excalidraw onChange>. Mutates the ref only — no React render. */
  captureFromEditor: (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
  ) => void;
  switchTab: (id: SceneId) => void;
  openScene: (id: SceneId) => void;
  closeTab: (id: SceneId) => void;
  createScene: (folderId?: FolderId, name?: string) => SceneId;
  renameScene: (id: SceneId, name: string) => void;
  deleteScene: (id: SceneId) => void;
  duplicateScene: (id: SceneId) => SceneId | null;
  moveScene: (id: SceneId, folderId: FolderId) => void;
  reorderTabs: (sourceId: SceneId, targetId: SceneId | null) => void;
  createFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
};

/**
 * Owns the workspace state. Persists to IndexedDB via WorkspaceStorage.
 *
 * Strategy: the source of truth is a ref (stateRef); a useState mirror drives
 * re-renders for structural changes. captureFromEditor (called per keystroke
 * via onChange) only mutates the ref and schedules a debounced save — it does
 * NOT trigger a React update, so the editor stays smooth.
 */
export const useWorkspace = (
  excalidrawAPI: ExcalidrawImperativeAPI | null,
): WorkspaceAPI | null => {
  const stateRef = useRef<WorkspaceState | null>(null);
  const [state, setState] = useState<WorkspaceState | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await WorkspaceStorage.load();
      if (cancelled) {
        return;
      }
      const initial = loaded ?? createInitialWorkspace();
      stateRef.current = initial;
      setState(initial);
      hydratedRef.current = true;
      if (!loaded) {
        // Persist the freshly-built workspace so we don't keep re-migrating.
        saveWorkspaceDebounced(initial);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When excalidrawAPI becomes available, push the active scene into the editor.
  // This handles the case where the workspace's activeTab differs from what
  // the legacy localStorage (which Excalidraw uses for initialData) holds.
  useEffect(() => {
    if (!excalidrawAPI || !state || !state.activeTab) {
      return;
    }
    const active = state.scenes[state.activeTab];
    if (!active) {
      return;
    }
    // Only sync on initial hydration; subsequent switches go through switchTab.
    if (hydratedRef.current) {
      hydratedRef.current = false; // prevent re-run on every state change
      excalidrawAPI.updateScene({
        elements: active.elements,
        // Pass our small persisted subset only. updateScene merges partial
        // appState into the existing state, so openSidebar/zenMode/etc.
        // are preserved across scene switches.
        appState: active.appState as Pick<AppState, never>,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    }
  }, [excalidrawAPI, state]);

  // Reflect the active scene name in document.title so you can see what
  // you're editing from the browser tab / alt-tab / window list.
  const activeName = state?.activeTab
    ? state.scenes[state.activeTab]?.name
    : null;
  useEffect(() => {
    if (!activeName) {
      return;
    }
    const previous = document.title;
    document.title = `${activeName} — Excalidraw`;
    return () => {
      document.title = previous;
    };
  }, [activeName]);

  const commit = useCallback((next: WorkspaceState) => {
    stateRef.current = next;
    setState(next);
    saveWorkspaceDebounced(next);
  }, []);

  const captureFromEditor = useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState) => {
      const current = stateRef.current;
      if (!current || !current.activeTab) {
        return;
      }
      const active = current.scenes[current.activeTab];
      if (!active) {
        return;
      }
      // Mutate-and-save without setState — we don't need a render for content
      // updates. Tab/folder UI only depends on names/ids, not element content.
      const updated: WorkspaceScene = {
        ...active,
        elements,
        appState: pickAppState(appState),
        updatedAt: Date.now(),
      };
      const next: WorkspaceState = {
        ...current,
        scenes: { ...current.scenes, [updated.id]: updated },
      };
      stateRef.current = next;
      saveWorkspaceDebounced(next);
    },
    [],
  );

  const swapEditorTo = useCallback(
    (scene: WorkspaceScene) => {
      if (!excalidrawAPI) {
        return;
      }
      excalidrawAPI.updateScene({
        elements: scene.elements,
        // Partial merge — keeps openSidebar / zenMode / etc. across switches.
        appState: scene.appState as Pick<AppState, never>,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    },
    [excalidrawAPI],
  );

  const switchTab = useCallback(
    (id: SceneId) => {
      const current = stateRef.current;
      if (!current || current.activeTab === id) {
        return;
      }
      const scene = current.scenes[id];
      if (!scene) {
        return;
      }
      commit({ ...current, activeTab: id });
      swapEditorTo(scene);
    },
    [commit, swapEditorTo],
  );

  const openScene = useCallback(
    (id: SceneId) => {
      const current = stateRef.current;
      if (!current || !current.scenes[id]) {
        return;
      }
      const openTabs = current.openTabs.includes(id)
        ? current.openTabs
        : [...current.openTabs, id];
      const next: WorkspaceState = { ...current, openTabs, activeTab: id };
      commit(next);
      swapEditorTo(current.scenes[id]);
    },
    [commit, swapEditorTo],
  );

  const closeTab = useCallback(
    (id: SceneId) => {
      const current = stateRef.current;
      if (!current) {
        return;
      }
      const idx = current.openTabs.indexOf(id);
      if (idx === -1) {
        return;
      }
      const openTabs = current.openTabs.filter((t) => t !== id);
      let activeTab = current.activeTab;
      if (activeTab === id) {
        activeTab = openTabs[idx] ?? openTabs[idx - 1] ?? null;
      }
      // If we closed the last tab, materialize a fresh "Untitled".
      if (openTabs.length === 0) {
        const scene = makeEmptyScene();
        commit({
          ...current,
          scenes: { ...current.scenes, [scene.id]: scene },
          openTabs: [scene.id],
          activeTab: scene.id,
        });
        swapEditorTo(scene);
        return;
      }
      commit({ ...current, openTabs, activeTab });
      if (activeTab && activeTab !== current.activeTab) {
        const scene = current.scenes[activeTab];
        if (scene) {
          swapEditorTo(scene);
        }
      }
    },
    [commit, swapEditorTo],
  );

  const createScene = useCallback(
    (folderId: FolderId = null, name?: string): SceneId => {
      const current = stateRef.current;
      if (!current) {
        return "";
      }
      const scene = makeEmptyScene(folderId, name ?? "Untitled");
      const next: WorkspaceState = {
        ...current,
        scenes: { ...current.scenes, [scene.id]: scene },
        openTabs: [...current.openTabs, scene.id],
        activeTab: scene.id,
      };
      commit(next);
      swapEditorTo(scene);
      return scene.id;
    },
    [commit, swapEditorTo],
  );

  const renameScene = useCallback(
    (id: SceneId, name: string) => {
      const current = stateRef.current;
      if (!current) {
        return;
      }
      const scene = current.scenes[id];
      if (!scene) {
        return;
      }
      const trimmed = name.trim() || scene.name;
      commit({
        ...current,
        scenes: {
          ...current.scenes,
          [id]: { ...scene, name: trimmed, updatedAt: Date.now() },
        },
      });
    },
    [commit],
  );

  const deleteScene = useCallback(
    (id: SceneId) => {
      const current = stateRef.current;
      if (!current || !current.scenes[id]) {
        return;
      }
      const { [id]: _removed, ...rest } = current.scenes;
      const openTabs = current.openTabs.filter((t) => t !== id);
      let activeTab = current.activeTab;
      if (activeTab === id) {
        activeTab = openTabs[0] ?? null;
      }
      // Workspace must never be empty.
      if (Object.keys(rest).length === 0) {
        const scene = makeEmptyScene();
        commit({
          ...current,
          scenes: { [scene.id]: scene },
          openTabs: [scene.id],
          activeTab: scene.id,
        });
        swapEditorTo(scene);
        return;
      }
      // If no tabs remain open after delete, open the most-recently-updated scene.
      if (openTabs.length === 0) {
        const mostRecent = Object.values(rest).sort(
          (a, b) => b.updatedAt - a.updatedAt,
        )[0];
        commit({
          ...current,
          scenes: rest,
          openTabs: [mostRecent.id],
          activeTab: mostRecent.id,
        });
        swapEditorTo(mostRecent);
        return;
      }
      commit({ ...current, scenes: rest, openTabs, activeTab });
      if (activeTab && activeTab !== current.activeTab) {
        const scene = rest[activeTab];
        if (scene) {
          swapEditorTo(scene);
        }
      }
    },
    [commit, swapEditorTo],
  );

  const duplicateScene = useCallback(
    (id: SceneId): SceneId | null => {
      const current = stateRef.current;
      if (!current) {
        return null;
      }
      const src = current.scenes[id];
      if (!src) {
        return null;
      }
      const now = Date.now();
      const copy: WorkspaceScene = {
        ...src,
        id: uuid(),
        name: `${src.name} copy`,
        createdAt: now,
        updatedAt: now,
        // Deep-clone elements so future edits don't mutate the source.
        elements: JSON.parse(JSON.stringify(src.elements)),
        appState: { ...src.appState },
      };
      commit({
        ...current,
        scenes: { ...current.scenes, [copy.id]: copy },
        openTabs: [...current.openTabs, copy.id],
        activeTab: copy.id,
      });
      swapEditorTo(copy);
      return copy.id;
    },
    [commit, swapEditorTo],
  );

  const reorderTabs = useCallback(
    (sourceId: SceneId, targetId: SceneId | null) => {
      const current = stateRef.current;
      if (!current) {
        return;
      }
      const tabs = current.openTabs.filter((t) => t !== sourceId);
      if (tabs.length === current.openTabs.length) {
        return; // source not in openTabs
      }
      let insertAt = tabs.length;
      if (targetId !== null) {
        const idx = tabs.indexOf(targetId);
        if (idx !== -1) {
          insertAt = idx;
        }
      }
      tabs.splice(insertAt, 0, sourceId);
      commit({ ...current, openTabs: tabs });
    },
    [commit],
  );

  const moveScene = useCallback(
    (id: SceneId, folderId: FolderId) => {
      const current = stateRef.current;
      if (!current) {
        return;
      }
      const scene = current.scenes[id];
      if (!scene || scene.folderId === folderId) {
        return;
      }
      commit({
        ...current,
        scenes: {
          ...current.scenes,
          [id]: { ...scene, folderId, updatedAt: Date.now() },
        },
      });
    },
    [commit],
  );

  const createFolder = useCallback(
    (name: string): string => {
      const current = stateRef.current;
      if (!current) {
        return "";
      }
      const folder: WorkspaceFolder = {
        id: uuid(),
        name: name.trim() || "New folder",
        createdAt: Date.now(),
      };
      commit({
        ...current,
        folders: { ...current.folders, [folder.id]: folder },
      });
      return folder.id;
    },
    [commit],
  );

  const renameFolder = useCallback(
    (id: string, name: string) => {
      const current = stateRef.current;
      if (!current) {
        return;
      }
      const folder = current.folders[id];
      if (!folder) {
        return;
      }
      const trimmed = name.trim() || folder.name;
      commit({
        ...current,
        folders: { ...current.folders, [id]: { ...folder, name: trimmed } },
      });
    },
    [commit],
  );

  const deleteFolder = useCallback(
    (id: string) => {
      const current = stateRef.current;
      if (!current || !current.folders[id]) {
        return;
      }
      const { [id]: _removed, ...restFolders } = current.folders;
      // Move scenes in this folder back to root rather than deleting them.
      const scenes = Object.fromEntries(
        Object.entries(current.scenes).map(([sid, s]) => [
          sid,
          s.folderId === id ? { ...s, folderId: null } : s,
        ]),
      );
      commit({ ...current, folders: restFolders, scenes });
    },
    [commit],
  );

  if (!state) {
    return null;
  }

  const activeScene = state.activeTab ? state.scenes[state.activeTab] : null;

  return {
    state,
    activeScene: activeScene ?? null,
    captureFromEditor,
    switchTab,
    openScene,
    closeTab,
    createScene,
    renameScene,
    deleteScene,
    duplicateScene,
    moveScene,
    reorderTabs,
    createFolder,
    renameFolder,
    deleteFolder,
  };
};
