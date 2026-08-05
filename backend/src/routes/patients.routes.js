import { Router } from 'express'
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
} from '../controllers/patients.controller.js'
import { authenticateToken, requireHospital } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

router.get('/', requireHospital, getPatients)
router.get('/:id', requireHospital, getPatientById)
router.post('/', requireHospital, createPatient)
router.patch('/:id', requireHospital, updatePatient)
router.put('/:id', requireHospital, updatePatient)
router.delete('/:id', requireHospital, deletePatient)

export default router
