# Sprint 1: Monorepo Setup + Dev Environment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffoldar o monorepo completo com npm workspaces, TypeScript, Jest, ESLint e Prettier — ambiente verde com smoke tests em todos os packages antes de escrever qualquer lógica de negócio.

**Architecture:** Monorepo npm workspaces com 3 packages TypeScript puros (`@si/level-engine`, `@si/monetization-plugin`, `@si/analytics-plugin`) + 2 apps (`apps/game` via Expo ~52, `apps/calibrator` via Next.js 14). TypeScript project references para builds incrementais. Jest + ts-jest para testes unitários nos packages. Metro configurado para enxergar o monorepo.

**Tech Stack:** Node.js 24, npm 11, npm workspaces, TypeScript 5.4, Jest 29 + ts-jest 29, ESLint 8 + @typescript-eslint 7, Prettier 3, Expo SDK ~52, Next.js 14.

---

## Estrutura de arquivos

```
space-invaders/
├── package.json                          # npm workspaces root
├── tsconfig.base.json                    # TS config compartilhado
├── tsconfig.json                         # root — project references
├── jest.config.js                        # root — aponta para packages/
├── .eslintrc.cjs                         # ESLint + @typescript-eslint
├── .prettierrc                           # Prettier
├── .prettierignore
├── .gitignore
├── packages/
│   ├── level-engine/
│   │   ├── package.json                  # @si/level-engine
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   └── src/
│   │       ├── index.ts                  # barrel export
│   │       └── __tests__/
│   │           └── smoke.test.ts
│   ├── monetization-plugin/
│   │   ├── package.json                  # @si/monetization-plugin
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   └── src/
│   │       ├── index.ts
│   │       └── __tests__/
│   │           └── smoke.test.ts
│   └── analytics-plugin/
│       ├── package.json                  # @si/analytics-plugin
│       ├── tsconfig.json
│       ├── jest.config.js
│       └── src/
│           ├── index.ts
│           └── __tests__/
│               └── smoke.test.ts
└── apps/
    ├── game/                             # Expo SDK ~52 (criado via CLI)
    │   └── metro.config.js               # configurado para monorepo
    └── calibrator/                       # Next.js 14 (criado via CLI)
```

---

### Task 1: Git + Root package.json + .gitignore

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Init git repository**

```bash
cd /home/maycola/Development/space-invaders
git init
```

Expected: `Initialized empty Git repository in .../space-invaders/.git/`

- [ ] **Step 2: Create root package.json**

Create `package.json`:
```json
{
  "name": "space-invaders",
  "version": "0.0.1",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "build": "tsc --build",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@typescript-eslint/eslint-plugin": "^7.7.0",
    "@typescript-eslint/parser": "^7.7.0",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "prettier": "^3.2.5",
    "ts-jest": "^29.2.0",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 3: Create .gitignore**

Create `.gitignore`:
```
# Dependencies
node_modules/

# Build outputs
dist/
build/
.expo/
.next/
*.tsbuildinfo

# Testing
coverage/

# Environment
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# Editors
.vscode/
.idea/
*.swp

# Logs
*.log
npm-debug.log*

# Superpowers brainstorm server artifacts
.superpowers/
```

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore docs/
git commit -m "chore: init monorepo with npm workspaces"
```

---

### Task 2: TypeScript shared config

**Files:**
- Create: `tsconfig.base.json`
- Create: `tsconfig.json`

- [ ] **Step 1: Create tsconfig.base.json**

Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true
  }
}
```

- [ ] **Step 2: Create tsconfig.json (root — project references)**

Create `tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "packages/level-engine" },
    { "path": "packages/monetization-plugin" },
    { "path": "packages/analytics-plugin" }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add tsconfig.base.json tsconfig.json
git commit -m "chore: add TypeScript base config with project references"
```

---

### Task 3: ESLint + Prettier

**Files:**
- Create: `.eslintrc.cjs`
- Create: `.prettierrc`
- Create: `.prettierignore`

- [ ] **Step 1: Create .eslintrc.cjs**

Create `.eslintrc.cjs`:
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['dist/', 'node_modules/', '.next/', '.expo/', 'coverage/'],
}
```

