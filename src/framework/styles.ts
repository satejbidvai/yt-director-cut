/** YouTube CSS custom-property references with fallbacks. */
export const yt = {
  chipBg:      "var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1))",
  chipBgHover: "var(--yt-spec-badge-chip-background-hover, rgba(255,255,255,0.2))",
  textPrimary: "var(--yt-spec-text-primary, inherit)",
  fontFamily:  "Roboto, Arial, sans-serif",
} as const;

/** Spacing / sizing values shared across YouTube-embedded UI. */
export const pill = {
  height:       "40px",
  paddingX:     "16px",
  borderRadius: "20px",
  font:         `500 14px/40px ${yt.fontFamily}`,
} as const;

/** 40 × 40 round icon button that reveals on parent hover. */
export const overlayIcon = {
  css(className: string, hoverParent: string): string {
    return `
      .${className} {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        padding: 0;
        border: none;
        border-radius: 20px;
        background: transparent;
        color: var(--yt-spec-text-primary, rgb(241, 241, 241));
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
      }
      ${hoverParent}:hover .${className},
      .${className}:focus-visible {
        opacity: 1;
      }
      .${className}:hover {
        background: ${yt.chipBg};
      }
      .${className} svg {
        width: 24px;
        height: 24px;
      }`;
  },
} as const;
