import { Router } from 'express'
import { getContacts, createContact, updateContact } from '../controllers/contacts.controller.js'
import { authenticateToken, requireHospital } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

router.get('/', requireHospital, getContacts)
router.post('/', requireHospital, createContact)
router.patch('/:id', requireHospital, updateContact)

export default router
