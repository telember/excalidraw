import { useEffect, useMemo, useRef, useState } from "react";

import clsx from "clsx";

import type { WorkspaceScene } from "./types";
import type { WorkspaceAPI } from "./useWorkspace";

type Props = {
  open: boolean;
  onClose: () => void;
  workspace: WorkspaceAPI;
  onOpenScene: (id: string) => void;
  onStartDrawing: () => void;
};

export const QuickSearch = ({
  open,
  onClose,
  workspace,
  onOpenScene,
  onStartDrawing,
}: Props) => {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const matches = useMemo<WorkspaceScene[]>(() => {
    if (!open) {
      return [];
    }
    const q = query.trim().toLowerCase();
    const list = Object.values(workspace.state.scenes).filter(
      (s) => !s.deletedAt,
    );
    const filtered = q
      ? list.filter((s) => s.name.toLowerCase().includes(q))
      : list;
    return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20);
  }, [open, query, workspace.state.scenes]);

  // Keyboard: Esc / Arrows / Enter
  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const m = matches[activeIdx];
        if (m) {
          onOpenScene(m.id);
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, matches, activeIdx, onClose, onOpenScene]);

  if (!open) {
    return null;
  }

  return (
    <div className="pl-modal-bg" onClick={onClose}>
      <div className="pl-qs" onClick={(e) => e.stopPropagation()}>
        <div className="pl-qs-hd">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="10.5" cy="10.5" r="6" />
            <path d="m20 20-5.2-5.2" />
          </svg>
          <input
            ref={inputRef}
            className="pl-qs-input"
            placeholder="Search scenes, or jump to…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            aria-label="Quick search"
          />
          <kbd>esc</kbd>
        </div>

        <div className="pl-qs-body">
          <div className="pl-qs-label">
            {query ? "Scenes" : "Recent scenes"}
          </div>
          {matches.length === 0 ? (
            <div className="pl-qs-empty">No matches</div>
          ) : (
            matches.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={clsx("pl-qs-row", { "is-active": i === activeIdx })}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => {
                  onOpenScene(s.id);
                  onClose();
                }}
              >
                <span className="pl-qs-row-ico">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <path d="M14 3v6h6" />
                  </svg>
                </span>
                <span className="pl-qs-row-text">
                  <span>{s.name}</span>
                  <span className="pl-qs-row-sub">
                    Updated {new Date(s.updatedAt).toLocaleString()}
                  </span>
                </span>
              </button>
            ))
          )}

          {!query && (
            <>
              <div className="pl-qs-label">Actions</div>
              <button
                type="button"
                className="pl-qs-row"
                onClick={() => {
                  onStartDrawing();
                  onClose();
                }}
              >
                <span className="pl-qs-row-ico">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <span className="pl-qs-row-text">
                  <span>Start drawing</span>
                  <span className="pl-qs-row-sub">Create a new scene</span>
                </span>
              </button>
            </>
          )}
        </div>

        <div className="pl-qs-foot">
          <span>
            <kbd>↑↓</kbd> Navigate
          </span>
          <span>
            <kbd>↵</kbd> Open
          </span>
          <span>
            <kbd>esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
};
