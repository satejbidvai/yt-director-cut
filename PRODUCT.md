# Product

## Register

product

## Users

People who live on desktop YouTube and already know what they want changed. They use it daily, notice when a button is in the wrong place, and do not want a settings maze.

## Product Purpose

YouTube: Director's Cut is a Chrome extension that adds small productivity fixes to desktop YouTube. Each module handles one annoyance: one-click Watch Later, feed cleanup, caption styling, fewer distractions. You know it worked when you stop thinking about the extension and YouTube just behaves the way you expected.

## Brand Personality

Direct, quiet, opinionated. Director's Cut picks defaults so you do not have to. It prefers a good default over a long options page, and silence over toast notifications.

## Anti-references

- Bloated browser extensions with 50 settings, tabbed option pages, and custom UI that fights the host page (Enhancer for YouTube, most "toolkit" extensions)
- Corporate/enterprise tools (Jira, Salesforce). Nothing here should feel like work software.
- Gamified productivity apps with streaks, badges, or progress tracking
- Flashy interfaces: neon colors, bouncy animations, emoji in copy

## Design Principles

1. **Disappear on success.** The best outcome is the user never thinking about the extension. Injected UI should read as YouTube.
2. **One decision, not ten.** A toggle is the most complex control a module should need.
3. **Respect the host.** YouTube-embedded UI uses YouTube's visual language. Director's Cut adds features; it does not reskin the site.
4. **Fail quietly.** If a selector breaks or a feature cannot render, show nothing. Log for developers, not users.
5. **Earn the code.** Each module ships only if the fix is worth maintaining.

## Accessibility & Inclusion

Do not break YouTube's existing accessibility. Keep keyboard access for injected UI, enough contrast in the popup, and respect `prefers-reduced-motion` on transitions Director's Cut adds.
