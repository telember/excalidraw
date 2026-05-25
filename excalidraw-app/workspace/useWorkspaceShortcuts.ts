import { useEffect, useRef } from "react";

import type { WorkspaceAPI } from "./useWorkspace";

/**
 * Document-level keyboard shortcuts for the workspace.
 *
 *   Alt+N      — new scene
 *   Alt+W      — close active tab
 *   Alt+1..9   — switch to tab N
 *
 * We use Alt-combinations because Ctrl+T / Ctrl+W are protected browser
 * shortcuts that JS can't reliably intercept. Ignored when focus is in
 * a text input / textarea / contentEditable element so we don't break
 * typing inside the Excalidraw text editor.
 */
export const useWorkspaceShortcuts = (workspace: WorkspaceAPI | null): void => {
  const ref = useRef(workspace);
  useEffect(() => {
    ref.current = workspace;
  }, [workspace]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ws = ref.current;
      if (!ws) {
        return;
      }
      // Require Alt, no other modifiers.
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        return;
      }
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.code === "KeyN") {
        e.preventDefault();
        ws.createScene(null);
      } else if (e.code === "KeyW") {
        if (ws.state.activeTab) {
          e.preventDefault();
          ws.closeTab(ws.state.activeTab);
        }
      } else if (/^Digit[1-9]$/.test(e.code)) {
        const n = parseInt(e.code.slice(5), 10) - 1;
        const target = ws.state.openTabs[n];
        if (target) {
          e.preventDefault();
          ws.switchTab(target);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
};
