"""The hospitals, wards and staff the seed creates.

Every hospital is its own tenant with its own staff email domain. Change a name or a
ward here and re-run `flask seed-network`; only these hospitals are reset.
"""

BASE_DOMAIN = "clinvia.health"
NETWORK_DOMAIN = BASE_DOMAIN
PATIENT_DOMAIN = f"patient.{BASE_DOMAIN}"

NETWORK_ADMIN = {
    "local": "admin",
    "name": "Evelyn Odhiambo",
    "specialty": "Network administration",
}

# Accounts that existed before tenancy are carried over rather than duplicated.
LEGACY_EMAILS = {
    "admin@clinvia.local": f"admin@{NETWORK_DOMAIN}",
    "staff@clinvia.local": f"paul.ndirangu@knh.{BASE_DOMAIN}",
}

# Ward tuple: (name, routing kind, bed prefix, capacity, beds occupied now).
# Routing kind decides who is admitted there: male / female / mixed / paediatric /
# maternity / isolation (TB only).
# Staff tuple: (email local part, name, role, specialty, duty status, tags).
# Tags say who does what: tb = TB lead doctor, general = sees general outpatients,
# paeds, obgyn, dot = the nurse who records observed doses.
HOSPITALS = [
    {
        "slug": "knh",
        "name": "Kenyatta National Hospital",
        "level": "National Referral",
        "county": "Nairobi",
        "sub_county": "Upper Hill",
        "lat": -1.3011,
        "lng": 36.8070,
        "phone": "+254 700 000 003",
        "share": 40,
        "queue": 20,
        "appointments": {"today": 12, "past": 6, "future": 5},
        "wards": [
            ("General Medical (Male)", "male", "GMM", 10, 8),
            ("General Medical (Female)", "female", "GMF", 10, 7),
            ("TB Isolation", "isolation", "TBI", 6, 0),
            ("Paediatric", "paediatric", "PAE", 8, 5),
            ("Maternity", "maternity", "MAT", 6, 4),
        ],
        "cleaning": ["GMM-09", "GMF-08"],
        "reserved": ["MAT-05"],
        "staff": [
            ("samuel.kiprono", "Samuel Kiprono", "admin", "Hospital administration", "on_duty", ()),
            ("joyce.mutiso", "Dr. Joyce Mutiso", "executive", "Chief executive officer", "on_duty", ()),
            ("amina.hassan", "Dr. Amina Hassan", "doctor", "Pulmonology (TB lead)", "on_duty", ("tb",)),
            ("brian.otieno", "Dr. Brian Otieno", "doctor", "General Medicine", "on_duty", ("general",)),
            ("catherine.njeri", "Dr. Catherine Njeri", "doctor", "Paediatrics", "on_duty", ("paeds",)),
            ("esther.wambui", "Dr. Esther Wambui", "doctor", "Obstetrics & Gynaecology", "on_leave", ("obgyn",)),
            ("omar.sheikh", "Dr. Omar Sheikh", "doctor", "Internal Medicine", "on_duty", ("general",)),
            ("paul.ndirangu", "Paul Ndirangu", "clinician", "TB programme officer", "on_duty", ()),
            ("grace.muthoni", "Grace Muthoni", "nurse", "DOT nurse", "on_duty", ("dot",)),
            ("john.kamau", "John Kamau", "nurse", "TB isolation ward", "off_duty", ()),
            ("lilian.achieng", "Lilian Achieng", "nurse", "Medical wards", "on_duty", ()),
            ("mercy.akinyi", "Mercy Akinyi", "receptionist", "Outpatients", "on_duty", ()),
        ],
    },
    {
        "slug": "kiambu",
        "name": "Kiambu County Referral Hospital",
        "level": "Level 5",
        "county": "Kiambu",
        "sub_county": "Kiambu Town",
        "lat": -1.1714,
        "lng": 36.8356,
        "phone": "+254 700 000 002",
        "share": 15,
        "queue": 10,
        "appointments": {"today": 7, "past": 4, "future": 3},
        "wards": [
            ("Medical Ward (Male)", "male", "MMW", 8, 5),
            ("Medical Ward (Female)", "female", "MFW", 8, 5),
            ("Paediatric", "paediatric", "PAE", 6, 3),
            ("Maternity", "maternity", "MAT", 6, 3),
        ],
        "cleaning": ["MMW-07"],
        "reserved": ["MAT-06"],
        "staff": [
            ("peter.gichuru", "Peter Gichuru", "admin", "Hospital administration", "on_duty", ()),
            ("lilian.wambugu", "Dr. Lilian Wambugu", "executive", "Medical superintendent", "on_duty", ()),
            ("wilson.gachanja", "Dr. Wilson Gachanja", "doctor", "Chest medicine (TB lead)", "on_duty", ("tb",)),
            ("ian.mwaura", "Dr. Ian Mwaura", "doctor", "General Medicine", "on_duty", ("general",)),
            ("susan.chege", "Dr. Susan Chege", "doctor", "Paediatrics", "on_duty", ("paeds",)),
            ("rehema.salim", "Dr. Rehema Salim", "doctor", "Obstetrics & Gynaecology", "on_duty", ("obgyn",)),
            ("winnie.njoki", "Winnie Njoki", "clinician", "TB programme officer", "on_duty", ()),
            ("agnes.wangari", "Agnes Wangari", "nurse", "DOT nurse", "on_duty", ("dot",)),
            ("dennis.kinyua", "Dennis Kinyua", "nurse", "Medical wards", "on_duty", ()),
            ("cynthia.wanjiku", "Cynthia Wanjiku", "receptionist", "Outpatients", "on_duty", ()),
        ],
    },
    {
        "slug": "nakuru",
        "name": "Nakuru Level 5 Hospital",
        "level": "Level 5",
        "county": "Nakuru",
        "sub_county": "Nakuru Town East",
        "lat": -0.2812,
        "lng": 36.0695,
        "phone": "+254 700 000 005",
        "share": 17,
        "queue": 12,
        "appointments": {"today": 8, "past": 4, "future": 3},
        "wards": [
            ("Medical Ward (Male)", "male", "MMW", 8, 6),
            ("Medical Ward (Female)", "female", "MFW", 8, 5),
            ("TB Isolation", "isolation", "TBI", 4, 0),
            ("Paediatric", "paediatric", "PAE", 6, 4),
        ],
        "cleaning": ["MFW-08"],
        "reserved": [],
        "staff": [
            ("joseph.langat", "Joseph Langat", "admin", "Hospital administration", "on_duty", ()),
            ("mary.chepkoech", "Dr. Mary Chepkoech", "executive", "Chief executive officer", "on_duty", ()),
            ("daniel.kiplagat", "Dr. Daniel Kiplagat", "doctor", "Internal Medicine (TB lead)", "on_duty", ("tb", "general")),
            ("faith.jepkosgei", "Dr. Faith Jepkosgei", "doctor", "Obstetrics & Gynaecology", "on_duty", ("obgyn",)),
            ("kevin.kirui", "Dr. Kevin Kirui", "doctor", "Paediatrics", "on_duty", ("paeds",)),
            ("abel.kiptoo", "Dr. Abel Kiptoo", "doctor", "General Medicine", "off_duty", ("general",)),
            ("sharon.cherono", "Sharon Cherono", "clinician", "TB programme officer", "on_duty", ()),
            ("nancy.chelangat", "Nancy Chelangat", "nurse", "DOT nurse", "on_duty", ("dot",)),
            ("edwin.koech", "Edwin Koech", "nurse", "TB isolation ward", "on_duty", ()),
            ("beatrice.wanjala", "Beatrice Wanjala", "receptionist", "Outpatients", "on_duty", ()),
        ],
    },
    {
        "slug": "machakos",
        "name": "Machakos Level 5 Hospital",
        "level": "Level 5",
        "county": "Machakos",
        "sub_county": "Machakos Town",
        "lat": -1.5177,
        "lng": 37.2634,
        "phone": "+254 700 000 004",
        "share": 14,
        "queue": 9,
        "appointments": {"today": 6, "past": 4, "future": 3},
        "wards": [
            ("General Medical", "mixed", "GEN", 10, 6),
            ("Paediatric", "paediatric", "PAE", 6, 3),
            ("Maternity", "maternity", "MAT", 6, 4),
        ],
        "cleaning": ["GEN-10"],
        "reserved": ["MAT-06"],
        "staff": [
            ("jane.mwikali", "Jane Mwikali", "admin", "Hospital administration", "on_duty", ()),
            ("philip.musyoka", "Dr. Philip Musyoka", "executive", "Medical superintendent", "on_duty", ()),
            ("felix.mutua", "Dr. Felix Mutua", "doctor", "Infectious Diseases (TB lead)", "on_duty", ("tb",)),
            ("rose.nduku", "Dr. Rose Nduku", "doctor", "General Medicine", "on_duty", ("general",)),
            ("titus.kioko", "Dr. Titus Kioko", "doctor", "Paediatrics", "on_leave", ("paeds",)),
            ("grace.mbithe", "Dr. Grace Mbithe", "doctor", "Obstetrics & Gynaecology", "on_duty", ("obgyn",)),
            ("dorcas.mueni", "Dorcas Mueni", "clinician", "TB programme officer", "on_duty", ()),
            ("priscilla.ndinda", "Priscilla Ndinda", "nurse", "DOT nurse", "on_duty", ("dot",)),
            ("martin.kyalo", "Martin Kyalo", "nurse", "Medical wards", "on_duty", ()),
            ("faith.kavata", "Faith Kavata", "receptionist", "Outpatients", "on_duty", ()),
        ],
    },
    {
        "slug": "thika",
        "name": "Thika Level 5 Hospital",
        "level": "Level 5",
        "county": "Kiambu",
        "sub_county": "Thika Town",
        "lat": -1.0395,
        "lng": 37.0693,
        "phone": "+254 700 000 001",
        "share": 14,
        "queue": 10,
        "appointments": {"today": 7, "past": 4, "future": 3},
        "wards": [
            ("Medical Ward (Male)", "male", "MMW", 8, 5),
            ("Medical Ward (Female)", "female", "MFW", 8, 5),
            ("TB Isolation", "isolation", "TBI", 4, 0),
            ("Maternity", "maternity", "MAT", 6, 3),
        ],
        "cleaning": ["MMW-08"],
        "reserved": [],
        "staff": [
            ("stephen.karanja", "Stephen Karanja", "admin", "Hospital administration", "on_duty", ()),
            ("anne.wangui", "Dr. Anne Wangui", "executive", "Chief executive officer", "on_duty", ()),
            ("lucy.wairimu", "Dr. Lucy Wairimu", "doctor", "Pulmonology (TB lead)", "on_duty", ("tb",)),
            ("moses.kamande", "Dr. Moses Kamande", "doctor", "General Medicine", "on_duty", ("general",)),
            ("ali.omar", "Dr. Ali Omar", "doctor", "Obstetrics & Gynaecology", "on_duty", ("obgyn",)),
            ("ruth.nyambura", "Dr. Ruth Nyambura", "doctor", "Paediatrics", "on_duty", ("paeds",)),
            ("tabitha.nyokabi", "Tabitha Nyokabi", "clinician", "TB programme officer", "on_duty", ()),
            ("hellen.muthoni", "Hellen Muthoni", "nurse", "DOT nurse", "on_duty", ("dot",)),
            ("collins.mbugua", "Collins Mbugua", "nurse", "TB isolation ward", "on_duty", ()),
            ("diana.gathoni", "Diana Gathoni", "receptionist", "Outpatients", "on_duty", ()),
        ],
    },
]

