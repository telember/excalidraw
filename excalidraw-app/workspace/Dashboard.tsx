import { useMemo, useState } from "react";

import clsx from "clsx";

import { useThumbnails } from "./useThumbnails";

import type { Route } from "./useRoute";
import type { WorkspaceScene } from "./types";
import type { WorkspaceAPI } from "./useWorkspace";

type Props = {
  workspace: WorkspaceAPI;
  route: Route;
  navigate: (next: Route) => void;
};

const formatRelative = (ts?: number): string => {
  if (!ts) {
    return "—";
  }
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) {
    return `${sec}s ago`;
  }
  const min = Math.round(sec / 60);
  if (min < 60) {
    return `${min} minute${min === 1 ? "" : "s"} ago`;
  }
  const hr = Math.round(min / 60);
  if (hr < 24) {
    return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  }
  const day = Math.round(hr / 24);
  return `${day} day${day === 1 ? "" : "s"} ago`;
};

const SceneCard = ({
  scene,
  thumbUrl,
  onClick,
  onContextMenu,
}: {
  scene: WorkspaceScene;
  thumbUrl: string | null;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) => {
  return (
    <button
      type="button"
      className="excalidraw-dashboard-card"
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={scene.name}
    >
      <div className="excalidraw-dashboard-card-thumb">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" loading="lazy" />
        ) : (
          <div className="excalidraw-dashboard-card-placeholder">
            <span aria-hidden>📄</span>
          </div>
        )}
        <span className="excalidraw-dashboard-card-time">
          {formatRelative(scene.updatedAt)}
        </span>
      </div>
      <div className="excalidraw-dashboard-card-name">{scene.name}</div>
    </button>
  );
};

