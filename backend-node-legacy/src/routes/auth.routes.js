import { Router } from 'express'
import { registerHospital, registerPatient, login, getMe } from '../controllers/auth.controller.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.post('/register/hospital', registerHospital)
router.post('/register/patient', registerPatient)
router.post('/login', login)
router.get('/me', authenticateToken, getMe)

export default router
