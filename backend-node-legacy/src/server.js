import app from './app.js'
import { testConnection, pool } from './config/db.js'

const PORT = process.env.PORT || 5000

async function startServer() {
  console.log('----------------------------------------------------')
  console.log(' Starting TBTrack Backend Service on Render/Local...')
  console.log('----------------------------------------------------')

  await testConnection()

  const server = app.listen(PORT, () => {
    console.log(` TBTrack Backend Server is running on port ${PORT}`)
    console.log(` Health check URL: http://localhost:${PORT}/health`)
  })

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n Received ${signal}. Closing HTTP server and PostgreSQL pool...`)
    server.close(async () => {
      await pool.end()
      console.log(' PostgreSQL pool closed. Process terminated.')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

startServer().catch((err) => {
  console.error('Fatal error during backend startup:', err)
  process.exit(1)
})
