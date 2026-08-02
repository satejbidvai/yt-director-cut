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
        background: rgba(255,255,255,0.2);
      }
      .${className} svg {
        width: 24px;
        height: 24px;
      }`;
  },
} as const;
