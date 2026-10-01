/** How the TB classification and the prescribing forms are labelled.
 *
 * The values match what the backend accepts; the regimen and the doses themselves are
 * always worked out server-side (app/prescribing.py) so there is one set of clinical
 * rules rather than two.
 */

export const TB_SITES = [
  ['pulmonary', 'Pulmonary', 'In the lungs'],
  ['extra_pulmonary', 'Extra-pulmonary', 'Somewhere other than the lungs'],
]

export const EPTB_SITES = [
  ['pleural', 'Pleural'],
  ['lymph_node', 'Lymph node'],
  ['spine_bone', 'Spine or bone'],
  ['meningeal', 'Meningeal (brain)'],
  ['abdominal', 'Abdominal'],
  ['pericardial', 'Pericardial (heart)'],
  ['miliary', 'Miliary or disseminated'],
]

export const DIAGNOSIS_BASES = [
  ['bacteriological', 'Bacteriologically confirmed', 'GeneXpert, smear or culture positive'],
  ['clinical', 'Clinically diagnosed', 'Treated on X-ray and symptoms alone'],
]

export const TREATMENT_HISTORIES = [
  ['new', 'New', 'Never treated, or treated for under a month'],
  ['relapse', 'Relapse', 'Treated before and declared cured or completed'],
  ['after_failure', 'Treatment after failure', 'Last course ended in failure'],
  ['after_ltfu', 'Treatment after loss to follow-up', 'Came back after stopping'],
  ['other', 'Other previously treated', 'Treated before, outcome unknown'],
]

export const RESISTANCE_LEVELS = [
  ['susceptible', 'Drug-susceptible', 'First-line drugs still work'],
  ['rr', 'Rifampicin resistant (RR)', 'Rifampicin resistance on GeneXpert'],
  ['mdr', 'Multidrug resistant (MDR)', 'Resistant to rifampicin and isoniazid'],
  ['pre_xdr', 'Pre-XDR', 'MDR plus fluoroquinolone resistance'],
  ['xdr', 'Extensively drug resistant (XDR)', 'Needs an individualised regimen'],
]

/** The blank classification a new episode starts from. */
export const blankClassification = () => ({
  type: 'pulmonary', eptbSite: '', diagnosis: 'bacteriological', history: 'new',
  resistance: 'susceptible',
})

const label = (list, value) => list.find(([v]) => v === value)?.[1] || null

export const siteLabel = (v) => label(TB_SITES, v)
export const eptbSiteLabel = (v) => label(EPTB_SITES, v)
export const diagnosisLabel = (v) => label(DIAGNOSIS_BASES, v)
export const historyLabel = (v) => label(TREATMENT_HISTORIES, v)
export const resistanceLabel = (v) => label(RESISTANCE_LEVELS, v)

/** One line describing how a case is classified, for the top of a patient record. */
export function classificationLine(episode) {
  if (!episode) return ''
  const site = episode.type === 'extra_pulmonary' && episode.eptbSite
    ? `${eptbSiteLabel(episode.eptbSite)} TB`
    : `${siteLabel(episode.type)} TB`
  return [site, historyLabel(episode.history), resistanceLabel(episode.resistance)]
    .filter(Boolean).join(' · ')
}

/** Standard doses for the drugs prescribed outside the TB regimen. */
export const DRUG_CATALOG = [
  ['Amoxicillin', ['250 mg', '500 mg', '1 g'], '8 hourly'],
  ['Amlodipine', ['5 mg', '10 mg'], 'Once daily'],
  ['Azithromycin', ['250 mg', '500 mg'], 'Once daily'],
  ['Ceftriaxone', ['1 g', '2 g'], '12 hourly'],
  ['Cotrimoxazole', ['480 mg', '960 mg'], 'Once daily'],
  ['Doxycycline', ['100 mg'], '12 hourly'],
  ['Ferrous sulphate', ['200 mg'], 'Once daily'],
  ['Ibuprofen', ['200 mg', '400 mg'], '8 hourly'],
  ['Metformin', ['500 mg', '850 mg', '1 g'], '12 hourly'],
  ['Metronidazole', ['200 mg', '400 mg'], '8 hourly'],
  ['Omeprazole', ['20 mg', '40 mg'], 'Once daily'],
  ['Paracetamol', ['500 mg', '1 g'], '6 hourly'],
  ['Prednisolone', ['5 mg', '20 mg'], 'Once daily'],
  ['Pyridoxine (vitamin B6)', ['12.5 mg', '25 mg', '50 mg'], 'Once daily'],
  ['Salbutamol inhaler', ['2 puffs'], 'When needed'],
]

export const DEFAULT_FREQUENCIES = [
  'Once daily', '12 hourly', '8 hourly', '6 hourly', '4 hourly',
  '3 times weekly', 'Twice weekly', 'Weekly', 'At night', 'When needed',
]
