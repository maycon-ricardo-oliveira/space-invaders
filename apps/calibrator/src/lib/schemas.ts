import { z } from 'zod'

export const EntityTypeSchema = z.enum(['grunt', 'rocket', 'shield', 'rock'])
export type EntityType = z.infer<typeof EntityTypeSchema>

export const GridSchema = z.array(z.array(EntityTypeSchema.nullable()))
export type Grid = z.infer<typeof GridSchema>

export const LevelParamsSchema = z.object({
  enemySpeed:      z.number().min(1).max(5),
  shotDelay:       z.number().min(0.5).max(3.0),
  fuelDrain:       z.number().min(1).max(20),
  enemyShotSpeed:  z.number().min(2).max(8),
  enemyAngerDelay: z.number().min(5).max(30),
  enemySpawnDelay: z.number().min(0.3).max(2),
  hasPowerUps:     z.boolean(),
})
export type LevelParams = z.infer<typeof LevelParamsSchema>

export const WaveInputSchema = z.object({
  order: z.number().int().min(1).max(10),
  delay: z.number().min(0).max(30),
  grid:  GridSchema,
})
export type WaveInput = z.infer<typeof WaveInputSchema>

export const PatternInputSchema = z.object({
  name: z.string().min(1).max(50),
  grid: GridSchema,
})
export type PatternInput = z.infer<typeof PatternInputSchema>

export const WorldInputSchema = z.object({
  name:          z.string().min(1).max(100),
  index:         z.number().int().min(0),
  image:         z.string().optional(),
  parallaxTheme: z.string().optional(),
})
export type WorldInput = z.infer<typeof WorldInputSchema>

export const PhaseInputSchema = z.object({
  name:  z.string().min(1).max(100),
  index: z.number().int().min(0).max(9),
})
export type PhaseInput = z.infer<typeof PhaseInputSchema>

export const LevelInputSchema = z.object({
  name:  z.string().min(1).max(100),
  index: z.number().int().min(0).max(9),
  ...LevelParamsSchema.shape,
})
export type LevelInput = z.infer<typeof LevelInputSchema>
