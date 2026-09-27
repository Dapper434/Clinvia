"""How a TB case is classified, which regimen that implies, and the exact doses for it.

The doctor records the classification — where the disease is, how it was confirmed,
whether the patient has been treated before, and what drug-susceptibility testing
showed. The regimen follows from that classification and the doses follow from the
patient's weight, so both are derived here rather than typed in. The register, the
patient record and the prescription drawer all read this one module and therefore
always agree.

Weight bands, fixed-dose combinations and regimen lengths follow the WHO consolidated
guidelines on tuberculosis treatment and Kenya's NTLD-P guidelines. Everything returned
here is a proposal a prescriber reviews: each line stays editable before it is saved,
and `warnings` carries the cases the system must not decide on its own.
"""
import re

# ------------------------------------------------------------------ classification
TB_SITES = ("pulmonary", "extra_pulmonary")
EPTB_SITES = (
    "pleural", "lymph_node", "spine_bone", "meningeal", "abdominal", "pericardial", "miliary",
)
DIAGNOSIS_BASES = ("bacteriological", "clinical")
TREATMENT_HISTORIES = ("new", "relapse", "after_failure", "after_ltfu", "other")
RESISTANCE_LEVELS = ("susceptible", "rr", "mdr", "pre_xdr", "xdr")

# Rifampicin resistance is what moves a patient off the first-line regimen.
RESISTANT = ("rr", "mdr", "pre_xdr", "xdr")
# TB of the brain or the spine is treated for a year rather than six months.
EXTENDED_EPTB_SITES = ("meningeal", "spine_bone")
# WHO recommends the 6-month BPaLM/BPaL regimens from 14 years of age.
BPAL_MIN_AGE = 14

REGIMENS = {
    "2HRZE/4HR": {
        "label": "2HRZE/4HR",
        "description": "First-line, six months",
        "intensive_days": 56,
        "total_days": 182,
    },
    "2HRZE/10HR": {
        "label": "2HRZE/10HR",
        "description": "First-line, extended to twelve months",
        "intensive_days": 56,
        "total_days": 364,
    },
    "BPaLM": {
        "label": "BPaLM",
        "description": "Bedaquiline, pretomanid, linezolid, moxifloxacin — six months",
        "intensive_days": None,
        "total_days": 182,
    },
    "BPaL": {
        "label": "BPaL",
        "description": "Bedaquiline, pretomanid, linezolid — six months",
        "intensive_days": None,
        "total_days": 182,
    },
    "individualised": {
        "label": "Individualised",
        "description": "Built case by case with the drug-resistant TB team",
        "intensive_days": None,
        "total_days": None,
    },
}


def regimen_for(site, eptb_site=None, resistance="susceptible", age=None):
    """The regimen a classification implies, with anything a prescriber must decide."""
    warnings = []
    if resistance == "xdr":
        return "individualised", [
            "Extensively drug-resistant TB has no standard regimen — build it with the "
            "drug-resistant TB team and record each drug separately."
        ]
    if resistance in RESISTANT:
        code = "BPaL" if resistance == "pre_xdr" else "BPaLM"
        if resistance == "pre_xdr":
            warnings.append("Moxifloxacin is left out because of fluoroquinolone resistance.")
        if age is not None and age < BPAL_MIN_AGE:
            return "individualised", warnings + [
                f"{code} is only recommended from {BPAL_MIN_AGE} years. This patient is "
                f"{age}, so the regimen needs to be built for them individually."
            ]
        if eptb_site in EXTENDED_EPTB_SITES:
            warnings.append(
                "TB of the central nervous system or bone usually needs a longer "
                "drug-resistant regimen than six months — confirm the length."
            )
        return code, warnings
    if site == "extra_pulmonary" and eptb_site in EXTENDED_EPTB_SITES:
        return "2HRZE/10HR", warnings
    return "2HRZE/4HR", warnings


# ------------------------------------------------------------------ weight bands
# Tablets of the fixed-dose combination per day, by weight in kg: (low, below, tablets).
# The bands are published as whole numbers (38–54 kg, 55–70 kg), so each one runs from
# `low` up to but not including `below` — otherwise a patient weighing 54.5 kg would fall
# through the gap. A `below` of None means "and above".
_ADULT_BANDS = ((25, 38, 2), (38, 55, 3), (55, 71, 4), (71, None, 5))
_CHILD_BANDS = ((4, 8, 1), (8, 12, 2), (12, 16, 3), (16, 25, 4))
CHILD_BELOW_KG = 25


def weight_band(weight_kg):
    """The dosing band a weight falls in, or None when it is unknown or off the chart."""
    if weight_kg is None:
        return None
    kg = float(weight_kg)
    paediatric = kg < CHILD_BELOW_KG
    for low, below, tablets in _CHILD_BANDS if paediatric else _ADULT_BANDS:
        if kg >= low and (below is None or kg < below):
            return {
                "label": f"{low}–{below - 1} kg" if below else f"{low} kg and above",
                "tablets": tablets,
                "paediatric": paediatric,
                "low": low,
                "below": below,
            }
    return None


