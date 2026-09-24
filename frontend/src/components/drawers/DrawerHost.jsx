import { useShell } from '../shell/shellContext.js'
import { AdmitDrawer, BookDrawer, WalkinDrawer } from './ClinicDrawers.jsx'
import { StaffDrawer, WardDrawer } from './AdminDrawers.jsx'
import { ContactDrawer, EditPatientDrawer, LabDrawer, PrescribeDrawer, TbDrawer, UploadDrawer } from './RecordDrawers.jsx'

const KINDS = {
  book: BookDrawer,
  admit: AdmitDrawer,
  walkin: WalkinDrawer,
  staff: StaffDrawer,
  ward: WardDrawer,
  prescribe: PrescribeDrawer,
  lab: LabDrawer,
  contact: ContactDrawer,
  upload: UploadDrawer,
  tb: TbDrawer,
  editPatient: EditPatientDrawer,
}

const todayLocal = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Renders whichever drawer is open; a successful save shows a toast and refreshes the page data. */
export default function DrawerHost({ drawer }) {
  const { closeDrawer, toast, bump } = useShell()
  const Component = KINDS[drawer.kind]
  if (!Component) return null
  const done = (msg) => {
    closeDrawer()
    if (msg) toast(msg)
    bump()
  }
  return <Component today={todayLocal()} {...drawer.props} done={done} close={closeDrawer} />
}