# The TB cohort from the prototype, each at the hospital that treats them.
# (code, hospital, type, started days ago, MDR, target adherence %, missed-in-a-row, outcome)
TB_COHORT = [
    ("P0001", "kiambu", "pulmonary", 40, False, 96, 0, "active"),
    ("P0002", "knh", "extra_pulmonary", 150, False, 88, 0, "active"),
    ("P0003", "nakuru", "pulmonary", 25, False, 72, 3, "active"),
    ("P0004", "machakos", "pulmonary", 100, False, 91, 0, "active"),
    ("P0005", "thika", "pulmonary", 70, False, 55, 5, "active"),
    ("P0006", "knh", "pulmonary", 12, False, 100, 0, "active"),
    ("P0007", "knh", "pulmonary", 130, False, 84, 0, "active"),
    ("P0008", "nakuru", "pulmonary", 55, True, 93, 0, "active"),
    ("P0009", "thika", "extra_pulmonary", 160, False, 97, 0, "active"),
    ("P0010", "knh", "pulmonary", 30, True, 66, 2, "active"),
    ("P0011", "nakuru", "pulmonary", 85, False, 78, 0, "active"),
    ("P0012", "machakos", "pulmonary", 8, False, 100, 0, "active"),
    ("P0013", "knh", "pulmonary", 240, False, 95, 0, "cured"),
    ("P0014", "nakuru", "pulmonary", 265, False, 92, 0, "cured"),
    ("P0015", "machakos", "extra_pulmonary", 210, False, 90, 0, "completed"),
    ("P0016", "kiambu", "pulmonary", 280, False, 89, 0, "completed"),
    ("P0017", "kiambu", "pulmonary", 230, False, 40, 0, "lost_to_follow_up"),
    ("P0018", "thika", "pulmonary", 250, True, 60, 0, "died"),
]

# Patients kept at a specific hospital regardless of the spread (presumptive TB case).
PINNED = {"P0024": "knh"}

# TB patients currently in isolation: (code, hospital, bed, days ago, reason)
ISOLATED = [
    ("P0005", "thika", "TBI-01", 4, "Poor adherence, persistent smear-positive — isolation"),
    ("P0010", "knh", "TBI-01", 6, "MDR-TB, adherence support and monitoring"),
]
