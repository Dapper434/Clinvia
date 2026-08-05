import { Router } from 'express'
import { getMyTreatment, logMyDose } from '../controllers/portal.controller.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

router.get('/my-treatment', getMyTreatment)
router.post('/log-dose', logMyDose)

export default router
