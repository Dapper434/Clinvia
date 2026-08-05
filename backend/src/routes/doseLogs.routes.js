import { Router } from 'express'
import { getDoseLogs, upsertDoseLog } from '../controllers/doseLogs.controller.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

router.get('/', getDoseLogs)
router.post('/', upsertDoseLog)
router.post('/upsert', upsertDoseLog)

export default router