export const Dashboard = ({ workspace, route, navigate }: Props) => {
  const [filter, setFilter] = useState("");

  const allScenes = useMemo(
    () => Object.values(workspace.state.scenes),
    [workspace.state.scenes],
  );
  const activeScenes = useMemo(
    () => allScenes.filter((s) => !s.deletedAt),
    [allScenes],
  );
  const deletedScenes = useMemo(
    () => allScenes.filter((s) => s.deletedAt),
    [allScenes],
  );

  const filteredActive = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q
      ? activeScenes.filter((s) => s.name.toLowerCase().includes(q))
      : activeScenes;
  }, [activeScenes, filter]);

  const recentlyModified = useMemo(
    () =>
      [...filteredActive]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 10),
    [filteredActive],
  );
  const recentlyVisited = useMemo(
    () =>
      [...filteredActive]
        .filter((s) => s.lastVisitedAt)
        .sort((a, b) => (b.lastVisitedAt ?? 0) - (a.lastVisitedAt ?? 0))
        .slice(0, 10),
    [filteredActive],
  );

  // Generate thumbnails for whatever cards are visible in this route.
  const visibleScenes = useMemo(() => {
    if (route.kind === "trash") {
      return deletedScenes;
    }
    if (route.kind === "collection") {
      return activeScenes.filter((s) => s.folderId === route.id);
    }
    // Dashboard: union of the two recency lists.
    const seen = new Set<string>();
    const union: WorkspaceScene[] = [];
    for (const s of [...recentlyModified, ...recentlyVisited]) {
      if (seen.has(s.id)) {
        continue;
      }
      seen.add(s.id);
      union.push(s);
    }
    return union;
  }, [route, deletedScenes, activeScenes, recentlyModified, recentlyVisited]);
  const { thumbs } = useThumbnails(visibleScenes);

  const openScene = (id: string) => {
    workspace.openScene(id);
    navigate({ kind: "editor" });
  };

  const startDrawing = () => {
    workspace.createScene(null);
    navigate({ kind: "editor" });
  };

  const folders = useMemo(
    () =>
      Object.values(workspace.state.folders).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [workspace.state.folders],
  );

  const navItem = (
    label: string,
    icon: string,
    isActive: boolean,
    onClick: () => void,
  ) => (
    <button
      type="button"
      className={clsx("excalidraw-dashboard-nav-item", {
        "is-active": isActive,
      })}
      onClick={onClick}
    >
      <span className="excalidraw-dashboard-nav-icon" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );

  const isDashboard = route.kind === "dashboard";
  const isTrash = route.kind === "trash";
  const activeCollection = route.kind === "collection" ? route.id : null;

  let headerTitle = "Dashboard";
  if (isTrash) {
    headerTitle = "Trash";
  } else if (activeCollection) {
    headerTitle =
      workspace.state.folders[activeCollection]?.name ?? "Collection";
  }

  return (
    <div className="excalidraw-dashboard">
      <aside className="excalidraw-dashboard-sidebar">
        <div className="excalidraw-dashboard-search-wrap">
          <input
            type="search"
            className="excalidraw-dashboard-search"
            placeholder="Search scenes…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Search scenes"
          />
        </div>
        <nav className="excalidraw-dashboard-nav">
          {navItem("Dashboard", "🏠", isDashboard, () =>
            navigate({ kind: "dashboard" }),
          )}
          {navItem("Trash", "🗑", isTrash, () => navigate({ kind: "trash" }))}
          <div className="excalidraw-dashboard-nav-section">Collections</div>
          {folders.length === 0 && (
            <div className="excalidraw-dashboard-nav-empty">No folders yet</div>
          )}
          {folders.map((f) =>
            navItem(f.name, "📁", activeCollection === f.id, () =>
              navigate({ kind: "collection", id: f.id }),
            ),
          )}
        </nav>
      </aside>

      <main className="excalidraw-dashboard-main">
        <header className="excalidraw-dashboard-header">
          <h1>{headerTitle}</h1>
          <button
            type="button"
            className="excalidraw-dashboard-cta"
            onClick={startDrawing}
          >
            ✏ Start drawing
          </button>
        </header>

        {isDashboard && (
          <>
            <section className="excalidraw-dashboard-section">
              <h2>Recently modified</h2>
              {recentlyModified.length === 0 ? (
                <div className="excalidraw-dashboard-empty">No scenes yet</div>
              ) : (
                <div className="excalidraw-dashboard-grid">
                  {recentlyModified.map((s) => (
                    <SceneCard
                      key={s.id}
                      scene={s}
                      thumbUrl={thumbs[s.id]?.dataUrl ?? null}
                      onClick={() => openScene(s.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {recentlyVisited.length > 0 && (
              <section className="excalidraw-dashboard-section">
                <h2>Recently visited</h2>
                <div className="excalidraw-dashboard-grid">
                  {recentlyVisited.map((s) => (
                    <SceneCard
                      key={s.id}
                      scene={s}
                      thumbUrl={thumbs[s.id]?.dataUrl ?? null}
                      onClick={() => openScene(s.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {isTrash && (
          <section className="excalidraw-dashboard-section">
            <h2>Trashed scenes</h2>
            {deletedScenes.length === 0 ? (
              <div className="excalidraw-dashboard-empty">Trash is empty</div>
            ) : (
              <div className="excalidraw-dashboard-grid">
                {deletedScenes.map((s) => (
                  <div key={s.id} className="excalidraw-dashboard-card-wrap">
                    <SceneCard
                      scene={s}
                      thumbUrl={thumbs[s.id]?.dataUrl ?? null}
                      onClick={() => {
                        workspace.restoreScene(s.id);
                      }}
                    />
                    <div className="excalidraw-dashboard-card-actions">
                      <button
                        type="button"
                        onClick={() => workspace.restoreScene(s.id)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Permanently delete "${s.name}"? This cannot be undone.`,
                            )
                          ) {
                            workspace.purgeScene(s.id);
                          }
                        }}
                      >
                        Delete forever
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeCollection && (
          <section className="excalidraw-dashboard-section">
            <h2>Scenes in this collection</h2>
            {(() => {
              const sceneList = activeScenes
                .filter((s) => s.folderId === activeCollection)
                .filter(
                  (s) =>
                    !filter ||
                    s.name.toLowerCase().includes(filter.toLowerCase()),
                )
                .sort((a, b) => b.updatedAt - a.updatedAt);
              if (sceneList.length === 0) {
                return (
                  <div className="excalidraw-dashboard-empty">
                    No scenes in this collection
                  </div>
                );
              }
              return (
                <div className="excalidraw-dashboard-grid">
                  {sceneList.map((s) => (
                    <SceneCard
                      key={s.id}
                      scene={s}
                      thumbUrl={thumbs[s.id]?.dataUrl ?? null}
                      onClick={() => openScene(s.id)}
                    />
                  ))}
                </div>
              );
            })()}
          </section>
        )}
      </main>
    </div>
  );
};
