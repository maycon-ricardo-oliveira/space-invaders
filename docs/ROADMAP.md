# Roadmap

> **Living document** — update it every time you open or merge a PR.
> Opening PR → `🚧 In Progress (PR #N)` · Merging PR → `✅ Done (PR #N)`
> Both updates must be part of the **same commit** as the code change.

## Status

| Sprint | Feature | Status | PR | Notes |
|--------|---------|--------|-----|-------|
| 1 | Monorepo setup + dev environment | ✅ Done | bootstrap | npm workspaces, TypeScript, Jest, ESLint, Prettier, Expo ~54 scaffold, Next.js 14 scaffold |
| 2 | Level Engine | ✅ Done (PR #3) | — | LevelEngine, CurveCalibratorStrategy, EntityRegistry, types |
| 3 | Game MVP | ✅ Done (PR #3) | — | SkiaRenderer, GameScreen, StoryModeScreen, registerEntities |
| 4 | Calibrator MVP | 🚧 In Progress (PR #5) | — | CanvasRenderer, MapEditor, CalibrationPanel, levels.json export |
| 5 | Survival Mode | ⏳ Todo | — | SurvivalModeScreen, procedural generation, adaptive difficulty |
| 6 | Monetization + Store | ⏳ Todo | — | AdMobMonetization, RevenueCatMonetization, StorePlugin, StoreScreen |
| 7 | Analytics | ⏳ Todo | — | FirebaseAnalytics, AnalyticsDashboard scatter plot |

## Legend

| Icon | Meaning |
|------|---------|
| ⏳ Todo | Not started |
| 🚧 In Progress | In development (PR #N) |
| ✅ Done | Merged (PR #N) |
| 🔴 Blocked | Blocked — reason |
