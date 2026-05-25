import { useMemo, useState } from "react";

import clsx from "clsx";

import type { FolderId, WorkspaceScene } from "./types";
import type { WorkspaceAPI } from "./useWorkspace";

type Props = {
  workspace: WorkspaceAPI;
};

const groupScenesByFolder = (
  workspace: WorkspaceAPI,
): Record<string, WorkspaceScene[]> => {
  const out: Record<string, WorkspaceScene[]> = { __root: [] };
  for (const folder of Object.values(workspace.state.folders)) {
    out[folder.id] = [];
  }
  for (const scene of Object.values(workspace.state.scenes)) {
    const key = scene.folderId ?? "__root";
    (out[key] ?? (out[key] = [])).push(scene);
  }
  for (const list of Object.values(out)) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return out;
};

const SceneRow = ({
  workspace,
  scene,
  folderChoices,
}: {
  workspace: WorkspaceAPI;
  scene: WorkspaceScene;
  folderChoices: { id: FolderId; name: string }[];
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = workspace.state.activeTab === scene.id;

  const onRename = () => {
    setMenuOpen(false);
    const next = window.prompt("Rename scene", scene.name);
    if (next != null) {
      workspace.renameScene(scene.id, next);
    }
  };

  const onDelete = () => {
    setMenuOpen(false);
    if (window.confirm(`Delete scene "${scene.name}"?`)) {
      workspace.deleteScene(scene.id);
    }
  };

  return (
    <div
      className={clsx("excalidraw-workspace-row", { "is-active": isActive })}
    >
      <button
        type="button"
        className="excalidraw-workspace-row-label"
        onClick={() => workspace.openScene(scene.id)}
        title={scene.name}
      >
        <span className="excalidraw-workspace-row-icon" aria-hidden>
          📄
        </span>
        <span className="excalidraw-workspace-row-name">{scene.name}</span>
      </button>
      <div className="excalidraw-workspace-row-menu-wrap">
        <button
          type="button"
          className="excalidraw-workspace-row-menu-btn"
          aria-label="Actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ⋯
        </button>
        {menuOpen && (
          <div
            className="excalidraw-workspace-menu"
            role="menu"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button type="button" role="menuitem" onClick={onRename}>
              Rename
            </button>
            <div className="excalidraw-workspace-menu-sep">Move to…</div>
            {folderChoices.map((f) => (
              <button
                key={f.id ?? "__root"}
                type="button"
                role="menuitem"
                disabled={scene.folderId === f.id}
                onClick={() => {
                  workspace.moveScene(scene.id, f.id);
                  setMenuOpen(false);
                }}
              >
                {f.name}
              </button>
            ))}
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const FolderHeader = ({
  workspace,
  folderId,
  name,
  collapsed,
  onToggle,
}: {
  workspace: WorkspaceAPI;
  folderId: string | null;
  name: string;
  collapsed: boolean;
  onToggle: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="excalidraw-workspace-folder-header">
      <button
        type="button"
        className="excalidraw-workspace-folder-toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <span aria-hidden>{collapsed ? "▸" : "▾"}</span>
        <span className="excalidraw-workspace-folder-icon" aria-hidden>
          {folderId == null ? "🏠" : "📁"}
        </span>
        <span className="excalidraw-workspace-folder-name">{name}</span>
      </button>
      {folderId != null && (
        <div className="excalidraw-workspace-row-menu-wrap">
          <button
            type="button"
            className="excalidraw-workspace-row-menu-btn"
            aria-label="Folder actions"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              className="excalidraw-workspace-menu"
              role="menu"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  const next = window.prompt("Rename folder", name);
                  if (next != null) {
                    workspace.renameFolder(folderId, next);
                  }
                }}
              >
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  setMenuOpen(false);
                  if (
                    window.confirm(
                      `Delete folder "${name}"? Scenes inside will move to Root.`,
                    )
                  ) {
                    workspace.deleteFolder(folderId);
                  }
                }}
              >
                Delete folder
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const WorkspacePanel = ({ workspace }: Props) => {
  const grouped = useMemo(() => groupScenesByFolder(workspace), [workspace]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const folderChoices: { id: FolderId; name: string }[] = [
    { id: null, name: "Root" },
    ...Object.values(workspace.state.folders)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => ({ id: f.id as FolderId, name: f.name })),
  ];

  const orderedFolders = Object.values(workspace.state.folders).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const toggle = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="excalidraw-workspace-panel">
      <div className="excalidraw-workspace-toolbar">
        <button
          type="button"
          onClick={() => workspace.createScene(null)}
          title="New scene"
        >
          + Scene
        </button>
        <button
          type="button"
          onClick={() => {
            const name = window.prompt("New folder name", "New folder");
            if (name != null && name.trim()) {
              workspace.createFolder(name);
            }
          }}
          title="New folder"
        >
          + Folder
        </button>
      </div>

      <div className="excalidraw-workspace-tree">
        <FolderHeader
          workspace={workspace}
          folderId={null}
          name="Root"
          collapsed={!!collapsed.__root}
          onToggle={() => toggle("__root")}
        />
        {!collapsed.__root && (
          <div className="excalidraw-workspace-folder-body">
            {(grouped.__root ?? []).length === 0 ? (
              <div className="excalidraw-workspace-empty">No scenes</div>
            ) : (
              (grouped.__root ?? []).map((scene) => (
                <SceneRow
                  key={scene.id}
                  workspace={workspace}
                  scene={scene}
                  folderChoices={folderChoices}
                />
              ))
            )}
          </div>
        )}

        {orderedFolders.map((folder) => (
          <div key={folder.id}>
            <FolderHeader
              workspace={workspace}
              folderId={folder.id}
              name={folder.name}
              collapsed={!!collapsed[folder.id]}
              onToggle={() => toggle(folder.id)}
            />
            {!collapsed[folder.id] && (
              <div className="excalidraw-workspace-folder-body">
                {(grouped[folder.id] ?? []).length === 0 ? (
                  <div className="excalidraw-workspace-empty">Empty</div>
                ) : (
                  (grouped[folder.id] ?? []).map((scene: WorkspaceScene) => (
                    <SceneRow
                      key={scene.id}
                      workspace={workspace}
                      scene={scene}
                      folderChoices={folderChoices}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
