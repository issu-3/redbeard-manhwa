import 'dotenv/config'
import { defineConfig } from '@prisma/config'

const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: url!,
  },
})
