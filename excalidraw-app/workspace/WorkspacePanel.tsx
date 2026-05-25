import { useEffect, useMemo, useRef, useState } from "react";

import clsx from "clsx";

import type { FolderId, WorkspaceScene } from "./types";
import type { WorkspaceAPI } from "./useWorkspace";

type Props = {
  workspace: WorkspaceAPI;
};

/** Uncontrolled inline editor. Enter/blur → commit; Escape → cancel. */
const EditableName = ({
  initial,
  onCommit,
  onCancel,
  ariaLabel,
}: {
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  ariaLabel?: string;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      className="excalidraw-workspace-edit-input"
      defaultValue={initial}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(ref.current?.value ?? initial);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
        e.stopPropagation();
      }}
      onBlur={() => onCommit(ref.current?.value ?? initial)}
    />
  );
};

const groupScenesByFolder = (
  scenes: WorkspaceScene[],
  folderIds: string[],
): Record<string, WorkspaceScene[]> => {
  const out: Record<string, WorkspaceScene[]> = { __root: [] };
  for (const id of folderIds) {
    out[id] = [];
  }
  for (const scene of scenes) {
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
  isEditing,
  beginEdit,
  endEdit,
  dragSourceId,
  onDragStartScene,
  onDragEndScene,
}: {
  workspace: WorkspaceAPI;
  scene: WorkspaceScene;
  folderChoices: { id: FolderId; name: string }[];
  isEditing: boolean;
  beginEdit: () => void;
  endEdit: () => void;
  dragSourceId: string | null;
  onDragStartScene: (id: string) => void;
  onDragEndScene: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = workspace.state.activeTab === scene.id;

  const onDelete = () => {
    setMenuOpen(false);
    if (window.confirm(`Delete scene "${scene.name}"?`)) {
      workspace.deleteScene(scene.id);
    }
  };

  return (
    <div
      className={clsx("excalidraw-workspace-row", {
        "is-active": isActive,
        "is-editing": isEditing,
        "is-dragging": dragSourceId === scene.id,
      })}
      draggable={!isEditing}
      onDragStart={(e) => {
        onDragStartScene(scene.id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-excalidraw-scene", scene.id);
      }}
      onDragEnd={onDragEndScene}
    >
      {isEditing ? (
        <div className="excalidraw-workspace-row-edit">
          <span className="excalidraw-workspace-row-icon" aria-hidden>
            📄
          </span>
          <EditableName
            initial={scene.name}
            ariaLabel="Rename scene"
            onCommit={(v) => {
              workspace.renameScene(scene.id, v);
              endEdit();
            }}
            onCancel={endEdit}
          />
        </div>
      ) : (
        <button
          type="button"
          className="excalidraw-workspace-row-label"
          onClick={() => workspace.openScene(scene.id)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            beginEdit();
          }}
          title={scene.name}
        >
          <span className="excalidraw-workspace-row-icon" aria-hidden>
            📄
          </span>
          <span className="excalidraw-workspace-row-name">{scene.name}</span>
        </button>
      )}
      {!isEditing && (
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
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  beginEdit();
                }}
              >
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  workspace.duplicateScene(scene.id);
                }}
              >
                Duplicate
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
      )}
    </div>
  );
};

