import { useEffect, useRef, useState } from "react";

import clsx from "clsx";

import type { SceneId } from "./types";
import type { WorkspaceAPI } from "./useWorkspace";

type Props = {
  workspace: WorkspaceAPI;
};

/** Inline editable tab name. Enter or blur commits; Escape cancels. */
const EditableTabName = ({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      className="excalidraw-workspace-tab-input"
      defaultValue={initial}
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

export const TabBar = ({ workspace }: Props) => {
  const { state, switchTab, closeTab, createScene, renameScene, reorderTabs } =
    workspace;
  const tabs = state.openTabs
    .map((id) => state.scenes[id])
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const [editingId, setEditingId] = useState<SceneId | null>(null);
  const [dragId, setDragId] = useState<SceneId | null>(null);

  return (
    <div className="excalidraw-workspace-tabbar" role="tablist">
      {tabs.map((scene) => {
        const isActive = state.activeTab === scene.id;
        const isEditing = editingId === scene.id;
        return (
          <div
            key={scene.id}
            role="tab"
            aria-selected={isActive}
            draggable={!isEditing}
            className={clsx("excalidraw-workspace-tab", {
              "is-active": isActive,
              "is-editing": isEditing,
              "is-drag-over": dragId && dragId !== scene.id,
            })}
            onClick={() => !isEditing && switchTab(scene.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingId(scene.id);
            }}
            onAuxClick={(e) => {
              // Middle-click closes — standard browser convention.
              if (e.button === 1) {
                e.preventDefault();
                closeTab(scene.id);
              }
            }}
            onDragStart={(e) => {
              setDragId(scene.id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", scene.id);
            }}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => {
              if (dragId && dragId !== scene.id) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(e) => {
              if (dragId && dragId !== scene.id) {
                e.preventDefault();
                reorderTabs(dragId, scene.id);
                setDragId(null);
              }
            }}
            title={scene.name}
          >
            {isEditing ? (
              <EditableTabName
                initial={scene.name}
                onCommit={(v) => {
                  renameScene(scene.id, v);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <span className="excalidraw-workspace-tab-name">
                {scene.name}
              </span>
            )}
            {!isEditing && (
              <button
                type="button"
                className="excalidraw-workspace-tab-close"
                aria-label={`Close ${scene.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(scene.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        className="excalidraw-workspace-tab-new"
        onClick={() => createScene(null)}
        title="New scene (Ctrl+T)"
        aria-label="New scene"
        onDragOver={(e) => {
          if (dragId) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={(e) => {
          if (dragId) {
            e.preventDefault();
            reorderTabs(dragId, null); // null = drop at the end
            setDragId(null);
          }
        }}
      >
        +
      </button>
    </div>
  );
};
