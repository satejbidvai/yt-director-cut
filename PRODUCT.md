# Product

## Register

product

## Users

Power users who watch a lot of YouTube on desktop and want precise control over their experience. They know what they want, don't need hand-holding, and notice when something is off. They use YouTube daily, have strong opinions about the default UI, and value tools that get out of the way once configured.

## Product Purpose

Redline is a Chrome extension that adds small, sharp productivity features to desktop YouTube. Each module solves one specific friction: one-click Watch Later, feed cleanup, caption styling, distraction removal. Success is the user forgetting the extension exists because YouTube just works the way they expected it to.

## Brand Personality

Sharp, invisible, opinionated. Redline makes decisions so the user doesn't have to. It favors defaults over configuration, precision over flexibility, and silence over feedback. The name and logo (two overlapping slashes, red on charcoal) signal surgical cuts to YouTube's interface.

## Anti-references

- Bloated browser extensions with 50 settings, tabbed option pages, and garish custom UI (Enhancer for YouTube, most "toolkit" extensions)
- Corporate/enterprise tools (Jira, Salesforce); nothing should feel like work software
- Gamified productivity apps with streaks, badges, or progress tracking
- Flashy/playful interfaces (neon colors, bouncy animations, emoji-heavy copy)

## Design Principles

1. **Disappear on success.** The best outcome is the user never thinks about the extension. Features blend into YouTube's native surface.
2. **One decision, not ten.** Opinionated defaults over configurable everything. A toggle is the most complex control a module should need.
3. **Respect the host.** YouTube-embedded UI inherits YouTube's visual language. Redline adds; it doesn't theme.
4. **Fail quietly.** If a selector breaks or a feature can't render, show nothing rather than a broken state. Log for developers, not for users.
5. **Small surface, deep conviction.** Each module is worth the code weight or it doesn't ship.

## Accessibility & Inclusion

Basic: don't break YouTube's existing accessibility. Maintain keyboard navigability for injected UI, ensure sufficient contrast for popup controls, respect `prefers-reduced-motion` where Redline adds transitions.
