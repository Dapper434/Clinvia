-- Initial Seed Data for TBTrack
-- Demo Facilities in Kenya
INSERT INTO facilities (name, county, sub_county, lat, lng, phone)
VALUES
  ('Thika Level 5 Hospital', 'Kiambu', 'Thika', -1.0332, 37.0693, '+254700000001'),
  ('Kiambu County Referral Hospital', 'Kiambu', 'Kiambu Town', -1.1741, 36.8356, '+254700000002'),
  ('Kenyatta National Hospital', 'Nairobi', 'Nairobi', -1.2921, 36.8219, '+254700000003'),
  ('Machakos Level 5 Hospital', 'Machakos', 'Machakos', -1.5177, 37.2634, '+254700000004'),
  ('Nakuru Level 5 Hospital', 'Nakuru', 'Nakuru', -0.2833, 36.0667, '+254700000005')
ON CONFLICT DO NOTHING;

-- Demo Patients
INSERT INTO patients (name, age, gender, tb_type, regimen, treatment_start, status, facility, lat, lng)
VALUES
  ('James Mwangi', 34, 'male', 'pulmonary', 'HRZE', '2026-01-10', 'active', 'Thika Level 5 Hospital', -1.0332, 37.0693),
  ('Faith Wanjiru', 27, 'female', 'pulmonary', 'HRZE', '2026-02-01', 'active', 'Kiambu County Referral Hospital', -1.1741, 36.8356),
  ('Peter Otieno', 45, 'male', 'extra-pulmonary', 'HRE', '2025-12-15', 'active', 'Kenyatta National Hospital', -1.2921, 36.8219),
  ('Grace Achieng', 31, 'female', 'pulmonary', 'HRZE', '2026-02-10', 'active', 'Nakuru Level 5 Hospital', -0.2833, 36.0667),
  ('David Kiprop', 52, 'male', 'pulmonary', 'HRZE', '2026-01-20', 'active', 'Machakos Level 5 Hospital', -1.5177, 37.2634)
ON CONFLICT DO NOTHING;