- [ ] **Step 2: Create .prettierrc**

Create `.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

- [ ] **Step 3: Create .prettierignore**

Create `.prettierignore`:
```
node_modules
dist
build
.next
.expo
coverage
*.tsbuildinfo
.superpowers
```

- [ ] **Step 4: Commit**

```bash
git add .eslintrc.cjs .prettierrc .prettierignore
git commit -m "chore: add ESLint and Prettier config"
```

---

### Task 4: Root Jest config

**Files:**
- Create: `jest.config.js`

- [ ] **Step 1: Create jest.config.js**

Create `jest.config.js`:
```js
/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/packages/level-engine',
    '<rootDir>/packages/monetization-plugin',
    '<rootDir>/packages/analytics-plugin',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add jest.config.js
git commit -m "chore: add root Jest config pointing to packages"
```

---

### Task 5: level-engine package scaffold

**Files:**
- Create: `packages/level-engine/package.json`
- Create: `packages/level-engine/tsconfig.json`
- Create: `packages/level-engine/jest.config.js`
- Create: `packages/level-engine/src/index.ts`
- Create: `packages/level-engine/src/__tests__/smoke.test.ts`

- [ ] **Step 1: Create packages/level-engine/package.json**

```json
{
  "name": "@si/level-engine",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc --build",
    "test": "jest",
    "test:watch": "jest --watch",
    "clean": "rm -rf dist .tsbuildinfo"
  },
  "devDependencies": {}
}
```

`jest`, `ts-jest`, `typescript` e `@types/jest` são hoisted para o root via npm workspaces — não precisa listá-los aqui.

- [ ] **Step 2: Create packages/level-engine/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create packages/level-engine/jest.config.js**

```js
/** @type {import('jest').Config} */
module.exports = {
  displayName: 'level-engine',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/**/*.test.ts'],
}
```

- [ ] **Step 4: Write the failing test**

Create `packages/level-engine/src/__tests__/smoke.test.ts`:
```typescript
import { LEVEL_ENGINE_VERSION } from '../index'

