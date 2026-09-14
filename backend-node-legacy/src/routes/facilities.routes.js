import { Router } from 'express'
import { getFacilities, createFacility } from '../controllers/facilities.controller.js'
import { authenticateToken, requireHospital, optionalAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', optionalAuth, getFacilities)
router.post('/', authenticateToken, requireHospital, createFacility)

export default router
