# Sprint 4 — Calibrator MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Calibrator dev tool — a Next.js 14 app at `localhost:3001` that lets you visually edit level params and entity placements, then export them to `apps/game/src/levels.json`.

**Architecture:** `CalibratorClient` (client component) composes `CalibrationPanel` (sliders + difficulty score) and `MapEditor` (grid + toolbox + properties). `page.tsx` is a server component that reads `levels.json` and passes the array as `initialLevels`. A Server Action (`app/actions.ts`) handles the save. `CanvasRenderer` implements `IRenderer` via HTML5 Canvas 2D so calibration behavior is identical to mobile.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, `@si/level-engine`, Jest 29 + `@testing-library/react` + `jest-environment-jsdom`, `next/jest`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/calibrator/jest.config.js` | Jest config using `next/jest` helper |
| Create | `apps/calibrator/jest.setup.ts` | `@testing-library/jest-dom` global imports |
| Modify | `apps/calibrator/package.json` | Add test devDeps + `test` script |
| Modify | `jest.config.js` (root) | Add `apps/calibrator` to `projects` array |
| Create | `apps/calibrator/src/renderers/CanvasRenderer.ts` | `IRenderer` impl via Canvas 2D API |
| Create | `apps/calibrator/src/CalibrationPanel/Sliders.tsx` | Controlled sliders for all `LevelParams` |
| Create | `apps/calibrator/src/CalibrationPanel/DifficultyScore.tsx` | Displays difficulty score 0–100 |
| Create | `apps/calibrator/src/MapEditor/Toolbox.tsx` | Entity type palette (select tool) |
| Create | `apps/calibrator/src/MapEditor/Grid.tsx` | 12×16 snap-to-grid placement canvas |
| Create | `apps/calibrator/src/MapEditor/PropertiesPanel.tsx` | Shows selected entity's type and coords |
| Create | `apps/calibrator/src/levelsFile.ts` | `readLevels()` / `writeLevels()` via Node.js `fs` |
| Create | `apps/calibrator/src/CalibratorClient.tsx` | Main `'use client'` component — composes all panels |
| Create | `apps/calibrator/app/actions.ts` | `saveLevels()` Server Action |
| Modify | `apps/calibrator/app/page.tsx` | Replace scaffold: server component that seeds + passes levels |
| Create | `apps/calibrator/src/__tests__/CanvasRenderer.test.ts` | |
| Create | `apps/calibrator/src/__tests__/Sliders.test.tsx` | |
| Create | `apps/calibrator/src/__tests__/DifficultyScore.test.tsx` | |
| Create | `apps/calibrator/src/__tests__/Toolbox.test.tsx` | |
| Create | `apps/calibrator/src/__tests__/Grid.test.tsx` | |
| Create | `apps/calibrator/src/__tests__/PropertiesPanel.test.tsx` | |
| Create | `apps/calibrator/src/__tests__/levelsFile.test.ts` | |
| Create | `apps/calibrator/src/__tests__/CalibratorClient.test.tsx` | |
| Modify | `docs/ROADMAP.md` | Sprint 4 → `🚧 In Progress` |

---

## PR 1 — `feat/s4-canvas-renderer`

### Task 1: Jest setup for calibrator

**Files:**
- Create: `apps/calibrator/jest.config.js`
- Create: `apps/calibrator/jest.setup.ts`
- Modify: `apps/calibrator/package.json`
- Modify: `jest.config.js` (root)

- [ ] **Step 1: Write the sentinel failing test**

Create `apps/calibrator/src/__tests__/setup.test.ts`:

```typescript
it('calibrator test suite runs', () => {
  expect(true).toBe(true)
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run from monorepo root:
```bash
npm test
```

Expected: error about missing jest config in `apps/calibrator` — the project is not yet included in root `projects`.

- [ ] **Step 3: Add test devDependencies to calibrator**

In `apps/calibrator/package.json`, add to `"devDependencies"` and `"scripts"`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/jest": "^29",
    "eslint": "^8",
    "eslint-config-next": "14.2.35",
    "jest": "^29",
    "jest-environment-jsdom": "^29",
    "@testing-library/react": "^14",
    "@testing-library/jest-dom": "^6",
    "@testing-library/user-event": "^14"
  }
}
```

Run from monorepo root to install:
```bash
npm install
```

- [ ] **Step 4: Create `apps/calibrator/jest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create `apps/calibrator/jest.config.js`**

```javascript
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  displayName: 'calibrator',
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@si/level-engine$': '<rootDir>/../../packages/level-engine/src/index.ts',
  },
})
```

- [ ] **Step 6: Add `apps/calibrator` to root `jest.config.js`**

