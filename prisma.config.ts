import 'dotenv/config'
import { defineConfig } from '@prisma/config'

const url = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
const directUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || url;

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: url!,
    directUrl: directUrl!,
  },
})
