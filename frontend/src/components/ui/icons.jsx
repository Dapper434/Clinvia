// The prototype's hand-drawn icons, as components.
const S = (props) => <svg fill="none" stroke="currentColor" aria-hidden="true" {...props} />

export const Plus = () => <S width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></S>
export const Check = () => <S width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></S>
export const Person = () => <S width="10" height="10" viewBox="0 0 24 24" strokeWidth="2.6"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></S>
export const Back = () => <S width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></S>
export const Search = () => <S width="15" height="15" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></S>
export const Close = () => <S width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></S>
export const Left = () => <S width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></S>
export const Right = () => <S width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></S>
export const Menu = () => <S width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></S>
export const Mark = () => <S width="16" height="16" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></S>

const N = (props) => <S width="17" height="17" viewBox="0 0 24 24" strokeWidth="1.8" {...props} />
export const NavDashboard = () => <N><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></N>
export const NavPatients = () => <N><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><circle cx="17.5" cy="9" r="2.5" /><path d="M16.5 14.6c2.6.2 4.4 1.9 5 5" /></N>
export const NavAppointments = () => <N><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></N>
export const NavAdmissions = () => <N><path d="M3 18V7M21 18v-5a3 3 0 0 0-3-3h-8v8M3 14h18" /><circle cx="7" cy="11" r="1.6" /></N>
export const NavDoses = () => <N><rect x="4" y="9" width="16" height="7" rx="3.5" transform="rotate(-45 12 12.5)" /><path d="M9.5 10l5 5" /></N>
export const NavMap = () => <N><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" /></N>
export const NavReports = () => <N><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></N>
export const NavStaff = () => <N><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></N>
export const NavNetwork = () => <N><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="18" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="M12 7.5v4M12 11.5l-5.5 4.5M12 11.5l5.5 4.5" /></N>
export const NavDirectory = () => <N><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5M8.5 12.5c.5-1.4 1.4-2 2.5-2s2 .6 2.5 2M11 8.2h.01" /></N>
export const NavSettings = () => <N><path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M1 14h6M9 8h6M17 16h6" /></N>
