import { useEffect, useMemo, useRef, useState } from "react";

import clsx from "clsx";

import { ActivityRail } from "./ActivityRail";
import { useThumbnails } from "./useThumbnails";

import type { ActivityEvent } from "./ActivityStorage";
import type { Route } from "./useRoute";
import type { WorkspaceScene } from "./types";
import type { WorkspaceAPI } from "./useWorkspace";

type Props = {
  workspace: WorkspaceAPI;
  route: Route;
  navigate: (next: Route) => void;
  onOpenSearch: () => void;
  events: ActivityEvent[];
  /** Dark mode flag (driven from elsewhere — body class, prefers-color-scheme, …). */
  isDark: boolean;
  onToggleTheme: () => void;
};

const ME = {
  name: "you",
  initials: "Y",
  color: "oklch(0.78 0.12 230)",
};

const relativeShort = (ts: number): string => {
  const diff = Date.now() - ts;
  const s = Math.round(diff / 1000);
  if (s < 60) {
    return `${s}s ago`;
  }
  const m = Math.round(s / 60);
  if (m < 60) {
    return `${m} min ago`;
  }
  const h = Math.round(m / 60);
  if (h < 24) {
    return `${h} h ago`;
  }
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
};

const Avatar = ({ size = 28 }: { size?: number }) => (
  <span
    className="pl-avatar"
    style={{
      width: size,
      height: size,
      background: ME.color,
      fontSize: size * 0.42,
    }}
    aria-hidden
  >
    {ME.initials}
  </span>
);