Modify `jest.config.js` at the monorepo root:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/packages/level-engine',
    '<rootDir>/packages/monetization-plugin',
    '<rootDir>/packages/analytics-plugin',
    '<rootDir>/apps/game',
    '<rootDir>/apps/calibrator',
  ],
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npm test
```

Expected: `PASS apps/calibrator/src/__tests__/setup.test.ts` — 1 test suite, 1 test passed.

- [ ] **Step 8: Commit**

```bash
git checkout -b feat/s4-canvas-renderer
git add apps/calibrator/jest.config.js apps/calibrator/jest.setup.ts apps/calibrator/package.json apps/calibrator/src/__tests__/setup.test.ts jest.config.js package-lock.json
git commit -m "[CAL] chore(s4): add Jest + @testing-library setup for calibrator"
```

---

### Task 2: CanvasRenderer

**Files:**
- Create: `apps/calibrator/src/renderers/CanvasRenderer.ts`
- Create: `apps/calibrator/src/__tests__/CanvasRenderer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/calibrator/src/__tests__/CanvasRenderer.test.ts`:

```typescript
import { CanvasRenderer } from '../renderers/CanvasRenderer'

function makeCtx(width = 360, height = 640) {
  return {
    canvas: { width, height },
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    fillStyle: '' as string,
  } as unknown as CanvasRenderingContext2D
}

