# apps/jogo — Fresh Expo Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `apps/jogo` — a clean, working Expo 54 + React Native 0.81.5 + Skia 2.2.12 setup inside the monorepo, replacing the broken `apps/game` configuration.

**Architecture:** Manual scaffold (no `create-expo-app`) with exact version parity to what's already installed in the monorepo. Metro is configured with `watchFolders` so it can resolve `packages/*` at runtime. React-native-reanimated is stubbed out via `resolveRequest` so Skia uses `StaticContainer` (safe — game uses no Reanimated Skia APIs). `babel.config.js` is present from day one (this file was the root cause of the old failure).

**Tech Stack:** Expo SDK 54 · React Native 0.81.5 · React 19.1.0 · @shopify/react-native-skia 2.2.12 · TypeScript 5.x · jest-expo · npm workspaces

---

## Context: why `apps/game` broke

The file `apps/game/babel.config.js` was not committed — it was in `??` (untracked) state in git, meaning it was missing for anyone who cloned the repo. Without it, Metro cannot transpile the app and Expo fails immediately. Additionally, the reanimated stub in `stubs/` was also untracked. This plan starts fresh and commits every file from the beginning.

---

## File Map

| Path | Responsibility |
|------|---------------|
| `apps/jogo/package.json` | Workspace package `@si/jogo`, deps & scripts |
| `apps/jogo/app.json` | Expo config (slug, orientation, icons) |
| `apps/jogo/babel.config.js` | Babel preset for Expo (CRITICAL — was missing in game) |
| `apps/jogo/metro.config.js` | Monorepo watchFolders + reanimated stub resolveRequest |
| `apps/jogo/tsconfig.json` | Extends expo/tsconfig.base, strict mode |
| `apps/jogo/index.ts` | Expo entry point — `registerRootComponent` |
| `apps/jogo/App.tsx` | Root component — renders a Skia Canvas with a colored rectangle |
| `apps/jogo/stubs/react-native-reanimated.js` | Throws to force Skia into StaticContainer mode |
| `apps/jogo/assets/` | Placeholder icons (copy from apps/game/assets) |

---

## Task 1: Create the package.json

**Files:**
- Create: `apps/jogo/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@si/jogo",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  },
  "dependencies": {
    "@shopify/react-native-skia": "2.2.12",
    "@si/analytics-plugin": "*",
    "@si/level-engine": "*",
    "@si/monetization-plugin": "*",
    "expo": "~54.0.33",
    "expo-status-bar": "~3.0.9",
    "react": "19.1.0",
    "react-native": "0.81.5"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "jest-expo": "~54.0.0",
    "typescript": "~5.9.2"
  },
  "private": true
}
```

- [ ] **Step 2: Verify the monorepo workspaces field sees it**

From monorepo root — `apps/*` glob already matches `apps/jogo`:

```bash
cat package.json | grep -A4 '"workspaces"'
```

Expected output:
```
"workspaces": [
  "packages/*",
  "apps/*"
]
```

---

## Task 2: Create app.json, tsconfig.json and babel.config.js

**Files:**
- Create: `apps/jogo/app.json`
- Create: `apps/jogo/tsconfig.json`
- Create: `apps/jogo/babel.config.js`

- [ ] **Step 1: Create app.json**

```json
{
  "expo": {
    "name": "jogo",
    "slug": "jogo",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    },
    "ios": {
      "supportsTablet": false
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    }
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

- [ ] **Step 3: Create babel.config.js**

This file is REQUIRED by Metro. Without it, `expo start` fails with a cryptic Babel error.

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
  }
}
```

---

## Task 3: Create the reanimated stub

**Files:**
- Create: `apps/jogo/stubs/react-native-reanimated.js`

**Why this exists:** Skia 2.x checks if `react-native-reanimated` is installed. If it can't import it, `HAS_REANIMATED_3 = false` and Skia uses `StaticContainer` (no worklets, no native reanimated module needed). We throw an error so the import fails fast and silently — the game never calls Reanimated Skia APIs.

- [ ] **Step 1: Create stubs directory and stub file**

```js
// Stub: forces HAS_REANIMATED_3 = false in @shopify/react-native-skia,
// making Skia use StaticContainer instead of NativeReanimatedContainer.
// Safe: the game uses no Reanimated Skia APIs (no useSharedValue, no withTiming, etc).
throw new Error('react-native-reanimated stubbed out')
```

---

## Task 4: Create metro.config.js

**Files:**
- Create: `apps/jogo/metro.config.js`

This is the most critical file for monorepo support. Two concerns:
1. `watchFolders` — tells Metro to watch `packages/*` for changes
2. `nodeModulesPaths` — tells Metro where to find `node_modules` (app-local first, then monorepo root)
3. `resolveRequest` — intercepts `react-native-reanimated` imports and redirects to our stub

