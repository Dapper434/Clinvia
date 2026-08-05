import { Router } from 'express'
import { getReports } from '../controllers/reports.controller.js'
import { authenticateToken, requireHospital } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)
router.use(requireHospital)

router.get('/', getReports)

export default router