def _band_warnings(band, kg):
    """Flag a weight that is about to change band, so the dose gets revisited."""
    out = []
    if band["below"] is not None and float(kg) >= band["below"] - 2:
        out.append(
            f"{float(kg):g} kg is at the top of the {band['label']} band — re-dose at the "
            "next weigh-in if the patient gains weight."
        )
    return out


# ------------------------------------------------------------------ the drug lines
def _line(drug, dose, freq, starts_on_day, days, phase=None, note=None):
    return {
        "drug": drug, "dose": dose, "freq": freq,
        "from": starts_on_day, "days": days, "phase": phase, "note": note,
    }


def _first_line(band, total_days, intensive_days):
    tablets = band["tablets"]
    continuation_days = total_days - intensive_days
    plural = "tablet" if tablets == 1 else "tablets"
    if band["paediatric"]:
        return [
            _line("RHZ 75/50/150 dispersible (FDC)", f"{tablets} {plural}", "Once daily",
                  0, intensive_days, "intensive"),
            _line("Ethambutol 100 mg dispersible", f"{tablets} {plural}", "Once daily",
                  0, intensive_days, "intensive"),
            _line("RH 75/50 dispersible (FDC)", f"{tablets} {plural}", "Once daily",
                  intensive_days, continuation_days, "continuation"),
            _line("Pyridoxine (vitamin B6)", "12.5 mg", "Once daily", 0, total_days,
                  note="Throughout treatment, to prevent isoniazid neuropathy"),
        ]
    return [
        _line("RHZE 150/75/400/275 (FDC)", f"{tablets} {plural}", "Once daily",
              0, intensive_days, "intensive"),
        _line("RH 150/75 (FDC)", f"{tablets} {plural}", "Once daily",
              intensive_days, continuation_days, "continuation"),
        _line("Pyridoxine (vitamin B6)", "25 mg", "Once daily", 0, total_days,
              note="Throughout treatment, to prevent isoniazid neuropathy"),
    ]


def _bpal(total_days, with_moxifloxacin):
    # Bedaquiline loads at 400 mg daily for the first two weeks, then drops to 200 mg
    # three times a week, so it is two prescription lines rather than one.
    lines = [
        _line("Bedaquiline", "400 mg", "Once daily", 0, 14, note="Loading dose, first two weeks"),
        _line("Bedaquiline", "200 mg", "3 times weekly", 14, total_days - 14,
              note="Monday, Wednesday, Friday"),
        _line("Pretomanid", "200 mg", "Once daily", 0, total_days),
        _line("Linezolid", "600 mg", "Once daily", 0, total_days,
              note="Watch for neuropathy and low blood counts"),
    ]
    if with_moxifloxacin:
        lines.append(_line("Moxifloxacin", "400 mg", "Once daily", 0, total_days))
    return lines


def regimen_plan(site, eptb_site=None, resistance="susceptible", age=None, weight_kg=None):
    """The regimen and the exact lines to prescribe for one classified patient."""
    code, warnings = regimen_for(site, eptb_site, resistance, age)
    spec = REGIMENS[code]
    plan = {
        "regimen": code,
        "label": spec["label"],
        "description": spec["description"],
        "totalDays": spec["total_days"],
        "intensiveDays": spec["intensive_days"],
        "band": None,
        "lines": [],
        "warnings": warnings,
    }
    if code == "individualised":
        return plan

    if code in ("BPaLM", "BPaL"):
        plan["lines"] = _bpal(spec["total_days"], with_moxifloxacin=code == "BPaLM")
        if weight_kg is None:
            plan["warnings"].append(
                "Record the patient's weight — linezolid is reduced for low body weight."
            )
        return plan

    band = weight_band(weight_kg)
    if band is None:
        plan["warnings"].append(
            "Record the patient's weight to work out how many tablets a day this patient needs."
            if weight_kg is None
            else f"{float(weight_kg):g} kg is outside the dosing chart — dose this patient by hand."
        )
        return plan
    plan["band"] = band
    plan["lines"] = _first_line(band, spec["total_days"], spec["intensive_days"])
    plan["warnings"] += _band_warnings(band, weight_kg)
    return plan


# ------------------------------------------------------------------ what may be saved
FREQUENCIES = (
    "Once daily", "12 hourly", "8 hourly", "6 hourly", "4 hourly",
    "3 times weekly", "Twice weekly", "Weekly", "At night", "When needed",
)
# A dose has to start with an amount and a unit, so "500 mg" and "3 tablets" are saved
# but "as directed" and "one" are sent back to be written out properly.
_DOSE = re.compile(
    r"^\d+(\.\d+)?\s*(mg|g|mcg|ml|iu|units?|tablets?|capsules?|drops?|puffs?|sachets?)\b",
    re.I,
)


def dose_problem(dose):
    if not _DOSE.match(dose.strip()):
        return "Write the dose as an amount and a unit, like 500 mg, 1 g or 3 tablets."
    return None
