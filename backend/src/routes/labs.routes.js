import { Router } from 'express'
import { getLabs, createLab } from '../controllers/labs.controller.js'
import { authenticateToken, requireHospital } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

router.get('/', getLabs)
router.post('/', requireHospital, createLab)

export default router
