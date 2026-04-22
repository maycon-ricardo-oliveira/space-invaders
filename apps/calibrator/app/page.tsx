import { LevelEngine, CurveCalibratorStrategy } from '@si/level-engine'
import { readLevels } from '../src/levelsFile'
import { CalibratorClient } from '../src/CalibratorClient'
import { defaultPlacements } from '../src/defaultPlacements'

const TOTAL_LEVELS = 20

export default function Page() {
  const stored = readLevels()
  const initialLevels =
    stored.length > 0
      ? stored
      : (() => {
          const engine = new LevelEngine(new CurveCalibratorStrategy())
          return Array.from({ length: TOTAL_LEVELS }, (_, i) => {
            const level = engine.generate({ mode: 'story', levelIndex: i, totalLevels: TOTAL_LEVELS })
            level.entities = defaultPlacements(level.params.numberOfEnemies)
            return level
          })
        })()
  return <CalibratorClient initialLevels={initialLevels} />
}
