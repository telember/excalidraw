import clsx from "clsx";

import type { WorkspaceAPI } from "./useWorkspace";

type Props = {
  workspace: WorkspaceAPI;
};

export const TabBar = ({ workspace }: Props) => {
  const { state, switchTab, closeTab, createScene } = workspace;
  const tabs = state.openTabs
    .map((id) => state.scenes[id])
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <div className="excalidraw-workspace-tabbar" role="tablist">
      {tabs.map((scene) => (
        <div
          key={scene.id}
          role="tab"
          aria-selected={state.activeTab === scene.id}
          className={clsx("excalidraw-workspace-tab", {
            "is-active": state.activeTab === scene.id,
          })}
          onClick={() => switchTab(scene.id)}
          title={scene.name}
        >
          <span className="excalidraw-workspace-tab-name">{scene.name}</span>
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
        </div>
      ))}
      <button
        type="button"
        className="excalidraw-workspace-tab-new"
        onClick={() => createScene(null)}
        title="New scene"
        aria-label="New scene"
      >
        +
      </button>
    </div>
  );
};
