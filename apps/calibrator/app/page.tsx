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
