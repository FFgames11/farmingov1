# Project Guidelines & Architectural Standards

This document outlines the established patterns and architectural decisions for the **Cat Farm** project. It should be updated whenever new systems are implemented or existing ones are significantly modified.

## 1. Asset Management & Optimization
- **Caching**: Use a Service Worker (`sw.js`) to pre-cache core media, scripts, and styles.
- **Strategy**: Implement a "Cache First" strategy for static assets to ensure fast subsequent loads.
- **Versioning**: Update the cache version in `sw.js` (e.g., `farm-v1` to `farm-v2`) when major assets or scripts are changed.

## 2. Game State & Logic Gating
- **Screen Awareness**: Farm-specific logic (spawning, eating, timers) MUST be gated by `activeScreen === "farm"`.
- **Timer Management**: Spawning timers (`nextPetSpawnAt`, `nextBossSpawnAt`) should be paused (incremented) when the user is not on the farm or is at the login screen (`gameUIHidden`).
- **Input Gating**: Interactive elements in the farm layer should be disabled or gated when modals are open or when in "visit mode".

## 3. Data Structures & Restoration
- **Animal Data**: The `BATTLE_ANIMALS` object in `arenaData.js` is the source of truth for all combat-related stats and scaling.
- **Stat Scaling**: Use the `battleStats(animalId, level)` function to calculate dynamic stats based on animal level.
- **UIDs**: All player-owned animals must have a `uid` for selection and tracking across different screens (Ranch, Arena, Boss Fight).

## 4. UI & Aesthetics
- **Responsive Scaling**: The application uses a pixel-perfect scaling script in `index.html` (552x911 design resolution). Maintain this aspect ratio for all full-screen overlays.
- **Interactive Feedback**: Use `showToast` for minor notifications and `showMessage`/`openModal` for critical gameplay events.
- **Pointer Events**: Ensure interactive layers (like `.zooPet`) have `pointer-events: auto;` and are not accidentally blocked by invisible overlays.

## 6. Dynamic Status Bars (UI)
- **Implementation**: Replace static `statbar.png` with HTML structures (`.statBarContainer` > `.statBarFill`).
- **Animation**: All new status bars must use the `.statBarGrow` class to trigger the `statBarGrow` keyframe animation on open.
- **Scaling**: Standardize stat bars to scale up to a max value of 20 (represented as 100% width).

## 5. Development Workflow
- **State Persistence**: Always call `saveState()` after modifying `coins`, `xp`, `inventory`, or `zooPets`.
- **State Synchronization**: Ensure `updateUI()` and `renderFarm()` are called after state changes to keep the visual representation in sync.
- **Git Commits**: Commit changes regularly with descriptive messages (e.g., `perf:`, `fix:`, `feat:`).
