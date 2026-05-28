---
name: "YouTube: Director's Cut"
description: Sharp productivity features that disappear into YouTube's native surface.
colors:
  accent: "#e5484d"
  surface-light: "#ffffff"
  surface-dark: "#161616"
  text-light: "#0f0f0f"
  text-dark: "#e8e8e8"
  muted-light: "#6b6b6b"
  muted-dark: "#888888"
  border-light: "#0f0f0f0f"
  border-dark: "#ffffff0f"
  toggle-off-light: "#cccccc"
  toggle-off-dark: "#333333"
  logo-red: "#ff2d2d"
  logo-charcoal: "#121212"
  logo-light: "#e8e8e8"
typography:
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "11.5px"
    fontWeight: 400
    lineHeight: 1.35
  group-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  pill: "18px"
spacing:
  xs: "4px"
  sm: "10px"
  md: "16px"
  lg: "18px"
components:
  toggle-track:
    backgroundColor: "{colors.toggle-off-light}"
    rounded: "{rounded.md}"
    width: "36px"
    height: "20px"
  toggle-track-checked:
    backgroundColor: "{colors.accent}"
  toggle-compact:
    width: "30px"
    height: "16px"
    rounded: "8px"
  module-row:
    padding: "10px"
    rounded: "{rounded.sm}"
  module-row-hover:
    backgroundColor: "{colors.border-light}"
  pill-button:
    backgroundColor: "var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1))"
    textColor: "var(--yt-spec-text-primary, inherit)"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 16px"
---

# Design System

## 1. Overview

**Creative North Star: "The Pit Crew"**

Fast, practiced, in-and-out before you notice. Every feature exists to remove friction from YouTube, not to announce itself. The visual system has two distinct layers: the **popup** (an owned settings surface using system fonts and the extension's own tokens) and **YouTube-embedded UI** (injected elements that borrow YouTube's CSS custom properties and mimic native controls). These layers never cross; the popup never looks like YouTube, and injected UI never looks like the popup.

The extension ships opinionated defaults and minimal configuration. A toggle is the most complex control any module needs. If a feature can't render, it shows nothing rather than a broken state. The visual language follows YouTube's lead inside the page and stays restrained in the popup.