const FolderHeader = ({
  workspace,
  folderId,
  name,
  collapsed,
  onToggle,
  isEditing,
  beginEdit,
  endEdit,
  isDropTarget,
  onDragOverFolder,
  onDropOnFolder,
}: {
  workspace: WorkspaceAPI;
  folderId: string | null;
  name: string;
  collapsed: boolean;
  onToggle: () => void;
  isEditing: boolean;
  beginEdit: () => void;
  endEdit: () => void;
  isDropTarget: boolean;
  onDragOverFolder: (e: React.DragEvent) => void;
  onDropOnFolder: (e: React.DragEvent) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={clsx("excalidraw-workspace-folder-header", {
        "is-drop-target": isDropTarget,
      })}
      onDragOver={onDragOverFolder}
      onDrop={onDropOnFolder}
    >
      <button
        type="button"
        className="excalidraw-workspace-folder-toggle"
        onClick={onToggle}
        onDoubleClick={(e) => {
          if (folderId == null) {
            return;
          } // Root not renamable
          e.stopPropagation();
          beginEdit();
        }}
        aria-expanded={!collapsed}
      >
        <span aria-hidden>{collapsed ? "▸" : "▾"}</span>
        <span className="excalidraw-workspace-folder-icon" aria-hidden>
          {folderId == null ? "🏠" : "📁"}
        </span>
        {isEditing && folderId != null ? (
          <EditableName
            initial={name}
            ariaLabel="Rename folder"
            onCommit={(v) => {
              workspace.renameFolder(folderId, v);
              endEdit();
            }}
            onCancel={endEdit}
          />
        ) : (
          <span className="excalidraw-workspace-folder-name">{name}</span>
        )}
      </button>
      {folderId != null && !isEditing && (
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
                  beginEdit();
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<
    FolderId | "none"
  >("none");

  const folderChoices: { id: FolderId; name: string }[] = useMemo(
    () => [
      { id: null, name: "Root" },
      ...Object.values(workspace.state.folders)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => ({ id: f.id as FolderId, name: f.name })),
    ],
    [workspace.state.folders],
  );

  const orderedFolders = useMemo(
    () =>
      Object.values(workspace.state.folders).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [workspace.state.folders],
  );

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const allScenes = Object.values(workspace.state.scenes);
    const matching = q
      ? allScenes.filter((s) => s.name.toLowerCase().includes(q))
      : allScenes;
    return groupScenesByFolder(
      matching,
      orderedFolders.map((f) => f.id),
    );
  }, [workspace.state.scenes, orderedFolders, filter]);

  const toggle = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const onDragStartScene = (id: string) => setDragSourceId(id);
  const onDragEndScene = () => {
    setDragSourceId(null);
    setDropTargetFolderId("none");
  };

  const makeFolderDropHandlers = (folderId: FolderId) => ({
    onDragOverFolder: (e: React.DragEvent) => {
      if (!dragSourceId) {
        return;
      }
      const src = workspace.state.scenes[dragSourceId];
      if (!src || src.folderId === folderId) {
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropTargetFolderId(folderId);
    },
    onDropOnFolder: (e: React.DragEvent) => {
      if (!dragSourceId) {
        return;
      }
      e.preventDefault();
      workspace.moveScene(dragSourceId, folderId);
      setDragSourceId(null);
      setDropTargetFolderId("none");
    },
  });

  const rootHandlers = makeFolderDropHandlers(null);

  return (
    <div className="excalidraw-workspace-panel">
      <div className="excalidraw-workspace-toolbar">
        <button
          type="button"
          onClick={() => workspace.createScene(null)}
          title="New scene (Alt+N)"
        >
          + Scene
        </button>
        <button
          type="button"
          onClick={() => {
            const id = workspace.createFolder("New folder");
            if (id) {
              setEditingId(id);
            }
          }}
          title="New folder"
        >
          + Folder
        </button>
      </div>

      <input
        type="search"
        className="excalidraw-workspace-search"
        placeholder="Search scenes…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Search scenes"
      />

      <div className="excalidraw-workspace-tree">
        <FolderHeader
          workspace={workspace}
          folderId={null}
          name="Root"
          collapsed={!!collapsed.__root}
          onToggle={() => toggle("__root")}
          isEditing={false}
          beginEdit={() => {}}
          endEdit={() => {}}
          isDropTarget={dropTargetFolderId === null}
          {...rootHandlers}
        />
        {!collapsed.__root && (
          <div className="excalidraw-workspace-folder-body" {...rootHandlers}>
            {(grouped.__root ?? []).length === 0 ? (
              <div className="excalidraw-workspace-empty">
                {filter ? "No matches" : "No scenes"}
              </div>
            ) : (
              (grouped.__root ?? []).map((scene) => (
                <SceneRow
                  key={scene.id}
                  workspace={workspace}
                  scene={scene}
                  folderChoices={folderChoices}
                  isEditing={editingId === scene.id}
                  beginEdit={() => setEditingId(scene.id)}
                  endEdit={() => setEditingId(null)}
                  dragSourceId={dragSourceId}
                  onDragStartScene={onDragStartScene}
                  onDragEndScene={onDragEndScene}
                />
              ))
            )}
          </div>
        )}

        {orderedFolders.map((folder) => {
          const handlers = makeFolderDropHandlers(folder.id);
          return (
            <div key={folder.id}>
              <FolderHeader
                workspace={workspace}
                folderId={folder.id}
                name={folder.name}
                collapsed={!!collapsed[folder.id]}
                onToggle={() => toggle(folder.id)}
                isEditing={editingId === folder.id}
                beginEdit={() => setEditingId(folder.id)}
                endEdit={() => setEditingId(null)}
                isDropTarget={dropTargetFolderId === folder.id}
                {...handlers}
              />
              {!collapsed[folder.id] && (
                <div className="excalidraw-workspace-folder-body" {...handlers}>
                  {(grouped[folder.id] ?? []).length === 0 ? (
                    <div className="excalidraw-workspace-empty">
                      {filter ? "No matches" : "Empty"}
                    </div>
                  ) : (
                    (grouped[folder.id] ?? []).map((scene) => (
                      <SceneRow
                        key={scene.id}
                        workspace={workspace}
                        scene={scene}
                        folderChoices={folderChoices}
                        isEditing={editingId === scene.id}
                        beginEdit={() => setEditingId(scene.id)}
                        endEdit={() => setEditingId(null)}
                        dragSourceId={dragSourceId}
                        onDragStartScene={onDragStartScene}
                        onDragEndScene={onDragEndScene}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
