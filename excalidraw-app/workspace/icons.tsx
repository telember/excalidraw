// Workspace-specific icons. Inline SVG so we don't introduce a new icon
// import path or depend on internals of @excalidraw/excalidraw/icons.

const SIZE = 14;

const sharedProps = {
  width: SIZE,
  height: SIZE,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Stacked-folder glyph — visually distinct from the library "book" icon.
export const WorkspaceIcon = (
  <svg {...sharedProps} aria-hidden>
    <path d="M3 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v1H3V7z" />
    <path d="M3 9h16v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
  </svg>
);
