import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool, query } from '../config/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runSeed() {
  console.log('Running database schema migration and seed...')

  try {
    const schemaPath = path.join(__dirname, '../../database/schema.sql')
    const seedPath = path.join(__dirname, '../../database/seed.sql')

    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    const seedSql = fs.readFileSync(seedPath, 'utf8')

    console.log('Applying database schema...')
    await query(schemaSql)
    console.log('Schema applied successfully.')

    console.log('Inserting seed records...')
    await query(seedSql)
    console.log('Seed records inserted successfully.')

    console.log('Database initialization complete!')
  } catch (err) {
    console.error('Failed to run database seed:', err)
  } finally {
    await pool.end()
  }
}

runSeed()
