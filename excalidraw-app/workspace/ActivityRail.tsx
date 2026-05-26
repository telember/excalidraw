import { useMemo } from "react";

import type { ActivityEvent } from "./ActivityStorage";

type Props = {
  events: ActivityEvent[];
  /** Avatar element to render in each row. Caller controls the look. */
  avatar: React.ReactNode;
};

const dayKey = (ts: number): string => {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
};
const dayLabel = (key: string): string => {
  const d = new Date(key);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (today.getTime() - d.getTime()) / (24 * 3600 * 1000);
  if (diff === 0) {
    return "Today";
  }
  if (diff === 1) {
    return "Yesterday";
  }
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
const relative = (ts: number): string => {
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
const verb = (kind: ActivityEvent["kind"]): string => {
  switch (kind) {
    case "created":
      return "Created";
    case "renamed":
      return "Renamed";
    case "edited":
      return "Edited";
    case "deleted":
      return "Deleted";
    case "restored":
      return "Restored";
    case "duplicated":
      return "Duplicated";
    case "moved":
      return "Moved";
  }
};

export const ActivityRail = ({ events, avatar }: Props) => {
  const groups = useMemo(() => {
    const byDay = new Map<string, ActivityEvent[]>();
    for (const ev of events) {
      const k = dayKey(ev.ts);
      if (!byDay.has(k)) {
        byDay.set(k, []);
      }
      byDay.get(k)!.push(ev);
    }
    return Array.from(byDay.entries()); // already chronological because events is newest-first
  }, [events]);

  return (
    <aside className="pl-ra">
      <div className="pl-ra-hd">
        <h3>Recent Activity</h3>
      </div>
      <div className="pl-ra-list">
        {groups.length === 0 ? (
          <div className="pl-ra-empty">
            No activity yet. Edits and renames will show up here.
          </div>
        ) : (
          groups.map(([k, items]) => (
            <div key={k} className="pl-ra-group">
              <div className="pl-ra-day">
                <span />
                <em>{dayLabel(k)}</em>
                <span />
              </div>
              {items.map((ev) => (
                <div key={ev.id} className="pl-ra-item">
                  <div className="pl-ra-item-hd">
                    {avatar}
                    <div className="pl-ra-item-text">
                      <span className="pl-ra-verb">{verb(ev.kind)}</span>{" "}
                      <span className="pl-ra-target">“{ev.sceneName}”</span>
                      {ev.kind === "renamed" && ev.oldName && (
                        <>
                          {" from "}
                          <span className="pl-ra-target">“{ev.oldName}”</span>
                        </>
                      )}
                      <div className="pl-ra-meta">
                        <span>you</span>
                        <span className="pl-ra-dot">·</span>
                        <span>{relative(ev.ts)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
