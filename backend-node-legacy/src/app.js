import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.routes.js'
import patientsRoutes from './routes/patients.routes.js'
import doseLogsRoutes from './routes/doseLogs.routes.js'
import labsRoutes from './routes/labs.routes.js'
import contactsRoutes from './routes/contacts.routes.js'
import facilitiesRoutes from './routes/facilities.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import reportsRoutes from './routes/reports.routes.js'
import portalRoutes from './routes/portal.routes.js'
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js'

dotenv.config()

const app = express()

// Dynamic CORS configuration allowing localhost and Vercel deployments
const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000'
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim())

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true)
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true)
      }
      return callback(null, true) // Permissive fallback for hackathons/dev
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// Health Check for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'tbtrack-backend',
    environment: process.env.NODE_ENV || 'development',
  })
})

// Root Welcome Route
app.get('/', (req, res) => {
  res.json({
    name: 'TBTrack REST API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/docs',
    health: '/health',
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/patients', patientsRoutes)
app.use('/api/dose-logs', doseLogsRoutes)
app.use('/api/labs', labsRoutes)
app.use('/api/contacts', contactsRoutes)
app.use('/api/facilities', facilitiesRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/patient-portal', portalRoutes)

// 404 & Error Handlers
app.use(notFoundHandler)
app.use(globalErrorHandler)

export default app