describe('level-engine', () => {
  it('exports a version string', () => {
    expect(LEVEL_ENGINE_VERSION).toBe('0.1.0')
  })
})
```

- [ ] **Step 5: Run test — expect FAIL**

```bash
cd /home/maycola/Development/space-invaders
npm install
npx jest --projects packages/level-engine 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '../index'` ou `LEVEL_ENGINE_VERSION is not exported`

- [ ] **Step 6: Create the barrel export**

Create `packages/level-engine/src/index.ts`:
```typescript
export const LEVEL_ENGINE_VERSION = '0.1.0'
```

- [ ] **Step 7: Run test — expect PASS**

```bash
npx jest --projects packages/level-engine 2>&1 | tail -10
```

Expected:
```
PASS packages/level-engine/src/__tests__/smoke.test.ts
  level-engine
    ✓ exports a version string (Xms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

- [ ] **Step 8: Commit**

```bash
git add packages/level-engine/
git commit -m "chore: scaffold @si/level-engine with smoke test"
```

---

### Task 6: monetization-plugin package scaffold

**Files:**
- Create: `packages/monetization-plugin/package.json`
- Create: `packages/monetization-plugin/tsconfig.json`
- Create: `packages/monetization-plugin/jest.config.js`
- Create: `packages/monetization-plugin/src/index.ts`
- Create: `packages/monetization-plugin/src/__tests__/smoke.test.ts`

- [ ] **Step 1: Create packages/monetization-plugin/package.json**

```json
{
  "name": "@si/monetization-plugin",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc --build",
    "test": "jest",
    "test:watch": "jest --watch",
    "clean": "rm -rf dist .tsbuildinfo"
  },
  "devDependencies": {}
}
```

- [ ] **Step 2: Create packages/monetization-plugin/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create packages/monetization-plugin/jest.config.js**

```js
/** @type {import('jest').Config} */
module.exports = {
  displayName: 'monetization-plugin',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/**/*.test.ts'],
}
```

- [ ] **Step 4: Write the failing test**

Create `packages/monetization-plugin/src/__tests__/smoke.test.ts`:
```typescript
import { MONETIZATION_PLUGIN_VERSION } from '../index'

describe('monetization-plugin', () => {
  it('exports a version string', () => {
    expect(MONETIZATION_PLUGIN_VERSION).toBe('0.1.0')
  })
})
```

- [ ] **Step 5: Run test — expect FAIL**

```bash
npx jest --projects packages/monetization-plugin 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 6: Create the barrel export**

Create `packages/monetization-plugin/src/index.ts`:
```typescript
export const MONETIZATION_PLUGIN_VERSION = '0.1.0'
```

- [ ] **Step 7: Run test — expect PASS**

```bash
npx jest --projects packages/monetization-plugin 2>&1 | tail -10
```

Expected:
```
PASS packages/monetization-plugin/src/__tests__/smoke.test.ts
  monetization-plugin
    ✓ exports a version string (Xms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

- [ ] **Step 8: Commit**

```bash
git add packages/monetization-plugin/
git commit -m "chore: scaffold @si/monetization-plugin with smoke test"
```

---

### Task 7: analytics-plugin package scaffold

**Files:**
- Create: `packages/analytics-plugin/package.json`
- Create: `packages/analytics-plugin/tsconfig.json`
- Create: `packages/analytics-plugin/jest.config.js`
- Create: `packages/analytics-plugin/src/index.ts`
- Create: `packages/analytics-plugin/src/__tests__/smoke.test.ts`

- [ ] **Step 1: Create packages/analytics-plugin/package.json**

```json
{
  "name": "@si/analytics-plugin",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc --build",
    "test": "jest",
    "test:watch": "jest --watch",
    "clean": "rm -rf dist .tsbuildinfo"
  },
  "devDependencies": {}
}
```

- [ ] **Step 2: Create packages/analytics-plugin/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create packages/analytics-plugin/jest.config.js**

```js
/** @type {import('jest').Config} */
module.exports = {
  displayName: 'analytics-plugin',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/**/*.test.ts'],
}
```

- [ ] **Step 4: Write the failing test**

Create `packages/analytics-plugin/src/__tests__/smoke.test.ts`:
```typescript
import { ANALYTICS_PLUGIN_VERSION } from '../index'

describe('analytics-plugin', () => {
  it('exports a version string', () => {
    expect(ANALYTICS_PLUGIN_VERSION).toBe('0.1.0')
  })
})
```

- [ ] **Step 5: Run test — expect FAIL**

```bash
npx jest --projects packages/analytics-plugin 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 6: Create the barrel export**

Create `packages/analytics-plugin/src/index.ts`:
```typescript
export const ANALYTICS_PLUGIN_VERSION = '0.1.0'
```

- [ ] **Step 7: Run test — expect PASS**

```bash
npx jest --projects packages/analytics-plugin 2>&1 | tail -10
```

Expected:
```
PASS packages/analytics-plugin/src/__tests__/smoke.test.ts
  analytics-plugin
    ✓ exports a version string (Xms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

- [ ] **Step 8: Commit**

```bash
git add packages/analytics-plugin/
git commit -m "chore: scaffold @si/analytics-plugin with smoke test"
```

---

### Task 8: Expo game app scaffold

**Files:**
- Create: `apps/game/` (via create-expo-app)
- Modify: `apps/game/metro.config.js`
- Modify: `apps/game/package.json`

- [ ] **Step 1: Scaffold Expo app**

```bash
cd /home/maycola/Development/space-invaders/apps
npx create-expo-app@latest game --template blank-typescript
```

Aceitar os defaults quando perguntado. O CLI vai baixar o template e instalar as dependências.

Expected: `apps/game/` criado com `package.json`, `App.tsx`, `app.json`, `tsconfig.json`, etc.

- [ ] **Step 2: Update apps/game/package.json name**

Abrir `apps/game/package.json` e alterar o campo `"name"` para `"@si/game"`. Manter todos os outros campos como gerado.

- [ ] **Step 3: Configure Metro for monorepo**

Criar (ou substituir) `apps/game/metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Observa mudanças nos packages do monorepo
config.watchFolders = [monorepoRoot]

// Resolve módulos do root do monorepo primeiro
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

module.exports = config
```

- [ ] **Step 4: Add monorepo package dependencies to game**

Editar `apps/game/package.json` — adicionar em `"dependencies"`:
```json
"@si/level-engine": "*",
"@si/monetization-plugin": "*",
"@si/analytics-plugin": "*"
```

- [ ] **Step 5: Commit**

```bash
cd /home/maycola/Development/space-invaders
git add apps/game/
git commit -m "chore: scaffold Expo game app with monorepo Metro config"
```

---

### Task 9: Next.js calibrator app scaffold

**Files:**
- Create: `apps/calibrator/` (via create-next-app)
- Modify: `apps/calibrator/package.json`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /home/maycola/Development/space-invaders/apps
npx create-next-app@14 calibrator \
  --typescript \
  --eslint \
  --no-tailwind \
  --no-src-dir \
  --app \
  --no-import-alias
```

Expected: `apps/calibrator/` criado com `package.json`, `app/page.tsx`, `next.config.mjs`, etc.

- [ ] **Step 2: Update apps/calibrator/package.json name**

Editar `apps/calibrator/package.json` e alterar `"name"` para `"@si/calibrator"`.

- [ ] **Step 3: Add monorepo package dependencies to calibrator**

Editar `apps/calibrator/package.json` — adicionar em `"dependencies"`:
```json
"@si/level-engine": "*",
"@si/analytics-plugin": "*"
```

- [ ] **Step 4: Commit**

```bash
cd /home/maycola/Development/space-invaders
git add apps/calibrator/
git commit -m "chore: scaffold Next.js calibrator app"
```

---

### Task 10: npm install + full verification

- [ ] **Step 1: Install all dependencies from root**

```bash
cd /home/maycola/Development/space-invaders
npm install
```

Expected: `node_modules/` no root criado/atualizado. Symlinks de `@si/*` criados em `node_modules/@si/`.

- [ ] **Step 2: Verify workspace symlinks**

```bash
ls -la node_modules/@si/
```

Expected (symlinks apontando para os packages):
```
lrwxrwxrwx  analytics-plugin -> ../../packages/analytics-plugin
lrwxrwxrwx  game -> ../../apps/game
lrwxrwxrwx  level-engine -> ../../packages/level-engine
lrwxrwxrwx  monetization-plugin -> ../../packages/monetization-plugin
```

- [ ] **Step 3: Run all package tests**

```bash
cd /home/maycola/Development/space-invaders
npm test
```

Expected:
```
PASS packages/level-engine/src/__tests__/smoke.test.ts
PASS packages/monetization-plugin/src/__tests__/smoke.test.ts
PASS packages/analytics-plugin/src/__tests__/smoke.test.ts

Test Suites: 3 passed, 3 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        ~5s
```

- [ ] **Step 4: Build all packages with TypeScript**

```bash
npm run build
```

Expected: `packages/level-engine/dist/`, `packages/monetization-plugin/dist/`, `packages/analytics-plugin/dist/` criados sem erros de TypeScript.

- [ ] **Step 5: Final commit**

```bash
git add package-lock.json
git commit -m "chore: lock dependencies after full workspace install — Sprint 1 complete"
```

---

## Checklist de conclusão da Sprint 1

Ao final, o repositório deve ter:
- [ ] `git log` mostra 10+ commits com mensagens `chore: ...`
- [ ] `npm test` → 3 suites, 3 tests, tudo verde
- [ ] `npm run build` → sem erros TypeScript
- [ ] `node_modules/@si/` contém symlinks para todos os packages
- [ ] `apps/game/` existe com metro.config.js para monorepo
- [ ] `apps/calibrator/` existe e buildava sem erros

**Sprint 2** implementa o Level Engine completo sobre esta base.
**Sprint 3** implementa o jogo com Expo + Skia sobre o Level Engine.