**Key Characteristics:**
- Two-layer visual system: popup tokens vs YouTube's `--yt-spec-*` variables
- System font stack throughout the popup; Roboto (YouTube's font) for injected UI
- Single accent color used sparingly: toggle on-state and the wordmark highlight
- Dark/light follows `prefers-color-scheme` automatically, no manual toggle
- Flat surfaces, no shadows, no elevation hierarchy

## 2. Colors

A restrained palette: tinted neutrals plus one accent at less than 10% surface area.

### Primary
- **Signal Red** (`#e5484d`): The sole accent. Used only for the active toggle track and the wordmark highlight in the popup header. Prohibited elsewhere in the popup. YouTube-embedded UI inherits YouTube's own accent handling.

### Neutral
- **Surface** (`#ffffff` light / `#161616` dark): Popup background. Not pure white or pure black; both are slightly warm.
- **Text** (`#0f0f0f` light / `#e8e8e8` dark): Primary text. Module names, header.
- **Muted** (`#6b6b6b` light / `#888888` dark): Secondary text. Module descriptions, group descriptions, empty state.
- **Border** (`rgba(0,0,0,0.06)` light / `rgba(255,255,255,0.06)` dark): Popup body border, row hover fill. Barely visible; separation through subtlety.
- **Toggle Off** (`#cccccc` light / `#333333` dark): Inactive toggle track.

### Logo Colors (brand assets only)
- **Slash Red** (`#ff2d2d`): Brighter, more saturated than Signal Red. Used only in the SVG logo and rasterized icons.
- **Charcoal** (`#121212`): Logo background.
- **Slash Light** (`#e8e8e8`): Second parallelogram in the logo.

### Named Rules
**The Borrowed Palette Rule.** YouTube-embedded UI never carries the extension's own colors into the page. It uses `var(--yt-spec-badge-chip-background)`, `var(--yt-spec-text-primary)`, and YouTube's native values exclusively. The extension's accent red stays in the popup.

## 3. Typography

**Popup Font:** System stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
**YouTube-Embedded Font:** `Roboto, Arial, sans-serif` (YouTube's own stack)

**Character:** Platform-native and invisible. The popup uses the OS system font so it feels like a first-party settings panel, not a themed overlay. Injected YouTube UI uses Roboto because YouTube uses Roboto.

### Hierarchy
- **Title** (600, 16px, 1.3, -0.01em tracking): Popup header wordmark only.
- **Body** (400, 13.5px, 1.3): Module names (ungrouped). The primary readable size.
- **Group Title** (600, 12.5px, 1.3, +0.01em tracking): Section headers within module groups. Weight carries the hierarchy, not size.
- **Compact Body** (400, 12.5px, 1.3): Module names within groups. Smaller to signal secondary tier.
- **Label** (400, 11.5px, 1.35): Module descriptions. Muted color reinforces the subordinate role.
- **Compact Label** (400, 11px, 1.35): Group descriptions and grouped module descriptions.
- **YouTube Pill** (500, 14px/36px line-height): Injected pill buttons on the watch page. Matches YouTube's native chip typography.

### Named Rules
**The Two-Stack Rule.** System font in the popup, Roboto in YouTube. Never mix them. If you're writing CSS for the popup, use the system stack. If you're composing inline styles for injected YouTube UI, use Roboto.

## 4. Elevation

Flat. No shadows anywhere in the system. The popup uses a 1px border (`var(--border)`) and a 12px border-radius for containment. Depth is conveyed through background tinting (row hover states use the border color as a fill) and opacity transitions (YouTube overlay icons fade from 0 to 1 on parent hover).

### Named Rules
**The No-Shadow Rule.** Shadows are prohibited. If a surface needs to feel elevated, use a subtle background tint or opacity shift. The extension lives inside YouTube, which has its own elevation system; adding shadows would clash.

## 5. Components

### Toggle Switch
- **Shape:** Rounded track (10px radius standard, 8px compact), circular knob
- **Standard:** 36x20 track, 16px knob. Used for ungrouped modules.
- **Compact:** 30x16 track, 12px knob. Used for grouped modules.
- **Off:** Track uses `--toggle-off`, knob is white (`#ffffff`)
- **On:** Track uses `--accent` (Signal Red), knob slides right via `translateX`
- **Transition:** 150ms ease-out on both track color and knob position
- **Interaction:** Hidden checkbox linked via `htmlFor`; the visible track and knob are purely presentational

### Module Row
- **Shape:** 8px border-radius, 10px internal padding
- **Hover:** Background fills with `var(--border)` (120ms ease transition)
- **Layout:** Flex row, label (name + optional description) on the left, toggle on the right
- **Two tiers:** Ungrouped rows are full-size; grouped rows indent 22px left and use compact typography and compact toggles

### Group Header
- **Layout:** Name (group-title weight and size) above description (compact label, muted)
- **Spacing:** 12px top padding, 4px bottom, creating visual separation from the modules above

### Pill Button (YouTube-embedded)
- **Shape:** 18px border-radius (full pill), 36px height
- **Colors:** `var(--yt-spec-badge-chip-background)` with hover variant. Text uses `var(--yt-spec-text-primary)`
- **Typography:** 500 weight, 14px, line-height matches height
- **Padding:** 16px horizontal

### Overlay Icon Button (YouTube-embedded)
- **Shape:** 36x36, fully circular (18px radius)
- **Default:** Transparent background, opacity 0
- **Reveal:** Opacity 1 on parent hover or self focus-visible (200ms transition)
- **Hover:** Background fills with YouTube's chip background token
- **Icon:** 20x20 SVG, inherits `--yt-spec-text-primary`

## 6. Do's and Don'ts

### Do:
- **Do** use YouTube's CSS custom properties (`--yt-spec-*`) for all injected UI. Hardcoded colors inside YouTube break across light/dark mode.
- **Do** use the system font stack for all popup text. Roboto in the popup would feel foreign on macOS.
- **Do** keep the accent red below 10% of any popup screen. Its rarity is what makes it signal.
- **Do** use opacity and background-tint transitions for state changes. They're the only motion vocabulary in this system.
- **Do** prefix injected element IDs with `ytdc-` to avoid collisions with YouTube's DOM.
- **Do** use `prefers-color-scheme` for popup theming. The user's OS choice is the decision.

### Don't:
- **Don't** bring the popup's accent color into YouTube's page. The extension's red and YouTube's red are different systems.
- **Don't** add shadows, gradients, or blur effects. The system is flat by doctrine, not by oversight.
- **Don't** use bounce or elastic easing. Transitions are `ease-out` or `ease`, 120-200ms.
- **Don't** build settings pages, option tabs, or preference panels. A toggle per module is the ceiling. (Anti-reference: bloated extensions with 50 settings.)
- **Don't** add gamification patterns: streaks, badges, progress bars, achievement unlocks.
- **Don't** use neon colors, playful animations, or emoji in UI copy.
- **Don't** style injected YouTube UI to look like the popup. The two layers are visually independent.
- **Don't** use `#000000` or `#ffffff` as backgrounds. Both the light and dark popup surfaces are slightly tinted.