// --- Stroke icons (inline; matches Plot's 24x24 / 1.6 stroke convention). ----
type IconProps = { size?: number };
const sw = 1.6;
const SvgWrap = ({
  size = 16,
  children,
}: {
  size?: number;
  children: React.ReactNode;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0 }}
    aria-hidden
  >
    {children}
  </svg>
);
const IcoDashboard = (p: IconProps) => (
  <SvgWrap {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
  </SvgWrap>
);
const IcoTrash = (p: IconProps) => (
  <SvgWrap {...p}>
    <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m1.5 0-.6 12.1a2 2 0 0 1-2 1.9H8.1a2 2 0 0 1-2-1.9L5.5 7" />
  </SvgWrap>
);
const IcoFolder = (p: IconProps) => (
  <SvgWrap {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </SvgWrap>
);
const IcoSearch = (p: IconProps) => (
  <SvgWrap {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m20 20-5.2-5.2" />
  </SvgWrap>
);
const IcoPlus = (p: IconProps) => (
  <SvgWrap {...p}>
    <path d="M12 5v14M5 12h14" />
  </SvgWrap>
);
const IcoChevronDown = (p: IconProps) => (
  <SvgWrap {...p}>
    <path d="m6 9 6 6 6-6" />
  </SvgWrap>
);
const IcoChevronRight = (p: IconProps) => (
  <SvgWrap {...p}>
    <path d="m9 18 6-6-6-6" />
  </SvgWrap>
);
const IcoInfo = (p: IconProps) => (
  <SvgWrap {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v.01M11 12h1v5h1" />
  </SvgWrap>
);
const IcoPen = (p: IconProps) => (
  <SvgWrap {...p}>
    <path d="M14.5 4.5l5 5L8 21l-5.5.5L3 16z" />
    <path d="m12.5 6.5 5 5" />
  </SvgWrap>
);
const IcoSun = (p: IconProps) => (
  <SvgWrap {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
  </SvgWrap>
);
const IcoMoon = (p: IconProps) => (
  <SvgWrap {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </SvgWrap>
);
const IcoDots = (p: IconProps) => (
  <SvgWrap {...p}>
    <circle cx="6" cy="12" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <circle cx="18" cy="12" r="1.4" fill="currentColor" />
  </SvgWrap>
);
const IcoCopy = (p: IconProps) => (
  <SvgWrap {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </SvgWrap>
);
const IcoOpen = (p: IconProps) => (
  <SvgWrap {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M19 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </SvgWrap>
);

// --- Sidebar inline-rename row ----------------------------------------------
const SidebarInlineRename = ({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <div className="pl-sb-nav-item is-small" style={{ gap: 8 }}>
      <span className="pl-sb-nav-icon">
        <IcoFolder size={14} />
      </span>
      <input
        ref={ref}
        defaultValue={initial}
        className="excalidraw-workspace-edit-input"
        style={{ flex: 1, height: 22 }}
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
        aria-label="Rename collection"
      />
    </div>
  );
};

// --- Card --------------------------------------------------------------------
const SceneCard = ({
  scene,
  thumbUrl,
  onOpen,
  workspace,
}: {
  scene: WorkspaceScene;
  thumbUrl: string | null;
  onOpen: () => void;
  workspace: WorkspaceAPI;
}) => {
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Whole card is clickable — clicking thumb, title, or anywhere else opens
  // the scene. Action buttons / menu still work via stopPropagation.
  const handleCardClick = (e: React.MouseEvent) => {
    // Ignore clicks that bubbled from the actions area or menu.
    if ((e.target as HTMLElement).closest(".pl-card-actions, .pl-card-menu")) {
      return;
    }
    onOpen();
  };
  return (
    <div
      className="pl-card"
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setMenuOpen(false);
      }}
      aria-label={`Open ${scene.name}`}
    >
      <div className="pl-card-thumb">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" loading="lazy" />
        ) : (
          <div className="pl-card-thumb-placeholder">📄</div>
        )}
        <div className="pl-card-ago">{relativeShort(scene.updatedAt)}</div>
      </div>
      <div
        className={clsx("pl-card-actions", { "is-on": hover })}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="pl-card-iconbtn"
          title="Open"
          onClick={onOpen}
        >
          <IcoOpen size={14} />
        </button>
        <button
          type="button"
          className="pl-card-iconbtn"
          title="Duplicate"
          onClick={() => workspace.duplicateScene(scene.id)}
        >
          <IcoCopy size={14} />
        </button>
        <button
          type="button"
          className="pl-card-iconbtn"
          title="More"
          onClick={() => setMenuOpen((m) => !m)}
        >
          <IcoDots size={14} />
        </button>
        {menuOpen && (
          <div className="pl-card-menu" onMouseLeave={() => setMenuOpen(false)}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                const next = window.prompt("Rename", scene.name);
                if (next != null) {
                  workspace.renameScene(scene.id, next);
                }
              }}
            >
              <IcoPen size={14} /> Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                workspace.duplicateScene(scene.id);
              }}
            >
              <IcoCopy size={14} /> Duplicate
            </button>
            <div className="pl-card-menu-sep" />
            <button
              type="button"
              className="is-danger"
              onClick={() => {
                setMenuOpen(false);
                workspace.deleteScene(scene.id);
              }}
            >
              <IcoTrash size={14} /> Delete
            </button>
          </div>
        )}
      </div>
      <div className="pl-card-foot">
        <div className="pl-card-title">{scene.name}</div>
        <div className="pl-card-by">
          <Avatar size={16} />
          <span>by {ME.name}</span>
        </div>
      </div>
    </div>
  );
};

const SectionHead = ({ title }: { title: string }) => (
  <div className="pl-sec-hd">
    <h2>{title}</h2>
  </div>
);

