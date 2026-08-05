import { Router } from 'express'
import { getDashboardStats } from '../controllers/dashboard.controller.js'
import { authenticateToken, requireHospital } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)
router.use(requireHospital)

router.get('/stats', getDashboardStats)

export default router
