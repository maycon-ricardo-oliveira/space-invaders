# Space Invaders Mobile

A mobile Space Invaders remake with automatic level generation, a visual calibration tool, and Firebase analytics to detect problematic levels. Built as a reusable platform — the Level Engine, Monetization Plugin, and Analytics Plugin can power future 2D games.

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile game | Expo ~52 + react-native-skia |
| Level engine | TypeScript pure (zero native deps) |
| Calibrator | Next.js 14 + HTML5 Canvas |
| Monetization | AdMob (ads) + RevenueCat (IAP) |
| Analytics | Firebase Analytics |
| OTA updates | EAS Update |
| Build | EAS Build (cloud) |

## Prerequisites

- Node.js 20+
- npm 10+
- For mobile: Android Studio (Android) or Xcode / Mac (iOS)
- For OTA + builds: Expo account + `npm install -g eas-cli`

## Installation

```bash
git clone <repo>
cd space-invaders
npm install
```

## Running

```bash
# Run all package tests
npm test

# Build all TypeScript packages
npm run build

# Mobile game (Expo dev server)
cd apps/game
npx expo start

# Calibrator — visual level editor (dev tool)
cd apps/calibrator
npm run dev   # http://localhost:3001
```

## Structure

```
space-invaders/
├── packages/
│   ├── level-engine/         # @si/level-engine — level generation + calibration strategies
│   ├── monetization-plugin/  # @si/monetization-plugin — AdMob + RevenueCat + in-game store
│   └── analytics-plugin/     # @si/analytics-plugin — Firebase + NullAnalytics (dev)
├── apps/
│   ├── game/                 # Expo mobile app (Android + iOS)
│   └── calibrator/           # Next.js dev tool — NOT published to stores
└── docs/
    └── superpowers/
        ├── specs/            # Design spec
        └── plans/            # Sprint implementation plans
```

## Contributing

Read `CLAUDE.md` for commit standards, TDD rules, and architecture decisions.
PRs: use the template at `.github/pull_request_template.md`.
Sprint status: see `docs/ROADMAP.md`.
