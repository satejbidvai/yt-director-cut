/** YouTube CSS custom-property references with fallbacks. */
export const yt = {
  chipBg:      "var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1))",
  chipBgHover: "var(--yt-spec-badge-chip-background-hover, rgba(255,255,255,0.2))",
  textPrimary: "var(--yt-spec-text-primary, inherit)",
  fontFamily:  "Roboto, Arial, sans-serif",
} as const;

/** Spacing / sizing values shared across YouTube-embedded UI. */
export const pill = {
  height:       "36px",
  paddingX:     "16px",
  borderRadius: "18px",
  font:         `500 14px/36px ${yt.fontFamily}`,
} as const;
