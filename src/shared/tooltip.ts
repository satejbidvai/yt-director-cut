const GAP_PX = 16;
const CLOSING_CLASS = 'ytPopoverComponentHostClosing';

/**
 * Show a tooltip below `trigger` on hover. YouTube's classes supply the style
 * and the fade animations. YouTube's own tooltip gets its text from page-world
 * JS, which a content script cannot set.
 */
export function attachTooltip(trigger: HTMLElement, text: string): void {
  const tip = document.createElement('div');
  tip.className = 'ytPopoverComponentHost ytTooltipContainerDefaultTooltipContent';
  tip.popover = 'manual';
  tip.setAttribute('aria-hidden', 'true');
  tip.textContent = text;
  trigger.after(tip);

  trigger.addEventListener('mouseenter', () => {
    tip.classList.remove(CLOSING_CLASS);
    if (!tip.matches(':popover-open')) tip.showPopover();
    const rect = trigger.getBoundingClientRect();
    const top = Math.round(rect.bottom + window.scrollY + GAP_PX);
    const left = Math.round(rect.left + window.scrollX + (rect.width - tip.offsetWidth) / 2);
    tip.style.inset = `${top}px auto auto ${left}px`;
  });

  trigger.addEventListener('mouseleave', () => {
    if (tip.matches(':popover-open')) tip.classList.add(CLOSING_CLASS);
  });

  tip.addEventListener('animationend', () => {
    if (!tip.classList.contains(CLOSING_CLASS)) return;
    tip.classList.remove(CLOSING_CLASS);
    tip.hidePopover();
  });
}
