import { createClient } from '@libsql/client/web'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

// Nitro's bundler resolves @libsql/client to the browser/edge build, which
// expects an https:// URL. Convert from the libsql:// scheme Turso provides.
const url = (process.env.TURSO_DATABASE_URL ?? '').replace('libsql://', 'https://')

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client, { schema })
