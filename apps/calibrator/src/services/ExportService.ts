import path from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { validateLevels } from '@si/level-engine'
import prisma from '../lib/prisma'
import { EntityTypeSchema } from '../lib/schemas'
import { worldToLevelDefinitions, type PlainWorld, type PlainPhase, type PlainLevel, type PlainWave } from './worldToLevelDefinitions'

// process.cwd() = apps/calibrator/ when running Next.js / Jest from that directory
const OUTPUT_PATH = path.join(process.cwd(), '..', 'game', 'src', 'levels.json')

// Raised when the canonical fence rejects the artifact. Carries a safe, PT-BR
// summary built to be shown to the user — distinct from unexpected I/O/Prisma
// errors so the action can let this message through verbatim.
export class LevelExportValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LevelExportValidationError'
  }
}

// Single source of truth for the entity ids the game knows — derived from the
// Zod enum, never a parallel hardcoded list.
const KNOWN_TYPE_IDS = new Set<string>(EntityTypeSchema.options)

export async function exportToJson(worldId: number): Promise<string> {
  const world = await prisma.world.findUniqueOrThrow({
    where: { id: worldId },
    include: {
      phases: {
        orderBy: { index: 'asc' },
        include: {
          levels: {
            orderBy: { index: 'asc' },
            include: { waves: { orderBy: { order: 'asc' } } },
          },
        },
      },
    },
  })
  const plainWorld: PlainWorld = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    phases: (world.phases as any[]).map((phase): PlainPhase => ({
      index: phase.index,
      status: phase.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      levels: (phase.levels as any[]).map((level): PlainLevel => ({
        index: level.index,
        enemySpeed: level.enemySpeed,
        shotDelay: level.shotDelay,
        fuelDrain: level.fuelDrain,
        enemyShotSpeed: level.enemyShotSpeed,
        enemyAngerDelay: level.enemyAngerDelay,
        enemySpawnDelay: level.enemySpawnDelay,
        hasPowerUps: level.hasPowerUps,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        waves: (level.waves as any[]).map((wave): PlainWave => ({
          order: wave.order,
          delay: wave.delay,
          grid: wave.grid as (string | null)[][],
        })),
      })),
    })),
  }
  const levels = worldToLevelDefinitions(plainWorld)

  // Publication gate — nunca sobrescreve o levels.json com um artefato vazio.
  // Se há fases mas nenhuma está publicada, aborta sem tocar no arquivo.
  if (levels.length === 0 && plainWorld.phases.length > 0) {
    throw new LevelExportValidationError(
      'Nenhuma fase publicada pra exportar — publique ao menos uma fase antes de exportar',
    )
  }

  // Canonical fence — nunca publica um artefato que o motor do jogo reprova.
  // Valida ANTES de escrever; se houver erros, aborta sem tocar no arquivo.
  const validationErrors = validateLevels(levels, KNOWN_TYPE_IDS)
  if (validationErrors.length > 0) {
    const summary = validationErrors
      .slice(0, 5)
      .map((e) => `${e.levelId}: ${e.message}`)
      .join('; ')
    throw new LevelExportValidationError(
      `A validacao do levels.json falhou e o arquivo nao foi gravado (${validationErrors.length} erro(s)): ${summary}`,
    )
  }

  try {
    mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
    writeFileSync(OUTPUT_PATH, JSON.stringify(levels, null, 2))
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao gravar o arquivo levels.json')
  }
  return OUTPUT_PATH
}