- [ ] **Step 1: Create metro.config.js**

```js
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch changes in monorepo packages so hot-reload works during development
config.watchFolders = [monorepoRoot]

// Resolve modules from app node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Redirect react-native-reanimated to our stub.
// resolveRequest has the highest priority and overrides node_modules resolution.
const reanimatedStub = path.resolve(projectRoot, 'stubs/react-native-reanimated.js')
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-reanimated' || moduleName.startsWith('react-native-reanimated/')) {
    return { filePath: reanimatedStub, type: 'sourceFile' }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
```

---

## Task 5: Create assets

**Files:**
- Create: `apps/jogo/assets/` (copy from `apps/game/assets/`)

Expo requires icon files referenced in `app.json` to exist at startup — if they're missing, Expo throws an error before any JS runs.

- [ ] **Step 1: Copy assets from apps/game**

```bash
cp -r apps/game/assets apps/jogo/assets
```

- [ ] **Step 2: Verify files exist**

```bash
ls apps/jogo/assets/
```

Expected: `icon.png  adaptive-icon.png  splash-icon.png  favicon.png`

---

## Task 6: Create index.ts and App.tsx

**Files:**
- Create: `apps/jogo/index.ts`
- Create: `apps/jogo/App.tsx`

`App.tsx` renders a Skia `Canvas` with a single green rectangle. This proves the entire stack works: Expo boots, Metro resolves the monorepo packages, Skia loads without reanimated, and the native bridge renders to screen.

- [ ] **Step 1: Create index.ts**

```ts
import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)
```

- [ ] **Step 2: Create App.tsx**

```tsx
import { StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Canvas, Rect } from '@shopify/react-native-skia'

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Canvas style={styles.canvas}>
        <Rect x={50} y={100} width={200} height={200} color="lime" />
      </Canvas>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  canvas: { flex: 1 },
})
```

---

## Task 7: Install dependencies and verify TypeScript

**Files:** no new files

- [ ] **Step 1: Install from monorepo root**

```bash
npm install
```

Expected: exits 0 with no errors. `apps/jogo` is now a registered workspace.

- [ ] **Step 2: Check TypeScript**

```bash
cd apps/jogo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit everything so far**

```bash
git add apps/jogo/
git commit -m "[GAME] chore(jogo): scaffold fresh Expo 54 + Skia 2.2.12 setup"
```

---

## Task 8: Run on Android and verify visually

**Files:** no new files

This is the acceptance test. A green rectangle must appear on screen.

- [ ] **Step 1: Start Metro bundler**

From `apps/jogo/`:

```bash
npx expo start
```

Expected: Metro starts, QR code or device prompt appears. No `Unable to resolve module` errors in terminal.

- [ ] **Step 2: Press `a` to open on Android**

Expected: app installs and launches. Black background with a green rectangle centered on screen. No red error overlay.

- [ ] **Step 3: Confirm Skia is NOT using Reanimated**

Look at Metro terminal output. You should NOT see:
```
ERROR  react-native-reanimated stubbed out
```
*(The stub throws on import — but Skia catches the error silently. If you see a red screen with this message, Skia is propagating the error instead of catching it. See Troubleshooting below.)*

---

## Troubleshooting Reference

**`Unable to resolve module 'react-native-reanimated'`**
→ metro.config.js `resolveRequest` not active. Verify `module.exports = config` is at the bottom of the file.

**`Cannot find module 'expo/metro-config'`**
→ Run `npm install` from monorepo root. Metro config requires `expo` to be installed locally.

**`error: bundling failed: Error: Unable to resolve module '@si/level-engine'`**
→ Run `npm run build` from monorepo root first. Metro needs `dist/` to exist in each package.

**Red screen: "react-native-reanimated stubbed out"**
→ Skia version mismatch. The error should be caught by Skia, not bubble up. Check that `@shopify/react-native-skia` version is exactly `2.2.12`.

**Black screen (no rectangle)**
→ Check device logs with `npx expo start --dev-client` or `adb logcat`. Usually a JS error that didn't surface as a red overlay.

**`babel.config.js` parse error**
→ File must export a function, not an object. The `api.cache(true)` call is required.

---

## Self-Review

Spec coverage:
- ✅ Monorepo workspace registration (`apps/*` glob in root `package.json`)
- ✅ Metro monorepo config (watchFolders + nodeModulesPaths)
- ✅ Reanimated stub (Skia StaticContainer mode)
- ✅ babel.config.js present (root cause of old failure)
- ✅ Assets present (required by Expo at startup)
- ✅ TypeScript strict mode
- ✅ Skia canvas render proof (green rectangle)
- ✅ All files committed (no untracked critical files)

No placeholders, no TBD items. Every step has exact code or commands.
