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

/** 36 × 36 round icon button that reveals on parent hover. */
export const overlayIcon = {
  css(className: string, hoverParent: string): string {
    return `
      .${className} {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: none;
        border-radius: 18px;
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
        width: 20px;
        height: 20px;
      }`;
  },
} as const;