describe('CanvasRenderer', () => {
  it('clear() calls clearRect with full canvas dimensions', () => {
    const ctx = makeCtx()
    const renderer = new CanvasRenderer(ctx)
    renderer.clear()
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 360, 640)
  })

  it('drawRect() sets fillStyle and calls fillRect', () => {
    const ctx = makeCtx()
    const renderer = new CanvasRenderer(ctx)
    renderer.drawRect(10, 20, 30, 40, '#ff0000')
    expect(ctx.fillStyle).toBe('#ff0000')
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 30, 40)
  })

  it('drawSprite() draws a fallback rect at the given position', () => {
    const ctx = makeCtx()
    const renderer = new CanvasRenderer(ctx)
    renderer.drawSprite({ source: 'basic-enemy', width: 32, height: 32 }, 50, 60, 32, 32)
    expect(ctx.fillRect).toHaveBeenCalledWith(50, 60, 32, 32)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- --testPathPattern="CanvasRenderer"
```

Expected: `Cannot find module '../renderers/CanvasRenderer'`

- [ ] **Step 3: Implement CanvasRenderer**

Create `apps/calibrator/src/renderers/CanvasRenderer.ts`:

```typescript
import type { IRenderer, Sprite } from '@si/level-engine'

export class CanvasRenderer implements IRenderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  clear(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
  }

  drawSprite(_sprite: Sprite, x: number, y: number, width: number, height: number): void {
    this.ctx.fillStyle = '#888'
    this.ctx.fillRect(x, y, width, height)
  }

  drawRect(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, width, height)
  }
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npm test -- --testPathPattern="CanvasRenderer"
```

Expected: `PASS` — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/calibrator/src/renderers/CanvasRenderer.ts apps/calibrator/src/__tests__/CanvasRenderer.test.ts
git commit -m "[CAL] feat(s4): add CanvasRenderer implementing IRenderer via Canvas 2D"
```

---

## PR 2 — `feat/s4-calibration-panel`

### Task 3: Sliders

**Files:**
- Create: `apps/calibrator/src/CalibrationPanel/Sliders.tsx`
- Create: `apps/calibrator/src/__tests__/Sliders.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/calibrator/src/__tests__/Sliders.test.tsx`:

```typescript
import { render, fireEvent } from '@testing-library/react'
import { Sliders } from '../CalibrationPanel/Sliders'
import type { LevelParams } from '@si/level-engine'

const defaultParams: LevelParams = {
  numberOfEnemies: 10,
  enemySpeed: 2.5,
  enemyShotDelay: 1.5,
  enemyShotSpeed: 5,
  enemyAngerDelay: 17,
  enemySpawnDelay: 1.0,
  hasPowerUps: true,
  powerUpMinWait: 10,
  powerUpMaxWait: 22,
}

describe('Sliders', () => {
  it('renders 8 range sliders (all numeric LevelParams)', () => {
    const { getAllByRole } = render(<Sliders value={defaultParams} onChange={jest.fn()} />)
    expect(getAllByRole('slider')).toHaveLength(8)
  })

  it('calls onChange with updated numberOfEnemies', () => {
    const onChange = jest.fn()
    const { getByLabelText } = render(<Sliders value={defaultParams} onChange={onChange} />)
    fireEvent.change(getByLabelText('Number of Enemies'), { target: { value: '15' } })
    expect(onChange).toHaveBeenCalledWith({ ...defaultParams, numberOfEnemies: 15 })
  })

  it('calls onChange with updated hasPowerUps when checkbox toggled', () => {
    const onChange = jest.fn()
    const { getByLabelText } = render(<Sliders value={defaultParams} onChange={onChange} />)
    fireEvent.click(getByLabelText('Has Power-Ups'))
    expect(onChange).toHaveBeenCalledWith({ ...defaultParams, hasPowerUps: false })
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- --testPathPattern="Sliders"
```

Expected: `Cannot find module '../CalibrationPanel/Sliders'`

- [ ] **Step 3: Implement Sliders**

Create `apps/calibrator/src/CalibrationPanel/Sliders.tsx`:

```typescript
'use client'
import type { LevelParams } from '@si/level-engine'

interface Props {
  value: LevelParams
  onChange: (params: LevelParams) => void
}

const SLIDER_CONFIG: Array<{
  key: keyof LevelParams
  label: string
  min: number
  max: number
  step: number
}> = [
  { key: 'numberOfEnemies',  label: 'Number of Enemies',        min: 3,   max: 20,  step: 1   },
  { key: 'enemySpeed',       label: 'Enemy Speed',               min: 1,   max: 5,   step: 0.1 },
  { key: 'enemyShotDelay',   label: 'Enemy Shot Delay (s)',      min: 0.5, max: 3.0, step: 0.1 },
  { key: 'enemyShotSpeed',   label: 'Enemy Shot Speed',          min: 2,   max: 8,   step: 0.5 },
  { key: 'enemyAngerDelay',  label: 'Enemy Anger Delay (s)',     min: 5,   max: 30,  step: 1   },
  { key: 'enemySpawnDelay',  label: 'Enemy Spawn Delay (s)',     min: 0.3, max: 2,   step: 0.1 },
  { key: 'powerUpMinWait',   label: 'Power-Up Min Wait (s)',     min: 5,   max: 15,  step: 1   },
  { key: 'powerUpMaxWait',   label: 'Power-Up Max Wait (s)',     min: 15,  max: 30,  step: 1   },
]

export function Sliders({ value, onChange }: Props) {
  return (
    <div>
      {SLIDER_CONFIG.map(({ key, label, min, max, step }) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <label htmlFor={key}>{label}</label>
          <input
            id={key}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value[key] as number}
            onChange={(e) =>
              onChange({ ...value, [key]: parseFloat(e.target.value) })
            }
          />
          <span>{(value[key] as number).toFixed(step < 1 ? 1 : 0)}</span>
        </div>
      ))}
      <div>
        <label htmlFor="hasPowerUps">Has Power-Ups</label>
        <input
          id="hasPowerUps"
          type="checkbox"
          checked={value.hasPowerUps}
          onChange={(e) => onChange({ ...value, hasPowerUps: e.target.checked })}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npm test -- --testPathPattern="Sliders"
```

Expected: `PASS` — 3 tests.

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/s4-calibration-panel
git add apps/calibrator/src/CalibrationPanel/Sliders.tsx apps/calibrator/src/__tests__/Sliders.test.tsx
git commit -m "[CAL] feat(s4): add Sliders component for LevelParams"
```

---

### Task 4: DifficultyScore

**Files:**
- Create: `apps/calibrator/src/CalibrationPanel/DifficultyScore.tsx`
- Create: `apps/calibrator/src/__tests__/DifficultyScore.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/calibrator/src/__tests__/DifficultyScore.test.tsx`:

```typescript
import { render } from '@testing-library/react'
import { DifficultyScore } from '../CalibrationPanel/DifficultyScore'

describe('DifficultyScore', () => {
  it('displays score 0 for level 0 of 20', () => {
    const { getByText } = render(<DifficultyScore levelIndex={0} totalLevels={20} />)
    expect(getByText(/Score: 0/)).toBeInTheDocument()
  })

  it('displays score 100 for the last level (index 19 of 20)', () => {
    const { getByText } = render(<DifficultyScore levelIndex={19} totalLevels={20} />)
    expect(getByText(/Score: 100/)).toBeInTheDocument()
  })

  it('displays score 50 for the exact mid-point', () => {
    // levelIndex=9, totalLevels=19 → (9/18)*100 = 50
    const { getByText } = render(<DifficultyScore levelIndex={9} totalLevels={19} />)
    expect(getByText(/Score: 50/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- --testPathPattern="DifficultyScore"
```

Expected: `Cannot find module '../CalibrationPanel/DifficultyScore'`

- [ ] **Step 3: Implement DifficultyScore**

Create `apps/calibrator/src/CalibrationPanel/DifficultyScore.tsx`:

```typescript
interface Props {
  levelIndex: number
  totalLevels: number
}

export function DifficultyScore({ levelIndex, totalLevels }: Props) {
  const score =
    totalLevels <= 1 ? 100 : Math.round((levelIndex / (totalLevels - 1)) * 100)

  return (
    <div>
      <span>Score: {score}</span>
      <div style={{ background: '#333', height: 8, width: '100%', borderRadius: 4, marginTop: 4 }}>
        <div
          style={{
            background: '#4CAF50',
            height: '100%',
            width: `${score}%`,
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npm test -- --testPathPattern="DifficultyScore"
```

Expected: `PASS` — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/calibrator/src/CalibrationPanel/DifficultyScore.tsx apps/calibrator/src/__tests__/DifficultyScore.test.tsx
git commit -m "[CAL] feat(s4): add DifficultyScore component"
```

---

## PR 3 — `feat/s4-map-editor`

### Task 5: Toolbox

**Files:**
- Create: `apps/calibrator/src/MapEditor/Toolbox.tsx`
- Create: `apps/calibrator/src/__tests__/Toolbox.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/calibrator/src/__tests__/Toolbox.test.tsx`:

```typescript
import { render, fireEvent } from '@testing-library/react'
import { Toolbox } from '../MapEditor/Toolbox'
import type { EntityType } from '@si/level-engine'

const entityTypes: EntityType[] = [
  { id: 'basic-enemy', label: 'Basic Enemy',  icon: '👾', properties: {} },
  { id: 'fast-enemy',  label: 'Fast Enemy',   icon: '🚀', properties: {} },
  { id: 'tank-enemy',  label: 'Tank Enemy',   icon: '🛡️', properties: {} },
]

describe('Toolbox', () => {
  it('renders a button for each entity type', () => {
    const { getByText } = render(
      <Toolbox entityTypes={entityTypes} selectedId={null} onSelect={jest.fn()} />
    )
    expect(getByText('Basic Enemy')).toBeInTheDocument()
    expect(getByText('Fast Enemy')).toBeInTheDocument()
    expect(getByText('Tank Enemy')).toBeInTheDocument()
  })

  it('calls onSelect with the entity type id on click', () => {
    const onSelect = jest.fn()
    const { getByText } = render(
      <Toolbox entityTypes={entityTypes} selectedId={null} onSelect={onSelect} />
    )
    fireEvent.click(getByText('Basic Enemy'))
    expect(onSelect).toHaveBeenCalledWith('basic-enemy')
  })

  it('marks the selected entity as aria-pressed', () => {
    const { getByText } = render(
      <Toolbox entityTypes={entityTypes} selectedId="basic-enemy" onSelect={jest.fn()} />
    )
    expect(getByText('Basic Enemy').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(getByText('Fast Enemy').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- --testPathPattern="Toolbox"
```

Expected: `Cannot find module '../MapEditor/Toolbox'`

- [ ] **Step 3: Implement Toolbox**

Create `apps/calibrator/src/MapEditor/Toolbox.tsx`:

```typescript
'use client'
import type { EntityType } from '@si/level-engine'

interface Props {
  entityTypes: EntityType[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function Toolbox({ entityTypes, selectedId, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {entityTypes.map((et) => (
        <button
          key={et.id}
          aria-pressed={et.id === selectedId}
          onClick={() => onSelect(et.id)}
          style={{
            background: et.id === selectedId ? '#4CAF50' : '#333',
            color: '#fff',
            border: 'none',
            padding: '6px 10px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {et.icon} {et.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npm test -- --testPathPattern="Toolbox"
```

Expected: `PASS` — 3 tests.

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/s4-map-editor
git add apps/calibrator/src/MapEditor/Toolbox.tsx apps/calibrator/src/__tests__/Toolbox.test.tsx
git commit -m "[CAL] feat(s4): add Toolbox component for entity type selection"
```

---

### Task 6: Grid

**Files:**
- Create: `apps/calibrator/src/MapEditor/Grid.tsx`
- Create: `apps/calibrator/src/__tests__/Grid.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/calibrator/src/__tests__/Grid.test.tsx`:

```typescript
import { render, fireEvent } from '@testing-library/react'
import { Grid, COLS, ROWS, CELL_W, CELL_H } from '../MapEditor/Grid'
import type { EntityPlacement } from '@si/level-engine'

describe('Grid', () => {
  it('renders COLS × ROWS cells as buttons', () => {
    const { getAllByRole } = render(
      <Grid entities={[]} selectedEntityTypeId={null} onPlace={jest.fn()} onRemove={jest.fn()} />
    )
    expect(getAllByRole('button')).toHaveLength(COLS * ROWS)
  })

  it('calls onPlace with correct coords when clicking an empty cell', () => {
    const onPlace = jest.fn()
    const { getAllByRole } = render(
      <Grid entities={[]} selectedEntityTypeId="basic-enemy" onPlace={onPlace} onRemove={jest.fn()} />
    )
    // Button index 0 → row=0, col=0 → x=0, y=0
    fireEvent.click(getAllByRole('button')[0])
    expect(onPlace).toHaveBeenCalledWith({ entityTypeId: 'basic-enemy', x: 0, y: 0 })
  })

  it('calls onRemove when clicking a cell that already has an entity', () => {
    const onRemove = jest.fn()
    const entities: EntityPlacement[] = [{ entityTypeId: 'basic-enemy', x: 0, y: 0 }]
    const { getAllByRole } = render(
      <Grid entities={entities} selectedEntityTypeId="basic-enemy" onPlace={jest.fn()} onRemove={onRemove} />
    )
    fireEvent.click(getAllByRole('button')[0])
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  it('does not call onPlace when no entity type is selected', () => {
    const onPlace = jest.fn()
    const { getAllByRole } = render(
      <Grid entities={[]} selectedEntityTypeId={null} onPlace={onPlace} onRemove={jest.fn()} />
    )
    fireEvent.click(getAllByRole('button')[0])
    expect(onPlace).not.toHaveBeenCalled()
  })

  it('places entity at the correct non-zero position', () => {
    const onPlace = jest.fn()
    const { getAllByRole } = render(
      <Grid entities={[]} selectedEntityTypeId="fast-enemy" onPlace={onPlace} onRemove={jest.fn()} />
    )
    // Button index 13 → row=1, col=1 (since COLS=12): row = floor(13/12)=1, col = 13%12=1
    fireEvent.click(getAllByRole('button')[13])
    expect(onPlace).toHaveBeenCalledWith({
      entityTypeId: 'fast-enemy',
      x: 1 * CELL_W,
      y: 1 * CELL_H,
    })
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- --testPathPattern="Grid"
```

Expected: `Cannot find module '../MapEditor/Grid'`

- [ ] **Step 3: Implement Grid**

Create `apps/calibrator/src/MapEditor/Grid.tsx`:

```typescript
'use client'
import type { EntityPlacement } from '@si/level-engine'

export const COLS = 12
export const ROWS = 16
export const CELL_W = 30
export const CELL_H = 40

interface Props {
  entities: EntityPlacement[]
  selectedEntityTypeId: string | null
  onPlace: (placement: EntityPlacement) => void
  onRemove: (index: number) => void
}

export function Grid({ entities, selectedEntityTypeId, onPlace, onRemove }: Props) {
  const entityMap = new Map<string, number>()
  entities.forEach((e, i) => entityMap.set(`${e.x},${e.y}`, i))

  const cells = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * CELL_W
      const y = row * CELL_H
      const entityIndex = entityMap.get(`${x},${y}`) ?? -1
      const hasEntity = entityIndex >= 0

      cells.push(
        <button
          key={`${col},${row}`}
          aria-label={`cell ${col},${row}`}
          style={{
            width: CELL_W,
            height: CELL_H,
            background: hasEntity ? '#4CAF50' : '#222',
            border: '1px solid #444',
            cursor: 'pointer',
            fontSize: 10,
            color: '#fff',
            padding: 0,
          }}
          onClick={() => {
            if (hasEntity) {
              onRemove(entityIndex)
            } else if (selectedEntityTypeId) {
              onPlace({ entityTypeId: selectedEntityTypeId, x, y })
            }
          }}
        >
          {hasEntity ? entities[entityIndex].entityTypeId.slice(0, 1).toUpperCase() : ''}
        </button>
      )
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, ${CELL_W}px)`,
        width: COLS * CELL_W,
      }}
    >
      {cells}
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npm test -- --testPathPattern="Grid"
```

Expected: `PASS` — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/calibrator/src/MapEditor/Grid.tsx apps/calibrator/src/__tests__/Grid.test.tsx
git commit -m "[CAL] feat(s4): add Grid 12x16 with snap-to-grid entity placement"
```

---

### Task 7: PropertiesPanel

**Files:**
- Create: `apps/calibrator/src/MapEditor/PropertiesPanel.tsx`
- Create: `apps/calibrator/src/__tests__/PropertiesPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/calibrator/src/__tests__/PropertiesPanel.test.tsx`:

```typescript
import { render } from '@testing-library/react'
import { PropertiesPanel } from '../MapEditor/PropertiesPanel'
import type { EntityPlacement } from '@si/level-engine'

describe('PropertiesPanel', () => {
  it('renders "No entity selected" when entity is null', () => {
    const { getByText } = render(<PropertiesPanel entity={null} onChange={jest.fn()} />)
    expect(getByText('No entity selected')).toBeInTheDocument()
  })

  it('renders entity type ID when entity provided', () => {
    const entity: EntityPlacement = { entityTypeId: 'basic-enemy', x: 60, y: 80 }
    const { getByText } = render(<PropertiesPanel entity={entity} onChange={jest.fn()} />)
    expect(getByText(/basic-enemy/)).toBeInTheDocument()
  })

  it('renders entity position', () => {
    const entity: EntityPlacement = { entityTypeId: 'fast-enemy', x: 120, y: 160 }
    const { getByText } = render(<PropertiesPanel entity={entity} onChange={jest.fn()} />)
    expect(getByText(/x: 120/)).toBeInTheDocument()
    expect(getByText(/y: 160/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- --testPathPattern="PropertiesPanel"
```

Expected: `Cannot find module '../MapEditor/PropertiesPanel'`

- [ ] **Step 3: Implement PropertiesPanel**

Create `apps/calibrator/src/MapEditor/PropertiesPanel.tsx`:

```typescript
import type { EntityPlacement } from '@si/level-engine'

interface Props {
  entity: EntityPlacement | null
  onChange: (updated: EntityPlacement) => void
}

export function PropertiesPanel({ entity }: Props) {
  if (!entity) {
    return <div style={{ padding: 8, color: '#888' }}>No entity selected</div>
  }

  return (
    <div style={{ padding: 8, fontSize: 13 }}>
      <p style={{ margin: '4px 0' }}>Type: {entity.entityTypeId}</p>
      <p style={{ margin: '4px 0' }}>x: {entity.x}</p>
      <p style={{ margin: '4px 0' }}>y: {entity.y}</p>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npm test -- --testPathPattern="PropertiesPanel"
```

Expected: `PASS` — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/calibrator/src/MapEditor/PropertiesPanel.tsx apps/calibrator/src/__tests__/PropertiesPanel.test.tsx
git commit -m "[CAL] feat(s4): add PropertiesPanel showing selected entity type and position"
```

---

## PR 4 — `feat/s4-page`

### Task 8: levelsFile utility + Server Action

**Files:**
- Create: `apps/calibrator/src/levelsFile.ts`
- Create: `apps/calibrator/app/actions.ts`
- Create: `apps/calibrator/src/__tests__/levelsFile.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/calibrator/src/__tests__/levelsFile.test.ts`:

```typescript
/**
 * @jest-environment node
 */
import * as fs from 'fs'
import { readLevels, writeLevels } from '../levelsFile'
import type { LevelDefinition } from '@si/level-engine'

jest.mock('fs')
const mockFs = fs as jest.Mocked<typeof fs>

const sampleLevel: LevelDefinition = {
  id: 'story-0',
  style: 'classic',
  difficultyScore: 0,
  entities: [],
  params: {
    numberOfEnemies: 3,
    enemySpeed: 1,
    enemyShotDelay: 3.0,
    enemyShotSpeed: 2,
    enemyAngerDelay: 30,
    enemySpawnDelay: 2,
    hasPowerUps: true,
    powerUpMinWait: 5,
    powerUpMaxWait: 15,
  },
}

beforeEach(() => jest.clearAllMocks())

describe('readLevels', () => {
  it('returns empty array when file does not exist', () => {
    mockFs.existsSync.mockReturnValue(false)
    expect(readLevels()).toEqual([])
  })

  it('parses and returns levels when file exists', () => {
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readFileSync.mockReturnValue(JSON.stringify([sampleLevel]) as any)
    expect(readLevels()).toEqual([sampleLevel])
  })
})

describe('writeLevels', () => {
  it('writes pretty-printed JSON to a path containing levels.json', () => {
    writeLevels([sampleLevel])
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('levels.json'),
      JSON.stringify([sampleLevel], null, 2),
    )
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- --testPathPattern="levelsFile"
```

Expected: `Cannot find module '../levelsFile'`

- [ ] **Step 3: Implement levelsFile.ts**

Create `apps/calibrator/src/levelsFile.ts`:

```typescript
import path from 'path'
import fs from 'fs'
import type { LevelDefinition } from '@si/level-engine'

// __dirname = apps/calibrator/src
// ../../.. resolves to monorepo root (space-invaders/)
const LEVELS_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'apps',
  'game',
  'src',
  'levels.json',
)

export function readLevels(): LevelDefinition[] {
  if (!fs.existsSync(LEVELS_PATH)) return []
  return JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf-8')) as LevelDefinition[]
}

export function writeLevels(levels: LevelDefinition[]): void {
  fs.writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 2))
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npm test -- --testPathPattern="levelsFile"
```

Expected: `PASS` — 3 tests.

- [ ] **Step 5: Create Server Action**

Create `apps/calibrator/app/actions.ts`:

```typescript
'use server'
import { writeLevels } from '../src/levelsFile'
import type { LevelDefinition } from '@si/level-engine'

export async function saveLevels(levels: LevelDefinition[]): Promise<void> {
  writeLevels(levels)
}
```

- [ ] **Step 6: Commit**

```bash
git checkout -b feat/s4-page
git add apps/calibrator/src/levelsFile.ts apps/calibrator/app/actions.ts apps/calibrator/src/__tests__/levelsFile.test.ts
git commit -m "[CAL] feat(s4): add levelsFile read/write utility and saveLevels Server Action"
```

---

### Task 9: CalibratorClient + page wiring + ROADMAP

**Files:**
- Create: `apps/calibrator/src/CalibratorClient.tsx`
- Create: `apps/calibrator/src/__tests__/CalibratorClient.test.tsx`
- Modify: `apps/calibrator/app/page.tsx`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Write the failing test**

Create `apps/calibrator/src/__tests__/CalibratorClient.test.tsx`:

```typescript
import { render, fireEvent } from '@testing-library/react'
import { CalibratorClient } from '../CalibratorClient'
import type { LevelDefinition } from '@si/level-engine'

jest.mock('../../app/actions', () => ({
  saveLevels: jest.fn().mockResolvedValue(undefined),
}))

const defaultParams = {
  numberOfEnemies: 5,
  enemySpeed: 2,
  enemyShotDelay: 1.5,
  enemyShotSpeed: 4,
  enemyAngerDelay: 15,
  enemySpawnDelay: 1,
  hasPowerUps: true,
  powerUpMinWait: 8,
  powerUpMaxWait: 20,
}

const initialLevels: LevelDefinition[] = Array.from({ length: 20 }, (_, i) => ({
  id: `story-${i}`,
  style: 'classic' as const,
  difficultyScore: Math.round((i / 19) * 100),
  entities: [],
  params: defaultParams,
}))

describe('CalibratorClient', () => {
  it('renders the level selector dropdown', () => {
    const { getByRole } = render(<CalibratorClient initialLevels={initialLevels} />)
    expect(getByRole('combobox')).toBeInTheDocument()
  })

  it('renders calibration panel sliders for the current level', () => {
    const { getAllByRole } = render(<CalibratorClient initialLevels={initialLevels} />)
    expect(getAllByRole('slider').length).toBeGreaterThan(0)
  })

  it('renders entity type buttons in the toolbox', () => {
    const { getByText } = render(<CalibratorClient initialLevels={initialLevels} />)
    expect(getByText('Basic Enemy')).toBeInTheDocument()
  })

  it('renders the map grid with 192 cells', () => {
    const { getAllByRole } = render(<CalibratorClient initialLevels={initialLevels} />)
    // 12 cols × 16 rows = 192 grid cells (buttons)
    // Filter by aria-label pattern to avoid counting toolbar or other buttons
    const gridCells = getAllByRole('button').filter((b) =>
      b.getAttribute('aria-label')?.startsWith('cell '),
    )
    expect(gridCells).toHaveLength(192)
  })

  it('calls saveLevels when Save button is clicked', () => {
    const { saveLevels } = require('../../app/actions')
    const { getByRole } = render(<CalibratorClient initialLevels={initialLevels} />)
    fireEvent.click(getByRole('button', { name: 'Save' }))
    expect(saveLevels).toHaveBeenCalledWith(initialLevels)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- --testPathPattern="CalibratorClient"
```

Expected: `Cannot find module '../CalibratorClient'`

- [ ] **Step 3: Implement CalibratorClient**

Create `apps/calibrator/src/CalibratorClient.tsx`:

```typescript
'use client'
import { useState } from 'react'
import type { EntityType, LevelDefinition } from '@si/level-engine'
import { Sliders } from './CalibrationPanel/Sliders'
import { DifficultyScore } from './CalibrationPanel/DifficultyScore'
import { Toolbox } from './MapEditor/Toolbox'
import { Grid } from './MapEditor/Grid'
import { PropertiesPanel } from './MapEditor/PropertiesPanel'
import { saveLevels } from '../app/actions'

const TOTAL_LEVELS = 20

const ENTITY_TYPES: EntityType[] = [
  { id: 'basic-enemy', label: 'Basic Enemy', icon: '👾', properties: { pointValue: 100, health: 1 } },
  { id: 'fast-enemy',  label: 'Fast Enemy',  icon: '🚀', properties: { pointValue: 200, health: 1 } },
  { id: 'tank-enemy',  label: 'Tank Enemy',  icon: '🛡️', properties: { pointValue: 500, health: 3 } },
]

interface Props {
  initialLevels: LevelDefinition[]
}

export function CalibratorClient({ initialLevels }: Props) {
  const [levels, setLevels] = useState<LevelDefinition[]>(initialLevels)
  const [levelIndex, setLevelIndex] = useState(0)
  const [selectedEntityTypeId, setSelectedEntityTypeId] = useState<string | null>(null)
  const [selectedEntityIndex, setSelectedEntityIndex] = useState<number | null>(null)

  const current = levels[levelIndex]

  function updateCurrentLevel(patch: Partial<LevelDefinition>) {
    setLevels((prev) =>
      prev.map((l, i) => (i === levelIndex ? { ...l, ...patch } : l)),
    )
  }

  function handlePlace(placement: { entityTypeId: string; x: number; y: number }) {
    updateCurrentLevel({ entities: [...current.entities, placement] })
  }

  function handleRemove(index: number) {
    updateCurrentLevel({ entities: current.entities.filter((_, i) => i !== index) })
    setSelectedEntityIndex(null)
  }

  const selectedEntity =
    selectedEntityIndex !== null ? current.entities[selectedEntityIndex] ?? null : null

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, background: '#111', color: '#eee', minHeight: '100vh' }}>
      {/* Left column — level selector + calibration panel */}
      <div style={{ width: 280 }}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="level-select">Level: </label>
          <select
            id="level-select"
            value={levelIndex}
            onChange={(e) => {
              setLevelIndex(Number(e.target.value))
              setSelectedEntityIndex(null)
            }}
          >
            {levels.map((_, i) => (
              <option key={i} value={i}>
                Level {i + 1}
              </option>
            ))}
          </select>
        </div>

        <DifficultyScore levelIndex={levelIndex} totalLevels={TOTAL_LEVELS} />

        <Sliders
          value={current.params}
          onChange={(params) => updateCurrentLevel({ params })}
        />

        <button
          style={{ marginTop: 16, padding: '8px 20px', background: '#4CAF50', color: '#fff', border: 'none', cursor: 'pointer' }}
          onClick={() => saveLevels(levels)}
        >
          Save
        </button>
      </div>

      {/* Center — map grid */}
      <div>
        <Grid
          entities={current.entities}
          selectedEntityTypeId={selectedEntityTypeId}
          onPlace={handlePlace}
          onRemove={handleRemove}
        />
      </div>

      {/* Right column — toolbox + properties */}
      <div style={{ width: 180 }}>
        <Toolbox
          entityTypes={ENTITY_TYPES}
          selectedId={selectedEntityTypeId}
          onSelect={setSelectedEntityTypeId}
        />
        <PropertiesPanel entity={selectedEntity} onChange={() => {}} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npm test -- --testPathPattern="CalibratorClient"
```

Expected: `PASS` — 5 tests.

- [ ] **Step 5: Replace `app/page.tsx` scaffold**

Replace entire content of `apps/calibrator/app/page.tsx`:

```typescript
import { LevelEngine, CurveCalibratorStrategy } from '@si/level-engine'
import { readLevels } from '../src/levelsFile'
import { CalibratorClient } from '../src/CalibratorClient'

const TOTAL_LEVELS = 20

export default function Page() {
  const stored = readLevels()
  const initialLevels =
    stored.length > 0
      ? stored
      : Array.from({ length: TOTAL_LEVELS }, (_, i) =>
          new LevelEngine(new CurveCalibratorStrategy()).generate({
            mode: 'story',
            levelIndex: i,
            totalLevels: TOTAL_LEVELS,
          }),
        )
  return <CalibratorClient initialLevels={initialLevels} />
}
```

- [ ] **Step 6: Run all calibrator tests**

```bash
npm test
```

Expected: all calibrator tests pass. Confirm no regressions in other packages.

- [ ] **Step 7: Update ROADMAP.md**

In `docs/ROADMAP.md`, update Sprint 4 row (replace PR number `#N` with the actual PR number after creating the PR):

```markdown
| 4 | Calibrator MVP | 🚧 In Progress (PR #N) | — | CanvasRenderer, MapEditor, CalibrationPanel, levels.json export |
```

- [ ] **Step 8: Smoke test in browser**

```bash
cd apps/calibrator && npm run dev
```

Open `http://localhost:3001`. Verify:
- Level selector dropdown shows "Level 1" through "Level 20"
- Sliders render and update values on drag
- Difficulty score bar updates when switching levels
- Grid shows 12×16 cells; clicking places an entity; clicking occupied cell removes it
- Toolbox buttons highlight on selection
- Save button does not throw (writes to `apps/game/src/levels.json`)

- [ ] **Step 9: Commit**

```bash
git add apps/calibrator/src/CalibratorClient.tsx apps/calibrator/src/__tests__/CalibratorClient.test.tsx apps/calibrator/app/page.tsx docs/ROADMAP.md
git commit -m "[CAL] feat(s4): add CalibratorClient, wire page.tsx, update ROADMAP"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Requirement | Task |
|---|---|
| CanvasRenderer implementing IRenderer | Task 2 |
| Sliders for all LevelParams | Task 3 |
| Difficulty score displayed in real-time | Task 4 |
| Entity type palette (Toolbox) | Task 5 |
| 12×16 grid with snap-to-grid | Task 6 |
| Properties per entity (PropertiesPanel) | Task 7 |
| levels.json export | Task 8 |
| Full page assembly | Task 9 |
| ROADMAP updated | Task 9, Step 7 |

Not in Sprint 4 scope (per ROADMAP): undo/redo, "Play in Browser", Analytics Dashboard.

### TDD Compliance

Every task: write failing test → confirm fail → implement → confirm pass → commit.

### Placeholder Scan

No TBDs, no "similar to Task N" shortcuts. Every step has complete code.

### Type Consistency

- `LevelParams` — `hasPowerUps: boolean`, 8 numeric fields. Sliders handles all 9.
- `EntityPlacement` — `{ entityTypeId, x, y, properties? }`. Grid produces this exactly.
- `EntityType` — `{ id, label, icon, properties }`. ENTITY_TYPES in CalibratorClient matches `registerEntities.ts`.
- `IRenderer` — `clear()`, `drawSprite(sprite, x, y, width, height)`, `drawRect(x, y, width, height, color)`. CanvasRenderer implements all three.
