import { useEffect, useState, useCallback } from "react";

export type Route =
  | { kind: "dashboard" }
  | { kind: "editor" }
  | { kind: "trash" }
  | { kind: "collection"; id: string };

const parseHash = (hash: string): Route => {
  const h = hash.replace(/^#\/?/, "");
  if (h === "" || h === "dashboard") {
    return { kind: "dashboard" };
  }
  if (h === "editor") {
    return { kind: "editor" };
  }
  if (h === "trash") {
    return { kind: "trash" };
  }
  if (h.startsWith("collection/")) {
    return { kind: "collection", id: h.slice("collection/".length) };
  }
  // Unknown hash → dashboard.
  return { kind: "dashboard" };
};

const toHash = (route: Route): string => {
  switch (route.kind) {
    case "dashboard":
      return "#/";
    case "editor":
      return "#/editor";
    case "trash":
      return "#/trash";
    case "collection":
      return `#/collection/${route.id}`;
  }
};

/**
 * Hash-based router. Avoids the need for server-side rewrites — works on
 * any static host (including the nginx baked into Excalidraw's Dockerfile).
 *
 * The initial route is derived from the current location.hash. If none is
 * present we default to dashboard. Returns [route, navigate] where navigate
 * pushes a new hash, which the hashchange listener picks up.
 */
export const useRoute = (): [Route, (next: Route) => void] => {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(window.location.hash),
  );

  useEffect(() => {
    const handler = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((next: Route) => {
    const target = toHash(next);
    if (window.location.hash !== target) {
      window.location.hash = target;
    }
  }, []);

  return [route, navigate];
};
