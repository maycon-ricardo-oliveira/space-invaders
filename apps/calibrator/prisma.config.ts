import path from 'node:path'
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

// prisma.config.ts uses Prisma CLI-specific fields (migrate.adapter) not yet in @prisma/config types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = {
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    async adapter() {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const connectionString = process.env.DATABASE_URL!
      return new PrismaPg({ connectionString })
    },
  },
}

export default defineConfig(config)
