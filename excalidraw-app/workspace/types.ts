import type { OrderedExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

export type SceneId = string;
/** null = root (no folder) */
export type FolderId = string | null;

/** Subset of AppState we persist per scene. Kept narrow on purpose. */
export type PersistedSceneAppState = Partial<
  Pick<
    AppState,
    | "viewBackgroundColor"
    | "gridSize"
    | "zoom"
    | "scrollX"
    | "scrollY"
    | "theme"
  >
>;

export type WorkspaceScene = {
  id: SceneId;
  name: string;
  folderId: FolderId;
  elements: readonly OrderedExcalidrawElement[];
  appState: PersistedSceneAppState;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceFolder = {
  id: string;
  name: string;
  createdAt: number;
};

export type WorkspaceState = {
  version: 1;
  scenes: Record<SceneId, WorkspaceScene>;
  folders: Record<string, WorkspaceFolder>;
  /** ordered, left-to-right */
  openTabs: SceneId[];
  activeTab: SceneId | null;
};

export const WORKSPACE_VERSION = 1;