// --- Main component ----------------------------------------------------------
export const Dashboard = ({
  workspace,
  route,
  navigate,
  onOpenSearch,
  events,
  isDark,
  onToggleTheme,
}: Props) => {
  const [collOpen, setCollOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

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

  const recentlyModified = useMemo(
    () =>
      [...activeScenes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10),
    [activeScenes],
  );
  const recentlyVisited = useMemo(
    () =>
      [...activeScenes]
        .filter((s) => s.lastVisitedAt)
        .sort((a, b) => (b.lastVisitedAt ?? 0) - (a.lastVisitedAt ?? 0))
        .slice(0, 10),
    [activeScenes],
  );

  const visibleScenes = useMemo(() => {
    if (route.kind === "trash") {
      return deletedScenes;
    }
    if (route.kind === "collection") {
      return activeScenes.filter((s) => s.folderId === route.id);
    }
    const seen = new Set<string>();
    const out: WorkspaceScene[] = [];
    for (const s of [...recentlyModified, ...recentlyVisited]) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        out.push(s);
      }
    }
    return out;
  }, [route, deletedScenes, activeScenes, recentlyModified, recentlyVisited]);
  const { thumbs } = useThumbnails(visibleScenes);

  const folders = useMemo(
    () =>
      Object.values(workspace.state.folders).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [workspace.state.folders],
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

  const startDrawing = () => {
    workspace.createScene(null);
    navigate({ kind: "editor" });
  };
  const openScene = (id: string) => {
    workspace.openScene(id);
    navigate({ kind: "editor" });
  };

  const NavItem = ({
    icon,
    label,
    active,
    count,
    small,
    onClick,
    onDoubleClick,
    title,
  }: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    count?: number;
    small?: boolean;
    onClick: () => void;
    onDoubleClick?: () => void;
    title?: string;
  }) => (
    <button
      type="button"
      className={clsx("pl-sb-nav-item", {
        "is-active": active,
        "is-small": small,
      })}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={title}
    >
      <span className="pl-sb-nav-icon">{icon}</span>
      <span className="pl-sb-nav-label">{label}</span>
      {count != null && <span className="pl-sb-nav-count">{count}</span>}
    </button>
  );

  return (
    <div
      className="excalidraw-dashboard"
      data-theme={isDark ? "dark" : "light"}
    >
      {/* Sidebar */}
      <aside className="pl-sb">
        <button
          type="button"
          className="pl-sb-account"
          onClick={() => setAccountOpen((o) => !o)}
        >
          <Avatar size={28} />
          <span className="pl-sb-account-name">{ME.name}</span>
          <span
            className="pl-sb-account-chev"
            data-open={accountOpen ? "1" : "0"}
          >
            <IcoChevronDown size={14} />
          </span>
        </button>

        <button type="button" className="pl-sb-search" onClick={onOpenSearch}>
          <IcoSearch size={14} />
          <span>Quick search</span>
          <kbd>⌘P</kbd>
        </button>

        <nav className="pl-sb-nav">
          <NavItem
            icon={<IcoDashboard size={16} />}
            label="Dashboard"
            active={isDashboard}
            onClick={() => navigate({ kind: "dashboard" })}
          />
          <NavItem
            icon={<IcoTrash size={16} />}
            label="Trash"
            active={isTrash}
            count={deletedScenes.length || undefined}
            onClick={() => navigate({ kind: "trash" })}
          />
        </nav>

        <div className="pl-sb-section">
          <button
            type="button"
            className="pl-sb-section-hd"
            onClick={() => setCollOpen((o) => !o)}
          >
            <span
              className="pl-sb-section-chev"
              data-open={collOpen ? "1" : "0"}
            >
              <IcoChevronRight size={12} />
            </span>
            <span>Collections</span>
          </button>
          <button
            type="button"
            className="pl-sb-section-add"
            title="New collection"
            onClick={() => {
              const id = workspace.createFolder("New collection");
              if (id) {
                navigate({ kind: "collection", id });
                setEditingFolderId(id);
              }
            }}
          >
            <IcoPlus size={14} />
          </button>
        </div>

        {collOpen && (
          <div className="pl-sb-coll">
            {folders.length === 0 && (
              <div
                className="pl-sb-nav-item is-small"
                style={{
                  fontStyle: "italic",
                  color: "var(--pl-ink-4)",
                  cursor: "default",
                }}
              >
                No collections yet
              </div>
            )}
            {folders.map((f) => {
              const count = activeScenes.filter(
                (s) => s.folderId === f.id,
              ).length;
              if (editingFolderId === f.id) {
                return (
                  <SidebarInlineRename
                    key={f.id}
                    initial={f.name}
                    onCommit={(v) => {
                      workspace.renameFolder(f.id, v);
                      setEditingFolderId(null);
                    }}
                    onCancel={() => setEditingFolderId(null)}
                  />
                );
              }
              return (
                <NavItem
                  key={f.id}
                  icon={<IcoFolder size={14} />}
                  label={f.name}
                  small
                  count={count || undefined}
                  active={activeCollection === f.id}
                  onClick={() => navigate({ kind: "collection", id: f.id })}
                  onDoubleClick={() => setEditingFolderId(f.id)}
                  title="Double-click to rename"
                />
              );
            })}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div className="pl-sb-user">
          <Avatar size={28} />
          <div className="pl-sb-user-meta">
            <div className="pl-sb-user-name">{ME.name}</div>
            <div className="pl-sb-user-version">self-hosted</div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <main className="pl-main">
        <div className="pl-main-hd">
          <div className="pl-main-hd-left">
            <h1 className="pl-main-title">
              <span className="pl-main-title-ico">
                <IcoDashboard size={22} />
              </span>
              {headerTitle}
            </h1>
            <button type="button" className="pl-tip" onClick={onOpenSearch}>
              <span className="pl-tip-ico">
                <IcoInfo size={14} />
              </span>
              <span>
                Tip: Press <kbd>⌘P</kbd> to open Quick search.
              </span>
            </button>
          </div>
          <div className="pl-main-hd-right">
            <button
              type="button"
              className="pl-theme-btn"
              title={isDark ? "Switch to light" : "Switch to dark"}
              onClick={onToggleTheme}
            >
              {isDark ? <IcoSun size={16} /> : <IcoMoon size={16} />}
            </button>
            <button
              type="button"
              className="pl-btn-primary"
              onClick={startDrawing}
            >
              <IcoPen size={15} /> Start drawing
            </button>
          </div>
        </div>

        {isDashboard && (
          <>
            <section className="pl-sec">
              <SectionHead title="Recently modified by you" />
              <div className="pl-card-row">
                {recentlyModified.length === 0 ? (
                  <div className="pl-empty">
                    No scenes yet — hit Start drawing to begin.
                  </div>
                ) : (
                  recentlyModified.map((s) => (
                    <SceneCard
                      key={s.id}
                      scene={s}
                      thumbUrl={thumbs[s.id]?.dataUrl ?? null}
                      onOpen={() => openScene(s.id)}
                      workspace={workspace}
                    />
                  ))
                )}
              </div>
            </section>

            {recentlyVisited.length > 0 && (
              <section className="pl-sec">
                <SectionHead title="Recently visited by you" />
                <div className="pl-card-row">
                  {recentlyVisited.map((s) => (
                    <SceneCard
                      key={s.id}
                      scene={s}
                      thumbUrl={thumbs[s.id]?.dataUrl ?? null}
                      onOpen={() => openScene(s.id)}
                      workspace={workspace}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {isTrash && (
          <section className="pl-sec">
            <SectionHead title="Trashed scenes" />
            <div className="pl-card-row">
              {deletedScenes.length === 0 ? (
                <div className="pl-empty">Trash is empty.</div>
              ) : (
                deletedScenes.map((s) => (
                  <div key={s.id} style={{ display: "contents" }}>
                    <SceneCard
                      scene={s}
                      thumbUrl={thumbs[s.id]?.dataUrl ?? null}
                      onOpen={() => workspace.restoreScene(s.id)}
                      workspace={workspace}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeCollection && (
          <section className="pl-sec">
            <SectionHead title={`Scenes in this collection`} />
            <div className="pl-card-row">
              {(() => {
                const list = activeScenes
                  .filter((s) => s.folderId === activeCollection)
                  .sort((a, b) => b.updatedAt - a.updatedAt);
                if (list.length === 0) {
                  return (
                    <div className="pl-empty">No scenes in this collection</div>
                  );
                }
                return list.map((s) => (
                  <SceneCard
                    key={s.id}
                    scene={s}
                    thumbUrl={thumbs[s.id]?.dataUrl ?? null}
                    onOpen={() => openScene(s.id)}
                    workspace={workspace}
                  />
                ));
              })()}
            </div>
          </section>
        )}
      </main>

      {/* Right rail */}
      <ActivityRail events={events} avatar={<Avatar size={22} />} />
    </div>
  );
};
