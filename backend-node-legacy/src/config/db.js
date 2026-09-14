import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const isProduction = process.env.NODE_ENV === 'production'
const connectionString = process.env.DATABASE_URL

const poolConfig = {
  connectionString,
}

// Automatically configure SSL if needed for cloud PostgreSQL (Render, Supabase, Neon, etc.)
if (
  connectionString &&
  (isProduction ||
    connectionString.includes('render.com') ||
    connectionString.includes('supabase.co') ||
    connectionString.includes('neon.tech') ||
    connectionString.includes('sslmode=require'))
) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  }
}

export const pool = new Pool(poolConfig)

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err)
})

export async function query(text, params) {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    if (process.env.DEBUG_SQL === 'true') {
      console.log('Executed query:', { text, duration, rows: res.rowCount })
    }
    return res
  } catch (error) {
    console.error('Database query error:', { text, error: error.message })
    throw error
  }
}

export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() as current_time')
    console.log(' PostgreSQL connected successfully at:', res.rows[0].current_time)
    return true
  } catch (error) {
    console.warn(' PostgreSQL connection warning:', error.message)
    console.warn('  Ensure DATABASE_URL is set in your .env or Render dashboard.')
    return false
  }
}
